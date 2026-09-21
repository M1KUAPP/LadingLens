from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError

from app.contracts import (
    EvaluatorOutput,
    ExtractionResult,
    ReconciliationResult,
    compute_subject_key,
)
from app.models import (
    AuditEventRecord,
    CaseRecord,
    ClassificationAttempt,
    EmailReceipt,
    ExpectedShipmentRecord,
    ExtractionCache,
    GuestSession,
    IngestionRequest,
    ReconciliationResultRecord,
    ReconciliationRun,
    ReviewActionRecord,
    ReviewAssignmentRecord,
    SubmissionRun,
    Workspace,
)
from app.persistence import (
    AttachmentInput,
    AuditContext,
    CaseInput,
    ExpectedShipmentInput,
    IdempotencyConflict,
    PersistenceService,
    ReceiptInput,
    ReviewActionInput,
    ReviewAssignmentInput,
    receipt_request_hash,
)
from app.storage import InMemoryPrivateObjectStore, sha256_hex
from app.submission import EXPECTED_EMAIL_IDS


def _receipt(*, attachment_bytes: bytes = b"attachment") -> ReceiptInput:
    return ReceiptInput(
        source_message_id="message-1",
        received_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
        sender="ops@example.com",
        subject="Draft BL",
        message_bytes=b"raw message bytes",
        body_text="Parsed email body",
        attachments=(
            AttachmentInput(
                file_name="draft.pdf",
                data=attachment_bytes,
                declared_media_type="application/pdf",
                detected_format="digital_pdf",
            ),
        ),
    )


def _audit_context() -> AuditContext:
    return AuditContext(request_id="request-1", rule_version="rules-1")


def test_receipt_request_hash_covers_exact_attachment_bytes() -> None:
    first = receipt_request_hash(_receipt(attachment_bytes=b"first"))
    replay = receipt_request_hash(_receipt(attachment_bytes=b"first"))
    changed = receipt_request_hash(_receipt(attachment_bytes=b"second"))
    same_bytes_new_metadata = receipt_request_hash(
        ReceiptInput(
            source_message_id="different-derived-id",
            received_at=datetime(2026, 9, 21, 10, tzinfo=UTC),
            sender="different@example.com",
            subject="Different derived metadata",
            message_bytes=b"raw message bytes",
            body_text="Parsed email body",
            attachments=(
                AttachmentInput(
                    file_name="renamed.pdf",
                    data=b"first",
                    declared_media_type="application/octet-stream",
                    detected_format="unknown",
                ),
            ),
        )
    )
    changed_body = receipt_request_hash(
        ReceiptInput(
            source_message_id="source-message-1",
            received_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
            sender="ops@example.com",
            subject="Draft BL",
            message_bytes=b"raw message bytes",
            body_text="Different parsed body",
            attachments=_receipt(attachment_bytes=b"first").attachments,
        )
    )

    assert first == replay
    assert first == same_bytes_new_metadata
    assert first != changed
    assert first != changed_body
    assert len(first) == 64


@pytest.mark.asyncio
async def test_invalid_extraction_shape_is_rejected_before_database_access() -> None:
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="ExtractionResult"):
        await service.cache_extraction(
            workspace_id=uuid4(),
            content_hash="a" * 64,
            extractor_route="digital_pdf",
            extractor_version="gemini-3.5-flash",
            extraction_schema_version="extraction-v1",
            result={"unvalidated": True},  # type: ignore[arg-type]
            provenance=[],
            audit=_audit_context(),
        )

    bypassed = ExtractionResult.model_construct(values=[{"unvalidated": True}])
    with pytest.raises(ValidationError):
        await service.cache_extraction(
            workspace_id=uuid4(),
            content_hash="a" * 64,
            extractor_route="digital_pdf",
            extractor_version="gemini-3.5-flash",
            extraction_schema_version="extraction-v1",
            result=bypassed,
            provenance=[],
            audit=_audit_context(),
        )


