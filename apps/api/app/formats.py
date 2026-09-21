"""Deterministic attachment preflight and local parsing with provenance.

Every compared value a local parser returns carries the exact source anchor
for its format: TXT line and Unicode code-point columns, XLSX sheet and A1
cell, DOCX table cell or paragraph, and digital-PDF page plus a 72-dpi
bounding box. Nothing here calls a model.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from functools import partial
from hashlib import sha256
from io import BytesIO
from pathlib import PurePosixPath
from typing import Literal
from zipfile import BadZipFile, ZipFile

from app.contracts import (
    ComparedField,
    DigitalPdfLocation,
    DigitalPdfProvenance,
    DocxParagraphLocation,
    DocxProvenance,
    DocxTableLocation,
    Provenance,
    TxtLocation,
    TxtProvenance,
    UnreadableProvenance,
    XlsxLocation,
    XlsxProvenance,
)

PARSER_VERSION = "local-parsers-v1"

DetectedFormat = Literal["txt", "pdf", "docx", "xlsx", "unknown"]
PreflightStatus = Literal["OK", "UNSUPPORTED", "CORRUPT"]

_ZIP_MAGIC = b"PK\x03\x04"
_PDF_MAGIC = b"%PDF-"
# A page with images and fewer non-whitespace text characters than this is a
# scanned page: its text is only an overlay such as a fax header, a stamped
# page number, or a scanner banner. Bundle scans carry no text at all, and the
# smallest digital bundle page carries 617 characters.
_MIN_IMAGE_PAGE_TEXT_CHARS = 200
_SUFFIX_FORMATS: dict[str, DetectedFormat] = {
    ".txt": "txt",
    ".pdf": "pdf",
    ".docx": "docx",
    ".xlsx": "xlsx",
}

# Label patterns match a whole normalized label key (see _label_key). SI and
# BL label one field differently, so alignment is by meaning ("Load Port" and
# "Port of Loading (POL)" are one field). After the label may come only a
# parenthetical, a "/"-joined alternate, or a full stop: a qualified label
# such as "Shipper's Ref" or "Consignee Tax ID" names another value.
_LABEL_TAIL = r"(\s*\([^()]*\)|\s*/\s*[a-z][a-z ]*|\.)*"
_FIELD_LABELS: dict[ComparedField, re.Pattern[str]] = {
    field: re.compile(rf"^({label}){_LABEL_TAIL}$")
    for field, label in {
        ComparedField.SHIPPER: r"shipper( name)?|exporter",
        ComparedField.CONSIGNEE: r"consignee|to the order of",
        ComparedField.NOTIFY_PARTY: r"notify( party)?",
        ComparedField.PORT_OF_LOADING: r"port of loading|pol|load port",
        ComparedField.PORT_OF_DISCHARGE: r"port of discharge|pod|discharge port",
        ComparedField.CONTAINER_COUNT: (
            r"no\. of containers( or packages)?|total containers|container count"
        ),
        # A digital PDF prints the 毛重 gloss in ZapfDingbats, read as "II".
        ComparedField.GROSS_WEIGHT_KG: r"(total )?gross ?(weight|wt)(ii)?",
    }.items()
}
_PARTY_FIELDS = frozenset(
    {ComparedField.SHIPPER, ComparedField.CONSIGNEE, ComparedField.NOTIFY_PARTY}
)
_INLINE_PDF_FIELDS = frozenset(
    {ComparedField.CONTAINER_COUNT, ComparedField.GROSS_WEIGHT_KG}
)
_CJK = re.compile(r"[⺀-鿿豈-﫿＀-￯]")
_LABEL_LINE = re.compile(r"^(?P<label>[^:：]+?)\s*[:：]\s*(?P<value>.*?)\s*$")
# str.splitlines() also breaks on these. A TXT line is split on "\n" alone, as
# a viewer shows it, and these cut it into the segments splitlines() made.
_SOFT_BREAKS = "\r\v\f\x1c\x1d\x1e\x85\u2028\u2029"
# Digital PDFs print party and port labels on their own line (or with the
# value after a space); only counts and weights use "Label: value".
_PDF_BLOCK_LABELS: tuple[tuple[re.Pattern[str], ComparedField], ...] = (
    (
        re.compile(
            r"^(shipper(/exporter| \(principal or seller\))?)(?=\s|:|$)", re.IGNORECASE
        ),
        ComparedField.SHIPPER,
    ),
    (
        re.compile(
            r"^(consignee( \(non-negotiable\))?|to the order of)(?=\s|:|$)",
            re.IGNORECASE,
        ),
        ComparedField.CONSIGNEE,
    ),
    (
        re.compile(
            r"^(notify( party(/intermediate consignee)?)?)(?=\s|:|$)", re.IGNORECASE
        ),
        ComparedField.NOTIFY_PARTY,
    ),
    (
        re.compile(
            r"^(port of loading( \(pol\))?|pol|load port)(?=\s|:|$)", re.IGNORECASE
        ),
        ComparedField.PORT_OF_LOADING,
    ),
    (
        re.compile(
            r"^(port of discharge( \(pod\))?|pod|discharge port)(?=\s|:|$)",
            re.IGNORECASE,
        ),
        ComparedField.PORT_OF_DISCHARGE,
    ),
)
# Section headers a digital PDF prints between blocks (and a DOCX table puts in
# a row's first cell); never a field's value.
_PDF_SECTION_HEADER = re.compile(
    r"^(vessel|ocean vessel|export carrier|container no\.|description"
    r"|gross weight \(kg\)|hs code|b/l number|booking no\."
    r"|place of (receipt|delivery))(?=\s|:|$)",
    re.IGNORECASE,
)


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
        try:
            page_count = document.page_count
            if page_count == 0:
                return result("CORRUPT", "PDF has no pages")
            pages = [
                (
                    sum(not char.isspace() for char in page.get_text("text")),
                    bool(page.get_images(full=False)),
                )
                for page in document
            ]
        except Exception as error:  # noqa: BLE001 - MuPDF raises many exceptions
            return result("CORRUPT", f"PDF could not be read ({_name(error)})")
    # One scanned page makes the whole PDF a scan for Gemini to read.
    if any(images and chars < _MIN_IMAGE_PAGE_TEXT_CHARS for chars, images in pages):
        return result("OK", scanned=True, page_count=page_count)
    if any(chars for chars, _ in pages):
        return result("OK", page_count=page_count)
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


class PreflightError(ValueError):
    """Raised when a caller parses a document whose preflight did not pass."""


@dataclass(frozen=True, slots=True)
class FieldCandidate:
    field: ComparedField
    label: str
    raw_value: str
    provenance: Provenance


@dataclass(frozen=True, slots=True)
class SourceSpan:
    """Text a value can be grounded in, and how to anchor a match inside it.

    `field` is the compared field whose label the text sits under, or None
    when it sits under no compared field's label.
    """

    field: ComparedField | None
    text: str
    anchor: Callable[[int, int], Provenance]


@dataclass(frozen=True, slots=True)
class ParsedDocument:
    attachment_id: str
    file_name: str
    detected_format: DetectedFormat
    text: str
    candidates: tuple[FieldCandidate, ...]
    spans: tuple[SourceSpan, ...]
    # Fields whose value cell cannot be read locally (a formula with no cached
    # result): the value is unknown, so it is never settled, not even as blank.
    unreadable: frozenset[ComparedField] = frozenset()

    def values(self) -> dict[ComparedField, list[FieldCandidate]]:
        grouped: dict[ComparedField, list[FieldCandidate]] = {}
        for candidate in self.candidates:
            grouped.setdefault(candidate.field, []).append(candidate)
        return grouped

    @property
    def ambiguous_fields(self) -> tuple[ComparedField, ...]:
        """Fields a local parse cannot settle: an absent label, a conflict, or
        a value it cannot read."""
        grouped = self.values()
        return tuple(
            field
            for field in ComparedField
            if field in self.unreadable
            or len({_squash(item.raw_value) for item in grouped.get(field, [])}) != 1
        )

    def locate(
        self, value: str, field: ComparedField | None = None
    ) -> Provenance | None:
        """Anchor a model-proposed value in this document, or return None.

        Only a whole-token match counts: no letter, digit, or apostrophe may
        touch either end, so "40" is not found in "40'HC". Given a field,
        text under that field's label is tried first, then unlabelled text;
        text under another compared field's label never grounds it.
        """
        target = value.strip()
        if not target:
            return None
        if field is None:
            tiers = [self.spans]
        else:
            tiers = [
                [span for span in self.spans if span.field is field],
                [span for span in self.spans if span.field is None],
            ]
        for spans in tiers:
            for span in spans:
                start = _token_find(span.text, target)
                if start >= 0:
                    return span.anchor(start, start + len(target))
        return None


def parse_document(
    data: bytes, check: Preflight, *, attachment_id: str, file_name: str
) -> ParsedDocument:
    """Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally."""
    if check.status != "OK" or check.scanned:
        raise PreflightError("only readable, non-scanned documents parse locally")
    parser = {
        "txt": _parse_txt,
        "xlsx": _parse_xlsx,
        "docx": _parse_docx,
        "pdf": _parse_pdf,
    }[check.detected_format]
    return parser(data, attachment_id=attachment_id, file_name=file_name)


def label_field(label: str) -> ComparedField | None:
    key = _label_key(label)
    for field, pattern in _FIELD_LABELS.items():
        if pattern.match(key):
            return field
    return None


def _label_key(label: str) -> str:
    """A label as the field patterns read it: NFKC, lower case, CJK removed,
    whitespace collapsed, and edge spaces and colons stripped."""
    return re.sub(
        r"\s+", " ", _CJK.sub("", unicodedata.normalize("NFKC", label)).lower()
    ).strip(" :")


def _head(field: ComparedField, value: str) -> str:
    """The compared part of a value: a party's name line, else the value."""
    head = value.strip()
    if field in _PARTY_FIELDS:
        head = head.split("\n", 1)[0].split(" | ", 1)[0]
    return head.strip()


