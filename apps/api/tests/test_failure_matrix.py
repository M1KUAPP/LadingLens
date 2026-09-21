"""Provider failure matrix.

Every provider failure mode `ComparisonPipeline.run_case`, Gate 1
classification, and submission publication must fail closed on. Every
provider is a deterministic fake; no network call is ever made.

Each row of the issue's provider failure matrix, and the test (file::name)
that covers it:

- 429 on the first key, recovers on the second key, succeeds:
  test_pipeline.py::test_scan_second_key_success_is_audited_and_recorded_in_model_version
- 429 on both keys, fails closed:
  test_failure_matrix.py::test_gemini_429_on_both_keys_fails_closed_and_stays_bl_ready
  (the "rate_limited" parametrization)
- Gemini timeout, fails closed:
  test_failure_matrix.py::test_gemini_timeout_fails_closed
- Quota exhaustion, fails closed:
  test_failure_matrix.py::test_gemini_429_on_both_keys_fails_closed_and_stays_bl_ready
  (the "quota_exhausted" parametrization)
- Invalid schema shape, fails closed:
  test_failure_matrix.py::test_gemini_invalid_schema_shape_fails_closed
- Jev timeout on role decision, fails closed:
  test_pipeline.py::test_role_decider_provider_failure_leaves_case_bl_ready
- Jev timeout on equivalence, fails closed:
  test_pipeline.py::test_equivalence_provider_failure_leaves_case_bl_ready_then_retries
- Missing category blocks a submission run:
  test_failure_matrix.py::test_submission_run_blocks_on_missing_category_or_provider_failure
  (the "PENDING" parametrization; the "PROVIDER_FAILED" parametrization is
  the same run blocked by a provider failure instead)
- Idempotency conflict on replayed bytes:
  test_failure_matrix.py::test_idempotency_conflict_on_replayed_key_with_different_bytes
"""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID, uuid4

import pytest
from comparison_fixtures import FailingEquivalence, build_bl_ready_case
from google.genai import errors
from sqlalchemy import select
from test_submission_persistence import _seed_complete_general_cases

from app.contracts import ComparedField
from app.extraction import GeminiExtractor
from app.gemini import GeminiCallError, KeyAttempt
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevEquivalence,
    JevRoleDecision,
)
from app.models import (
    AuditEventRecord,
    GuestSession,
    Workspace,
)
from app.persistence import (
    AttachmentInput,
    AuditContext,
    IdempotencyConflict,
    PersistenceService,
    ReceiptInput,
    _payload_hash,
)
from app.pipeline import ComparisonPipeline
from app.storage import InMemoryPrivateObjectStore
from app.submission import EXPECTED_EMAIL_IDS


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


def _audit(request_id: str = "failure-matrix-request") -> AuditContext:
    return AuditContext(request_id=request_id, rule_version="rules-1")


def _role_decision(document_id: str, role: DocumentRole) -> JevRoleDecision:
    probabilities = {"SI": 0.05, "DRAFT_BL": 0.05, "OTHER": 0.05}
    probabilities[role.value] = 0.9
    return JevRoleDecision(
        document_id=document_id,
        role=role,
        probabilities=probabilities,
        confidence=0.9,
        returned_model=JEV_MODEL,
        provider_request_id="role-req",
        correlation_id="role-corr",
    )


class _FakeRoleDecider:
    """Maps attachment file names to roles; registered per built case."""

    def __init__(self) -> None:
        self._roles: dict[str, DocumentRole] = {}

    def register(self, attachment_id: UUID, file_name: str) -> None:
        role = (
            DocumentRole.SI
            if "_SI." in file_name
            else DocumentRole.DRAFT_BL
            if "_BL." in file_name
            else DocumentRole.OTHER
        )
        self._roles[str(attachment_id)] = role

    async def decide(self, documents, *, correlation_id=None):
        return [
            _role_decision(document.document_id, self._roles[document.document_id])
            for document in documents
        ]


