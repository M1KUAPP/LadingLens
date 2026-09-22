# Technical requirements

This document is the implementable technical contract for LadingLens. It
separates the present infrastructure scaffold from the approved preliminary
target: two connected controls for inbox accounting and shipment-to-case
reconciliation, followed by evidence-backed SI-to-draft-BL comparison.

Contents:

1.  [Scope and delivery status](#scope-and-delivery-status)
1.  [Locked architecture and model ownership](#locked-architecture-and-model-ownership)
1.  [Canonical enums and output contract](#canonical-enums-and-output-contract)
1.  [Interface schemas](#interface-schemas)
1.  [Format routing and provenance](#format-routing-and-provenance)
1.  [End-to-end flow and state machine](#end-to-end-flow-and-state-machine)
1.  [Jev decision rules](#jev-decision-rules)
1.  [Persistence and idempotency](#persistence-and-idempotency)
1.  [Failure contract](#failure-contract)
1.  [Deployment, security, and observability](#deployment-security-and-observability)
1.  [Preliminary build sequence and finals extensions](#preliminary-build-sequence-and-finals-extensions)
1.  [Verification matrix](#verification-matrix)
1.  [Decision register](#decision-register)
1.  [References](#references)

## Scope and delivery status

`Current` describes repository evidence as of this contract. `Target` is the
approved preliminary implementation; it is not a claim that the capability is
already live.

| Status  | Meaning                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| Current | Exists in the codebase and may be exercised now.                                       |
| Partial | Exists only as supporting infrastructure; it does not satisfy the product requirement. |
| Target  | Required implementation work before the preliminary claim may be made.                 |
| Finals  | Deliberately deferred extension after the preliminary target.                          |

| Area                      | Current                                                                                                                                                   | Target owner and destination                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| API and SPA               | FastAPI health/readiness endpoints and a React readiness screen exist. FastAPI can serve a built SPA.                                                     | API routes in `apps/api/app/`; operator and `/judge` views in `apps/web/src/`.                                                                        |
| Gemini                    | `apps/api/app/gemini.py` creates configured clients and retries the second Gemini key only after a 429. No extraction flow exists.                        | `apps/api/app/extraction.py` calls Gemini 3.5 Flash for scanned or ambiguous documents; provider failures fail closed.                                |
| Configuration             | `apps/api/app/config.py` defaults `GEMINI_MODEL` to `gemini-3.5-flash-lite`.                                                                              | Change the default and deployment configuration to Gemini 3.5 Flash before claiming target conformance. This documentation task does not change code. |
| Jev                       | A TypeSafe key setting and a historical benchmark script exist; no client or product decision calls exist.                                                | `apps/api/app/jev.py` pins `jev-1.13.0` for classification, document type, and textual semantic equivalence.                                          |
| Local parsing             | No product parser or provenance implementation exists.                                                                                                    | `apps/api/app/formats.py` owns preflight, local parsing, anchors, and parser diagnostics.                                                             |
| Comparison                | No classifier, extraction schema, normalizer, or seven-field comparator exists.                                                                           | `apps/api/app/comparison.py` and `apps/api/app/contracts.py` own deterministic normalization, numeric checks, schemas, and evaluator mapping.         |
| Reconciliation and review | No shipment ledger, case ledger, reconciliation, review route, or audit trail exists.                                                                     | `apps/api/app/reconciliation.py`, `apps/api/app/persistence.py`, and `apps/web/src/` own these controls.                                              |
| Persistence               | An async PostgreSQL engine exists, but no domain tables or migrations exist.                                                                              | PostgreSQL records and migrations under `apps/api/` persist the contract in [Persistence and idempotency](#persistence-and-idempotency).              |
| Deployment                | Checked-in Cloud Run deployment configuration and delivery infrastructure exist; remote deployment status is unverified. No product workflow is deployed. | One Cloud Run deployment serves FastAPI and the React build, with PostgreSQL and private GCS objects.                                                 |

The current implementation is an infrastructure scaffold. In particular,
classification, document extraction, comparison, reconciliation, review, and
audit are not implemented and must not be described as live.

## Locked architecture and model ownership

LadingLens has two independent controls. The case ledger accounts for every
received email. The expected-shipment ledger independently detects an expected
case that never arrived. Only a valid `BL_COMPARISON` case reaches
SI-to-draft-BL field comparison, with the SI as the reference.

```text
received email and attachments                 expected-shipment CSV / connector
              |                                              |
              v                                              v
receipt, hash, category, preflight                    shipment ledger
              |                                              |
              v                                              |
local parse or Gemini extraction                           reconcile
              |                                              |
              v                                              v
normalize -> validate -> compare -> case ledger -> review or disposition
                                  |
                                  v
                         exact evaluator output
```

| Responsibility                                                       | Locked owner         | Rule                                                                                             |
| -------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| File preflight, hashes, MIME and magic-byte checks                   | Deterministic Python | Never ask a model to establish file safety or identity.                                          |
| TXT, XLSX, DOCX, and digital-PDF parsing                             | Deterministic Python | Preserve source locations while parsing locally.                                                 |
| Scanned or locally ambiguous document extraction                     | Gemini 3.5 Flash     | Produce a schema-validated candidate and approximate scan anchors where available.               |
| Email category and document type                                     | Jev `jev-1.13.0`     | Use typed `Choice` questions with the closed product enums.                                      |
| Textual field equivalence                                            | Jev `jev-1.13.0`     | Use a typed probability judgment only after deterministic normalization.                         |
| Numeric checks                                                       | Deterministic Python | Normalize units and compare `container_count` and `gross_weight_kg`; Jev performs no arithmetic. |
| Schema validation, thresholds, state mapping, persistence, and audit | Deterministic Python | Validate every provider response before any disposition.                                         |
| Consequential approval, correction, or rejection                     | Named human reviewer | Review is an operational disposition, not model authority.                                       |

The target contains no OpenAI or Qwen decision-provider fallback. When Gemini
or Jev times out, returns a 429 after the configured second Gemini key, exhausts
quota, or returns an invalid response, the affected work fails closed into a
visible retry, review, or error state. It never silently changes provider.

The existing dual-key Gemini 429 retry may remain as a retry within the same
approved Gemini provider. It is not a success result and must be recorded in
the audit event. The initial free-tier AI route accepts synthetic data only.

## Canonical enums and output contract

These spellings are shared by API validation, PostgreSQL constraints, the web
client, dataset scorer, and generated submission. No other serialized value is
valid.

```text
Category:
  BL_COMPARISON | SI_REQUEST | INVOICE_QUERY | GENERAL | SPAM

Status:
  OK | MISMATCH | NEEDS_REVIEW

ReviewReason:
  wrong_doc_type | missing_attachment | unreadable | missing_value

ComparedField:
  shipper | consignee | notify_party | port_of_loading |
  port_of_discharge | container_count | gross_weight_kg

ReconciliationOutcome:
  CASE_PRESENT | DOCUMENT_MISSING | MISSING_CASE | UNMATCHED_CASE |
  DUPLICATE_OR_AMBIGUOUS | SOURCE_STALE
```

Every received email has exactly one `Category` and one persisted outcome. The
outer submission is keyed by `email_id`; each value has exactly five keys:

```json
{
  "email_001": {
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "review_reason": null,
    "has_defect": true,
    "defect_fields": ["consignee"]
  }
}
```

`review_reason` is `null` or one of the four listed values. `NEEDS_REVIEW` in
batch output is reserved for those structural reasons. An ambiguous semantic
field is `MISMATCH` in batch output and appears in `defect_fields`; it is never
serialized as a fifth review reason. `has_defect` is `true` exactly when
`defect_fields` is non-empty. Non-comparison emails receive an `OK` outcome
after successful category and structural processing, with no defect fields.

The expected-shipment source retains its source lifecycle string. Only
`DRAFT_BL_EXPECTED` and `BL_CHECK_REQUIRED` start the missing-case clock;
booking-specific cutoffs override prototype defaults.

## Interface schemas

The following typed pseudocode defines ownership boundaries. `T?` is nullable;
`T | undefined` means optional at receipt only. All timestamps are UTC ISO 8601
strings, identifiers are opaque strings, and all hashes are lowercase SHA-256
hex values.

```ts
type AttachmentReceipt = {
  attachment_id: string
  filename: string
  declared_mime: string | undefined
  detected_format: "txt" | "pdf" | "docx" | "xlsx" | "unknown"
  byte_size: number
  content_hash: string
  private_object_key: string
  ordinal: number
}

type ReceivedEmail = {
  email_id: string
  source_message_id: string | undefined
  received_at: string
  sender: string | undefined
  subject: string | undefined
  body_text: string
  message_hash: string
  attachments: AttachmentReceipt[]
}

type ExpectedShipment = {
  shipment_id: string
  booking_reference: string | undefined
  external_identifiers: Record<string, string>
  lifecycle: string
  required_documents: ("SI" | "DRAFT_BL")[]
  cutoff_at: string | undefined
  owner: string
  source_updated_at: string
  source_freshness: "CURRENT" | "STALE"
  source_hash: string
}

type Case = {
  case_id: string
  email_id: string
  category: Category
  status: Status
  review_reason: ReviewReason?
  attachment_ids: string[]
  shipment_id: string | undefined
  assigned_owner_id: string
  created_at: string
  updated_at: string
  rule_version: string
  disposition: "OPEN" | "AUTO_COMPLETED" | "IN_REVIEW" | "APPROVED" |
    "CORRECTED" | "REJECTED"
}
```

Each field extraction is a value plus confidence and provenance. Successful
provenance is one format-specific branch with its required matching anchor and
no parse error. A parse failure is a distinct branch with no anchor and a
non-empty diagnostic; it is not a fabricated source location.

```ts
type TxtLocation = {
  kind: 'txt'
  line: number // 1-indexed
  start_col: number // 0-indexed Unicode character offset
  end_col: number // exclusive
}

type DigitalPdfLocation = {
  kind: 'digital_pdf'
  page: number // 1-indexed
  bbox: [number, number, number, number]
  approximate: false
}

type ScannedPdfLocation = {
  kind: 'scanned_pdf'
  page: number // 1-indexed
  approximate: true
  region: 'header' | 'party' | 'routing' | 'cargo' | 'footer'
  bbox?: never // an approximate scan has no exact box
}

type DocxTableLocation = {
  kind: 'docx_table'
  table_index: number
  row_index: number
  col_index: number
  paragraph_index?: never
}

type DocxParagraphLocation = {
  kind: 'docx_paragraph'
  table_index?: never
  row_index?: never
  col_index?: never
  paragraph_index: number
}

type DocxLocation = DocxTableLocation | DocxParagraphLocation

type XlsxLocation = {
  kind: 'xlsx'
  sheet: string
  cell: string
}

type ProvenanceIdentity = {
  attachment_id: string
  file_name: string
}

type TxtProvenance = ProvenanceIdentity & {
  format: 'txt'
  location: TxtLocation
  parse_error?: never
}

type DigitalPdfProvenance = ProvenanceIdentity & {
  format: 'digital_pdf'
  location: DigitalPdfLocation
  parse_error?: never
}

type ScannedPdfProvenance = ProvenanceIdentity & {
  format: 'scanned_pdf'
  location: ScannedPdfLocation
  parse_error?: never
}

type DocxProvenance = ProvenanceIdentity & {
  format: 'docx'
  location: DocxLocation
  parse_error?: never
}

type XlsxProvenance = ProvenanceIdentity & {
  format: 'xlsx'
  location: XlsxLocation
  parse_error?: never
}

type NonEmptyString = string & { readonly __validated_non_empty: unique symbol }
// Runtime schema validation accepts this type only when length >= 1.

type UnreadableProvenance = ProvenanceIdentity & {
  format: 'txt' | 'pdf' | 'docx' | 'xlsx' | 'unknown'
  location?: never
  parse_error: NonEmptyString
}

type Provenance =
  TxtProvenance | DigitalPdfProvenance | ScannedPdfProvenance | DocxProvenance | XlsxProvenance | UnreadableProvenance

type ExtractedValue = {
  field: ComparedField
  raw_value: string | undefined
  normalized_value: string | number | undefined
  confidence: number | undefined
  provenance: Provenance
}

type FieldVerdict = {
  field: ComparedField
  si: ExtractedValue
  draft_bl: ExtractedValue
  deterministic_result: 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE' | undefined
  semantic_probability: number | undefined
  interactive_state: 'MATCH' | 'MISMATCH' | 'REVIEW' | undefined
  batch_result: 'MATCH' | 'MISMATCH' | undefined
  reason: string | undefined
}
```

`EvaluatorOutput` is the five-key submission value above. It intentionally has
no provenance or model metadata; those belong to the case record and audit
trail, not the exact evaluator shape.

```ts
type EvaluatorOutput = {
  category: Category
  status: Status
  review_reason: ReviewReason?
  has_defect: boolean
  defect_fields: ComparedField[]
}
```

```ts
type ReconciliationBase = {
  reconciliation_id: string
  reconciliation_run_id: string
  subject_key: string
  match_basis: string[]
  source_freshness: 'CURRENT' | 'STALE'
  reviewed_at: string | undefined
  created_at: string
}

type ShipmentBackedReconciliation = ReconciliationBase & {
  outcome: 'CASE_PRESENT' | 'DOCUMENT_MISSING' | 'SOURCE_STALE'
  shipment_id: string
  case_ids: string[]
}

type MissingCaseReconciliation = ReconciliationBase & {
  outcome: 'MISSING_CASE'
  shipment_id: string
  case_ids: []
}

type UnmatchedCaseReconciliation = ReconciliationBase & {
  outcome: 'UNMATCHED_CASE'
  shipment_id?: never
  case_ids: [string, ...string[]]
}

type AmbiguousReconciliation = ReconciliationBase & {
  outcome: 'DUPLICATE_OR_AMBIGUOUS'
  shipment_id?: never
  case_ids?: never
  candidate_shipment_ids: [string, ...string[]]
  candidate_case_ids: [string, ...string[]]
}

type ReconciliationResult =
  ShipmentBackedReconciliation | MissingCaseReconciliation | UnmatchedCaseReconciliation | AmbiguousReconciliation

type CaseReviewTarget = {
  target_type: 'CASE'
  case_id: string
}

type ReconciliationExceptionReviewTarget = {
  target_type: 'RECONCILIATION_EXCEPTION'
  reconciliation_id: string
}

type ReviewTarget = CaseReviewTarget | ReconciliationExceptionReviewTarget

type ReviewAssignment = {
  review_assignment_id: string
  target: ReviewTarget
  assigned_owner_id: string
  state: 'ASSIGNED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED'
  created_at: string
}

type CaseReviewAction = {
  review_action_id: string
  target: CaseReviewTarget
  actor_id: string
  action: 'APPROVE' | 'CORRECT' | 'REJECT'
  rationale: string
  corrected_fields: Partial<Record<ComparedField, string | number>> | undefined
  created_at: string
}

type ReconciliationExceptionReviewAction = {
  review_action_id: string
  target: ReconciliationExceptionReviewTarget
  actor_id: string
  action: 'ASSIGN' | 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE'
  rationale: string
  assigned_owner_id: string | undefined
  created_at: string
}

type ReviewAction = CaseReviewAction | ReconciliationExceptionReviewAction

type AuditEvent = {
  audit_event_id: string
  occurred_at: string
  actor_kind: 'SYSTEM' | 'REVIEWER'
  actor_id: string | undefined
  entity_type: 'EMAIL' | 'ATTACHMENT' | 'CASE' | 'SHIPMENT' | 'RECONCILIATION' | 'REVIEW_ASSIGNMENT' | 'REVIEW_ACTION'
  entity_id: string
  event_type: string
  source_hashes: string[]
  model_version: string | undefined
  prompt_version: string | undefined
  rule_version: string
  request_id: string
  payload_hash: string
}
```

## Format routing and provenance

`apps/api/app/formats.py` performs deterministic preflight before a document
may be classified, parsed, or sent to Gemini:

1. Hash bytes, record size and detected format, and reject unsupported or
   corrupt containers.
2. Parse TXT, XLSX, and DOCX locally. Parse a digital PDF locally with its text
   layer and bounding boxes when available.
3. Route a scanned PDF, or a document whose local parse is materially
   ambiguous, to Gemini 3.5 Flash extraction.
4. Validate the candidate against the extraction schema; then normalize values
   in deterministic code.
5. On a corrupt or unreadable file, persist `NEEDS_REVIEW` with `unreadable`;
   return no extracted field and no automatic comparison.

| Format      | Target extraction route          | Provenance promise                                              |
| ----------- | -------------------------------- | --------------------------------------------------------------- |
| TXT         | Local UTF-8 parser               | Exact line and Unicode character columns.                       |
| XLSX        | Local workbook parser            | Exact sheet and A1 cell.                                        |
| DOCX        | Local document parser            | Structural table cell or paragraph.                             |
| Digital PDF | Local text-layer parser          | Exact page and PDF-coordinate bounding box.                     |
| Scanned PDF | Gemini 3.5 Flash after preflight | Approximate page and region only; the UI labels it approximate. |
| Corrupt PDF | Deterministic parser failure     | No anchor, `unreadable`, and no automatic result.               |

The source-inspection UI selects a renderer by the provenance union. It must
use Unicode character offsets for Chinese labels and never byte offsets. The
format capabilities are based on the
[provenance spike](/docs/research/ideation/provenance-spike.md).

Runtime schema validation enforces the provenance discriminator. A successful
extraction cannot omit its format-matched location; a `scanned_pdf` cannot
contain an exact bounding box; and a parse-failure branch cannot contain any
location. The UI renders only the branch it receives.

## End-to-end flow and state machine

The API owns the state transitions below; web routes only request an allowed
transition and render the resulting immutable records.

```text
CASE: RECEIVED
  -> RECEIPT_RECORDED
  -> CATEGORY_DECIDED
  -> PREFLIGHTED
  -> PARSED_OR_EXTRACTED
  -> NORMALIZED
  -> VALIDATED
  -> COMPARED
  -> CASE_PERSISTED
  -> RECONCILED
  -> AUTO_COMPLETED | IN_REVIEW
  -> APPROVED | CORRECTED | REJECTED

PREFLIGHTED, PARSED_OR_EXTRACTED, VALIDATED, or COMPARED
  -> IN_REVIEW (structural failure or interactive semantic ambiguity; assigned owner required)

RECONCILIATION_EXCEPTION: PERSISTED
  -> ASSIGNED
  -> ACKNOWLEDGED | ESCALATED | RESOLVED
```

1. Receipt records the immutable email and each attachment hash. Duplicate
   receipt returns the existing result rather than creating a second case.
2. Jev categorizes the received email. Every category is persisted. A category
   other than `BL_COMPARISON` ends in a non-comparison `OK` outcome after
   successful structural processing.
3. A `BL_COMPARISON` case must contain one validated SI and one validated draft
   BL. Missing, wrong-type, unreadable, or required-missing-value failures end
   in the matching structural `NEEDS_REVIEW` reason before seven-field output.
4. Each successful document pair is extracted, normalized, schema-validated,
   and compared over every `ComparedField`. The SI is the reference value.
5. The interactive evaluator may create an `IN_REVIEW` semantic ambiguity with
   evidence, an assigned case owner, and probability. Every ordinary case has
   an `assigned_owner_id`; it must remain assigned while unresolved. The batch
   mapper conservatively maps the same ambiguity to `MISMATCH` and lists its
   field.
6. Expected shipments are imported independently. Reconciliation maps a
   shipment to `CASE_PRESENT`, `DOCUMENT_MISSING`, `MISSING_CASE`,
   `UNMATCHED_CASE`, `DUPLICATE_OR_AMBIGUOUS`, or `SOURCE_STALE`.
7. `SOURCE_STALE` and `DUPLICATE_OR_AMBIGUOUS` cannot clear a shipment. The
   target demo exposes `SHP-5RFR-37631` at `DRAFT_BL_EXPECTED` as `MISSING_CASE`.
8. A named reviewer may approve, correct, or reject an assigned `IN_REVIEW`
   case. A reconciliation exception, including `SHP-5RFR-37631`, instead targets its
   reconciliation result and can be assigned, acknowledged, escalated, or
   resolved without creating an email case. Each assignment and action appends
   an audit event and never overwrites an original source, extraction, prior
   disposition, or prior exception action.

### Structural reason precedence

The batch serializer selects exactly one structural `review_reason` using this
ordered rule. It evaluates every condition and persists all non-selected
diagnostics, attachment facts, and provider/parser details in the case and
append-only audit trail.

1. `unreadable`: a candidate supplied for a required SI or draft-BL role is a
   corrupt recognized container or cannot be read by its required parser.
2. `wrong_doc_type`: a supplied candidate has an unsupported or unknown
   container, or a readable recognized container whose content is not an SI or
   draft BL for its required role. No comparison occurs.
3. `missing_attachment`: no candidate was supplied for a required SI or
   draft-BL role after evaluating the supplied attachments.
4. `missing_value`: both required documents are valid and readable, but a
   required compared value is absent, blank, or a placeholder after extraction
   and normalization.

This precedence makes a corrupt candidate `unreadable` even if another defect
is present, treats unrelated or unsupported supplied documents as
`wrong_doc_type`, and reserves `missing_attachment` for actual absence. It
prevents duplicate ingestion or retry from changing the exact five-key result.

### Atomic evaluator-submission runs

`submission_runs` are separate from case processing. A run records its input
manifest hash, expected 520 email IDs, rule version, and terminal publication
state. Receipt and audit events are committed even when a category provider
call fails, but no category is invented and no evaluator row is emitted for
that email until a valid category is obtained.

The run resumes idempotently from persisted receipt, provider, and case state.
It publishes one immutable evaluator artifact only after all 520 received IDs
have exactly one validated five-key record. Any missing category, provider
failure, schema failure, duplicate conflict, or incomplete count keeps the run
unpublished and exposes a resumable error state. Partial evaluator artifacts
are never published.

## Jev decision rules

Jev accepts structured state and typed questions, returning typed answers and
probability distributions rather than generated prose. The target uses its
`Choice` primitive for category and document-type questions and a yes/no
probability judgment for semantic field equivalence. These are narrow,
independent questions; deterministic code combines them with validation and
workflow state.

| Target judgment  | Request shape                                        | Deterministic guard                                             |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Email category   | One batched `Choice` with the five `Category` values | Persist the chosen category and probability distribution.       |
| Document type    | One `Choice` per attachment: SI, draft BL, or other  | Other or invalid document evidence produces `wrong_doc_type`.   |
| Text equivalence | One batched yes/no probability per textual field     | Apply bands only after normalization and required-value checks. |
| Numeric fields   | No arithmetic question                               | Compare normalized count and kilograms deterministically.       |

Batch all independent questions sharing the same state in one Jev request.
Every request must pin `jev-1.13.0`, log the returned model version, request
identifier, prompt version, rule version, answer probabilities, and timestamp.
Aliases such as `jev-latest` are not a target configuration because they can
move after calibration.

The following bands are locked for the prototype:

| Semantic probability `P(match)` | Interactive mapping                    | Batch mapping                                 |
| ------------------------------- | -------------------------------------- | --------------------------------------------- |
| `P >= 0.85`                     | `MATCH`                                | Match; no defect field.                       |
| `0.30 < P < 0.85`               | `REVIEW` with evidence and probability | `MISMATCH`; add the field to `defect_fields`. |
| `P <= 0.30`                     | `MISMATCH`                             | `MISMATCH`; add the field to `defect_fields`. |

These bands are locked for the preliminary prototype and require measured
recalibration before production. That production gate is a mandatory release
condition, not an unresolved product decision.

Jev does not calculate differences, weights, unit conversions, or container
counts. Its published jaggedness guidance is why numeric checks remain in
deterministic code. Retained Jev facts are sourced from the TypeSafe
[introduction][ts-intro], [primitives][ts-primitives], [Choice][ts-choice],
[Noul][ts-noul], [models][ts-models], and
[Jev 1.13 jaggedness][ts-jaggedness] references.

## Persistence and idempotency

PostgreSQL is the durable system of record and cache index. GCS stores private
source objects; PostgreSQL stores their keys and hashes, not public object URLs.
The API writes the following records through `apps/api/app/persistence.py` and
migrations under `apps/api/`.

| Record                       | Required contents                                                                                         | Idempotency and versioning                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `source_objects`             | Attachment metadata, object key, content hash, parser status                                              | Unique `content_hash`; identical bytes reuse storage and retain separate receipt links.                             |
| `email_receipts`             | Email metadata, message hash, attachments, source receipt time                                            | Unique source message ID when supplied, otherwise message hash plus received time and sender.                       |
| `extraction_cache`           | Source hash, extractor route, schema-valid result, provenance                                             | Unique `(content_hash, extractor_version, extraction_schema_version)`; invalid responses are not cached as success. |
| `cases` and `field_verdicts` | Category, structural status, assigned owner, seven field records, output mapping                          | Unique `email_id`; include model, prompt, normalization, and rule versions.                                         |
| `expected_shipments`         | Imported source row, identifiers, lifecycle, documents, owner, freshness                                  | Unique `(source_system, shipment_id, source_hash)`; retain source update time.                                      |
| `reconciliation_results`     | Outcome-discriminated shipment/case references, candidate sets, match basis, freshness, run time          | Unique `(reconciliation_run_id, subject_key)`; a rerun is a new auditable result.                                   |
| `review_assignments`         | Review target, assigned owner, assignment state, time                                                     | Append-only; current ownership is derived from the latest assignment.                                               |
| `review_actions`             | Typed case or reconciliation-exception action, reviewer, rationale, correction or assignment values, time | Append-only; no update or delete path.                                                                              |
| `audit_events`               | Event metadata, hashes, versions, request ID, payload hash                                                | Append-only; each mutation emits exactly one event in the transaction.                                              |
| `submission_runs`            | Input manifest hash, 520 expected IDs, validation count, rule version, publication state, artifact hash   | Unique input manifest and rule version; publish only after all records validate atomically.                         |

An ingestion request carries an idempotency key. Repeating it with the same
key and source hash returns the original case result. Reusing a key with
different source bytes fails closed with a conflict error and an audit event.

`subject_key` is deterministic and never requires a shipment ID: it is
`shipment:<shipment_id>` for shipment-backed outcomes;
`case:<case_id>` or a hash of a canonically sorted case-ID set for
`UNMATCHED_CASE`; and a hash of the canonical JSON object containing sorted
candidate shipment and case IDs for `DUPLICATE_OR_AMBIGUOUS`. Runtime schema
validation rejects a `MISSING_CASE` with any case ID, an `UNMATCHED_CASE` with
a shipment ID or no case ID, and an ambiguous result that omits either
candidate set.

## Failure contract

Unsafe conditions stop automatic disposition. The API presents the retained
source metadata, diagnostic, retry state, and assigned owner for a case or
reconciliation-exception target.

| Condition                                                                 | Deterministic behavior                                                                       | Result                                                                                                                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missing SI or draft BL for a `BL_COMPARISON` case                         | Detect required-document absence before extraction.                                          | `NEEDS_REVIEW`, `missing_attachment`; no seven-field result.                                                                                           |
| Wrong document                                                            | Document-type validation identifies a non-SI or non-draft-BL attachment.                     | `NEEDS_REVIEW`, `wrong_doc_type`; no comparison.                                                                                                       |
| Unsupported or unknown container, or readable non-SI/non-draft-BL content | Treat the supplied candidate as a wrong document, retaining detected format and diagnostics. | `NEEDS_REVIEW`, `wrong_doc_type`; no comparison.                                                                                                       |
| Corrupt or unreadable document                                            | Catch preflight or parser failure and retain diagnostic without an anchor.                   | `NEEDS_REVIEW`, `unreadable`; no comparison.                                                                                                           |
| Required source value absent, blank, or placeholder                       | Validate all seven values after extraction and normalization.                                | `NEEDS_REVIEW`, `missing_value`; no comparison.                                                                                                        |
| Stale shipment source                                                     | Compare source freshness to import policy before clearance.                                  | `SOURCE_STALE`, assigned reconciliation-exception review; shipment remains uncleared.                                                                  |
| Unmatched received case                                                   | Preserve one or more case IDs without inventing a shipment.                                  | `UNMATCHED_CASE`, assigned reconciliation-exception review; no shipment is cleared or fabricated.                                                      |
| Ambiguous or duplicate shipment link                                      | Preserve candidate shipment and case ID sets with match basis.                               | `DUPLICATE_OR_AMBIGUOUS`, assigned reconciliation-exception review; no clearance.                                                                      |
| Gemini 429, timeout, quota exhaustion, or invalid schema                  | Use the configured second Gemini key only for 429; then record provider failure.             | Visible retry/review/error; never use another model provider. A blocked evaluator run remains unpublished.                                             |
| Jev timeout, quota exhaustion, or invalid typed answer                    | Record the provider failure and do not infer an answer.                                      | Visible retry/review/error; never use another model provider. A category failure never fabricates a `Category`; the evaluator run remains unpublished. |
| Evaluator schema validation failure                                       | Reject serialization before artifact publication.                                            | Processing error; no malformed submission artifact.                                                                                                    |
| Duplicate ingestion                                                       | Resolve idempotency key and source hashes before case creation.                              | Return original result or conflict; no duplicate case.                                                                                                 |

Provider error paths are fail closed even when a prepared synthetic demo result
is available. The `/judge` UI may show a prepared result only in a panel marked
`PREPARED FALLBACK` after disclosing that the live provider failed; it must not
present it as the judge's live result. It keeps the failed unseen upload and
its retry affordance visible, and a successful claim for that unseen input
requires a fresh successful live run. The fallback retains its own prepared
input, result, and evidence as one visibly distinct example.

## Deployment, security, and observability

The target preliminary deployment is one Cloud Run service that serves FastAPI
API routes and the compiled React build. It connects to PostgreSQL for durable
state and cache indexes, GCS for private source objects, Gemini 3.5 Flash for
approved extraction, and Jev 1.13.0 for approved typed decisions. Secrets stay
server-side in the deployment secret store; browser code receives neither API
keys nor private-object credentials.

The service must:

- use least-privilege service identities for PostgreSQL and the required GCS
  object prefix;
- keep source objects private and deliver evidence through authorized API
  endpoints, never public bucket URLs;
- limit the current free-tier AI route to synthetic documents and synthetic
  expected-shipment data;
- log request IDs, case IDs, source hashes, route choice, model and rule
  versions, latency, retries, and terminal states without logging secrets;
- expose health, readiness, structured error, and version information; and
- preserve audit records, retention policy, access-control policy, transfer
  assessment, deletion procedure, and incident procedure as production gates
  before real shipping documents are enabled.

Cloud Run location is a deployment choice only. It does not prove inference
residency, provider processing location, or production privacy compliance.
Real-document processing remains disabled until retention, access, transfer,
and provider controls are approved.

Observability includes: receipt count and unaccounted count; category and
structural-failure counts; extraction and Jev latency percentiles; provider
429, timeout, and schema-failure counts; cache hit rate; reconciliation outcome
counts and stale-source age; review queue age, owner, and override reasons; and
append-only audit-write failures. Alerts route failed ingestion, uncleared stale
shipments, provider exhaustion, and audit-write failure to the named operations
owner.

The existing Flash Lite study is historical architecture-shape evidence only.
It does not establish Gemini 3.5 Flash latency, quota, or an SLO. The current
`apps/api/scripts/benchmark_latency.py` hard-codes OpenRouter's
Flash-Lite model and `jev-latest`, so it cannot supply Flash evidence.

Before any live latency claim, replace that script with the official locked
Gemini 3.5 Flash path and pinned `jev-1.13.0` path. Declare every direct
benchmark and parser dependency in `apps/api/pyproject.toml`, including
PyMuPDF, `openpyxl`, `python-docx`, and the HTTP client used by the pinned Jev
call. The rewritten script records its exact scanned-pair paths, source hashes,
provider endpoints, model IDs, request configuration, timeout, trial count,
warm-up policy, measurement method, and percentile calculation. It writes raw
per-trial, versioned JSON results to `apps/api/scripts/benchmark-results/`.
Only then may the p95-below-10-seconds gate be evaluated for that recorded path.

## Preliminary build sequence and finals extensions

Build the preliminary target in this order. Each step names the implementation
destination and its observable output.

1. Update `apps/api/app/config.py` and deployment configuration to default to
   Gemini 3.5 Flash; add pinned Jev configuration. Remove or explicitly
   quarantine stale OpenAI configuration from `apps/api/app/config.py`,
   `apps/api/.env.example`, `apps/api/app/main.py`, `apps/api/tests/`,
   `.github/workflows/deploy.yml`, `docs/references/deployment.md`, and managed-secret
   mappings. The Cloud Run runtime service must not receive an alternative
   provider secret. Add tests in `apps/api/tests/` proving no alternative
   decision provider is configured or invoked.
2. Replace `apps/api/scripts/benchmark_latency.py` before measuring latency:
   remove OpenRouter and Flash Lite, use official Gemini 3.5 Flash and pinned
   `jev-1.13.0`, declare all direct benchmark/parser dependencies in
   `apps/api/pyproject.toml`, and write exact-input, methodology, and raw
   versioned JSON results under `apps/api/scripts/benchmark-results/`. Evaluate
   the scanned-pair p95-below-10-seconds gate only from that artifact.
3. Create contracts, enum validation, and output serializer in
   `apps/api/app/contracts.py`; add exact-shape tests in `apps/api/tests/`.
4. Create PostgreSQL models, migrations, idempotency handling, source hashes,
   extraction cache, `submission_runs`, and append-only audit writes in
   `apps/api/app/`.
5. Create receipt, attachment preflight, and local format parsing in
   `apps/api/app/`; persist format-specific provenance and structural failures.
6. Create Gemini 3.5 Flash extraction and schema validation in
   `apps/api/app/extraction.py`; route scans and ambiguous documents only.
7. Create the Jev client and batched decision requests in `apps/api/app/`; pin
   and audit `jev-1.13.0`, then implement deterministic normalization, numeric
   comparison, and batch/interactive state mapping.
8. Create expected-shipment CSV import, outcome-discriminated reconciliation,
   exception assignments/actions, and independent reconciliation in
   `apps/api/app/`; include the synthetic `SHP-5RFR-37631` `MISSING_CASE` exhibit in
   `data/sdoc-hackathon-bundle/` fixtures.
9. Create API routes and the React inbox, evidence, reconciliation, review,
   artifact, and public `/judge` screens in `apps/api/app/` and
   `apps/web/src/`.
10. Add the visible prepared-fallback disclosure and public-deployment smoke
    checks. Publish a live latency claim only after the rewritten benchmark's
    retained artifact satisfies the p95 gate.

Finals extend, rather than replace, this path: authenticated production
connector interfaces, durable recoverable jobs, operational-scale independent
reconciliation, monitoring and alerts, calibrated production thresholds,
improved scanned-document provenance, and approved privacy and security
controls for real data.

## Verification matrix

| Product requirement                                    | Verification owner and evidence                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01, all 520 received IDs and categories             | `apps/api/tests/`: bundle ingestion fixture, category enum validation, and 520-ID completeness check.                                                                                                                                                            |
| FR-02, exact five-key evaluator objects                | `apps/api/tests/`: JSON schema, atomic 520-record submission-run, resume, and rejection tests for extra, missing, partial, and invalid keys.                                                                                                                     |
| FR-03 and FR-05, safe pair admission and batch mapping | `apps/api/tests/`: missing, wrong-type, unreadable, missing-value, and semantic-ambiguity cases; assert ambiguity is batch `MISMATCH`.                                                                                                                           |
| FR-04, all seven fields with SI reference              | `apps/api/tests/`: parameterized verdict tests for every `ComparedField`, including deterministic containers and kilograms.                                                                                                                                      |
| FR-06 and FR-12, review evidence and action history    | `apps/api/tests/` and web tests under `apps/web/src/`: probability band; assigned owner retained on unresolved ordinary case; case approve/correct/reject; immutable source; and append-only audit checks.                                                       |
| FR-07 and FR-08, expected ledger and outcomes          | `apps/api/tests/`: synthetic CSV import; all six `ReconciliationOutcome` values; orphan `UNMATCHED_CASE` persistence without shipment ID; and an ambiguous case retaining multiple candidate shipment IDs and candidate case IDs, with idempotent rerun checks.  |
| FR-09, judge-visible reconciliation                    | API fixture and web test under `apps/web/src/`: matched case, document missing, and `SHP-5RFR-37631` as `MISSING_CASE`; assign, acknowledge, escalate, and resolve `SHP-5RFR-37631` with append-only audit while its email case stays absent.                    |
| FR-10 and FR-11, provenance and corrupt files          | `apps/api/tests/` and web tests: TXT line/column, digital-PDF box, XLSX sheet/cell, DOCX structure, scan approximate label, corrupt-PDF refusal, and Chinese-label Unicode offsets.                                                                              |
| FR-13, public judge route and fallback                 | API and web smoke tests under `apps/api/tests/` and `apps/web/src/`: fresh synthetic pair, seven verdict rows, evidence, no-account `/judge`, clearly labelled distinct-example fallback, visible failed unseen upload with retry, and no private data exposure. |
| FR-14, reproducible preliminary demo                   | Root setup documentation added during build; smoke test downloads synthetic CSV and submission artifact and follows evidence links.                                                                                                                              |
| FR-15, live-path latency                               | Rewrite `apps/api/scripts/benchmark_latency.py` to official Gemini 3.5 Flash and pinned `jev-1.13.0`; declare dependencies, retain exact-input and raw versioned runs, and assert p95 is below 10 seconds before claiming the target.                            |
| FR-16, decision ownership                              | `apps/api/tests/`: assert Gemini 3.5 Flash extraction routing, pinned `jev-1.13.0`, deterministic numeric/state decisions, and fail-closed rejection of any unapproved provider.                                                                                 |
| Provider, schema, idempotency, and audit failures      | `apps/api/tests/`: 429 retry then failure, timeout, quota, invalid provider shape, missing category submission block, duplicate idempotency key, conflict hash, and audit-write rollback.                                                                        |
| No alternative decision provider                       | `apps/api/tests/`: assert no OpenAI or Qwen setting, environment mapping, deployment secret, client invocation, or health-reporting key is configured for the target runtime.                                                                                    |
| Public deployment                                      | Deployment smoke check against the Cloud Run URL: health, readiness, static React route, `/judge`, synthetic-only upload policy, and private-object denial.                                                                                                      |

## Decision register

| Decision                | Locked contract                                                                                                                                           | Evidence or enforcement point                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Product identity        | LadingLens is one two-gate shipping inbox-control loop with human sign-off.                                                                               | [Product](/docs/PRODUCT.md) and [positioning](/docs/research/ideation/positioning.md). |
| Models                  | Gemini 3.5 Flash extracts; Jev `jev-1.13.0` makes typed semantic decisions.                                                                               | Config, provider clients, audit metadata, and tests.                                   |
| Provider failure        | No OpenAI or Qwen fallback; failures are visible and fail closed.                                                                                         | Provider error tests and `/judge` fallback disclosure.                                 |
| Legacy provider surface | OpenAI settings, secrets, health output, deployment mappings, and documentation are removed or quarantined outside the runtime before target conformance. | Configuration/deployment audit and no-alternative-provider tests.                      |
| Numeric decisions       | Deterministic normalization and comparison own numbers.                                                                                                   | Seven-field comparator tests.                                                          |
| Prototype probabilities | `>= 0.85` match, `(0.30, 0.85)` interactive review and batch mismatch, `<= 0.30` mismatch.                                                                | Rule version and mapping tests; recalibrate before production.                         |
| Batch review            | Only four structural reasons produce batch `NEEDS_REVIEW`.                                                                                                | Exact evaluator schema tests.                                                          |
| Storage                 | PostgreSQL holds durable state/cache indexes; GCS holds private source objects.                                                                           | Migrations, service identity, and object-access tests.                                 |
| Preliminary data        | The current free-tier AI route processes synthetic data only.                                                                                             | Upload policy and deployment smoke test.                                               |
| Deployment              | One Cloud Run service serves FastAPI and React.                                                                                                           | Container and public `/judge` smoke test.                                              |
| Latency claim           | Flash Lite is historical only; live claim requires the rewritten official Flash and pinned Jev benchmark plus p95 below 10 seconds on the scanned pair.   | Versioned benchmark artifact with exact inputs and raw trials.                         |
| Production release      | Recalibrated thresholds, approved retention/access/transfer controls, and real-data provider approval are mandatory gates.                                | Release checklist and audit evidence.                                                  |

## References

- [Product requirements](/docs/PRD.md)
- [Product guide](/docs/PRODUCT.md)
- [LadingLens positioning](/docs/research/ideation/positioning.md)
- [Five-minute demo spine](/docs/research/ideation/demo-spine.md)
- [Human escalation policy](/docs/research/ideation/escalation-policy.md)
- [Field provenance spike](/docs/research/ideation/provenance-spike.md)
- [Latency research](/docs/research/ideation/latency.md)

[ts-intro]: https://docs.typesafe.ai/introduction.md
[ts-primitives]: https://docs.typesafe.ai/primitives.md
[ts-choice]: https://docs.typesafe.ai/primitives/choice.md
[ts-noul]: https://docs.typesafe.ai/primitives/noul.md
[ts-models]: https://docs.typesafe.ai/models.md
[ts-jaggedness]: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md
