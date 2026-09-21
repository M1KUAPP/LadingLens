from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.contracts import ReconciliationResult, compute_subject_key
from app.models import (
    AuditEventRecord,
    CaseRecord,
    ExpectedShipmentRecord,
    GuestSession,
    ReconciliationResultRecord,
    ReconciliationRun,
    ReviewActionRecord,
    ReviewAssignmentRecord,
    Workspace,
)
from app.persistence import (
    AuditContext,
    ExpectedShipmentInput,
    PersistenceService,
    ReceiptInput,
    ReviewActionInput,
)
from app.storage import InMemoryPrivateObjectStore


def _audit() -> AuditContext:
    return AuditContext(request_id="reconciliation-test", rule_version="gate-2-v1")


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


def _shipment(
    shipment_id: str = "SYN-042",
    *,
    source_hash: str = "a" * 64,
    booking_reference: str = "SYN-BK-042",
    source_owner_id: str = "docs-owner",
    source_freshness: str = "CURRENT",
) -> ExpectedShipmentInput:
    return ExpectedShipmentInput(
        source_system="SYNTHETIC_HACKATHON_FIXTURE",
        shipment_id=shipment_id,
        source_hash=source_hash,
        imported_row={"shipment_id": shipment_id},
        identifiers={"booking_reference": booking_reference},
        lifecycle="DRAFT_BL_EXPECTED",
        documents=[],
        assigned_owner_id=None,
        source_freshness=source_freshness,
        source_updated_at=datetime(2026, 9, 20, tzinfo=UTC),
        booking_reference=booking_reference,
        required_documents=("SI", "DRAFT_BL"),
        cutoff_at=datetime(2026, 9, 21, tzinfo=UTC),
        source_owner_id=source_owner_id,
    )


def _missing_case(run_id: UUID, reconciliation_id: UUID) -> ReconciliationResult:
    return ReconciliationResult.model_validate(
        {
            "reconciliation_id": str(reconciliation_id),
            "reconciliation_run_id": str(run_id),
            "subject_key": compute_subject_key("MISSING_CASE", shipment_id="SYN-042"),
            "outcome": "MISSING_CASE",
            "shipment_id": "SYN-042",
            "case_ids": [],
            "match_basis": ["booking_reference"],
            "source_freshness": "CURRENT",
            "reviewed_at": None,
            "created_at": "2026-09-21T10:00:00Z",
        }
    )


async def _create_case(
    service: PersistenceService,
    workspace_id: UUID,
    label: str,
) -> UUID:
    receipt = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key=f"reconciliation-{label}",
        receipt=ReceiptInput(
            source_message_id=label,
            received_at=datetime(2026, 9, 20, tzinfo=UTC),
            sender="ops@example.com",
            subject=label,
            body_text=label,
            message_bytes=label.encode(),
            attachments=(),
        ),
        audit=_audit(),
    )
    return await service.ensure_classification_case(
        workspace_id=workspace_id,
        email_id=receipt.email_id,
        audit=_audit(),
    )


def _result(run_id: UUID, outcome: str, **shape: object) -> ReconciliationResult:
    reconciliation_id = uuid4()
    subject_key = compute_subject_key(outcome, **shape)  # type: ignore[arg-type]
    payload: dict[str, object] = {
        "reconciliation_id": str(reconciliation_id),
        "reconciliation_run_id": str(run_id),
        "subject_key": subject_key,
        "outcome": outcome,
        "match_basis": ["booking_reference"],
        "source_freshness": "STALE" if outcome == "SOURCE_STALE" else "CURRENT",
        "reviewed_at": None,
        "created_at": "2026-09-21T10:00:00Z",
    }
    payload.update(shape)
    return ReconciliationResult.model_validate(payload)


