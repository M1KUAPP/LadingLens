from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.contracts import ReconciliationOutcome
from app.persistence import (
    AuditContext,
    ExpectedShipmentBatchResult,
    ReconciliationRunWriteResult,
)
from app.reconciliation import (
    CaseSnapshot,
    DocumentKind,
    ExpectedShipment,
    ShipmentLifecycle,
    execute_gate_two,
    expected_shipment_to_input,
    load_expected_shipments_csv,
    materialize_reconciliation_results,
    parse_expected_shipments_csv,
    reconcile_shipments,
)

BUNDLE_FIXTURE = (
    Path(__file__).parents[3]
    / "data"
    / "sdoc-hackathon-bundle"
    / "fixtures"
    / "SYNTHETIC_expected_shipments.csv"
)
CSV_COLUMNS = (
    "source_system",
    "shipment_id",
    "booking_reference",
    "external_identifiers",
    "lifecycle",
    "required_documents",
    "cutoff_at",
    "owner",
    "source_updated_at",
    "source_freshness",
)


def _csv_text(*rows: dict[str, str], columns: tuple[str, ...] = CSV_COLUMNS) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def _valid_row(**overrides: str) -> dict[str, str]:
    row = {
        "source_system": "SYNTHETIC_HACKATHON_FIXTURE",
        "shipment_id": "SHP-001",
        "booking_reference": "BK-001",
        "external_identifiers": '{"order_number":"OC-001"}',
        "lifecycle": "DRAFT_BL_EXPECTED",
        "required_documents": '["SI","DRAFT_BL"]',
        "cutoff_at": "2026-09-21T12:00:00Z",
        "owner": "docs-emea",
        "source_updated_at": "2026-09-20T12:00:00Z",
        "source_freshness": "CURRENT",
    }
    row.update(overrides)
    return row


def _shipment(**overrides: object) -> ExpectedShipment:
    values: dict[str, object] = {
        "source_system": "SYNTHETIC_HACKATHON_FIXTURE",
        "shipment_id": "SHP-001",
        "booking_reference": "BK-001",
        "external_identifiers": {},
        "lifecycle": ShipmentLifecycle.DRAFT_BL_EXPECTED,
        "required_documents": (DocumentKind.SI, DocumentKind.DRAFT_BL),
        "cutoff_at": datetime(2026, 9, 21, 12, tzinfo=UTC),
        "owner": "docs-emea",
        "source_updated_at": datetime(2026, 9, 20, 12, tzinfo=UTC),
        "source_freshness": "CURRENT",
        "source_hash": "a" * 64,
    }
    values.update(overrides)
    return ExpectedShipment.model_validate(values)


def _case(**overrides: object) -> CaseSnapshot:
    values: dict[str, object] = {
        "case_id": "email_001",
        "identifiers": {"booking_reference": "BK-001"},
        "documents": (DocumentKind.SI, DocumentKind.DRAFT_BL),
    }
    values.update(overrides)
    return CaseSnapshot.model_validate(values)


def test_synthetic_fixture_is_visibly_labelled_and_covers_locked_rows() -> None:
    shipments = load_expected_shipments_csv(BUNDLE_FIXTURE)

    assert len(shipments) == 6
    assert {shipment.source_system for shipment in shipments} == {
        "SYNTHETIC_HACKATHON_FIXTURE"
    }
    synthetic_42 = next(
        shipment for shipment in shipments if shipment.shipment_id == "SYN-042"
    )
    assert synthetic_42.booking_reference == "SYN-BK-042"
    assert synthetic_42.lifecycle is ShipmentLifecycle.DRAFT_BL_EXPECTED


