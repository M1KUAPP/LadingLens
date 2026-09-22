import pytest

from app.comparison import (
    admit_pair,
    band,
    compare_fields,
    comparison_output,
    equivalence_questions,
    needs_interactive_review,
    resolve_verdicts,
    scan_holds,
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
from app.formats import Preflight, preflight, unreadable_provenance
from app.jev import (
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevProviderFailure,
    JevRoleDecision,
)
from app.submission import is_scan_hold

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


@pytest.mark.parametrize("placeholder", ["N.A.", "N/A.", "TBA.", ".", "***"])
def test_punctuated_placeholder_on_both_sides_is_missing_value_not_a_match(
    placeholder,
):
    values = {**BASE, F.NOTIFY_PARTY: placeholder}
    admission = admit_pair(
        [_doc("si", DocumentRole.SI, values), _doc("bl", DocumentRole.DRAFT_BL, values)]
    )
    assert _reasons(admission) == [ReviewReason.MISSING_VALUE] * 2


def _port_drafts(si_port, bl_port):
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI, {**BASE, F.PORT_OF_LOADING: si_port}),
            _doc("bl", DocumentRole.DRAFT_BL, {**BASE, F.PORT_OF_LOADING: bl_port}),
        ]
    )
    return compare_fields(admission)


@pytest.mark.parametrize(
    ("si_port", "bl_port"),
    [
        ("Portland (USPDX)", "Portland (USPWM)"),
        # A bracketed country is not a code, and one in capitals only looks
        # like one: neither may become a deterministic verdict.
        ("Shanghai (China)", "Shanghai (CNSHA)"),
        ("SHANGHAI (CHINA)", "SHANGHAI (CNSHA)"),
    ],
)
def test_differing_port_code_tokens_are_asked_of_jev(si_port, bl_port):
    drafts = _port_drafts(si_port, bl_port)
    port = next(d for d in drafts if d.field is F.PORT_OF_LOADING)
    assert port.deterministic_result is None
    [question] = [
        q for q in equivalence_questions(drafts) if q.field is F.PORT_OF_LOADING
    ]
    assert (question.si_value, question.draft_bl_value) == (si_port, bl_port)


@pytest.mark.parametrize(
    ("si_port", "bl_port", "result"),
    [
        # Same code, names equal once case and punctuation are normalized.
        ("Portland, OR (USPDX)", "PORTLAND OR. (USPDX)", "MATCH"),
        # Same code, different city: the bundle's port defects look like this,
        # so Jev is still asked, as today.
        ("MOMBASA, KENYA (KEMBA)", "TUTICORIN, INDIA (KEMBA)", None),
    ],
)
def test_same_port_code_keeps_the_name_comparison(si_port, bl_port, result):
    port = next(
        d for d in _port_drafts(si_port, bl_port) if d.field is F.PORT_OF_LOADING
    )
    assert port.deterministic_result == result


@pytest.mark.parametrize(
    ("si_port", "bl_port"),
    [
        ("NHAVA SHEVA, INDIA", "NHAVA SHEVA, INDIA (INNSA)"),
        ("Portland (USPDX)", "Portland"),
        ("SHANGHAI (CHINA)", "SHANGHAI"),
    ],
)
def test_port_code_on_one_side_only_is_stripped_as_today(si_port, bl_port):
    port = next(
        d for d in _port_drafts(si_port, bl_port) if d.field is F.PORT_OF_LOADING
    )
    assert port.deterministic_result == "MATCH"


def _container_admission(si_count, bl_count):
    return admit_pair(
        [
            _doc("si", DocumentRole.SI, {**BASE, F.CONTAINER_COUNT: si_count}),
            _doc("bl", DocumentRole.DRAFT_BL, {**BASE, F.CONTAINER_COUNT: bl_count}),
        ]
    )


def test_mixed_container_groups_match_their_total():
    admission = _container_admission("1 X 40HC + 2 X 20'", "3")
    count = next(d for d in compare_fields(admission) if d.field is F.CONTAINER_COUNT)
    assert count.deterministic_result == "MATCH"


def test_container_count_with_an_unreadable_group_is_missing_value():
    admission = _container_admission("1 x 40'HC + 2 x 400'", "3")
    assert _reasons(admission) == [ReviewReason.MISSING_VALUE]


