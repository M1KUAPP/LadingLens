import json
from datetime import datetime
from enum import StrEnum
from hashlib import sha256
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Discriminator,
    Field,
    RootModel,
    StringConstraints,
    Tag,
    model_validator,
)


class Category(StrEnum):
    BL_COMPARISON = "BL_COMPARISON"
    SI_REQUEST = "SI_REQUEST"
    INVOICE_QUERY = "INVOICE_QUERY"
    GENERAL = "GENERAL"
    SPAM = "SPAM"


class Status(StrEnum):
    OK = "OK"
    MISMATCH = "MISMATCH"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class ReviewReason(StrEnum):
    WRONG_DOC_TYPE = "wrong_doc_type"
    MISSING_ATTACHMENT = "missing_attachment"
    UNREADABLE = "unreadable"
    MISSING_VALUE = "missing_value"


class ComparedField(StrEnum):
    SHIPPER = "shipper"
    CONSIGNEE = "consignee"
    NOTIFY_PARTY = "notify_party"
    PORT_OF_LOADING = "port_of_loading"
    PORT_OF_DISCHARGE = "port_of_discharge"
    CONTAINER_COUNT = "container_count"
    GROSS_WEIGHT_KG = "gross_weight_kg"


class ReconciliationOutcome(StrEnum):
    CASE_PRESENT = "CASE_PRESENT"
    DOCUMENT_MISSING = "DOCUMENT_MISSING"
    MISSING_CASE = "MISSING_CASE"
    UNMATCHED_CASE = "UNMATCHED_CASE"
    DUPLICATE_OR_AMBIGUOUS = "DUPLICATE_OR_AMBIGUOUS"
    SOURCE_STALE = "SOURCE_STALE"


def _canonical_hash(value: object) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return sha256(encoded).hexdigest()


NonEmptyId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _canonical_ids(values: list[str] | None, field_name: str) -> list[str]:
    if not values:
        raise ValueError(f"{field_name} requires at least one ID")
    normalized = [value.strip() for value in values]
    if any(not value for value in normalized):
        raise ValueError(f"{field_name} cannot contain blank IDs")
    return sorted(set(normalized))


def compute_subject_key(
    outcome: ReconciliationOutcome | str,
    *,
    shipment_id: str | None = None,
    case_ids: list[str] | None = None,
    candidate_shipment_ids: list[str] | None = None,
    candidate_case_ids: list[str] | None = None,
) -> str:
    outcome = ReconciliationOutcome(outcome)
    if outcome in {
        ReconciliationOutcome.CASE_PRESENT,
        ReconciliationOutcome.DOCUMENT_MISSING,
        ReconciliationOutcome.MISSING_CASE,
        ReconciliationOutcome.SOURCE_STALE,
    }:
        shipment_id = shipment_id.strip() if shipment_id is not None else None
        if not shipment_id:
            raise ValueError("shipment-backed outcomes require shipment_id")
        if outcome is ReconciliationOutcome.MISSING_CASE and case_ids:
            raise ValueError("MISSING_CASE cannot contain case_ids")
        if outcome is not ReconciliationOutcome.MISSING_CASE:
            _canonical_ids(case_ids, "case_ids")
        return f"shipment:{shipment_id}"

    if outcome is ReconciliationOutcome.UNMATCHED_CASE:
        if shipment_id is not None:
            raise ValueError("UNMATCHED_CASE cannot contain shipment_id")
        canonical_case_ids = _canonical_ids(case_ids, "UNMATCHED_CASE")
        if len(canonical_case_ids) == 1:
            return f"case:{canonical_case_ids[0]}"
        return _canonical_hash(canonical_case_ids)

    if shipment_id is not None or case_ids is not None:
        raise ValueError(
            "DUPLICATE_OR_AMBIGUOUS uses candidate IDs, not shipment_id or case_ids"
        )
    canonical_shipment_ids = _canonical_ids(
        candidate_shipment_ids, "candidate_shipment_ids"
    )
    canonical_case_ids = _canonical_ids(candidate_case_ids, "candidate_case_ids")
    return _canonical_hash(
        {
            "candidate_case_ids": canonical_case_ids,
            "candidate_shipment_ids": canonical_shipment_ids,
        }
    )


class _ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReconciliationBase(_ContractModel):
    reconciliation_id: UUID
    reconciliation_run_id: UUID
    subject_key: str
    match_basis: list[str]
    source_freshness: Literal["CURRENT", "STALE"]
    reviewed_at: datetime | None
    created_at: datetime

    @model_validator(mode="after")
    def subject_key_matches_shape(self) -> Self:
        expected = compute_subject_key(
            self.outcome,
            shipment_id=getattr(self, "shipment_id", None),
            case_ids=getattr(self, "case_ids", None),
            candidate_shipment_ids=getattr(self, "candidate_shipment_ids", None),
            candidate_case_ids=getattr(self, "candidate_case_ids", None),
        )
        if self.subject_key != expected:
            raise ValueError("subject_key does not match the reconciliation shape")
        return self


class ShipmentBackedReconciliation(ReconciliationBase):
    outcome: Literal["CASE_PRESENT", "DOCUMENT_MISSING", "SOURCE_STALE"]
    shipment_id: NonEmptyId
    case_ids: list[NonEmptyId] = Field(min_length=1)


