# LadingLens

## Two-sentence explanation

LadingLens turns a mixed shipping inbox into a clear work queue where every
email is completed, dismissed for a stated reason, or waiting for a named
action. For document checks, it confirms the correct Shipping Instruction and
draft Bill of Lading are present, compares seven shipment details, shows the
exact source proof, and sends uncertain cases to a person.

## Problem statement

Averis can receive up to 2,000 mixed shipping emails a day. Important document
checks arrive beside new Shipping Instruction requests, invoice questions,
general messages, and spam, so an overlooked request may never reach the
checking step.

When a check is required, staff compare a Shipping Instruction (SI) against a
draft Bill of Lading (BL). The SI states the intended shipment details and is
therefore the reference. Staff must check seven fields even when the documents
use different labels or formats.

The system must classify every email, compare the correct documents, identify
the exact mismatched fields, and ask a person for help instead of guessing when
the evidence is incomplete or uncertain.

## Product promise

LadingLens makes four enforceable promises:

1. No email disappears between intake and action.
2. No comparison begins until the required document pair is valid.
3. No result appears without evidence from the source files.
4. No uncertain result silently becomes an approval.

The user sees one product and one workflow. Inbox accounting, pair validation,
evidence, and safe release are internal stages rather than separate products.

## User experience

### LadingLens inbox board

The first screen accounts for the full inbox:

- **Completed:** the request has a supported result.
- **Action needed:** a confirmed mismatch needs correction.
- **Waiting:** a required document or value is missing.
- **Review:** the system cannot decide safely.
- **No action:** the message belongs to another required email category.

The headline measure is simple: `520 received / 520 accounted for / 0 lost`.

### LadingLens document preflight

Before comparing fields, LadingLens checks:

1. whether both files are present;
2. whether one is an SI and the other is a draft BL; and
3. whether available booking, party, and route details indicate the files
   belong to the same shipment.

An exact reference conflict blocks comparison. Missing identity clues trigger
review rather than an unsupported claim that the files do not belong together.

### LadingLens evidence view

A valid comparison displays the seven fields in rows. Each row contains:

- the raw SI value;
- the normalised SI value;
- the raw BL value;
- the normalised BL value;
- `MATCH`, `MISMATCH`, or `UNCERTAIN`;
- the rule or semantic decision used; and
- a source excerpt and stable location for both documents.

Selecting a red field takes the user directly to the words, line, cell, sheet,
or page that proves the mismatch.

## End-to-end workflow

1. Ingest all emails and create one accountable state per email ID.
2. Use Jev to classify each email into the five required categories.
3. Stop non-comparison emails after recording their category and reason.
4. Check required attachments and verify their document types.
5. Use Gemini 3.5 Flash to extract the seven fields and source evidence.
6. Normalise names, ports, weights, and container counts in code.
7. Compare numeric values deterministically.
8. Use Jev for meaning-based comparison of names and ports.
9. Apply code-owned release rules.
10. Return `OK`, `MISMATCH`, or `NEEDS_REVIEW`.
11. Let a person correct a review result and preserve the audit trail.
12. Produce the exact submission record for every email.

## Technology responsibilities

### Gemini 3.5 Flash

Gemini is the reader. It handles TXT, PDF, DOCX, XLSX, and scanned content and
returns structured fields with short source excerpts and location information.
It does not decide whether the workflow may approve a case.

### Jev

Jev is the semantic decision layer. It chooses email categories and document
types and judges whether differently written party or port values have the same
meaning.

### Deterministic code

Application code validates every response, performs arithmetic, compares exact
values, manages state transitions, applies confidence thresholds, and decides
which actions are permitted. Missing files and schema failures are code-level
facts, not model opinions.

### Human reviewer

A person sees the relevant evidence and reason, corrects the result, and leaves
an auditable resolution. Review is a successful safety outcome rather than a
hidden failure state.

## Real dataset demonstration

The five-minute demonstration should use real supplied cases:

1. Show the full board with all 520 emails accounted for.
2. Open `email_501`. A file named `email_501_BL.txt` is actually a commercial
   invoice; LadingLens stops before field comparison.
3. Open `email_507` or `email_509`. The request asks for a comparison, but the
   draft BL is missing; the case waits for that file.
4. Open one valid pair and show all seven comparisons.
5. Select a numeric mismatch and reveal both source values.
6. Open an uncertain textual comparison and send it to review.
7. Correct the review result and show the board and evaluator output update.

The judge should remember one moment: clicking a mismatch and seeing the exact
proof without rereading two documents.

## Originality

Classification, extraction, and comparison are basic expectations. LadingLens
is differentiated by the operational contract surrounding them:

- every email receives a visible outcome;
- every comparison begins with a document-safety check;
- every verdict is traceable to source evidence; and
- uncertainty changes the permitted action.

This is workflow reliability rather than a claim that the underlying AI task is
new.

## Hackathon scope

### LadingLens preliminary core

- All 520 IDs and five categories.
- The exact required evaluator schema.
- The seven field comparisons.
- Reliable TXT support and practical parsers for PDF, DOCX, and XLSX.
- Evidence excerpts and stable source locations.
- Missing, wrong-document, unreadable, and missing-value review paths.
- One inbox board and one case-detail view.
- Retry and human correction.
- Measured classification, defect, end-to-end, and review metrics.

### LadingLens final-round extensions

- OCR and visible page-region highlighting for scans.
- Durable jobs, caching, idempotency, and batch recovery.
- Better threshold calibration using review outcomes.
- Recurring-problem analytics, but only from confirmed results.

### LadingLens non-goals

- Replacing a full email client.
- Autonomous release to a real carrier.
- Autonomous outbound email.
- A general document-management platform.
- Graph visualisations without a proven operator use.

## Rubric fit

| Rubric area | LadingLens contribution |
| --- | --- |
| Working end to end | Accounts for every email and completes the required comparison output. |
| Architecture | Separates reading, semantic decisions, deterministic rules, and review. |
| Technology integration | Gemini 3.5 Flash and Jev perform distinct necessary jobs. |
| Feasibility | Uses real dataset edge cases and limits the interface to two views. |
| Robustness | Makes missing inputs, uncertainty, failures, and retries visible. |
| User value | Reduces inbox searching and source-document rereading. |
| Differentiation | Makes accountability and evidence enforceable product rules. |

## Risks and kill criteria

- Evidence-backed review may feel familiar unless the source proof is fast and
  visibly useful.
- Overly strict gates may send too many cases to review.
- Multi-format evidence coordinates can consume more time than classification
  and comparison accuracy.
- A polished board cannot compensate for poor evaluator results.

LadingLens should not be selected if the test user sees it as an ordinary
document checker with a nicer dashboard. It should be selected if the test user
values the complete workflow, immediately understands the proof view, and trusts
the “nothing lost, nothing approved without evidence” promise.