def test_parser_returns_typed_immutable_rows_with_a_canonical_hash() -> None:
    compact = _csv_text(_valid_row())
    spaced = _csv_text(
        _valid_row(
            external_identifiers='{ "order_number" : "OC-001" }',
            required_documents='[ "SI", "DRAFT_BL" ]',
        )
    )

    first = parse_expected_shipments_csv(compact)[0]
    second = parse_expected_shipments_csv(spaced)[0]

    assert first.source_hash == second.source_hash
    assert len(first.source_hash) == 64
    assert first.required_documents == (DocumentKind.SI, DocumentKind.DRAFT_BL)
    assert first.source_updated_at == datetime(2026, 9, 20, 12, tzinfo=UTC)
    with pytest.raises(ValidationError, match="frozen"):
        first.owner = "changed"  # type: ignore[misc]


def test_validated_row_converts_without_losing_import_fields() -> None:
    shipment = parse_expected_shipments_csv(_csv_text(_valid_row()))[0]

    converted = expected_shipment_to_input(shipment)

    assert converted.booking_reference == shipment.booking_reference
    assert converted.identifiers["booking_reference"] == "BK-001"
    assert converted.required_documents == ("SI", "DRAFT_BL")
    assert converted.cutoff_at == shipment.cutoff_at
    assert converted.source_owner_id == shipment.owner
    assert converted.source_hash == shipment.source_hash


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("source_system", "production", "synthetic"),
        ("source_updated_at", "2026-09-20T12:00:00", "UTC"),
        ("cutoff_at", "2026-09-21T20:00:00+08:00", "UTC"),
        ("lifecycle", "UNKNOWN", "lifecycle"),
        ("required_documents", '["INVOICE"]', "required_documents"),
        ("required_documents", "[]", "required_documents"),
        ("source_freshness", "UNKNOWN", "source_freshness"),
        ("owner", "   ", "owner"),
        ("external_identifiers", "not-json", "external_identifiers"),
        ("external_identifiers", '["OC-1"]', "external_identifiers"),
        ("external_identifiers", '{"order_number":""}', "external_identifiers"),
    ],
)
def test_parser_rejects_invalid_typed_cells(
    field: str, value: str, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        parse_expected_shipments_csv(_csv_text(_valid_row(**{field: value})))


def test_parser_rejects_unknown_or_missing_columns() -> None:
    row = _valid_row()
    row["surprise"] = "value"
    with pytest.raises(ValueError, match="columns"):
        parse_expected_shipments_csv(
            _csv_text(row, columns=CSV_COLUMNS + ("surprise",))
        )

    without_owner = tuple(column for column in CSV_COLUMNS if column != "owner")
    missing_owner_row = _valid_row()
    missing_owner_row.pop("owner")
    with pytest.raises(ValueError, match="columns"):
        parse_expected_shipments_csv(
            _csv_text(missing_owner_row, columns=without_owner)
        )


def test_parser_rejects_duplicate_shipment_ids_atomically() -> None:
    csv_text = _csv_text(
        _valid_row(),
        _valid_row(booking_reference="BK-002", owner="docs-apac"),
    )

    with pytest.raises(ValueError, match="duplicate shipment_id"):
        parse_expected_shipments_csv(csv_text)


def test_reconciliation_fixture_produces_all_six_outcomes() -> None:
    shipments = load_expected_shipments_csv(BUNDLE_FIXTURE)
    cases = (
        _case(
            case_id="email_001",
            identifiers={"booking_reference": "MSDUL0942518196"},
        ),
        _case(
            case_id="email_507",
            identifiers={"booking_reference": "I756178688"},
            documents=(DocumentKind.SI,),
        ),
        _case(
            case_id="email_013",
            identifiers={"booking_reference": "SIJ3754330"},
        ),
        _case(
            case_id="email_009",
            identifiers={"booking_reference": "I978820812"},
        ),
        _case(
            case_id="email_004",
            identifiers={"booking_reference": "UNLISTED-004"},
        ),
    )

    results = reconcile_shipments(
        shipments,
        cases,
        reconciled_at=datetime(2026, 9, 22, tzinfo=UTC),
    )

    assert {result.outcome for result in results} == set(ReconciliationOutcome)
    assert len(results) == 6
    by_subject = {result.subject_key: result for result in results}
    assert by_subject["shipment:SHP-CASE-001"].case_ids == ("email_001",)
    assert by_subject["shipment:SHP-DOC-507"].outcome is (
        ReconciliationOutcome.DOCUMENT_MISSING
    )
    assert by_subject["shipment:SHP-STALE-013"].outcome is (
        ReconciliationOutcome.SOURCE_STALE
    )
    assert by_subject["shipment:SYN-042"].case_ids == ()
    assert by_subject["shipment:SYN-042"].outcome is ReconciliationOutcome.MISSING_CASE
    assert by_subject["case:email_004"].outcome is ReconciliationOutcome.UNMATCHED_CASE

    ambiguous = next(
        result
        for result in results
        if result.outcome is ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS
    )
    assert ambiguous.candidate_shipment_ids == ("SHP-AMB-009-A", "SHP-AMB-009-B")
    assert ambiguous.candidate_case_ids == ("email_009",)
    assert ambiguous.match_basis == ("booking_reference",)


def test_result_drafts_materialize_into_one_typed_auditable_run() -> None:
    run_id = uuid4()
    created_at = datetime(2026, 9, 22, tzinfo=UTC)
    drafts = reconcile_shipments(
        (_shipment(),),
        (_case(),),
        reconciled_at=created_at,
    )

    results = materialize_reconciliation_results(
        drafts,
        reconciliation_run_id=run_id,
        created_at=created_at,
    )

    assert len(results) == 1
    assert results[0].root.reconciliation_run_id == run_id
    assert results[0].root.subject_key == "shipment:SHP-001"
    assert results[0].root.outcome == ReconciliationOutcome.CASE_PRESENT


@pytest.mark.asyncio
async def test_gate_two_executes_the_checked_in_fixture_through_persistence() -> None:
    class CapturingPersistence:
        imported = ()
        persisted = ()
        source_hash = ""

        async def import_expected_shipments(self, **kwargs):
            self.imported = kwargs["shipments"]
            return ExpectedShipmentBatchResult(
                expected_shipment_ids=tuple(uuid4() for _ in self.imported),
                created_count=len(self.imported),
            )

        async def persist_reconciliation_run(self, **kwargs):
            self.persisted = kwargs["results"]
            self.source_hash = kwargs["source_hash"]
            return ReconciliationRunWriteResult(
                reconciliation_run_id=kwargs["reconciliation_run_id"],
                reconciliation_ids=tuple(
                    item.root.reconciliation_id for item in self.persisted
                ),
            )

    persistence = CapturingPersistence()
    run_id = uuid4()
    cases = (
        _case(
            case_id=str(uuid4()),
            identifiers={"booking_reference": "MSDUL0942518196"},
        ),
        _case(
            case_id=str(uuid4()),
            identifiers={"booking_reference": "I756178688"},
            documents=(DocumentKind.SI,),
        ),
        _case(
            case_id=str(uuid4()),
            identifiers={"booking_reference": "SIJ3754330"},
        ),
        _case(
            case_id=str(uuid4()),
            identifiers={"booking_reference": "I978820812"},
        ),
        _case(
            case_id=str(uuid4()),
            identifiers={"booking_reference": "UNLISTED-004"},
        ),
    )

    execution = await execute_gate_two(
        fixture_path=BUNDLE_FIXTURE,
        persistence=persistence,  # type: ignore[arg-type]
        workspace_id=uuid4(),
        cases=cases,
        reconciliation_run_id=run_id,
        reconciled_at=datetime(2026, 9, 22, tzinfo=UTC),
        rule_version="gate-2-v1",
        exception_queue_owner="reconciliation-queue",
        audit=AuditContext(request_id="gate-two-test", rule_version="gate-2-v1"),
    )

    assert len(persistence.imported) == 6
    assert len(persistence.persisted) == 6
    assert len(persistence.source_hash) == 64
    assert {item.root.outcome for item in execution.results} == set(
        ReconciliationOutcome
    )
    synthetic_42 = next(
        item.root
        for item in execution.results
        if getattr(item.root, "shipment_id", None) == "SYN-042"
    )
    assert synthetic_42.outcome == ReconciliationOutcome.MISSING_CASE
    assert synthetic_42.case_ids == []


def test_stale_precedes_an_otherwise_clearable_case() -> None:
    shipment = _shipment(source_freshness="STALE")

    result = reconcile_shipments(
        (shipment,),
        (_case(),),
        reconciled_at=datetime(2026, 9, 22, tzinfo=UTC),
    )[0]

    assert result.outcome is ReconciliationOutcome.SOURCE_STALE
    assert result.clears_shipment is False


def test_ambiguity_preserves_sorted_candidate_sets_and_never_clears() -> None:
    shipments = (
        _shipment(shipment_id="SHP-B", source_hash="b" * 64),
        _shipment(shipment_id="SHP-A"),
    )

    result = reconcile_shipments(
        shipments,
        (_case(),),
        reconciled_at=datetime(2026, 9, 22, tzinfo=UTC),
    )[0]

    assert result.outcome is ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS
    assert result.candidate_shipment_ids == ("SHP-A", "SHP-B")
    assert result.candidate_case_ids == ("email_001",)
    assert result.clears_shipment is False


def test_missing_case_clock_uses_booking_cutoff_at_the_exact_boundary() -> None:
    cutoff = datetime(2026, 9, 21, 12, tzinfo=UTC)

    result = reconcile_shipments(
        (_shipment(cutoff_at=cutoff),),
        (),
        reconciled_at=cutoff,
    )[0]

    assert result.outcome is ReconciliationOutcome.MISSING_CASE
    assert result.effective_cutoff_at == cutoff
    assert result.cutoff_reached is True


def test_missing_case_clock_falls_back_to_24_hours_after_source_update() -> None:
    result = reconcile_shipments(
        (_shipment(cutoff_at=None),),
        (),
        reconciled_at=datetime(2026, 9, 21, 11, 59, 59, tzinfo=UTC),
    )[0]

    assert result.effective_cutoff_at == datetime(2026, 9, 21, 12, tzinfo=UTC)
    assert result.cutoff_reached is False


def test_ineligible_lifecycle_does_not_start_a_missing_case_clock() -> None:
    results = reconcile_shipments(
        (_shipment(lifecycle=ShipmentLifecycle.BOOKED),),
        (),
        reconciled_at=datetime(2026, 9, 22, tzinfo=UTC),
    )

    assert results == ()


def test_reconciliation_requires_utc_and_is_input_order_invariant() -> None:
    shipments = (
        _shipment(shipment_id="SHP-B", booking_reference="BK-B", source_hash="b" * 64),
        _shipment(shipment_id="SHP-A", booking_reference="BK-A"),
    )
    cases = (
        _case(case_id="case-b", identifiers={"booking_reference": "bk-b"}),
        _case(case_id="case-a", identifiers={"booking_reference": " BK-A "}),
    )
    now = datetime(2026, 9, 22, tzinfo=UTC)

    forward = reconcile_shipments(shipments, cases, reconciled_at=now)
    reverse = reconcile_shipments(
        tuple(reversed(shipments)), tuple(reversed(cases)), reconciled_at=now
    )

    assert forward == reverse
    assert tuple(result.subject_key for result in forward) == (
        "shipment:SHP-A",
        "shipment:SHP-B",
    )
    with pytest.raises(ValueError, match="UTC"):
        reconcile_shipments(
            shipments,
            cases,
            reconciled_at=datetime(2026, 9, 22),  # noqa: DTZ001 - deliberate invalid input
        )