@pytest.mark.asyncio
async def test_workspace_guard_locks_guest_session_for_reset_serialization() -> None:
    class CapturingSession:
        statement = None

        async def scalar(self, statement):
            self.statement = statement
            return object()

    session = CapturingSession()
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]

    await service._require_active_guest_workspace(
        session,  # type: ignore[arg-type]
        uuid4(),
    )

    assert session.statement is not None
    sql = str(
        session.statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    assert "JOIN workspaces" in sql
    assert "FOR UPDATE OF guest_sessions" in sql


async def _create_workspace(session_factory) -> UUID:
    guest_session_id = uuid4()
    workspace_id = uuid4()
    async with session_factory() as session, session.begin():
        session.add(
            GuestSession(
                guest_session_id=guest_session_id,
                session_key=f"guest-{guest_session_id}",
                current_generation=1,
            )
        )
        session.add(
            Workspace(
                workspace_id=workspace_id,
                guest_session_id=guest_session_id,
                generation=1,
                is_shared_seed=False,
            )
        )
    return workspace_id


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_receipt_replay_returns_original_without_duplicate_mutation(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)

    first = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="idem-1",
        receipt=_receipt(),
        audit=_audit_context(),
    )
    replay = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="idem-1",
        receipt=_receipt(),
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        receipt = await session.get(EmailReceipt, first.email_id)
        receipt_count = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == workspace_id)
        )
        request_count = await session.scalar(
            select(func.count())
            .select_from(IngestionRequest)
            .where(IngestionRequest.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert replay.email_id == first.email_id
    assert replay.replayed is True
    assert receipt is not None
    assert receipt.body_text == "Parsed email body"
    assert receipt_count == 1
    assert request_count == 1
    assert audit_count == 1
    assert len(store.objects) == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_changed_bytes_raise_conflict_and_commit_conflict_audit(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="idem-conflict",
        receipt=_receipt(attachment_bytes=b"first"),
        audit=_audit_context(),
    )

    with pytest.raises(IdempotencyConflict):
        await service.persist_receipt(
            workspace_id=workspace_id,
            idempotency_key="idem-conflict",
            receipt=_receipt(attachment_bytes=b"changed"),
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        receipt_count = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == workspace_id)
        )
        events = (
            await session.scalars(
                select(AuditEventRecord)
                .where(AuditEventRecord.workspace_id == workspace_id)
                .order_by(AuditEventRecord.occurred_at)
            )
        ).all()

    assert receipt_count == 1
    assert [event.event_type for event in events] == [
        "EMAIL_RECEIVED",
        "IDEMPOTENCY_CONFLICT",
    ]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_audit_failure_rolls_back_receipt_and_idempotency_row(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)

    async def reject_audit(_session, _event) -> None:
        raise RuntimeError("audit unavailable")

    service = PersistenceService(
        postgres_session_factory,
        InMemoryPrivateObjectStore(),
        audit_writer=reject_audit,
    )

    with pytest.raises(RuntimeError, match="audit unavailable"):
        await service.persist_receipt(
            workspace_id=workspace_id,
            idempotency_key="idem-rollback",
            receipt=_receipt(),
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        receipt_count = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == workspace_id)
        )
        request_count = await session.scalar(
            select(func.count())
            .select_from(IngestionRequest)
            .where(IngestionRequest.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert receipt_count == 0
    assert request_count == 0
    assert audit_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_reconciliation_subject_is_unique_per_run_and_audited(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    run_id = uuid4()
    async with postgres_session_factory() as session, session.begin():
        session.add(
            ReconciliationRun(
                reconciliation_run_id=run_id,
                workspace_id=workspace_id,
                source_hash="a" * 64,
                rule_version="rules-1",
            )
        )
    subject_key = compute_subject_key("MISSING_CASE", shipment_id="SHP-042")
    result = ReconciliationResult.model_validate(
        {
            "reconciliation_id": str(uuid4()),
            "reconciliation_run_id": str(run_id),
            "subject_key": subject_key,
            "outcome": "MISSING_CASE",
            "shipment_id": "SHP-042",
            "case_ids": [],
            "match_basis": ["shipment_id"],
            "source_freshness": "CURRENT",
            "reviewed_at": None,
            "created_at": "2026-09-20T10:00:00Z",
        }
    )
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    await service.persist_reconciliation_result(
        workspace_id=workspace_id,
        result=result,
        audit=_audit_context(),
    )

    with pytest.raises(IntegrityError):
        await service.persist_reconciliation_result(
            workspace_id=workspace_id,
            result=ReconciliationResult.model_validate(
                result.model_dump(mode="json") | {"reconciliation_id": str(uuid4())}
            ),
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        result_count = await session.scalar(
            select(func.count())
            .select_from(ReconciliationResultRecord)
            .join(ReconciliationRun)
            .where(ReconciliationRun.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert result_count == 1
    assert audit_count == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_guest_reset_rotates_namespace_without_deleting_history(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    other_workspace_id = await _create_workspace(postgres_session_factory)
    shared_workspace_id = uuid4()
    async with postgres_session_factory() as session, session.begin():
        session.add(
            Workspace(
                workspace_id=shared_workspace_id,
                guest_session_id=None,
                generation=1,
                is_shared_seed=True,
            )
        )
        original_workspace = await session.get(Workspace, workspace_id)
        assert original_workspace is not None
        original_workspace.seed_workspace_id = shared_workspace_id
        session.add(
            ExpectedShipmentRecord(
                expected_shipment_id=uuid4(),
                workspace_id=shared_workspace_id,
                source_system="shared-seed",
                shipment_id="SEED-001",
                source_hash="e" * 64,
                imported_row={"shipment_id": "SEED-001"},
                identifiers={"shipment_id": "SEED-001"},
                lifecycle="BOOKED",
                documents=[],
                booking_reference=None,
                required_documents=[],
                cutoff_at=None,
                source_owner_id="shared-seed-owner",
                assigned_owner_id=None,
                source_freshness="CURRENT",
                source_updated_at=datetime(2026, 9, 20, 8, tzinfo=UTC),
            )
        )
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="before-reset",
        receipt=_receipt(),
        audit=_audit_context(),
    )
    await service.persist_receipt(
        workspace_id=other_workspace_id,
        idempotency_key="same-business-id-other-guest",
        receipt=_receipt(),
        audit=_audit_context(),
    )
    async with postgres_session_factory() as session:
        session_key = await session.scalar(
            select(GuestSession.session_key)
            .join(Workspace)
            .where(Workspace.workspace_id == workspace_id)
        )
    assert session_key is not None

    with pytest.raises(ValueError, match="active mutable guest namespace"):
        await service.persist_receipt(
            workspace_id=shared_workspace_id,
            idempotency_key="shared-seed-write",
            receipt=_receipt(),
            audit=_audit_context(),
        )

    reset = await service.reset_guest_namespace(
        session_key=session_key,
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        old_receipts = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == workspace_id)
        )
        new_receipts = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == reset.workspace_id)
        )
        old_audits = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )
        other_workspace = await session.get(Workspace, other_workspace_id)
        shared_workspace = await session.get(Workspace, shared_workspace_id)
        reset_workspace = await session.get(Workspace, reset.workspace_id)
        other_receipts = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == other_workspace_id)
        )
        shared_seed_shipments = await session.scalar(
            select(func.count())
            .select_from(ExpectedShipmentRecord)
            .where(ExpectedShipmentRecord.workspace_id == shared_workspace_id)
        )

    assert reset.workspace_id != workspace_id
    assert reset.generation == 2
    assert reset.seed_workspace_id == shared_workspace_id
    assert old_receipts == 1
    assert new_receipts == 0
    assert old_audits == 2
    assert other_workspace is not None
    assert other_workspace.generation == 1
    assert shared_workspace is not None
    assert shared_workspace.is_shared_seed is True
    assert reset_workspace is not None
    assert reset_workspace.seed_workspace_id == shared_workspace_id
    assert other_receipts == 1
    assert shared_seed_shipments == 1


