# LadingLens demo spine

This is the five-minute demonstration contract for LadingLens in the Averis
project context. The preliminary cut uses synthetic shipment data and the
published hackathon inbox contract; the finals cut may add integrations and
operational depth.

Contents:

1.  [Five-minute preliminary run](#five-minute-preliminary-run)
1.  [Preliminary and finals cuts](#preliminary-and-finals-cuts)
1.  [Public judge path](#public-judge-path)
1.  [Model and decision ownership](#model-and-decision-ownership)
1.  [Safe boundary](#safe-boundary)

## Five-minute preliminary run

The scripted run totals 4:50, leaving ten seconds of buffer under the five-
minute cap. Each beat names its execution mode. The demo operator can run every
live action from the public judge path. A judge can supply a fresh synthetic
SI/BL pair that is not in the prepared examples. If a live provider fails, the
operator switches to a visibly labelled prepared fallback and says so before
showing it: “The live provider failed; this is the prepared fallback.”

### 0:00–0:30 — Account for the inbox

**Mode: Live with preserved fallback**

- **On screen:** The inbox board shows all 520 email IDs and their five-way
  classifications. It reads `520 received / 520 accounted for / 0 lost` and
  shows the exact generated submission file as an available artifact.
- **Say:** “The first control accounts for every message before we look at
  individual documents.” If the prepared fallback is shown, first disclose:
  “The live provider failed; this is the prepared fallback.”
- **Judge can verify unaided:** The 520 total, presence of all IDs in the
  downloadable JSON, and the five submission keys on a sample row.

### 0:30–1:00 — Show exact submission output

**Mode: Live**

- **On screen:** Open the submission preview and one `MISMATCH` record. Each
  record has exactly `category`, `status`, `review_reason`, `defect_fields`,
  and `has_defect`. Show a row with `status: "MISMATCH"`,
  `review_reason: null`, `has_defect: true`, and the exact defect field list.
- **Say:** “The evaluator contract stays exact: `OK`, `MISMATCH`, or
  `NEEDS_REVIEW`, with only the allowed review reasons.”
- **Judge can verify unaided:** Download and inspect the JSON shape and confirm
  the enum spelling. Review reasons are `wrong_doc_type`,
  `missing_attachment`, `unreadable`, and `missing_value`.

### 1:00–1:40 — Prove a judge-supplied document comparison

**Mode: Live with preserved fallback**

- **On screen:** At `/judge`, upload a judge-supplied synthetic SI and draft
  BL pair that is absent from the prepared examples. Process both live. Show
  all seven field rows: `shipper`, `consignee`, `notify_party`,
  `port_of_loading`, `port_of_discharge`, `container_count`, and
  `gross_weight_kg`. Select one result to open its source evidence. If the live
  provider fails, keep the failed judge upload and its retry control visible,
  then show a different prepared pair with its own inputs, result, and evidence
  in a panel labelled `PREPARED FALLBACK`.
- **Say:** “This pair was just supplied by the judge and is being processed
  live. The SI is the reference; we compare seven fields and open the source
  evidence.” If the provider fails, first disclose: “The live provider failed;
  this is the prepared fallback.”
- **Judge can verify unaided:** Both raw source values, the field verdict, and
  one evidence click to the supporting document location for the currently
  shown example. The failed unseen upload remains visible and retryable, and
  the screen cannot claim that its proof succeeded until a fresh live retry
  succeeds.

### 1:40–2:05 — Refuse an unsafe comparison

**Mode: Live with preserved fallback**

- **On screen:** Open `email_507` with its SI attachment and missing draft BL.
  Show `NEEDS_REVIEW` and `missing_attachment`; no comparison result is
  fabricated.
- **Say:** “The system stops when a required document is absent. A person owns
  the next action.” If the prepared fallback is shown, first disclose: “The
  live provider failed; this is the prepared fallback.”
- **Judge can verify unaided:** The inbox record lists one attachment, the
  status and reason use the exact allowed strings, and the seven-field
  comparison is not presented as complete.

### 2:05–2:35 — Load the independent expectation ledger

**Mode: Live**

- **On screen:** Import the clearly synthetic `expected_shipments.csv` with
  shipment ID, booking reference, lifecycle state, required documents, cutoff,
  owner, and source freshness. Show matched rows beside their inbox case IDs.
- **Say:** “Inbox classification cannot find a message that never arrived, so
  the second control starts from expected shipments.”
- **Judge can verify unaided:** The CSV is labelled synthetic, its rows are
  visible, and matched shipment-to-case identifiers agree on screen.

### 2:35–3:55 — Peak: reveal the unmatched expected shipment

**Mode: Live with preserved fallback**

- **On screen:** Reconciliation marks synthetic shipment `SYN-042` (booking
  `SYN-BK-042`, lifecycle `DRAFT_BL_EXPECTED`) as `MISSING_CASE`: no matching
  email or case exists. Keep the expected-shipment row and empty case side
  visible together. This is the named, judge-visible peak moment.
- **Say:** “This shipment has reached the point where a draft BL case is
  expected, but no email case exists. The inbox-only view could not show this
  absence.” If the prepared fallback is shown, first disclose: “The live
  provider failed; this is the prepared fallback.”
- **Judge can verify unaided:** The synthetic source row, its expected state,
  the unmatched reconciliation result, and the empty case match are all
  visible without trusting narration.

### 3:55–4:50 — Close on ownership and the public route

**Mode: Live**

- **On screen:** Return to the public judge page. Show the two gate summaries,
  the unmatched-shipment exception, and the review owner/action. Leave the
  submission and synthetic CSV download links visible.
- **Say:** “LadingLens accounts for received mail, checks expected shipments
  independently, and leaves unresolved decisions with a person.”
- **Judge can verify unaided:** They can open `/judge`, submit their own fresh
  synthetic SI/BL pair, inspect the synthetic CSV and submission output, and
  follow the displayed case and evidence links without private credentials or
  presenter narration.

The scripted beats total 4:50. The remaining ten seconds absorb pauses or page
loads; they are not an extra beat. No beat depends on quoting a latency result.

## Preliminary and finals cuts

### Preliminary cut

The preliminary demonstration includes:

- all 520 classifications and the exact five-key submission output;
- a clearly synthetic `expected_shipments.csv`;
- shipment-to-case reconciliation, including `SYN-042` as the unmatched
  expected shipment peak;
- a live upload and processing of a judge-supplied, unseen synthetic SI/BL
  pair, all seven fields, and one evidence click;
- one safe refusal with an exact `NEEDS_REVIEW` reason; and
- a public `/judge` path with downloadable demo artifacts.

Use preserved seeded outputs only as a visibly labelled fallback if the live
provider fails. Say, “The live provider failed; this is the prepared fallback,”
before showing it. The fallback is a different prepared example and retains its
own input, result, and evidence together. Keep the failed unseen upload visible
and retryable; do not claim its proof succeeded until a fresh live retry
succeeds.

### Finals additions

The finals cut may add real ERP, TMS, and carrier integration; durable
processing; advanced audit and monitoring; improved scanned-document anchors;
and production privacy controls. These are additions to the preliminary
workflow, not prerequisites for explaining its two gates.

## Public judge path

The deployed public site opens at its shared root URL and exposes `/judge` as
the self-service demonstration entry point. The page lets a judge upload a
fresh synthetic SI/BL pair, processes it live through extraction and
comparison, and exposes all seven fields with source evidence. It also
provides the synthetic expected-shipment ledger, generated submission, case
list, and reconciliation view. If the live provider fails, it keeps the failed
unseen upload visible and retryable, then shows a different prepared pair only
in a visibly labelled fallback panel with its own input, result, and evidence;
it discloses that switch aloud. Judges need no presenter-only login or private
dataset. Keep the route and artifacts available throughout judging; do not
publish ground truth or personal data.

## Model and decision ownership

Gemini 3.5 Flash performs document extraction. Jev 1.13.0 makes typed semantic
decisions, such as email category, document type, and semantic equivalence.
Deterministic code owns structure, parsing, normalization, numeric comparisons,
schemas, and state transitions. Human reviewers own unresolved outcomes and
sign-off. A Flash Lite latency benchmark is historical evidence for Flash Lite
only and must not be presented as a Gemini 3.5 Flash result.

## Safe boundary

Preserve the submission statuses `OK`, `MISMATCH`, and `NEEDS_REVIEW` and the
review reasons `wrong_doc_type`, `missing_attachment`, `unreadable`, and
`missing_value`. Reconciliation separately identifies a missing case; that
does not turn an absent inbox record into a benchmark submission row. The
report does not amend a BL or authorize release.

## Source links

- [Project brief](/docs/brief.md)
- [Official dataset and submission contract](/docs/sources/google-drive/dataset-bundle.md)
- [Missed-case stakes and reconciliation gate](/docs/research/ideation/stakes.md)
- [Evidence location capabilities](/docs/research/ideation/provenance-spike.md)