class MissingCaseReconciliation(ReconciliationBase):
    outcome: Literal["MISSING_CASE"]
    shipment_id: NonEmptyId
    case_ids: list[NonEmptyId] = Field(max_length=0)


class UnmatchedCaseReconciliation(ReconciliationBase):
    outcome: Literal["UNMATCHED_CASE"]
    case_ids: list[NonEmptyId] = Field(min_length=1)


class AmbiguousReconciliation(ReconciliationBase):
    outcome: Literal["DUPLICATE_OR_AMBIGUOUS"]
    candidate_shipment_ids: list[NonEmptyId] = Field(min_length=1)
    candidate_case_ids: list[NonEmptyId] = Field(min_length=1)


class ReconciliationResult(RootModel):
    root: Annotated[
        ShipmentBackedReconciliation
        | MissingCaseReconciliation
        | UnmatchedCaseReconciliation
        | AmbiguousReconciliation,
        Field(discriminator="outcome"),
    ]


class EvaluatorOutput(_ContractModel):
    category: Category
    status: Status
    review_reason: ReviewReason | None
    has_defect: bool
    defect_fields: list[ComparedField]

    @model_validator(mode="after")
    def defect_flag_matches_fields(self) -> Self:
        if self.has_defect is not bool(self.defect_fields):
            raise ValueError("has_defect must match whether defect_fields is non-empty")
        return self


def serialize_evaluator_output(output: EvaluatorOutput) -> dict[str, object]:
    return output.model_dump(mode="json")


class TxtLocation(_ContractModel):
    kind: Literal["txt"]
    line: int = Field(gt=0)
    start_col: int = Field(ge=0)
    end_col: int = Field(ge=0)

    @model_validator(mode="after")
    def end_column_follows_start_column(self) -> Self:
        if self.end_col < self.start_col:
            raise ValueError("end_col must be greater than or equal to start_col")
        return self


class DigitalPdfLocation(_ContractModel):
    kind: Literal["digital_pdf"]
    page: int = Field(gt=0)
    bbox: tuple[float, float, float, float]
    approximate: Literal[False]


class ScannedPdfLocation(_ContractModel):
    kind: Literal["scanned_pdf"]
    page: int = Field(gt=0)
    approximate: Literal[True]
    region: Literal["header", "party", "routing", "cargo", "footer"]


class DocxTableLocation(_ContractModel):
    kind: Literal["docx_table"]
    table_index: int
    row_index: int
    col_index: int


class DocxParagraphLocation(_ContractModel):
    kind: Literal["docx_paragraph"]
    paragraph_index: int


class XlsxLocation(_ContractModel):
    kind: Literal["xlsx"]
    sheet: str
    cell: str


class _ProvenanceIdentity(_ContractModel):
    attachment_id: str
    file_name: str


class TxtProvenance(_ProvenanceIdentity):
    format: Literal["txt"]
    location: TxtLocation


class DigitalPdfProvenance(_ProvenanceIdentity):
    format: Literal["digital_pdf"]
    location: DigitalPdfLocation


class ScannedPdfProvenance(_ProvenanceIdentity):
    format: Literal["scanned_pdf"]
    location: ScannedPdfLocation


class DocxProvenance(_ProvenanceIdentity):
    format: Literal["docx"]
    location: DocxTableLocation | DocxParagraphLocation


class XlsxProvenance(_ProvenanceIdentity):
    format: Literal["xlsx"]
    location: XlsxLocation


class UnreadableProvenance(_ProvenanceIdentity):
    format: Literal["txt", "pdf", "docx", "xlsx", "unknown"]
    parse_error: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def _provenance_discriminator(value: object) -> str | None:
    if isinstance(value, dict):
        if "parse_error" in value:
            return "unreadable"
        return value.get("format")
    if getattr(value, "parse_error", None) is not None:
        return "unreadable"
    return getattr(value, "format", None)


class Provenance(RootModel):
    root: Annotated[
        Annotated[TxtProvenance, Tag("txt")]
        | Annotated[DigitalPdfProvenance, Tag("digital_pdf")]
        | Annotated[ScannedPdfProvenance, Tag("scanned_pdf")]
        | Annotated[DocxProvenance, Tag("docx")]
        | Annotated[XlsxProvenance, Tag("xlsx")]
        | Annotated[UnreadableProvenance, Tag("unreadable")],
        Discriminator(_provenance_discriminator),
    ]


class ExtractedValue(_ContractModel):
    field: ComparedField
    raw_value: str | None = None
    normalized_value: str | int | float | None = None
    confidence: float | None = None
    provenance: Provenance


class ExtractionResult(_ContractModel):
    values: list[ExtractedValue]

    @model_validator(mode="after")
    def fields_are_unique(self) -> Self:
        fields = [value.field for value in self.values]
        if len(fields) != len(set(fields)):
            raise ValueError("extraction result cannot repeat a compared field")
        return self


class FieldVerdict(_ContractModel):
    field: ComparedField
    si: ExtractedValue
    draft_bl: ExtractedValue
    deterministic_result: Literal["MATCH", "MISMATCH", "NOT_APPLICABLE"] | None = None
    semantic_probability: float | None = None
    interactive_state: Literal["MATCH", "MISMATCH", "REVIEW"] | None = None
    batch_result: Literal["MATCH", "MISMATCH"] | None = None
    reason: str | None = None