async def _create_reconciliation_exception(
    session_factory,
    service: PersistenceService,
    workspace_id: UUID,
) -> UUID:
    run_id = uuid4()
    reconciliation_id = uuid4()
    async with session_factory() as session, session.begin():
        session.add(
            ReconciliationRun(
                reconciliation_run_id=run_id,
                workspace_id=workspace_id,
                source_hash="b" * 64,
                rule_version="rules-1",
            )
        )
    subject_key = compute_subject_key("MISSING_CASE", shipment_id="SHP-REVIEW")
    await service.persist_reconciliation_result(
        workspace_id=workspace_id,
        result=ReconciliationResult.model_validate(
            {
                "reconciliation_id": str(reconciliation_id),
                "reconciliation_run_id": str(run_id),
                "subject_key": subject_key,
                "outcome": "MISSING_CASE",
                "shipment_id": "SHP-REVIEW",
                "case_ids": [],
                "match_basis": ["shipment_id"],
                "source_freshness": "CURRENT",
                "reviewed_at": None,
                "created_at": "2026-09-20T10:00:00Z",
            }
        ),
        audit=_audit_context(),
    )
    return reconciliation_id


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_review_assignment_and_action_are_each_audited_once(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    reconciliation_id = await _create_reconciliation_exception(
        postgres_session_factory, service, workspace_id
    )
    assignment_id = uuid4()
    action_id = uuid4()

    await service.append_review_assignment(
        workspace_id=workspace_id,
        assignment=ReviewAssignmentInput(
            review_assignment_id=assignment_id,
            target_type="RECONCILIATION_EXCEPTION",
            case_id=None,
            reconciliation_id=reconciliation_id,
            assigned_owner_id="reviewer-1",
            state="ASSIGNED",
        ),
        audit=_audit_context(),
    )
    await service.append_review_action(
        workspace_id=workspace_id,
        action=ReviewActionInput(
            review_action_id=action_id,
            target_type="RECONCILIATION_EXCEPTION",
            case_id=None,
            reconciliation_id=reconciliation_id,
            actor_id="reviewer-1",
            action="ACKNOWLEDGE",
            rationale="Claiming the exception for investigation.",
        ),
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        assignment_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(ReviewAssignmentRecord.workspace_id == workspace_id)
        )
        action_count = await session.scalar(
            select(func.count())
            .select_from(ReviewActionRecord)
            .where(ReviewActionRecord.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert assignment_count == 2
    assert action_count == 1
    assert audit_count == 4


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_schema_valid_extraction_cache_replays_without_success_duplicate(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)
    receipt = _receipt()
    await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="cache-source",
        receipt=receipt,
        audit=_audit_context(),
    )
    result = ExtractionResult.model_validate(
        {
            "values": [
                {
                    "field": "shipper",
                    "raw_value": "Acme Shipping",
                    "normalized_value": "acme shipping",
                    "confidence": 0.98,
                    "provenance": {
                        "attachment_id": "attachment-1",
                        "file_name": "draft.pdf",
                        "format": "digital_pdf",
                        "location": {
                            "kind": "digital_pdf",
                            "page": 1,
                            "bbox": [0.1, 0.1, 0.5, 0.2],
                            "approximate": False,
                        },
                    },
                }
            ]
        }
    )
    content_hash = sha256_hex(receipt.attachments[0].data)

    first = await service.cache_extraction(
        workspace_id=workspace_id,
        content_hash=content_hash,
        extractor_route="digital_pdf",
        extractor_version="gemini-3.5-flash",
        extraction_schema_version="extraction-v1",
        result=result,
        provenance=[],
        audit=_audit_context(),
    )
    replay = await service.cache_extraction(
        workspace_id=workspace_id,
        content_hash=content_hash,
        extractor_route="digital_pdf",
        extractor_version="gemini-3.5-flash",
        extraction_schema_version="extraction-v1",
        result=result,
        provenance=[],
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        cache_count = await session.scalar(
            select(func.count())
            .select_from(ExtractionCache)
            .where(ExtractionCache.content_hash == content_hash)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert first.created is True
    assert replay.extraction_cache_id == first.extraction_cache_id
    assert replay.created is False
    assert cache_count == 1
    assert audit_count == 2


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_submission_run_manifest_replays_without_duplicate_audit(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    first = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash="c" * 64,
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        audit=_audit_context(),
    )
    replay = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash="c" * 64,
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        run_count = await session.scalar(
            select(func.count())
            .select_from(SubmissionRun)
            .where(SubmissionRun.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert first.created is True
    assert replay.submission_run_id == first.submission_run_id
    assert replay.created is False
    assert run_count == 1
    assert audit_count == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_and_expected_shipment_mutations_are_audited_and_scoped(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    persisted_receipt = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="case-source",
        receipt=_receipt(),
        audit=_audit_context(),
    )
    case_id = uuid4()
    await service.persist_case(
        workspace_id=workspace_id,
        case=CaseInput(
            case_id=case_id,
            email_id=persisted_receipt.email_id,
            evaluator_output=EvaluatorOutput(
                category="GENERAL",
                status="OK",
                review_reason=None,
                has_defect=False,
                defect_fields=[],
            ),
            field_verdicts=(),
            assigned_owner_id=None,
            model_version="jev-1.13.0",
            prompt_version="category-v1",
            normalization_version="normalization-v1",
            rule_version="rules-1",
        ),
        audit=_audit_context(),
    )
    shipment = ExpectedShipmentInput(
        source_system="synthetic",
        shipment_id="SHP-100",
        source_hash="d" * 64,
        imported_row={"shipment_id": "SHP-100"},
        identifiers={"booking_reference": "BOOK-100"},
        lifecycle="BOOKED",
        documents=[],
        assigned_owner_id="ops-1",
        source_freshness="CURRENT",
        source_updated_at=datetime(2026, 9, 20, 9, tzinfo=UTC),
    )
    first_shipment = await service.persist_expected_shipment(
        workspace_id=workspace_id,
        shipment=shipment,
        audit=_audit_context(),
    )
    replayed_shipment = await service.persist_expected_shipment(
        workspace_id=workspace_id,
        shipment=shipment,
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        case_count = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.workspace_id == workspace_id)
        )
        shipment_count = await session.scalar(
            select(func.count())
            .select_from(ExpectedShipmentRecord)
            .where(ExpectedShipmentRecord.workspace_id == workspace_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert replayed_shipment.expected_shipment_id == first_shipment.expected_shipment_id
    assert replayed_shipment.created is False
    assert case_count == 1
    assert shipment_count == 1
    assert audit_count == 3


def _classification_probabilities() -> dict[str, float]:
    return {
        "BL_COMPARISON": 0.70,
        "SI_REQUEST": 0.10,
        "INVOICE_QUERY": 0.08,
        "GENERAL": 0.07,
        "SPAM": 0.05,
    }


@pytest.mark.asyncio
async def test_classification_success_rejects_incomplete_probability_distribution() -> (
    None
):
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="cover every category"):
        await service.record_classification_success(
            case_id=uuid4(),
            category="GENERAL",
            category_probabilities={"GENERAL": 1.0},
            requested_model="jev-1.13.0",
            returned_model="jev-1.13.0",
            provider_request_id="provider-request-1",
            correlation_id="correlation-1",
            started_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
            completed_at=datetime(2026, 9, 20, 10, 0, 2, tzinfo=UTC),
            audit=_audit_context(),
        )


@pytest.mark.asyncio
async def test_classification_success_rejects_probability_distribution_with_wrong_sum() -> (
    None
):
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="sum to approximately 1"):
        await service.record_classification_success(
            case_id=uuid4(),
            category="GENERAL",
            category_probabilities={
                "BL_COMPARISON": 0.50,
                "SI_REQUEST": 0.10,
                "INVOICE_QUERY": 0.10,
                "GENERAL": 0.10,
                "SPAM": 0.10,
            },
            requested_model="jev-1.13.0",
            returned_model="jev-1.13.0",
            provider_request_id="provider-request-1",
            correlation_id="correlation-1",
            started_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
            completed_at=datetime(2026, 9, 20, 10, 0, 2, tzinfo=UTC),
            audit=_audit_context(),
        )


async def _create_classification_case(
    postgres_session_factory,
    service: PersistenceService,
    workspace_id: UUID,
) -> tuple[UUID, UUID]:
    receipt = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="classification-email",
        receipt=_receipt(),
        audit=_audit_context(),
    )
    case_id = await service.ensure_classification_case(
        workspace_id=workspace_id,
        email_id=receipt.email_id,
        audit=_audit_context(),
    )
    return receipt.email_id, case_id


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classification_shell_is_created_once_per_email_and_audited_once(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    email_id, first_case_id = await _create_classification_case(
        postgres_session_factory, service, workspace_id
    )

    replayed_case_id = await service.ensure_classification_case(
        workspace_id=workspace_id,
        email_id=email_id,
        audit=_audit_context(),
    )
    current_state = await service.get_classification_state(case_id=first_case_id)

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, first_case_id)
        case_count = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.email_id == email_id)
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.entity_id == str(first_case_id),
                AuditEventRecord.event_type == "CASE_CLASSIFICATION_PENDING",
            )
        )

    assert replayed_case_id == first_case_id
    assert current_state == "PENDING"
    assert case_count == 1
    assert audit_count == 1
    assert case is not None
    assert case.classification_state == "PENDING"
    assert case.category is None
    assert case.status is None
    assert case.evaluator_output is None
    assert case.model_version == "jev-1.13.0"
    assert case.prompt_version == "classification-v1"
    assert case.rule_version == "rules-1"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classification_retry_appends_attempts_and_success_clears_current_error(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await _create_classification_case(
        postgres_session_factory, service, workspace_id
    )
    started_at = datetime(2026, 9, 20, 10, tzinfo=UTC)
    completed_at = datetime(2026, 9, 20, 10, 0, 2, tzinfo=UTC)
    failure_audit = AuditContext(
        request_id="request-v1",
        rule_version="rules-v1",
        model_version="jev-1.13.0",
        prompt_version="prompt-v1",
    )
    success_audit = AuditContext(
        request_id="request-v2",
        rule_version="rules-v2",
        model_version="jev-1.13.0",
        prompt_version="prompt-v2",
    )

    await service.record_classification_failure(
        case_id=case_id,
        requested_model="jev-1.13.0",
        returned_model=None,
        safe_diagnostic="provider timeout",
        retryable=True,
        provider_request_id=None,
        correlation_id="correlation-1",
        started_at=started_at,
        completed_at=completed_at,
        audit=failure_audit,
    )
    await service.record_classification_success(
        case_id=case_id,
        category="GENERAL",
        category_probabilities=_classification_probabilities(),
        requested_model="jev-1.13.0",
        returned_model="jev-1.13.0",
        provider_request_id="provider-request-2",
        correlation_id="correlation-2",
        started_at=completed_at,
        completed_at=datetime(2026, 9, 20, 10, 0, 4, tzinfo=UTC),
        audit=success_audit,
    )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        attempts = list(
            await session.scalars(
                select(ClassificationAttempt)
                .where(ClassificationAttempt.case_id == case_id)
                .order_by(ClassificationAttempt.created_at)
            )
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.entity_id == str(case_id),
                AuditEventRecord.event_type.in_(
                    [
                        "CASE_CLASSIFICATION_FAILED",
                        "CASE_CLASSIFICATION_SUCCEEDED",
                    ]
                ),
            )
        )

    assert case is not None
    assert case.classification_state == "CLASSIFIED"
    assert case.provider_error is None
    assert case.provider_retryable is None
    assert case.provider_request_id == "provider-request-2"
    assert case.provider_attempt_count == 2
    assert case.prompt_version == "prompt-v2"
    assert case.rule_version == "rules-v2"
    assert case.category_probabilities == _classification_probabilities()
    assert case.evaluator_output == {
        "category": "GENERAL",
        "status": "OK",
        "review_reason": None,
        "has_defect": False,
        "defect_fields": [],
    }
    assert [(attempt.outcome, attempt.retryable) for attempt in attempts] == [
        ("PROVIDER_FAILED", True),
        ("SUCCEEDED", False),
    ]
    assert attempts[0].safe_diagnostic == "provider timeout"
    assert attempts[0].correlation_id == "correlation-1"
    assert attempts[0].prompt_version == "prompt-v1"
    assert attempts[0].rule_version == "rules-v1"
    assert attempts[1].requested_model == "jev-1.13.0"
    assert attempts[1].returned_model == "jev-1.13.0"
    assert attempts[1].prompt_version == "prompt-v2"
    assert attempts[1].rule_version == "rules-v2"
    assert audit_count == 2


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_bl_classification_requires_owner_and_stays_ready_without_status_output(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await _create_classification_case(
        postgres_session_factory, service, workspace_id
    )

    success = {
        "case_id": case_id,
        "category": "BL_COMPARISON",
        "category_probabilities": _classification_probabilities(),
        "requested_model": "jev-1.13.0",
        "returned_model": "jev-1.13.0",
        "provider_request_id": "provider-request-bl",
        "correlation_id": "correlation-bl",
        "started_at": datetime(2026, 9, 20, 10, tzinfo=UTC),
        "completed_at": datetime(2026, 9, 20, 10, 0, 2, tzinfo=UTC),
        "audit": _audit_context(),
    }
    with pytest.raises(ValueError, match="assigned owner"):
        await service.record_classification_success(**success)

    await service.record_classification_success(
        **success,
        assigned_owner_id="ops-1",
    )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)

    assert case is not None
    assert case.classification_state == "BL_READY"
    assert case.category == "BL_COMPARISON"
    assert case.status is None
    assert case.evaluator_output is None
    assert case.assigned_owner_id == "ops-1"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classification_audit_failure_rolls_back_case_and_attempt(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await _create_classification_case(
        postgres_session_factory, service, workspace_id
    )

    async def reject_audit(_session, _event) -> None:
        raise RuntimeError("audit unavailable")

    failing_service = PersistenceService(
        postgres_session_factory,
        InMemoryPrivateObjectStore(),
        audit_writer=reject_audit,
    )
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.record_classification_failure(
            case_id=case_id,
            requested_model="jev-1.13.0",
            returned_model=None,
            safe_diagnostic="provider timeout",
            retryable=True,
            provider_request_id=None,
            correlation_id="correlation-rollback",
            started_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
            completed_at=datetime(2026, 9, 20, 10, 0, 2, tzinfo=UTC),
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        attempt_count = await session.scalar(
            select(func.count())
            .select_from(ClassificationAttempt)
            .where(ClassificationAttempt.case_id == case_id)
        )

    assert case is not None
    assert case.classification_state == "PENDING"
    assert case.provider_error is None
    assert case.provider_attempt_count == 0
    assert attempt_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classification_shell_audit_failure_rolls_back_new_case(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    receipt = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="classification-audit-rollback",
        receipt=_receipt(),
        audit=_audit_context(),
    )

    async def reject_audit(_session, _event) -> None:
        raise RuntimeError("audit unavailable")

    failing_service = PersistenceService(
        postgres_session_factory,
        InMemoryPrivateObjectStore(),
        audit_writer=reject_audit,
    )
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.ensure_classification_case(
            workspace_id=workspace_id,
            email_id=receipt.email_id,
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        case_count = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.email_id == receipt.email_id)
        )
        pending_audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.workspace_id == workspace_id,
                AuditEventRecord.event_type == "CASE_CLASSIFICATION_PENDING",
            )
        )

    assert case_count == 0
    assert pending_audit_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_audit_failure_rolls_back_reconciliation_review_and_cache(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)
    receipt = _receipt(attachment_bytes=b"rollback-source-attachment")
    await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="rollback-source",
        receipt=receipt,
        audit=_audit_context(),
    )
    run_id = uuid4()
    async with postgres_session_factory() as session, session.begin():
        session.add(
            ReconciliationRun(
                reconciliation_run_id=run_id,
                workspace_id=workspace_id,
                source_hash="f" * 64,
                rule_version="rules-1",
            )
        )

    async def reject_audit(_session, _event) -> None:
        raise RuntimeError("audit unavailable")

    failing_service = PersistenceService(
        postgres_session_factory,
        store,
        audit_writer=reject_audit,
    )
    reconciliation_id = uuid4()
    result = ReconciliationResult.model_validate(
        {
            "reconciliation_id": str(reconciliation_id),
            "reconciliation_run_id": str(run_id),
            "subject_key": "shipment:SHP-ROLLBACK",
            "outcome": "MISSING_CASE",
            "shipment_id": "SHP-ROLLBACK",
            "case_ids": [],
            "match_basis": ["shipment_id"],
            "source_freshness": "CURRENT",
            "reviewed_at": None,
            "created_at": "2026-09-20T10:00:00Z",
        }
    )
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.persist_reconciliation_result(
            workspace_id=workspace_id,
            result=result,
            audit=_audit_context(),
        )

    await service.persist_reconciliation_result(
        workspace_id=workspace_id,
        result=result,
        audit=_audit_context(),
    )
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.append_review_assignment(
            workspace_id=workspace_id,
            assignment=ReviewAssignmentInput(
                review_assignment_id=uuid4(),
                target_type="RECONCILIATION_EXCEPTION",
                case_id=None,
                reconciliation_id=reconciliation_id,
                assigned_owner_id="reviewer-1",
                state="ASSIGNED",
            ),
            audit=_audit_context(),
        )
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="RECONCILIATION_EXCEPTION",
                case_id=None,
                reconciliation_id=reconciliation_id,
                actor_id="reviewer-1",
                action="ACKNOWLEDGE",
                rationale="Testing atomic rollback.",
            ),
            audit=_audit_context(),
        )
    extraction = ExtractionResult(values=[])
    with pytest.raises(RuntimeError, match="audit unavailable"):
        await failing_service.cache_extraction(
            workspace_id=workspace_id,
            content_hash=sha256_hex(receipt.attachments[0].data),
            extractor_route="digital_pdf",
            extractor_version="gemini-3.5-flash",
            extraction_schema_version="extraction-v1",
            result=extraction,
            provenance=[],
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        reconciliation_count = await session.scalar(
            select(func.count())
            .select_from(ReconciliationResultRecord)
            .where(ReconciliationResultRecord.reconciliation_id == reconciliation_id)
        )
        assignment_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(ReviewAssignmentRecord.workspace_id == workspace_id)
        )
        action_count = await session.scalar(
            select(func.count())
            .select_from(ReviewActionRecord)
            .where(ReviewActionRecord.workspace_id == workspace_id)
        )
        cache_count = await session.scalar(
            select(func.count())
            .select_from(ExtractionCache)
            .where(
                ExtractionCache.content_hash == sha256_hex(receipt.attachments[0].data)
            )
        )
        audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(AuditEventRecord.workspace_id == workspace_id)
        )

    assert reconciliation_count == 1
    assert assignment_count == 0
    assert action_count == 0
    assert cache_count == 0
    assert audit_count == 2
