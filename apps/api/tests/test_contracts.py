import pytest
from pydantic import ValidationError

from app.contracts import (
    AmbiguousReconciliation,
    Category,
    ComparedField,
    EvaluatorOutput,
    ExtractedValue,
    ExtractionResult,
    FieldVerdict,
    Provenance,
    ReconciliationOutcome,
    ReconciliationResult,
    ReviewReason,
    Status,
    compute_subject_key,
    serialize_evaluator_output,
)


@pytest.mark.parametrize(
    ("enum_type", "expected_values"),
    [
        (
            Category,
            {"BL_COMPARISON", "SI_REQUEST", "INVOICE_QUERY", "GENERAL", "SPAM"},
        ),
        (Status, {"OK", "MISMATCH", "NEEDS_REVIEW"}),
        (
            ReviewReason,
            {"wrong_doc_type", "missing_attachment", "unreadable", "missing_value"},
        ),
        (
            ComparedField,
            {
                "shipper",
                "consignee",
                "notify_party",
                "port_of_loading",
                "port_of_discharge",
                "container_count",
                "gross_weight_kg",
            },
        ),
        (
            ReconciliationOutcome,
            {
                "CASE_PRESENT",
                "DOCUMENT_MISSING",
                "MISSING_CASE",
                "UNMATCHED_CASE",
                "DUPLICATE_OR_AMBIGUOUS",
                "SOURCE_STALE",
            },
        ),
    ],
)
def test_enum_has_exact_canonical_values(enum_type, expected_values):
    assert {member.value for member in enum_type} == expected_values


def test_evaluator_output_rejects_unknown_enum_value():
    with pytest.raises(ValidationError):
        EvaluatorOutput(
            category="UNKNOWN",
            status="OK",
            review_reason=None,
            has_defect=False,
            defect_fields=[],
        )


def test_evaluator_output_rejects_extra_keys():
    with pytest.raises(ValidationError):
        EvaluatorOutput(
            category="GENERAL",
            status="OK",
            review_reason=None,
            has_defect=False,
            defect_fields=[],
            metadata={},
        )


@pytest.mark.parametrize(
    ("has_defect", "defect_fields"), [(True, []), (False, ["consignee"])]
)
def test_evaluator_output_rejects_inconsistent_defect_flag(has_defect, defect_fields):
    with pytest.raises(ValidationError, match="has_defect must match"):
        EvaluatorOutput(
            category="BL_COMPARISON",
            status="MISMATCH",
            review_reason=None,
            has_defect=has_defect,
            defect_fields=defect_fields,
        )


def test_serialize_evaluator_output_emits_exact_contract():
    output = EvaluatorOutput(
        category="BL_COMPARISON",
        status="MISMATCH",
        review_reason=None,
        has_defect=True,
        defect_fields=["consignee"],
    )

    assert serialize_evaluator_output(output) == {
        "category": "BL_COMPARISON",
        "status": "MISMATCH",
        "review_reason": None,
        "has_defect": True,
        "defect_fields": ["consignee"],
    }