def _squash(value: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value)).strip().casefold()


def _token_find(text: str, target: str) -> int:
    """Index of the first whole-token occurrence of target in text, or -1."""
    start = text.find(target)
    while start >= 0:
        end = start + len(target)
        if not (_in_token(text, start - 1) or _in_token(text, end)):
            return start
        start = text.find(target, start + 1)
    return -1


def _in_token(text: str, index: int) -> bool:
    """Whether text[index] exists and is a letter, digit, or apostrophe."""
    return 0 <= index < len(text) and (text[index].isalnum() or text[index] in "'’")


def _fixed_anchor(provenance: Provenance) -> Callable[[int, int], Provenance]:
    """A cell or paragraph anchors any match inside it as the whole unit."""
    return lambda start, end: provenance


def _txt_provenance(
    attachment_id: str, file_name: str, line: int, start: int, end: int
) -> Provenance:
    return Provenance(
        TxtProvenance(
            attachment_id=attachment_id,
            file_name=file_name,
            format="txt",
            location=TxtLocation(kind="txt", line=line, start_col=start, end_col=end),
        )
    )


def _txt_segments(line: str) -> Iterator[tuple[int, str]]:
    """Cut a line at soft breaks into the pieces str.splitlines() made, each
    with the column it starts at."""
    base = 0
    for index, character in enumerate(line):
        if character in _SOFT_BREAKS:
            yield base, line[base:index]
            base = index + 1
    yield base, line[base:]


