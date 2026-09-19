# MUBA Postmortem

Why the MUBA 2026 entry placed 4th, read at the level a judge actually
experiences: the hook, the stakes, the demo, and what the room was left able
to check. Five audits sit underneath this page, two on code and three on
product.

The product findings are the ones that matter. The code findings are kept for
completeness and should not drive decisions.

Contents:

1.  [Correction On iSuara](#correction-on-isuara)
1.  [The Recipe](#the-recipe)
1.  [Where Cekgu Lost Each One](#where-cekgu-lost-each-one)
1.  [The Single Sentence](#the-single-sentence)
1.  [Applying It To Averis](#applying-it-to-averis)
1.  [What The Code Audits Found, And Why It Is Secondary](#what-the-code-audits-found-and-why-it-is-secondary)
1.  [The Files](#the-files)

## Correction On iSuara

The second-place project is real and well documented, but the recollection it
was briefed from is wrong in three places. iSuara is a Universiti Malaya team
("sudo rm -rf /") whose verified placement is **1st Runner-Up at KitaHack
2026**, a Google developer-group event around April 2026 — not MUBA. No source
links it to MUBA, though MUBA's Devfolio publishes zero projects, so its
absence there proves little.

The pipeline is **one-directional**: Bahasa Isyarat Malaysia to Malay speech.
There is no reverse direction and no Three.js avatar; the stack is Kotlin,
MediaPipe, an on-device LiteRT BiLSTM, Gemini for grammar, and Android TTS.
The physical monitor could not be verified either way.

What survives, and is the useful part: a low-spec Android app for deaf users,
45+ FPS on an eight-year-old phone, fully offline except a sub-1KB text call.

## The Recipe

Six properties the winners share and Cekgu lacked. They are independent, and
Cekgu missed all six.

1.  **A problem the judge already believes.** OpenVerdict spent zero minutes
    arguing that misinformation matters; it attached itself to that belief
    with two dated public failures — the March 2025 Polymarket resolution and
    Meta's 2025 fact-checking shutdown. iSuara cited 44,000 deaf Malaysians
    against 60 certified interpreters at RM150 an hour. A pre-believed
    problem is free pitch time.

1.  **A beneficiary the judge can render as one person.** "A deaf person
    alone at a clinic" draws itself. So does a trader who lost money on a
    resolution nobody could inspect.

1.  **Visible difficulty.** The thing on the projector has to look hard. A
    courtroom ring replaying a whole verification, per-turn node
    fingerprints, hash chains. Or a hand moving and a phone speaking, at 45
    FPS, on hardware from 2018.

1.  **Belief deferred to the judge, not requested from them.** This is
    subtler than "live demo". OpenVerdict's demo is _also_ narrated — a judge
    cannot tell what `SEALED 4/5` means unaided. What differs is the close:
    "Don't trust it. Recompute it.", with a `/verify` page, an audit CLI and
    an agent skill that make the dare executable from the seat.

1.  **Honest failure, exhibited.** OpenVerdict deliberately demoed an
    UNRESOLVED verdict and a claim that settled on "attempt 2 of 3" after a
    public void. Showing the system refuse is what proves it is not guessing.

1.  **Something that keeps pitching after you leave.** A live landing card, a
    downloadable APK, a public repo, a YouTube demo, one line that turns a
    judge's own agent into a re-pitching vector.

## Where Cekgu Lost Each One

| Property               | What the room got instead                                        |
| ---------------------- | ---------------------------------------------------------------- |
| Pre-believed problem   | A problem the pitch had to construct, then narrowed twice        |
| Picturable beneficiary | "She", never named, never shown                                  |
| Visible difficulty     | A tidy record page; the engineering lived in sentences           |
| Belief deferred        | A receipt proving which model answered, not whether it was right |
| Honest failure         | The chip read `Unverified 0`                                     |
| Keeps pitching         | A stored record from three days earlier                          |

Three details make the pattern concrete.

The pitch shrank its own stakes out loud. It conceded the incumbent process
works — "That process is careful" — then the Q&A confined the product to
practice papers, because confidential exams cannot be uploaded. Each narrowing
was honest, and each told the room the cause was small.

The pitch also bragged about restraint: "One Bun process." "Every model call
leaves from one file." On the Kimi delisting, "We changed one line." That is
engineering maturity, and a judge hears a config edit.

And the flagship claim had no exhibit. "Cekgu never guesses" is the moral
centre of the product, the sample showed `Unverified 0`, and the team's own
evaluation hit that state in 19 of 60 runs. The most differentiating behaviour
could only be described.

## The Single Sentence

**Both winners made the hard part visible and handed the judge a way to check
it. Cekgu made the hard part invisible, then apologised for how simple it
was.**

## Applying It To Averis

Shipping-document verification will not out-sympathise sign language, and
pretending otherwise reads as false. Four of the six are winnable on merit.

1.  **Name the person and show the pile.** Averis staff handle up to 2,000
    emails a day. Our dataset greets a real recipient by name — `email_004`
    opens "Hi Mitchelle,". Open the demo on 520 unread emails, not a
    dashboard. Drowning-in-inbox is pre-believed by every judge in the room.

1.  **Lead with the ugliest document we have, not the cleanest.** The bundle
    contains scanned PDFs, merged-cell spreadsheets, and Chinese labels —
    `Gross Weight毛重(KGS)` aligned against `Gross Wt (kgs)`. Watching that
    resolve looks hard because it is. A clean `.txt` side-by-side looks like
    a diff, which is Cekgu's tidy record page in a new domain.

1.  **Make correctness checkable by eye.** Click an extracted field, see the
    exact region of the source document it was read from. The judge verifies
    with their own eyes instead of trusting a number. This is our `/verify`
    equivalent and the cheapest way to buy Working Core Prototype (25) and
    Technical Feasibility and Validation (15).

1.  **Exhibit the refusal.** Seed the demo with an unreadable scan and a
    wrong document type and let the judge watch the system decline to guess,
    with its calibrated confidence on screen. The organisers named reliability
    and human review as where a solution stands out; Cekgu's identical claim
    shipped with no artifact. Most teams will skip this because it does not
    raise their self-score.

The non-negotiable underneath all four: **a judge must be able to hand us a
document we have never seen and watch it get read.** Cekgu forbade live
submission on stage because a real check hung for twenty-five minutes. That
single constraint is what cost them the demo, and it is an architectural
requirement for us, not a feature — it fixes a latency budget and forbids a
queue on the demo path.

## What The Code Audits Found, And Why It Is Secondary

For completeness, and with the caveat that judges do not read repositories at
this depth: by the 5 September deadline Cekgu's seven contributors had 209
commits and 14,328 lines of non-test TypeScript; OpenVerdict's single author
had 643 commits and 78,961 lines. Documentation volume was not the difference
— OpenVerdict wrote more of it.

Treat this as context on throughput, not as a finding to act on. The Cloud Run
deployment being down today is likewise not a finding; it was deliberately
shut off after the event and was serving on Demo Day.

## The Files

Product, which is what matters:

- [Cekgu product](cekgu-product.md) — the hook, the stakes, the thirty-second
  demo, and eight things the pitch was missing.
- [OpenVerdict product](openverdict-product.md) — the hook, the demo
  choreography, and nine transferable properties.
- [iSuara product](isuara-product.md) — what was verifiable, what was not,
  and seven transferable properties.

Code, kept for completeness:

- [Cekgu audit](cekgu-audit.md)
- [OpenVerdict audit](openverdict-audit.md)
