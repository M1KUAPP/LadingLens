from __future__ import annotations

import json
import logging
from uuid import UUID, uuid4

import pytest
from comparison_fixtures import (
    FailingEquivalence,
    FailingRoleDecider,
    build_bl_ready_case,
    rate_limited_then_succeeded_scan,
)
from sqlalchemy import func, select

from app.contracts import ComparedField, ReviewReason, Status
from app.extraction import GeminiExtractor
from app.gemini import GeminiNotConfigured, KeyAttempt
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevRoleDecision,
)
from app.models import (
    AuditEventRecord,
    CaseRecord,
    DocumentRoleDecisionRecord,
    FieldVerdictRecord,
    GuestSession,
    ReviewAssignmentRecord,
    Workspace,
)
from app.persistence import AuditContext, PersistenceService, _payload_hash
from app.pipeline import ComparisonPipeline
from app.storage import InMemoryPrivateObjectStore

F = ComparedField


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


def _audit(request_id: str = "pipeline-request") -> AuditContext:
    return AuditContext(request_id=request_id, rule_version="rules-1")


async def _new_case(
    service: PersistenceService,
    workspace_id: UUID,
    roles: _FakeRoleDecider,
    *,
    idempotency_key: str,
    si_file: str = "email_001_SI.txt",
    bl_file: str = "email_001_BL.txt",
) -> tuple[UUID, UUID]:
    """Build a BL_READY case and teach the fake role decider its attachments.

    The fake looks at file names only because it is a test double standing
    in for Jev; the product's JevDocumentRoleClient never receives names,
    only attachment_id and text (see app.jev.RoleDocument).
    """
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
        if "_SI." in file_name:
            role = DocumentRole.SI
        elif "_BL." in file_name:
            role = DocumentRole.DRAFT_BL
        else:
            role = DocumentRole.OTHER
        self._roles[str(attachment_id)] = role

    async def decide(self, documents, *, correlation_id=None):
        return [
            _role_decision(document.document_id, self._roles[document.document_id])
            for document in documents
        ]


async def _boom_generate(contents, config=None, *, attempts=None):
    raise AssertionError("Gemini must not be called for these fixtures")


def _gemini_stub() -> GeminiExtractor:
    return GeminiExtractor(generate=_boom_generate)


class _FakeEquivalence:
    """Returns a fixed probability per field; a missing field is a bug."""

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


class _UncalledEquivalence:
    async def judge(self, questions, *, correlation_id=None):
        raise AssertionError("Jev equivalence must not be called for a structural case")


class _CrashingRoleDecider(_FakeRoleDecider):
    """Raises a non-provider error for the attachments listed in crash_on."""

    def __init__(self) -> None:
        super().__init__()
        self.crash_on: set[str] = set()

    async def decide(self, documents, *, correlation_id=None):
        if any(document.document_id in self.crash_on for document in documents):
            # The message carries document text, which must never be logged.
            texts = " ".join(document.text for document in documents)
            raise RuntimeError(f"role decider crashed on {texts!r}")
        return await super().decide(documents, correlation_id=correlation_id)


class _RivalComparesFirst:
    """Stands in for Jev while a rival run compares the same case first."""

    def __init__(
        self, rival: ComparisonPipeline, *, workspace_id: UUID, case_id: UUID
    ) -> None:
        self._rival = rival
        self._workspace_id = workspace_id
        self._case_id = case_id

    async def judge(self, questions, *, correlation_id=None):
        await self._rival.run_case(
            workspace_id=self._workspace_id,
            case_id=self._case_id,
            audit=_audit("rival-request"),
        )
        answers = _FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02})
        return await answers.judge(questions, correlation_id=correlation_id)


class _FakeGeminiResponse:
    def __init__(self, text: str, model_version: str | None = None) -> None:
        self.text = text
        self.model_version = model_version


