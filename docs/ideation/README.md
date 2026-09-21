# Final ideation comparison

This folder contains the two product ideas being considered for the hackathon.
They solve the same required problem with different primary ideas, so a test
user can choose which story is clearer and more valuable.

The earlier five-product framing is retired. Pair validation, inbox closure,
evidence, and safe release are now compiled into LadingLens rather than
presented as separate products.

## Problem statement

Averis's shipping operations team can receive up to 2,000 mixed emails a day.
Document-checking requests arrive alongside requests for new shipping
instructions, invoice questions, general operational messages, and spam.

Staff must first find the emails that need a document check. They then compare
a Shipping Instruction (SI), which states the intended shipment details,
against a draft Bill of Lading (BL) before the BL is finalised. Doing this by
hand is slow, repetitive, and vulnerable to missed emails and missed errors.

The required system must:

1. Classify every email as `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`,
   `GENERAL`, or `SPAM`.
2. For a BL comparison, identify and read the correct SI and draft BL.
3. Compare shipper, consignee, notify party, loading port, discharge port,
   container count, and gross weight in kilograms.
4. Treat the SI as the reference document.
5. Return `OK`, `MISMATCH`, or `NEEDS_REVIEW`.
6. Identify the exact mismatched fields or the reason review is required.
7. Ask a person for help when a file is missing, wrong, unreadable, or too
   uncertain to decide safely.

The advanced challenge adds PDFs, Word files, spreadsheets, scans, inconsistent
labels, misleading subjects, missing attachments, visible failures, retries,
source evidence, and human correction.

The supplied data contains 520 emails and 250 attachments: 192 TXT, 28 PDF,
22 XLSX, and 8 DOCX files. Of the 126 emails with attachments, 124 contain an
SI and BL pair; `email_507` and `email_509` contain only an SI.

This summary is grounded in the
[official problem statement](/docs/sources/google-drive/problem-statement.md)
and the repository's [dataset brief](/docs/brief.md).

## Locked technology decision

Both ideas use the same approved technical foundation:

- **Gemini 3.5 Flash** reads email and attachment content and extracts
  structured values with source evidence.
- **Jev** makes typed decisions about email intent, document type, and semantic
  equivalence.
- **Deterministic application code** validates schemas, performs numeric
  comparisons, applies thresholds, and controls workflow states.
- **A person** resolves cases the system cannot decide safely.

The locked model choice for this project is **Gemini 3.5 Flash**. Runtime
configuration must be aligned with this decision during implementation.

## Candidate 1: LadingLens

LadingLens turns a mixed shipping inbox into a clear work queue where every
email is completed, dismissed for a stated reason, or waiting for a named
action. For document checks, it confirms the correct SI and draft BL are
present, compares the seven shipment details, shows the exact source proof, and
sends uncertain cases to a person.

Read the [complete LadingLens brief](01-ladinglens.md).

## Candidate 2: SameStory

SameStory reads the subject, newest email message, and actual attachments as
separate accounts because shipping emails can say one thing while their files
contain another. It proceeds only when those accounts support the same action;
otherwise it shows the contradiction, requests review, and still performs the
required SI-to-BL comparison once the request is verified.

Read the [complete SameStory brief](02-samestory.md).

## The meaningful difference

| Question | LadingLens | SameStory |
| --- | --- | --- |
| Main promise | No email is lost and no verdict lacks proof. | The system does not trust a misleading subject or filename. |
| Product centre | Full-inbox accountability and evidence-backed checking. | Agreement between subject, newest message, and actual files. |
| Best demonstration | `520 accounted for / 0 lost`, then click into source evidence. | Expose a subject, request, or filename that conflicts with the real content. |
| Strongest rubric areas | End-to-end workflow, user value, robustness, UX. | Innovation, classification reliability, robustness, differentiation. |
| Main risk | Evidence-backed document review may feel familiar. | Benign wording differences may create too many conflict alerts. |

Both ideas must still complete the entire required workflow. The distinction is
the promise a judge or operator should remember after the demonstration.

## Shared scope guardrails

The first working version must prioritise:

- all 520 email IDs and the exact evaluator output shape;
- five-way classification;
- the seven required field comparisons;
- missing and wrong-document handling;
- evidence excerpts with stable file, page, sheet, cell, or line references;
- deterministic comparison of numbers;
- visible failures, retries, and human review; and
- measured classification, defect, end-to-end, and review performance.

Pixel-perfect highlighting, autonomous email sending, broad analytics, graphs,
and integrations with external shipping systems are not preliminary-round
requirements.

## Evaluation context

The dataset self-evaluation weights are:

- 50% end-to-end defect detection;
- 30% classification macro-F1; and
- 20% defect-F1.

Human-review reliability is reported separately. The hackathon rubric also
places its largest single weight on a working core prototype in the preliminary
round and end-to-end functionality in the final round.

## Independent subagent rubric audit

Three independent subagents scored both concepts against every official rubric
category. All reviewers used the same assumption: the documented preliminary
core has been implemented credibly, while unbuilt final-round extensions earn
no credit.

The category names and maximum scores come from the
[official judging criteria](/docs/sources/google-docs/judging-criteria.md).

These are concept forecasts, not scores for the repository today. The current
application still lacks the classification, extraction, comparison, Jev,
review, and submission pipeline, so it would score much lower if judged now.

