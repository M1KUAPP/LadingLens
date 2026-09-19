# Cekgu audit

Cekgu placed 4th in the GonkaRouter "AI for Society" track at the MUBA
Blockchain Hackathon 2026. This audit examines execution, not the idea:
what shipped, what a judge could see and verify, and where effort went.

Every claim cites a file, a symbol or a command output from the
repository.

## What shipped

| Surface                                                                                          | What it does                                                                                                        | Judge-reachable?                                                                |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/client/pages/Home.tsx` + `pages/home/`                                                      | Public landing page with hero, how-it-works, pricing, sample and trust sections                                     | yes                                                                             |
| `src/client/pages/SignIn.tsx`                                                                    | Email/password, Google OAuth and one-click shared Guest sign-in                                                     | yes                                                                             |
| `src/client/pages/SampleReport.tsx`                                                              | Public, signed-out, read-only view of the seeded 12-question record                                                 | yes                                                                             |
| `src/client/pages/ReceiptView.tsx`                                                               | Receipt viewer for one Gonka request id, backed by `/api/receipts/`                                                 | yes                                                                             |
| `src/client/pages/Dashboard.tsx`                                                                 | Verified-readings counts and per-family share for the account                                                       | yes (via Guest)                                                                 |
| `src/client/pages/NewCheck.tsx`                                                                  | Typed entry, paste-a-link and upload paths into a draft                                                             | yes (via Guest)                                                                 |
| `src/client/pages/Records.tsx`, `RecordWorkspace.tsx`                                            | Records library, verdict filters, evidence panel, dispositions                                                      | yes (via Guest)                                                                 |
| `src/client/pages/Settings.tsx`, `Terms.tsx`, `Privacy.tsx`, `AcceptableUse.tsx`, `NotFound.tsx` | Settings, legal notices, fallback route                                                                             | yes                                                                             |
| `src/client/chat/` + `src/server/chat/`                                                          | Record assistant answering questions about one record via tools                                                     | unclear (`CHAT_PROVIDER` decides; nothing records whether it ran on stage)      |
| `src/client/mascot/`                                                                             | Live2D reader cats, state-driven, behind `MASCOT_ENABLED`                                                           | unclear (flag-gated; not in the pitch script's run of show)                     |
| `src/server/routes/records.ts`                                                                   | Record CRUD, items, dispositions, retries, SSE progress                                                             | yes (drives the app)                                                            |
| `src/server/routes/sample.ts`                                                                    | `GET /api/sample` public; `POST /api/sample/reset` used by rehearsals                                               | yes (GET only)                                                                  |
| `src/server/routes/receipts.ts`                                                                  | Public read-through to `GET /v1/receipts/{id}` on the gateway                                                       | yes                                                                             |
| `src/server/routes/extract.ts`                                                                   | `POST /api/extract`: image/PDF/link to a structured draft                                                           | yes via New Check, unclear whether the Gemini key was set on prod               |
| `src/server/routes/{auth,account,chat,health,stats}.ts`                                          | Guest/session auth, account deletion, assistant, health, stats                                                      | partially (`/api/health` and `/api/sample` are public; the rest need a session) |
| `src/server/queue/`                                                                              | In-process worker: claim, round, semaphore, health windows                                                          | no (invisible; only its outputs show)                                           |
| `src/server/gateway/`                                                                            | The single GonkaRouter egress: `callGonka`, model registry, reading admission                                       | no (code-level guarantee)                                                       |
| `src/server/transcribe/gemini.ts`                                                                | Image/PDF to printed text on Gemini, the non-Gonka exemption                                                        | yes via the upload affordance                                                   |
| `src/server/retrieval/tavily.ts`                                                                 | Web-search snippets shown to both readers, `include_answer: false`                                                  | partially (its pages render in the evidence panel)                              |
| `src/server/{guest,retention}.ts`                                                                | Guest expiry and record-retention sweeps                                                                            | no                                                                              |
| `src/server/{sample,seed}.ts` + `src/server/fixtures/`                                           | Seeds the sample record from a committed 3 September benchmark pass                                                 | no (its output is `/sample`)                                                    |
| `scripts/`                                                                                       | `capture-benchmark-pass.ts`, `check-anchors.ts`, `demo-record.ts`, `deploy-local.sh`, `scripts/demo/` film pipeline | no                                                                              |
| `e2e/`                                                                                           | Playwright smoke, flow and demo-walk suites against a deployed URL                                                  | no                                                                              |

## Build metrics

| Metric                                                                                               | Value                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Total commits on `main` (`git rev-list --count HEAD`)                                                | 253                                                                                       |
| Commits on or before the original deadline, 2026-09-05 23:59 MYT (`--before="2026-09-05T15:59:59Z"`) | 209                                                                                       |
| Commits on or before the extended deadline, 2026-09-06 08:00 MYT (`--before="2026-09-06T00:00:00Z"`) | 250                                                                                       |
| Commits after the extended deadline                                                                  | 3 (all docs, evening of 2026-09-06: placing badges and claim corrections)                 |
| First commit                                                                                         | 2026-08-26 (`28d9199`, "chore: scaffold workspace and organize organizer sources")        |
| Last commit                                                                                          | 2026-09-06 (`d641491`, "docs(submission): correct two claims a judge could check (#316)") |
| Source files under `src/`                                                                            | 172 (111 `.ts`, 57 `.tsx`, 1 `.css`, 1 `.html`, 2 `.json` fixtures)                       |
| TypeScript lines under `src/` excluding tests                                                        | 14,328                                                                                    |
| Test code lines, all                                                                                 | 7,738 (6,465 in `src/**/*.test.*`, 556 in `e2e/`, 717 in `scripts/demo/*.test.ts`)        |
| Markdown bytes under `docs/`                                                                         | 940,977 (39 files, 13,380 lines)                                                          |
| Bytes under `src/`                                                                                   | 1,035,384                                                                                 |
| Ratio of `docs/` Markdown bytes to `src/` bytes                                                      | 0.909                                                                                     |

The deadline in `docs/brief.md` was extended from 5 September 23:59 to
6 September 08:00 MYT, so both cutoffs are reported: 41 commits landed
between them.

Commit types: 88 `docs`, 61 `fix`, 48 `feat`, 22 `style`, 19 `chore`,
11 `test`, 1 `refactor`, 3 nonconventional.

## Track requirements

| Requirement                                                   | Evidence in code                                                                                                                                                                                                                                                              | Visible to a judge?                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. All AI reasoning and verification runs through GonkaRouter | `callGonka` in `src/server/gateway/client.ts` is the only model egress; `src/server/gateway/only-gonkarouter.test.ts` fails the build on any provider host outside `src/server/transcribe/` and `src/server/chat/`; `env.gonkaBaseUrlOpenai` defaults to `api.gonkarouter.io` | no — enforced in code and tests only; the pitch literally had to say "You can grep for it"                                                                                                                                      |
| 2. At least two models cross-verify                           | `MODELS` in `src/server/gateway/models.ts` (two families since Kimi's delisting); `runRound` in `src/server/queue/round.ts` seats two distinct families; `firstDistinctPair` in `src/shared/verdict.ts` requires distinct served models                                       | yes — the evidence panel shows both served model names; the interesting case: the pairing is visible, but one of the names is a model the gateway had already delisted                                                          |
| 3. Gonka Request IDs surfaced in the UI per inference step    | `x-request-id` captured in `callGonka`; `Request Id` fields and `/receipt/:requestId` links in `src/client/components/EvidencePanel.tsx`; `src/client/pages/ReceiptView.tsx`; public `GET /api/receipts/:requestId`                                                           | yes — the central beat of the stage demo and the MVP video                                                                                                                                                                      |
| 4. Explicit consensus logic for model disagreement            | `verdict()` in `src/shared/verdict.ts`: five outcomes in a fixed order with a printed reason per verdict                                                                                                                                                                      | partially — the reason string renders beside each verdict ("Rule: two verified readings agree on a non-key option, so Possible Key Error"), but the rule itself is a source file and a README table, not an interactive surface |

Two code-level exemptions a hostile judge could probe:
`src/server/transcribe/gemini.ts` calls
`generativelanguage.googleapis.com` for upload transcription, and
`src/server/chat/` keeps a Gemini path behind `CHAT_PROVIDER`.

`src/server/env.ts` defaults `chat.provider` to `gonka`, and
`only-gonkarouter.test.ts` forbids both directories from importing the
verdict rule or the record schema.

`src/server/retrieval/` calls Tavily but runs no model; the same test
pins `include_answer: false` and blocks it from the reasoning path.

## The demo surface

The slot was cut to 3 minutes plus 1 minute of Q&A the evening before
(`docs/demo/pitch-script.md`).

What a judge saw: a nine-slide deck, then 30 seconds inside the
deployed app on `/sample` — a public, read-only record seeded from a 3
September benchmark pass. The script's own words:

> **The whole demo is one page and one click.** `/sample` is public,
> read-only and served from stored evidence, so it needs no sign-in, no
> Guest workspace and no live gateway call. That is why it is the demo
> at three minutes: nothing in the path can be slow.

The strongest moment was the evidence panel on question 3: supplied
key Stack, both independent readers Queue, two served model names, two
request ids, both receipts `Verified`.

The disagreement is self-evident — a judge sees two filled `B` bubbles
against a filled `A` bubble before anyone explains it. The receipt half
is narrated but verifiable:

> "That id is on the wall. Open the URL from your seat. The gateway
> tells you which model served it. On a centralised API I can tell you
> I used two models. Here, you can check that I did."

That receipt still resolves: `GET api.gonkarouter.io/v1/receipts/
req-1788427238422211326-414866` returns `outcome: success` and `model:
MiniMaxAI/MiniMax-M2.7` as of 19 September.

It is the one claim in the pitch a judge could check from their own
phone — and the script knew it: "If a judge reaches for a phone here,
**stop and let them.**"

What a judge never saw: a live check. The script forbids it:

> `NOTE:` **Do not submit a new check on stage.** A one-question guest
> check submitted at 16:42 UTC on 5 September was still `Checking` with
> no recorded attempt twenty-five minutes later.

So the core loop — submit a paper, watch it get checked — was only
ever shown as a preserved artifact.

The Q&A prep concedes as much ("THE DEMO SHOWS A PRESERVED RECORD, NOT
A LIVE CALL. Say so plainly rather than implying the check just ran"),
but honesty in a speaker note changes nothing the room perceived.

## Where the effort went

`docs/` holds 940,977 bytes of Markdown against 1,035,384 bytes of
everything under `src/` — a ratio of 0.909. Against non-test source
only (672,202 bytes) the docs outweigh the code 1.40 to one.

`docs/superpowers/` alone — concept selection, competitor scans and
seven `verify-*.md` dossiers — is 436,620 bytes, two-thirds the size of
all shipped non-test code.

Named artifacts: `docs/TRD.md` is 118,135 bytes and 1,916 lines —
larger than any source file. `docs/PRODUCT.md` is 52,434 bytes of
beachhead analysis and `[ASSUMPTION]` pricing; `docs/PRD.md` 43,662;
`docs/DESIGN.md` 42,235.

The stage script is 38,751 bytes including three drafted openings, a
fallback ladder and Q&A answers for questions never asked.
`docs/superpowers/research/candidate-concepts.md` is 72,247 bytes
evaluating ideas that were not built.

The commit stream agrees: 88 `docs` commits against 48 `feat`, and 41
commits landed in the eight hours between the original and extended
deadlines — retrieval, the Truth Score and link extraction conceived,
shipped and documented overnight.

This project spent its budget deciding what to build and proving it
built the right thing — not on building.

To be fair: 14,328 lines of non-test TypeScript plus 7,738 of tests is
a real build, and much of the Markdown is judge-facing evidence —
marketing the rigour rather than stalling.

But the written case for the product is measurably bigger than the
product.

## Gaps a judge could have noticed

1. **The live demo was not live.** The 30-second app segment was a
   stored record; `docs/demo/pitch-script.md` section 6 forbids a real
   check — one submitted at 16:42 UTC was still `Checking` 25 minutes
   later. A judge asking "run one now" got a queue, not a verdict.

2. **Nothing is visitable now.** `cekgu-op7lf5dspq-as.a.run.app`
   answers Cloud Run 404 on every path today. It was live on Demo Day —
   the screenshots and Playwright captures prove it — but a revisiting
   judge finds a dead link; only the Gonka receipts still verify.

3. **The accuracy evidence was the team's own.** "14 of 20 planted
   defects caught, 0 false alarms" comes from
   `src/server/fixtures/evaluation-set.json`, self-graded. The same run
   produced 19 of 60 Unverified item-runs, kept off the slide.

4. **No users, and Practicality and Impact was 30% of the rubric.**
   "Nobody has paid us yet" was spoken on stage (pitch-script section
   10); every price in `docs/PRODUCT.md` is `[ASSUMPTION]`, no
   interviews run. Sean's PMF test had no evidence.

5. **Headline features shipped hours before judging.** 41 commits
   landed between the deadlines: retrieval, the Truth Score, link
   extraction, re-seeds. Commits #300–#311 are screenshot churn, so the
   UI a judge saw depended on the deploy minute.

6. **The flagship honest-failure state had no exhibit.** The sample
   has zero Unverified items — the chip reads `Unverified 0`. The
   fail-closed design could only be narrated, while their own
   evaluation hit that state in a third of runs.

7. **Two of four track requirements were invisible on stage.**
   Gonka-only reasoning and consensus live in
   `only-gonkarouter.test.ts` and `src/shared/verdict.ts` — real, but
   code. A judge sees "a test fails our build", not the test.

8. **The evidence names a dead model.** `src/server/gateway/models.ts`
   records `moonshotai/Kimi-K2.6` delisted on 5 September, yet the
   sample shows it as a reader and production runs the bare minimum of
   two families. One more delisting and every item is Unverified.

9. **Tests covered the demo path but half were ceremonial.**
   `e2e/demo.e2e.ts` walks the pitch's eight steps and caught defect
   #151 — but 77 tests skip without a live key or `TEST_DATABASE_URL`
   (`docs/TRD.md` section 18).

For balance: the one thing judges were told to look for — clear
documentation on the GonkaRouter integration — `docs/README.md`
delivers, with a per-requirement table citing the enforcing files.
