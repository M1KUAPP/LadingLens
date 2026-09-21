# Issue 42 acceptance evidence

Manual acceptance pass and copy review of the deployed preliminary build
against the issue #42 acceptance criteria. Executed as a first-time user on
the public URL; no code changed. Screenshots live in `screens/` beside this
document.

## Method

- App under test: deployed preliminary build at
  `https://averis-222536409832.asia-southeast1.run.app`.
- Deployed commit: `08a0792eae68bd212e3be177b416e327174bf485`
  (`GET /api/health` → `{"status":"ok","version":"08a0792…"}`).
- Browser: Chromium headless shell (Playwright 1.63.0), viewport 1440x900.
- Guest flow: real `Sign in as Guest` click on `/auth`; a second, storage-
  empty browser context exercised `/judge` with no account at all.
- API probes: `POST /api/session`, `POST /api/judge/runs`, `POST /api/reset`,
  `GET /api/summary`, `GET /api/artifacts/*` with `X-LadingLens-Session`
  headers, to verify artifact contents and guest isolation below the UI.
- Judge-supplied pair: `uat_si.txt` / `uat_bl.txt`, a fresh synthetic SI/BL
  pair (shipper "UAT MERIDIAN FOODS SDN BHD", booking `UATBK904217`) absent
  from the prepared examples. Both processed live.
- Capture driver: `capture.mjs` in this directory reproduces the walk.

## Demo-spine beats

| Beat | Result | Evidence |
| ---- | ------ | -------- |
| Inbox `520 received / 520 accounted for` | PASS — reads `520 received / 520 accounted for / 0 lost`, paginated `1-50 of 520` | `screens/inbox-520-counts.png` |
| Exact five-key submission record inspectable + downloadable | PASS — `Download submission JSON` returns 520 records; every record has exactly `category`, `status`, `review_reason`, `defect_fields`, `has_defect`; 46 `MISMATCH` records carry `review_reason: null`, `has_defect: true`, and a defect-field list | API probe of `/api/artifacts/submission.json`; `screens/judge-upload.png` |
| `/judge` accepts a fresh synthetic SI/BL pair | PASS — both `uat_si.txt` and `uat_bl.txt` classified correctly (Shipping instruction / Draft bill of lading), live check returned `All seven fields match` | `screens/judge-live-result.png` |
| All seven field rows + one evidence click | PASS — SHIPPER, CONSIGNEE, NOTIFY_PARTY, PORT OF LOADING, PORT OF DISCHARGE, CONTAINER COUNT, GROSS WEIGHT (KG) all rendered with verdicts; clicking the SHIPPER value opened source evidence `uat_si.txt Line 4, columns 9 to 35` with the extracted value and source excerpt | `screens/judge-evidence-click.png` |
| `email_507` held, no fabricated comparison | PASS — `NEEDS REVIEW` badge, `Missing attachment` review reason, `1 file detected`, refusal banner `Missing required draft bill of lading`; no seven-field grid is rendered | `screens/email-507-refusal.png` — see F-06 on enum spelling |
| Expected-shipment CSV imports; `SYN-042` `MISSING_CASE` | PASS via `Load prepared CSV` (`9 rows imported.`); `SYN-042` shows a `MISSING CASE` peak card and outcome row — see F-01: the downloadable CSV artifact is rejected by the importer | `screens/reconciliation-missing-case.png`, `screens/csv-prepared-loads.png`, `screens/csv-import-rejects-artifact.png` |
| Review owner and action visible | PASS — custody column shows assigned owners (Hafiz Tan, Aisyah Razak, …) with `Inspect` actions; `Escalate missing case` on each missing-case card; `email_507` review custody exposes `Approve sign-off` / `Correct values` / `Reject with reason` | `screens/review-queue.png`, `screens/email-507-refusal.png` |

## Guest-only sign-in

- `/auth` is a two-pane layout (brand panel left, sign-in panel right) with
  no topbar, footer, or nav — confirmed in DOM (0 `header`/`footer`/`nav`
  elements) and visually. `screens/auth-two-pane.png`.
- Email and password fields render but are presentational; `Sign in as
  Guest` is the only sign-in route. PASS.
- `/judge` loads with empty storage and no session — the page mints a guest
  session itself. PASS.
- `/settings` → `Reset All` opens a confirm dialog listing consequences,
  then reports `Demo data reset. You are on a clean workspace.` PASS.
  `screens/settings-reset-dialog.png`, `screens/settings-reset-done.png`.
- Guest isolation verified at the API: session A's judge run disappears
  after `POST /api/reset` (runs 1 → 0, summary back to 520/520) while
  session B's run is untouched (1 → 1). PASS.

## Copy review

- `i`-icon tooltips appear beside headings/subheadings on every route —
  `/inbox` 1, `/review` 5, `/emails/email_507` 3, `/evaluation` 1,
  `/settings` 2, `/judge` 1 — and open on hover, keyboard focus, and click
  (touch-equivalent). `screens/tooltip-hover.png`, `screens/tooltip-focus.png`.