@pytest.mark.parametrize(
    "provenance",
    [
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 4,
                "start_col": 2,
                "end_col": 18,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "draft.pdf",
            "format": "digital_pdf",
            "location": {
                "kind": "digital_pdf",
                "page": 1,
                "bbox": [0.1, 0.2, 0.7, 0.3],
                "approximate": False,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "scan.pdf",
            "format": "scanned_pdf",
            "location": {
                "kind": "scanned_pdf",
                "page": 1,
                "approximate": True,
                "region": "cargo",
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "draft.docx",
            "format": "docx",
            "location": {
                "kind": "docx_table",
                "table_index": 0,
                "row_index": 2,
                "col_index": 1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "draft.docx",
            "format": "docx",
            "location": {"kind": "docx_paragraph", "paragraph_index": 7},
        },
        {
            "attachment_id": "att-1",
            "file_name": "manifest.xlsx",
            "format": "xlsx",
            "location": {"kind": "xlsx", "sheet": "Cargo", "cell": "B12"},
        },
        {
            "attachment_id": "att-2",
            "file_name": "broken.pdf",
            "format": "pdf",
            "parse_error": "parser rejected object stream",
        },
    ],
)
def test_provenance_accepts_format_specific_shapes(provenance):
    assert Provenance.model_validate(provenance).model_dump(mode="json") == provenance


def test_provenance_rejects_bbox_for_scanned_pdf():
    scanned_pdf_with_bbox_is_invalid = {
        "attachment_id": "att-1",
        "file_name": "scan.pdf",
        "format": "scanned_pdf",
        "location": {
            "kind": "scanned_pdf",
            "page": 1,
            "approximate": True,
            "region": "cargo",
            "bbox": [0, 0, 1, 1],
        },
    }

    with pytest.raises(ValidationError):
        Provenance.model_validate(scanned_pdf_with_bbox_is_invalid)


def test_provenance_rejects_location_for_unreadable_file():
    unreadable_with_location_is_invalid = {
        "attachment_id": "att-2",
        "file_name": "broken.pdf",
        "format": "pdf",
        "parse_error": "parser rejected object stream",
        "location": {"kind": "digital_pdf", "page": 1},
    }

    with pytest.raises(ValidationError):
        Provenance.model_validate(unreadable_with_location_is_invalid)


@pytest.mark.parametrize(
    "provenance",
    [
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 0,
                "start_col": 0,
                "end_col": 1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": -1,
                "start_col": 0,
                "end_col": 1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 1,
                "start_col": -1,
                "end_col": 1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 1,
                "start_col": 0,
                "end_col": -1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 1,
                "start_col": 2,
                "end_col": 1,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "draft.pdf",
            "format": "digital_pdf",
            "location": {
                "kind": "digital_pdf",
                "page": 0,
                "bbox": [0, 0, 1, 1],
                "approximate": False,
            },
        },
        {
            "attachment_id": "att-1",
            "file_name": "scan.pdf",
            "format": "scanned_pdf",
            "location": {
                "kind": "scanned_pdf",
                "page": 0,
                "approximate": True,
                "region": "cargo",
            },
        },
    ],
)
def test_provenance_rejects_invalid_text_offsets_and_pdf_pages(provenance):
    with pytest.raises(ValidationError):
        Provenance.model_validate(provenance)


@pytest.mark.parametrize(
    "provenance",
    [
        {
            "attachment_id": "att-2",
            "file_name": "broken.pdf",
            "format": "pdf",
            "parse_error": "",
        },
        {
            "attachment_id": "att-1",
            "file_name": "scan.pdf",
            "format": "scanned_pdf",
            "location": {
                "kind": "scanned_pdf",
                "page": 1,
                "approximate": False,
                "region": "cargo",
            },
        },
    ],
)
def test_provenance_rejects_empty_errors_and_exact_scanned_locations(provenance):
    with pytest.raises(ValidationError):
        Provenance.model_validate(provenance)


def test_extracted_value_accepts_contract_fields_and_json_scalar():
    extracted = ExtractedValue.model_validate(
        {
            "field": "consignee",
            "raw_value": "Acme Ltd.",
            "normalized_value": "Acme Limited",
            "confidence": 0.98,
            "provenance": {
                "attachment_id": "att-1",
                "file_name": "draft.pdf",
                "format": "digital_pdf",
                "location": {
                    "kind": "digital_pdf",
                    "page": 1,
                    "bbox": [0.1, 0.2, 0.7, 0.3],
                    "approximate": False,
                },
            },
        }
    )

    assert extracted.model_dump(mode="json") == {
        "field": "consignee",
        "raw_value": "Acme Ltd.",
        "normalized_value": "Acme Limited",
        "confidence": 0.98,
        "provenance": {
            "attachment_id": "att-1",
            "file_name": "draft.pdf",
            "format": "digital_pdf",
            "location": {
                "kind": "digital_pdf",
                "page": 1,
                "bbox": [0.1, 0.2, 0.7, 0.3],
                "approximate": False,
            },
        },
    }


def test_field_verdict_accepts_deterministic_interactive_and_batch_results():
    extracted = {
        "field": "shipper",
        "raw_value": "Oceanic Co.",
        "normalized_value": None,
        "confidence": None,
        "provenance": {
            "attachment_id": "att-1",
            "file_name": "booking.txt",
            "format": "txt",
            "location": {
                "kind": "txt",
                "line": 4,
                "start_col": 2,
                "end_col": 18,
            },
        },
    }

    verdict = FieldVerdict.model_validate(
        {
            "field": "shipper",
            "si": extracted,
            "draft_bl": extracted,
            "deterministic_result": "MATCH",
            "semantic_probability": 0.99,
            "interactive_state": "REVIEW",
            "batch_result": "MISMATCH",
            "reason": "Names differ after normalization.",
        }
    )

    assert verdict.deterministic_result == "MATCH"
    assert verdict.interactive_state == "REVIEW"
    assert verdict.batch_result == "MISMATCH"


def test_extraction_result_rejects_duplicate_fields() -> None:
    extracted = ExtractedValue.model_validate(
        {
            "field": "shipper",
            "raw_value": "Acme",
            "normalized_value": "acme",
            "confidence": 0.9,
            "provenance": {
                "attachment_id": "att-1",
                "file_name": "booking.txt",
                "format": "txt",
                "location": {
                    "kind": "txt",
                    "line": 1,
                    "start_col": 0,
                    "end_col": 4,
                },
            },
        }
    )

    with pytest.raises(ValidationError, match="cannot repeat"):
        ExtractionResult(values=[extracted, extracted])


def _reconciliation_base() -> dict[str, object]:
    return {
        "reconciliation_id": "00000000-0000-0000-0000-000000000001",
        "reconciliation_run_id": "00000000-0000-0000-0000-000000000002",
        "match_basis": ["booking_reference"],
        "source_freshness": "CURRENT",
        "reviewed_at": None,
        "created_at": "2026-09-20T10:00:00Z",
    }


@pytest.mark.parametrize(
    ("specific", "expected_subject_key"),
    [
        (
            {
                "outcome": "CASE_PRESENT",
                "shipment_id": "SHP-1",
                "case_ids": ["case-1"],
            },
            "shipment:SHP-1",
        ),
        (
            {
                "outcome": "DOCUMENT_MISSING",
                "shipment_id": "SHP-2",
                "case_ids": ["case-2"],
            },
            "shipment:SHP-2",
        ),
        (
            {
                "outcome": "SOURCE_STALE",
                "shipment_id": "SHP-3",
                "case_ids": ["case-3"],
            },
            "shipment:SHP-3",
        ),
        (
            {
                "outcome": "MISSING_CASE",
                "shipment_id": "SHP-4",
                "case_ids": [],
            },
            "shipment:SHP-4",
        ),
        (
            {
                "outcome": "UNMATCHED_CASE",
                "case_ids": ["case-5"],
            },
            "case:case-5",
        ),
    ],
)
def test_reconciliation_result_accepts_valid_outcome_shapes(
    specific: dict[str, object], expected_subject_key: str
) -> None:
    payload = _reconciliation_base() | specific | {"subject_key": expected_subject_key}

    result = ReconciliationResult.model_validate(payload).root

    assert result.subject_key == expected_subject_key


def test_multi_case_subject_key_is_stable_for_input_order() -> None:
    first = compute_subject_key("UNMATCHED_CASE", case_ids=["case-b", "case-a"])
    second = compute_subject_key("UNMATCHED_CASE", case_ids=["case-a", "case-b"])

    assert first == second
    assert len(first) == 64


def test_ambiguous_subject_key_canonicalizes_both_candidate_sets() -> None:
    subject_key = compute_subject_key(
        "DUPLICATE_OR_AMBIGUOUS",
        candidate_shipment_ids=["SHP-2", "SHP-1"],
        candidate_case_ids=["case-2", "case-1"],
    )
    payload = _reconciliation_base() | {
        "outcome": "DUPLICATE_OR_AMBIGUOUS",
        "subject_key": subject_key,
        "candidate_shipment_ids": ["SHP-1", "SHP-2"],
        "candidate_case_ids": ["case-1", "case-2"],
    }

    result = ReconciliationResult.model_validate(payload).root

    assert isinstance(result, AmbiguousReconciliation)
    assert len(result.subject_key) == 64


@pytest.mark.parametrize(
    "specific",
    [
        {
            "outcome": "MISSING_CASE",
            "shipment_id": "SHP-1",
            "case_ids": ["case-1"],
        },
        {
            "outcome": "UNMATCHED_CASE",
            "shipment_id": "SHP-1",
            "case_ids": ["case-1"],
        },
        {
            "outcome": "CASE_PRESENT",
            "shipment_id": "SHP-1",
            "case_ids": [],
        },
        {
            "outcome": "DOCUMENT_MISSING",
            "shipment_id": "SHP-1",
            "case_ids": [],
        },
        {
            "outcome": "SOURCE_STALE",
            "shipment_id": "SHP-1",
            "case_ids": [],
        },
        {"outcome": "UNMATCHED_CASE", "case_ids": []},
        {
            "outcome": "DUPLICATE_OR_AMBIGUOUS",
            "candidate_shipment_ids": [],
            "candidate_case_ids": ["case-1"],
        },
        {
            "outcome": "DUPLICATE_OR_AMBIGUOUS",
            "candidate_shipment_ids": ["SHP-1"],
        },
        {"outcome": "UNMATCHED_CASE", "case_ids": ["   "]},
        {
            "outcome": "DUPLICATE_OR_AMBIGUOUS",
            "candidate_shipment_ids": ["SHP-1"],
            "candidate_case_ids": [""],
        },
    ],
)
def test_reconciliation_result_rejects_invalid_outcome_shapes(
    specific: dict[str, object],
) -> None:
    payload = _reconciliation_base() | specific | {"subject_key": "invalid"}

    with pytest.raises(ValidationError):
        ReconciliationResult.model_validate(payload)


def test_reconciliation_result_rejects_noncanonical_subject_key() -> None:
    payload = _reconciliation_base() | {
        "outcome": "CASE_PRESENT",
        "subject_key": "caller-controlled",
        "shipment_id": "SHP-1",
        "case_ids": ["case-1"],
    }

    with pytest.raises(ValidationError, match="subject_key"):
        ReconciliationResult.model_validate(payload)


@pytest.mark.parametrize(
    "outcome",
    ["CASE_PRESENT", "DOCUMENT_MISSING", "SOURCE_STALE"],
)
def test_shipment_backed_reconciliation_requires_a_linked_case(outcome: str) -> None:
    payload = _reconciliation_base() | {
        "outcome": outcome,
        "subject_key": "shipment:SHP-1",
        "shipment_id": "SHP-1",
        "case_ids": [],
    }

    with pytest.raises(ValidationError, match="case_ids"):
        ReconciliationResult.model_validate(payload)


@pytest.mark.parametrize(
    "outcome",
    ["CASE_PRESENT", "DOCUMENT_MISSING", "SOURCE_STALE"],
)
def test_shipment_backed_subject_key_requires_a_linked_case(outcome: str) -> None:
    with pytest.raises(ValueError, match="case_ids"):
        compute_subject_key(outcome, shipment_id="SHP-1", case_ids=[])


def test_reconciliation_result_rejects_non_uuid_record_ids() -> None:
    payload = _reconciliation_base() | {
        "reconciliation_id": "rec-1",
        "outcome": "MISSING_CASE",
        "subject_key": "shipment:SHP-1",
        "shipment_id": "SHP-1",
        "case_ids": [],
    }

    with pytest.raises(ValidationError):
        ReconciliationResult.model_validate(payload)


def test_subject_key_normalizes_identifier_whitespace() -> None:
    assert compute_subject_key(
        "UNMATCHED_CASE", case_ids=[" case-b ", "case-a"]
    ) == compute_subject_key("UNMATCHED_CASE", case_ids=["case-a", "case-b"])
