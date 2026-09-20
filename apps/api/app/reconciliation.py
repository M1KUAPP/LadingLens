from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from hashlib import sha256
from pathlib import Path
from typing import TYPE_CHECKING, Annotated, Literal, Self
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.contracts import (
    ReconciliationOutcome,
    ReconciliationResult,
    compute_subject_key,
)

if TYPE_CHECKING:
    from app.persistence import (
        AuditContext,
        ExpectedShipmentBatchResult,
        ExpectedShipmentInput,
        PersistenceService,
        ReconciliationRunWriteResult,
    )


class DocumentKind(StrEnum):
    SI = "SI"
    DRAFT_BL = "DRAFT_BL"


class ShipmentLifecycle(StrEnum):
    BOOKED = "BOOKED"
    DRAFT_BL_EXPECTED = "DRAFT_BL_EXPECTED"
    BL_CHECK_REQUIRED = "BL_CHECK_REQUIRED"


NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Sha256Hex = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]


class _FrozenModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class ExpectedShipment(_FrozenModel):
    source_system: NonEmptyText
    shipment_id: NonEmptyText
    booking_reference: NonEmptyText | None
    external_identifiers: dict[NonEmptyText, NonEmptyText]
    lifecycle: ShipmentLifecycle
    required_documents: tuple[DocumentKind, ...] = Field(min_length=1)
    cutoff_at: datetime | None
    owner: NonEmptyText
    source_updated_at: datetime
    source_freshness: Literal["CURRENT", "STALE"]
    source_hash: Sha256Hex

    @model_validator(mode="after")
    def validate_typed_row(self) -> Self:
        _require_utc(self.source_updated_at, "source_updated_at")
        if self.cutoff_at is not None:
            _require_utc(self.cutoff_at, "cutoff_at")
        if len(set(self.required_documents)) != len(self.required_documents):
            raise ValueError("required_documents cannot contain duplicates")

        normalized_keys: dict[str, str] = {}
        for key, value in self.external_identifiers.items():
            normalized_key = _normalize_identifier(key)
            normalized_value = _normalize_identifier(value)
            previous = normalized_keys.get(normalized_key)
            if previous is not None and previous != normalized_value:
                raise ValueError("external_identifiers contains conflicting namespaces")
            normalized_keys[normalized_key] = normalized_value
        booking = normalized_keys.get("booking_reference")
        if (
            booking is not None
            and self.booking_reference is not None
            and booking != _normalize_identifier(self.booking_reference)
        ):
            raise ValueError("external_identifiers conflicts with booking_reference")
        return self


class CaseSnapshot(_FrozenModel):
    case_id: NonEmptyText
    identifiers: dict[NonEmptyText, NonEmptyText]
    documents: tuple[DocumentKind, ...]

    @model_validator(mode="after")
    def validate_identifiers_and_documents(self) -> Self:
        normalized_keys: set[str] = set()
        for key in self.identifiers:
            normalized_key = _normalize_identifier(key)
            if normalized_key in normalized_keys:
                raise ValueError("identifiers contains duplicate normalized namespaces")
            normalized_keys.add(normalized_key)
        if len(set(self.documents)) != len(self.documents):
            raise ValueError("documents cannot contain duplicates")
        return self


class ReconciliationResultDraft(_FrozenModel):
    outcome: ReconciliationOutcome
    subject_key: NonEmptyText
    shipment_id: NonEmptyText | None = None
    case_ids: tuple[NonEmptyText, ...] = ()
    candidate_shipment_ids: tuple[NonEmptyText, ...] = ()
    candidate_case_ids: tuple[NonEmptyText, ...] = ()
    match_basis: tuple[NonEmptyText, ...] = ()
    source_freshness: Literal["CURRENT", "STALE"]
    owner: NonEmptyText | None = None
    candidate_owners: tuple[NonEmptyText, ...] = ()
    effective_cutoff_at: datetime | None = None
    cutoff_reached: bool = False
    clears_shipment: bool = False


