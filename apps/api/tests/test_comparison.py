import pytest

from app.comparison import (
    admit_pair,
    band,
    compare_fields,
    comparison_output,
    equivalence_questions,
    needs_interactive_review,
    resolve_verdicts,
    structural_output,
)
from app.contracts import (
    ComparedField,
    ExtractedValue,
    ExtractionResult,
    Provenance,
    ReviewReason,
)
from app.extraction import DocumentAnalysis, ExtractionFailure, ExtractionFailureCode
from app.formats import Preflight, unreadable_provenance
from app.jev import (
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevProviderFailure,
    JevRoleDecision,
)

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


def _check(status="OK"):
    return Preflight(
        content_hash="a" * 64, byte_size=10, detected_format="txt", status=status
    )


def _role(document_id, role):
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


def _doc(document_id, doc_role, values=None, **overrides):
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
    fields = {
        "attachment_id": document_id,
        "file_name": f"{document_id}.txt",
        "preflight": _check(),
        "route": "local",
        "role": _role(document_id, doc_role),
        "extraction": extraction,
    }
    fields.update(overrides)
    return DocumentAnalysis(**fields)


def _reasons(admission):
    return [d.reason for d in admission.diagnostics]


def test_valid_pair_is_admitted():
    admission = admit_pair(
        [_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)]
    )
    assert admission.admitted and admission.si.attachment_id == "si"


def test_corrupt_attachment_is_unreadable_even_with_other_defects():
    corrupt = DocumentAnalysis(
        attachment_id="bl",
        file_name="bl.pdf",
        preflight=_check("CORRUPT"),
        route="none",
        unreadable=unreadable_provenance(
            attachment_id="bl",
            file_name="bl.pdf",
            detected_format="pdf",
            diagnostic="PDF could not be opened (FileDataError)",
        ),
    )
    admission = admit_pair([_doc("si", DocumentRole.SI), corrupt])
    assert _reasons(admission)[0] is ReviewReason.UNREADABLE
    assert (
        structural_output(admission.diagnostics).review_reason
        is ReviewReason.UNREADABLE
    )


def test_other_document_is_wrong_doc_type_not_missing_attachment():
    admission = admit_pair(
        [_doc("si", DocumentRole.SI), _doc("inv", DocumentRole.OTHER)]
    )
    assert set(_reasons(admission)) == {
        ReviewReason.WRONG_DOC_TYPE,
        ReviewReason.MISSING_ATTACHMENT,
    }
    assert (
        structural_output(admission.diagnostics).review_reason
        is ReviewReason.WRONG_DOC_TYPE
    )


@pytest.mark.parametrize("attachments", [[], ["si"]])
def test_absent_documents_are_missing_attachment(attachments):
    analyses = [_doc(name, DocumentRole.SI) for name in attachments]
    assert (
        structural_output(admit_pair(analyses).diagnostics).review_reason
        is ReviewReason.MISSING_ATTACHMENT
    )


def test_extra_other_document_beside_a_valid_pair_is_ignored():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL),
            _doc("x", DocumentRole.OTHER),
        ]
    )
    assert admission.admitted


@pytest.mark.parametrize(
    "placeholder", ["N/A", "TBA", "_______", "AS PER ATTACHED", "", "____MT"]
)
def test_placeholder_values_are_missing_value(placeholder):
    si = _doc("si", DocumentRole.SI, {**BASE, F.GROSS_WEIGHT_KG: placeholder})
    admission = admit_pair([si, _doc("bl", DocumentRole.DRAFT_BL)])
    assert _reasons(admission) == [ReviewReason.MISSING_VALUE]
    assert admission.diagnostics[0].document_role == "SI"


def test_absent_value_is_missing_value():
    values = {field: raw for field, raw in BASE.items() if field is not F.CONSIGNEE}
    admission = admit_pair(
        [_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL, values)]
    )
    assert _reasons(admission) == [ReviewReason.MISSING_VALUE]


def test_provider_failure_blocks_without_fabricating_a_reason():
    failure = JevProviderFailure(
        code=JevFailureCode.TIMEOUT,
        retryable=True,
        email_ids=("x",),
        correlation_id="c",
        message="t",
    )
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc(
                "bl", DocumentRole.DRAFT_BL, role=None, extraction=None, failure=failure
            ),
        ]
    )
    assert admission.blocking_failure is failure and admission.diagnostics == ()


def test_gemini_failure_on_an_admitted_role_blocks():
    failure = ExtractionFailure(
        ExtractionFailureCode.QUOTA_EXHAUSTED, retryable=True, message="q"
    )
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL, extraction=None, failure=failure),
        ]
    )
    assert admission.blocking_failure is failure


def _drafts(bl_values):
    return compare_fields(
        admit_pair(
            [_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL, bl_values)]
        )
    )


