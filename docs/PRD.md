# Product requirements

This document defines the implementation-facing requirements for LadingLens in
the Averis shipping-document challenge. The build must account for received
mail, reconcile it with expected shipments, and present evidence-backed
SI-to-draft-BL decisions for human sign-off.

Contents:

1.  [Problem and users](#problem-and-users)
1.  [Goals and boundaries](#goals-and-boundaries)
1.  [Product control loop](#product-control-loop)
1.  [Decision ownership](#decision-ownership)
1.  [Evaluator contract](#evaluator-contract)
1.  [Human review and provenance](#human-review-and-provenance)
1.  [Scope by round](#scope-by-round)
1.  [Functional requirements](#functional-requirements)
1.  [Risks and safe claims](#risks-and-safe-claims)
1.  [Research sources](#research-sources)

## Problem and users

Shipping operations may receive up to 2,000 mixed inbox emails per day. For a
document-checking request, an analyst manually compares the Shipping
Instruction (SI) with a draft Bill of Lading (BL). The same values can use
inconsistent labels, making direct text comparison unreliable. Inbox
classification can account for received mail, but cannot detect an email that
never arrived; an independent expected-shipment source is required for that.

Primary users are:

- A shipping operations analyst or reviewer, who decides whether source
  evidence supports a proposed comparison outcome and approves, corrects, or
  rejects a case.
- An operations lead, who decides which missing, stale, duplicate, or
  unresolved shipment exceptions need intervention and assigns ownership.
- A judge or evaluator, who will decide whether the deployed preliminary public
  demonstration meets the exact submission contract, visibly accounts for
  absence, and safely handles a fresh synthetic comparison without private
  access.

## Goals and boundaries

### Goals and measurable success

- The generated output must represent all 520 received email IDs.
- The build must emit one exact-schema object per email ID with only the
  required five keys.
- The deployed preliminary build must provide a public, no-account judge path
  with a fresh synthetic SI/BL upload and labelled prepared fallback only when
  the live provider fails.
- The build must reconcile an independent expected-shipment ledger with the
  inbox case ledger and visibly demonstrate matched, missing-document, and
  missing-case states.
- The build must compare valid pairs across all seven required fields and
  expose source evidence for each compared field.
- The build must refuse unsafe comparisons without fabricating a result.
- The build must benchmark the complete Gemini 3.5 Flash live path afresh with
  a target below 10 seconds. Historical Flash Lite measurements are not Flash
  evidence and must not be presented as such.

### Non-goals

LadingLens does not amend a BL, file with a carrier, authorize shipment
release, or provide a legal opinion. It does not promise 100% accuracy or
fully autonomous operation. The preliminary free-tier route must not process
real shipping data in production use; its demonstration data is synthetic.

## Product control loop

LadingLens is one product with two connected controls.

1.  **Gate 1: inbox accounting.** The build must assign every received email
    one category:
    `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL`, or `SPAM`, and
    record an outcome for it.
2.  **Gate 2: shipment reconciliation.** The build must independently
    reconcile the expected-shipment ledger with the case ledger and return
    `CASE_PRESENT`,
    `DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`,
    `DUPLICATE_OR_AMBIGUOUS`, or `SOURCE_STALE`. Stale data and uncertain
    matches enter review; neither clears a shipment.
3.  **Evidence comparison.** The build must allow only a valid
    `BL_COMPARISON` pair to proceed to seven-field comparison, using the SI as
    the reference:
    `shipper`, `consignee`, `notify_party`, `port_of_loading`,
    `port_of_discharge`, `container_count`, and `gross_weight_kg`.

SI/BL evidence comparison is not a numbered gate and does not wait for Gate 2.

The expected-shipment source must record available identifiers, lifecycle state,
required documents, actual cutoff, owner, and source freshness. The missing-
case clock must start only at `DRAFT_BL_EXPECTED` or `BL_CHECK_REQUIRED`;
booking-specific cutoffs override prototype defaults.

## Decision ownership

The build must use Gemini 3.5 Flash to extract content from scanned or locally
ambiguous documents. It must use version-pinned Jev `jev-1.13.0` for typed
email-category, semantic document-type, and textual field-equivalence
decisions. Deterministic code must own file preflight, local parsing,
normalization, numeric comparison, schemas, thresholds, state transitions,
persistence, and audit records; a named human must own consequential review
dispositions.

Provider failure must be visible and fail closed. LadingLens must not silently
switch to an unapproved extraction or decision provider.

## Evaluator contract

The generated submission must contain one object for every email ID. Each
object must contain exactly `category`, `status`, `review_reason`,
`has_defect`, and `defect_fields`. `status` must be exactly `OK`, `MISMATCH`,
or `NEEDS_REVIEW`. `review_reason` must be `null` or exactly one of
`wrong_doc_type`,
`missing_attachment`, `unreadable`, or `missing_value`.

`wrong_doc_type` means a required attachment is not an SI or draft BL.
`missing_attachment` means a required SI or draft BL is absent. `unreadable`
means a required attachment cannot be parsed or read. `missing_value` means a
required comparison field is absent, blank, or a placeholder. These four
structural reasons are the only batch uses of `NEEDS_REVIEW`.

In the interactive build, semantic ambiguity below the match threshold may go
to human review with its evidence and diagnostic or probability. In batch
evaluation, the build must map an ambiguous field comparison below the match
threshold to `MISMATCH` with that field in `defect_fields`; it must not become
`NEEDS_REVIEW`.

## Human review and provenance

Every reviewable case must show the immutable original source, the reason for
review, source evidence, a diagnostic or probability when applicable, the
assigned owner, and actions to approve, correct, or reject. Every
reconciliation exception must instead have a reconciliation-result target,
assigned owner, and append-only actions to assign, acknowledge, escalate, or
resolve; it never needs a fabricated email case. Audit history must record
assignments and dispositions and preserve the original record. The deploying
organization remains accountable for operational decisions; human review does
not transfer responsibility to a model or reviewer alone.

Evidence anchors are format-specific:

- TXT: exact line and column spans.
- Digital PDF: exact text bounding box.
- XLSX: sheet and cell.
- DOCX: structural table cell or paragraph.
- Scanned PDF: approximate page and region only; the interface must say that
  the visual anchor is approximate rather than pixel-perfect.
- Corrupt PDF: no source anchor; refuse automatic verification with
  `review_reason: unreadable`.

Each extracted value needs a value, confidence, and provenance object. The
provenance identifies the file, format, location when readable, and parse
error when unavailable.

## Scope by round

### Preliminary scope

The preliminary build must classify all 520 emails; emit exact submission JSON;
import a labelled synthetic expected-shipment CSV; reconcile and exhibit
matched, missing-document, and missing-case states; compare all seven fields;
show one mismatch evidence click and one refusal; expose a public no-account
judge path; and provide setup instructions. The peak is synthetic shipment
`SYN-042`, reconciled as `MISSING_CASE` without an email case.

The deployed preliminary `/judge` path must let a judge submit a fresh
synthetic SI/BL pair not in prepared examples, process it live, and show the
seven fields and source evidence. If the live provider fails, it may show only
a visibly labelled prepared fallback and must disclose the change before
presenting the result. The failed unseen upload remains visible and retryable;
only a fresh successful live run may prove that unseen input.

### Finals scope

Finals add a production connector interface, durable and recoverable jobs,
comprehensive review persistence, monitoring, calibrated thresholds, improved
scanned-document provenance, production privacy and security controls, and
independent reconciliation at operational scale.

## Functional requirements

| ID    | Requirement and acceptance criteria                                                                                                                                                                                                                                                                                                  | Implementation destination                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| FR-01 | Ingest every bundled email and assign exactly one allowed Gate 1 category. Acceptance: output represents all 520 email IDs and every received email has a recorded outcome.                                                                                                                                                          | `apps/api/app/`, `apps/api/tests/`, `data/sdoc-hackathon-bundle/`                                       |
| FR-02 | Serialize one evaluator record per email ID. Acceptance: each object has exactly `category`, `status`, `review_reason`, `has_defect`, and `defect_fields`, with permitted values only.                                                                                                                                               | `apps/api/app/`, `apps/api/tests/`                                                                      |
| FR-03 | Admit only valid `BL_COMPARISON` SI/draft-BL pairs to comparison. Acceptance: invalid pairs return the applicable structural review reason and no fabricated seven-field result.                                                                                                                                                     | `apps/api/app/`, `apps/api/tests/`                                                                      |
| FR-04 | Compare the seven exact field keys with the SI as reference. Acceptance: each valid pair records an `OK` or `MISMATCH` decision and evidence for every compared field.                                                                                                                                                               | `apps/api/app/`, `apps/api/tests/`                                                                      |
| FR-05 | Preserve batch semantics. Acceptance: ambiguous below-threshold field comparisons serialize as `MISMATCH`; batch `NEEDS_REVIEW` appears only for the four structural reasons.                                                                                                                                                        | `apps/api/app/`, `apps/api/tests/`, `docs/TRD.md`                                                       |
| FR-06 | Support interactive semantic escalation. Acceptance: an ambiguous field can enter a human queue with source evidence and a diagnostic or probability.                                                                                                                                                                                | `apps/api/app/`, `apps/web/src/`, `apps/api/tests/`                                                     |
| FR-07 | Import a labelled synthetic expected-shipment CSV. Acceptance: imported rows retain identifiers, lifecycle, required documents, cutoff, owner, and source freshness.                                                                                                                                                                 | `apps/api/app/`, `apps/api/tests/`, `data/sdoc-hackathon-bundle/`                                       |
| FR-08 | Reconcile expected shipments and cases independently. Acceptance: the interface and API can return all six reconciliation outcomes and route stale or uncertain matches to review.                                                                                                                                                   | `apps/api/app/`, `apps/web/src/`, `apps/api/tests/`                                                     |
| FR-09 | Exhibit reconciliation states. Acceptance: the preliminary build must visibly show a matched case, a missing document, and `SYN-042` as `MISSING_CASE`.                                                                                                                                                                              | `apps/api/app/`, `apps/web/src/`, `data/sdoc-hackathon-bundle/`                                         |
| FR-10 | Provide source-specific evidence. Acceptance: TXT shows line/columns; digital PDF a box; XLSX sheet/cell; DOCX structural cell/paragraph; scans an explicitly approximate page/region.                                                                                                                                               | `apps/api/app/`, `apps/web/src/`, `apps/api/tests/`                                                     |
| FR-11 | Refuse corrupt PDFs. Acceptance: a corrupt PDF has no invented anchor or comparison result and returns `NEEDS_REVIEW` with `unreadable`.                                                                                                                                                                                             | `apps/api/app/`, `apps/api/tests/`, `data/sdoc-hackathon-bundle/`                                       |
| FR-12 | Provide review ownership and auditability. Acceptance: unresolved ordinary cases retain an assigned owner with immutable source, reason, evidence, history, and approve/correct/reject actions; reconciliation exceptions can be assigned, acknowledged, escalated, or resolved with append-only audit and no fabricated email case. | `apps/api/app/`, `apps/web/src/`, `apps/api/tests/`                                                     |
| FR-13 | Publish the unauthenticated judge workflow. Acceptance: the deployed preliminary `/judge` path must accept a fresh synthetic SI/BL pair, display live processing or a labelled fallback, and expose evidence and demo artifacts.                                                                                                     | `apps/api/app/`, `apps/web/src/`, `apps/api/tests/`, `README.md` (to be created during the build phase) |
| FR-14 | Document reproducible demo setup. Acceptance: root instructions to be added during the build phase must identify synthetic inputs, the public judge path, limitations, and how to run the preliminary workflow.                                                                                                                      | `README.md` (to be created during the build phase), `docs/TRD.md`                                       |
| FR-15 | Measure the locked live path. Acceptance: the build must publish a fresh Gemini 3.5 Flash end-to-end benchmark against the below-10-second target, distinct from historical Flash Lite data.                                                                                                                                         | `apps/api/tests/`, `docs/TRD.md`, `README.md` (to be created during the build phase)                    |
| FR-16 | Enforce decision ownership. Acceptance: runtime configuration uses Gemini 3.5 Flash for approved extraction and pinned Jev `jev-1.13.0` for typed semantic decisions; numeric and workflow decisions remain deterministic, and provider failure never silently changes providers.                                                    | `apps/api/app/`, `apps/api/tests/`, `docs/TRD.md`                                                       |

## Risks and safe claims

The expected ledger can identify an absent case only when it is independent,
current, and sufficiently identified. The supplied inbox bundle alone cannot
detect an email that never arrived. Synthetic demonstration data does not prove
production privacy compliance, and the free-tier route is not approved for
real shipping documents. A report supports review; it neither amends the BL
nor guarantees legal effect or shipment release.

Make only these safe claims: LadingLens accounts for received inbox mail,
reconciles available expected shipments with cases, compares valid SI/draft-BL
pairs with source evidence, and routes incomplete or uncertain decisions to a
named human. Do not claim 100% accuracy, that no email can be missed, that
every missed email costs MYR 5,200, that `gross_weight_kg` is always SOLAS
VGM, that human approval removes accountability, or that historical Flash Lite
latency proves Flash performance.

## Research sources

- [LadingLens positioning](/docs/research/ideation/positioning.md)
- [LadingLens demo spine](/docs/research/ideation/demo-spine.md)
- [Project brief](/docs/BRIEF.md)
- [Missed-case stakes and reconciliation gate](/docs/research/ideation/stakes.md)
- [Human escalation policy](/docs/research/ideation/escalation-policy.md)
- [Field provenance spike](/docs/research/ideation/provenance-spike.md)
- [Quality-assurance and claims defence](/docs/research/ideation/qa-defence.md)
- [Latency research](/docs/research/ideation/latency.md)
