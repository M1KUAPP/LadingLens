import math
from uuid import UUID, uuid4

import pytest
from comparison_fixtures import BUNDLE_ATTACHMENTS, build_bl_ready_case
from sqlalchemy import func, select

from app.comparison import (
    admit_pair,
    compare_fields,
    comparison_output,
    resolve_verdicts,
    structural_output,
)
from app.contracts import (
    Category,
    ComparedField,
    ExtractedValue,
    ExtractionResult,
    FieldVerdict,
    Provenance,
    ReviewReason,
    Status,
)
from app.extraction import DocumentAnalysis
from app.formats import Preflight
from app.jev import DocumentRole, JevEquivalence, JevRoleDecision
from app.models import (
    AuditEventRecord,
    CaseRecord,
    FieldVerdictRecord,
    GuestSession,
    ReviewActionRecord,
    ReviewAssignmentRecord,
    Workspace,
)
from app.persistence import (
    AuditContext,
    PersistenceService,
    ReviewActionInput,
    ReviewAssignmentInput,
    _payload_hash,
)
from app.storage import InMemoryPrivateObjectStore, sha256_hex
from app.submission import StructuralDiagnostic

F = ComparedField
BASE = {
    F.SHIPPER: "APRIL FAR EAST (M) SDN BHD",
    F.CONSIGNEE: "MOORIM SP CO., LTD",
    F.NOTIFY_PARTY: "UAB NOVAKOPA",
    F.PORT_OF_LOADING: "PORT KLANG (WESTPORT), MALAYSIA (MYPKG)",
    F.PORT_OF_DISCHARGE: "CALLAO, PERU (PECLL)",
    F.CONTAINER_COUNT: "1 x 40'HC",
    F.GROSS_WEIGHT_KG: "21,577 KG",
}


def _audit_context() -> AuditContext:
    return AuditContext(request_id="request-1", rule_version="rules-1")


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


def _preflight(status: str = "OK") -> Preflight:
    return Preflight(
        content_hash="a" * 64, byte_size=10, detected_format="txt", status=status
    )


def _role(document_id: str, role: DocumentRole) -> JevRoleDecision:
    probabilities = {"SI": 0.05, "DRAFT_BL": 0.05, "OTHER": 0.05}
    probabilities[role.value] = 0.9
    return JevRoleDecision(
        document_id=document_id,
        role=role,
        probabilities=probabilities,
        confidence=0.9,
        returned_model="jev-1.13.0",
        provider_request_id="r",
        correlation_id="c",
    )


def _doc(
    document_id: str, doc_role: DocumentRole, values: dict | None = None
) -> DocumentAnalysis:
    values = BASE if values is None else values
    extraction = ExtractionResult(
        values=[
            ExtractedValue(
                field=field,
                raw_value=raw,
                provenance=Provenance.model_validate(
                    {
                        "attachment_id": document_id,
                        "file_name": f"{document_id}.txt",
                        "format": "txt",
                        "location": {
                            "kind": "txt",
                            "line": index + 4,
                            "start_col": 0,
                            "end_col": len(raw),
                        },
                    }
                ),
            )
            for index, (field, raw) in enumerate(values.items())
        ]
    )
    return DocumentAnalysis(
        attachment_id=document_id,
        file_name=f"{document_id}.txt",
        preflight=_preflight(),
        route="local",
        role=_role(document_id, doc_role),
        extraction=extraction,
    )


def _equivalence(field: ComparedField, probability: float) -> JevEquivalence:
    return JevEquivalence(
        field=field,
        probability=probability,
        returned_model="jev-1.13.0",
        provider_request_id="r",
        correlation_id="c",
    )


def _matching_verdicts():
    drafts = compare_fields(
        admit_pair([_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)])
    )
    return resolve_verdicts(drafts, [])