def test_persistence_contract_exposes_atomic_gate_two_operations() -> None:
    shipment = _shipment()

    assert shipment.booking_reference == "SYN-BK-042"
    assert shipment.required_documents == ("SI", "DRAFT_BL")
    assert shipment.source_owner_id == "docs-owner"
    assert hasattr(PersistenceService, "import_expected_shipments")
    assert hasattr(PersistenceService, "persist_reconciliation_run")


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_batch_import_is_idempotent_and_retains_typed_fields(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())

    first = await service.import_expected_shipments(
        workspace_id=workspace_id,
        shipments=(_shipment(),),
        audit=_audit(),
    )
    replay = await service.import_expected_shipments(
        workspace_id=workspace_id,
        shipments=(_shipment(),),
        audit=_audit(),
    )

    async with postgres_session_factory() as session:
        record = await session.scalar(
            select(ExpectedShipmentRecord).where(
                ExpectedShipmentRecord.workspace_id == workspace_id
            )
        )
        import_audits = await session.scalar(
            select(func.count())
            .select_from(AuditEventRecord)
            .where(
                AuditEventRecord.workspace_id == workspace_id,
                AuditEventRecord.event_type == "EXPECTED_SHIPMENT_IMPORTED",
            )
        )

    assert first.created_count == 1
    assert replay.created_count == 0
    assert first.expected_shipment_ids == replay.expected_shipment_ids
    assert record is not None
    assert record.booking_reference == "SYN-BK-042"
    assert record.required_documents == ["SI", "DRAFT_BL"]
    assert record.source_owner_id == "docs-owner"
    assert import_audits == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_intentional_rerun_creates_new_atomic_result_without_a_case(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    await service.import_expected_shipments(
        workspace_id=workspace_id,
        shipments=(_shipment(),),
        audit=_audit(),
    )

    first_run_id = uuid4()
    second_run_id = uuid4()
    first = await service.persist_reconciliation_run(
        workspace_id=workspace_id,
        reconciliation_run_id=first_run_id,
        source_hash="b" * 64,
        rule_version="gate-2-v1",
        results=(_missing_case(first_run_id, uuid4()),),
        exception_queue_owner="reconciliation-queue",
        audit=_audit(),
    )
    second = await service.persist_reconciliation_run(
        workspace_id=workspace_id,
        reconciliation_run_id=second_run_id,
        source_hash="b" * 64,
        rule_version="gate-2-v1",
        results=(_missing_case(second_run_id, uuid4()),),
        exception_queue_owner="reconciliation-queue",
        audit=_audit(),
    )

    async with postgres_session_factory() as session:
        run_count = await session.scalar(
            select(func.count())
            .select_from(ReconciliationRun)
            .where(ReconciliationRun.workspace_id == workspace_id)
        )
        result_count = await session.scalar(
            select(func.count())
            .select_from(ReconciliationResultRecord)
            .join(ReconciliationRun)
            .where(ReconciliationRun.workspace_id == workspace_id)
        )
        case_count = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.workspace_id == workspace_id)
        )
        exception_count = await session.scalar(
            select(func.count())
            .select_from(ReviewAssignmentRecord)
            .where(ReviewAssignmentRecord.workspace_id == workspace_id)
        )

    assert first.reconciliation_run_id == first_run_id
    assert second.reconciliation_run_id == second_run_id
    assert first.reconciliation_ids != second.reconciliation_ids
    assert run_count == 2
    assert result_count == 2
    assert case_count == 0
    assert exception_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_run_rejects_missing_shipment_reference_without_partial_rows(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    run_id = uuid4()

    with pytest.raises(ValueError, match="shipment references"):
        await service.persist_reconciliation_run(
            workspace_id=workspace_id,
            reconciliation_run_id=run_id,
            source_hash="c" * 64,
            rule_version="gate-2-v1",
            results=(_missing_case(run_id, uuid4()),),
            exception_queue_owner="reconciliation-queue",
            audit=_audit(),
        )

    async with postgres_session_factory() as session:
        run_count = await session.scalar(
            select(func.count())
            .select_from(ReconciliationRun)
            .where(ReconciliationRun.workspace_id == workspace_id)
        )

    assert run_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_all_six_outcomes_persist_and_exception_actions_derive_state(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    shipments = (
        _shipment("SHP-PRESENT", source_hash="1" * 64, booking_reference="BK-1"),
        _shipment("SHP-DOC", source_hash="2" * 64, booking_reference="BK-2"),
        _shipment(),
        _shipment(
            "SHP-STALE",
            source_hash="3" * 64,
            booking_reference="BK-3",
            source_freshness="STALE",
        ),
        _shipment(
            "SHP-AMB-A",
            source_hash="4" * 64,
            booking_reference="BK-4",
            source_owner_id="docs-apac",
        ),
        _shipment(
            "SHP-AMB-B",
            source_hash="5" * 64,
            booking_reference="BK-4",
            source_owner_id="docs-emea",
        ),
    )
    await service.import_expected_shipments(
        workspace_id=workspace_id,
        shipments=shipments,
        audit=_audit(),
    )
    present_case, document_case, stale_case, ambiguous_case, unmatched_case = [
        await _create_case(service, workspace_id, label)
        for label in ("present", "document", "stale", "ambiguous", "unmatched")
    ]
    run_id = uuid4()
    results = (
        _result(
            run_id,
            "CASE_PRESENT",
            shipment_id="SHP-PRESENT",
            case_ids=[str(present_case)],
        ),
        _result(
            run_id,
            "DOCUMENT_MISSING",
            shipment_id="SHP-DOC",
            case_ids=[str(document_case)],
        ),
        _result(
            run_id,
            "MISSING_CASE",
            shipment_id="SYN-042",
            case_ids=[],
        ),
        _result(
            run_id,
            "UNMATCHED_CASE",
            case_ids=[str(unmatched_case)],
        ),
        _result(
            run_id,
            "SOURCE_STALE",
            shipment_id="SHP-STALE",
            case_ids=[str(stale_case)],
        ),
        _result(
            run_id,
            "DUPLICATE_OR_AMBIGUOUS",
            candidate_shipment_ids=["SHP-AMB-A", "SHP-AMB-B"],
            candidate_case_ids=[str(ambiguous_case)],
        ),
    )

    persisted = await service.persist_reconciliation_run(
        workspace_id=workspace_id,
        reconciliation_run_id=run_id,
        source_hash="f" * 64,
        rule_version="gate-2-v1",
        results=results,
        exception_queue_owner="reconciliation-queue",
        audit=_audit(),
    )
    stale_id = results[4].root.reconciliation_id
    for action_name, owner in (
        ("ASSIGN", "reviewer-2"),
        ("ACKNOWLEDGE", None),
        ("ESCALATE", "escalation-queue"),
        ("RESOLVE", None),
    ):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="RECONCILIATION_EXCEPTION",
                case_id=None,
                reconciliation_id=stale_id,
                actor_id="reviewer-1",
                action=action_name,
                rationale=f"Exercise {action_name.lower()} transition.",
                assigned_owner_id=owner,
            ),
            audit=_audit(),
        )
    review_state = await service.get_reconciliation_exception_state(
        workspace_id=workspace_id,
        reconciliation_id=stale_id,
    )

    async with postgres_session_factory() as session:
        stored_outcomes = set(
            await session.scalars(
                select(ReconciliationResultRecord.outcome).where(
                    ReconciliationResultRecord.reconciliation_run_id == run_id
                )
            )
        )
        initial_assignments = list(
            await session.scalars(
                select(ReviewAssignmentRecord).where(
                    ReviewAssignmentRecord.workspace_id == workspace_id,
                    ReviewAssignmentRecord.state == "ASSIGNED",
                )
            )
        )
        action_count = await session.scalar(
            select(func.count())
            .select_from(ReviewActionRecord)
            .where(ReviewActionRecord.reconciliation_id == stale_id)
        )
        case_count = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.workspace_id == workspace_id)
        )

    assert len(persisted.reconciliation_ids) == 6
    assert {str(outcome) for outcome in stored_outcomes} == {
        "CASE_PRESENT",
        "DOCUMENT_MISSING",
        "MISSING_CASE",
        "UNMATCHED_CASE",
        "DUPLICATE_OR_AMBIGUOUS",
        "SOURCE_STALE",
    }
    assert {item.assigned_owner_id for item in initial_assignments} >= {
        "docs-owner",
        "reconciliation-queue",
    }
    assert review_state.state == "RESOLVED"
    assert review_state.assigned_owner_id == "escalation-queue"
    assert len(review_state.review_action_ids) == 4
    assert action_count == 4
    assert case_count == 5


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_exception_states_read_every_result_of_one_workspace_with_history(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    other_workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    stale_shipment = _shipment(
        "SHP-STALE",
        source_hash="3" * 64,
        booking_reference="BK-3",
        source_freshness="STALE",
    )
    for target in (workspace_id, other_workspace_id):
        await service.import_expected_shipments(
            workspace_id=target,
            shipments=(_shipment(), stale_shipment),
            audit=_audit(),
        )
    stale_case = await _create_case(service, workspace_id, "states-stale")
    run_id = uuid4()
    missing = _missing_case(run_id, uuid4())
    stale = _result(
        run_id, "SOURCE_STALE", shipment_id="SHP-STALE", case_ids=[str(stale_case)]
    )
    await service.persist_reconciliation_run(
        workspace_id=workspace_id,
        reconciliation_run_id=run_id,
        source_hash="f" * 64,
        rule_version="gate-2-v1",
        results=(missing, stale),
        exception_queue_owner="reconciliation-queue",
        audit=_audit(),
    )
    foreign_run_id = uuid4()
    foreign = _missing_case(foreign_run_id, uuid4())
    await service.persist_reconciliation_run(
        workspace_id=other_workspace_id,
        reconciliation_run_id=foreign_run_id,
        source_hash="f" * 64,
        rule_version="gate-2-v1",
        results=(foreign,),
        exception_queue_owner="reconciliation-queue",
        audit=_audit(),
    )
    stale_id = stale.root.reconciliation_id
    for action_name, owner in (("ACKNOWLEDGE", None), ("ESCALATE", "escalation")):
        await service.append_review_action(
            workspace_id=workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="RECONCILIATION_EXCEPTION",
                case_id=None,
                reconciliation_id=stale_id,
                actor_id="reviewer-1",
                action=action_name,
                rationale=f"Exercise {action_name.lower()}.",
                assigned_owner_id=owner,
            ),
            audit=_audit(),
        )

    states = await service.get_reconciliation_exception_states(
        workspace_id=workspace_id
    )

    # A result that was never assigned is listed without a review state.
    assert states == {
        missing.root.reconciliation_id: None,
        stale_id: await service.get_reconciliation_exception_state(
            workspace_id=workspace_id, reconciliation_id=stale_id
        ),
    }
    stale_state = states[stale_id]
    assert stale_state is not None
    assert (stale_state.state, stale_state.assigned_owner_id) == (
        "ESCALATED",
        "escalation",
    )
    assert [
        (item.action, item.actor_id, item.rationale) for item in stale_state.actions
    ] == [
        ("ACKNOWLEDGE", "reviewer-1", "Exercise acknowledge."),
        ("ESCALATE", "reviewer-1", "Exercise escalate."),
    ]
    assert stale_state.review_action_ids == tuple(
        item.review_action_id for item in stale_state.actions
    )