@dataclass(frozen=True, slots=True)
class GateTwoExecution:
    shipment_import: ExpectedShipmentBatchResult
    reconciliation_run: ReconciliationRunWriteResult
    results: tuple[ReconciliationResult, ...]


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
_MISSING_CASE_LIFECYCLES = {
    ShipmentLifecycle.DRAFT_BL_EXPECTED,
    ShipmentLifecycle.BL_CHECK_REQUIRED,
}
_DEFAULT_MISSING_CASE_DELAY = timedelta(hours=24)


def load_expected_shipments_csv(path: Path) -> tuple[ExpectedShipment, ...]:
    try:
        csv_text = path.read_text(encoding="utf-8-sig")
    except OSError as error:
        raise ValueError(f"could not read expected-shipment CSV: {path}") from error
    return parse_expected_shipments_csv(csv_text)


def expected_shipment_to_input(shipment: ExpectedShipment) -> ExpectedShipmentInput:
    """Bridge a validated CSV row to the durable persistence contract."""
    from app.persistence import ExpectedShipmentInput

    identifiers = dict(shipment.external_identifiers)
    if shipment.booking_reference is not None:
        identifiers["booking_reference"] = shipment.booking_reference
    required_documents = tuple(item.value for item in shipment.required_documents)
    imported_row = {
        "source_system": shipment.source_system,
        "shipment_id": shipment.shipment_id,
        "booking_reference": shipment.booking_reference,
        "external_identifiers": shipment.external_identifiers,
        "lifecycle": shipment.lifecycle.value,
        "required_documents": list(required_documents),
        "cutoff_at": _canonical_timestamp(shipment.cutoff_at),
        "owner": shipment.owner,
        "source_updated_at": _canonical_timestamp(shipment.source_updated_at),
        "source_freshness": shipment.source_freshness,
    }
    return ExpectedShipmentInput(
        source_system=shipment.source_system,
        shipment_id=shipment.shipment_id,
        source_hash=shipment.source_hash,
        imported_row=imported_row,
        identifiers=identifiers,
        lifecycle=shipment.lifecycle.value,
        documents=[
            {"document_kind": item, "required": True} for item in required_documents
        ],
        assigned_owner_id=shipment.owner,
        source_freshness=shipment.source_freshness,
        source_updated_at=shipment.source_updated_at,
        booking_reference=shipment.booking_reference,
        required_documents=required_documents,
        cutoff_at=shipment.cutoff_at,
        source_owner_id=shipment.owner,
    )


def parse_expected_shipments_csv(csv_text: str) -> tuple[ExpectedShipment, ...]:
    """Parse a complete synthetic ledger or reject it without partial output."""
    reader = csv.DictReader(io.StringIO(csv_text, newline=""), strict=True)
    fieldnames = reader.fieldnames
    if fieldnames is None or tuple(fieldnames) != CSV_COLUMNS:
        raise ValueError(
            "expected-shipment CSV columns must exactly match: " + ",".join(CSV_COLUMNS)
        )

    shipments: list[ExpectedShipment] = []
    seen_shipment_ids: set[str] = set()
    try:
        for row_number, raw_row in enumerate(reader, start=2):
            if None in raw_row or any(value is None for value in raw_row.values()):
                raise ValueError(f"row {row_number}: invalid CSV column count")
            shipment = _parse_row(raw_row, row_number=row_number)
            if shipment.shipment_id in seen_shipment_ids:
                raise ValueError(
                    f"row {row_number}: duplicate shipment_id: {shipment.shipment_id}"
                )
            seen_shipment_ids.add(shipment.shipment_id)
            shipments.append(shipment)
    except csv.Error as error:
        raise ValueError(f"malformed expected-shipment CSV: {error}") from error

    if not shipments:
        raise ValueError("expected-shipment CSV must contain at least one row")
    return tuple(shipments)


