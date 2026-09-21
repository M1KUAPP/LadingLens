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
    Workspace,
)
from app.persistence import AuditContext, PersistenceService, ReviewActionInput
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
    with pytest.raises(ValueError):
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
    with pytest.raises(ValueError):
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

    with pytest.raises(ValueError):
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

    with pytest.raises(ValueError):
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

    with pytest.raises(ValueError):
        await service.append_review_action(
            workspace_id=workspace_id, action=_action("CORRECT"), audit=_audit_context()
        )
    with pytest.raises(ValueError):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_action("CORRECT", {"not_a_field": "21,577 KG"}),
            audit=_audit_context(),
        )
    with pytest.raises(ValueError):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=_action("CORRECT", {ComparedField.GROSS_WEIGHT_KG.value: True}),
            audit=_audit_context(),
        )
    with pytest.raises(ValueError):
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
