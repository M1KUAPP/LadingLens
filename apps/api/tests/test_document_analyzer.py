from pathlib import Path

import pytest

from app.contracts import ComparedField
from app.extraction import (
    AttachmentInput,
    CachedExtraction,
    DocumentAnalyzer,
    ExtractionFailure,
    ExtractionFailureCode,
    GeminiDocument,
    GeminiOutcome,
)
from app.gemini import KeyAttempt
from app.jev import DocumentRole, JevFailureCode, JevProviderFailure, JevRoleDecision

ATTACHMENTS = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "sdoc-hackathon-bundle"
    / "attachments"
)
OK = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
SCAN_JSON = (
    '{"document_title": "SHIPPING INSTRUCTION", "transcription": "SHIPPING INSTRUCTION", "fields": {'
    + ", ".join(
        f'"{field.value}": {{"value": "V {field.value}", "page": 1, "region": "party"}}'
        for field in ComparedField
    )
    + "}}"
)


def _input(name: str) -> AttachmentInput:
    return AttachmentInput(
        attachment_id=f"att-{name}",
        file_name=name,
        data=(ATTACHMENTS / name).read_bytes(),
    )


class _Roles:
    def __init__(self, roles=None, error=None):
        self.roles, self.error, self.calls = roles or {}, error, []

    async def decide(self, documents, *, correlation_id=None):
        self.calls.append([document.document_id for document in documents])
        if self.error:
            raise self.error
        return [
            JevRoleDecision(
                document_id=document.document_id,
                role=self.roles.get(document.document_id, DocumentRole.SI),
                probabilities={"SI": 0.8, "DRAFT_BL": 0.1, "OTHER": 0.1}
                if self.roles.get(document.document_id, DocumentRole.SI)
                is DocumentRole.SI
                else {"SI": 0.1, "DRAFT_BL": 0.1, "OTHER": 0.8}
                if self.roles.get(document.document_id) is DocumentRole.OTHER
                else {"SI": 0.1, "DRAFT_BL": 0.8, "OTHER": 0.1},
                confidence=0.8,
                returned_model="jev-1.13.0",
                provider_request_id="req",
                correlation_id=correlation_id,
            )
            for document in documents
        ]


class _Gemini:
    def __init__(self, error=None):
        self.error, self.scans, self.texts = error, 0, 0

    async def read_scan(self, data):
        self.scans += 1
        if self.error:
            raise self.error
        return GeminiOutcome(
            GeminiDocument.model_validate_json(SCAN_JSON), OK, "gemini-3.5-flash"
        )

    async def read_text(self, text, *, source_format):
        self.texts += 1
        if self.error:
            raise self.error
        return GeminiOutcome(
            GeminiDocument.model_validate_json(SCAN_JSON), OK, "gemini-3.5-flash"
        )


class _Cache:
    def __init__(self, entries=None):
        self.entries, self.puts = dict(entries or {}), []

    async def get(self, *, content_hash, extractor_version):
        return self.entries.get(content_hash)

    async def put(self, **kwargs):
        self.puts.append(kwargs)


@pytest.mark.asyncio
async def test_local_pair_never_calls_gemini():
    gemini = _Gemini()
    roles = _Roles({"att-email_001_BL.txt": DocumentRole.DRAFT_BL})
    analyses = await DocumentAnalyzer(roles=roles, gemini=gemini).analyze(
        [_input("email_001_SI.txt"), _input("email_001_BL.txt")], correlation_id="c"
    )

    assert [analysis.route for analysis in analyses] == ["local", "local"]
    assert analyses[1].role.role is DocumentRole.DRAFT_BL
    assert len(analyses[0].extraction.values) == 7
    assert gemini.scans == gemini.texts == 0
    assert roles.calls == [["att-email_001_SI.txt", "att-email_001_BL.txt"]]


@pytest.mark.asyncio
async def test_corrupt_pdf_is_unreadable_with_no_anchor_and_no_role():
    analyses = await DocumentAnalyzer(roles=_Roles(), gemini=_Gemini()).analyze(
        [_input("email_511_SI.txt"), _input("email_511_BL.pdf")], correlation_id="c"
    )

    corrupt = analyses[1]
    assert corrupt.route == "none"
    assert corrupt.role is None and corrupt.extraction is None
    assert corrupt.unreadable.root.parse_error.startswith("PDF could not be opened")
    assert not hasattr(corrupt.unreadable.root, "location")