def _txt_anchor(
    attachment_id: str, file_name: str, line: int, base: int
) -> Callable[[int, int], Provenance]:
    """Anchor offsets inside a segment that starts at column `base` of a line."""
    return lambda start, end: _txt_provenance(
        attachment_id, file_name, line, base + start, base + end
    )


def _parse_txt(data: bytes, *, attachment_id: str, file_name: str) -> ParsedDocument:
    text = data.decode("utf-8")
    # Lines are what a viewer shows: split on "\n" alone, less a trailing "\r".
    lines = [line.removesuffix("\r") for line in text.split("\n")]
    # Each segment is parsed as a line, as str.splitlines() once cut them.
    segments = [
        (_txt_anchor(attachment_id, file_name, line_number, base), segment)
        for line_number, line in enumerate(lines, start=1)
        for base, segment in _txt_segments(line)
    ]
    candidates: list[FieldCandidate] = []
    spans: list[SourceSpan] = []
    field: ComparedField | None = None
    for index, (anchor, segment) in enumerate(segments):
        # Indented lines continue the previous value (an address), not a label.
        if segment[:1].isspace():
            spans.append(SourceSpan(field, segment, anchor))
            continue
        match = _LABEL_LINE.match(segment)
        field = None if match is None else label_field(match["label"])
        spans.append(SourceSpan(field, segment, anchor))
        if field is None:
            continue
        value, value_anchor, start = match["value"], anchor, match.start("value")
        # A label with no inline value takes the indented line below it.
        if not value and index + 1 < len(segments):
            below_anchor, below = segments[index + 1]
            if below[:1].isspace() and below.strip():
                value, value_anchor, start = below, below_anchor, 0
        head = _head(field, value)
        start += value.find(head) if head else 0
        candidates.append(
            FieldCandidate(
                field=field,
                label=match["label"],
                raw_value=head,
                provenance=value_anchor(start, start + len(head)),
            )
        )

    return ParsedDocument(
        attachment_id=attachment_id,
        file_name=file_name,
        detected_format="txt",
        text=text,
        candidates=tuple(candidates),
        spans=tuple(spans),
    )