The comparison tables use the median of the three reviewer scores for each
criterion. A median limits the effect of one unusually optimistic or
conservative reviewer while retaining their category-level judgments.

### Preliminary-round score forecast

| Criterion | Maximum | LadingLens | SameStory |
| --- | ---: | ---: | ---: |
| System Design & Architecture | 15 | 12 | 13 |
| Working Core Prototype | 25 | 20 | 20 |
| Technology Integration | 15 | 12 | 13 |
| Technical Feasibility & Validation | 15 | 10 | 10 |
| Problem Statement Understanding | 10 | 9 | 10 |
| Innovation & Solution Approach | 10 | 7 | 9 |
| Practical Value & Potential | 10 | 8 | 7 |
| **Median-category total** | **100** | **78** | **82** |

### Preliminary-round justifications

| Criterion | LadingLens justification | SameStory justification |
| --- | --- | --- |
| Architecture | Clear inbox, document-gate, extraction, comparison, and review stages; evidence provenance adds plumbing. | The three-account model and agreement matrix are easy to explain, but add orchestration before comparison. |
| Core prototype | Covers all five categories, seven fields, required statuses, evidence, review, and evaluator output. | Covers the same required core, but quote splitting and account reconciliation create more failure points. |
| Technology | Gemini 3.5 Flash, Jev, deterministic code, and human review have distinct responsibilities. | Gemini and Jev are especially visible across subject, message, and attachment accounts. |
| Feasibility | Main risks are multi-format extraction and stable evidence locations. | Main risks are thread segmentation, false contradictions, extra calls, and excessive review. |
| Problem understanding | Directly addresses missed requests, wrong documents, mismatch detection, and escalation. | Also targets the advanced challenge's misleading subjects and content-versus-filename conflicts. |
| Innovation | Accountability and mandatory evidence are strong execution of a familiar document-AI pattern. | Cross-source agreement is a more unusual and immediately visible product idea. |
| Practical value | Operators can verify results without reopening and rereading both documents. | Contradictions are caught early, but harmless shorthand could create review noise and reduce throughput. |

### Final-round score forecast

| Criterion | Maximum | LadingLens | SameStory |
| --- | ---: | ---: | ---: |
| End-to-End Functionality | 25 | 18 | 18 |
| Architecture & Scalability | 15 | 9 | 9 |
| Technology Integration | 15 | 11 | 12 |
| Engineering Quality & Robustness | 15 | 8 | 8 |
| Solution Effectiveness & User Value | 10 | 8 | 8 |
| User Experience & Differentiation | 10 | 8 | 8 |
| Impact & Future Potential | 10 | 7 | 7 |
| **Median-category total** | **100** | **69** | **70** |

### Final-round justifications

| Criterion | LadingLens justification | SameStory justification |
| --- | --- | --- |
| End-to-end | The complete required path is credible, but format breadth, retries, and review corrections remain unproven. | The same path is present, but the extra preflight can prevent valid cases from reaching comparison. |
| Scalability | Separation of responsibilities is sound; durable jobs, persistence, idempotency, and scale evidence are still missing. | The agreement matrix is structured, but three-account processing adds latency, calls, and state. |
| Technology | Gemini 3.5 Flash and Jev have necessary, non-duplicated roles. | Cross-account extraction and judgment make the integrations especially visible to judges. |
| Robustness | Evidence and release gates are strong designs, but calibration and failure recovery are not yet measured. | Contradiction handling is useful, but false-review and thread-splitting behavior require validation. |
| Effectiveness | The value proposition is direct, but no operator-time or error-reduction benchmark exists. | Wrong-route prevention is valuable, but its benefit outside contradictory cases is unmeasured. |
| UX | The board and click-through proof create a coherent operational workflow. | The subject-versus-message-versus-file strip creates a memorable demonstration. |
| Future potential | Confirmed results could support durable processing and recurring-problem analytics. | The account model could expand into broader inbox reconciliation after the required workflow is proven. |

### Raw reviewer totals

The spread shows how heavily execution assumptions affect the result.

| Reviewer perspective | LadingLens preliminary | SameStory preliminary | LadingLens final | SameStory final |
| --- | ---: | ---: | ---: | ---: |
| Evidence and rubric auditor | 77 | 81 | 63 | 65 |
| Product judge | 88 | 87 | 83 | 82 |
| Strict technical feasibility reviewer | 67 | 62 | 65 | 60 |

Two reviewers preferred SameStory for differentiation and its contradiction
demo. The strict feasibility reviewer preferred LadingLens because it maps more
directly to the evaluator and introduces fewer pre-comparison failure modes.

The audit therefore does not replace the test-user decision. It frames the real
trade-off: **SameStory has the slightly higher originality ceiling, while
LadingLens is the safer implementation bet.**

### Current-repository caveat

The current frontend is an API-readiness view, and the backend exposes health
and readiness endpoints plus a Gemini client wrapper. Neither idea's domain
workflow is implemented, and Jev is not yet wired.

Reviewers estimated that presenting the repository as it stands would score
roughly 20–30 out of 100 in the preliminary round. The forecast tables must only
be used to compare concepts, never as claims about completed functionality.

Use the [test-user selection scorecard](test-user-scorecard.md) to compare the
two ideas without adding further concepts during this decision round.
