from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from comparison_fixtures import build_bl_ready_case
from sqlalchemy import func, select

from app.contracts import ComparedField, ReviewReason, Status
from app.extraction import GeminiExtractor
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevProviderFailure,
    JevRoleDecision,
)
from app.models import (
    FieldVerdictRecord,
    GuestSession,
    ReviewAssignmentRecord,
    Workspace,
)
from app.persistence import AuditContext, PersistenceService
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


class _FailingEquivalence:
    async def judge(self, questions, *, correlation_id=None):
        raise JevProviderFailure(
            code=JevFailureCode.TIMEOUT,
            retryable=True,
            email_ids=tuple(question.field.value for question in questions),
            correlation_id=correlation_id or "equiv-corr",
            message="Jev request timed out",
        )


class _UncalledEquivalence:
    async def judge(self, questions, *, correlation_id=None):
        raise AssertionError("Jev equivalence must not be called for a structural case")


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
    consignee_row = next(row for row in verdict_rows if row.field == F.CONSIGNEE)
    assert consignee_row.interactive_state == "REVIEW"
    assert assignment_count == 1

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
        service, roles=roles, gemini=_gemini_stub(), equivalence=_FailingEquivalence()
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
