# SameStory

## Two-sentence explanation

SameStory reads the email subject, newest message, and actual attachments as
separate accounts because shipping emails can say one thing while their files
contain another. It proceeds only when those accounts support the same action;
otherwise it shows the contradiction, requests review, and performs the
required SI-to-BL comparison once the request is verified.

## Problem statement

Averis can receive up to 2,000 mixed shipping emails a day. Staff must find the
document-checking requests among new Shipping Instruction requests, invoice
questions, general messages, and spam before any document comparison can begin.

Subjects and filenames are not dependable on their own. A subject can describe
one task while the newest message asks for another, an email can request a BL
comparison while the BL is missing, or a file named as a BL can actually be an
invoice.

For a genuine comparison request, the system must still compare the same seven
fields from the Shipping Instruction (SI) and draft Bill of Lading (BL), treat
the SI as the reference, and return `OK`, `MISMATCH`, or `NEEDS_REVIEW`.

## Product promise

SameStory does not trust the loudest clue in an email. It separately records
what each available source claims and makes disagreement visible before taking
an operational action.

Its four promises are:

1. A subject cannot override the actual request by itself.
2. A filename cannot override the actual document content.
3. Quoted historical messages cannot silently replace the newest instruction.
4. A contradiction must be resolved or reviewed before the case proceeds.

## The three-account model

SameStory treats each email as up to three accounts of the same task:

### Subject account

What action does the subject appear to request? What shipment, booking, or
document references does it contain?

### Message account

What does the newest unquoted message actually ask the operator to do? Earlier
quoted replies remain available as context but do not automatically become the
current instruction.

### Attachment account

What documents are actually attached, regardless of their filenames? Do their
content, booking references, parties, and routes support the requested action?

Some emails legitimately have no attachments, so SameStory compares only the
accounts that should exist for that category. A BL comparison request is
expected to have both an SI and draft BL; a general message is not.

## What the operator sees

The inbox still accounts for every email, but the case view begins with a
three-part signal strip:

```text
SUBJECT SAYS       NEWEST MESSAGE ASKS       FILES ACTUALLY CONTAIN
BL confirmation    Compare SI against BL     SI + commercial invoice
```

The result beneath it is expressed plainly:

> Do not compare yet. The second attachment is an invoice, not a draft BL.

When the accounts support the same action, the user moves directly to the seven
field comparison with source evidence. When they conflict, the system shows the
specific disagreement and the next safe action.

## End-to-end workflow

1. Ingest every email and preserve its raw subject, body, and attachment list.
2. Separate the newest message from quoted history using deterministic markers,
   with Gemini 3.5 Flash as a fallback for messy layouts.
3. Use Gemini 3.5 Flash to extract the claims and references from each account.
4. Use Jev to assign a typed category to the subject and newest-message accounts.
5. Read the actual attachments and use Jev to decide their document types.
6. Use deterministic rules to build an agreement matrix.
7. Resolve harmless wording differences while preserving material conflicts.
8. Route clearly supported non-comparison emails to their required categories.
9. For a verified BL comparison, extract and compare the seven required fields.
10. Return `OK`, `MISMATCH`, or `NEEDS_REVIEW` with source evidence.
11. Let a person resolve a contradiction or uncertain comparison.
12. Produce the required evaluator record for every email.

## Agreement rules

SameStory must not demand identical words from every account. It distinguishes:

- **Agreement:** different wording supports the same operational action.
- **Harmless silence:** one account omits a detail it was not expected to carry.
- **Material contradiction:** accounts imply different categories, document
  types, shipment identities, or required actions.
- **Missing expected evidence:** a comparison is requested but the SI or BL is
  absent.

Code owns the expected-account rules. Jev handles meaning-based decisions, and
low-confidence disagreement goes to a person.

## Technology responsibilities

### Gemini 3.5 Flash

Gemini reads the newest message, quoted history, and attachment contents. It
extracts the requested action, references, document fields, and source excerpts
without controlling the final workflow.

### Jev

Jev decides the likely category of each textual account, identifies document
types, and judges whether different wording expresses the same action or value.

### Deterministic code

Code separates known quote markers, validates model responses, constructs the
agreement matrix, performs numeric comparisons, manages states, and prevents a
materially contradictory case from being approved.

### Human reviewer

A person receives the three accounts, the exact conflict, and the relevant
source evidence. Their resolution updates the final category or comparison
result and remains auditable.

## Real dataset demonstration

The supplied data contains strong contradiction examples:

1. `email_501` requests BL confirmation and names an attachment as a BL, but the
   file content is a commercial invoice.
2. `email_507` and `email_509` request SI-to-BL comparison, but only an SI is
   attached.
3. `email_269` has a subject about a missing GR while its newest message asks to
   cancel an invoice because a booking was amended.
4. `email_108` has a generic freight subject while its newest message contains
   a specific invoice-cancellation request.
5. A normal comparison case shows all accounts agreeing before the seven-field
   check proceeds.

The memorable demonstration is opening an email that looks normal from its
subject or filename and revealing that the actual request tells a different
story.

## Originality

Most classifiers combine the subject, body, and file names into one model prompt
and return one label. That hides contradictions and makes it impossible to tell
which input led the system astray.

SameStory makes cross-source agreement a first-class decision. It is designed
for misleading subjects, quoted email history, wrong document contents, and
missing expected files rather than treating them as unrelated edge cases.

It still completes the ordinary classification and document-comparison work;
the innovation is verifying the request before acting on it.

## Hackathon scope

### SameStory preliminary core

- All 520 IDs and five required categories.
- Subject, newest-message, and attachment accounts.
- Common quoted-message separation patterns.
- Content-based document typing.
- A deterministic agreement matrix with review thresholds.
- The seven required SI-to-BL comparisons.
- Evidence excerpts and one contradiction-focused case view.
- The exact required evaluator output.
- Classification, defect, end-to-end, conflict, and review measurements.

### SameStory final-round extensions

- More robust thread segmentation for forwarded and multilingual messages.
- Shipment-identity checks across booking, party, and route references.
- Calibrated rules learned from confirmed contradiction reviews.
- Monitoring for new disagreement patterns without accusing senders of intent.

### SameStory non-goals

- Fraud detection or claims that a sender acted deceptively.
- Reconstructing a complete external mailbox history.
- Treating every subject/body wording difference as a problem.
- Autonomous email sending or carrier release.
- Speculative urgency or financial-impact scoring.

## Rubric fit

| Rubric area | SameStory contribution |
| --- | --- |
| Working end to end | Still classifies all emails and completes required comparisons. |
| Problem understanding | Directly addresses misleading subjects, wrong files, and missed requests. |
| Innovation | Makes cross-source agreement visible instead of hiding it in one prompt. |
| Technology integration | Gemini 3.5 Flash reads each account; Jev judges intent and meaning. |
| Robustness | Material contradictions and missing expected evidence block unsafe action. |
| User value | Explains why an email was routed incorrectly before work is wasted. |
| Differentiation | Provides a memorable subject-versus-message-versus-file demonstration. |

## Risks and kill criteria

- Normal shorthand and incomplete subjects may appear contradictory when they
  are merely brief.
- Extra decisions increase latency, cost, and the chance of unnecessary review.
- The three accounts are observations from one workflow, not three independent
  AI models.
- Focusing on contradictions must not reduce seven-field comparison accuracy.
- Thread splitting can fail on unusual forwarding formats.

SameStory should not be selected if the test user sees the three-account strip
as unnecessary complexity or cannot understand why it changes an action. It
should be selected if the contradiction is immediately clear, feels more
original than a normal checker, and increases trust in how emails are routed.