@pytest.mark.asyncio
async def test_scan_goes_to_gemini_and_is_cached_after_validation():
    cache, gemini = _Cache(), _Gemini()
    analyses = await DocumentAnalyzer(
        roles=_Roles(), gemini=gemini, cache=cache
    ).analyze([_input("email_512_SI.pdf")], correlation_id="c")

    analysis = analyses[0]
    assert analysis.route == "gemini_scan"
    assert analysis.extraction.values[0].provenance.root.format == "scanned_pdf"
    assert gemini.scans == 1
    assert cache.puts[0]["extractor_route"] == "gemini_scan"
    assert cache.puts[0]["document_text"] == "SHIPPING INSTRUCTION"


@pytest.mark.asyncio
async def test_cache_hit_skips_gemini_and_restamps_identity():
    first_cache, gemini = _Cache(), _Gemini()
    analyzer = DocumentAnalyzer(roles=_Roles(), gemini=gemini, cache=first_cache)
    await analyzer.analyze([_input("email_512_SI.pdf")], correlation_id="c")
    stored = first_cache.puts[0]
    cache = _Cache(
        {
            stored["content_hash"]: CachedExtraction(
                stored["result"], stored["document_text"]
            )
        }
    )
    second = AttachmentInput(
        attachment_id="other-id",
        file_name="copy.pdf",
        data=_input("email_512_SI.pdf").data,
    )

    analyses = await DocumentAnalyzer(
        roles=_Roles(), gemini=gemini, cache=cache
    ).analyze([second], correlation_id="c")

    assert gemini.scans == 1
    provenance = analyses[0].extraction.values[0].provenance.root
    assert (provenance.attachment_id, provenance.file_name) == ("other-id", "copy.pdf")


@pytest.mark.asyncio
async def test_gemini_failure_fails_closed_and_is_not_cached():
    failure = ExtractionFailure(
        ExtractionFailureCode.TIMEOUT, retryable=True, message="slow"
    )
    cache = _Cache()
    analyses = await DocumentAnalyzer(
        roles=_Roles(), gemini=_Gemini(error=failure), cache=cache
    ).analyze([_input("email_512_SI.pdf")], correlation_id="c")

    assert analyses[0].failure is failure
    assert analyses[0].extraction is None and analyses[0].role is None
    assert cache.puts == []


@pytest.mark.asyncio
async def test_role_provider_failure_admits_nothing():
    error = JevProviderFailure(
        code=JevFailureCode.TIMEOUT,
        retryable=True,
        email_ids=("x",),
        correlation_id="c",
        message="t",
    )
    analyses = await DocumentAnalyzer(
        roles=_Roles(error=error), gemini=_Gemini()
    ).analyze(
        [_input("email_001_SI.txt"), _input("email_001_BL.txt")], correlation_id="c"
    )

    assert all(analysis.failure is error for analysis in analyses)
    assert all(
        analysis.extraction is None and analysis.role is None for analysis in analyses
    )


@pytest.mark.asyncio
async def test_other_role_is_not_extracted():
    roles = _Roles({"att-email_501_BL.txt": DocumentRole.OTHER})
    analyses = await DocumentAnalyzer(roles=roles, gemini=_Gemini()).analyze(
        [_input("email_501_SI.txt"), _input("email_501_BL.txt")], correlation_id="c"
    )

    assert analyses[1].role.role is DocumentRole.OTHER
    assert analyses[1].extraction is None


@pytest.mark.asyncio
async def test_ambiguous_local_document_is_grounded_not_relabelled_as_scan():
    data = b"SHIPPING INSTRUCTION\nSender: V shipper\n"
    gemini = _Gemini()
    analyses = await DocumentAnalyzer(roles=_Roles(), gemini=gemini).analyze(
        [AttachmentInput(attachment_id="a", file_name="si.txt", data=data)],
        correlation_id="c",
    )

    # Only the shipper value exists in the text; other Gemini values are ungrounded.
    assert analyses[0].route == "gemini_ambiguous"
    assert analyses[0].failure.code is ExtractionFailureCode.UNGROUNDED_VALUE
    assert gemini.texts == 1