class _FakeEquivalence:
    def __init__(self, probabilities: dict[ComparedField, float]) -> None:
        self._probabilities = probabilities

    async def judge(self, questions, *, correlation_id=None):
        return [
            JevEquivalence(
                field=question.field,
                probability=self._probabilities[question.field],
                returned_model=JEV_MODEL,
                provider_request_id="equiv-req",
                correlation_id=correlation_id or "equiv-corr",
            )
            for question in questions
        ]


async def _new_case(
    service: PersistenceService,
    workspace_id: UUID,
    roles: _FakeRoleDecider,
    *,
    idempotency_key: str,
    si_file: str = "email_001_SI.txt",
    bl_file: str = "email_001_BL.txt",
) -> tuple[UUID, UUID]:
    email_id, case_id = await build_bl_ready_case(
        service,
        workspace_id,
        idempotency_key=idempotency_key,
        si_file=si_file,
        bl_file=bl_file,
    )
    documents = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    for attachment in documents.attachments:
        roles.register(attachment.attachment_id, attachment.file_name)
    return email_id, case_id


class _FakeGeminiResponse:
    def __init__(self, text: str) -> None:
        self.text = text
        self.model_version = "gemini-3.5-flash-failure-matrix"


def _quota_error(quota_id: str) -> errors.ClientError:
    """A Gemini 429 body; every quota's message says "exceeded your quota"."""
    return errors.ClientError(
        429,
        {
            "error": {
                "code": 429,
                "message": "You exceeded your current quota, please check your "
                "plan and billing details.",
                "status": "RESOURCE_EXHAUSTED",
                "details": [
                    {
                        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                        "violations": [
                            {
                                "quotaMetric": "generativelanguage.googleapis.com/"
                                "generate_content_free_tier_requests",
                                "quotaId": quota_id,
                            }
                        ],
                    }
                ],
            }
        },
    )


def _both_keys_rate_limited(quota_id: str):
    """Both keys come back 429, exactly as `generate_traced` reports after
    exhausting the second key: two RATE_LIMITED attempts, then the raise."""
    attempts = (
        KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),
        KeyAttempt(key_index=2, outcome="RATE_LIMITED", status_code=429),
    )
    call_error = GeminiCallError(_quota_error(quota_id), attempts)

    async def generate(contents, config=None, *, attempts=None):
        raise call_error

    return generate


async def _always_hangs(contents, config=None, *, attempts=None):
    await asyncio.sleep(999)


async def _invalid_schema_shape(contents, config=None, *, attempts=None):
    ok = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
    # Missing the required "fields" key entirely: fails GeminiDocument validation.
    return _FakeGeminiResponse(
        json.dumps({"document_title": "x", "transcription": "x"})
    ), ok


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("quota_id", "expected_code"),
    [
        ("GenerateRequestsPerDayPerProjectPerModel-FreeTier", "quota_exhausted"),
        ("GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "rate_limited"),
    ],
)
async def test_gemini_429_on_both_keys_fails_closed_and_stays_bl_ready(
    postgres_session_factory, quota_id: str, expected_code: str
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key=f"failure-matrix-both-keys-{expected_code}",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_both_keys_rate_limited(quota_id)),
        equivalence=FailingEquivalence(),  # must not be reached
        # A distinct extractor version per parametrization keeps this
        # always-failing call from ever hitting another test's cached scan
        # result for the same PDF bytes (the cache is keyed by
        # (content_hash, extractor_version) only, not by workspace) and
        # keeps this test from failing to write one of its own.
        gemini_model=f"gemini-3.5-flash-both-keys-{expected_code}",
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "PROVIDER_FAILED"
    assert run.failure_code == expected_code
    assert run.retryable is True

    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"

    async with postgres_session_factory() as session:
        failed_events = (
            await session.scalars(
                select(AuditEventRecord).where(
                    AuditEventRecord.workspace_id == workspace_id,
                    AuditEventRecord.event_type == "EXTRACTION_FAILED",
                )
            )
        ).all()
    assert len(failed_events) == 2
    expected_hash = _payload_hash(
        {
            "code": expected_code,
            "retryable": True,
            "attempts": [
                {"key_index": 1, "outcome": "RATE_LIMITED", "status_code": 429},
                {"key_index": 2, "outcome": "RATE_LIMITED", "status_code": 429},
            ],
        }
    )
    assert all(event.payload_hash == expected_hash for event in failed_events)


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_gemini_timeout_fails_closed(postgres_session_factory) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="failure-matrix-gemini-timeout",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_always_hangs, timeout_seconds=0.05),
        equivalence=FailingEquivalence(),  # must not be reached
        # See the "both keys" test above for why this must be distinct.
        gemini_model="gemini-3.5-flash-gemini-timeout",
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "PROVIDER_FAILED"
    assert run.failure_code == "timeout"
    assert run.retryable is True
    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_gemini_invalid_schema_shape_fails_closed(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="failure-matrix-invalid-schema",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_invalid_schema_shape),
        equivalence=FailingEquivalence(),  # must not be reached
        # See the "both keys" test above for why this must be distinct.
        gemini_model="gemini-3.5-flash-invalid-schema",
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "PROVIDER_FAILED"
    assert run.failure_code == "invalid_schema"
    assert run.retryable is True
    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"


