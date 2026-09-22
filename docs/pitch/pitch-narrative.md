# LadingLens preliminary pitch narrative

This is the approved source copy for the preliminary slide deck, form
description and demo-video narration. It separates reusable claims from
evidence that must still be supplied by the implementation team.

Contents:

1.  [Narrative rule](#narrative-rule)
1.  [One-sentence identity](#one-sentence-identity)
1.  [Submission description](#submission-description)
1.  [Thirty-second opening](#thirty-second-opening)
1.  [Pitch route](#pitch-route)
1.  [Engineering evidence requests](#engineering-evidence-requests)
1.  [Claims boundary](#claims-boundary)
1.  [Publication gate](#publication-gate)

## Narrative rule

Lead with the operational blind spot, reveal the independent reconciliation
control, and finish by giving the judge a way to inspect the evidence. Present
routine automation and human review as one accountable workflow: automatic
where the evidence is sufficient, human-owned where it is not.

## One-sentence identity

LadingLens is a shipping inbox-control system using double-entry bookkeeping
to reconcile expected shipments with cases and verify SI-to-BL decisions
against source evidence for human sign-off.

## Submission description

LadingLens helps shipping operations account for received inbox mail and detect
expected shipments that have no corresponding case. It combines two controls:
email classification records an outcome for every received message, while an
independent shipment ledger exposes missing cases and documents that an
inbox-only system cannot see. Valid Shipping Instructions and draft Bills of
Lading are compared across seven required fields with source evidence attached
to each decision. Routine supported cases avoid repetitive manual checking;
missing, inconsistent or unreadable evidence is routed to a named reviewer
instead of being guessed. The preliminary demonstration uses synthetic data.

## Thirty-second opening

> Averis can receive up to 2,000 mixed emails in a day. One missed
> document-checking request may never produce a useful second warning; the next
> signal can be a late amendment, a customs fine or a rolled container. An
> inbox classifier can account for what arrived, but it cannot find an email
> that never came. LadingLens adds the missing control: it reconciles every
> expected shipment to a case, then makes each SI-to-BL decision inspectable at
> its source.

## Pitch route

| Beat | Core line | Visible proof | Transition |
| ---- | --------- | ------------- | ---------- |
| Problem | “An inbox can only account for what arrived.” | Up to 2,000 mixed messages per day from the official brief. | “So a second classifier is not enough.” |
| Stakes | “One actionable miss can become material, but not every miss has the same cost.” | Qualified Malaysia amendment exposure with source footnote. | “The problem is not merely classification accuracy.” |
| Product | “Two controls create one accountable workflow.” | Gate 1, Gate 2 and evidence comparison diagram. | “Now the judge can test each control.” |
| Routine path | “Supported cases complete without repetitive manual re-entry.” | Fresh synthetic SI/BL result with seven rows and one evidence click. | “Speed does not justify guessing.” |
| Refusal | “Incomplete or unreadable evidence stops at `NEEDS_REVIEW`.” | Missing attachment or corrupt-document refusal with no fabricated comparison. | “But there is still a case an inbox cannot display.” |
| Peak | “`SHP-5RFR-37631` is expected, due and has no matching case.” | Expected row beside an empty case match and `MISSING_CASE`. | “The second control found absence without waiting for another email.” |
| Ownership | “Automation narrows the queue; a named person owns consequential sign-off.” | Review owner, evidence and permitted action. | “The result remains checkable after the pitch.” |
| Close | “Open the source. Find the missing case.” | Public judge path and downloadable synthetic artifacts. | End. |

The [demo spine](/docs/research/ideation/demo-spine.md) remains the timing
authority for the five-minute video. This route supplies reusable language; it
does not add another video beat.

## Engineering evidence requests

The final deck must replace this request list with retained artifacts. Until
then, do not publish a numeric performance or accuracy claim.

| Evidence needed | Required artifact | Intended use |
| --------------- | ----------------- | ------------ |
| End-to-end latency | Versioned benchmark output for the shipped Gemini 3.5 Flash and pinned Jev path, including sample size, median and p95 | Validation slide and video caption |
| Extraction quality | Held-out synthetic field-level results with denominator and evaluation method | Accuracy statement |
| Discrepancy detection | Recall and false-alert counts or confusion matrix | Reliability statement |
| Human workload | Count and percentage of cases automatically completed versus routed to review | Minimal-intervention statement |
| Dataset completion | Scorer or validation artifact proving all 520 IDs and exact output schema | Judge-verifiable result |
| Product screens | Captures of inbox accounting, evidence comparison, refusal, `SHP-5RFR-37631`, review custody and public judge route | Slides and video |
| Deployment | Logged-out public URL smoke result and deployed commit | Submission and architecture slide |

Every artifact must name the tested commit, input set, model or rule version,
and execution time. The deck may state a target before results exist, but it
must not present that target as achieved performance.

## Claims boundary

Use these formulations:

- “A qualifying late amendment can create a MYR 200 fee and a customs fine of
  up to MYR 5,000.”
- “The supplied synthetic bundle contains 520 email records.”
- “LadingLens accounts for received mail and uses an independent expected-
  shipment source to identify a missing case.”
- “Routine supported comparisons are designed to proceed without manual
  re-entry; exceptions go to a named reviewer.”
- “A corrupt or unreadable document is refused rather than guessed.”

Do not say:

- every missed email costs MYR 5,200;
- LadingLens cannot miss an email or is 100% accurate;
- the challenge's `gross_weight_kg` is always SOLAS VGM;
- a LadingLens annotation amends a BL or authorises shipment release;
- human approval removes organisational accountability;
- Singapore application hosting proves inference residency;
- historical Flash Lite latency proves Gemini 3.5 Flash performance; or
- a planned capability is already shipped.

## Publication gate

Before publishing the deck for issue #48:

1.  Replace all pending engineering evidence with verified artifacts or remove
    the dependent claim.
2.  Confirm the architecture slide matches the shipped commit and root
    `README.md` from issue #44.
3.  Confirm the demo screenshots and narration match the deployed public
    build rather than a design mock-up.
4.  Complete the issue #43 claims, licence and attribution review.
5.  Export or publish at an accessible URL and test it in a logged-out browser.
6.  Record the final URL, artifact version and reviewed commit in issue #45 for
    handoff to issue #48.
