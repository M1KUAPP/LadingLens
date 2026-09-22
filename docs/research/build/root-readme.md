# Root README research

Research for issue #44: the root `README.md` was scoped by issue #44 but
deferred. PR #75 shipped the underlying README-level facts into `docs/`
(`architecture.md`, `ai.md`, `cloud.md`, `demo-runbook.md`,
`references/third-party-notices.md`) while the root file itself stayed
unwritten — the issue #44 comment thread confirms "the root `README.md`
was left out of this issue's scope... The README criterion itself is
still open for whoever owns it." This note collects the verified
repository facts, external platform facts, and Archify export/
customisation facts needed to write that file, plus a section mapping
issue #44's acceptance criteria to the facts that satisfy each one.

Contents:

1.  [Product identity and one-line description](#product-identity-and-one-line-description)
1.  [Live demo and header links](#live-demo-and-header-links)
1.  [Brand assets for the banner](#brand-assets-for-the-banner)
1.  [How it works, screens, and the screenshot table](#how-it-works-screens-and-the-screenshot-table)
1.  [Features: shipped and verifiable](#features-shipped-and-verifiable)
1.  [Architecture diagram inputs](#architecture-diagram-inputs)
1.  [Tech stack and verified badges](#tech-stack-and-verified-badges)
1.  [Getting started: prerequisites, install, and tests](#getting-started-prerequisites-install-and-tests)
1.  [Roadmap: open issues and milestones](#roadmap-open-issues-and-milestones)
1.  [Team and contributors](#team-and-contributors)
1.  [License](#license)
1.  [Acknowledgments](#acknowledgments)
1.  [GitHub's HTML support and heading anchors](#githubs-html-support-and-heading-anchors)
1.  [Dark/light images, relative paths, and SVG-as-image limits](#darklight-images-relative-paths-and-svg-as-image-limits)
1.  [shields.io and contrib.rocks embed syntax](#shieldsio-and-contribrocks-embed-syntax)
1.  [Archify: exporting a diagram for a README](#archify-exporting-a-diagram-for-a-readme)
1.  [Archify: design-system customisation and LadingLens's tokens](#archify-design-system-customisation-and-ladinglenss-tokens)
1.  [Issue #44 acceptance-criteria mapping](#issue-44-acceptance-criteria-mapping)
1.  [Open questions and contradictions](#open-questions-and-contradictions)

## Product identity and one-line description

LadingLens is a shipping inbox-control system built for the Averis x
Monash Hackathon 2026 (`docs/BRIEF.md`, "At a Glance", lines 21-32):
Averis's shipping-operations team receives up to 2,000 mixed emails a
day, and for a document-checking request an analyst must compare a
Shipping Instruction (SI) against a draft Bill of Lading (BL) whose
fields use inconsistent labels for the same value (`docs/BRIEF.md`,
"What Averis Does Today", lines 48-64; `docs/PRD.md`, "Problem and
users", lines 21-28). LadingLens adds two connected controls: Gate 1
accounts for every received email, Gate 2 independently reconciles an
expected-shipment ledger so a never-arrived email can still be caught,
and a valid SI/draft-BL pair is compared over seven fields with source
evidence, with a named human owning every consequential decision
(`docs/PRODUCT.md`, "Identity and pitch", lines 20-34).

Canonical one-sentence identity (`docs/PRODUCT.md:22-24`,
`docs/pitch/pitch-narrative.md:27-29`, verbatim in both): "LadingLens is
a shipping inbox-control system using double-entry bookkeeping to
reconcile expected shipments with cases and verify SI-to-BL decisions
against source evidence for human sign-off."

Proposed one-line README description (under ~120 characters, grounded in
the same two documents):

- **91 characters:** "LadingLens reconciles expected shipments and
  verifies SI-to-BL evidence for human sign-off."
- **Alternative, 107 characters:** "A shipping inbox-control system:
  reconciles expected shipments and verifies SI-to-BL evidence for
  sign-off."

Both trim the canonical sentence's "using double-entry bookkeeping"
clause, which is accurate positioning language but not essential to a
one-line description; either is safe to use verbatim since both are
direct compressions of `docs/PRODUCT.md` and `docs/pitch/pitch-narrative.md`,
not new claims.

## Live demo and header links

The deployed Cloud Run service is
[https://averis-222536409832.asia-southeast1.run.app](https://averis-222536409832.asia-southeast1.run.app),
and the public no-account judge route is
`https://averis-222536409832.asia-southeast1.run.app/judge`
(`docs/references/cloud.md:5-8`; repeated in
`docs/references/demo-runbook.md:301`). One Cloud Run container serves both the
FastAPI API and the compiled React app (`docs/references/cloud.md:3-4`), and the
deploy pipeline's smoke check independently re-verifies `/judge` stays public
and unauthenticated after every deploy (`docs/references/cloud.md:33-35`, citing
`apps/api/tests/test_smoke_deployment.py`).

For the template's two other header links, both of these exist today and
resolve:

- **Judge Mode** → the `/judge` path above. It needs no guest session or
  sign-in (`docs/references/architecture.md:281-289`), so it is safe to link
  directly from a README header.
- **Demo Runbook** →
  [`docs/references/demo-runbook.md`](/docs/references/demo-runbook.md), which
  renders on GitHub and gives a new reader the exact five-minute walkthrough
  (`docs/references/demo-runbook.md:296-345`).

A **Slide Deck** link is not yet safe to add: `docs/pitch/pitch-narrative.md`'s
"Publication gate" (lines 113-126) lists "Export or publish at an
accessible URL and test it in a logged-out browser" as an unchecked,
future step, and the only pitch content in the repo today is markdown
source (`docs/pitch/pitch-narrative.md`, `docs/pitch/archive/preliminary-deck.md`),
not a published deck URL.

## Brand assets for the banner

`docs/brand/` holds three SVG lockups (wordmark + mark) and matching
icon-only marks, all sharing one ten-arc ring built from the same path
data, differing only in stroke/fill colour:

| File                                                 | Text/neutral-arc colour                             | Accent arcs (fixed)                                          | Suits                                                                                                                                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`lockup-colour.svg`](/docs/brand/lockup-colour.svg) | `#0E1620` (near-black), 55% opacity on neutral arcs | teal `#0D9488`, orange `#C2410C`, indigo `#4F46E5`/`#818CF8` | **Light backgrounds**                                                                                                                                                                                                                     |
| [`lockup-dark.svg`](/docs/brand/lockup-dark.svg)     | `#E7EEF3` (near-white), 55% opacity on neutral arcs | same three accents                                           | **Dark backgrounds**                                                                                                                                                                                                                      |
| [`lockup-mono.svg`](/docs/brand/lockup-mono.svg)     | `stroke="currentColor"` / `fill="currentColor"`     | none — everything is `currentColor`                          | Only where CSS can set `color` (inline SVG or `<object>`) — **not** a plain `<img>`, since an image-context SVG has no inherited `color` to resolve (see [SVG-as-image limits](#darklight-images-relative-paths-and-svg-as-image-limits)) |

`mark-colour.svg`, `mark-mono.svg`, and `mark-favicon.svg` are 24×24
icon-only variants with the same colour logic; `mark-favicon.svg` uses a
simplified 7-arc path at `stroke-width="3"` (versus 10 arcs at `2.4` in
the others), sized for legibility at favicon scale, but it is not
currently wired as the app's actual favicon — `apps/web/index.html` has
no `<link rel="icon">` at all.

`mark-generated-01.png` (852.8 KB) is a large raster render of the same
ring mark, viewed directly: a light near-white background
(matching the `surface/raised` light token, `#F8FAFB`, from
`docs/DESIGN.md:82`) with the same teal/orange/indigo accent arcs against
grey neutral arcs — confirmed **light-background only**; it has no dark
variant. It is a plausible large hero/banner image, but its full-bleed
circular composition does not obviously crop to a wide banner strip the
way the lockup SVGs do.

**Recommendation:** use `lockup-colour.svg` as the banner's default image
and `lockup-dark.svg` as its dark-theme source, through a `<picture>`
element (see
[below](#darklight-images-relative-paths-and-svg-as-image-limits)), so
the banner reads correctly on both of GitHub's themes.

## How it works, screens, and the screenshot table

End-to-end flow (`docs/references/architecture.md`, `docs/references/ai.md`,
`docs/references/demo-runbook.md`):

1.  A guest mints an anonymous session on first API call
    (`POST /api/session`; `docs/references/architecture.md:232-239`) and, by
    default, sees a **seed baseline** — the real pipeline replayed once
    over the checked-in 520-email synthetic bundle at server startup,
    explicitly labelled `"prepared"` and never presented as live output
    (`docs/references/architecture.md:241-259`;
    `docs/references/ai.md:277-295`).
2.  **Gate 1** classifies every email into one of five categories
    (`BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL`, `SPAM`)
    and records an outcome for all 520
    (`docs/references/architecture.md:30-48`).
3.  **Gate 2** independently reconciles an expected-shipment CSV against
    the case ledger into one of six outcomes, including `MISSING_CASE`
    for a shipment with no matching email at all
    (`docs/references/architecture.md:50-72`).
4.  For a valid `BL_COMPARISON` pair, **evidence comparison** checks all
    seven fields against the SI as reference, with source evidence per
    field (`docs/references/architecture.md:74-104`).
5.  Extraction and typed decisions are split across two AI providers —
    Gemini 3.5 Flash for scanned/ambiguous-document extraction, pinned
    Jev `jev-1.13.0` for category/role/equivalence — inside deterministic
    Python for everything else (`docs/references/architecture.md:106-123`;
    `docs/references/ai.md:24-49`).
6.  A named human reviewer resolves anything held: approve, correct, or
    reject a case; assign, acknowledge, escalate, or resolve a
    reconciliation exception (`docs/references/architecture.md:112-113`;
    `docs/PRD.md:130-140`).
7.  The public **`/judge`** route lets an unauthenticated visitor upload
    one fresh SI/BL pair, runs it through the same live pipeline (never
    the seed baseline), and shows either all seven verdicts or a
    fail-closed error with a labelled `PREPARED FALLBACK` underneath
    (`docs/references/architecture.md:279-325`).
8.  **Reset All** (`/settings`) returns a guest's own workspace to the
    seed baseline exactly as shipped, so the walkthrough is repeatable
    (`docs/references/demo-runbook.md:274-294`).

Client routes are defined in `apps/web/src/routing/routes.tsx:49-117`.
Screenshots exist at `docs/verification/issue-41/screens/`, captured
1440×900 in both themes for seven of the app's nine routes:

| Screen        | Route              | File prefix                            | What it shows                                                                                                                |
| ------------- | ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Landing       | `/`                | `landing-1440x900-{light,dark}.png`    | Public marketing/pitch page; folds over the site footer (`routes.tsx:52-53` comment)                                         |
| Auth          | `/auth`            | `auth-1440x900-{light,dark}.png`       | Guest-only sign-in; Email/Password fields are presentational and never submitted (`docs/references/demo-runbook.md:226-229`) |
| Inbox         | `/inbox`           | `inbox-1440x900-{light,dark}.png`      | The 520-email seeded inbox (operator route, behind `OperatorGuard`)                                                          |
| Email detail  | `/emails/:emailId` | `email-1440x900-{light,dark}.png`      | One case's comparison grid and evidence viewer (`features/email-detail/`, `docs/references/architecture.md:187`)             |
| Review queue  | `/review`          | `review-1440x900-{light,dark}.png`     | Held cases and, under `?tab=reconciliation`, the shipment ledger and its exceptions (`docs/references/architecture.md:189`)  |
| Control graph | `/graph`           | `graph-1440x900-{light,dark}.png`      | Cytoscape visualization of the control graph, with an accessible table fallback (`docs/references/architecture.md:190`)      |
| Evaluation    | `/evaluation`      | `evaluation-1440x900-{light,dark}.png` | The submission/evaluator artifact view                                                                                       |

Two routes have **no** captured screenshot: `/settings` (Reset All) and,
notably, **`/judge`** itself — the public route a judge is most likely to
actually use. See
[Open questions and contradictions](#open-questions-and-contradictions).

## Features: shipped and verifiable

Every item below is backed by a named file and, where one exists, a
named test — not aspirational copy:

- All 520 bundled emails classified and replayed idempotently
  (`docs/references/architecture.md:45-48`, `apps/api/tests/test_gate1.py`
  `test_gate1_receipts_and_classifies_all_520_before_idempotent_replay`).
- Independent expected-shipment reconciliation reaching all six outcomes
  from one fixture, including the named peak case `SYN-042` as
  `MISSING_CASE` (`docs/references/architecture.md:61-72`,
  `apps/api/tests/test_reconciliation.py`).
- Seven-field SI/draft-BL comparison with source-anchored evidence per
  format (TXT line/column, digital-PDF box, XLSX sheet/cell, DOCX
  cell/paragraph, scanned-PDF approximate page/region) (`docs/PRD.md:142-151`;
  `docs/references/architecture.md:74-104`).
- A locked three-band match policy (`MATCH_THRESHOLD = 0.85`,
  `MISMATCH_THRESHOLD = 0.30`) mapped differently for interactive review
  versus batch evaluator output, proven at both boundaries
  (`docs/references/ai.md:169-188`, `apps/api/tests/test_comparison.py`
  `test_band_boundaries_map_interactive_and_batch`).
- A fail-closed provider policy: a Gemini or Jev failure never fabricates
  a result, is classified into one of 8 (Gemini) or 10 (Jev) explicit
  failure codes with a `retryable` flag, and is fully audited
  (`docs/references/ai.md:216-275`).
- An append-only audit trail enforced at the database level (a Postgres
  trigger rejects raw `UPDATE`/`DELETE` on 8 tables, not just application
  code) (`docs/references/architecture.md:217-228`,
  `apps/api/tests/test_migrations.py`).
- Guest-only entry with no credentials collected, a seed baseline, and a
  Reset All that provably returns a guest to the shipped baseline
  (`docs/references/demo-runbook.md:219-294`,
  `apps/api/tests/test_api_actions.py`
  `test_reset_returns_the_guest_to_the_seed_and_the_approve_replays`).
- A public, unauthenticated `/judge` upload that always runs the live
  pipeline, never the seed baseline, and discloses a labelled
  `PREPARED FALLBACK` only after a failure
  (`docs/references/architecture.md:279-325`,
  `apps/api/tests/test_api_judge.py`).
- 21 PostgreSQL tables as the system of record, written only through one
  persistence module (`docs/references/architecture.md:196-228`).

**Claims the README must not make:** `docs/references/ai.md:317-349`
("Measured latency") is explicit that the locked live path's own p95 is
25.6 s against a below-10-second target that "is not met" — so a README
must not claim sub-10-second latency (see
[Roadmap](#roadmap-open-issues-and-milestones) issue #80, which is
scoped to fix exactly this). Separately, `docs/research/ideation/qa-defence.md`
(dated 20 September 2026) describes "no implemented human-review queue,
approval control, audit trail, shipment-to-case reconciliation gate" —
this predates the implementation now documented in
`docs/references/architecture.md` and `docs/references/ai.md` and is superseded;
see [Open questions and contradictions](#open-questions-and-contradictions).

## Architecture diagram inputs

Nodes (12, at the cap requested), each with its role:

| #   | Node                                                 | Role                                                                                                                                          |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Browser (visitor: operator, reviewer, or judge)      | Client                                                                                                                                        |
| 2   | FastAPI API (`apps/api`, one Uvicorn process)        | Backend; hosted inside Cloud Run service `averis`                                                                                             |
| 3   | Compiled React SPA (`apps/web/dist`)                 | Static frontend; mounted by node 2 in the same container                                                                                      |
| 4   | Synthetic seed bundle (`data/sdoc-hackathon-bundle`) | Baked into the same container image; replayed once at startup                                                                                 |
| 5   | PostgreSQL (system of record, 21 tables)             | External managed database — Neon-style DSN only; `docs/references/cloud.md:63-65` explicitly does not name the host or claim it is GCP-hosted |
| 6   | Private GCS bucket `muba-m1ku-averis-docs`           | Content-addressed object storage                                                                                                              |
| 7   | Gemini 3.5 Flash                                     | External AI provider (extraction only)                                                                                                        |
| 8   | Jev `jev-1.13.0` (TypeSafe)                          | External AI provider (typed decisions only)                                                                                                   |
| 9   | Secret Manager                                       | Holds 4 exact runtime secrets                                                                                                                 |
| 10  | Artifact Registry repo `averis`                      | Container image registry                                                                                                                      |
| 11  | Cloud Run job `averis-migrate`                       | Runs `alembic upgrade head` before each deploy                                                                                                |
| 12  | GitHub Actions (`deploy.yml`)                        | CI/CD pipeline, authenticates via Workload Identity Federation                                                                                |

Boundaries: **GCP project `muba-m1ku`** contains nodes 6, 9, 10, 11, and
the Cloud Run service hosting nodes 2-4 (`docs/references/deployment.md:40-53`).
PostgreSQL (node 5) and both AI providers (nodes 7-8) sit **outside**
that boundary, reached only over the network. GitHub Actions (node 12)
is external to GCP, authenticating in rather than running inside it.

Edges, each with a short semantic label (source in parentheses):

1.  Browser → FastAPI API: `HTTPS /api/*, X-LadingLens-Session header`
    (`apps/web/src/lib/api.ts`; `docs/references/architecture.md:237-239`)
2.  FastAPI API → Compiled SPA: `mounts static files; SPA fallback to
index.html outside /api/` (`docs/references/cloud.md:29-32`)
3.  FastAPI API → Seed bundle: `replays pipeline once at startup`
    (`apps/api/app/seed_catalog.py`; `docs/references/demo-runbook.md:163-172`)
4.  FastAPI API → PostgreSQL: `asyncpg async SQL (DATABASE_URL)`
    (`apps/api/app/db.py`; `docs/references/cloud.md:57-65`)
5.  FastAPI API → GCS bucket: `create-only object PUT/GET, if-generation-match`
    (`apps/api/app/storage.py`; `docs/references/cloud.md:67-76`)
6.  FastAPI API → Gemini 3.5 Flash: `google-genai structured JSON
extraction call` (`apps/api/app/gemini.py`; `docs/references/ai.md:67-70`)
7.  FastAPI API → Jev `jev-1.13.0`: `typesafe-sdk system_one typed
Choice/Noul call` (`apps/api/app/jev.py`; `docs/references/ai.md:120-124`)
8.  Cloud Run service `averis` → Secret Manager: `mounts DATABASE_URL,
GEMINI_API_KEY(_2), TYPESAFE_API_KEY at runtime`
    (`.github/workflows/deploy.yml`; `docs/references/cloud.md:101-110`)
9.  GitHub Actions → GCP: `OIDC auth via Workload Identity Federation,
no downloaded key` (`.github/workflows/deploy.yml`;
    `docs/references/cloud.md:90-96`)
10. GitHub Actions → Artifact Registry: `docker build --build-arg
APP_VERSION; docker push image:sha` (`.github/workflows/deploy.yml`)
11. GitHub Actions → Cloud Run job `averis-migrate`: `gcloud run jobs
execute → alembic upgrade head, fails deploy on migration failure`
    (`.github/workflows/deploy.yml`; `docs/references/cloud.md:38-42`)
12. GitHub Actions → Cloud Run service `averis`: `gcloud run deploy,
locked env vars (GEMINI_MODEL, JEV_MODEL, DATA_POLICY) + secret map`
    (`.github/workflows/deploy.yml`)
13. GitHub Actions → Secret Manager: `sync 4 GitHub Actions secrets into
Secret Manager versions` (`.github/workflows/deploy.yml`, `sync_secret`)

## Tech stack and verified badges

Versions below are read directly from the repo's own manifests; simple-icons
slugs were verified by requesting each icon's raw SVG from the
`simple-icons/simple-icons` GitHub repository (a `200` response confirms
the slug exists) and hex values were read from that repo's own
`data/simple-icons.json`, both on 2026-09-21.

| Technology               | Version/constraint                 | Source                                                              | Badge label    | Hex       | simple-icons slug                                                                                  |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------- | -------------- | --------- | -------------------------------------------------------------------------------------------------- |
| Python                   | `>=3.12`                           | `apps/api/pyproject.toml:5`                                         | Python         | `#3776AB` | `python`                                                                                           |
| FastAPI                  | `>=0.115`                          | `apps/api/pyproject.toml:10`                                        | FastAPI        | `#009688` | `fastapi`                                                                                          |
| SQLAlchemy               | `[asyncio]>=2.0`                   | `apps/api/pyproject.toml:13`                                        | SQLAlchemy     | `#D71F00` | `sqlalchemy`                                                                                       |
| PostgreSQL               | `16`                               | `.github/workflows/ci.yml:11`, `docs/references/demo-runbook.md:33` | PostgreSQL     | `#4169E1` | `postgresql`                                                                                       |
| Gemini 3.5 Flash         | pinned `gemini-3.5-flash`          | `apps/api/app/config.py`; `docs/references/ai.md:26-32`             | Google Gemini  | `#8E75B2` | `googlegemini`                                                                                     |
| pytest                   | `>=8.3`                            | `apps/api/pyproject.toml:21`                                        | Pytest         | `#0A9EDC` | `pytest`                                                                                           |
| Ruff                     | `>=0.8`                            | `apps/api/pyproject.toml:22`                                        | Ruff           | `#D7FF64` | `ruff`                                                                                             |
| uv                       | pinned `0.11.26` in the Dockerfile | `Dockerfile:11`                                                     | uv             | `#DE5FE9` | `uv`                                                                                               |
| React                    | `^19.2.8`                          | `apps/web/package.json`                                             | React          | `#61DAFB` | `react`                                                                                            |
| TypeScript               | `~6.0.2`                           | `apps/web/package.json`                                             | TypeScript     | `#3178C6` | `typescript`                                                                                       |
| Vite                     | `^8.3.0`                           | `apps/web/package.json`                                             | Vite           | `#9135FF` | `vite`                                                                                             |
| Vitest                   | `^5.0.1`                           | `apps/web/package.json`                                             | Vitest         | `#00FF74` | `vitest`                                                                                           |
| Bun                      | image `oven/bun:1`                 | `Dockerfile:3`                                                      | Bun            | `#000000` | `bun`                                                                                              |
| Docker                   | multi-stage build                  | `Dockerfile:1-33`                                                   | Docker         | `#2496ED` | `docker`                                                                                           |
| Google Cloud (Cloud Run) | region `asia-southeast1`           | `docs/references/deployment.md:44-52`                               | Cloud Run      | `#4285F4` | `googlecloud` (no dedicated `googlecloudrun`/`google-cloud-run` slug exists — both returned `404`) |
| GitHub Actions           | `deploy.yml`, `ci.yml`             | `.github/workflows/`                                                | GitHub Actions | `#2088FF` | `githubactions`                                                                                    |

Two components have **no** simple-icons slug (confirmed `404` when
checking `icons/jev.svg`-style names, and by absence from
`slugs.md`): **TypeSafe / Jev `jev-1.13.0`** and **Alembic** (`alembic`
itself also returned `404`). Use a label-only shields.io badge for these
(omit the `logo` parameter) rather than inventing a slug.

## Getting started: prerequisites, install, and tests

Prerequisites (`docs/references/demo-runbook.md:26-34`): [uv][uv-docs] (pins
Python 3.12 for `apps/api`), [Bun][bun-site] (for `apps/web`), Docker only if
building the full image, and a reachable **PostgreSQL 16** database for
anything past the bare health check.

[uv-docs]: https://docs.astral.sh/uv/
[bun-site]: https://bun.sh/

Backend, from `apps/api` (`docs/references/demo-runbook.md:40-59`):

```shell
$ cp .env.example .env
$ uv sync
$ uv run uvicorn app.main:app --reload --port 8080
```

`GET /api/health` answers with no other setup. Everything else — guest
sessions, the inbox, `/judge` — needs a migrated database:

```shell
$ export DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME
$ uv run alembic upgrade head
```

Frontend, from `apps/web` (`docs/references/demo-runbook.md:74-86`); Vite
proxies `/api` to `localhost:8080`, so start the backend first:

```shell
$ bun install
$ bun run dev
```

Full container, exactly as deployed, from the repository root
(`docs/references/demo-runbook.md:88-117`):

```shell
$ docker build -t averis-local .
$ docker run --rm -p 8080:8080 averis-local
```

Environment variables (names only — no values are secrets in this note;
full list in `apps/api/.env.example` and
`docs/references/demo-runbook.md:124-146`):

| Variable                                | Required locally                | Purpose                                                   |
| --------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                          | For anything past `/api/health` | PostgreSQL connection string                              |
| `GEMINI_API_KEY`                        | No                              | Live Gemini key for a `/judge` upload                     |
| `GEMINI_API_KEY_2`                      | No                              | Second free-tier Gemini key, tried only after a 429       |
| `GEMINI_MODEL`                          | No                              | Fixed to `gemini-3.5-flash`                               |
| `JEV_MODEL`                             | No                              | Fixed to `jev-1.13.0`                                     |
| `RULE_VERSION`                          | No                              | Defaults to `gate-2-v1`                                   |
| `DATA_POLICY`                           | No                              | Fixed to `synthetic-only`                                 |
| `TYPESAFE_API_KEY`                      | No                              | Live Jev key for a `/judge` upload                        |
| `GCS_BUCKET`                            | No                              | Unset locally → in-process, non-persistent object store   |
| `APP_VERSION`, `WEB_DIST`, `BUNDLE_DIR` | No                              | Default correctly; leave commented out per `.env.example` |

Tests, exactly as CI runs them (`.github/workflows/ci.yml`):

```shell
$ cd apps/api && uv sync --frozen && uv run ruff check && \
    uv run ruff format --check && uv run alembic upgrade head && uv run pytest
$ cd apps/web && bun install --frozen-lockfile && bun run test && bun run build
```

CI's Postgres service uses `TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/averis`
(`.github/workflows/ci.yml:16`); a bare `uv run alembic upgrade head`
locally falls back to `alembic.ini`'s own default DSN
(`postgres:postgres@localhost:5432/averis`) if `DATABASE_URL` is unset
(`docs/references/demo-runbook.md:61-68`).

**A gap a stranger will hit:** the repository ships no `docker-compose.yml`
and no scripted local Postgres container anywhere in the tree (confirmed
by listing the repository root). Every other setup step above is an
exact, copy-pasteable command; provisioning PostgreSQL 16 itself is not —
a new contributor must supply their own (for example, `docker run -e
POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`, matching the image
CI uses) or point `DATABASE_URL` at a hosted instance.

To regenerate the seed decisions file
(`docs/references/demo-runbook.md:193-205`), from `apps/api`:

```shell
$ uv run python scripts/build_seed_decisions.py
```

## Roadmap: open issues and milestones

Open issues: <https://github.com/Averis-T010NG/LadingLens/issues>. Two
milestones exist (`gh api repos/Averis-T010NG/LadingLens/milestones`,
queried 2026-09-21):

| Milestone              | State                     | Open / closed issues | Due                                                                                                                               |
| ---------------------- | ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ideation lock          | closed in effect (0 open) | 0 / 9                | 2026-09-20                                                                                                                        |
| **Prelims submission** | open                      | 9 / 20               | 2026-09-22 (GitHub stores only a date; the actual deadline per `docs/BRIEF.md:30` is 22 September 2026, 12:00 PM MYT / 04:00 UTC) |

The 9 open issues, all but one under "Prelims submission"
(`gh issue list -R Averis-T010NG/LadingLens --state open`, 2026-09-21):
#83 (no milestone) "Check live Gate 1 category batching for cross-email
contamination"; #82 "Link the source from `/judge` and the operator
shell for PyMuPDF's AGPL network-use terms"; #81 "Provision Gemini quota
so live scan checks survive judging"; #80 "Cut Gemini extraction latency
and re-measure the live scanned-pair p95"; #48 "Assemble, verify, and
submit the Google Form before the deadline"; #47 "Run the technical
rehearsal of the judge path and artifacts"; #46 "Capture and publish the
five-minute demo video"; #43 "Review shipped claims, legal boundary, and
source attribution"; #42 "Run plain-language manual acceptance and copy
review of the preliminary build"; #41 "Run the design acceptance and
UX-constraint pass before submission" (the issue that produced the
screenshots in [How it works](#how-it-works-screens-and-the-screenshot-table)).

## Team and contributors

`gh api repos/Averis-T010NG/LadingLens/contributors` (queried
2026-09-21) lists four contributors by commit count: `kymil4` (297),
`AlaskanTuna` (146), `chaosiris` (18), `DrxgClanPC` (6). The template's
[contrib.rocks](https://contrib.rocks) embed for this repository is:

```markdown
<a href="https://github.com/Averis-T010NG/LadingLens/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Averis-T010NG/LadingLens" alt="Team" />
</a>
```

## License

Root [`LICENSE`](/LICENSE): MIT, `Copyright (c) 2026 Averis contributors`.
`docs/references/third-party-notices.md:205-213` confirms this covers
only code written in this repository; every dependency keeps its own
upstream licence.

Fourteen direct API dependencies (`apps/api/pyproject.toml`) are mostly
MIT/Apache-2.0/BSD-3-Clause, with one exception:
[**PyMuPDF**](https://pypi.org/project/PyMuPDF/) is dual-licensed **AGPL-3.0
or a commercial Artifex licence**
(`docs/references/third-party-notices.md:89-118`). Because the deployed
service is public and unauthenticated, AGPL-3.0 §13's network-use clause
applies; the repository is already public on GitHub, which the notices
page treats as satisfying source availability, but the same page flags
that `/judge` and the operator shell do not yet link to the source —
tracked live as open issue **#82**. Eight web dependencies are MIT; the
two self-hosted variable fonts (Archivo, Martian Mono) are OFL-1.1; the
Hugeicons icon set is MIT (`docs/references/third-party-notices.md:120-181`).
The hackathon dataset itself carries no stated licence — only a
confirmed-synthetic status from the organisers'
Q&A (`docs/references/third-party-notices.md:183-203`).

## Acknowledgments

- [shields.io](https://shields.io) — README badges.
- [contrib.rocks](https://contrib.rocks) — the contributor grid.
- [Archify](https://github.com/tt-a1i/archify) (tt-a1i), based on
  [Cocoon-AI/architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator)
  — the architecture-diagram tool (Archify's `SKILL.md` frontmatter).
- [Google Gemini](https://ai.google.dev/) — `gemini-3.5-flash` extraction
  (`docs/references/ai.md:26-32`).
- [TypeSafe](https://docs.typesafe.ai/introduction.md) — pinned Jev
  `jev-1.13.0` typed decisions (`docs/TRD.md:817-822`).
- [Google Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) —
  deployment target (`docs/references/cloud.md:186`).
- [Hugeicons](https://hugeicons.com/) — the free Stroke Rounded icon set
  (`docs/references/third-party-notices.md:167-173`).
- Averis x Monash Hackathon 2026 organisers — Monash University
  Malaysia's MUMTEC and GDG on Campus clubs, with industry partner
  Averis — for the challenge and the synthetic dataset
  (`docs/BRIEF.md:25`, `docs/references/third-party-notices.md:185-188`).

## GitHub's HTML support and heading anchors

GitHub's Markdown renderer sanitizes embedded HTML against an allowlist;
the actual allowlist is in the `html-pipeline` gem's `SanitizationFilter`,
read directly from source
(<https://raw.githubusercontent.com/gjtorikian/html-pipeline/main/lib/html_pipeline/sanitization_filter.rb>,
fetched 2026-09-21). Its `:elements` array includes `a`, `br`, `div`,
`details`, `summary`, `picture`, `source`, and `span`; its global
`:attributes` allowlist includes `align` and `id`. This confirms, for a
LadingLens README:

- `align="center"` / `align="right"` — allowed (`align` is a global
  attribute in the allowlist).
- `<details>` / `<summary>` — both allowed elements, so a collapsible
  section works.
- `<a id="readme-top"></a>`-style anchors — `id` is a global allowed
  attribute, so this survives, matching the template's own
  `<a id="readme-top"></a>` back-to-top pattern.
- `<br />` — an allowed element; single-line-break tricks work.

GitHub's own docs give the heading-anchor algorithm directly ("Basic
writing and formatting syntax", fetched 2026-09-21): "Letters are
converted to lower-case. Spaces are replaced by hyphens (-). Any other
whitespace or punctuation characters are removed. Leading and trailing
whitespace are removed. Markup formatting is removed, leaving only the
contents." A duplicate heading gets "a unique identifier... generated by
appending a hyphen and an auto-incrementing integer" — relevant to the
README template's own `<details>`-wrapped table of contents, which must
link to exactly these generated anchors, not hand-picked ones.

## Dark/light images, relative paths, and SVG-as-image limits

**Relative links and images.** GitHub's own docs state plainly: "A
relative link is a link that is relative to the current file"; links
"starting with `/` will be relative to the repository root," and "all
relative link operands, such as `./` and `../`" work. Critically for a
README that will be read from multiple branches: "GitHub will
automatically transform your relative link or image path based on
whatever branch you're currently on, so that the link or path always
works" ("Basic writing and formatting syntax", docs.github.com, fetched
2026-09-21). This matches `docs/references/markdown-style.md`'s own
existing house rule to prefer root-relative paths.

**Dark/light images.** Two GitHub-documented mechanisms exist, both
confirmed from GitHub-owned sources (fetched 2026-09-21):

1.  The portable `<picture>` element:

    ```html
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="dark-mode-image.png" />
      <source media="(prefers-color-scheme: light)" srcset="light-mode-image.png" />
      <img alt="Fallback image description" src="default-image.png" />
    </picture>
    ```

    GitHub's own developer-skills blog states this "can use this
    approach in your repo README files, documentation hosted on GitHub,
    and any other Markdown files rendered on GitHub.com"
    ([github.blog: "How to make your images in Markdown on GitHub adjust
    for dark mode and light mode"][gh-blog-darkmode]).

2.  The GitHub-proprietary URL fragment: "Appending `#gh-dark-mode-only`
    or `#gh-light-mode-only` to the end of an image url will define
    whether it's only shown to viewers using a light or a dark GitHub
    theme" ([GitHub Changelog, "Specify theme context for images in
    Markdown," 2021-11-24][gh-changelog-theme]). This is GitHub-specific
    and will not work on GitLab, Bitbucket, or most other Markdown
    renderers.

[gh-blog-darkmode]: https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/
[gh-changelog-theme]: https://github.blog/changelog/2021-11-24-specify-theme-context-for-images-in-markdown/

**SVG loaded via `<img>`.** MDN's own guide is explicit about what an
image-context SVG cannot do: "For security purposes, some browsers place
restrictions on SVG content when it's being used as an image... JavaScript
is disabled. External resources (e.g., images, stylesheets) cannot be
loaded, though they can be used if inlined through `data:` URLs.
`:visited`-link styles aren't rendered. Platform-native widget styling
(based on OS theme) is disabled" — and this applies "specific to image
contexts; they don't apply when SVG content is viewed directly, or when
it's embedded as a document via the `<iframe>`, `<object>`, or `<embed>`
elements" ([MDN: "SVG as an image"][mdn-svg-image]). Practically: a
diagram SVG referenced with `<img>` in the README **must** embed its own
fonts and any referenced resources as `data:` URIs (exactly what Archify's
export does — see [below](#archify-exporting-a-diagram-for-a-readme)) or
fall back to system fonts, since an external `@font-face url()` or
`<link>` stylesheet will not load.

[mdn-svg-image]: https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image

## shields.io and contrib.rocks embed syntax

**shields.io static badges** (<https://shields.io/badges/static-badge>,
fetched 2026-09-21): the URL is
`https://img.shields.io/badge/[badgeContent]`, where `badgeContent` is
"Label, (optional) message, and color. Separated by dashes." Escaping:
underscore `_` (or `%20`) becomes a space; a literal underscore is
written `__`; a literal dash is written `--`. Examples from the docs:
`https://img.shields.io/badge/any_text-you_like-blue` (label + message +
color) and `https://img.shields.io/badge/just%20the%20message-8A2BE2`
(message + color only, no label). Query parameters:
`?style=for-the-badge` (also `flat`, `flat-square`, `plastic`, `social`);
`?logo=<simple-icons slug>`; `?logoColor=<hex|rgb|css-name>`. The
repository's own README template already uses exactly this syntax,
e.g. `https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white`.

**contrib.rocks** embeds as `https://contrib.rocks/image?repo=<owner>/<repo>`,
wrapped in a link to `https://github.com/<owner>/<repo>/graphs/contributors`
— exactly the pattern in the README template's "Team" section. Documented optional query parameters are `max` (top N
contributors, default 100), `columns` (grid width, default 12), and
`anon` (include anonymous/email-only contributors, default `false`).
**Provenance note:** contrib.rocks's own site is a client-rendered app
that did not return extractable content to this session's fetch tool;
the parameter names above are corroborated by a secondary source
([openresource.dev: "contrib.rocks: Generate an Image of GitHub
Repositories Top Contributors"](https://openresource.dev/articles/contrib-rocks/))
rather than read directly from contrib.rocks's own page — worth a second
check against the live site before publishing.

## Archify: exporting a diagram for a README

Archify is not vendored in this repository. Paths in this section and the
next are relative to the Archify skill package
([tt-a1i/archify](https://github.com/tt-a1i/archify), version 2.17) as
installed on 2026-09-21.

`node bin/archify.mjs --help` lists every subcommand: `render`,
`compare`, `deliver`, `preview`, `validate`, `migrate`, `inspect`,
`check`, `visual-check`, `guide`, `brands`, `examples`, `doctor`,
`demo`. **There is no `export` subcommand.** `deliver` produces one
self-contained interactive HTML file with inline SVG
(`SKILL.md`, "Delivery" section); PNG/JPEG/WebP/SVG/WebM files come only from
**that HTML's own in-browser Export menu**, not from any CLI flag
(confirmed by the subcommand list above and by
`references/viewer-runtime.md:29`: "The export menu can copy/download
full-diagram PNG, download JPEG/WebP, download a dual-theme SVG, and
record a trace-enabled WebM").

Most relevant to a README banner: a dedicated **Share Card** export —
"The optional 1200×630 Share Card PNG is for README, release, social, or
launch previews. It uses the current theme and visual preset, contains
the complete canonical diagram without cropping, and never claims
validation" (`references/viewer-runtime.md:33`).

The exported **dual-theme SVG** is self-contained and directly confirms
the MDN restriction above is already accounted for: reading
`serializeSvg` in `assets/template.html`, the export code takes the identical
`fontCss` block used by the live viewer (embedded `@font-face` rules
whose `src` is a `data:font/woff2;base64,...` URI, subset per Unicode
range) and copies it verbatim into the exported SVG's own `<style>`, with
an explicit comment: "Keep the same font bytes, character coverage, and
attribution in standalone SVGs and the SVG images used by every raster
export" (`serializeSvg`). Diagram text is real SVG
`<text>` with `font-family: 'JetBrains Mono', ui-monospace, ...` — **not**
outlined paths — but because the actual font bytes are embedded as a
`data:` URI rather than referenced externally, the text still renders
correctly even inside the restricted "SVG as image" context. The same
export path also builds the dual-theme switch using exactly the
mechanism GitHub supports natively: `@media (prefers-color-scheme: light)`
toggling CSS custom properties, plus an `svg[data-theme="light"|"dark"]`
attribute override "so downstream consumers can still force a specific
theme" (`serializeSvg`) — so one exported SVG can behave
like the `<picture>`/`prefers-color-scheme` pattern in
[the section above](#darklight-images-relative-paths-and-svg-as-image-limits),
**if** GitHub's SVG sanitizer preserves that internal `<style>`/`@media`
block when the file is referenced by `<img>` (not independently verified
against GitHub's live output — see
[Open questions](#open-questions-and-contradictions)).

No export resolution is documented in the references. In the code,
raster exports serialise the SVG at `RASTER_SCALE = 4` times the
authored `viewBox`, stepping down only when the browser's canvas limit
requires it (`assets/template.html`), so a full-diagram PNG is four times
the `viewBox` in each dimension. The Share Card is the one export with a
documented fixed size: 1200×630.

Producing these export files unattended (e.g. in CI, without a human
clicking the Export button) is not documented as a CLI capability; the
closest built-in automation is `archify visual-check <output.html>
--json`, which drives a **headless browser** against the delivered HTML
to collect screenshots and DOM measurements for validation
(`references/delivery-contract.md`) — the same
class of tool (a Playwright-style headless browser) would be needed to
script the Export menu itself, since `visual-check` does not trigger the
canonical PNG/SVG/WebM downloads, only validation screenshots.

## Archify: design-system customisation and LadingLens's tokens

Visual presets are a closed enum on `meta.visual_preset`: `classic`
(the default — omit the field), `signal-flow`, `blueprint`, `editorial`
(`schemas/common.schema.json`;
`SKILL.md`, "Authoring invariants": "Omit
`meta.visual_preset` by default... Set `signal-flow`, `blueprint`, or
`editorial` only when the user explicitly requests that visual style").
Colour mode (light/dark) and visual preset are independent — switching
one must not change the other.

Theme colours are CSS custom properties resolved per `[data-theme]` and
injected straight into the rendered/exported SVG's `<style>` block by the
renderer's own `resolveVars` logic (`serializeSvg`); no
schema field in `common.schema.json` exposes a simple "author your own
hex palette" JSON key — customisation to a specific brand palette is a
renderer/CSS-variable change, not an authoring-time JSON field.

The one authoring-time hook for brand identity is the `brand` field
(schema type `brandMark`,
`schemas/common.schema.json`): either a short
built-in ID looked up via `node bin/archify.mjs brands "<name>" --json`,
or a digest-pinned `{url, sha256}` object captured from a real logo URL
via `archify brands capture <url>` — this lets one component node carry
a real product's mark, not a general palette override.
**No schema field or documented mechanism swaps the diagram's own
typeface** away from the shipped JetBrains Mono; this is a gap against
the README template's own instruction to use "a tt-a1i/archify diagram
customized with project design system."

The export code leaves an undocumented route for both. `resolveVars`
reads each variable with `getComputedStyle` on a probe element carrying
the chosen `data-theme`, and the exported `<style>` copies every page rule
whose selector starts with `svg`, `:root`, `[data-theme` or
`[data-preset` (`serializeSvg`). A stylesheet added to the delivered HTML
that redefines the theme variables, and sets `font-family` on `svg`, is
therefore carried into every export. The font's own bytes are not:
exports embed only the text of the `#archify-fonts` element, so a
replacement typeface must be appended there as a `data:` URI.

LadingLens's own design tokens such a customisation would draw from
(`docs/DESIGN.md`):

- **Typefaces** (`docs/DESIGN.md:33-59`): Archivo for UI text, Martian
  Mono for data/figures — both self-hosted WOFF2, OFL-1.1, no runtime
  CDN.
- **Core palette**, light → dark hex (`docs/DESIGN.md:79-96`):
  `surface/canvas` `#FFFFFF` → `#0C1115`; `surface/raised` `#F8FAFB` →
  `#141D24`; `border/default` `#CBD5E1` → `#28353F`; `text/primary`
  `#0F172A` → `#E7EEF3`; `brand/primary` `#4F46E5` → `#818CF8`;
  `brand/teal` `#0D9488` → `#14B8A6`; `brand/orange` `#C2410C` →
  `#EA580C`.
- **Status/comparison palette** (`docs/DESIGN.md:98-117`): match =
  teal (`#0D9488`/`#14B8A6`); mismatch = orange, solid fill
  (`#C2410C`/`#EA580C`); held/`NEEDS_REVIEW` = indigo
  (`#4F46E5`/`#6366F1`) — a deliberate decision, "`NEEDS_REVIEW` is
  moved off the warm hazard axis so a refusal reads as a deliberate
  custody handoff, never an error" (`docs/DESIGN.md:36`).

These are the exact same three accent hues already baked into the brand
marks (`docs/brand/mark-colour.svg`: teal `#0D9488`, orange `#C2410C`,
indigo `#4F46E5`/`#818CF8`), so an Archify diagram "customized with
project design system" should reasonably reuse this three-hue accent set
plus the neutral surface/border/text tokens above, rather than Archify's
own default palette.

## Issue #44 acceptance-criteria mapping

Issue #44's body (`gh issue view 44 -R Averis-T010NG/LadingLens`, read
2026-09-21) lists six criteria. Its links use the repository's former
name, `Averis-T010NG/Averis`; GitHub redirects these automatically
(`docs/references/third-party-notices.md:111`, noting the same rename
elsewhere).

| #   | Criterion                                                                                                                                                       | Satisfied by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Explain LadingLens and the two-gate architecture                                                                                                                | `docs/references/architecture.md:1-9,30-104` (Gate 1, Gate 2, evidence comparison); summarised above in [How it works](#how-it-works-screens-and-the-screenshot-table)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2   | Decision ownership: Gemini extraction, pinned Jev, deterministic code, named human                                                                              | `docs/references/architecture.md:106-123`; `docs/references/ai.md:24-49,190-214`; table in [How it works](#how-it-works-screens-and-the-screenshot-table) step 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | Setup a stranger can run: `uv sync`/`uvicorn`, `bun install`/`bun run dev`, root Dockerfile; env vars by name; DB/migration/seed steps; insider-knowledge flags | [Getting started](#getting-started-prerequisites-install-and-tests) — exact commands, full env-var table, seed regeneration command, and the flagged docker-compose gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 4   | Deployed URL + `/judge`; cloud usage (one Cloud Run service, Postgres, private GCS, WIF/Secret Manager); synthetic-only limitation; licence/attribution         | [Live demo](#live-demo-and-header-links); [Architecture diagram inputs](#architecture-diagram-inputs); `docs/references/cloud.md:157-182` (synthetic-only, `data_policy` literal); [License](#license)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5   | Latency/score figures only from retained artifacts; nothing from the historical Flash-Lite study                                                                | Only retained artifact: `apps/api/scripts/benchmark-results/20260921T085704Z-4eb1401.json`, summarised in `docs/references/ai.md:317-349` — **verdict: the sub-10-second target was NOT met** (5 of 20 end-to-end trials completed; their own p95 is 25.6 s). No scorer/score-result artifact is retained anywhere in the repository — the organisers' `/submit` scorer is an external Docker server, and `docs/BRIEF.md:173-174` itself calls that scoreboard "a development aid, not the judging score." A README must cite only the one retained latency table above and must not cite the historical Flash-Lite p50 3.02 s/p95 3.28 s figures (`docs/research/ideation/latency.md`), which `docs/research/build/live-path-latency-method.md:22-35` and `docs/TRD.md:707-710` both say "must not be cited as Gemini 3.5 Flash evidence." |
| 6   | Seed setup, guest-only entry, direct `/judge` access, `/settings` Reset All                                                                                     | `docs/references/demo-runbook.md:163-294` in full; summarised in [How it works](#how-it-works-screens-and-the-screenshot-table) steps 1 and 6-8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`docs/sources/google-docs/rules-and-regulations.md:175-176` is the
organiser rule this whole issue exists to satisfy: "Link to the
project's source code with a clear README file that includes setup
instructions." `docs/research/ideation/qa-defence.md:335` independently
scores the repository "**Fail today**" on "Clear README and setup" for
exactly the reason this research exists to fix — see next section for
why that whole document now needs a fresh reading.

## Open questions and contradictions

- **`qa-defence.md` is dated 20 September 2026 and is now stale on the
  "current repository reality" it describes.** It states "There is no
  implemented human-review queue, approval control, audit trail,
  shipment-to-case reconciliation gate" and "the repository is private
  and has no root `README.md`" (`docs/research/ideation/qa-defence.md:86-100`).
  As of this research (2026-09-21), `docs/references/architecture.md` and
  `docs/references/ai.md` both document all of those as shipped and tested, and
  `docs/references/third-party-notices.md:109` states "This repository
  is public on GitHub." Anyone writing the README from `qa-defence.md`
  alone would understate what is actually built; it remains a valid
  source for the _legal/claims-boundary_ language (its "judge-ready
  answers" and the claims-to-avoid list), just not for feature status.
- **No screenshot exists for `/judge` or `/settings`.** `/judge` is the
  single most important screen for a judge to see and is explicitly
  named in three separate acceptance criteria (issue #44 criterion 6,
  `docs/PRODUCT.md:137-140`, `docs/PRD.md:168-173`), yet
  `docs/verification/issue-41/screens/` has no `judge-*` file. A README
  screenshot table built only from the existing captures would omit its
  own headline feature.
- **The Archify dual-theme SVG's GitHub compatibility is unverified.**
  Section [Archify: exporting a diagram for a README](#archify-exporting-a-diagram-for-a-readme)
  establishes that the exported SVG uses `@media (prefers-color-scheme)`
  internally and embeds its own fonts as `data:` URIs, which _should_
  satisfy the MDN "SVG as image" restrictions — but this was verified by
  reading the Archify source, not by rendering an actual exported SVG
  through GitHub's own image pipeline. Worth a smoke test before relying
  on one auto-switching SVG in the README rather than two PNG exports
  wired through `<picture>`.
- **contrib.rocks's `max`/`columns`/`anon` parameters are sourced
  secondhand**, not read directly from contrib.rocks's own site (see
  [shields.io and contrib.rocks embed syntax](#shieldsio-and-contribrocks-embed-syntax)) —
  worth a manual check against the live embed before publishing.
- **The root README has no tracking issue of its own.** Issue #44 is
  closed with its README criterion unmet, as the `chaosiris` comment of
  2026-09-21 points out, so the pull request that adds the README should
  say that it completes that criterion.
