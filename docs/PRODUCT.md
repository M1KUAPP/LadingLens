# Product

This guide defines the intended LadingLens product for an Averis shipping-
operations context. The build must give operators one evidence-backed control
loop for received mail and expected shipments, with a person retaining the
consequential decision.

Contents:

1.  [Identity and pitch](#identity-and-pitch)
1.  [One control loop](#one-control-loop)
1.  [Decision ownership](#decision-ownership)
1.  [People and workflow](#people-and-workflow)
1.  [Product principles](#product-principles)
1.  [What outcomes mean](#what-outcomes-mean)
1.  [Evidence experience](#evidence-experience)
1.  [Demonstration and proof](#demonstration-and-proof)
1.  [Voice and claims boundary](#voice-and-claims-boundary)

## Identity and pitch

LadingLens is a shipping inbox-control system using double-entry bookkeeping
to reconcile expected shipments with cases and verify SI-to-BL decisions
against source evidence for human sign-off.

- Inbox risk: Averis can miss a time-critical document-check request in a
  mixed inbox, and a never-arrived email cannot be found by classifying mail
  alone.
- Two control gates: Gate 1 accounts for every received email; Gate 2
  independently reconciles expected shipments to the case ledger. Valid SI/BL
  pairs receive evidence comparison within the same workflow.
- Safe refusal and ownership: LadingLens returns `NEEDS_REVIEW` when evidence
  is incomplete or uncertain; a named human resolves the case and owns the
  sign-off.

## One control loop

LadingLens is not several products. The ledger, inbox routing, evidence
comparison, and human review are stages of one control loop: expected
shipments establish what should exist; inbox routing accounts for what arrived;
reconciliation exposes absence or mismatch between the two; valid SI/draft-BL
pairs receive evidence-backed comparison; and a named person disposes of what
cannot safely be decided automatically.

## Decision ownership

In the target build, Gemini 3.5 Flash reads scanned or locally ambiguous
documents. Version-pinned Jev `jev-1.13.0` makes narrow, typed decisions about
email category, semantic document type, and textual field equivalence.
Deterministic code handles file checks, local parsing, normalization, numbers,
schemas, thresholds, workflow state, and audit records. A named human owns
consequential review decisions; a model never becomes the accountable party.

If an approved provider fails, LadingLens must show the failure and stop that
decision path. It must not silently swap in another model and present the
result as equivalent.

## People and workflow

The shipping operations analyst or reviewer will compare evidence and decide to
approve, correct, or reject a case. The operations lead will own the exception
queue, staffing, thresholds, and timely escalation. The judge or evaluator
will use the deployed preliminary public path to verify the exact output, a
fresh synthetic comparison, and a visible missing-case control without
credentials.

The required operator workflow is:

1.  Import a labelled synthetic expected-shipment list with identifiers,
    lifecycle, required documents, cutoffs, owner, and freshness.
2.  Receive and classify each inbox email as `BL_COMPARISON`, `SI_REQUEST`,
    `INVOICE_QUERY`, `GENERAL`, or `SPAM`, recording an outcome for every
    received email.
3.  Reconcile expected shipments with the case ledger. Confirm `CASE_PRESENT`;
    investigate `MISSING_CASE`, `DOCUMENT_MISSING`, `UNMATCHED_CASE`,
    `DUPLICATE_OR_AMBIGUOUS`, and `SOURCE_STALE`; do not use stale or uncertain
    matches to clear a shipment.
4.  For a valid `BL_COMPARISON` pair, use the SI as reference and compare
    `shipper`, `consignee`, `notify_party`, `port_of_loading`,
    `port_of_discharge`, `container_count`, and `gross_weight_kg`.
5.  Open the source evidence for a field decision. Resolve an assigned case
    with a reason, evidence, diagnostic or probability, and an approve,
    correct, or reject disposition. Assign, acknowledge, escalate, or resolve
    a reconciliation exception against its reconciliation result without
    creating an email case.
6.  Preserve the immutable source and audit history. The deploying organization
    remains accountable for the resulting operational action.

## Product principles

- **Account for absence.** An inbox cannot reveal mail that never arrived, so
  use an independent expected-shipment ledger to expose a missing case.
- **Evidence before trust.** Each field decision should lead back to its source.
- **Refuse rather than guess.** Incomplete, unreadable, or wrong documents do
  not justify a fabricated comparison.
- **Human owns consequence.** A named person has authority to decide and the
  deploying organization remains accountable.
- **Preserve original records.** Keep immutable sources and disposition history.
- **Distinguish live from preserved demonstrations.** A prepared fallback must
  be visibly labelled and verbally disclosed when a live provider fails.

## What outcomes mean

In the built product, `OK` will mean either successful classification of a
non-comparison email or a valid comparison that found no defect.
`MISMATCH` will mean a valid comparison found one or more defect fields.
`NEEDS_REVIEW` will mean automation stopped because the problem is structural,
not because it quietly guessed.

- `wrong_doc_type`: an attachment is not the required SI or draft BL.
- `missing_attachment`: a required SI or draft BL is absent.
- `unreadable`: a required attachment cannot be parsed or read.
- `missing_value`: a required comparison value is absent, blank, or a
  placeholder.

In the interactive operator experience, a semantic ambiguity may enter review
with evidence and a diagnostic or probability. In benchmark batch output,
ambiguous below-threshold fields are `MISMATCH`; `NEEDS_REVIEW` is reserved for
the four structural reasons above.

## Evidence experience

In the built product, clicking a decision must open the source in the form that
is honest for that format: a TXT line and columns, a digital-PDF bounding box,
an XLSX sheet and cell, or a DOCX structural table cell or paragraph. A scanned
PDF must open at an approximate page and region; LadingLens must explicitly
label that anchor as approximate rather than pixel-perfect. A corrupt PDF has
no evidence anchor: LadingLens must refuse automatic verification and route it
as `unreadable`.

## Demonstration and proof

The [full five-minute demo spine](/docs/research/ideation/demo-spine.md)
defines the preliminary demonstration target. Its named peak must be
`SHP-5RFR-37631`: a synthetic shipment at `DRAFT_BL_EXPECTED` with no matching email
case, shown as `MISSING_CASE`. Without presenter help, a judge must be able to
inspect all 520 IDs and a sample exact submission record, upload a fresh
synthetic SI/BL pair at the deployed preliminary `/judge` path, inspect seven
field decisions and one evidence link, inspect the synthetic ledger and
`SHP-5RFR-37631`, see one `NEEDS_REVIEW` refusal, and download the public artifacts.

Preliminary proof must be a synthetic, public, no-account demonstration: 520
classifications, exact submission JSON, expected-shipment reconciliation,
seven-field comparison, evidence, safe refusal, and setup instructions. Finals
proof must add production connector interfaces, durable recoverable jobs,
comprehensive review persistence, monitoring, calibrated thresholds, improved
scanned-document anchors, production privacy and security controls, and
independent reconciliation at operational scale.

## Voice and claims boundary

Speak plainly and operationally: show the source, state what is known, name
what is missing, and assign the next owner. Use LadingLens for the product and
Averis for the project, team, and customer context.

LadingLens does not amend a BL, authorize release, provide a legal opinion, or
promise 100% accuracy. It cannot identify a never-arrived email without an
independent shipment source. The preliminary free-tier route must use synthetic
data and is not approved for real production shipping data. Do not present
historical Flash Lite latency as Gemini 3.5 Flash performance; a fresh Flash
end-to-end benchmark must target below 10 seconds.