def _scan_json(*, consignee: str = "V consignee") -> str:
    """A schema-valid GeminiDocument JSON for a scanned SI/BL page."""
    fields = {
        field.value: {
            "value": (
                "1 x 40'HC"
                if field is F.CONTAINER_COUNT
                else "1,000 KG"
                if field is F.GROSS_WEIGHT_KG
                else consignee
                if field is F.CONSIGNEE
                else f"V {field.value}"
            ),
            "page": 1,
            "region": "party",
        }
        for field in ComparedField
    }
    return json.dumps(
        {
            "document_title": "SHIPPING INSTRUCTION",
            "transcription": "SHIPPING INSTRUCTION",
            "fields": fields,
        }
    )


async def _rate_limited_then_timeout(contents, config=None, *, attempts=None):
    """Records the first key's rate limit, then times out before a second."""
    attempts.append(KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429))
    raise TimeoutError


async def _answer_not_in_the_text(contents, config=None, *, attempts=None):
    """A schema-valid answer whose values the document's text does not contain."""
    ok = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
    return _FakeGeminiResponse(_scan_json()), ok


async def _times_out(contents, config=None, *, attempts=None):
    raise TimeoutError


async def _unconfigured(contents, config=None, *, attempts=None):
    raise GeminiNotConfigured("GEMINI_API_KEY is not set")


