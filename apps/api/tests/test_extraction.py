import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from google.genai import errors

from app.contracts import ComparedField
from app.extraction import (
    ExtractionFailure,
    ExtractionFailureCode,
    GeminiDocument,
    GeminiExtractor,
    grounded_extraction,
    local_extraction,
    scan_extraction,
)
from app.formats import parse_document, preflight
from app.gemini import GeminiCallError, GeminiNotConfigured, KeyAttempt

ATTACHMENTS = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "sdoc-hackathon-bundle"
    / "attachments"
)
OK = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)


def _field(value, page=None, region=None):
    return {"value": value, "page": page, "region": region}


def _answer(**overrides):
    fields = {
        "shipper": _field("ACME LTD", 1, "party"),
        "consignee": _field("BETA LTD", 1, "party"),
        "notify_party": _field("BETA LTD", 1, "party"),
        "port_of_loading": _field("SINGAPORE", 1, "routing"),
        "port_of_discharge": _field("BUSAN, SOUTH KOREA", 1, "routing"),
        "container_count": _field("2 x 40'HC", 1, "cargo"),
        "gross_weight_kg": _field("40,326 KG", 1, "cargo"),
    }
    fields.update(overrides)
    return json.dumps(
        {
            "document_title": "BILL OF LADING (DRAFT)",
            "transcription": "BILL OF LADING",
            "fields": fields,
        }
    )


def _generate(text=None, error=None, key_attempts=OK, calls=None):
    async def generate(contents, config=None, attempts=None):
        if calls is not None:
            calls.append((contents, config))
        if error is not None:
            raise error
        return SimpleNamespace(
            text=text, model_version="gemini-3.5-flash-001"
        ), key_attempts

    return generate


@pytest.mark.asyncio
async def test_scan_is_sent_as_pdf_bytes_with_a_json_schema():
    calls = []
    extractor = GeminiExtractor(_generate(_answer(), calls=calls))

    outcome = await extractor.read_scan(b"%PDF-1.5 scan")

    contents, config = calls[0]
    assert contents[0].inline_data.mime_type == "application/pdf"
    assert config.response_mime_type == "application/json"
    assert config.temperature == 0
    fields_schema = config.response_json_schema["$defs"]["GeminiFields"]["properties"]
    assert set(fields_schema) == {
        "shipper",
        "consignee",
        "notify_party",
        "port_of_loading",
        "port_of_discharge",
        "container_count",
        "gross_weight_kg",
    }
    assert outcome.document.fields.shipper.value == "ACME LTD"
    assert outcome.model_version == "gemini-3.5-flash-001"


def test_scan_values_get_approximate_page_and_region_anchors():
    outcome = SimpleNamespace(
        document=GeminiDocument.model_validate_json(_answer()),
        key_attempts=OK,
    )
    result = scan_extraction(
        outcome, attachment_id="a", file_name="s.pdf", page_count=1
    )

    provenance = result.values[0].provenance.root
    assert provenance.format == "scanned_pdf"
    assert provenance.location.model_dump() == {
        "kind": "scanned_pdf",
        "page": 1,
        "approximate": True,
        "region": "party",
    }


@pytest.mark.parametrize(
    "bad_field",
    [
        _field("ACME LTD", None, "party"),
        _field("ACME LTD", 2, "party"),
        _field("ACME LTD", 1, None),
    ],
)
def test_scan_value_without_a_valid_page_and_region_fails_closed(bad_field):
    outcome = SimpleNamespace(
        document=GeminiDocument.model_validate_json(_answer(shipper=bad_field)),
        key_attempts=OK,
    )
    with pytest.raises(ExtractionFailure) as caught:
        scan_extraction(outcome, attachment_id="a", file_name="s.pdf", page_count=1)
    assert caught.value.code is ExtractionFailureCode.INVALID_SCHEMA


def test_absent_scan_value_is_omitted_not_fabricated():
    outcome = SimpleNamespace(
        document=GeminiDocument.model_validate_json(
            _answer(gross_weight_kg=_field(None))
        ),
        key_attempts=OK,
    )
    result = scan_extraction(
        outcome, attachment_id="a", file_name="s.pdf", page_count=1
    )

    assert ComparedField.GROSS_WEIGHT_KG not in {value.field for value in result.values}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "text",
    [
        "not json",
        json.dumps({"document_title": "x", "transcription": "x"}),
        _answer(shipper={"value": 3}),
    ],
)
async def test_invalid_structured_answer_is_invalid_schema(text):
    with pytest.raises(ExtractionFailure) as caught:
        await GeminiExtractor(_generate(text)).read_scan(b"%PDF-")
    assert caught.value.code is ExtractionFailureCode.INVALID_SCHEMA
    assert caught.value.retryable is True
    assert caught.value.key_attempts == OK


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "code", "retryable"),
    [
        (
            errors.ClientError(
                429, {"error": {"message": "You exceeded your current quota"}}
            ),
            ExtractionFailureCode.QUOTA_EXHAUSTED,
            True,
        ),
        (
            errors.ClientError(429, {"error": {"message": "Too many requests"}}),
            ExtractionFailureCode.RATE_LIMITED,
            True,
        ),
        (
            errors.ClientError(400, {"error": {"message": "bad"}}),
            ExtractionFailureCode.PROVIDER_REJECTED,
            False,
        ),
        (
            errors.ServerError(503, {"error": {"message": "unavailable"}}),
            ExtractionFailureCode.PROVIDER_ERROR,
            True,
        ),
    ],
)
async def test_provider_errors_fail_closed_with_distinct_codes(error, code, retryable):
    attempts = (
        KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),
        KeyAttempt(key_index=2, outcome="FAILED", status_code=error.code),
    )
    extractor = GeminiExtractor(_generate(error=GeminiCallError(error, attempts)))

    with pytest.raises(ExtractionFailure) as caught:
        await extractor.read_scan(b"%PDF-")

    assert caught.value.code is code
    assert caught.value.retryable is retryable
    assert caught.value.key_attempts == attempts


