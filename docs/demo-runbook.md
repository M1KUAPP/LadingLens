# Demo runbook

LadingLens (the Averis hackathon submission) is a shipping inbox-control
system: it accounts for every email an operator receives and compares a
Shipping Instruction (SI) against its draft Bill of Lading (draft BL).
This page is everything a new teammate or a judge needs to run it
locally, understand the prepared seed data it starts from, reach the
public judge page, and reset and repeat the same five-minute walkthrough
without asking anyone for insider steps.

Contents:

1.  [Prerequisites](#prerequisites)
1.  [Local setup](#local-setup)
    1.  [Backend setup](#backend-setup)
    1.  [Frontend setup](#frontend-setup)
    1.  [Full container](#full-container)
1.  [Environment variables](#environment-variables)
1.  [The seed baseline](#the-seed-baseline)
1.  [Guest-only entry](#guest-only-entry)
1.  [The public /judge page](#the-public-judge-page)
1.  [Reset All](#reset-all)
1.  [Five-minute demo script](#five-minute-demo-script)
1.  [See also](#see-also)

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — installs the pinned Python 3.12
  interpreter and manages `apps/api`'s virtual environment
  ([`.python-version`](/apps/api/.python-version)).
- [Bun](https://bun.sh/) — installs and builds `apps/web`.
- Docker — only if you're building the full container image.
- A reachable PostgreSQL 16 database — only for anything past the bare
  health check; see [Environment variables](#environment-variables).

## Local setup

### Backend setup

From `apps/api`, copy the example environment file, then install and
run:

```shell
$ cp .env.example .env
$ uv sync
$ uv run uvicorn app.main:app --reload --port 8080
```

`uv sync` installs the locked dependencies from
[`pyproject.toml`](/apps/api/pyproject.toml) and
[`uv.lock`](/apps/api/uv.lock); `--reload` restarts the server on a code
change. `GET /api/health` answers immediately, with no other setup.
Everything past that — guest sessions, the inbox, `/judge` — needs
`DATABASE_URL` pointed at a reachable PostgreSQL 16 database, migrated:

```shell
$ export DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME
$ uv run alembic upgrade head
```

`alembic` reads `DATABASE_URL` from the shell environment, not from
`.env` — export it before migrating, even though the running server
picks the same variable up from `.env` on its own. This is the same
migration command CI runs
([`.github/workflows/ci.yml`](/.github/workflows/ci.yml)). Without
`DATABASE_URL`, `GET /api/health/ready` reports `503` with
`"reason": "DATABASE_URL is not set"` (`app/main.py`). See
[Environment variables](#environment-variables) for every other value
`.env` accepts, all optional.

### Frontend setup

From `apps/web`:

```shell
$ bun install
$ bun run dev
```

Vite serves the app and proxies `/api` to `http://localhost:8080`
([`vite.config.ts`](/apps/web/vite.config.ts)), so start the backend
first. `bun run build` (`tsc -b && vite build`) produces the same
`apps/web/dist` the Dockerfile and `WEB_DIST` serve in production.

### Full container

From the repository root, exactly as deployed (see
[deployment.md § Running Locally](/docs/references/deployment.md#running-locally)):

```shell
$ docker build -t averis-local .
$ docker run --rm -p 8080:8080 averis-local
```

The [`Dockerfile`](/Dockerfile) builds the frontend with Bun, then copies
the compiled assets and the checked-in synthetic bundle
([`data/sdoc-hackathon-bundle`](/data/sdoc-hackathon-bundle)) into a
Python 3.12 runtime that serves both on port 8080 as a non-root user. To
exercise more than the bare health check, pass the same variables
described below, for example:

```shell
$ docker run --rm -p 8080:8080 \
    --env-file apps/api/.env \
    averis-local
```

## Environment variables

These are every field `apps/api/app/config.py`'s `Settings` reads,
exactly as named in
[`apps/api/.env.example`](/apps/api/.env.example) — copy it to
`apps/api/.env` and fill in only what you need. No value below is a
secret: put your own keys in `.env`, which is git-ignored, never in this
page.

| Variable | Required locally | What it does |
| --- | --- | --- |
| `DATABASE_URL` | For anything past `/api/health` | PostgreSQL connection string. A Neon-style `postgres://` URL is rewritten to an `asyncpg` DSN automatically ([`db.py`](/apps/api/app/db.py)). |
| `GEMINI_API_KEY` | No | Live Gemini 3.5 Flash key for a `/judge` upload's extraction. Without it, a live check fails closed (see [The public /judge page](#the-public-judge-page)); the seed baseline is unaffected. |
| `GEMINI_API_KEY_2` | No | A second free-tier Gemini key from a different GCP project, tried only after the first key hits a `429` ([`gemini.py`](/apps/api/app/gemini.py)). |
| `GEMINI_MODEL` | No | Fixed to `gemini-3.5-flash`, the only accepted value; anything else fails startup validation. |
| `JEV_MODEL` | No | Fixed to `jev-1.13.0`, the only accepted value. |
| `RULE_VERSION` | No | Defaults to `gate-2-v1`; recorded on every audited decision. |
| `DATA_POLICY` | No | Fixed to `synthetic-only`, the only accepted value. |
| `TYPESAFE_API_KEY` | No | Live Jev key for a `/judge` upload's document-role and equivalence decisions; same fail-closed behavior as Gemini. |
| `GCS_BUCKET` | No | Private Cloud Storage bucket for content-addressed object storage. Unset locally, objects are kept in an in-process, non-persistent store instead (`api/deps.py`). |
| `APP_VERSION` | No | Free-text version string `/api/health` reports. |
| `WEB_DIST` | No | Filesystem path to the built frontend the API mounts and serves. Defaults to `apps/web/dist`; the Dockerfile sets it to `/app/web/dist`. |
| `BUNDLE_DIR` | No | Path to the synthetic bundle the seed baseline is built from. Defaults to the checked-in [`data/sdoc-hackathon-bundle`](/data/sdoc-hackathon-bundle). |

Two more `Settings` fields have defaults but aren't in `.env.example`:
`MAX_UPLOAD_BYTES` (default 5,242,880 bytes, 5 MiB — the per-file ceiling
on a `/judge` upload) and `DEMO_OWNER_ID` (default `docs-demo` — the
reviewer identity attached to every BL-comparison seed case, most
visibly as the named owner of a case held for review, such as
`email_516`).

The deployed service mounts only `DATABASE_URL`, `GEMINI_API_KEY`,
`GEMINI_API_KEY_2`, and `TYPESAFE_API_KEY`, from Secret Manager; see
[cloud.md § Identity and secrets](/docs/cloud.md#identity-and-secrets) —
no secret value is reproduced there either.

## The seed baseline

What every guest sees by default is a **prepared baseline, not a live
model run**: a process-wide singleton built once, at server startup, by
replaying the real pipeline — ingestion, comparison, reconciliation, and
the submission serializer — over the checked-in synthetic bundle
([`data/sdoc-hackathon-bundle`](/data/sdoc-hackathon-bundle), 520
emails), warmed in [`main.py`](/apps/api/app/main.py)'s startup so the
first request never pays the build cost
([`seed_catalog.py`](/apps/api/app/seed_catalog.py)).

**Where it comes from.** A versioned decisions file,
`app/seed/decisions-v1.json` (`SEED_VERSION = "seed-v1"`), stands in for
what Gemini and Jev would have answered: a document's role comes from a
transparent header-text rule, not Jev; the six scanned PDFs
(`email_512`–`email_514`) carry prepared human transcriptions, not Gemini
output; and no equivalence probability is recorded at all, so any
SI/draft-BL text that still differs after normalization becomes a
deterministic `MISMATCH`.

**How it's labelled.** The file's own `decision_source` field is the
literal string `"prepared"`; every seed role decision carries
`returned_model="seed-decisions"` and `provider_request_id="prepared"`;
an unjudged textual mismatch carries the fixed reason "Prepared baseline:
the texts differ after normalization and were not judged by Jev". None of
it is ever presented as live output — building the seed calls no
provider. See
[docs/ai.md § Prepared baseline versus live provider calls](/docs/ai.md#prepared-baseline-versus-live-provider-calls)
for the full contract.

**How to regenerate it.** From `apps/api`:

```shell
$ uv run python scripts/build_seed_decisions.py
```

This rewrites `app/seed/decisions-v1.json` from three offline sources
only: categories from
[`apps/web/src/data/inbox-fixture.json`](/apps/web/src/data/inbox-fixture.json),
document roles from a rule over each attachment's first three non-blank
lines, and the six scanned PDFs' prepared transcriptions
(`scripts/build_seed_decisions.py`) — and it calls no provider and reads
no organiser answer key.

**The seed itself never changes underneath a guest.** It's built once
per process and stays read-only; a guest's first action on a seed case
copies that one record into their own workspace first, so the shared
seed and every other guest's view stay untouched
(`test_actions_never_modify_the_shared_seed_catalog`,
[`test_api_actions.py`](/apps/api/tests/test_api_actions.py); the seed's
own collections raise on a mutation attempt,
`test_catalog_maps_are_frozen_against_mutation`,
[`test_seed_catalog.py`](/apps/api/tests/test_seed_catalog.py)). This is
what makes [Reset All](#reset-all) and the
[demo script](#five-minute-demo-script) below repeatable.

## Guest-only entry

Nobody signs up. Any operator route (`/inbox`, `/review`, `/graph`,
`/evaluation`, `/settings`) redirects to `/auth` when the browser has no
guest session yet (`OperatorGuard`,
[`routing/routes.tsx`](/apps/web/src/routing/routes.tsx)).

`/auth` shows an Email field and a Password field beside a single
"Sign in as Guest" button — **the fields are presentational only**.
`enterAsGuest()` never reads either value
([`pages/AuthPage.tsx`](/apps/web/src/pages/AuthPage.tsx)); the page says
so directly: "This demo runs on synthetic data only. Email and password
are not submitted or stored." Clicking the button starts a guest session
and opens `/inbox`.

Under the hood, the first API call mints the real session: `POST
/api/session` returns a random token once — only its SHA-256 is ever
stored — and the browser resends it as the `X-LadingLens-Session` header
on every later call ([`guest.py`](/apps/api/app/guest.py)).

## The public /judge page

`/judge` is the one route with no guest session or sign-in required in
advance — it sits outside `OperatorGuard`, and the page mints its own
guest session on mount.

**What to try.** Upload one Shipping Instruction and one draft Bill of
Lading — `.txt`, `.pdf`, `.docx`, or `.xlsx`, up to `MAX_UPLOAD_BYTES`
each (5 MiB by default) — tick "These documents are synthetic (no real
shipping data)," and click "Check documents"
(`components/UploadPanel.tsx`).

This is always a **live** run of the real pipeline, never the prepared
seed baseline, so it calls Gemini and Jev under the fail-closed policy in
[docs/ai.md § The fail-closed provider policy](/docs/ai.md#the-fail-closed-provider-policy):

- **Keys configured, pipeline succeeds:** all seven field verdicts, each
  with its own evidence.
- **No keys configured, or a provider failure:** the check fails closed
  with a plain message and a retry button. No keys configured: "Live AI
  checks are not configured on this server." Rate-limited or out of
  quota: "The AI provider is at capacity. Try again in a minute." A
  timeout: "The AI provider did not answer in time."
  ([`judge.py`](/apps/api/app/judge.py)). The failed upload and its file
  names stay visible, and underneath, a labelled `PREPARED FALLBACK`
  panel shows a separate, already-evidenced example — never your own
  upload's result (`components/PreparedFallbackPanel.tsx`).

Gemini's free-tier rate and quota limits alone are enough to take this
live path offline; see
[docs/ai.md § Measured latency](/docs/ai.md#measured-latency) for a
retained run where 15 of 20 live trials failed for exactly that reason.

## Reset All

`/settings` → **Reset All** → confirm (`pages/SettingsPage.tsx`) calls
`POST /api/reset`, which starts a new workspace generation for your guest
session. The old generation's rows simply stop being read, and any
in-flight request against it — including a `/judge` check still
running — fails closed as `409 session_reset` instead of returning a
stale result ([`persistence.py`](/apps/api/app/persistence.py)). The
browser also clears its own local demo state — the last `/judge` run id,
the saved theme — and never touches another guest's workspace
(`lib/demo-reset.ts`).

What you get back is the seed baseline exactly as shipped: the same 520
emails, the same disposition on every seed case. This is proven directly,
not just described: an automated test approves `email_516`'s held case,
resets, confirms the case is back to `IN_REVIEW` with empty history, then
replays the identical approve action and it succeeds again
(`test_reset_returns_the_guest_to_the_seed_and_the_approve_replays`,
[`test_api_actions.py`](/apps/api/tests/test_api_actions.py)) — the exact
reset-then-repeat mechanic the [demo script](#five-minute-demo-script)
below asks a person to do by hand.

## Five-minute demo script

Run this against your own `bun run dev` / `uv run uvicorn` pair, the
container from [Full container](#full-container), or the deployed
service at
[https://averis-222536409832.asia-southeast1.run.app](https://averis-222536409832.asia-southeast1.run.app).
Every step is something the next person can read straight off the
screen — no insider knowledge, no credentials.

1.  **0:00–0:45 — Sign in as a guest.** Open the app; an operator route
    redirects you to `/auth`. Click "Sign in as Guest" — the Email and
    Password fields do nothing, ignore them. You land on `/inbox`,
    already seeded with 520 emails.
1.  **0:45–1:45 — An OK pair next to a flagged one.** Open
    `/emails/email_001`: all seven fields `MATCH`, each anchored to an
    exact line and column in both TXT files. Open `/emails/email_004`:
    the same seven fields, but Consignee and Notify party come back
    `MISMATCH` — "EAST BRIGHT FZ-LLC" on the SI versus "UAB NOVAKOPA" on
    the draft BL — labelled a prepared baseline, not a live Jev
    judgement. This is the same pair you'll see later as `/judge`'s
    labelled `PREPARED FALLBACK`.
1.  **1:45–2:45 — Two different reasons a case waits for a person.**
    Open `/review` (Review queue tab): `email_511` is held because its
    draft BL is `unreadable` — its own email body says "the BL file will
    not open" — and `email_516` is held for `missing_value`, because
    "Some SI fields were left blank by the customer." Then open
    `/emails/email_512` from the inbox: a scanned SI/draft-BL pair (both
    PDFs) with prepared transcriptions, all seven fields `MATCH`, with
    evidence anchored only to an approximate page and region instead of
    exact text coordinates.
1.  **2:45–3:15 — The second, independent gate.** Switch to
    `/review?tab=reconciliation` and find shipment `SYN-042` (booking
    `SYN-BK-042`): its lifecycle expects a draft BL, but no case exists
    for it, so Gate 2 marks it `MISSING_CASE` — something Gate 1, which
    only ever looks at mail that arrived, could never catch.
1.  **3:15–4:15 — The public, no-login path.** Open `/judge` directly, in
    a fresh tab if you like — no sign-in first. Upload any
    TXT/PDF/DOCX/XLSX Shipping Instruction and draft BL — your own
    synthetic pair, or a copy of one from
    `data/sdoc-hackathon-bundle/attachments` — tick the synthetic
    confirmation, and click "Check documents." This is a live run, not
    the prepared baseline again. Without provider keys configured, it
    fails closed with a plain message and a retry button, and the
    labelled `PREPARED FALLBACK` panel underneath shows a real, evidenced
    example instead.
1.  **4:15–5:00 — Reset and repeat.** Open `/settings`, click
    "Reset All," and confirm. Your guest workspace is back to the seed
    baseline above — ready for the next teammate or judge to run the
    same five minutes again.

## See also

- [docs/architecture.md](/docs/architecture.md) — the two gates, decision
  ownership, and the full guest/seed/judge contract.
- [docs/ai.md](/docs/ai.md) — what each provider is asked, the
  fail-closed policy, and measured live-path latency.
- [docs/cloud.md](/docs/cloud.md) and
  [docs/references/deployment.md](/docs/references/deployment.md) — the
  deployed service, its secrets, and the exact commands this page
  repeats.
