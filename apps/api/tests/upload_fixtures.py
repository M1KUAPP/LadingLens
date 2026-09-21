"""Uploads built in tests: a real workbook that expands far beyond its size."""

from __future__ import annotations

import zipfile
from io import BytesIO

import openpyxl

_SHEET_HEAD = (
    b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    b'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    b"<sheetData>"
)
_SHEET_TAIL = b"</sheetData></worksheet>"
_ROW = b"<row><c><v>1</v></c></row>"


def expanding_workbook(expanded_bytes: int, *, prefix: bytes = b"") -> bytes:
    """A valid XLSX whose one sheet repeats a row to about ``expanded_bytes``.

    It deflates to a few kilobytes, the way a ZIP bomb does. ``prefix`` is
    prepended to the archive, which ZipFile and the OOXML readers still open.
    """
    rows = (expanded_bytes - len(_SHEET_HEAD) - len(_SHEET_TAIL)) // len(_ROW) + 1
    sheet = _SHEET_HEAD + _ROW * rows + _SHEET_TAIL
    base = BytesIO()
    openpyxl.Workbook().save(base)
    out = BytesIO()
    with (
        zipfile.ZipFile(BytesIO(base.getvalue())) as source,
        zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as target,
    ):
        for info in source.infolist():
            data = (
                sheet
                if info.filename == "xl/worksheets/sheet1.xml"
                else source.read(info)
            )
            target.writestr(info.filename, data)
    return prefix + out.getvalue()


def archive_with_an_undecodable_name() -> bytes:
    """A ZIP whose entry name claims UTF-8 but is not, which ZipFile rejects
    with UnicodeDecodeError rather than BadZipFile."""
    out = BytesIO()
    with zipfile.ZipFile(out, "w") as archive:
        archive.writestr("a.txt", b"hello")
    data = bytearray(out.getvalue())
    central = data.index(b"PK\x01\x02")
    data[central + 8 : central + 10] = (0x800).to_bytes(2, "little")  # UTF-8 flag
    data[central + 46] = 0xFF  # the name's first byte
    return bytes(data)
