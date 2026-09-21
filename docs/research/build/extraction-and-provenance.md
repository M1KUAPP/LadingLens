# Attachment Parsing and Provenance: API Reference

Primary-source findings for issue #27: deterministic attachment preflight and
local parsing with source-location provenance for TXT, XLSX, DOCX, and PDF,
plus the `google-genai` SDK surface used to fall back to Gemini for scanned
or locally ambiguous documents. Every claim links to an official doc, spec,
or source file; anything not confirmed is marked "Unverified."

Contents:

1.  [PyMuPDF (digital and scanned PDF)](#pymupdf-digital-and-scanned-pdf)
1.  [openpyxl (XLSX)](#openpyxl-xlsx)
1.  [python-docx (DOCX)](#python-docx-docx)
1.  [Python code points vs JavaScript UTF-16 units](#python-code-points-vs-javascript-utf-16-units)
1.  [google-genai Python SDK](#google-genai-python-sdk)
1.  [Gemini bounding boxes](#gemini-bounding-boxes)
1.  [Implications for LadingLens](#implications-for-ladinglens)

## PyMuPDF (digital and scanned PDF)

**Version/license:** 1.28.2 (Aug 6, 2026), dual-licensed **GNU AGPL v3** or
a paid Artifex commercial license — "Open source — GNU AGPL v3. Free for
open-source projects" / "Commercial ... for proprietary applications."
[pymupdf-pypi][] [pymupdf-readme][]

```python
import pymupdf
doc = pymupdf.open(stream=data, filetype="pdf")  # data: bytes/bytearray/BytesIO
```

`filetype` is inferred from content; only needed when inspection fails
(ambiguous text formats, not binary PDF). [pymupdf-open][]

**Exceptions**, all subclassing `RuntimeError`: `FileNotFoundError` (path
missing), `EmptyFileError` (zero-length bytes), `FileDataError` (invalid
structure). [pymupdf-document][] Not fully reliable, though: opening a
corrupt stream can instead raise `FzErrorFormat`, a different `RuntimeError`
subclass — this repo's own spike hit exactly `FzErrorFormat: code=7: no
objects found` on `email_511_BL.pdf`, matching a known upstream report.
Catch `RuntimeError` broadly. [pymupdf-3905][]

**`get_text()`** ([pymupdf-app1][]): `"words"` → list of `(x0, y0, x1, y1,
"word", block_no, line_no, word_no)`; `"blocks"` → `(x0, y0, x1, y1,
"lines", block_no, block_type)`; `"dict"` → `{"width", "height", "blocks":
[{"bbox", "lines": [{"bbox", "spans": [{"bbox", "text", "font", ...}]}]}]}`.

**Coordinates** ([pymupdf-app3][]): raw PDF space origin is **bottom-left**,
y **up**. MuPDF/PyMuPDF transforms this — `get_text()`, `search_for()`, and
`Page.rect` all return **top-left** origin, y **down**, in points (1/72 in),
for the unrotated page. Not the raw PDF spec's axis convention.

**`Page.search_for(needle, quads=...)`** returns `Rect` objects by default,
or `Quad` objects when `quads=True` (recommended — handles rotated text
correctly). [pymupdf-search][]

**Scanned-page detection:** no built-in flag. Maintainers' heuristic
(Discussion #1653): `page.get_text()` empty and `page.get_images()`
non-empty, with the image bbox covering roughly ≥ 95% of `page.rect`. Not
failsafe — an OCR'd scan with an injected text layer can look "digital."
[pymupdf-1653][]

**Page numbering:** 0-based throughout — `doc.load_page(0)`, `doc[0]`, and
`page.number` are all 0-based. [pymupdf-document][]

[pymupdf-pypi]: https://pypi.org/project/PyMuPDF/
[pymupdf-readme]: https://github.com/pymupdf/PyMuPDF
[pymupdf-open]: https://pymupdf.readthedocs.io/en/latest/how-to-open-a-file.html
[pymupdf-document]: https://pymupdf.readthedocs.io/en/latest/document.html
[pymupdf-3905]: https://github.com/pymupdf/PyMuPDF/issues/3905
[pymupdf-app1]: https://pymupdf.readthedocs.io/en/latest/app1.html
[pymupdf-app3]: https://pymupdf.readthedocs.io/en/latest/app3.html
[pymupdf-search]: https://pymupdf.readthedocs.io/en/latest/page.html
[pymupdf-1653]: https://github.com/pymupdf/PyMuPDF/discussions/1653

## openpyxl (XLSX)

**Version/license:** 3.1.5 (Jun 28, 2024), **MIT**. [openpyxl-pypi][]

```python
from openpyxl import load_workbook
wb = load_workbook(filename=io.BytesIO(data), read_only=True, data_only=True)
```

`filename` accepts a path or "a file-like object open in binary mode"
(`BytesIO` qualifies). `read_only=True` lazy-loads and returns
`ReadOnlyCell` objects instead of regular `Cell`s, and **must be closed**
with `wb.close()`. `data_only` "controls whether cells with formulae have
either the formula (default) or the value stored the last time Excel read
the sheet." [openpyxl-tutorial][] [openpyxl-optimized][]

**Coordinates/values:** `wb.sheetnames` lists sheet titles; `ws.title` gives
one sheet's name; `cell.coordinate` returns A1-style text (`"B5"`);
`cell.value` "depends on the value (string, float, int or
datetime.datetime)" — native Python types, not pre-stringified text.
[openpyxl-cell][]

**Exceptions**, read from the 3.1.5 source (`reader/excel.py`, from the
published sdist): [openpyxl-sdist][]

- `_validate_archive()` checks the file **extension**, but only when
  `filename` is a path string — `hasattr(filename, "read")` skips the
  check entirely for file-like objects, so a bad extension on a *path*
  raises `openpyxl.utils.exceptions.InvalidFileException`.
  [openpyxl-exceptions][]
- Right after, `zipfile.ZipFile(filename, "r")` runs **uncaught**. For
  attachments opened from `BytesIO` (our case), a corrupt/non-ZIP blob
  raises stdlib `zipfile.BadZipFile` instead — the extension check never
  runs for byte streams. A valid ZIP missing required OOXML parts (no
  `workbook.xml`) can raise `KeyError` deeper in the reader.

[openpyxl-pypi]: https://pypi.org/project/openpyxl/
[openpyxl-tutorial]: https://openpyxl.readthedocs.io/en/stable/tutorial.html
[openpyxl-optimized]: https://openpyxl.readthedocs.io/en/stable/optimized.html
[openpyxl-cell]: https://openpyxl.readthedocs.io/en/stable/api/openpyxl.cell.cell.html
[openpyxl-exceptions]: https://openpyxl.readthedocs.io/en/stable/api/openpyxl.utils.exceptions.html
[openpyxl-sdist]: https://files.pythonhosted.org/packages/3d/f9/88d94a75de065ea32619465d2f77b29a0469500e99012523b91cc4141cd1/openpyxl-3.1.5.tar.gz

## python-docx (DOCX)

**Version/license:** 1.2.0 (Jun 16, 2025), **MIT**. `docx.Document(docx:
str | IO[bytes] | None = None)` accepts a `BytesIO` directly. [docx-pypi][]
[docx-document][]

**Body order — the trap:** `document.paragraphs` and `document.tables` are
each internally in document order, but are **separate filtered lists** —
literally `self._element.p_lst` and `self._element.tbl_lst` in the source —
so reading one after the other does **not** reconstruct true interleaved
body order. [docx-blkcntnr][] Use `Document.iter_inner_content()` (added in
**1.1.0**, 2023-11-03) for one generator of `Paragraph`/`Table` objects in
true document order. [docx-history][]

**Table access:** `table.rows[r].cells[c].text` returns the cell's full
text as one string; `Table.cell(row_idx, col_idx)` treats `(0, 0)` as
top-left. [docx-table][]

**Merged cells:** any grid position inside a merged span returns the
**same `_Cell` object** — "a grid address that falls in a span returns the
top-leftmost cell in that span" — so `row.cells[0] == row.cells[1]` holds
after a horizontal merge, and naively iterating `row.cells` repeats the
same `.text` across every spanned column. [docx-merge][]

**Exceptions:** `docx.opc.exceptions.PackageNotFoundError(OpcError)`,
"Raised when a package cannot be found at the specified path" — what
`Document()` raises for a renamed, truncated, or non-package input;
`OpcError` subclasses `Exception`. [docx-exceptions][]

[docx-pypi]: https://pypi.org/project/python-docx/
[docx-document]: https://python-docx.readthedocs.io/en/latest/api/document.html
[docx-blkcntnr]: https://github.com/python-openxml/python-docx/blob/master/src/docx/blkcntnr.py
[docx-history]: https://github.com/python-openxml/python-docx/blob/master/HISTORY.rst
[docx-table]: https://python-docx.readthedocs.io/en/latest/api/table.html
[docx-merge]: https://python-docx.readthedocs.io/en/latest/dev/analysis/features/table/cell-merge.html
[docx-exceptions]: https://github.com/python-openxml/python-docx/blob/master/src/docx/opc/exceptions.py

## Python code points vs JavaScript UTF-16 units

Python `str` is "immutable sequences of **Unicode code points**" —
indexing always yields a length-1 `str`, one code point per index.
[python-str][]

ECMAScript's String type is a finite ordered sequence of 16-bit unsigned
integer values, "where each integer value ... usually represents a single
16-bit unit of UTF-16 text"; the spec does not itself enforce UTF-16
validity. [ecma-string][] In every engine, a JS `string` index therefore
addresses a **UTF-16 code unit**, not a code point.

**Where they diverge:** for a code point in the Basic Multilingual Plane
(BMP, `U+0000`–`U+FFFF`), one code point equals one UTF-16 code unit, so
Python and JS indices agree. For an **astral-plane** code point
(`U+10000`–`U+10FFFF` — most emoji, rare CJK Extension ideographs), JS
represents it as a **surrogate pair** (two UTF-16 units) while Python still
counts one index position: `len("😀")` is `1` in Python, `2` in JS.

**For this project:** the sampled Chinese labels (`毛重`, `发货人`, `收货人`,
etc.) are CJK Unified Ideographs in `U+4E00`–`U+9FFF`, well inside the BMP —
one Python code point *and* one UTF-16 unit each, so `provenance-spike.md`'s
conclusion holds: Python `start_col`/`end_col` offsets on these labels are
already valid UTF-16 offsets for `String.substring`. The divergence would
only matter for astral-plane characters, none observed in the dataset.

[python-str]: https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str
[ecma-string]: https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type

## google-genai Python SDK

**Version:** 2.24.0 (Sep 16, 2026), **Apache-2.0** — matches the repo's
`google-genai>=2.24.0` floor in `apps/api/pyproject.toml`. [genai-pypi][]

```python
response = await client.aio.models.generate_content(
    model="gemini-3.5-flash",
    contents=[types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")],
)
```

Combines two confirmed patterns: the SDK README's async
`client.aio.models.generate_content` example, and `Part.from_bytes`'s exact
source signature (`google/genai/types.py`) — `def from_bytes(cls, *, data:
bytes, mime_type: str, ...) -> "Part"`. [genai-readme][] [genai-types][]

**Structured JSON output**, both fields on `GenerateContentConfig` (from
source): `response_mime_type` set to `"application/json"`; `response_schema`
(a `pydantic.BaseModel` or genai `Schema`) needs a compatible
`response_mime_type`; `response_json_schema` is "an alternative to
`response_schema` that accepts JSON Schema. If set, `response_schema` must
be omitted" — only a documented subset of JSON Schema keywords is honored.
[genai-types][]

**Errors**, read in full from source (`google/genai/errors.py`):
`APIError(Exception)` carries `.code: int`, `.status`, `.message`;
`ClientError(APIError)` is raised for `400 <= status_code < 500` (incl.
429), `ServerError(APIError)` for `500 <= status_code < 600`, routed by
`raise_error()`/`raise_for_response()`. A 429 (`RESOURCE_EXHAUSTED`)
surfaces as `ClientError` with `.code == 429`. [genai-errors][]

**Timeout**, confirmed from source: `HttpOptions.timeout: Optional[int]`,
docstring "Timeout for the request in milliseconds" —
`types.HttpOptions(timeout=30_000)` is 30 seconds. [genai-types][]

**Model `gemini-3.5-flash` — confirmed, not assumed.** Model card at
`ai.google.dev/gemini-api/docs/models/gemini-3.5-flash`: model ID
`gemini-3.5-flash`, inputs "Text, Image, Video, Audio, and PDF,"
1,048,576 input / 65,536 output tokens; "Latest update: May 2026" (not
confirmed as a knowledge-cutoff date). [genai-model-card][] Also in the
current models listing, which separately lists `gemini-3.8-flash` as the
newest GA "most intelligent Flash model" as of this research. [genai-models][]
**Unverified:** per-model rate limits (RPM/TPM) — the rate-limits page says
these are tier-dependent and points to the live AI Studio dashboard instead
of a static number. [genai-ratelimits][] General PDF limits documented for
the API: 50 MB max file, 1000 pages max, ~258 tokens/page — not confirmed
as model-specific vs. API-wide. [genai-docproc][]

[genai-pypi]: https://pypi.org/project/google-genai/
[genai-readme]: https://github.com/googleapis/python-genai/blob/main/README.md
[genai-types]: https://github.com/googleapis/python-genai/blob/main/google/genai/types.py
[genai-errors]: https://github.com/googleapis/python-genai/blob/main/google/genai/errors.py
[genai-model-card]: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash
[genai-models]: https://ai.google.dev/gemini-api/docs/models
[genai-ratelimits]: https://ai.google.dev/gemini-api/docs/rate-limits
[genai-docproc]: https://ai.google.dev/gemini-api/docs/document-processing

## Gemini bounding boxes

Official guidance: bounding boxes are normalized to **0–1000**, in
**`[ymin, xmin, ymax, xmax]`** order (y before x); to get pixel
coordinates, divide by 1000 and multiply by image width (x) or height (y).
[gemini-image][]

**Reliability:** the official page states no formal accuracy caveat — it
only tips disabling "thinking" (level "minimal") for segmentation. Real
caveats come from Google's own developer forum instead: misplaced boxes on
down-scaled images, occasional invalid output (`[0, 0, 0, 0]` or
out-of-range values), and one developer citing roughly 40% erroneous boxes
for their use case. [gemini-forum][] This matches this repo's own spike
finding that "bounding boxes on small, compressed shipping tables exhibit
coordinate drift" (`docs/research/ideation/provenance-spike.md`).

[gemini-image]: https://ai.google.dev/gemini-api/docs/image-understanding
[gemini-forum]: https://discuss.ai.google.dev/t/inaccurate-bounding-box-for-forms/77389

## Implications for LadingLens

`apps/api/app/formats.py` does not exist yet, and `pymupdf`, `openpyxl`,
`python-docx` are **not yet** in `apps/api/pyproject.toml` (only
`google-genai>=2.24.0` is pinned today).

1.  **Dependencies:** add `pymupdf>=1.28.2`, `openpyxl>=3.1.5`,
    `python-docx>=1.2.0` (current verified versions; 1.1.0+ needed for
    `iter_inner_content()`).
2.  **PDF preflight:** wrap `pymupdf.open(...)` in `try/except
    RuntimeError` — broad, not just `FileDataError`/`EmptyFileError` (see
    the `FzErrorFormat` caveat) — routing to `NEEDS_REVIEW`/`unreadable`
    per the `Failure contract` in `docs/TRD.md`.
3.  **XLSX preflight:** since attachments load from `BytesIO`, catch
    `zipfile.BadZipFile` (not `InvalidFileException`, path-open only) and
    `KeyError` (missing OOXML parts).
4.  **DOCX preflight:** catch `docx.opc.exceptions.PackageNotFoundError`.
5.  **Digital-PDF `bbox` convention:** persist PyMuPDF's own space — origin
    top-left, y down, in points — not raw-PDF bottom-left/y-up. Document
    this next to `DigitalPdfLocation.bbox` in `contracts.py`; neither that
    field nor the TRD states an axis direction today.
6.  **PDF page numbers:** `contracts.py`'s `DigitalPdfLocation.page`/
    `ScannedPdfLocation.page` require `gt=0` (1-based), but PyMuPDF's
    `page.number` is 0-based. Every writer must store `page.number + 1`.
7.  **DOCX body order:** if a provenance ordinal ever needs true order
    across paragraphs and tables, use `iter_inner_content()`, not
    `document.paragraphs`/`document.tables` read separately.
8.  **DOCX merged cells:** dedupe `table.rows[r].cells[c]` by object
    identity before extracting values, or a merged field is reported once
    per spanned column.
9.  **Unicode offsets:** Python's default code-point indexing for
    `TxtLocation.start_col`/`end_col` is safe as-is for BMP-only content
    such as `毛重`; only a JS/TS frontend consuming astral-plane offsets
    would need to re-derive UTF-16 positions, which none of the sampled
    data requires today.
10. **Gemini call shape:** `client.aio.models.generate_content(model=
    "gemini-3.5-flash", ...)`, confirmed to exist and accept PDF input as
    of Sep 2026, with `types.HttpOptions(timeout=<milliseconds>)` — the
    unit is milliseconds, not seconds. Catch `errors.ClientError`, check
    `e.code == 429` for quota before the configured second key, and catch
    `errors.ServerError` separately, per the `Failure contract`'s "never
    use another model provider" rule.
11. **Gemini structured output:** prefer `response_json_schema` (via
    `model_json_schema()`) over `response_schema` per the SDK's own
    guidance: "If `response_schema` doesn't process your schema correctly,
    try using `response_json_schema` instead."
12. **Scanned-PDF provenance:** no built-in classifier; implement the
    `get_text()`-empty plus `get_images()`-covers-page heuristic (Discussion
    #1653), and keep persisting Gemini's spatial output only as the
    existing `ScannedPdfLocation.region` enum, not raw pixel coordinates —
    official docs give no accuracy floor for scanned, compressed tables,
    matching this repo's own spike.
13. **PyMuPDF license (AGPL v3):** the repo's `LICENSE` is MIT, which does
    not by itself satisfy AGPL v3 §13 (network-use source disclosure) for
    a FastAPI service importing `pymupdf`. The repo being fully public
    likely satisfies this in practice, but the MIT `LICENSE` file doesn't
    describe the obligation — worth a short `NOTICE`/`README` note that
    PyMuPDF-linked code paths are bound by AGPL v3, or budget for
    Artifex's commercial license before any closed-source use.