- Critical warnings stay visible without tooltips: the judge synthetic-data
  banner, the `email_507` refusal banner, and the Reset All consequence list
  are plain body text. PASS.
- Body copy is domain language throughout; no internal jargon in normal UI
  text except the items filed below.

## Findings

Each item needs a fix or an explicit accept; owning issue in brackets.

- [ ] **F-01 — the downloadable synthetic CSV cannot be imported.**
  `Download synthetic CSV` on `/judge` returns
  `expected_shipments.csv` with header `source_system,shipment_id,…,source_freshness`,
  but the `/review` CSV importer rejects it: `Row 1: Header must be exactly
  "shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness"`.
  A judge who downloads the artifact and drops it into the importer hits an
  error. The prepared-fixture path (`Load prepared CSV`) works. Reconcile
  the two CSV contracts or accept that only the prepared fixture is
  importable. `screens/csv-import-rejects-artifact.png`. [F-38 / B-29]
- [ ] **F-02 — the bundled inbox fixture disagrees with the submission
  artifact on 49 emails; the UI can never show a MISMATCH.** All post-auth
  views (inbox, evaluation, email detail, review queue, reconciliation)
  render `apps/web/src/data/inbox-fixture.json` and sibling prepared
  fixtures, not the live API. That fixture's status distribution is
  `OK 500 / NEEDS_REVIEW 20` with **zero MISMATCH rows**, while the served
  `submission.json` holds `OK 457 / MISMATCH 46 / NEEDS_REVIEW 17`. 49
  emails disagree per-record (e.g. `email_004`, `email_013` render `OK` in
  the inbox where the artifact says `MISMATCH`). Downstream, `/evaluation`
  therefore shows `Processed status OK 500 / MISMATCH 0 / NEEDS REVIEW 20`
  and `129 BL comparisons` → `MISMATCH 0`; its reconciliation panel also
  lists `SYN-033 Unmatched case` where the reconciliation view says
  `MISSING CASE`, and `6 prepared shipments` against the ledger's 9 rows.
  A judge comparing the dashboard or an inbox row against the downloaded
  artifact sees `MISMATCH 0` where 46 mismatches exist. Fix: regenerate
  the fixture from the served seed/artifact or wire these views to the
  live API. `screens/evaluation-numbers.png`. [F-36, and anywhere
  inbox/email rows render `inbox-fixture.json`]
- [ ] **F-03 — three divergent "expected shipments" datasets.** The
  reconciliation view's prepared ledger has 9 rows and two `MISSING CASE`
  peak cards (SYN-033 and SYN-042); the downloadable artifact CSV has 6
  rows; the gate summary reports `Missing case (1)`. The demo spine names
  SYN-042 as the single unmatched peak, so a second missing-case card plus
  mismatched counts may confuse a judge cross-checking screens. Fix or
  explicitly accept as prepared-fixture latitude.
  `screens/reconciliation-missing-case.png`. [F-38 / B-29]
- [ ] **F-04 — file-size hint shows raw byte math.** `/judge` drop zones
  read `Accepts TXT, PDF, DOCX, XLSX up to 5.24288 MB` (5242880 B rendered
  as decimal MB). Should read `5 MB` or `5.2 MB`.
  `screens/judge-upload.png`. [F-39]
- [ ] **F-05 — internal identifiers in normal UI text.** `Run
  run_prepared_001` beside `Reconciliation outcomes`, and `Awaiting fresh
  Gemini 3.5 Flash benchmark` naming the model on `/evaluation`. Minor
  jargon; consider friendlier labels.
  `screens/reconciliation-missing-case.png`, `screens/evaluation-numbers.png`. [F-36 / F-38]
- [ ] **F-06 — status/reason strings are humanized, not the exact enum
  spellings.** The demo spine's judge-verifiable check expects the exact
  allowed strings (`NEEDS_REVIEW`, `missing_attachment`, `MISSING_CASE`);
  the UI renders `NEEDS REVIEW`, `Missing attachment`, `MISSING CASE`
  everywhere. The exact spellings survive only inside the downloaded
  `submission.json`. Either show the raw enum somewhere a judge can see it,
  or explicitly accept the humanized labels.
  `screens/email-507-refusal.png`. [F-37 / F-38]

## Sign-off

The locked demo spine is completable end-to-end by a first-time user with no
account and no presenter help: guest sign-in, 520/520 inbox, exact five-key
submission artifact, a live judge-supplied pair with seven fields and
evidence, the `email_507` refusal, `SYN-042` missing-case peak, owner/action
visibility, and guest-scoped Reset All all verified against the deployed
build. Copy is clean domain language with working `i`-icon tooltips.

**Result: PASS, conditional on disposition of F-01 through F-06** — none
blocks the spine as scripted (the submission artifact itself is exact), but
F-02 means no MISMATCH record is inspectable *in the UI* — the inbox marks
all 46 of them `OK` — and F-01 means the downloadable CSV cannot be
re-imported. Both should be fixed rather than accepted before #48.
