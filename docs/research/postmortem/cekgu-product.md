# Cekgu Product

An account of what a judge saw, heard and felt during Cekgu's
three-minute pitch in the GonkaRouter "AI for Society" track, and of
what that perception lacked. Every observation is anchored to the deck,
the stage script, the screenshots or the Devfolio submission.

## The One-Sentence Hook

The project describes itself slightly differently on every surface:

- Slide 01 of the deck: "The answer key is wrong. Nobody checked." with
  the lead "A second opinion on every question, before the marks are
  in."

- `docs/submission/devfolio.md`, tagline: "Two blind AI readers before
  learners see it."

- `cekgu-pitch/positioning.md`, "The one sentence": "The answer key is
  the only document in a school that carries the authority of fact and
  the reliability of a first draft. Cekgu audits it before the students
  sit the paper."

- The landing page hero (`docs/assets/landing.png`): "Two readers see
  your paper before your learners do."

Does the sentence make a listener want to see more? Partly. "The answer
key is wrong. Nobody checked." has genuine punch — it names a defect and
a vacuum in six words.

But every version of the hook then explains the product as _two models
read, one rule compares_, which a judge reconstructs instantly as two
API calls and an if-statement.

It does not sound ambitious. The Devfolio description opens "Cekgu is a
pre-publication quality check for multiple-choice practice papers"
(`docs/submission/devfolio.md`) — an honest category, and a small one.

The hook sells a careful utility, and a careful utility is what the room
heard. Nothing in the first fifteen seconds suggests the product could
not have been built by any team in the track.

## The Stakes

The problem: a teacher writes a quiz and an answer key in one sitting,
the key is sometimes wrong, and nobody independently re-solves the paper
before it goes out (`cekgu-pitch/positioning.md`, "Why the problem
exists").

The cost, per slide 02's headline: "A quiz goes out with the wrong
answer marked. Every student loses that mark." One mark, on a practice
quiz.

The beneficiary is nominally the student who loses that mark;
operationally it is the independent tutor — slide 08's foot line reads
"The first buyer is an independent tutor, not a university procurement
office."

A judge can picture her only faintly: she is "she" in two slide
headlines ("She reads three questions instead of twelve.", slide 03),
never named, never shown.

Worse, the pitch keeps shrinking the stakes out loud. The opening
concedes the incumbent process works — "That process is careful."
(script, section 2).

The Q&A confines the product to "practice sets, past-year papers and
question banks" because confidential exams cannot be uploaded to the
network (script, section 12). `docs/PRODUCT.md` files every commercial
claim as `[ASSUMPTION]`.

Each narrowing is honest; each also tells the room the cause is small.
`cekgu-pitch/positioning.md` instructs "Fairness is the hook.
Correctness is the proof." — but the fairness on display is one mark on
one quiz.

Held against a product serving disabled people or fighting
misinformation, the emotional weight is not close. A misplaced mark on a
tuition-centre practice quiz is a real unfairness and a modest one, and
no judge felt a room-sized problem arrive.

## The Demo Moment

From the run of show (script, section 0), the demo ran 1:14-1:44 —
thirty seconds, one page, one click. The app was already open on
`/sample`, signed out. Speaker: "Here it is on the deployed app."

Driver clicked `Show Evidence` on question 3 and the panel opened inline
beneath the item. On screen (`docs/assets/item-evidence.png`): the
supplied-key bubble filled on `A`, both reader columns filled on `B`.

Between them, the sentence: "Both readers chose Queue. The supplied key
is Stack. Rule: two verified readings agree on a non-key option, so
Possible Key Error."

The driver then pointed at the two `Request Id` values and the `Receipt`
fields, both `Verified`: "Two different models, two Gonka request ids,
both receipts verified. That's what proves this reasoning ran on the
network and not on our laptop."

The intended peak was the evidence panel — the script's own words: "A
judge sees the disagreement before anyone explains it." That part is
self-evident: two `B` bubbles against an `A` bubble needs no narrator.

But the punchline was spent in advance — fifty seconds earlier the
speaker had already told the room "The key says Stack. The answer is
Queue." The demo confirmed a result the deck had announced.

The receipt half was narrated, not demonstrated: "That id is on the
wall. Open the URL from your seat." offers verification as a
possibility rather than performing it.

And the whole record was stored evidence from 3 September — nothing on
screen had just happened.

What the script forbids tells the rest. "Do not submit a new check on
stage" — because "a one-question guest check submitted at 16:42 UTC on 5
September was still `Checking` with no recorded attempt twenty-five
minutes later."

Also forbidden: signing in, and ever presenting a recording as live. So
the judge never saw the product do its job: no paper entered, no model
called, no verdict produced in the room.

Two further details the judge saw without being told. Reader A in the
money shot is `moonshotai/Kimi-K2.6`, "delisted on 5 September" — a dead
model in the demonstration.

And per the script's own header, "nobody has walked section 6 with a
clock": the peak moment was never rehearsed end to end before the room
filled.

## Perceived Difficulty

On hearing the hook, a judge's first model of the build is the correct
one: send each question to two models, compare answers, show the
mismatch. Nothing in the pitch forced that estimate upward.

Several spoken lines pushed it down. The pitch's candour reads as
smallness: "One Bun process." "Every model call leaves from one file."

The resilience story — the night's Kimi delisting — was told as "We
changed one line: the list of model families. Nothing else." (script,
sections 8 and 9). A judge hears a config edit, not engineering.

