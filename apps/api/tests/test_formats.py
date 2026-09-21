from hashlib import sha256
from pathlib import Path

import pytest

from app.formats import detect_format, preflight

BUNDLE = Path(__file__).resolve().parents[3] / "data" / "sdoc-hackathon-bundle"
ATTACHMENTS = BUNDLE / "attachments"


def _read(name: str) -> bytes:
    return (ATTACHMENTS / name).read_bytes()


@pytest.mark.parametrize(
    ("name", "detected"),
    [
        ("email_001_SI.txt", "txt"),
        ("email_005_SI.xlsx", "xlsx"),
        ("email_291_BL.docx", "docx"),
        ("email_273_BL.pdf", "pdf"),
    ],
)
def test_preflight_hashes_sizes_and_detects_by_magic_bytes(name, detected):
    data = _read(name)

    # A misleading name must not change detection.
    result = preflight(data, file_name="renamed.bin")

    assert result.status == "OK"
    assert result.detected_format == detected
    assert result.content_hash == sha256(data).hexdigest()
    assert result.byte_size == len(data)
    assert result.scanned is False
    assert result.diagnostic is None


def test_scanned_pdf_is_readable_but_flagged_for_gemini():
    result = preflight(_read("email_512_SI.pdf"), file_name="email_512_SI.pdf")

    assert result.status == "OK"
    assert result.scanned is True
    assert result.page_count == 1


@pytest.mark.parametrize("name", ["email_511_BL.pdf", "email_515_BL.pdf"])
def test_truncated_pdf_is_corrupt_with_a_diagnostic(name):
    result = preflight(_read(name), file_name=name)

    assert result.status == "CORRUPT"
    assert result.detected_format == "pdf"
    assert result.diagnostic.startswith("PDF could not be opened")


def test_damaged_ooxml_container_is_corrupt_not_unsupported():
    result = preflight(b"PK\x03\x04not-a-real-archive", file_name="draft.docx")

    assert result.status == "CORRUPT"
    assert result.diagnostic == "DOCX container is damaged"


def test_unknown_binary_is_unsupported():
    result = preflight(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", file_name="a.png")

    assert result.status == "UNSUPPORTED"
    assert result.detected_format == "unknown"
    assert result.diagnostic == "File type is not TXT, PDF, DOCX, or XLSX"


def test_detect_format_rejects_control_characters_in_text():
    assert detect_format(b"SHIPPING INSTRUCTION\x00") == "unknown"
    assert detect_format("毛重: 1 KG".encode()) == "txt"