def _cell_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _xlsx_provenance(
    attachment_id: str, file_name: str, sheet: str, cell: str
) -> Provenance:
    return Provenance(
        XlsxProvenance(
            attachment_id=attachment_id,
            file_name=file_name,
            format="xlsx",
            location=XlsxLocation(kind="xlsx", sheet=sheet, cell=cell),
        )
    )


def _parse_xlsx(data: bytes, *, attachment_id: str, file_name: str) -> ParsedDocument:
    workbook = _open_xlsx(data)
    # Only a formula read tells a formula with no cached result from an empty
    # cell: both read as None from the cached values.
    formulas = _open_xlsx(data, data_only=False)
    candidates: list[FieldCandidate] = []
    spans: list[SourceSpan] = []
    unreadable: set[ComparedField] = set()
    text_lines: list[str] = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows():
            filled = [cell for cell in row if cell.value is not None]
            if filled:
                text_lines.append(
                    f"[{sheet.title}] "
                    + " | ".join(
                        f"{cell.coordinate}: {_cell_text(cell.value)}"
                        for cell in filled
                    )
                )
            # Each label owns the cells from it up to the next label in the row;
            # its value is the first filled cell right of its merge in there.
            labels = [
                label_field(cell.value) if isinstance(cell.value, str) else None
                for cell in row
            ]
            owners: list[ComparedField | None] = [None] * len(row)
            for start, end in _label_ranges(labels):
                field = labels[start]
                owners[start:end] = [field] * (end - start)
                value_cell = _xlsx_value_cell(
                    sheet, formulas[sheet.title], row, start, end
                )
                if value_cell is None:
                    continue
                if (
                    value_cell.value is None
                    and formulas[sheet.title][value_cell.coordinate].data_type == "f"
                ):
                    # A formula with no cached result: unknown, not blank.
                    unreadable.add(field)
                else:
                    candidates.append(
                        FieldCandidate(
                            field=field,
                            label=row[start].value,
                            raw_value=_head(field, _cell_text(value_cell.value)),
                            provenance=_xlsx_provenance(
                                attachment_id,
                                file_name,
                                sheet.title,
                                value_cell.coordinate,
                            ),
                        )
                    )
            # A cell sits under the label that owns it; one before the row's
            # first label sits under none.
            spans.extend(
                SourceSpan(
                    owners[index],
                    _cell_text(cell.value),
                    _fixed_anchor(
                        _xlsx_provenance(
                            attachment_id, file_name, sheet.title, cell.coordinate
                        )
                    ),
                )
                for index, cell in enumerate(row)
                if cell.value is not None
            )

    return ParsedDocument(
        attachment_id=attachment_id,
        file_name=file_name,
        detected_format="xlsx",
        text="\n".join(text_lines),
        candidates=tuple(candidates),
        spans=tuple(spans),
        unreadable=frozenset(unreadable),
    )


def _label_ranges(labels: list[ComparedField | None]) -> list[tuple[int, int]]:
    """The (start, end) cells each label in a row owns: from the label up to
    the next label, or to the row's end."""
    starts = [index for index, field in enumerate(labels) if field is not None]
    return list(zip(starts, [*starts[1:], len(labels)]))


def _xlsx_value_cell(sheet, formula_sheet, row, start: int, end: int):
    """A label's value cell among the cells right of row[start], before
    row[end], outside the label's merged range: the first that holds a value
    or a formula, else the first of them (a blank), else None.

    openpyxl reads every merged-away cell as empty, so a label merged across
    columns has its value in the first cell past the merge.
    """
    merged = next(
        (area for area in sheet.merged_cells.ranges if row[start].coordinate in area),
        None,
    )
    cells = [
        cell
        for cell in row[start + 1 : end]
        if merged is None or cell.coordinate not in merged
    ]
    return next(
        (
            cell
            for cell in cells
            if _cell_text(cell.value).strip()
            or formula_sheet[cell.coordinate].data_type == "f"
        ),
        cells[0] if cells else None,
    )


def _docx_paragraph(attachment_id: str, file_name: str, index: int) -> Provenance:
    return Provenance(
        DocxProvenance(
            attachment_id=attachment_id,
            file_name=file_name,
            format="docx",
            location=DocxParagraphLocation(
                kind="docx_paragraph", paragraph_index=index
            ),
        )
    )