class _ScanCallCounter:
    """Answers the SI scan first and the BL scan second, both differing only
    by consignee, so exactly one equivalence question is ever asked."""

    def __init__(self, model_version: str) -> None:
        self._texts = [
            _scan_json(consignee="SI CONSIGNEE"),
            _scan_json(consignee="BL CONSIGNEE"),
        ]
        self._model_version = model_version
        self.calls = 0

    async def __call__(self, contents, config=None, *, attempts=None):
        text = self._texts[self.calls]
        self.calls += 1
        ok = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
        return _FakeGeminiResponse(text, self._model_version), ok


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_identical_pair_is_compared_with_no_gemini_call(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    email_id, case_id = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001"
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_FakeEquivalence({})
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.OK
    assert all(analysis.model_version is None for analysis in run.analyses)

    async with postgres_session_factory() as session:
        verdict_count = await session.scalar(
            select(func.count())
            .select_from(FieldVerdictRecord)
            .where(FieldVerdictRecord.case_id == case_id)
        )
    assert verdict_count == 7

    role_decisions = await service.latest_document_role_decisions(
        workspace_id=workspace_id, email_id=email_id
    )
    assert len(role_decisions) == 2


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_role_decider_provider_failure_leaves_case_bl_ready(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    email_id, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="email-001-role-failure"
    )

    pipeline = ComparisonPipeline(
        service,
        roles=FailingRoleDecider(),
        gemini=_gemini_stub(),
        equivalence=_UncalledEquivalence(),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "PROVIDER_FAILED"
    assert run.failure_code == JevFailureCode.TIMEOUT.value
    assert run.retryable is True
    assert run.evaluator_output is None

    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"

    decisions = await service.latest_document_role_decisions(
        workspace_id=workspace_id, email_id=email_id
    )
    assert len(decisions) == 2
    assert all(snapshot.outcome == "PROVIDER_FAILED" for snapshot in decisions.values())

    async with postgres_session_factory() as session:
        rows = (
            await session.scalars(
                select(DocumentRoleDecisionRecord).where(
                    DocumentRoleDecisionRecord.attachment_id.in_(decisions.keys())
                )
            )
        ).all()
    assert len(rows) == 2
    assert all(row.outcome == "PROVIDER_FAILED" for row in rows)
    assert all(row.safe_diagnostic == "timeout" for row in rows)


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_scan_timeout_after_a_rate_limit_is_provider_failed_and_audited(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-512-timeout",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_rate_limited_then_timeout),
        equivalence=_UncalledEquivalence(),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "PROVIDER_FAILED"
    assert run.failure_code == "timeout"

    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"
    async with postgres_session_factory() as session:
        verdict_count = await session.scalar(
            select(func.count())
            .select_from(FieldVerdictRecord)
            .where(FieldVerdictRecord.case_id == case_id)
        )
        failed_events = (
            await session.scalars(
                select(AuditEventRecord).where(
                    AuditEventRecord.workspace_id == workspace_id,
                    AuditEventRecord.event_type == "EXTRACTION_FAILED",
                )
            )
        ).all()
    assert verdict_count == 0
    assert len(failed_events) == 2
    # AuditEventRecord only stores the payload's hash, so verify content by
    # hashing the expected payload the same way persistence.py does.
    expected_hash = _payload_hash(
        {
            "code": "timeout",
            "retryable": True,
            "attempts": [
                {"key_index": 1, "outcome": "RATE_LIMITED", "status_code": 429}
            ],
        }
    )
    assert all(event.payload_hash == expected_hash for event in failed_events)


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_scan_second_key_success_is_audited_and_recorded_in_model_version(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-512-second-key",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=rate_limited_then_succeeded_scan),
        equivalence=_UncalledEquivalence(),
        # A distinct extractor version keeps this test's cache writes from
        # leaking into other tests sharing the same scanned PDF bytes: the
        # extraction cache is keyed by (content_hash, extractor_version)
        # only, not by workspace.
        gemini_model="gemini-3.5-flash-second-key-test",
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.OK

    async with postgres_session_factory() as session:
        second_key_events = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.workspace_id == workspace_id,
                AuditEventRecord.event_type == "GEMINI_SECOND_KEY_USED",
            )
        )
        case = await session.get(CaseRecord, case_id)
    assert second_key_events == 2
    assert case is not None
    assert "gemini-3.5-flash-002" in case.model_version


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_differing_parties_are_mismatched_via_equivalence(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02}),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.MISMATCH
    assert run.evaluator_output.defect_fields == [F.CONSIGNEE, F.NOTIFY_PARTY]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_mid_band_probability_is_interactive_review_with_case_assignment(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004-review",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.55, F.NOTIFY_PARTY: 0.02}),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.MISMATCH
    assert F.CONSIGNEE in run.evaluator_output.defect_fields

    async with postgres_session_factory() as session:
        verdict_rows = (
            await session.scalars(
                select(FieldVerdictRecord).where(FieldVerdictRecord.case_id == case_id)
            )
        ).all()
        assignment_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
        assignment = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
    consignee_row = next(row for row in verdict_rows if row.field == F.CONSIGNEE)
    assert consignee_row.interactive_state == "REVIEW"
    assert assignment_count == 1
    assert assignment is not None
    assert assignment.assigned_owner_id == "bl-owner"
    assert assignment.state == "ASSIGNED"

    review_status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert review_status.disposition == "IN_REVIEW"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_missing_value_is_needs_review_without_equivalence_call(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-516",
        si_file="email_516_SI.txt",
        bl_file="email_516_BL.txt",
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.review_reason == ReviewReason.MISSING_VALUE

    async with postgres_session_factory() as session:
        verdict_count = await session.scalar(
            select(func.count())
            .select_from(FieldVerdictRecord)
            .where(FieldVerdictRecord.case_id == case_id)
        )
        assignment_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
        assignment = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
    assert verdict_count == 0
    assert assignment_count == 1
    assert assignment is not None
    assert assignment.assigned_owner_id == "bl-owner"
    assert assignment.state == "ASSIGNED"

    review_status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert review_status.classification_state == "CLASSIFIED"
    assert review_status.status == Status.NEEDS_REVIEW
    assert review_status.disposition == "IN_REVIEW"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_corrupt_attachment_is_needs_review_unreadable(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-511",
        si_file="email_511_SI.txt",
        bl_file="email_511_BL.pdf",
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.review_reason == ReviewReason.UNREADABLE


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_equivalence_provider_failure_leaves_case_bl_ready_then_retries(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004-failure",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )

    failing_pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=FailingEquivalence()
    )
    failed_run = await failing_pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert failed_run.state == "PROVIDER_FAILED"
    assert failed_run.failure_code == JevFailureCode.TIMEOUT.value
    assert failed_run.retryable is True
    assert failed_run.evaluator_output is None

    reloaded = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    assert reloaded.classification_state == "BL_READY"
    async with postgres_session_factory() as session:
        verdict_count = await session.scalar(
            select(func.count())
            .select_from(FieldVerdictRecord)
            .where(FieldVerdictRecord.case_id == case_id)
        )
    assert verdict_count == 0

    working_pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02}),
    )
    retried_run = await working_pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )
    assert retried_run.state == "COMPARED"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_model_version_survives_a_cache_hit_after_an_equivalence_failure(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-512-cache",
        si_file="email_512_SI.pdf",
        bl_file="email_512_BL.pdf",
    )

    counter = _ScanCallCounter("gemini-3.5-flash-cache-test")
    shared_gemini_model = "gemini-3.5-flash-cache-hit-fixture"
    first_pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=counter),
        equivalence=FailingEquivalence(),
        gemini_model=shared_gemini_model,
    )
    first_run = await first_pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )
    assert first_run.state == "PROVIDER_FAILED"
    assert counter.calls == 2

    # The retry hits the extraction cache for both attachments (same
    # gemini_model, so the same extractor_version cache key): the stub
    # raises if Gemini is called again, proving no real call happens.
    second_pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02}),
        gemini_model=shared_gemini_model,
    )
    second_run = await second_pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert second_run.state == "COMPARED"
    # Both attachments are cache hits on the retry: DocumentAnalyzer leaves
    # model_version unset for a hit, so the pipeline's own configured
    # gemini_model is what must appear in the persisted case, not whatever
    # version the original (never-persisted) call happened to return.
    assert all(analysis.model_version is None for analysis in second_run.analyses)
    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
    assert case is not None
    assert shared_gemini_model in case.model_version


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_run_pending_completes_every_awaiting_case(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id_1 = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001-pending"
    )
    _, case_id_2 = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004-pending",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02}),
    )
    runs = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    assert {run.case_id for run in runs} == {case_id_1, case_id_2}
    assert all(run.state == "COMPARED" for run in runs)
    remaining = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    assert remaining == ()


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_run_pending_reports_a_raising_case_as_error_and_continues(
    postgres_session_factory, caplog
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _CrashingRoleDecider()
    _, crashing_case_id = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001-crash"
    )
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004-after-crash",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )
    crashing = await service.load_case_documents(
        workspace_id=workspace_id, case_id=crashing_case_id
    )
    roles.crash_on = {str(item.attachment_id) for item in crashing.attachments}

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02}),
    )
    with caplog.at_level(logging.WARNING, logger="app.pipeline"):
        runs = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    # The oldest case raised first, and the batch still reached the next one.
    assert [run.case_id for run in runs] == [crashing_case_id, case_id]
    error_run, compared_run = runs
    assert error_run.state == "ERROR"
    assert error_run.failure_code == "RuntimeError"
    assert error_run.retryable is None
    assert error_run.evaluator_output is None
    assert compared_run.state == "COMPARED"
    remaining = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    assert remaining == (crashing_case_id,)

    [record] = [item for item in caplog.records if item.name == "app.pipeline"]
    assert str(crashing_case_id) in record.getMessage()
    assert "RuntimeError" in record.getMessage()
    assert "SHIPPING INSTRUCTION" not in caplog.text


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_run_pending_skips_a_case_compared_after_it_was_listed(
    postgres_session_factory, monkeypatch
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, raced_case_id = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001-listed-race"
    )
    _, case_id = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001-after-listed-race"
    )
    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_FakeEquivalence({})
    )

    # This batch listed both cases; a rival run then compared the first.
    queue = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    await pipeline.run_case(
        workspace_id=workspace_id, case_id=raced_case_id, audit=_audit("rival-request")
    )

    async def _listed_before_the_rival(*, workspace_id):
        return queue

    monkeypatch.setattr(
        service, "list_cases_awaiting_comparison", _listed_before_the_rival
    )
    runs = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    assert [(run.case_id, run.state) for run in runs] == [(case_id, "COMPARED")]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_run_pending_skips_a_case_a_rival_run_records_first(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, raced_case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-004-record-race",
        si_file="email_004_SI.txt",
        bl_file="email_004_BL.txt",
    )
    _, case_id = await _new_case(
        service, workspace_id, roles, idempotency_key="email-001-after-record-race"
    )
    rival = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02, F.NOTIFY_PARTY: 0.02}),
    )
    # The rival records the raced case while this run waits on Jev, so this
    # run's own record_comparison_result finds it no longer awaiting comparison.
    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_RivalComparesFirst(
            rival, workspace_id=workspace_id, case_id=raced_case_id
        ),
    )

    runs = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    assert [(run.case_id, run.state) for run in runs] == [(case_id, "COMPARED")]
    raced = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=raced_case_id
    )
    assert raced.classification_state == "CLASSIFIED"
    assert raced.status == Status.MISMATCH