def _missing_value_diagnostics():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI, {**BASE, F.GROSS_WEIGHT_KG: "TBD"}),
            _doc("bl", DocumentRole.DRAFT_BL),
        ]
    )
    return admission.diagnostics


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_load_case_documents_returns_ordered_attachments_and_rejects_foreign_workspace(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    other_workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    email_id, case_id = await build_bl_ready_case(service, workspace_id)

    documents = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )

    assert documents.case_id == case_id
    assert documents.email_id == email_id
    assert documents.classification_state == "BL_READY"
    assert documents.category == Category.BL_COMPARISON
    assert documents.assigned_owner_id == "bl-owner"
    assert [attachment.file_name for attachment in documents.attachments] == [
        "email_001_SI.txt",
        "email_001_BL.txt",
    ]
    si_bytes = (BUNDLE_ATTACHMENTS / "email_001_SI.txt").read_bytes()
    bl_bytes = (BUNDLE_ATTACHMENTS / "email_001_BL.txt").read_bytes()
    assert documents.attachments[0].data == si_bytes
    assert documents.attachments[1].data == bl_bytes
    assert documents.attachments[0].content_hash == sha256_hex(si_bytes)
    assert documents.attachments[1].content_hash == sha256_hex(bl_bytes)

    with pytest.raises(ValueError, match="does not belong to workspace"):
        await service.load_case_documents(
            workspace_id=other_workspace_id, case_id=case_id
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_list_cases_awaiting_comparison_tracks_bl_ready_state(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(service, workspace_id)

    before = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    assert case_id in before

    verdicts = _matching_verdicts()
    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=comparison_output(verdicts),
        field_verdicts=verdicts,
        structural_diagnostics=(),
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    after = await service.list_cases_awaiting_comparison(workspace_id=workspace_id)
    assert case_id not in after


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_record_comparison_result_classifies_case_with_seven_verdicts(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(service, workspace_id)

    drafts = compare_fields(
        admit_pair(
            [
                _doc("si", DocumentRole.SI),
                _doc(
                    "bl",
                    DocumentRole.DRAFT_BL,
                    {**BASE, F.NOTIFY_PARTY: "Novakopa UAB"},
                ),
            ]
        )
    )
    verdicts = resolve_verdicts(drafts, [_equivalence(F.NOTIFY_PARTY, 0.93)])
    output = comparison_output(verdicts)

    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=output,
        field_verdicts=verdicts,
        structural_diagnostics=(),
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        verdict_rows = (
            await session.scalars(
                select(FieldVerdictRecord).where(FieldVerdictRecord.case_id == case_id)
            )
        ).all()
        audit_events = (
            await session.scalars(
                select(AuditEventRecord).where(
                    AuditEventRecord.workspace_id == workspace_id,
                    AuditEventRecord.event_type == "CASE_COMPARED",
                )
            )
        ).all()

    assert case is not None
    assert case.classification_state == "CLASSIFIED"
    assert case.category == Category.BL_COMPARISON
    assert case.assigned_owner_id == "bl-owner"
    assert case.evaluator_output == output.model_dump(mode="json")
    assert len(verdict_rows) == 7
    assert len(audit_events) == 1

    jev_row = next(row for row in verdict_rows if row.field == F.NOTIFY_PARTY)
    assert jev_row.deterministic_result == "NOT_APPLICABLE"
    assert jev_row.semantic_probability == pytest.approx(0.93)

    for row in verdict_rows:
        snapshot = PersistenceService._submission_field_snapshot(row)
        assert snapshot.field == row.field


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_record_comparison_result_stores_structural_diagnostic_and_guards_reuse(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="structural-case"
    )
    diagnostics = _missing_value_diagnostics()
    output = structural_output(diagnostics)

    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=output,
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        verdict_count = await session.scalar(
            select(func.count())
            .select_from(FieldVerdictRecord)
            .where(FieldVerdictRecord.case_id == case_id)
        )

    assert case is not None
    assert case.classification_state == "CLASSIFIED"
    assert case.status == Status.NEEDS_REVIEW
    assert case.review_reason == ReviewReason.MISSING_VALUE
    assert len(case.structural_diagnostics) == len(diagnostics)
    assert verdict_count == 0

    # BL_READY has already moved on to CLASSIFIED; a second call is rejected.
    with pytest.raises(ValueError, match=r"case is not awaiting comparison"):
        await service.record_comparison_result(
            case_id=case_id,
            evaluator_output=output,
            field_verdicts=(),
            structural_diagnostics=diagnostics,
            model_version="jev-1.13.0",
            prompt_version="comparison-v1",
            normalization_version="normalization-v1",
            audit=_audit_context(),
        )

    # A reason that does not match the diagnostics' own precedence is rejected
    # before any case is even touched.
    _, other_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="mismatched-case"
    )
    unreadable_diagnostic = StructuralDiagnostic(
        reason=ReviewReason.UNREADABLE,
        detail="The draft Bill of Lading could not be opened",
        attachment_id="bl",
        document_role="DRAFT_BL",
        source_hash="b" * 64,
        parser_route="local",
        parser_version="1",
    )
    mismatched_output = structural_output([unreadable_diagnostic])
    with pytest.raises(ValueError, match=r"structural diagnostics do not match"):
        await service.record_comparison_result(
            case_id=other_case_id,
            evaluator_output=mismatched_output,
            field_verdicts=(),
            structural_diagnostics=diagnostics,
            model_version="jev-1.13.0",
            prompt_version="comparison-v1",
            normalization_version="normalization-v1",
            audit=_audit_context(),
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_review_status_reports_in_review_then_approved_and_guards_reuse(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    _, review_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="review-case"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=review_case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    _, ok_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="ok-case"
    )
    ok_verdicts = _matching_verdicts()
    await service.record_comparison_result(
        case_id=ok_case_id,
        evaluator_output=comparison_output(ok_verdicts),
        field_verdicts=ok_verdicts,
        structural_diagnostics=(),
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    review_status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=review_case_id
    )
    ok_status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=ok_case_id
    )
    assert review_status.disposition == "IN_REVIEW"
    assert ok_status.disposition == "AUTO_COMPLETED"

    await service.append_review_action(
        workspace_id=workspace_id,
        action=ReviewActionInput(
            review_action_id=uuid4(),
            target_type="CASE",
            case_id=review_case_id,
            reconciliation_id=None,
            actor_id="reviewer-1",
            action="APPROVE",
            rationale="Checked with the shipper",
        ),
        audit=_audit_context(),
    )

    approved_status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=review_case_id
    )
    assert approved_status.disposition == "APPROVED"
    assert len(approved_status.actions) == 1
    assert approved_status.actions[0].actor_id == "reviewer-1"

    with pytest.raises(ValueError, match=r"case already has a review action"):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="CASE",
                case_id=review_case_id,
                reconciliation_id=None,
                actor_id="reviewer-2",
                action="APPROVE",
                rationale="Second look",
            ),
            audit=_audit_context(),
        )

    with pytest.raises(ValueError, match=r"case is not open for review"):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="CASE",
                case_id=ok_case_id,
                reconciliation_id=None,
                actor_id="reviewer-1",
                action="APPROVE",
                rationale="Not actually in review",
            ),
            audit=_audit_context(),
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_review_action_rejects_malformed_corrected_fields(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="correction-case"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    def _action(action: str, corrected_fields: dict | None = None) -> ReviewActionInput:
        return ReviewActionInput(
            review_action_id=uuid4(),
            target_type="CASE",
            case_id=case_id,
            reconciliation_id=None,
            actor_id="reviewer-1",
            action=action,
            rationale="Correcting the gross weight",
            corrected_fields=corrected_fields,
        )

    with pytest.raises(ValueError, match=r"CORRECT requires corrected_fields"):
        await service.append_review_action(
            workspace_id=workspace_id, action=_action("CORRECT"), audit=_audit_context()
        )
    with pytest.raises(
        ValueError, match=r"corrected_fields keys must be compared fields"
    ):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_action("CORRECT", {"not_a_field": "21,577 KG"}),
            audit=_audit_context(),
        )
    with pytest.raises(
        ValueError, match=r"corrected_fields values must be str, int, or float"
    ):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_action("CORRECT", {ComparedField.GROSS_WEIGHT_KG.value: True}),
            audit=_audit_context(),
        )
    with pytest.raises(ValueError, match=r"APPROVE cannot carry corrected_fields"):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_action(
                "APPROVE", {ComparedField.GROSS_WEIGHT_KG.value: "21,577 KG"}
            ),
            audit=_audit_context(),
        )

    await service.append_review_action(
        workspace_id=workspace_id,
        action=_action("CORRECT", {ComparedField.GROSS_WEIGHT_KG.value: "21,577 KG"}),
        audit=_audit_context(),
    )
    status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert status.disposition == "CORRECTED"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "value", [math.nan, math.inf, -math.inf], ids=["nan", "inf", "minus-inf"]
)
async def test_case_review_action_rejects_non_finite_corrected_numbers(
    postgres_session_factory, value
) -> None:
    # PostgreSQL JSONB cannot store NaN or Infinity; they must be a clean
    # ValueError, not a database error that surfaces as a 500.
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key=f"non-finite-{value}-case"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    with pytest.raises(
        ValueError, match=r"corrected_fields values must be finite numbers"
    ):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="CASE",
                case_id=case_id,
                reconciliation_id=None,
                actor_id="reviewer-1",
                action="CORRECT",
                rationale="Correcting the gross weight",
                corrected_fields={ComparedField.GROSS_WEIGHT_KG.value: value},
            ),
            audit=_audit_context(),
        )

    async with postgres_session_factory() as session:
        action_count = await session.scalar(
            select(func.count())
            .select_from(ReviewActionRecord)
            .where(ReviewActionRecord.case_id == case_id)
        )
        review_audit_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.workspace_id == workspace_id,
                AuditEventRecord.entity_type == "REVIEW_ACTION",
            )
        )
    assert action_count == 0
    assert review_audit_count == 0
    status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert status.disposition == "IN_REVIEW"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_review_status_fields_ordered_by_declaration(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="field-order-case"
    )
    # Create a case with all seven fields in REVIEW state
    verdicts = _matching_verdicts()
    # Modify all verdicts to have interactive_state="REVIEW"
    modified_verdicts = tuple(
        FieldVerdict(
            field=v.field,
            si=v.si,
            draft_bl=v.draft_bl,
            deterministic_result=v.deterministic_result,
            semantic_probability=v.semantic_probability,
            interactive_state="REVIEW",
            batch_result=v.batch_result,
            reason=v.reason,
        )
        for v in verdicts
    )
    output = comparison_output(modified_verdicts)

    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=output,
        # Stored in reverse so the status cannot rely on insertion order.
        field_verdicts=tuple(reversed(modified_verdicts)),
        structural_diagnostics=(),
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )

    status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    # Verify review_fields are ordered by ComparedField declaration order,
    # even if the database returns them in a different order.
    expected_order = (
        F.SHIPPER,
        F.CONSIGNEE,
        F.NOTIFY_PARTY,
        F.PORT_OF_LOADING,
        F.PORT_OF_DISCHARGE,
        F.CONTAINER_COUNT,
        F.GROSS_WEIGHT_KG,
    )
    assert status.review_fields == expected_order


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_review_statuses_read_every_case_of_one_workspace(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    other_workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, review_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="statuses-review-case"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=review_case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )
    _, ok_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="statuses-ok-case"
    )
    ok_verdicts = _matching_verdicts()
    await service.record_comparison_result(
        case_id=ok_case_id,
        evaluator_output=comparison_output(ok_verdicts),
        field_verdicts=ok_verdicts,
        structural_diagnostics=(),
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
    )
    await service.append_review_action(
        workspace_id=workspace_id,
        action=ReviewActionInput(
            review_action_id=uuid4(),
            target_type="CASE",
            case_id=review_case_id,
            reconciliation_id=None,
            actor_id="reviewer-1",
            action="APPROVE",
            rationale="Checked with the shipper",
        ),
        audit=_audit_context(),
    )
    _, foreign_case_id = await build_bl_ready_case(
        service, other_workspace_id, idempotency_key="statuses-foreign-case"
    )

    statuses = await service.get_case_review_statuses(workspace_id=workspace_id)

    assert statuses == {
        case_id: await service.get_case_review_status(
            workspace_id=workspace_id, case_id=case_id
        )
        for case_id in (review_case_id, ok_case_id)
    }
    assert statuses[review_case_id].disposition == "APPROVED"
    assert [action.actor_id for action in statuses[review_case_id].actions] == [
        "reviewer-1"
    ]
    assert statuses[ok_case_id].disposition == "AUTO_COMPLETED"
    assert foreign_case_id not in statuses


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_record_comparison_result_with_review_owner_id_writes_assignment_atomically(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="review-owner-case"
    )
    diagnostics = _missing_value_diagnostics()

    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
        review_owner_id="bl-owner",
    )

    async with postgres_session_factory() as session:
        case = await session.get(CaseRecord, case_id)
        assignment = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.target_type == "CASE",
            )
        )
        review_assigned_count = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.workspace_id == workspace_id,
                AuditEventRecord.event_type == "REVIEW_ASSIGNED",
            )
        )
    assert case is not None
    assert case.classification_state == "CLASSIFIED"
    assert assignment is not None
    assert assignment.assigned_owner_id == "bl-owner"
    assert assignment.state == "ASSIGNED"
    assert review_assigned_count == 1

    # A blank owner fails validation before anything is written: neither the
    # case mutation nor the review assignment happens.
    _, blank_owner_case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="blank-owner-case"
    )
    with pytest.raises(ValueError, match="review_owner_id"):
        await service.record_comparison_result(
            case_id=blank_owner_case_id,
            evaluator_output=structural_output(diagnostics),
            field_verdicts=(),
            structural_diagnostics=diagnostics,
            model_version="jev-1.13.0",
            prompt_version="comparison-v1",
            normalization_version="normalization-v1",
            audit=_audit_context(),
            review_owner_id="   ",
        )

    async with postgres_session_factory() as session:
        untouched_case = await session.get(CaseRecord, blank_owner_case_id)
        leftover_assignment = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == blank_owner_case_id
            )
        )
    assert untouched_case is not None
    assert untouched_case.classification_state == "BL_READY"
    assert leftover_assignment is None