def _docx_cell(
    attachment_id: str, file_name: str, table: int, row: int, col: int
) -> Provenance:
    return Provenance(
        DocxProvenance(
            attachment_id=attachment_id,
            file_name=file_name,
            format="docx",
            location=DocxTableLocation(
                kind="docx_table", table_index=table, row_index=row, col_index=col
            ),
        )
    )


def _docx_row_field(cells) -> ComparedField | None:
    """The field a table row is a label row for: its first cell's label."""
    return label_field(cells[0].text) if len(cells) >= 2 else None


def _docx_value_row(cells) -> bool:
    """Whether a row can be a full-width label's value: not a label row, and,
    as a PDF block label's next line, not opened by a label line or header."""
    line = cells[0].text.strip().split("\n", 1)[0]
    return (
        _docx_row_field(cells) is None
        and _LABEL_LINE.match(line) is None
        and _PDF_SECTION_HEADER.match(line) is None
    )


def _parse_docx(data: bytes, *, attachment_id: str, file_name: str) -> ParsedDocument:
    document = _open_docx(data)
    candidates: list[FieldCandidate] = []
    spans: list[SourceSpan] = []
    text_lines: list[str] = []

    for paragraph_index, paragraph in enumerate(document.paragraphs):
        text = paragraph.text
        if not text.strip():
            continue
        provenance = _docx_paragraph(attachment_id, file_name, paragraph_index)
        text_lines.append(text)
        match = _LABEL_LINE.match(text)
        field = None if match is None else label_field(match["label"])
        spans.append(SourceSpan(field, text, _fixed_anchor(provenance)))
        if field is not None:
            candidates.append(
                FieldCandidate(
                    field=field,
                    label=match["label"],
                    raw_value=_head(field, match["value"]),
                    provenance=provenance,
                )
            )

    for table_index, table in enumerate(document.tables):
        rows = [row.cells for row in table.rows]
        # Rows (never label rows) read as a full-width label's value, by index.
        value_rows: dict[int, ComparedField] = {}
        for row_index, cells in enumerate(rows):
            texts = [cell.text for cell in cells]
            text_lines.append(" | ".join(texts))
            # The whole row sits under its first cell's label, if it has one,
            # or else under the full-width label above whose value it is.
            field = _docx_row_field(cells)
            spans.extend(
                SourceSpan(
                    value_rows.get(row_index, field),
                    text,
                    _fixed_anchor(
                        _docx_cell(
                            attachment_id, file_name, table_index, row_index, col_index
                        )
                    ),
                )
                for col_index, text in enumerate(texts)
            )
            if field is None:
                continue
            # A label merged across columns repeats in row.cells: its value is
            # the first distinct cell. A label spanning the row takes the next
            # row as its value unless that row is a label or header row; else
            # it is blank.
            value_col = next(
                (col for col, cell in enumerate(cells) if cell._tc is not cells[0]._tc),
                0,
            )
            value_row = row_index
            raw_value = _head(field, texts[value_col]) if value_col else ""
            if (
                not value_col
                and row_index + 1 < len(rows)
                and _docx_value_row(rows[row_index + 1])
            ):
                value_row = row_index + 1
                value_rows[value_row] = field
                raw_value = _head(field, rows[value_row][0].text)
            candidates.append(
                FieldCandidate(
                    field=field,
                    label=texts[0],
                    raw_value=raw_value,
                    provenance=_docx_cell(
                        attachment_id, file_name, table_index, value_row, value_col
                    ),
                )
            )

    return ParsedDocument(
        attachment_id=attachment_id,
        file_name=file_name,
        detected_format="docx",
        text="\n".join(text_lines),
        candidates=tuple(candidates),
        spans=tuple(spans),
    )


@dataclass(frozen=True, slots=True)
class _PdfLine:
    page: int
    text: str
    boxes: tuple[tuple[float, float, float, float], ...]
    # Where the line's first text run ends: a digital PDF prints a label as a
    # run of its own, apart from a value that follows it on the same line.
    run_end: int

    def bbox(self, start: int, end: int) -> tuple[float, float, float, float]:
        selected = self.boxes[start:end] or self.boxes
        return (
            min(box[0] for box in selected),
            min(box[1] for box in selected),
            max(box[2] for box in selected),
            max(box[3] for box in selected),
        )