def test_numbers_are_compared_deterministically_with_si_as_reference():
    drafts = {
        d.field: d
        for d in _drafts(
            {**BASE, F.CONTAINER_COUNT: "2 x 40'HC", F.GROSS_WEIGHT_KG: "21577"}
        )
    }
    assert drafts[F.CONTAINER_COUNT].deterministic_result == "MISMATCH"
    assert drafts[F.CONTAINER_COUNT].si.normalized_value == 1
    assert drafts[F.CONTAINER_COUNT].draft_bl.normalized_value == 2
    assert drafts[F.GROSS_WEIGHT_KG].deterministic_result == "MATCH"


def test_only_differing_text_needs_jev():
    drafts = _drafts(
        {**BASE, F.CONSIGNEE: "Moorim SP Co Ltd", F.SHIPPER: "APRIL FINE PAPER TRADING"}
    )
    questions = equivalence_questions(drafts)
    assert [q.field for q in questions] == [F.SHIPPER]
    assert questions[0].si_value == BASE[F.SHIPPER]


def _equivalence(field, probability):
    return JevEquivalence(
        field=field,
        probability=probability,
        returned_model="jev-1.13.0",
        provider_request_id="r",
        correlation_id="c",
    )


@pytest.mark.parametrize(
    ("probability", "state", "batch"),
    [
        (0.85, "MATCH", "MATCH"),
        (0.8499, "REVIEW", "MISMATCH"),
        (0.3001, "REVIEW", "MISMATCH"),
        (0.30, "MISMATCH", "MISMATCH"),
        (0.0, "MISMATCH", "MISMATCH"),
        (1.0, "MATCH", "MATCH"),
    ],
)
def test_band_boundaries_map_interactive_and_batch(probability, state, batch):
    assert band(probability) == state
    drafts = _drafts({**BASE, F.SHIPPER: "APRIL FINE PAPER TRADING"})
    verdicts = {
        v.field: v
        for v in resolve_verdicts(drafts, [_equivalence(F.SHIPPER, probability)])
    }
    shipper = verdicts[F.SHIPPER]
    assert shipper.interactive_state == state
    assert shipper.batch_result == batch
    assert shipper.deterministic_result == "NOT_APPLICABLE"
    assert shipper.semantic_probability == probability


def test_ambiguity_is_batch_mismatch_and_interactive_review():
    drafts = _drafts({**BASE, F.SHIPPER: "APRIL FINE PAPER TRADING"})
    verdicts = resolve_verdicts(drafts, [_equivalence(F.SHIPPER, 0.55)])
    output = comparison_output(verdicts)
    assert output.status == "MISMATCH"
    assert output.review_reason is None
    assert output.defect_fields == [F.SHIPPER]
    assert needs_interactive_review(verdicts) is True


def test_all_seven_fields_get_a_verdict_and_ok_when_equal():
    verdicts = resolve_verdicts(_drafts(BASE), [])
    assert [v.field for v in verdicts] == list(F)
    assert all(
        v.deterministic_result == "MATCH" and v.semantic_probability is None
        for v in verdicts
    )
    assert comparison_output(verdicts).status == "OK"


def test_missing_equivalence_answer_is_an_error():
    drafts = _drafts({**BASE, F.SHIPPER: "OTHER CO"})
    with pytest.raises(ValueError):
        resolve_verdicts(drafts, [])


def test_unreadable_attachment_says_not_readable_for_missing_role():
    # A readable SI and a corrupt (unreadable) BL should say
    # "No readable draft Bill of Lading was attached", not
    # "No draft Bill of Lading was attached"
    corrupt_bl = DocumentAnalysis(
        attachment_id="bl",
        file_name="bl.pdf",
        preflight=_check("CORRUPT"),
        route="none",
        unreadable=unreadable_provenance(
            attachment_id="bl",
            file_name="bl.pdf",
            detected_format="pdf",
            diagnostic="PDF could not be opened (FileDataError)",
        ),
    )
    admission = admit_pair([_doc("si", DocumentRole.SI), corrupt_bl])
    # Should have diagnostics for unreadable and missing readable BL
    assert len(admission.diagnostics) == 2
    reasons = _reasons(admission)
    assert ReviewReason.UNREADABLE in reasons
    assert ReviewReason.MISSING_ATTACHMENT in reasons
    # Find the missing attachment diagnostic
    missing_diag = next(
        d for d in admission.diagnostics if d.reason == ReviewReason.MISSING_ATTACHMENT
    )
    assert "No readable draft Bill of Lading was attached" in missing_diag.detail
    assert "No draft Bill of Lading was attached" not in missing_diag.detail


def test_missing_role_without_unreadable_says_not_attached():
    # A pair with only SI (no BL at all) should still say
    # "No draft Bill of Lading was attached"
    admission = admit_pair([_doc("si", DocumentRole.SI)])
    missing_diag = next(
        d for d in admission.diagnostics if d.reason == ReviewReason.MISSING_ATTACHMENT
    )
    assert missing_diag.detail == "No draft Bill of Lading was attached"
    assert "readable" not in missing_diag.detail
