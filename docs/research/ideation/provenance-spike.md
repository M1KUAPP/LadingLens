# Field Provenance Across Attachment Formats

This document records empirical spike findings for recovering source location
coordinates across all 250 attachments in the hackathon dataset. It defines the
provenance schema and what location precision the user interface may promise.

Contents:

1.  [Executive Summary](#executive-summary)
1.  [Dataset Overview and Breakdown](#dataset-overview-and-breakdown)
1.  [Format Spike: Plain Text (.txt)](#format-spike-plain-text-txt)
    1.  [Plain Text Anchoring Capabilities](#plain-text-anchoring-capabilities)
    2.  [Recommended Plain Text Anchors](#recommended-plain-text-anchors)
1.  [Format Spike: Portable Document Format (.pdf)](#format-spike-portable-document-format-pdf)
    1.  [Digital Text-Layer PDFs](#digital-text-layer-pdfs)
    2.  [Scanned Image-Only PDFs](#scanned-image-only-pdfs)
    3.  [Corrupted or Truncated PDFs](#corrupted-or-truncated-pdfs)
1.  [Format Spike: Word Documents (.docx)](#format-spike-word-documents-docx)
    1.  [Word Document Anchoring Capabilities](#word-document-anchoring-capabilities)
    2.  [Recommended Word Document Anchors](#recommended-word-document-anchors)
1.  [Format Spike: Excel Spreadsheets (.xlsx)](#format-spike-excel-spreadsheets-xlsx)
    1.  [Spreadsheet Anchoring Capabilities](#spreadsheet-anchoring-capabilities)
1.  [Handling Chinese Labels and Multi-byte Characters](#handling-chinese-labels-and-multi-byte-characters)
1.  [Comparison Table and UI Promises](#comparison-table-and-ui-promises)
1.  [Schema Recommendation](#schema-recommendation)
1.  [Impact on Extraction Pipeline](#impact-on-extraction-pipeline)

## Executive Summary

Our differentiation strategy requires that when a judge clicks an extracted
value, the interface highlights where in the source document that value was
read. We spiked all 250 attachment files in
`data/sdoc-hackathon-bundle/attachments/` to verify whether location information
is recoverable.

The verdict is a qualified **yes with format-specific anchors**:

1.  **Exact bounding boxes** are achievable for digital text-layer PDFs (20 of
    28 PDFs) using PyMuPDF (`import pymupdf`).
2.  **Exact line and character spans** are achievable for all 192 plain text
    files using standard Unicode character slicing.
3.  **Exact cell coordinates** (`Sheet!ColRow`) are achievable for all 22
    spreadsheets using `openpyxl`.
4.  **Structural table coordinates** (`Table, Row, Col`) are achievable for all
    8 Word documents using `python-docx`. Physical page geometry does not exist
    in Word files.
5.  **Scanned PDFs** (6 of 28 PDFs) lack a text layer. Without external cloud
    OCR services, the UI must promise visual page-level review rather than
    pixel-perfect bounding box verification.
6.  **Corrupted PDFs** (2 of 28 PDFs: `email_511_BL.pdf` and `email_515_BL.pdf`)
    cannot be parsed by MuPDF. They trigger `review_reason: unreadable`.

Extraction must therefore store a polymorphic `provenance` location object
alongside every extracted value.

## Dataset Overview and Breakdown

The attachment directory contains 250 total files across four file extensions:

| Extension | Count | Subtypes in Dataset                                         |
| --------- | ----- | ----------------------------------------------------------- |
| `.txt`    | 192   | 141 English-only, 51 with Chinese labels (`毛重`)           |
| `.pdf`    | 28    | 20 digital text, 6 scanned image-only, 2 corrupted          |
| `.xlsx`   | 22    | 15 Shipping Instructions, 7 Bills of Lading, 0 merged cells |
| `.docx`   | 8     | 8 Bills of Lading, all bilingual with Chinese headers       |

## Format Spike: Plain Text (.txt)

Plain text constitutes 76.8% of all attachment files (192 of 250).

### Plain Text Anchoring Capabilities

Text files have zero layout geometry, but they possess a deterministic linear
stream of characters and lines. Two anchoring strategies were tested:

1.  **Line number and column span**: e.g.,
    `line: 12, start_col: 22, end_col: 31`.
2.  **Global character offset**: e.g., `start_char: 412, end_char: 421`.

Both strategies are 100% reliable across the entire dataset.

### Recommended Plain Text Anchors

Use line-based anchors (`line`, `start_col`, `end_col`) as the primary UI anchor
because line numbers remain human-readable in code diff viewers and side-by-side
previews.

## Format Spike: Portable Document Format (.pdf)

The dataset contains 28 PDF attachments. Analysis reveals three distinct
categories of PDF files.

### Digital Text-Layer PDFs

Twenty PDF files contain vector text streams.

- **Library**: `pymupdf` (MuPDF C bindings) outperforms `pdfplumber` by an order
  of magnitude in extraction speed (<2 ms per page vs. >60 ms per page).
- **Location data**: `pymupdf` returns exact bounding boxes:
  `(x0, y0, x1, y1)` in 72-dpi point space.
- **Search reliability**: Calling `page.search_for(extracted_value)` returns the
  exact bounding rectangle for every standard shipping field.
- **UI promise**: The interface can render the PDF using PDF.js and draw an
  exact yellow highlight rectangle over the source text.

### Scanned Image-Only PDFs

Six PDF files (`email_512_BL.pdf`, `email_512_SI.pdf`, `email_513_BL.pdf`,
`email_513_SI.pdf`, `email_514_BL.pdf`, and `email_514_SI.pdf`) contain no
embedded text fonts or character streams.

- **Inspection**: Each file consists of a single A4 page (`595.28 x 841.89` pt)
  holding one raster PNG image (`1240 x 1754` px, 24-bit RGB).
- **Location data**: Because there is no text stream, standard PDF parsers
  report 0 characters.
- **Vision LLM vs. Local OCR**: Local environments lack Tesseract binaries.
  Vision models (such as Gemini 2.5 Flash) can transcribe text and suggest
  approximate normalized 2D boxes `[ymin, xmin, ymax, xmax]`, but bounding boxes
  on small, compressed shipping tables exhibit coordinate drift.
- **UI promise**: The UI must **not** promise pixel-perfect text bounding boxes
  for scanned PDFs. Instead, it should display the rendered page image and
  highlight the general quadrant or row, clearly labeled as an approximate
  visual anchor.

### Corrupted or Truncated PDFs

Two files (`email_511_BL.pdf` at 775 bytes and `email_515_BL.pdf` at 765 bytes)
fail to open in MuPDF (`FzErrorFormat: code=7: no objects found`). They contain
truncated binary fragments without valid cross-reference tables.

- **Location data**: None.
- **UI promise**: Display a `Corrupted Attachment` badge. The system refuses
  automatic verification and routes the case to human review with
  `review_reason: unreadable`.

## Format Spike: Word Documents (.docx)

Eight attachments are Word documents (`.docx`). All eight are Bills of Lading
(`*_BL.docx`).

### Word Document Anchoring Capabilities

Word processing documents do not have fixed page coordinates. Geometry depends
on the client's rendering engine, font substitution, and margins.

However, all 8 files exhibit an identical structural layout:

- **Paragraph 0**: Document title (`BILL OF LADING (DRAFT)`).
- **Paragraph 1**: B/L Number (`B/L NO.(提单号): <number>`).
- **Paragraph 2**: Order number and payment terms.
- **Table 0**: A 9-row by 2-column table containing all primary shipping fields:
  - Row 0: Shipper (`发货人`)
  - Row 1: Consignee (`收货人`)
  - Row 2: Notify Party (`通知人`)
  - Row 3: Port of Loading (`装货港`)
  - Row 4: Port of Discharge (`卸货港`)
  - Row 5: Total Containers (`箱数`)
  - Row 6: Gross Weight (`毛重 KGS`)
  - Row 7: Vessel Name (`船名`)
  - Row 8: Description of Goods (`货名`)

### Recommended Word Document Anchors

Anchor by structural DOM path:
`table_index: 0, row_index: r, col_index: 1`.

- **UI promise**: Render the Word document as structured HTML. Clicking a field
  highlights the corresponding table cell. The UI must not promise page-based
  bounding boxes for `.docx` files.

## Format Spike: Excel Spreadsheets (.xlsx)

Twenty-two attachments are Excel workbooks (`.xlsx`). Fifteen are Shipping
Instructions (`*_SI.xlsx`) and seven are Bills of Lading (`*_BL.xlsx`).

### Spreadsheet Anchoring Capabilities

Every workbook contains one active worksheet named either `'BL'` or `'S.I.'`.

- **Cell coordinates**: Standard A1 notation (e.g., `S.I.!B5`).
- **Merged cells check**: An automated scan across all 22 files confirmed that
  `len(ws.merged_cells.ranges) == 0` for all sheets. Every field is in an
  independent cell.
- **Layout pattern**: Column A contains the field label (e.g., `Consignee`);
  Column B contains the value.
- **UI promise**: Render a web spreadsheet grid. Clicking an extracted field
  focuses and outlines the exact cell (`Sheet!ColRow`).

## Handling Chinese Labels and Multi-byte Characters

Fifty-one `.txt` files and all eight `.docx` files contain Chinese characters.

### Key Findings

1.  **Encoding**: All 192 text files are valid UTF-8. No GBK or GB18030 decoding
    errors occurred.
2.  **Text files**: Chinese characters appear in the gross weight label:
    `Gross Weight毛重(KGS): 67,311 KG`.
3.  **Word files**: All eight `.docx` files use bilingual labels across all nine
    table rows (`提单号`, `发货人`, `收货人`, `通知人`, etc.).
4.  **Offset pitfall**: In UTF-8, Chinese characters occupy 3 bytes each.
    A character count of `len("毛重")` is 2, while byte length is 6.
    Any character offset passed to browser JavaScript (`String.substring`) must
    use **Unicode code point offsets**, never raw byte offsets.

## Comparison Table and UI Promises

| Format           | File Count | Anchor Type                     | Library           | UI Promise                     |
| ---------------- | ---------- | ------------------------------- | ----------------- | ------------------------------ |
| `.txt`           | 192        | Line & column span              | Standard library  | Exact text highlight           |
| `.pdf` (digital) | 20         | Bounding box `[x0, y0, x1, y1]` | `pymupdf`         | Exact canvas bounding box      |
| `.pdf` (scanned) | 6          | Page index & rough region       | Gemini Vision     | Page preview, rough region     |
| `.pdf` (corrupt) | 2          | None (`unreadable`)             | `pymupdf` (fails) | Refusal badge (`NEEDS_REVIEW`) |
| `.docx`          | 8          | Table cell `[tbl, row, col]`    | `python-docx`     | Structured cell highlight      |
| `.xlsx`          | 22         | Cell coordinate `Sheet!A1`      | `openpyxl`        | Spreadsheet grid cell outline  |

## Schema Recommendation

The extraction schema must not store bare scalar values. Every extracted field
should be an object containing `value`, `confidence`, and a polymorphic
`provenance` descriptor:

```json
{
  "consignee": {
    "value": "BALL & DOGGETT AUSTRALIA PTY LTD",
    "confidence": 0.98,
    "provenance": {
      "file_name": "email_005_SI.xlsx",
      "format": "xlsx",
      "location": {
        "sheet": "S.I.",
        "cell": "B5"
      },
      "error": null
    }
  }
}
```

### Type Definitions

Indexing conventions are explicitly documented below to ensure consistency
between Python backend parsers and frontend viewers.

```python
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field

class TxtLocation(BaseModel):
    # 1-indexed line number
    line: int
    # 0-indexed UTF-16/character column offsets within line
    start_col: int
    end_col: int

class PdfLocation(BaseModel):
    # 1-indexed page number (matches PDF.js viewer; PyMuPDF page.number + 1)
    page: int
    # [x0, y0, x1, y1] in standard 72-dpi PDF point coordinates
    bbox: list[float]
    # True if estimated from vision model on scanned raster image
    is_scanned: bool = False

class DocxLocation(BaseModel):
    # 0-indexed table, row, and column position
    table_index: int | None = None
    row_index: int | None = None
    col_index: int | None = None
    # 0-indexed paragraph position (if field is outside tables)
    paragraph_index: int | None = None

class XlsxLocation(BaseModel):
    sheet: str
    # Excel A1 notation (e.g. 'B5')
    cell: str

class Provenance(BaseModel):
    file_name: str
    format: Literal["txt", "pdf", "docx", "xlsx"]
    # None if the file is unreadable/corrupted
    location: Union[TxtLocation, PdfLocation, DocxLocation, XlsxLocation] | None = None
    # Error message if file could not be parsed (e.g., 'corrupted_file')
    error: str | None = None
```

## Impact on Extraction Pipeline

1.  **Format-specific extractors**: For `.txt`, `.xlsx`, and `.docx`, extraction
    can extract text alongside location coordinates with minimal overhead.
2.  **PDF routing**: Digital PDFs should pass through `pymupdf` to extract text
    and token bounding boxes. When `pymupdf` raises a format error, the file
    immediately routes to human escalation as unreadable. When text length is
    near zero, the document routes to the vision model path with approximate
    region tags.
3.  **No false promises**: The UI must adapt its inspector according to
    `provenance.format`. For `.pdf`, it shows the document canvas; for `.xlsx`,
    it displays the grid cell; for `.docx`, it highlights the table row; for
    scanned files, it highlights the general area while explicitly noting that
    scanned documents have approximate anchors.
