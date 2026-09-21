from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.contracts import ComparedField, ExtractedValue, ExtractionResult, Provenance
from app.extraction import PersistenceExtractionCache
from app.models import (
    AuditEventRecord,
    DocumentRoleDecisionRecord,
    EmailAttachment,
    GuestSession,
    SourceObject,
    Workspace,
)
from app.persistence import (
    AttachmentInput,
    AuditContext,
    DocumentRoleDecisionInput,
    PersistenceService,
    ReceiptInput,
)
from app.storage import InMemoryPrivateObjectStore

SI_BYTES = b"SHIPPING INSTRUCTION\nShipper: ACME LTD\n"
AUDIT = AuditContext(request_id="req-roles", rule_version="gate-2-v1")


async def _workspace(factory):
    guest_id, workspace_id = uuid4(), uuid4()
    async with factory() as session, session.begin():
        session.add(
            GuestSession(
                guest_session_id=guest_id,
                session_key=f"k-{guest_id}",
                current_generation=1,
            )
        )
        session.add(
            Workspace(
                workspace_id=workspace_id,
                guest_session_id=guest_id,
                generation=1,
                is_shared_seed=False,
            )
        )
    return workspace_id


async def _receipt(service, workspace_id):
    persisted = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key=f"idem-{uuid4()}",
        receipt=ReceiptInput(
            source_message_id=f"msg-{uuid4()}",
            received_at=datetime(2026, 9, 21, tzinfo=UTC),
            sender="ops@example.com",
            subject="SI",
            message_bytes=b"{}",
            attachments=(
                AttachmentInput(
                    file_name="si.txt",
                    data=SI_BYTES,
                    declared_media_type=None,
                    detected_format="txt",
                ),
            ),
        ),
        audit=AUDIT,
    )
    return persisted.email_id


