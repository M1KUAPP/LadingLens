"""Deterministic attachment preflight and local parsing with provenance.

Every compared value a local parser returns carries the exact source anchor
for its format: TXT line and Unicode code-point columns, XLSX sheet and A1
cell, DOCX table cell or paragraph, and digital-PDF page plus a 72-dpi
bounding box. Nothing here calls a model.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from pathlib import PurePosixPath
from typing import Literal
from zipfile import BadZipFile, ZipFile

from app.contracts import Provenance, UnreadableProvenance

PARSER_VERSION = "local-parsers-v1"

DetectedFormat = Literal["txt", "pdf", "docx", "xlsx", "unknown"]
PreflightStatus = Literal["OK", "UNSUPPORTED", "CORRUPT"]

_ZIP_MAGIC = b"PK\x03\x04"
_PDF_MAGIC = b"%PDF-"
_SUFFIX_FORMATS: dict[str, DetectedFormat] = {
    ".txt": "txt",
    ".pdf": "pdf",
    ".docx": "docx",
    ".xlsx": "xlsx",
}


@dataclass(frozen=True, slots=True)
class Preflight:
    content_hash: str
    byte_size: int
    detected_format: DetectedFormat
    status: PreflightStatus
    diagnostic: str | None = None
    scanned: bool = False
    page_count: int | None = None


def detect_format(data: bytes) -> DetectedFormat:
    """Identify the container from magic bytes and structure, never a name."""
    if data.startswith(_PDF_MAGIC):
        return "pdf"
    archive_format = _detect_ooxml_format(data)
    if archive_format is not None:
        return archive_format
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return "unknown"
    if any(ord(character) < 32 and character not in "\t\n\r\f" for character in text):
        return "unknown"
    return "txt"


def _detect_ooxml_format(data: bytes) -> DetectedFormat | None:
    try:
        with ZipFile(BytesIO(data)) as archive:
            names = set(archive.namelist())
            content_types = archive.read("[Content_Types].xml")
            if archive.testzip() is not None:
                return None
    except (BadZipFile, KeyError, OSError):
        return None

    docx_parts = "word/document.xml" in names
    xlsx_parts = "xl/workbook.xml" in names and any(
        name.startswith("xl/worksheets/") for name in names
    )
    is_docx = docx_parts and b"wordprocessingml.document.main+xml" in content_types
    is_xlsx = xlsx_parts and b"spreadsheetml.sheet.main+xml" in content_types
    if is_docx == is_xlsx:
        return None
    return "docx" if is_docx else "xlsx"


def preflight(data: bytes, *, file_name: str) -> Preflight:
    """Hash, size, and identify bytes; reject unsupported or corrupt files."""
    content_hash = sha256(data).hexdigest()
    detected = detect_format(data)

    def result(
        status: PreflightStatus,
        diagnostic: str | None = None,
        *,
        scanned: bool = False,
        page_count: int | None = None,
    ) -> Preflight:
        return Preflight(
            content_hash=content_hash,
            byte_size=len(data),
            detected_format=detected,
            status=status,
            diagnostic=diagnostic,
            scanned=scanned,
            page_count=page_count,
        )

    if detected == "unknown":
        # The name only picks the wording for a damaged ZIP; the ZIP magic
        # bytes are what make the file a recognized-but-corrupt container.
        suffix_format = _SUFFIX_FORMATS.get(PurePosixPath(file_name).suffix.lower())
        if data.startswith(_ZIP_MAGIC) and suffix_format in {"docx", "xlsx"}:
            return result("CORRUPT", f"{suffix_format.upper()} container is damaged")
        return result("UNSUPPORTED", "File type is not TXT, PDF, DOCX, or XLSX")
    if detected == "pdf":
        return _preflight_pdf(data, result)
    opener = {"docx": _open_docx, "xlsx": _open_xlsx}.get(detected)
    if opener is not None:
        try:
            opener(data)
        except Exception as error:  # noqa: BLE001 - parser libraries raise many types
            return result(
                "CORRUPT", f"{detected.upper()} could not be read ({_name(error)})"
            )
    return result("OK")


def _preflight_pdf(data: bytes, result: Callable[..., Preflight]) -> Preflight:
    import pymupdf

    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as error:  # noqa: BLE001 - MuPDF raises FileDataError and others
        return result("CORRUPT", f"PDF could not be opened ({_name(error)})")
    with document:
        page_count = document.page_count
        if page_count == 0:
            return result("CORRUPT", "PDF has no pages")
        has_text = any(page.get_text("text").strip() for page in document)
        has_images = any(page.get_images(full=False) for page in document)
    if has_text:
        return result("OK", page_count=page_count)
    if has_images:
        return result("OK", scanned=True, page_count=page_count)
    return result("CORRUPT", "PDF has neither a text layer nor images")


def unreadable_provenance(
    *,
    attachment_id: str,
    file_name: str,
    detected_format: DetectedFormat,
    diagnostic: str,
) -> Provenance:
    return Provenance(
        UnreadableProvenance(
            attachment_id=attachment_id,
            file_name=file_name,
            format=detected_format,
            parse_error=diagnostic,
        )
    )


def _open_xlsx(data: bytes):
    import openpyxl

    return openpyxl.load_workbook(BytesIO(data), read_only=False, data_only=True)


def _open_docx(data: bytes):
    import docx

    return docx.Document(BytesIO(data))


def _name(error: Exception) -> str:
    return type(error).__name__