def _parse_row(raw: dict[str, str | None], *, row_number: int) -> ExpectedShipment:
    row = {key: value if value is not None else "" for key, value in raw.items()}
    source_system = _required_cell(row, "source_system", row_number)
    if not source_system.startswith("SYNTHETIC_"):
        raise ValueError(f"row {row_number}: source_system must be visibly synthetic")

    shipment_id = _required_cell(row, "shipment_id", row_number)
    booking_reference = row["booking_reference"].strip() or None
    owner = _required_cell(row, "owner", row_number)
    external_identifiers = _parse_external_identifiers(
        row["external_identifiers"], row_number
    )
    required_documents = _parse_required_documents(
        row["required_documents"], row_number
    )
    lifecycle = _parse_enum(
        ShipmentLifecycle, row["lifecycle"], "lifecycle", row_number
    )
    source_freshness = _parse_freshness(row["source_freshness"], row_number)
    source_updated_at = _parse_utc_timestamp(
        row["source_updated_at"], "source_updated_at", row_number
    )
    cutoff_at = (
        _parse_utc_timestamp(row["cutoff_at"], "cutoff_at", row_number)
        if row["cutoff_at"].strip()
        else None
    )

    typed_content = {
        "booking_reference": booking_reference,
        "cutoff_at": _canonical_timestamp(cutoff_at),
        "external_identifiers": external_identifiers,
        "lifecycle": lifecycle.value,
        "owner": owner,
        "required_documents": sorted(document.value for document in required_documents),
        "shipment_id": shipment_id,
        "source_freshness": source_freshness,
        "source_system": source_system,
        "source_updated_at": _canonical_timestamp(source_updated_at),
    }
    source_hash = sha256(
        json.dumps(
            typed_content,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("utf-8")
    ).hexdigest()

    return ExpectedShipment(
        source_system=source_system,
        shipment_id=shipment_id,
        booking_reference=booking_reference,
        external_identifiers=external_identifiers,
        lifecycle=lifecycle,
        required_documents=required_documents,
        cutoff_at=cutoff_at,
        owner=owner,
        source_updated_at=source_updated_at,
        source_freshness=source_freshness,
        source_hash=source_hash,
    )


def _required_cell(row: dict[str, str], field: str, row_number: int) -> str:
    value = row[field].strip()
    if not value:
        raise ValueError(f"row {row_number}: {field} must not be blank")
    return value


def _parse_external_identifiers(value: str, row_number: int) -> dict[str, str]:
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError) as error:
        raise ValueError(
            f"row {row_number}: external_identifiers must be a JSON object"
        ) from error
    if not isinstance(parsed, dict):
        raise ValueError(  # noqa: TRY004 - one atomic parser error surface
            f"row {row_number}: external_identifiers must be a JSON object"
        )

    identifiers: dict[str, str] = {}
    normalized_keys: set[str] = set()
    for key, identifier in parsed.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(
                f"row {row_number}: external_identifiers keys must be nonblank strings"
            )
        if not isinstance(identifier, str) or not identifier.strip():
            raise ValueError(
                f"row {row_number}: external_identifiers values must be nonblank strings"
            )
        clean_key = key.strip()
        normalized_key = _normalize_identifier(clean_key)
        if normalized_key in normalized_keys:
            raise ValueError(
                f"row {row_number}: external_identifiers namespaces must be unique"
            )
        normalized_keys.add(normalized_key)
        identifiers[clean_key] = identifier.strip()
    return identifiers


def _parse_required_documents(value: str, row_number: int) -> tuple[DocumentKind, ...]:
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError) as error:
        raise ValueError(
            f"row {row_number}: required_documents must be a JSON array"
        ) from error
    if not isinstance(parsed, list) or not parsed:
        raise ValueError(
            f"row {row_number}: required_documents must be a nonempty JSON array"
        )
    try:
        documents = tuple(DocumentKind(item) for item in parsed)
    except (TypeError, ValueError) as error:
        raise ValueError(
            f"row {row_number}: required_documents contains an unsupported document"
        ) from error
    if len(set(documents)) != len(documents):
        raise ValueError(f"row {row_number}: required_documents contains duplicates")
    return documents


