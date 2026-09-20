# LadingLens preliminary pitch deck — draft

## Slide 1 — Every shipment should have a case

![LadingLens](/docs/brand/lockup-colour.svg)

**A shipping inbox-control system for evidence-backed SI-to-BL review.**

Averis x Monash Hackathon 2026 — preliminary submission

---

## Slide 2 — One inbox, up to 2,000 messages a day

Averis shipping operations receives general mail, spam, invoice questions,
Shipping Instruction requests and document-comparison work in the same inbox.

One missed comparison request may never produce a useful second warning.

For a qualifying late amendment in Malaysia, the consequence can include a
MYR 200 amendment fee and a customs fine of up to MYR 5,000—before any delay
charges.

_These are conditional exposures, not the cost of every missed email._

Sources: [official challenge brief](/docs/BRIEF.md) and
[Maersk Malaysia import procedures](https://www.maersk.com/local-information/asia-pacific/malaysia/import).

---

## Slide 3 — An inbox can only account for what arrived

```text
Received email                    Expected shipment
      |                                  |
      v                                  v
Classified and processed          No matching case
      |                                  |
      `---------------?------------------'
```

A second inbox classifier cannot discover an email that never arrived.

The missing signal must come from an independent list of expected shipments.

---

## Slide 4 — Two controls, one accountable workflow

### Gate 1 — Account for received mail

Every received email gets one category and one recorded outcome.

### Gate 2 — Reconcile expected shipments

An independent shipment ledger identifies a missing case, missing document,
stale source or ambiguous match.

### Evidence-backed comparison

A valid Shipping Instruction and draft Bill of Lading are compared across
seven fields, with unresolved decisions sent to a named reviewer.

---

## Slide 5 — Fast on routine work, cautious on exceptions

- Routine, supported matches proceed without manual re-entry.
- Mismatches remain visible beside their source values.
- Missing, unreadable or wrong documents stop at `NEEDS_REVIEW`.
- Uncertain operational decisions stay with a person.
- The deploying organisation remains accountable for the workflow.

LadingLens is designed to reduce repetitive checking; it does not replace
human authority or silently turn uncertainty into an answer.

---

## Slide 6 — Let the judge verify the decision

The preliminary judge path is designed to show:

1.  A fresh synthetic SI and draft-BL pair processed live.
2.  All seven required comparison fields.
3.  The original SI and BL values beside each decision.
4.  One click from a field to its source-document location.
5.  A refusal when the evidence is incomplete or unreadable.

The proof is the source—not an unexplained confidence score.

---

## Slide 7 — The peak: find the case the inbox cannot see

```text
SYN-042
Lifecycle: DRAFT_BL_EXPECTED
Expected case: yes
Matching email case: none
Result: MISSING_CASE
```

The expected-shipment row and empty case match appear together.

LadingLens does not wait for a reminder. It identifies the first failed
expectation and assigns the exception to an owner.

---

## Slide 8 — Technical architecture

```text
Synthetic inbox ──> receipt + classification ──> case ledger ──┐
                                                               │
SI / draft BL ──> preflight ──> extract ──> compare + evidence ├─> review
                                                               │
Expected shipments ───────────────> reconciliation ledger ─────┘
```

- Deterministic Python owns file checks, parsing, normalization, numbers,
  schemas and workflow state.
- Gemini 3.5 Flash is the target extractor for scanned or locally ambiguous
  documents.
- Pinned Jev `jev-1.13.0` is the target for narrow, typed semantic decisions.
- FastAPI and React run on Cloud Run, with PostgreSQL state and private GCS
  source objects in the target deployment.

---

## Slide 9 — Implementation follows the evidence boundary

| Input or decision | Owner |
| ----------------- | ----- |
| File type, corruption, hashes and schemas | Deterministic code |
| Digital TXT, PDF, XLSX and DOCX parsing | Local parsers |
| Scanned or locally ambiguous document extraction | Gemini 3.5 Flash |
| Email category, document type and textual equivalence | Pinned Jev |
| Counts, weights, normalization and state transitions | Deterministic code |
| Consequential approval, correction or rejection | Named reviewer |

A corrupt PDF produces `unreadable`, not an invented value. A scanned source
uses an explicitly approximate region rather than a false pixel-perfect claim.

---

## Slide 10 — Speed and accuracy are release gates

Before submission, the shipped path must publish reproducible evidence for:

- end-to-end median and p95 processing latency;
- field-extraction accuracy on a held-out synthetic set;
- discrepancy recall and false-alert rate;
- the proportion of routine cases completed without review; and
- the exact evaluator result across all 520 supplied email IDs.

Historical Flash Lite measurements are not evidence for Gemini 3.5 Flash.
No performance number enters the final deck without its retained artifact.

---

## Slide 11 — What made this difficult

### Absence is not an inbox category

Finding a never-arrived case required a second source of truth.

### Documents do not share one shape

Evidence must survive text, tables, spreadsheets, scans and inconsistent
labels without pretending every source has the same precision.

### Reliability includes refusal

Provider failure, corrupt files and incomplete evidence must remain visible and
fail closed while the rest of the workload continues.

### A live demo must stay honest

Any prepared fallback is labelled and disclosed before it is shown.

---

## Slide 12 — Preliminary proof, then operational depth

### Preliminary

- Account for all 520 supplied inbox records.
- Compare seven SI/BL fields with source evidence.
- Exhibit `NEEDS_REVIEW` instead of guessing.
- Reconcile a synthetic shipment ledger and reveal `SYN-042`.
- Provide a public, no-account judge path.

### Finals and production path

- Authenticated ERP, TMS or carrier connectors.
- Durable jobs, monitoring and calibrated thresholds.
- Production privacy, retention, access and transfer controls.
- Operational reconciliation at scale.

**Do not trust the summary. Open the source. Find the missing case.**

---

## Sources

- [Product positioning](/docs/research/ideation/positioning.md)
- [Five-minute demo spine](/docs/research/ideation/demo-spine.md)
- [Product requirements](/docs/PRD.md)
- [Technical design](/docs/TRD.md)
- [Stakes and safe-use table](/docs/research/ideation/stakes.md)
- [Claims and Q&A defence](/docs/research/ideation/qa-defence.md)
- [Hackathon rules](/docs/sources/google-docs/rules-and-regulations.md)
