# LadingLens pitch deck script

Word-for-word narration for the thirteen-slide deck in
[ladinglens-deck.html](ladinglens-deck.html). It runs to 4:42 at a brisk but
unhurried delivery rate, leaving 18 seconds inside the five-minute
video cap. Every figure spoken here appears on the slide it is spoken over.

Contents:

1.  [Presentation contract](#presentation-contract)
1.  [Timed script](#timed-script)
1.  [Submission coverage](#submission-coverage)
1.  [Runtime budget](#runtime-budget)
1.  [Primary proof moment](#primary-proof-moment)
1.  [Transitions](#transitions)
1.  [Fallback language](#fallback-language)
1.  [Rehearsal checklist](#rehearsal-checklist)
1.  [Evidence notes](#evidence-notes)
1.  [See also](#see-also)

## Presentation contract

- **Deck:** [ladinglens-deck.html](ladinglens-deck.html), thirteen slides.
- **Target runtime:** 4:42, against a hard five-minute cap. One mark is
  deducted per thirty seconds over.
- **Pace assumption:** 2.8 words per second, or 168 a minute. Every span
  below is that slide's word count divided by the rate and rounded up, not
  guessed. Re-derive them if you rewrite a section.
- **Audience:** preliminary-submission judges.
- **Primary proof moment:** `SHP-5RFR-37631` surfaces as `MISSING_CASE` on slide 9,
  at roughly 3:18, after a three-second hold that is budgeted into the
  slide's span.
- **Build truth:** the service is deployed and the public `/judge` path runs
  live against the real providers. The seeded inbox is a prepared baseline
  and is labelled as one on screen.
- **Claims rule:** do not speak a performance result unless the slide shows
  its retained artifact. The only latency figure that may be spoken is
  25.6 s.

## Timed script

### 0:00-0:11 - Slide 1 - Cover

**Screen:** Cover. Wordmark, both promise lines, the three qualifiers, the
team row and the two links.

**Narration:**

> LadingLens. Every email accounted for. Every shipment answered for.
>
> We are Team T010NG, and this is a shipping inbox-control system built on two
> independent gates rather than one classifier.

**Action:** Advance on "classifier". Do not read the URLs aloud.

### 0:11-0:50 - Slide 2 - The volume

**Screen:** The two mismatched fields from email 065, the closing note, and
the manga panels on the right.

**Narration:**

> A freight desk can get two thousand emails in a day. For example: a client
> has arranged for a container of paper to be shipped from Port Klang to Tokyo.
>
> The carrier sends back its draft bill of lading to approve. Seven fields
> match, but two don't. Namely, the draft says the destination is to Korea
> instead of Tokyo, and a phone number that starts with the wrong country code.
>
> Either the draft bill is wrong or the client is, and nothing here says which.
> So, LadingLens flags such discrepancies for further review.
>
> Without LadingLens, a container of paper would
> have potentially sailed to the wrong country.

**Action:** Put a finger on Busan, then on VNSGN four words later, and let
the contradiction sit. That one line is the whole reason this cannot be a
string comparison. Close by sweeping the fee chips rather than reading them;
if asked, they "can" cost, never "do" — MYR 200 to amend, up to MYR 5,000 in
customs fines for an amendment inside five days of arrival.

### 0:50-1:21 - Slide 3 - The blind spot

**Screen:** The classifier panel on the left, the absence panel on the right.

**Narration:**

> That is just one email among thousands, caught. And every single email
> looks like the last.
>
> The obvious answer is to sort the inbox — and we assume that everything
> works perfectly: every message routed, every attachment read, every case
> owned.
>
> However, there is still one failure mode that walks straight through, which
> is never receiving a customer's email. There is nothing to misfile, nothing
> to misread, nothing to flag.
>
> To see an absence, you have to check the inbox against a second, independent
> record.

**Action:** Hold one beat on "never received" before continuing.

### 1:21-1:46 - Slide 4 - Double entry

**Screen:** Gate 1 on the left, Gate 2 and the `SHP-5RFR-37631` line on the right.

**Narration:**

> So we borrowed the answer from double-entry bookkeeping.
>
> Gate One asks one question of the inbox: did every message end on a
> recorded outcome? Each one is logged and hashed before anything else runs,
> then given one of five categories.
>
> Gate Two asks the opposite of a separate shipment list: did every shipment
> expecting a document actually get one? That list never comes from the inbox
> — the entire point.

**Action:** Do not reveal the `SHP-5RFR-37631` outcome yet; it lands on slide 9.

### 1:46-2:06 - Slide 5 - Provenance

**Screen:** The rule on the left, the four formats and the seven fields on the
right.

**Narration:**

> Every value the system reads is anchored back to the document it came from.
>
> So a verdict is not an opinion. Click one and the document opens at the
> exact characters it read — text, spreadsheets, PDFs and Word files alike.
>
> No anchor, no answer. A value we cannot point back at fails the run.

**Action:** Sweep the four format cards while saying "the same holds".

### 2:06-2:32 - Slide 6 - Decision ownership

**Screen:** The four-row register on the left, the two rules on the right.

**Narration:**

> So the software refuses a value it cannot ground. It refuses a second thing
> too.
>
> When two fields disagree it says so, shows both values and both sources, and
> hands the call to a person. It never decides the draft is wrong.
>
> Gemini reads scanned documents. A pinned judge model rules on meaning.
> Ordinary code does the arithmetic. A person decides anything consequential.
>
> And when a provider fails: fail closed, never fabricate.

**Action:** Land on the accented "Decides" row on "a person decides".

### 2:32-2:51 - Slide 7 - Try it yourself

**Screen:** The `/judge` workspace on the left, the five steps on the right.

**Narration:**

> You do not have to take that on trust. There is a public path at slash
> judge — no account, live against the real providers.
>
> Open the link and it just works, with no sign-in. Drop in any pair you
> bring, watch it run, then click a verdict through to its source.

**Action:** Say "slash judge" as words, never as a spelled URL.

### 2:51-3:03 - Slide 8 - Watch it run

**Screen:** The six-frame walkthrough and the QR panel.

**Narration:**

> Here is that path, run end to end. Six frames from the deployed service:
> guest entry, Gate One, the field comparison, Gate Two, the scored run, and
> your own pair at slash judge.

**Action:** Do not dwell. This slide exists so the judge can scan the QR.

### 3:03-3:29 - Slide 9 - All 520

**Screen:** The four statistics, the proportion bar, and the two gates.

**Narration:**

> Five hundred and twenty messages in, and all five hundred and twenty
> accounted for: four hundred and fifty-four clean, forty-six flagged,
> twenty refused.
>
> Nothing dropped. Nothing invented.

**Action:** Move to the Gate 2 card. Do not speak for three seconds.

> And Gate Two finds SYN zero four two. The ledger expects a draft bill of
> lading. There is no email, and no case. Missing case.
>
> No classifier could expose that absence — there was nothing to classify.

**Action:** Hold the Gate 2 card and the twenty-refused figure together
before advancing.

### 3:29-3:47 - Slide 10 - Architecture

**Screen:** The runtime panel on the left, the deploy gate on the right.

**Narration:**

> All of that runs on one Cloud Run service. FastAPI and the compiled React
> build ship as one origin, so there is no cross-origin surface at all.
>
> GitHub Actions deploys keylessly through Workload Identity Federation. No
> service-account key exists anywhere, and every deploy must pass a
> fail-closed smoke check.

**Action:** Point at the six deploy checks on "smoke check".

### 3:47-4:06 - Slide 11 - Claims boundary

**Screen:** The 25.6 s figure on the left, the scope of the build on the
right.

**Narration:**

> Now the number we missed. Our live path's p ninety-five is twenty-five
> point six seconds against a ten-second target. Twenty trials; five
> completed.
>
> We make no latency claim beyond what that retained artifact shows.
>
> Synthetic data only, enforced server-side. The inbox is a prepared baseline,
> labelled as one; only slash judge runs live.

**Action:** Say the run and commit only if a judge asks. They are on screen.

### 4:06-4:18 - Slide 12 - Roadmap

**Screen:** The near-term panel on the left, the ordered pair on the right.

**Narration:**

> Next: make the live path fast enough — concurrent calls, a warmer start,
> measured the same way.
>
> Then the real ledger, and only then real documents, once retention and
> access are signed off.

**Action:** Advance on "signed off".

### 4:18-4:42 - Slide 13 - Close

**Screen:** The three actions on the left, the two QR codes on the right.

**Narration:**

> The point is a desk that works by exception, not by volume: every message
> accounted for, every verdict traceable, a person named on the rest.
>
> So do not take our word for it. One link runs the system on a pair we have
> never seen; the other is every line behind it.
>
> Everything here is on screen at one of those links, or it is not claimed.

**Action:** Hold the QR codes on screen for three seconds after the last word.

## Submission coverage

The deck is one submitted component and the demo video is another. This script
is written so it satisfies the deck component on its own, and so it can be
recorded as the video narration without a rewrite.

**Slide deck / documentation** — the four topics the rules require:

| Required topic         | Slide   | Spoken at        |
| ---------------------- | ------- | ---------------- |
| Technical architecture | 10      | 3:29             |
| Implementation details | 4, 5, 6 | 1:21, 1:46, 2:06 |
| Challenges faced       | 11      | 3:47             |
| Future roadmap         | 12      | 4:06             |

**Demo video** — the five components the form requires, and where each lands:

| Required component | Slide | Spoken at  |
| ------------------ | ----- | ---------- |
| Team intro         | 1     | 0:00       |
| Problem            | 2, 3  | 0:11       |
| Tech stack         | 10    | 3:29       |
| Live demo          | 7, 8  | 2:32       |
| Impact             | 2, 13 | 0:11, 4:18 |

Two conditions apply if this script is recorded as the video rather than
delivered live:

1.  **The live-demo element needs moving pictures.** Slides 7 and 8 describe
    the `/judge` run and show six captured frames. For the video, cut to the
    screen recording over the slide 7 and 8 narration, following the beats in
    [demo-spine.md](../../research/ideation/demo-spine.md). A still filmstrip
    on its own is a weaker reading of "live demo walkthrough".
1.  **Re-verify the export against the clock.** The cap is five minutes, with
    one mark deducted per thirty seconds over. Check the exported duration in
    seconds, not the script estimate.

## Runtime budget

| Item                                  | Seconds |
| ------------------------------------- | ------- |
| Narration, 769 words at 2.8 a second  | 275     |
| Hold before "missing case" on slide 9 | 3       |
| **Total**                             | **282** |
| Hard cap                              | 300     |
| Headroom                              | 18      |

18 seconds is deliberate slack, not spare capacity. A narrator who runs
five per cent slow still lands inside the cap, and a mark is deducted per
thirty seconds over. If a take does run long, cut in this order: the volume
line closing slide 2, the runtime list on slide 10, then the second sentence
on slide 12. That recovers about twenty seconds without touching the
proof moment.

## Primary proof moment

- **Setup:** slide 4 establishes that the ledger is independent of the inbox
  and that `SHP-5RFR-37631` has an expectation. Do not resolve it there.
- **Action:** on slide 9, move to the Gate 2 card and hold three seconds of
  silence before speaking "missing case".
- **Point:** the absence is structural. Gate 1 cannot find it at any level of
  accuracy, because there is no message to be accurate about.
- **Follow-through:** pair it immediately with the twenty refusals, so the
  judge hears completeness and restraint as one design, not two.

## Transitions

Slides 3, 6, 8 and 10 open with their own hinge back to the slide before, so
they need nothing spoken between. These are the four junctions that do:

| From | To  | Line                                                    |
| ---- | --- | ------------------------------------------------------- |
| 1    | 2   | "Here is what one of those checks actually looks like." |
| 3    | 4   | "This is a solved problem, just not in software."       |
| 4    | 5   | "Two gates are only worth as much as their evidence."   |
| 8    | 9   | "That is one pair. Here is the whole run."              |

## Fallback language

- **The live demo is slow or down:** "The deployed path is under load, so I
  will walk the captured frames. The link stays open for the whole judging
  window and it is on the closing slide."
- **A provider fails mid-demo:** "That is fail-closed behaviour, and it is
  the behaviour we want. The upload stays retryable, and anything prepared is
  labelled prepared. It will not invent a result to cover the gap."
- **Asked for a latency claim beyond the deck:** "Twenty-five point six
  seconds is the only measured figure, and its artifact is in the
  repository. I will not quote a number we have not retained."
- **Asked whether the inbox numbers are live:** "The five-twenty baseline is
  a prepared seed from the organisers' synthetic bundle, labelled as
  prepared on screen. The live path is `/judge`."
- **Running long at slide 10:** cut the runtime card list and speak only the
  keyless deploy sentence. That recovers about eight seconds.

## Rehearsal checklist

1.  Time the whole run twice. If either take exceeds 4:50, cut from slides 2
    and 12 first; they carry the least load-bearing content.
1.  Open the deck in a browser at 1920x1080 and step it with the arrow keys.
    Every slide must fit without scrolling — `node apps/web/deckcheck.mjs
docs/pitch/deck/ladinglens-deck.html` asserts this.
1.  Scan both QR codes on slide 13 from the projected image, not the laptop.
1.  Confirm `/judge` answers from a signed-out browser on the morning of the
    pitch.
1.  Say "LAY-ding", "slash judge", "p ninety-five" and "SYN zero four two"
    out loud at least once. They are the four that trip people, and a
    text-to-speech pass will get "lading" wrong unless it is checked.

## Evidence notes

Every figure spoken in this script is on the slide it is spoken over.

| Figure                             | Slide | Source                                               |
| ---------------------------------- | ----- | ---------------------------------------------------- |
| 2,000 emails a day                 | 2     | Averis brief                                         |
| 520 / 520 / 0 lost                 | 4, 9  | Gate 1 completeness on the prepared seed             |
| 454 / 46 / 20                      | 9     | Prepared seed baseline, organisers' synthetic bundle |
| `SHP-5RFR-37631` -> `MISSING_CASE` | 9     | Gate 2 reconciliation                                |
| Seven compared fields              | 5     | `ComparedField` in `apps/api/app/contracts.py`       |
| Gemini 3.5 Flash, jev-1.13.0       | 6     | `docs/ai.md`                                         |
| 25.6 s live-path p95               | 11    | Retained artifact, run 35579538701                   |

## See also

- [ladinglens-deck.html](ladinglens-deck.html) - the deck this narrates.
- [pitch-narrative.md](../pitch-narrative.md) - approved source copy and the
  claims boundary.
- [preliminary-script.md](../archive/preliminary-script.md) - superseded
  script for the earlier ten-slide proposal deck.