@pytest.mark.asyncio
async def test_slow_gemini_call_times_out():
    import asyncio

    async def slow(contents, config=None, attempts=None):
        await asyncio.sleep(1)

    with pytest.raises(ExtractionFailure) as caught:
        await GeminiExtractor(slow, timeout_seconds=0.01).read_scan(b"%PDF-")
    assert caught.value.code is ExtractionFailureCode.TIMEOUT


@pytest.mark.asyncio
async def test_timed_out_call_still_reports_completed_key_attempts():
    import asyncio

    async def rate_limited_then_hangs(contents, config=None, attempts=None):
        if attempts is not None:
            attempts.append(
                KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429)
            )
        await asyncio.sleep(1)

    with pytest.raises(ExtractionFailure) as caught:
        await GeminiExtractor(rate_limited_then_hangs, timeout_seconds=0.01).read_scan(
            b"%PDF-"
        )
    assert caught.value.code is ExtractionFailureCode.TIMEOUT
    assert caught.value.key_attempts == (
        KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),
    )


@pytest.mark.asyncio
async def test_missing_key_is_unconfigured():
    with pytest.raises(ExtractionFailure) as caught:
        await GeminiExtractor(_generate(error=GeminiNotConfigured("no key"))).read_scan(
            b"%PDF-"
        )
    assert caught.value.code is ExtractionFailureCode.UNCONFIGURED
    assert caught.value.retryable is False


def _parsed(text: bytes):
    return parse_document(
        text, preflight(text, file_name="x.txt"), attachment_id="a", file_name="x.txt"
    )


def test_local_extraction_keeps_local_anchors():
    data = (ATTACHMENTS / "email_001_SI.txt").read_bytes()
    parsed = parse_document(
        data, preflight(data, file_name="si.txt"), attachment_id="a", file_name="si.txt"
    )

    result = local_extraction(parsed)

    assert [value.field for value in result.values] == list(ComparedField)
    assert all(value.provenance.root.format == "txt" for value in result.values)


def test_grounded_extraction_anchors_model_values_in_the_original_format():
    parsed = _parsed(
        b"SHIPPING INSTRUCTION\nShipper Name: ACME LTD\nConsignee: BETA LTD\n"
        b"Notify: BETA LTD\nPOL: SINGAPORE\nPOD: BUSAN, SOUTH KOREA\n"
        b"Container Count: 2 x 40'HC\nGross Weight (KG): 40,326 KG\n"
    )
    assert parsed.ambiguous_fields == ()  # "Shipper Name" still starts with "shipper"
    parsed = _parsed(b"SI\nSender: ACME LTD\nConsignee: BETA LTD\n")
    absent = {
        name: _field(None)
        for name in (
            "notify_party",
            "port_of_loading",
            "port_of_discharge",
            "container_count",
            "gross_weight_kg",
        )
    }
    outcome = SimpleNamespace(
        document=GeminiDocument.model_validate_json(
            _answer(shipper=_field("ACME LTD"), **absent)
        ),
        key_attempts=OK,
    )

    result = grounded_extraction(parsed, outcome)
    shipper = next(
        value for value in result.values if value.field is ComparedField.SHIPPER
    )

    assert shipper.provenance.root.format == "txt"
    assert shipper.provenance.root.location.line == 2
    consignee = next(
        value for value in result.values if value.field is ComparedField.CONSIGNEE
    )
    assert consignee.raw_value == "BETA LTD"


def test_ungrounded_model_value_fails_closed():
    parsed = _parsed(b"SI\nSender: ACME LTD\n")
    outcome = SimpleNamespace(
        document=GeminiDocument.model_validate_json(
            _answer(shipper=_field("INVENTED LTD"))
        ),
        key_attempts=OK,
    )
    with pytest.raises(ExtractionFailure) as caught:
        grounded_extraction(parsed, outcome)
    assert caught.value.code is ExtractionFailureCode.UNGROUNDED_VALUE