def _parse_enum(
    enum_type: type[ShipmentLifecycle], value: str, field: str, row_number: int
) -> ShipmentLifecycle:
    try:
        return enum_type(value.strip())
    except ValueError as error:
        raise ValueError(f"row {row_number}: unsupported {field}: {value!r}") from error


def _parse_freshness(value: str, row_number: int) -> Literal["CURRENT", "STALE"]:
    normalized = value.strip()
    if normalized not in {"CURRENT", "STALE"}:
        raise ValueError(f"row {row_number}: unsupported source_freshness: {value!r}")
    return normalized  # type: ignore[return-value]


def _parse_utc_timestamp(value: str, field: str, row_number: int) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.strip())
    except ValueError as error:
        raise ValueError(
            f"row {row_number}: {field} must be an ISO 8601 UTC timestamp"
        ) from error
    try:
        return _require_utc(parsed, field)
    except ValueError as error:
        raise ValueError(f"row {row_number}: {error}") from error


def _require_utc(value: datetime, field: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError(f"{field} must be an aware UTC timestamp")
    return value.astimezone(UTC)


def _canonical_timestamp(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _normalize_identifier(value: str) -> str:
    return value.strip().casefold()


def _shipment_identifiers(shipment: ExpectedShipment) -> dict[str, str]:
    identifiers = {
        _normalize_identifier(key): _normalize_identifier(value)
        for key, value in shipment.external_identifiers.items()
    }
    if shipment.booking_reference is not None:
        identifiers["booking_reference"] = _normalize_identifier(
            shipment.booking_reference
        )
    return identifiers


def _case_identifiers(case: CaseSnapshot) -> dict[str, str]:
    return {
        _normalize_identifier(key): _normalize_identifier(value)
        for key, value in case.identifiers.items()
    }


def _matching_namespaces(
    shipment: ExpectedShipment, case: CaseSnapshot
) -> tuple[str, ...]:
    shipment_identifiers = _shipment_identifiers(shipment)
    case_identifiers = _case_identifiers(case)
    return tuple(
        sorted(
            namespace
            for namespace in shipment_identifiers.keys() & case_identifiers.keys()
            if shipment_identifiers[namespace] == case_identifiers[namespace]
        )
    )


def reconcile_shipments(
    shipments: tuple[ExpectedShipment, ...],
    cases: tuple[CaseSnapshot, ...],
    *,
    reconciled_at: datetime,
) -> tuple[ReconciliationResultDraft, ...]:
    """Reconcile exact identifiers without choosing winners in conflicts."""
    reconciled_at = _require_utc(reconciled_at, "reconciled_at")
    _require_unique_inputs(shipments, cases)

    shipment_edges: dict[int, set[int]] = {
        index: set() for index in range(len(shipments))
    }
    case_edges: dict[int, set[int]] = {index: set() for index in range(len(cases))}
    edge_basis: dict[tuple[int, int], tuple[str, ...]] = {}
    for shipment_index, shipment in enumerate(shipments):
        for case_index, case in enumerate(cases):
            match_basis = _matching_namespaces(shipment, case)
            if match_basis:
                shipment_edges[shipment_index].add(case_index)
                case_edges[case_index].add(shipment_index)
                edge_basis[(shipment_index, case_index)] = match_basis

    results: list[ReconciliationResultDraft] = []
    visited_shipments: set[int] = set()

    for start in range(len(shipments)):
        if start in visited_shipments or not shipment_edges[start]:
            continue
        component_shipments, component_cases = _candidate_component(
            start, shipment_edges, case_edges
        )
        visited_shipments.update(component_shipments)
        basis = tuple(
            sorted(
                {
                    namespace
                    for shipment_index in component_shipments
                    for case_index in shipment_edges[shipment_index] & component_cases
                    for namespace in edge_basis[(shipment_index, case_index)]
                }
            )
        )
        if len(component_shipments) != 1 or len(component_cases) != 1:
            candidate_shipment_ids = tuple(
                sorted(shipments[index].shipment_id for index in component_shipments)
            )
            candidate_case_ids = tuple(
                sorted(cases[index].case_id for index in component_cases)
            )
            owners = tuple(
                sorted({shipments[index].owner for index in component_shipments})
            )
            freshness: Literal["CURRENT", "STALE"] = (
                "STALE"
                if any(
                    shipments[index].source_freshness == "STALE"
                    for index in component_shipments
                )
                else "CURRENT"
            )
            results.append(
                ReconciliationResultDraft(
                    outcome=ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS,
                    subject_key=compute_subject_key(
                        ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS,
                        candidate_shipment_ids=list(candidate_shipment_ids),
                        candidate_case_ids=list(candidate_case_ids),
                    ),
                    candidate_shipment_ids=candidate_shipment_ids,
                    candidate_case_ids=candidate_case_ids,
                    match_basis=basis,
                    source_freshness=freshness,
                    candidate_owners=owners,
                )
            )
            continue

        shipment_index = next(iter(component_shipments))
        case_index = next(iter(component_cases))
        shipment = shipments[shipment_index]
        case = cases[case_index]
        required = set(shipment.required_documents)
        available = set(case.documents)
        if shipment.source_freshness == "STALE":
            outcome = ReconciliationOutcome.SOURCE_STALE
        elif required <= available:
            outcome = ReconciliationOutcome.CASE_PRESENT
        else:
            outcome = ReconciliationOutcome.DOCUMENT_MISSING
        results.append(
            ReconciliationResultDraft(
                outcome=outcome,
                subject_key=compute_subject_key(
                    outcome,
                    shipment_id=shipment.shipment_id,
                    case_ids=[case.case_id],
                ),
                shipment_id=shipment.shipment_id,
                case_ids=(case.case_id,),
                match_basis=basis,
                source_freshness=shipment.source_freshness,
                owner=shipment.owner,
                clears_shipment=outcome is ReconciliationOutcome.CASE_PRESENT,
            )
        )

    for shipment_index, shipment in enumerate(shipments):
        if shipment_edges[shipment_index]:
            continue
        if (
            shipment.source_freshness != "CURRENT"
            or shipment.lifecycle not in _MISSING_CASE_LIFECYCLES
        ):
            continue
        effective_cutoff = shipment.cutoff_at or (
            shipment.source_updated_at + _DEFAULT_MISSING_CASE_DELAY
        )
        outcome = ReconciliationOutcome.MISSING_CASE
        results.append(
            ReconciliationResultDraft(
                outcome=outcome,
                subject_key=compute_subject_key(
                    outcome,
                    shipment_id=shipment.shipment_id,
                    case_ids=[],
                ),
                shipment_id=shipment.shipment_id,
                source_freshness=shipment.source_freshness,
                owner=shipment.owner,
                effective_cutoff_at=effective_cutoff,
                cutoff_reached=reconciled_at >= effective_cutoff,
            )
        )

    for case_index, case in enumerate(cases):
        if case_edges[case_index]:
            continue
        outcome = ReconciliationOutcome.UNMATCHED_CASE
        results.append(
            ReconciliationResultDraft(
                outcome=outcome,
                subject_key=compute_subject_key(
                    outcome,
                    case_ids=[case.case_id],
                ),
                case_ids=(case.case_id,),
                source_freshness="CURRENT",
            )
        )

    return tuple(sorted(results, key=lambda result: result.subject_key))


def materialize_reconciliation_results(
    drafts: tuple[ReconciliationResultDraft, ...],
    *,
    reconciliation_run_id: UUID,
    created_at: datetime,
) -> tuple[ReconciliationResult, ...]:
    """Give deterministic drafts immutable IDs and the exact persistence contract."""
    created_at = _require_utc(created_at, "created_at")
    results: list[ReconciliationResult] = []
    for draft in drafts:
        payload: dict[str, object] = {
            "reconciliation_id": str(uuid4()),
            "reconciliation_run_id": str(reconciliation_run_id),
            "subject_key": draft.subject_key,
            "outcome": draft.outcome.value,
            "match_basis": list(draft.match_basis),
            "source_freshness": draft.source_freshness,
            "reviewed_at": None,
            "created_at": created_at,
        }
        if draft.outcome is ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS:
            payload["candidate_shipment_ids"] = list(draft.candidate_shipment_ids)
            payload["candidate_case_ids"] = list(draft.candidate_case_ids)
        elif draft.outcome is ReconciliationOutcome.UNMATCHED_CASE:
            payload["case_ids"] = list(draft.case_ids)
        else:
            payload["shipment_id"] = draft.shipment_id
            payload["case_ids"] = list(draft.case_ids)
        results.append(ReconciliationResult.model_validate(payload))
    return tuple(results)


async def execute_gate_two(
    *,
    fixture_path: Path,
    persistence: PersistenceService,
    workspace_id: UUID,
    cases: tuple[CaseSnapshot, ...],
    reconciliation_run_id: UUID,
    reconciled_at: datetime,
    rule_version: str,
    exception_queue_owner: str,
    audit: AuditContext,
) -> GateTwoExecution:
    """Import the independent ledger and atomically persist one Gate 2 run."""
    shipments = load_expected_shipments_csv(fixture_path)
    shipment_import = await persistence.import_expected_shipments(
        workspace_id=workspace_id,
        shipments=tuple(expected_shipment_to_input(item) for item in shipments),
        audit=audit,
    )
    drafts = reconcile_shipments(
        shipments,
        cases,
        reconciled_at=reconciled_at,
    )
    results = materialize_reconciliation_results(
        drafts,
        reconciliation_run_id=reconciliation_run_id,
        created_at=reconciled_at,
    )
    manifest_hash = sha256(
        json.dumps(
            sorted(shipment.source_hash for shipment in shipments),
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    reconciliation_run = await persistence.persist_reconciliation_run(
        workspace_id=workspace_id,
        reconciliation_run_id=reconciliation_run_id,
        source_hash=manifest_hash,
        rule_version=rule_version,
        results=results,
        exception_queue_owner=exception_queue_owner,
        audit=audit,
    )
    return GateTwoExecution(
        shipment_import=shipment_import,
        reconciliation_run=reconciliation_run,
        results=results,
    )


def _candidate_component(
    start: int,
    shipment_edges: dict[int, set[int]],
    case_edges: dict[int, set[int]],
) -> tuple[set[int], set[int]]:
    component_shipments: set[int] = set()
    component_cases: set[int] = set()
    pending_shipments = [start]
    while pending_shipments:
        shipment_index = pending_shipments.pop()
        if shipment_index in component_shipments:
            continue
        component_shipments.add(shipment_index)
        for case_index in shipment_edges[shipment_index]:
            if case_index in component_cases:
                continue
            component_cases.add(case_index)
            pending_shipments.extend(case_edges[case_index] - component_shipments)
    return component_shipments, component_cases


def _require_unique_inputs(
    shipments: tuple[ExpectedShipment, ...], cases: tuple[CaseSnapshot, ...]
) -> None:
    shipment_ids = [shipment.shipment_id for shipment in shipments]
    if len(shipment_ids) != len(set(shipment_ids)):
        raise ValueError("shipments contains duplicate shipment_id values")
    case_ids = [case.case_id for case in cases]
    if len(case_ids) != len(set(case_ids)):
        raise ValueError("cases contains duplicate case_id values")
