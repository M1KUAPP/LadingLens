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

## Rectifying actions

All six findings were fixed in the fix commit on this branch and re-verified
locally against the rebuilt app (production `dist` served by the FastAPI app on
`localhost:8080`, API stubs only for session/policy — the verified surface runs
on the bundled fixtures). Post-fix screenshots are `screens/fixed-*.png`;
the automated re-verification (`reverify` pass) is 14/14 green. Note: PR #95's
post-auth rework landed on `main` between the pass and the fix, so the fixed
screens show the new shell; the findings were data-contract issues and carried
over unchanged.

- [x] **F-01 — CSV importer accepts the downloadable artifact.**
  `features/reconciliation/csv.ts` now accepts the served 10-column artifact
  header (RFC-4180 quoted-field parsing for the embedded JSON cells;
  `external_identifiers`/`required_documents` JSON-parsed, `source_updated_at`
  ISO-validated) alongside the legacy 7-column header. Re-verified: dropping
  the downloaded `expected-shipments.csv` into `/review` imports `6 rows
  imported` (`screens/fixed-csv-import.png`). Covered by `csv.test.ts`.
- [x] **F-02 — fixture outcomes synced to the artifact.**
  `data/inbox-fixture.json` outcomes regenerated verbatim from the served
  `submission.json` (0/520 disagreements); `data/sample-submission.json` (what
  the "Download submission JSON" button serves) replaced with the served
  artifact — it was 520×`OK`. `/evaluation` now shows `OK 457 / MISMATCH 46 /
  NEEDS_REVIEW 17` and `129` comparisons (`screens/fixed-evaluation.png`);
  `email_004` renders a real inspectable MISMATCH detail regenerated from
  `GET /api/emails/email_004` (`screens/fixed-email-004.png`), and
  `email_001`/`507`/`511`/`516` fixtures were regenerated from the API records
  (`email_001` is now `OK`, matching the artifact).
- [x] **F-03 — one ledger.** The bundled `expected_shipments.csv` is now the
  served artifact verbatim (6 rows), and `reconcile.ts` derives the same 130
  results as `/api/reconciliation`: `CASE_PRESENT 1`, `DOCUMENT_MISSING 1`,
  `MISSING_CASE 1` (`SYN-042` only), `SOURCE_STALE 1`,
  `DUPLICATE_OR_AMBIGUOUS 1`, `UNMATCHED_CASE 125`, with server-mirrored
  `match_basis` field names and `case_ids` (`screens/fixed-reconciliation.png`).
  Eval shows `UNMATCHED_CASE 125` via a fixture `unmatched_case_count` field
  plumbed through `InboxDataset`. The review queue surfaces all 129
  non-`CASE_PRESENT` results plus the 4 held cases (133 items).
- [x] **F-04 — friendly size hint.** Upstream PR #95 independently fixed
  `DropZone.formatCeiling` to one-decimal rounding; this branch keeps that
  convention and mirrors it in `UploadPanel`'s copy so both render `5.2 MB`
  for the 5242880-byte limit (`screens/fixed-judge-hint.png`).
- [x] **F-05 — jargon removed.** Run ids render as `Run 001`/`Latest run 001`
  via `formatRunId` (numeric suffix, `run_prepared_*` no longer visible); the
  latency panel now reads "Awaiting fresh extraction benchmark" — no model
  names in UI copy.
- [x] **F-06 — exact enum strings shown.** `data/inbox-labels.ts` renders the
  contract enums verbatim: `NEEDS_REVIEW`, `missing_attachment`,
  `MISSING_CASE`, `UNMATCHED_CASE`, `CASE_PRESENT`, etc. appear exactly as in
  the submission artifact, everywhere status/reason/outcome pills render
  (`screens/fixed-inbox.png`, `screens/fixed-email-507.png`,
  `screens/fixed-reconciliation.png`). Non-contract display fields (lifecycle,
  required-document names, freshness) keep PR #95's humanized labels.

## Sign-off

The locked demo spine is completable end-to-end by a first-time user with no
account and no presenter help: guest sign-in, 520/520 inbox, exact five-key
submission artifact, a live judge-supplied pair with seven fields and
evidence, the `email_507` refusal, `SYN-042` missing-case peak, owner/action
visibility, and guest-scoped Reset All all verified against the deployed
build. Copy is clean domain language with working `i`-icon tooltips.

**Result: PASS.** The original pass was conditional on disposition of F-01
through F-06; all six are now **fixed** (see Rectifying actions), re-verified
against the rebuilt app: the downloadable CSV imports (`6 rows`), the inbox
and `/evaluation` report the artifact's real 457/46/17 distribution, a
`MISMATCH` record (`email_004`) is inspectable in the UI with provenance,
`SYN-042` is the sole `MISSING_CASE`, the size hint reads `5.2 MB`, internal
run/model identifiers are out of normal copy, and the contract enums render
verbatim.