async def _case_assignment_states(session_factory, case_id: UUID) -> list[str]:
    async with session_factory() as session:
        return list(
            await session.scalars(
                select(ReviewAssignmentRecord.state)
                .where(
                    ReviewAssignmentRecord.target_type == "CASE",
                    ReviewAssignmentRecord.case_id == case_id,
                )
                .order_by(
                    ReviewAssignmentRecord.created_at,
                    ReviewAssignmentRecord.review_assignment_id,
                )
            )
        )


async def _state_change_events(session_factory, workspace_id: UUID):
    async with session_factory() as session:
        return list(
            await session.scalars(
                select(AuditEventRecord).where(
                    AuditEventRecord.workspace_id == workspace_id,
                    AuditEventRecord.event_type == "REVIEW_STATE_CHANGED",
                )
            )
        )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("action", "corrected_fields", "disposition"),
    [
        ("APPROVE", None, "APPROVED"),
        ("CORRECT", {ComparedField.GROSS_WEIGHT_KG.value: "21,577 KG"}, "CORRECTED"),
        ("REJECT", None, "REJECTED"),
    ],
)
async def test_case_review_action_closes_the_case_assignment(
    postgres_session_factory, action, corrected_fields, disposition
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key=f"close-assignment-{action}"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
        review_owner_id="bl-owner",
    )

    def _case_action(actor_id: str) -> ReviewActionInput:
        return ReviewActionInput(
            review_action_id=uuid4(),
            target_type="CASE",
            case_id=case_id,
            reconciliation_id=None,
            actor_id=actor_id,
            action=action,
            rationale="Checked with the shipper",
            corrected_fields=corrected_fields,
        )

    await service.append_review_action(
        workspace_id=workspace_id,
        action=_case_action("reviewer-1"),
        audit=_audit_context(),
    )

    # Append-only: the ASSIGNED row stays and a RESOLVED row now follows it.
    assert await _case_assignment_states(postgres_session_factory, case_id) == [
        "ASSIGNED",
        "RESOLVED",
    ]
    async with postgres_session_factory() as session:
        closing = await session.scalar(
            select(ReviewAssignmentRecord).where(
                ReviewAssignmentRecord.case_id == case_id,
                ReviewAssignmentRecord.state == "RESOLVED",
            )
        )
    assert closing is not None
    assert closing.assigned_owner_id == "bl-owner"
    [state_change] = await _state_change_events(postgres_session_factory, workspace_id)
    assert state_change.entity_type == "REVIEW_ASSIGNMENT"
    assert state_change.entity_id == str(closing.review_assignment_id)
    assert state_change.payload_hash == _payload_hash(
        {
            "action": action,
            "assigned_owner_id": "bl-owner",
            "case_id": str(case_id),
            "state": "RESOLVED",
            "target_type": "CASE",
        }
    )
    status = await service.get_case_review_status(
        workspace_id=workspace_id, case_id=case_id
    )
    assert status.disposition == disposition

    with pytest.raises(ValueError, match=r"case already has a review action"):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_case_action("reviewer-2"),
            audit=_audit_context(),
        )
    assert len(await _case_assignment_states(postgres_session_factory, case_id)) == 2
    assert len(await _state_change_events(postgres_session_factory, workspace_id)) == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_case_review_action_leaves_an_already_resolved_assignment_alone(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    _, case_id = await build_bl_ready_case(
        service, workspace_id, idempotency_key="resolved-assignment-case"
    )
    diagnostics = _missing_value_diagnostics()
    await service.record_comparison_result(
        case_id=case_id,
        evaluator_output=structural_output(diagnostics),
        field_verdicts=(),
        structural_diagnostics=diagnostics,
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        audit=_audit_context(),
        review_owner_id="bl-owner",
    )
    await service.append_review_assignment(
        workspace_id=workspace_id,
        assignment=ReviewAssignmentInput(
            review_assignment_id=uuid4(),
            target_type="CASE",
            case_id=case_id,
            reconciliation_id=None,
            assigned_owner_id="bl-owner",
            state="RESOLVED",
        ),
        audit=_audit_context(),
    )

    await service.append_review_action(
        workspace_id=workspace_id,
        action=ReviewActionInput(
            review_action_id=uuid4(),
            target_type="CASE",
            case_id=case_id,
            reconciliation_id=None,
            actor_id="reviewer-1",
            action="APPROVE",
            rationale="Checked with the shipper",
        ),
        audit=_audit_context(),
    )

    # Nothing was open, so no second RESOLVED row and no state change event.
    assert await _case_assignment_states(postgres_session_factory, case_id) == [
        "ASSIGNED",
        "RESOLVED",
    ]
    assert await _state_change_events(postgres_session_factory, workspace_id) == []