def _manifest_hash() -> str:
    return sha256("\n".join(EXPECTED_EMAIL_IDS).encode()).hexdigest()


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("first_case_state", "expected_code"),
    [
        ("PENDING", "MISSING_CATEGORY"),
        ("PROVIDER_FAILED", "PROVIDER_FAILURE"),
    ],
)
async def test_submission_run_blocks_on_missing_category_or_provider_failure(
    postgres_session_factory, first_case_state: str, expected_code: str
) -> None:
    """email_001 sits at `first_case_state` (no completed category decision,
    or a failed classification attempt); every other expected email is
    fully CLASSIFIED. `execute_submission_run` must block the whole run and
    report the matching blocker for exactly that email, not publish."""
    workspace_id, _ = await _seed_complete_general_cases(
        postgres_session_factory, first_case_state=first_case_state
    )
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    result = await service.execute_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        rule_version="rules-1",
        serializer_version="submission-v1",
        version_manifest={"jev_model": JEV_MODEL, "ai_model": "gemini-3.5-flash"},
        scoring_endpoint=None,
        audit=_audit(),
    )

    assert result.publication_state == "BLOCKED"
    assert any(
        blocker.email_id == "email_001" and blocker.code.value == expected_code
        for blocker in result.blockers
    )
    assert result.artifact_hash is None


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_idempotency_conflict_on_replayed_key_with_different_bytes(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    def _receipt(message: bytes) -> ReceiptInput:
        return ReceiptInput(
            source_message_id="failure-matrix-idempotency",
            received_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
            sender="ops@example.com",
            subject="Draft BL",
            message_bytes=message,
            body_text="Please compare the attached documents.",
            attachments=(
                AttachmentInput(
                    file_name="draft.txt",
                    data=message,
                    declared_media_type="text/plain",
                    detected_format="txt",
                ),
            ),
        )

    await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key="failure-matrix-idem-key",
        receipt=_receipt(b"first submission bytes"),
        audit=_audit("idem-first"),
    )

    with pytest.raises(IdempotencyConflict):
        await service.persist_receipt(
            workspace_id=workspace_id,
            idempotency_key="failure-matrix-idem-key",
            receipt=_receipt(b"different submission bytes"),
            audit=_audit("idem-second"),
        )

    async with postgres_session_factory() as session:
        events = (
            await session.scalars(
                select(AuditEventRecord)
                .where(AuditEventRecord.workspace_id == workspace_id)
                .order_by(AuditEventRecord.occurred_at)
            )
        ).all()
    assert [event.event_type for event in events] == [
        "EMAIL_RECEIVED",
        "IDEMPOTENCY_CONFLICT",
    ]
