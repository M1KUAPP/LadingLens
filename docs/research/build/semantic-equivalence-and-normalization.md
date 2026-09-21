# Semantic Equivalence and Normalization for SI/BoL Comparison

This note gathers primary-source findings for issue #28's per-field SI vs.
draft-BL comparison (`apps/api/app/comparison.py`): the TypeSafe System One
API shapes, Jev 1.13's documented numeric weaknesses, UN/LOCODE and ISO 6346
code formats, and Unicode text normalization for party and port names. Every
claim is cited to a primary source, or flagged where a primary source could
not be reached from this environment.

Contents:

1. [TypeSafe System One API](#typesafe-system-one-api)
2. [Why Jev Performs No Arithmetic](#why-jev-performs-no-arithmetic)
3. [UN/LOCODE Code Format](#unlocode-code-format)
4. [Container Type Codes and FCL](#container-type-codes-and-fcl)
5. [Deterministic Text Normalization](#deterministic-text-normalization)
6. [Implications for LadingLens](#implications-for-ladinglens)

## TypeSafe System One API

System One takes one `state` (the content to evaluate) and named
`questions`, returning typed answers instead of prose: "No text generation,
no parsing" [ts-intro]. Three primitives exist — Choice, Score, Noul — and
"you can mix question types freely" as long as every question shares that
one `state` [ts-primitives].

**Noul** asks one yes/no question and returns a single field, `noul`: "the
probability that the answer is yes," 0 (no) to 1 (yes) [ts-noul]. This is
comparison.py's exact batching need: "For a checklist of conditions, ask
many Noul questions in one request: one question per condition, and the
code decides what the combination means" [ts-noul].

**Choice** returns `choice` (the top-probability label), `probabilities`
(full distribution, summing to ~1), and `confidence` (how concentrated
`probabilities` is) [ts-choice]. `jev.py`'s `JevCategoryClient` already uses
Choice for category/doc-type classification; issue #28's per-field check is
a Noul problem, not a Choice one.

### Request and response shape (typesafe-sdk 0.7.0)

The installed SDK (`typesafe-sdk==0.7.0`, under `apps/api/.venv/lib/
python3.12/site-packages/typesafe_sdk/`) mirrors a generated OpenAPI wire
schema (`_schemas/models.py`). `SystemOneRequest` has `state` (str, object,
or array), `model` (str), and `questions` (`dict[str, Question]` of Noul,
Choice, or Score, keyed by a caller-chosen name); `SystemOneResponse` has
`model`, `answers` (`dict[str, Answer]`, same keys back), and `usage`
(`input_tokens`, `output_tokens`). One shared `state` next to a `questions`
dict is how multiple named questions share a request — documented
behavior, not an SDK convenience: [ts-system-one] gives an example of
asking independent questions "together" against one shared state.

`AsyncTypeSafeClient.system_one` (`_core/client/aio/client.py`):

```python
async def system_one(
    self, state: JSONContent, questions: Mapping[str, Question], *,
    model: str | None = None, retry: RetryPolicy | None = None,
    timeout: float | httpx2.Timeout | None = None,
    extra_headers: Mapping[str, str] | None = None,
    extra_body: Mapping[str, JSONValue | None] | None = None,
    response_model: type[ResponseT] | None = None,
) -> SystemOneResponse | ResponseT
```

`SystemOneResponse` (`_core/response_types.py`) exposes `model`, `usage`,
`answers`, plus cached `.nouls` / `.choices` / `.scores` dict views filtered
by answer type. `NoulAnswer.noul` and `ChoiceAnswer.{choice, confidence,
probabilities}` are frozen, strict pydantic models built on the wire schema
above.

### Errors and request id

Every unsuccessful HTTP response raises a `TypeSafeAPIError` subclass
(`_core/errors.py`), selected by status code:

| Exception                           | Status | Notes                        |
| ------------------------------------ | ------ | ----------------------------- |
| `TypeSafeBadRequestError`            | 400    |                                |
| `TypeSafeAuthenticationError`        | 401    |                                |
| `TypeSafePermissionDeniedError`      | 403    |                                |
| `TypeSafeNotFoundError`              | 404    |                                |
| `TypeSafeUnprocessableEntityError`   | 422    |                                |
| `TypeSafeRateLimitError`             | 429    | exposes `retry_after_ms`      |
| `TypeSafeInternalServerError`        | 5xx    |                                |
| `TypeSafeAPIConnectionError`         | —      | no HTTP response reached      |
| `TypeSafeAPITimeoutError`            | —      | connection error + `.timeout` |
| `TypeSafeAPIResponseValidationError` | —      | bad 2xx body, `.field_path`   |

`TypeSafeAPIError.request_id` reads the `x-typesafe-request-id` response
header (`REQUEST_ID_HEADER`); the HTTP reference documents retrying `429`/
`529` responses with exponential backoff [ts-api].

### Model pinning

The SDK's built-in default is the alias `"jev-latest"` (`constants.py`).
Both `jev-latest` and `jev-preview` currently resolve to `jev-1.13.0`, but
"an alias moves when a new release ships, so the answers behind it can
change without a change on your side"; once thresholds are calibrated,
"pin that version's id ... and move to the new one on your own schedule"
[ts-models]. `jev.py` already pins `JEV_MODEL = "jev-1.13.0"`; comparison.py
should match it, not default to an alias.

[ts-intro]: https://docs.typesafe.ai/introduction.md
[ts-primitives]: https://docs.typesafe.ai/primitives.md
[ts-noul]: https://docs.typesafe.ai/primitives/noul.md
[ts-choice]: https://docs.typesafe.ai/primitives/choice.md
[ts-system-one]: https://docs.typesafe.ai/concepts/system-one.md
[ts-api]: https://docs.typesafe.ai/api.md
[ts-models]: https://docs.typesafe.ai/models.md

## Why Jev Performs No Arithmetic

The Jev 1.13 jaggedness page is direct about numeric weaknesses: "Jev is not
a calculator. We strongly recommend implementing any mathematical logic in
code" [ts-jaggedness]. Specific, documented failure modes:

- **Counting**: "jev-1.13 does not count reliably" over characters, terms,
  or list items, and "the error grows with the size of the thing being
  counted" [ts-jaggedness].
- **Numeric representations**: the model performs worse on numeric forms
  than semantic ones (hex colors vs. color names), and "cannot reliably
  judge whether two [RGB or hex] values are near each other" [ts-jaggedness].
- **Score interpolation**: "do not use score outputs ... to compute the
  exact magnitude of a number between two levels of a criterion"
  [ts-jaggedness].
- **Dates**: "jev-1.13 reads dates as text, not as ordered quantities" and
  cannot reliably order, difference, or window-test them [ts-jaggedness].

This is the documented basis for the TRD's rule that numeric fields get "No
arithmetic question" (`docs/TRD.md`, "Jev decision rules"): `container_count`
and `gross_weight_kg` must be parsed and compared in deterministic Python,
never asked about as a Noul, Choice, or Score question.

[ts-jaggedness]: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md

## UN/LOCODE Code Format

UN/LOCODE is maintained by UNECE (UN/CEFACT) and assigns each location a
fixed five-character code: the first two characters are the ISO 3166-1
alpha-2 country code, and the last three are a location code — normally
letters, with digits 2-9 used only once a country's letters are exhausted
(0/1 excluded to avoid confusion with O/I) [unlocode-wiki]. `USNYC`, for
example, is `US` (United States) + `NYC` (New York). Direct UNECE pages
(`unece.org`, `service.unece.org`) returned HTTP 403 to automated fetches
from this environment, so this is sourced from Wikipedia's UN/LOCODE
article, which itself cites UNECE Secretariat Notes (issues 2006-2, 2011-1)
as its own primary source [unlocode-wiki].

Format consequence: a five-character UN/LOCODE only encodes a country plus
an opaque three-character location slot — no letters of the port or city
name itself. Two documents can show an identical parenthetical code while
their free-text port names differ (misspelling, alternate name, wrong city
sharing a similarly formatted code), so a code match alone cannot stand in
for comparing the port-name text.

[unlocode-wiki]: https://en.wikipedia.org/wiki/UN/LOCODE

## Container Type Codes and FCL

ISO 6346 ("Freight containers — Coding, identification and marking")
defines a four-character size/type code: the first character codes length
(`2` = 20 ft, `4` = 40 ft), the second codes height/width (`2` = 8'6", `5` =
9'6" high cube), and the third/fourth code the container type (`G1`
general purpose, `R1` refrigerated) [bic-sizetype]. The register was
started by the Bureau International des Containers (BIC) in 1970 and
folded into ISO 6346 when ISO adopted it in 1972; BIC remains the
registration authority [iso6346-wiki].

FCL ("Full Container Load") is not part of this code — it is a
load/booking type: the whole container is reserved for one shipper's cargo
under one bill of lading, independent of size [fcl-glossary]. It is
commonly written alongside a size/type code, e.g. `40'HC` names the
size/type while `FCL` separately names the load type; BIC's own size/type
explainer does not mention FCL or LCL at all [bic-sizetype].

[bic-sizetype]: https://www.bic-code.org/size-type-code/
[iso6346-wiki]: https://en.wikipedia.org/wiki/ISO_6346
[fcl-glossary]: https://www.project44.com/resources/what-is-full-container-load-fcl/

## Deterministic Text Normalization

Before any Noul call, party and port names benefit from Unicode
normalization. `unicodedata.normalize(form, unistr)` supports `NFC`, `NFD`,
`NFKC`, `NFKD`; "the normal form KC (NFKC) first applies the compatibility
decomposition, followed by the canonical composition" [py-unicodedata], the
same definition the Unicode Standard gives: "Compatibility Decomposition,
followed by Canonical Composition" [uax15]. Compatibility decomposition
folds characters "inappropriately distinguished in many circumstances" —
e.g. full-width or roman-numeral glyphs — into ordinary equivalents
[uax15], which matters for OCR- or PDF-extracted shipping text.

`str.casefold()` is "similar to lowercasing but more aggressive because it
is intended to remove all case distinctions in a string"; the documented
example is German `'ß'`, where `'straße'.lower()` is unchanged but
`'straße'.casefold()` returns `'strasse'` [py-casefold] — stronger than
`str.lower()` for matching company and port names across locales.

For whitespace, `str.split()` with no separator treats "runs of
consecutive whitespace ... as a single separator" and drops leading and
trailing empty strings [py-split], so `" ".join(value.split())` collapses
internal whitespace and trims both ends in one step.

[py-unicodedata]: https://docs.python.org/3/library/unicodedata.html
[uax15]: https://unicode.org/reports/tr15/
[py-casefold]: https://docs.python.org/3/library/stdtypes.html#str.casefold
[py-split]: https://docs.python.org/3/library/stdtypes.html#str.split

## Implications for LadingLens

1. In `comparison.py`, normalize `shipper`, `consignee`, `notify_party`,
   `port_of_loading`, and `port_of_discharge` as `" ".join(unicodedata.
   normalize("NFKC", value).casefold().split())` before building the Jev
   `state`. This extends `apps/api/app/reconciliation.py`'s casefold-only
   `_normalize_identifier()` (line 397-398) with NFKC and whitespace
   collapsing, which OCR/PDF-extracted names need and identifiers don't.
1. Send the five textual fields as one batched request: a single `state`
   with both normalized SI and draft-BL values, and five named `Noul`
   questions (one per field), matching the Noul batching guidance above and
   the `AsyncSystemOneClient.system_one(...)` call shape `jev.py` already
   uses.
1. Keep `container_count` and `gross_weight_kg` fully outside Jev: parse
   `"6 x 40'HC"` and `"131,058 KG"` deterministically, per the counting and
   numeric-representation weaknesses above. Never ask Jev a Score, Choice,
   or Noul question about the numbers themselves. When extracting the
   `container_count` integer from notation like `20'GP`/`40'HC`, take only
   the leading quantity; don't validate the ISO 6346 suffix or FCL/LCL
   wording, since the compared field is a count, not a specification.
1. Treat a UN/LOCODE match on `port_of_loading`/`port_of_discharge` as
   necessary but not sufficient: still run the free-text port name through
   the same normalized Noul comparison, since the five-character code
   cannot by itself validate the prose name next to it.
1. Always pin `model="jev-1.13.0"` explicitly in comparison.py's calls
   (matching `JEV_MODEL` in `jev.py`); never rely on the `jev-latest` or
   `jev-preview` aliases, documented as movable pointers that only
   currently happen to equal `jev-1.13.0`.
1. Reuse or extend `jev.py`'s `JevProviderFailure`/`JevFailureCode` mapping
   for comparison.py's Jev calls, so `TypeSafeRateLimitError`,
   `TypeSafeAPITimeoutError`, and `TypeSafeAPIResponseValidationError` from
   the batched request get the same structured retry handling and
   `x-typesafe-request-id` logging as the existing category classifier.