def _pdf_lines(data: bytes) -> list[_PdfLine]:
    import pymupdf

    lines: list[_PdfLine] = []
    with pymupdf.open(stream=data, filetype="pdf") as document:
        for page in document:
            # rawdict yields one bbox per character, so a value's box is exact
            # even when it shares a line with its label.
            for block in page.get_text("rawdict")["blocks"]:
                for line in block.get("lines", []):
                    characters = [
                        char for span in line["spans"] for char in span["chars"]
                    ]
                    text = "".join(char["c"] for char in characters)
                    if text.strip():
                        lines.append(
                            _PdfLine(
                                page=page.number + 1,
                                text=text,
                                boxes=tuple(tuple(char["bbox"]) for char in characters),
                                run_end=len(line["spans"][0]["chars"]),
                            )
                        )
    return lines


def _pdf_block_label(text: str) -> tuple[str, str, ComparedField | None]:
    for pattern, field in _PDF_BLOCK_LABELS:
        match = pattern.match(text)
        if match is not None:
            remainder = text[match.end(1) :]
            # Strip optional spaces and colon (ASCII : or full-width ：) after label
            remainder = re.sub(r"^\s*[:：]\s*", "", remainder)
            return match.group(1), remainder, field
    return "", text, None


def _pdf_label_part(line: _PdfLine) -> str:
    """The label a PDF line opens with: its text up to a colon or the end of
    its first run, whichever comes first."""
    return re.split(r"[:：]", line.text[: line.run_end], maxsplit=1)[0]


def _pdf_value_line(text: str) -> bool:
    """Whether a line can be a block label's value: not a label or a header."""
    return (
        _pdf_block_label(text)[2] is None
        and _LABEL_LINE.match(text) is None
        and _PDF_SECTION_HEADER.match(text) is None
    )


def _parse_pdf(data: bytes, *, attachment_id: str, file_name: str) -> ParsedDocument:
    lines = _pdf_lines(data)
    candidates: list[FieldCandidate] = []
    # The field whose label or value each line prints, by line index.
    line_fields: dict[int, ComparedField] = {}

    def provenance(line: _PdfLine, start: int, end: int) -> Provenance:
        return Provenance(
            DigitalPdfProvenance(
                attachment_id=attachment_id,
                file_name=file_name,
                format="digital_pdf",
                location=DigitalPdfLocation(
                    kind="digital_pdf",
                    page=line.page,
                    bbox=line.bbox(start, end),
                    approximate=False,
                ),
            )
        )

    def add(field: ComparedField, label: str, line: _PdfLine, head: str, start: int):
        candidates.append(
            FieldCandidate(
                field=field,
                label=label,
                raw_value=head,
                provenance=provenance(line, start, start + len(head)),
            )
        )

    for index, line in enumerate(lines):
        match = _LABEL_LINE.match(line.text)
        if match is not None and label_field(match["label"]) in _INLINE_PDF_FIELDS:
            field = label_field(match["label"])
            line_fields[index] = field
            head = _head(field, match["value"])
            add(field, match["label"], line, head, match.start("value"))
            continue
        label, remainder, field = _pdf_block_label(line.text)
        if field is None:
            continue
        # A value on the label's line needs the whole label before it, as a
        # "Consignee Tax ID 12345" line labels another value.
        if remainder.strip() and label_field(_pdf_label_part(line)) is not field:
            continue
        line_fields[index] = field
        if remainder.strip():
            head = _head(field, remainder)
            add(field, label, line, head, line.text.find(head, len(label)))
        elif index + 1 < len(lines) and _pdf_value_line(lines[index + 1].text):
            line_fields[index + 1] = field
            value_line = lines[index + 1]
            head = _head(field, value_line.text)
            add(field, label, value_line, head, value_line.text.find(head))
        else:
            # The label is printed with no value: anchor the blank on the label.
            candidates.append(
                FieldCandidate(
                    field=field,
                    label=label,
                    raw_value="",
                    provenance=provenance(line, 0, len(line.text)),
                )
            )

    return ParsedDocument(
        attachment_id=attachment_id,
        file_name=file_name,
        detected_format="pdf",
        text="\n".join(line.text for line in lines),
        candidates=tuple(candidates),
        spans=tuple(
            SourceSpan(line_fields.get(index), line.text, partial(provenance, line))
            for index, line in enumerate(lines)
        ),
    )


def _open_xlsx(data: bytes, *, data_only: bool = True):
    import openpyxl

    return openpyxl.load_workbook(BytesIO(data), read_only=False, data_only=data_only)


def _open_docx(data: bytes):
    import docx

    return docx.Document(BytesIO(data))


def _name(error: Exception) -> str:
    return type(error).__name__