def test_dot_thousands_weight_is_missing_value_not_a_mismatch():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI, {**BASE, F.GROSS_WEIGHT_KG: "131.058 KG"}),
            _doc(
                "bl", DocumentRole.DRAFT_BL, {**BASE, F.GROSS_WEIGHT_KG: "131,058 KG"}
            ),
        ]
    )
    assert _reasons(admission) == [ReviewReason.MISSING_VALUE]


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


def _unsupported(document_id):
    """A signature image: preflight rejects it before any role decision."""
    return DocumentAnalysis(
        attachment_id=document_id,
        file_name=f"{document_id}.png",
        preflight=preflight(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", file_name=f"{document_id}.png"
        ),
        route="none",
    )


def _corrupt(document_id):
    return DocumentAnalysis(
        attachment_id=document_id,
        file_name=f"{document_id}.pdf",
        preflight=_check("CORRUPT"),
        route="none",
        unreadable=unreadable_provenance(
            attachment_id=document_id,
            file_name=f"{document_id}.pdf",
            detected_format="pdf",
            diagnostic="PDF could not be opened (FileDataError)",
        ),
    )


def _jev_timeout():
    return JevProviderFailure(
        code=JevFailureCode.TIMEOUT,
        retryable=True,
        email_ids=("x",),
        correlation_id="c",
        message="t",
    )


def test_unsupported_extra_attachment_beside_a_valid_pair_is_ignored():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL),
            _unsupported("logo"),
        ]
    )
    assert admission.admitted
    assert (admission.si.attachment_id, admission.draft_bl.attachment_id) == (
        "si",
        "bl",
    )
    verdicts = resolve_verdicts(compare_fields(admission), [])
    assert comparison_output(verdicts).status == "OK"


def test_unsupported_attachment_without_a_valid_pair_keeps_its_diagnostic():
    admission = admit_pair([_doc("si", DocumentRole.SI), _unsupported("logo")])
    assert [(d.reason, d.attachment_id, d.detail) for d in admission.diagnostics] == [
        (
            ReviewReason.WRONG_DOC_TYPE,
            "logo",
            "File type is not TXT, PDF, DOCX, or XLSX",
        ),
        (
            ReviewReason.MISSING_ATTACHMENT,
            None,
            "No draft Bill of Lading was attached",
        ),
    ]
    assert (
        structural_output(admission.diagnostics).review_reason
        is ReviewReason.WRONG_DOC_TYPE
    )


def test_corrupt_extra_attachment_still_blocks_a_valid_pair():
    # A corrupt file could be the real SI or draft BL, so it is never ignored.
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL),
            _corrupt("extra"),
        ]
    )
    assert not admission.admitted
    assert _reasons(admission) == [ReviewReason.UNREADABLE]


def test_provider_failure_beside_an_unsupported_attachment_blocks():
    # The failed document could still complete a pair that ignores the image,
    # so a structural reason now would be fabricated from the failure.
    failure = _jev_timeout()
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc(
                "bl", DocumentRole.DRAFT_BL, role=None, extraction=None, failure=failure
            ),
            _unsupported("logo"),
        ]
    )
    assert admission.blocking_failure is failure and admission.diagnostics == ()


def test_unreadable_attachment_outranks_a_provider_failure():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI),
            _doc(
                "bl",
                DocumentRole.DRAFT_BL,
                role=None,
                extraction=None,
                failure=_jev_timeout(),
            ),
            _corrupt("extra"),
        ]
    )
    assert admission.blocking_failure is None
    assert _reasons(admission) == [ReviewReason.UNREADABLE]


def test_a_scanned_document_holds_the_compared_pair_as_unreadable():
    admission = admit_pair(
        [
            _doc("si", DocumentRole.SI, route="gemini_scan"),
            _doc("bl", DocumentRole.DRAFT_BL),
        ]
    )
    assert admission.admitted

    holds = scan_holds(admission)

    assert [(d.reason, d.attachment_id) for d in holds] == [
        (ReviewReason.UNREADABLE, "si")
    ]
    assert is_scan_hold(holds)
    assert structural_output(holds).review_reason is ReviewReason.UNREADABLE


def test_a_pair_parsed_from_text_has_no_scan_hold():
    admission = admit_pair(
        [_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)]
    )
    assert scan_holds(admission) == ()
    assert not is_scan_hold(())