async def _ambiguous_bl_case(service, workspace_id, roles, key):
    """email_502's draft BL parses ambiguously, so Gemini reads its text."""
    return await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key=key,
        si_file="email_502_SI.txt",
        bl_file="email_502_BL.txt",
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_document_level_gemini_failure_goes_to_review_and_leaves_the_queue(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _ambiguous_bl_case(
        service, workspace_id, roles, "email-502-ungrounded"
    )
    documents = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_answer_not_in_the_text),
        equivalence=_UncalledEquivalence(),
        gemini_model="gemini-3.5-flash-ungrounded-test",
    )

    [run] = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    assert run.state == "NEEDS_REVIEW"
    assert (run.failure_code, run.retryable) == ("ungrounded_value", False)
    assert run.evaluator_output.review_reason == ReviewReason.UNREADABLE
    status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert (status.classification_state, status.disposition) == (
        "CLASSIFIED",
        "IN_REVIEW",
    )
    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        assignment = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
    assert case is not None
    [diagnostic] = case.structural_diagnostics
    assert diagnostic["reason"] == "unreadable"
    assert diagnostic["attachment_id"] == str(documents.attachments[1].attachment_id)
    assert diagnostic["detail"].startswith("This attachment could not be read reliably")
    assert "ungrounded" not in diagnostic["detail"]
    assert assignment is not None
    assert (assignment.assigned_owner_id, assignment.state) == ("bl-owner", "ASSIGNED")
    # The case left the queue: the next batch neither sees it nor calls Gemini.
    assert await pipeline.run_pending(workspace_id=workspace_id, audit=_audit()) == ()


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("generate", "code", "retryable"),
    [(_times_out, "timeout", True), (_unconfigured, "provider_unconfigured", False)],
    ids=["timeout", "unconfigured"],
)
async def test_service_and_system_gemini_failures_keep_the_case_bl_ready(
    postgres_session_factory, generate, code, retryable
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _FakeRoleDecider()
    _, case_id = await _ambiguous_bl_case(
        service, workspace_id, roles, f"email-502-{code}"
    )
    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=generate),
        equivalence=_UncalledEquivalence(),
        gemini_model="gemini-3.5-flash-ungrounded-test",
    )

    [run] = await pipeline.run_pending(workspace_id=workspace_id, audit=_audit())

    assert (run.state, run.failure_code, run.retryable) == (
        "PROVIDER_FAILED",
        code,
        retryable,
    )
    remaining = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    assert remaining == (case_id,)
    async with postgres_session_factory() as session:
        assignment_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(ReviewAssignmentRecord.case_id == case_id)
        )
    assert assignment_count == 0