What signalled difficulty was real but invisible: the queue worker and
`SKIP LOCKED` on slide 06's diagram, the hedging and receipt-polling in
`devfolio.md`'s challenges, the health window, the fail-closed rule.

All backend, all narrated. The thing on the projector — a clean record
page with two model answers and two request ids
(`docs/assets/item-evidence.png`) — is visually indistinguishable from a
ChatGPT wrapper with good hygiene.

The one number suggesting rigour, "14 of 20 planted defects caught, 0
false alarms" on slide 07, arrived as a claim about a benchmark the team
ran on its own fixture — asserted, not shown.

Net perception: the difficulty lived in the talking, not in the
artifact.

## What A Judge Could Do Themselves

| Action                              | What it takes                                                                                                | What they see                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Scan slide 09's QR / open `/sample` | A phone, no sign-in                                                                                          | The 12-question record, Truth Score 77, three flagged items, both readers' answers, model names, request ids |
| Open the receipt URL on slide 05    | Type or paste `api.gonkarouter.io/v1/receipts/req-1788427238422211326-414866`                                | Raw gateway JSON: `outcome: success`, `model: MiniMaxAI/MiniMax-M2.7` — true, and dull                       |
| Sign In as Guest and run a check    | One click on `Sign In as Guest`, then `Fill With Demo Content`, `Submit Check` (`docs/assets/new-check.png`) | A new record sitting at `Queued` — a real check did not finish inside twenty-five minutes in rehearsal       |
| Watch the submitted film            | The youtu.be link on the Devfolio page                                                                       | A 4:42 recording of the same stored record, then a deck walk                                                 |
| Open the repository                 | The `github.com/MUBA-M1KU/Cekgu` link on slides 01 and 09                                                    | Source and README, for the few judges who read code from their seat                                          |

The honest answer is that only the first two worked from a chair, and
both show a result, not the product producing one.

The third row is the action that would have proved the product, and it
could not finish.

## What The Pitch Was Missing

1. **A living product.** The only thing that moved in the room was one
   click opening a stored panel.

   The script is explicit: "**Do not submit a new check on stage**," and
   "(A LIVE CHECK TAKES MINUTES, NOT SECONDS. Offer the queued state,
   never a finished verdict.)" A judge left having seen proof that a
   check once ran — never Cekgu running.

1. **A beneficiary worth the track.** This was "AI for Society," and the
   cause on stage was a tutor's practice quiz.

   Slide 02 stakes the whole problem on "Every student loses that mark";
   slide 08 names the buyer "an independent tutor"; the Q&A excludes
   confidential exams — the only papers where the stakes are high —
   because "node operators can see prompt text."

   Every honest narrowing shrank the cause further.

1. **Anything that looked hard to build.** The visible artifact is a
   tidy record page; the engineering — queue, hedging, receipt polling,
   health demotion — existed only in sentences.

   Worse, the script's pride in restraint deflated it: "Every model call
   leaves from one file," "We changed one line." A wrapper impression was
   available to every judge who wanted one, and nothing on screen
   contradicted it.

1. **An exhibit for the flagship claim.** "Cekgu never guesses" is the
   product's moral centre and it had no artifact: the sample chip reads
   `Unverified 0` (`docs/assets/sample-report.png`).

   The script bans promising one — "Nothing in the pitch may promise a
   judge one" — while the team's own evaluation hit Unverified in 19 of
   60 runs and the slide shows none. The most differentiating behaviour
   could only be described, never pointed at.

1. **A number that survives scrutiny.** "14 of 20 planted defects" were
   planted by the team and graded on the team's fixture; the same run's
   "Unverified rate, 19 of 60, is deliberately off the slide" (script,
   section 9).

   The Truth Score 77 sat on screen all demo and no spoken line named
   it — `cekgu-pitch/pitch-script-raw.md` flags it "visible on stage,
   spoken only in Q&A."

   And the demo item itself is CS trivia the room solved instantly
   ("Let the room solve it. Most of them will."), so catching it showed
   the mechanism, not value a human lacked.

1. **The blockchain the venue implied.** At a blockchain hackathon the
   pitch kept disclaiming the chain: the receipt is "gateway metadata,
   not cryptographic proof and not an on-chain transaction" (script,
   section 7; same words on `docs/assets/receipt.png`).

   The one artifact a judge could verify is a JSON blob that proves
   which model answered — and nothing about whether the answer was
   right. The receipt page itself is a sparse table and an Open button:
   it looks like a debug panel, not a proof.

1. **Evidence the performance was settled.** Two conflicting scripts
   existed on the morning of the pitch.

   `docs/demo/pitch-script.md` runs signed-out `/sample`, one click;
   `cekgu-pitch/pitch-script-raw.md` runs Guest sign-in and mascot cats,
   a 4:04 runtime with "Still 64 s over 3:00".

   The chosen script concedes "nobody has walked section 6 with a
   clock." A judge may well have perceived a pitch still being
   negotiated.

   On `docs/assets/dashboard.png` and the record's summary card, two
   unexplained Live2D cats watch the demo; their only defence lived in
   a Q&A answer ("licensed Live2D sample characters") that was likely
   never asked.
