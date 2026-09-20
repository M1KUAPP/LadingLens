# LadingLens proposal presentation script

This is the word-for-word script for the proposal HTML deck. It runs for
4:50, leaving ten seconds inside the five-minute video cap. The narration
separates the proposed workflow from what is already implemented on `main`.

Contents:

1.  [Presentation contract](#presentation-contract)
1.  [Timed script](#timed-script)
1.  [Primary proof moment](#primary-proof-moment)
1.  [Transitions](#transitions)
1.  [Fallback language](#fallback-language)
1.  [Rehearsal checklist](#rehearsal-checklist)
1.  [Evidence notes](#evidence-notes)

## Presentation contract

-   **Format:** narrated HTML proposal with illustrative product states.
-   **Target runtime:** 4:50, with a ten-second buffer before 5:00.
-   **Audience:** preliminary-submission judges.
-   **Primary proof moment:** `SYN-042` becomes `MISSING_CASE` at 2:45.
-   **Human role:** routine supported work proceeds automatically; one named
    reviewer owns each material exception.
-   **Build truth:** the current application shell is shipped, while the
    product workflows shown here remain proposed work.
-   **Claims rule:** do not speak a performance result until its retained
    artifact identifies the tested commit, inputs, provider versions and run.

## Timed script

### 0:00-0:30 - Slide 1 - The human capacity problem

**Screen:** Show the 2,000-email workload and the three derived staffing
figures.

**Narration:**

> Two thousand emails can arrive on a busy day.
>
> Microsoft reports the average worker receives one hundred seventeen emails
> daily.
>
> This workload equals roughly seventeen average inboxes.
>
> At sixty seconds each, reading alone consumes thirty-three uninterrupted
> hours.
>
> That exceeds four full eight-hour shifts, before verification or decisions.
>
> Sixty-eight percent of workers report insufficient uninterrupted focus time.

**Action:** Point from `2,000` to `33.3 hours`, then advance.

### 0:30-1:00 - Slide 2 - The cost of one miss

**Screen:** Show direct exposure, continuing delay charges and the reputation
pathway. Keep the qualification visible.

**Narration:**

> Missing one email does not automatically cost five thousand two hundred
> ringgit.
>
> But a qualifying late amendment can create a two-hundred-ringgit fee.
>
> It may also attract a customs fine up to five thousand ringgit.
>
> Published delay charges can reach eight hundred fifteen ringgit per
> container daily.
>
> Delay also creates rework, missed sailings, payment disruption, and broken
> customer promises.
>
> Reputation suffers when the customer discovers our failure before we do.

**Action:** Point to `conditional exposure`, then trace direct cost to customer
impact.

### 1:00-1:30 - Slide 3 - Designed for the daily workload

**Screen:** Show the 250-per-hour capacity requirement and the proposed
received-message pipeline.

**Narration:**

> LadingLens is designed for the entire daily workload, not one demonstration
> file.
>
> Two thousand messages across eight hours requires two hundred fifty every
> hour.
>
> Gate One classifies every received message before valid comparison requests
> move forward.
>
> Valid SI and draft-BL pairs enter the seven-field comparison.
>
> Routine supported outcomes avoid manual re-entry; exceptions enter review.
>
> We will claim that capacity only after retained throughput and latency
> benchmarks.

**Action:** Trace classify, compare and review. Leave `MEASUREMENT PENDING`
visible.

### 1:30-2:05 - Slide 4 - The mandatory second gate

**Screen:** Reveal the inbox control, the independent shipment control and the
shared exception queue.

**Narration:**

> Speed and accuracy still cannot find an email that never arrived.
>
> The inbox classifier sees only messages received by our system.
>
> It cannot flag mail never sent, blocked upstream, or otherwise missing.
>
> So two independent controls run in parallel.
>
> Gate One accounts for every received email and its outcome.
>
> Gate Two starts from expected shipments and searches for matching cases.
>
> A booking, TMS, ERP, carrier feed, or demo CSV supplies that expectation.
>
> Disagreement becomes an owned exception, never a silent success.

**Action:** Reveal Gate 1 and Gate 2 together, then show their shared handoff.

### 2:05-2:30 - Slide 5 - Inspectable accuracy

**Screen:** Show a synthetic SI and draft Bill of Lading side by side, with
seven comparison rows and one open evidence anchor.

**Narration:**

> Accuracy must be inspectable, not assumed.
>
> Every valid comparison shows all seven required shipment fields.
>
> The original SI and draft-BL values remain beside each verdict.
>
> Selecting a field opens its supporting source location.
>
> We measure field accuracy, discrepancy recall, and false alerts on held-out
> data.
>
> Until that artifact exists, no numeric accuracy claim belongs here.

**Action:** Open one source location before advancing.

### 2:30-2:45 - Slide 6 - Failure and decision ownership

**Screen:** Show missing, corrupt and unclear inputs flowing to one named
review owner.

**Narration:**

> Missing, corrupt, or unclear evidence stops at NEEDS REVIEW.
>
> One named reviewer receives the source, reason, and authority to decide.
>
> The organisation remains accountable; the system does not shift blame.

**Action:** Leave the named-owner handoff visible, then advance.

### 2:45-3:35 - Slide 7 - Find the case the inbox cannot see

**Screen:** Begin with the expected-shipment row for `SYN-042`. Keep the case
side concealed until the reveal cue.

**Narration:**

> Now consider synthetic shipment SYN zero four two.
>
> Its lifecycle says a draft Bill of Lading case is expected.
>
> Reconciliation checks the independent case ledger.

**Action:** Trigger the reveal. Do not speak for three seconds.

> No matching email. No case. MISSING CASE.
>
> The inbox classifier could never expose this absence.
>
> Gate Two found it without waiting for another email.
>
> It also provides the booking, cutoff, owner, and source freshness.
>
> The reviewer handles one material exception, not two thousand routine
> messages.

**Action:** Hold the expected row and empty case side together before
advancing.

### 3:35-4:05 - Slide 8 - The honest implementation boundary

**Screen:** Show what is shipped on `main` and what remains proposed.

**Narration:**

> Here is the honest implementation boundary on main today.
>
> The React landing page, authentication shell, guest session, and route
> guards are shipped.
>
> FastAPI readiness and the Cloud Run delivery scaffold also exist.
>
> Product routes for inbox, comparison, reconciliation, review, and evaluation
> remain placeholders.
>
> Those workflows must ship before we present this as a live operational
> system.

**Action:** Read shipped first, then the remaining workflow. Do not blur the
boundary.

### 4:05-4:30 - Slide 9 - Prove speed and accuracy

**Screen:** Show the release-gate checklist. Do not display unverified numbers.

**Narration:**

> Low latency and high accuracy are release gates, not marketing adjectives.
>
> We measure throughput, end-to-end median, and p ninety-five on the candidate
> path.
>
> We measure field accuracy, discrepancy recall, false alerts, and automatic
> completion.
>
> Every result names its tested commit, inputs, model versions, and run.
>
> No number enters the final deck without its retained artifact.

**Action:** If verified metrics exist, reveal them from their retained
artifact. Otherwise, keep `MEASUREMENT PENDING` visible.

### 4:30-4:50 - Slide 10 - Close on the control loop

**Screen:** Show the proposal proof, production path and target judge route.

**Narration:**

> The preliminary proposal targets synthetic data and a public judge route.
>
> Next come the complete product workflow and authenticated operational feeds.
>
> LadingLens reduces repetitive checking without pretending uncertainty
> disappeared.
>
> Do not trust the summary. Open the source. Find the missing case.

**Action:** Hold the final line for three seconds.

## Primary proof moment

-   **Setup:** establish that `SYN-042` has reached `DRAFT_BL_EXPECTED`.
-   **Action:** reveal the empty case match and `MISSING_CASE` together.
-   **Pause:** three seconds before explaining the result.
-   **Audience sees:** an independent expected row, its lifecycle state, and no
    matching inbox case.
-   **Spoken reveal:** "No matching email. No case. MISSING CASE."
-   **Why it matters:** the inbox cannot classify an email that never arrived;
    the independent ledger makes the absence observable.

## Transitions

-   Slide 1 to 2: "And missing one actionable message can be expensive."
-   Slide 2 to 3: "More inbox reading is not a reliable control."
-   Slide 3 to 4: "But speed and classification still leave one blind spot."
-   Slide 4 to 5: "Once a case exists, its decision must be trustworthy."
-   Slide 5 to 6: "Accuracy also means knowing when not to answer."
-   Slide 6 to 7: "One failure remains invisible outside this review path."
-   Slide 7 to 8: "That proof remains separate from what is already shipped."
-   Slide 8 to 9: "The remaining claims must be earned with measurements."
-   Slide 9 to 10: "Those gates turn a proposal into operational evidence."

## Fallback language

If a live provider fails, keep the failed state visible and say:

> The live provider failed; this is the prepared fallback.

Use a different prepared synthetic example with its own input, result and
evidence. Never describe the failed unseen input as successfully processed.

If timing slips, remove the average-inbox sentence from Slide 1 and the
reputation sentence from Slide 2. Do not cut the two-gate explanation, unsafe
evidence handoff, `SYN-042` reveal, three-second pause or final line.

## Rehearsal checklist

-   [ ] Present at 1920x1080 with browser zoom at 100%.
-   [ ] Disable operating-system and browser notifications.
-   [ ] Close personal tabs, password prompts and messaging applications.
-   [ ] Load the deck locally and verify arrow, Space, Home, End, `F` and `N`.
-   [ ] Confirm the deck timer resets and reaches Slide 7 near 2:45.
-   [ ] Use only a dedicated demo account or guest session.
-   [ ] Load the synthetic inbox, SI/BL pair and expected-shipment ledger.
-   [ ] Confirm `SYN-042` shows `DRAFT_BL_EXPECTED` and no matching case.
-   [ ] Confirm corrupt and unclear file examples expose no fabricated values.
-   [ ] Keep labelled fallback captures available offline.
-   [ ] Rehearse twice without recording and once with the final microphone.
-   [ ] Verify the final recording ends by 4:50 and never exceeds 5:00.
-   [ ] Replace pending evidence only with artifacts from the presented commit.

## Evidence notes

-   **Workload:** the challenge brief states up to 2,000 emails daily.
-   **Email average:** Microsoft Work Trend Index 2025 reports 117 emails per
    worker daily; many are skimmed in under 60 seconds.
-   **Focus:** Microsoft Work Trend Index 2023 reports 68% of people lack
    enough uninterrupted focus time.
-   **Staffing calculation:** `2,000 / 117 = 17.1` average inboxes;
    `2,000 x 60 seconds = 33.3 hours`, or more than four eight-hour shifts.
    The 60-second handling time is an illustrative scenario, not a benchmark.
-   **Direct exposure:** a qualifying Malaysia amendment may involve a MYR 200
    fee and a customs fine up to MYR 5,000. This is conditional exposure, not a
    universal cost per missed email.
-   **Delay:** Maersk Malaysia publishes post-free-time charges ranging from
    MYR 80 to MYR 815 per container daily, depending on equipment and tier.
-   **Reputation:** present the pathway from delay to customer-visible failure,
    complaint and renewal risk. Do not state an Averis-specific loss forecast.

Primary public sources:

-   <https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday>
-   <https://info.microsoft.com/rs/157-GQE-382/images/SREVM16705-CNTNT.pdf>
-   <https://www.maersk.com/local-information/asia-pacific/malaysia/import>
-   <https://www.pwc.com/us/en/services/consulting/commercial-excellence/library/2025-customer-experience-survey.html>

## See also

-   [Preliminary deck source](/docs/pitch/preliminary-deck.html)
-   [Five-minute demo spine](/docs/research/ideation/demo-spine.md)
-   [Pitch narrative and claims boundary](/docs/pitch/pitch-narrative.md)
-   [LadingLens design system](/docs/DESIGN.md)