def _decision(attachment_id, **overrides):
    now = datetime(2026, 9, 21, tzinfo=UTC)
    values = {
        "attachment_id": attachment_id,
        "content_hash": sha256(SI_BYTES).hexdigest(),
        "outcome": "SUCCEEDED",
        "role": "SI",
        "role_probabilities": {"SI": 0.9, "DRAFT_BL": 0.05, "OTHER": 0.05},
        "requested_model": "jev-1.13.0",
        "returned_model": "jev-1.13.0",
        "prompt_version": "document-role-v1",
        "provider_request_id": "req-1",
        "correlation_id": "corr-1",
        "safe_diagnostic": None,
        "retryable": None,
        "started_at": now,
        "completed_at": now + timedelta(seconds=1),
    }
    values.update(overrides)
    return DocumentRoleDecisionInput(**values)


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_role_decisions_are_persisted_with_versions_and_audited(
    postgres_session_factory,
):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    email_id = await _receipt(service, workspace_id)
    async with postgres_session_factory() as session:
        attachment_id = await session.scalar(
            select(EmailAttachment.attachment_id).where(
                EmailAttachment.email_id == email_id
            )
        )

    await service.record_document_role_decision(
        workspace_id=workspace_id,
        decision=_decision(
            attachment_id,
            outcome="PROVIDER_FAILED",
            role=None,
            role_probabilities=None,
            returned_model=None,
            safe_diagnostic="timeout",
            retryable=True,
        ),
        audit=AUDIT,
    )
    decision_id = await service.record_document_role_decision(
        workspace_id=workspace_id, decision=_decision(attachment_id), audit=AUDIT
    )

    latest = await service.latest_document_role_decisions(
        workspace_id=workspace_id, email_id=email_id
    )
    assert latest[attachment_id].role == "SI"
    assert latest[attachment_id].role_probabilities["SI"] == 0.9
    async with postgres_session_factory() as session:
        row = await session.get(DocumentRoleDecisionRecord, decision_id)
        events = list(
            await session.scalars(
                select(AuditEventRecord.event_type).where(
                    AuditEventRecord.workspace_id == workspace_id
                )
            )
        )
    assert (
        row.requested_model == "jev-1.13.0" and row.prompt_version == "document-role-v1"
    )
    assert row.rule_version == "gate-2-v1"
    assert events.count("DOCUMENT_ROLE_FAILED") == 1
    assert events.count("DOCUMENT_ROLE_DECIDED") == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "overrides",
    [
        {"role": "INVOICE"},
        {"role_probabilities": {"SI": 1.0}},
        {"outcome": "PROVIDER_FAILED"},  # a failure cannot carry a role
        {"content_hash": "0" * 64},  # not this attachment's bytes
        {"role_probabilities": {"SI": "high", "DRAFT_BL": 0.05, "OTHER": 0.05}},
    ],
)
async def test_invalid_role_decisions_are_rejected(postgres_session_factory, overrides):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    email_id = await _receipt(service, workspace_id)
    async with postgres_session_factory() as session:
        attachment_id = await session.scalar(
            select(EmailAttachment.attachment_id).where(
                EmailAttachment.email_id == email_id
            )
        )

    with pytest.raises(ValueError):
        await service.record_document_role_decision(
            workspace_id=workspace_id,
            decision=_decision(attachment_id, **overrides),
            audit=AUDIT,
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_role_decision_for_another_workspace_attachment_is_rejected(
    postgres_session_factory,
):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    owner = await _workspace(postgres_session_factory)
    other = await _workspace(postgres_session_factory)
    email_id = await _receipt(service, owner)
    async with postgres_session_factory() as session:
        attachment_id = await session.scalar(
            select(EmailAttachment.attachment_id).where(
                EmailAttachment.email_id == email_id
            )
        )

    with pytest.raises(ValueError):
        await service.record_document_role_decision(
            workspace_id=other, decision=_decision(attachment_id), audit=AUDIT
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_cache_entry_round_trips_transcription(postgres_session_factory):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    await _receipt(service, workspace_id)
    content_hash = sha256(SI_BYTES).hexdigest()
    result = ExtractionResult(
        values=[
            ExtractedValue(
                field=ComparedField.SHIPPER,
                raw_value="ACME LTD",
                provenance=Provenance.model_validate(
                    {
                        "attachment_id": "a",
                        "file_name": "si.txt",
                        "format": "txt",
                        "location": {
                            "kind": "txt",
                            "line": 2,
                            "start_col": 9,
                            "end_col": 17,
                        },
                    }
                ),
            )
        ]
    )

    await service.cache_extraction(
        workspace_id=workspace_id,
        content_hash=content_hash,
        extractor_route="gemini_scan",
        extractor_version="gemini-3.5-flash:gemini-extraction-v1",
        extraction_schema_version="extraction-schema-v1",
        result=result,
        provenance=[
            value.provenance.model_dump(mode="json") for value in result.values
        ],
        audit=AUDIT,
        document_text="SHIPPING INSTRUCTION",
    )
    entry = await service.get_cached_extraction_entry(
        workspace_id=workspace_id,
        content_hash=content_hash,
        extractor_version="gemini-3.5-flash:gemini-extraction-v1",
        extraction_schema_version="extraction-schema-v1",
    )

    assert entry.document_text == "SHIPPING INSTRUCTION"
    assert entry.extractor_route == "gemini_scan"
    assert entry.result == result
    assert (
        await service.get_cached_extraction_entry(
            workspace_id=workspace_id,
            content_hash=content_hash,
            extractor_version="gemini-3.5-flash:other",
            extraction_schema_version="extraction-schema-v1",
        )
        is None
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_persistence_extraction_cache_round_trips_result_and_text(
    postgres_session_factory,
):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    await _receipt(service, workspace_id)
    content_hash = sha256(SI_BYTES).hexdigest()
    result = ExtractionResult(
        values=[
            ExtractedValue(
                field=ComparedField.SHIPPER,
                raw_value="ACME LTD",
                provenance=Provenance.model_validate(
                    {
                        "attachment_id": "a",
                        "file_name": "si.txt",
                        "format": "txt",
                        "location": {
                            "kind": "txt",
                            "line": 2,
                            "start_col": 9,
                            "end_col": 17,
                        },
                    }
                ),
            )
        ]
    )
    cache = PersistenceExtractionCache(service, workspace_id=workspace_id, audit=AUDIT)

    await cache.put(
        content_hash=content_hash,
        extractor_route="gemini_scan",
        extractor_version="gemini-3.5-flash:gemini-extraction-v1",
        result=result,
        document_text="SHIPPING INSTRUCTION",
    )
    cached = await cache.get(
        content_hash=content_hash,
        extractor_version="gemini-3.5-flash:gemini-extraction-v1",
    )

    assert cached.result == result
    assert cached.document_text == "SHIPPING INSTRUCTION"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("event_type", ["GEMINI_SECOND_KEY_USED", "EXTRACTION_FAILED"])
async def test_extraction_event_is_audited_once(postgres_session_factory, event_type):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    email_id = await _receipt(service, workspace_id)
    content_hash = sha256(SI_BYTES).hexdigest()
    async with postgres_session_factory() as session:
        source_object_id = await session.scalar(
            select(SourceObject.source_object_id)
            .join(
                EmailAttachment,
                EmailAttachment.source_object_id == SourceObject.source_object_id,
            )
            .where(EmailAttachment.email_id == email_id)
        )

    await service.record_extraction_event(
        workspace_id=workspace_id,
        content_hash=content_hash,
        event_type=event_type,
        payload={"attempt": 2},
        audit=AUDIT,
    )

    async with postgres_session_factory() as session:
        events = list(
            await session.scalars(
                select(AuditEventRecord).where(
                    AuditEventRecord.workspace_id == workspace_id,
                    AuditEventRecord.event_type == event_type,
                )
            )
        )
    assert len(events) == 1
    assert events[0].entity_type == "ATTACHMENT"
    assert events[0].entity_id == str(source_object_id)
    assert events[0].source_hashes == [content_hash]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_extraction_event_with_unknown_type_writes_nothing(
    postgres_session_factory,
):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    workspace_id = await _workspace(postgres_session_factory)
    await _receipt(service, workspace_id)
    content_hash = sha256(SI_BYTES).hexdigest()

    async def _audit_count() -> int:
        async with postgres_session_factory() as session:
            return await session.scalar(
                select(func.count())
                .select_from(AuditEventRecord)
                .where(AuditEventRecord.workspace_id == workspace_id)
            )

    before = await _audit_count()
    with pytest.raises(ValueError):
        await service.record_extraction_event(
            workspace_id=workspace_id,
            content_hash=content_hash,
            event_type="NOT_A_REAL_EVENT",
            payload={},
            audit=AUDIT,
        )
    assert await _audit_count() == before


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_extraction_event_for_another_workspace_content_hash_writes_nothing(
    postgres_session_factory,
):
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    owner = await _workspace(postgres_session_factory)
    other = await _workspace(postgres_session_factory)
    await _receipt(service, owner)
    content_hash = sha256(SI_BYTES).hexdigest()

    async def _audit_count() -> int:
        async with postgres_session_factory() as session:
            return await session.scalar(
                select(func.count())
                .select_from(AuditEventRecord)
                .where(AuditEventRecord.workspace_id == other)
            )

    before = await _audit_count()
    with pytest.raises(ValueError):
        await service.record_extraction_event(
            workspace_id=other,
            content_hash=content_hash,
            event_type="EXTRACTION_FAILED",
            payload={},
            audit=AUDIT,
        )
    assert await _audit_count() == before
