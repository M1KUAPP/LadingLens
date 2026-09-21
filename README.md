<a id="readme-top"></a>

<div align="center">
  <img src="assets/hero.png" alt="LadingLens" width="100%">

  <h3>LadingLens</h3>

  <p>
    <b>Every email accounted for. Every expected shipment answered for.</b><br />
    A shipping inbox-control system that reconciles an expected-shipment ledger against cases,
    and verifies Shipping Instructions against draft Bills of Lading with the source evidence attached.
  </p>

![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_3.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

[Live Demo](https://averis-222536409832.asia-southeast1.run.app) ·
[Public Judge Path](https://averis-222536409832.asia-southeast1.run.app/judge) ·
[Architecture](docs/architecture.md) · [AI](docs/ai.md) · [Cloud](docs/cloud.md) ·
[Runbook](docs/demo-runbook.md) · [PRD](docs/PRD.md) · [TRD](docs/TRD.md)

</div>

| Submission Field        | Detail                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Team**                | **T010NG**: `@kymil4` (Backend, Pipeline, Frontend), `@AlaskanTuna` (Fullstack, DevOps, Cloud), `@chaosiris` (Persistence, Deployment, Verification), `@DrxgClanPC` (Ideation, Pitch, Review) |
| **Problem Statement**   | Averis Smart Document (SDoc) challenge — shipping inbox accounting and SI-to-BL verification                                                                                  |
| **Live Prototype**      | **https://averis-222536409832.asia-southeast1.run.app** (public, opens in incognito, no account required)                                                                    |
| **Public Judge Path**   | **https://averis-222536409832.asia-southeast1.run.app/judge** (reachable directly, no sign-in)                                                                               |
| **Video Presentation**  | _Pending — tracked in [#46](https://github.com/Averis-T010NG/LadingLens/issues/46)_                                                                                          |
| **Presentation Slides** | [`docs/pitch/preliminary-deck.md`](docs/pitch/preliminary-deck.md) · [`preliminary-deck.html`](docs/pitch/preliminary-deck.html)                                              |
| **Data**                | Synthetic only. The 520-email bundle is the organisers' synthetic dataset; no real customer data is processed.                                                                |

## Table Of Contents

<details>
  <summary>Expand</summary>
  <ol>
    <li><a href="#1-the-problem">The Problem</a></li>
    <li><a href="#2-what-ladinglens-does">What LadingLens Does</a>
      <ol>
        <li><a href="#21-gate-1--every-email-is-accounted-for">Gate 1 — Every Email Is Accounted For</a></li>
        <li><a href="#22-gate-2--the-expected-shipment-ledger">Gate 2 — The Expected-Shipment Ledger</a></li>
        <li><a href="#23-the-seven-field-comparison">The Seven-Field Comparison</a></li>
      </ol>
    </li>
    <li><a href="#3-try-it-in-two-minutes">Try It In Two Minutes</a></li>
    <li><a href="#4-decision-ownership">Decision Ownership</a></li>
    <li><a href="#5-technical-architecture">Technical Architecture</a>
      <ol>
        <li><a href="#51-system-shape">System Shape</a></li>
        <li><a href="#52-tech-stack">Tech Stack</a></li>
        <li><a href="#53-cloud-and-deployment">Cloud And Deployment</a></li>
      </ol>
    </li>
    <li><a href="#6-setup">Setup</a>
      <ol>
        <li><a href="#61-backend">Backend</a></li>
        <li><a href="#62-frontend">Frontend</a></li>
        <li><a href="#63-full-container">Full Container</a></li>
        <li><a href="#64-environment-variables">Environment Variables</a></li>
      </ol>
    </li>
    <li><a href="#7-verification">Verification</a></li>
    <li><a href="#8-limitations-and-claims-boundary">Limitations And Claims Boundary</a></li>
    <li><a href="#9-repository-map">Repository Map</a></li>
    <li><a href="#10-licence-and-attribution">Licence And Attribution</a></li>
  </ol>
</details>

## 1. The Problem

A freight forwarder's shipping desk receives hundreds of emails a day. Buried
in them are Shipping Instructions and the draft Bills of Lading that answer
them, and somebody has to check that the two agree across seven fields before
the bill is released. Get it wrong and the cargo moves against a document that
does not match what the shipper asked for.

Two failures matter, and only one of them is visible from the inbox.

<div align="center">
  <img src="assets/problem-6koma.png" alt="Six-panel comic: an overflowing inbox, manual side-by-side checking of seven fields, a missed port-of-discharge mismatch, an expected shipment that never arrived as an email, the two-gate system, and an evidence-backed sign-off" width="100%" />
</div>

The first is the one everyone expects: a mismatch between the two documents
slips past a tired reader. The second is the one an inbox cannot show you — a
shipment that was expected and never arrived as an email at all. **You cannot
notice an email you never received.** That absence is invisible to any system
that only looks at what is in the inbox.

LadingLens treats both as the same control problem, and borrows the answer
from double-entry bookkeeping: check the inbox against an independent record
of what should have been there.

## 2. What LadingLens Does

One control loop, two gates, and a person who keeps the consequential
decision.

### 2.1 Gate 1 — Every Email Is Accounted For

Every received email is receipted with immutable content hashes, classified
into exactly one of five categories by a pinned `jev-1.13.0` typed decision,
and carried to a recorded outcome. Nothing is silently dropped. The inbox
shows **520 received / 520 accounted for / 0 lost**, and that arithmetic is
the gate.

### 2.2 Gate 2 — The Expected-Shipment Ledger

A synthetic expected-shipment CSV is imported and reconciled against cases
independently of the inbox. A shipment on the ledger with no case is
`MISSING_CASE` — the absence Gate 1 structurally cannot see. A case with no
ledger entry is `UNMATCHED_CASE`. Ambiguity keeps both candidate sets rather
than guessing.

### 2.3 The Seven-Field Comparison

A valid SI and draft-BL pair is compared across shipper, consignee, notify
party, port of loading, port of discharge, container count, and gross weight.
Every extracted value carries a provenance anchor back to the exact line,
cell, or page region it came from, so a verdict can always be clicked back to
its source. Textual equivalence is judged by pinned `jev-1.13.0`; numbers,
schema, parsing and state transitions are deterministic code.

## 3. Try It In Two Minutes

No account, no credentials, nothing to install.

1. Open **[/judge](https://averis-222536409832.asia-southeast1.run.app/judge)**
   directly. A guest session is created automatically.
2. Upload a Shipping Instruction and a draft Bill of Lading — `txt`, `pdf`,
   `docx` or `xlsx`, up to 5 MB each. Synthetic documents only; the policy is
   enforced server-side.
3. Watch it run live, then read the seven field rows and click any value
   through to the exact source line it was read from.
4. Download the submission artifact and the synthetic CSV, then use **Reset
   All** in `/settings` and do it again.

If a provider call fails, the screen says so. A prepared example may appear
beside your run, clearly labelled `PREPARED FALLBACK` — never presented as
your result, and your failed upload stays visible and retryable.

## 4. Decision Ownership

The interesting engineering question in this problem is not "can a model read
a document" but "who is allowed to decide what". LadingLens is explicit about
it.

| Decision                                                        | Owner                          |
| --------------------------------------------------------------- | ------------------------------ |
| Reading values out of scanned or ambiguous documents            | Gemini 3.5 Flash, grounded     |
| Typed semantic judgements — category, document role, equivalence | Pinned `jev-1.13.0`            |
| Parsing, normalisation, numbers, schema, state transitions      | Deterministic code             |
| Consequential disposition of anything unsafe to decide          | A named human reviewer         |

Two rules hold this together. **Fail closed:** a provider timeout, a quota
exhaustion, an invalid typed answer, or a value that cannot be grounded back
to its source is recorded as a failure, never as a result. **Never fabricate:**
there is no fallback provider and no guessed category — a case with no answer
shows as needing review, with a retry, rather than inventing one.

See [`docs/ai.md`](docs/ai.md) for the full decision register.

## 5. Technical Architecture

### 5.1 System Shape

```mermaid
flowchart LR
  subgraph Ingest["Gate 1 — inbox accounting"]
    A[520-email bundle] --> B[Receipts<br/>SHA-256 per attachment]
    B --> C[Category<br/>pinned jev-1.13.0]
  end

  subgraph Extract["Evidence extraction"]
    C --> D[Preflight<br/>magic-byte format]
    D --> E[Local parsers<br/>TXT / XLSX / DOCX / PDF]
    D --> F[Gemini 3.5 Flash<br/>scans and ambiguity]
    E --> G[Seven fields<br/>+ provenance anchors]
    F --> G
  end

  subgraph Ledger["Gate 2 — independent ledger"]
    H[Expected-shipment CSV] --> I[Reconciliation<br/>MISSING / UNMATCHED]
  end

  G --> J[Comparison<br/>equivalence bands]
  I --> J
  J --> K[Human review<br/>append-only audit]
  K --> L[Submission artifact<br/>520 records]
```

Both gates write to PostgreSQL through an append-only audit trail. Review
actions and audit events carry database-level `BEFORE UPDATE OR DELETE`
triggers, so history cannot be rewritten by application code at all.

### 5.2 Tech Stack

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| API        | Python 3.12, FastAPI, SQLAlchemy 2 async, Alembic                       |
| Web        | React 19, TypeScript 6, Vite 8, Bun                                     |
| Data       | PostgreSQL 16, private Google Cloud Storage objects                     |
| AI         | Gemini 3.5 Flash (`google-genai`), pinned `jev-1.13.0` (`typesafe-sdk`) |
| Documents  | PyMuPDF, python-docx, openpyxl, lxml                                    |
| Deployment | Docker, Cloud Run, Artifact Registry, Workload Identity Federation      |

### 5.3 Cloud And Deployment

One Cloud Run service serves the FastAPI application and the compiled React
build together, so the demo link is a single origin with no CORS surface.
Deployment is fully automated from `main` with no long-lived cloud
credentials: GitHub Actions authenticates through Workload Identity
Federation, pinned to this repository's numeric id and the `main` branch.

Secrets reach the runtime only through Secret Manager, and the runtime holds
exactly `GEMINI_API_KEY`, `GEMINI_API_KEY_2` and `TYPESAFE_API_KEY` plus
database and storage configuration. Evidence bytes live in a
public-access-prevented bucket and are served only through authorized API
endpoints — never a public bucket URL.

Every deploy ends in a fail-closed smoke check against the live URL that
verifies health, readiness with a real database round trip, SPA fallback,
unauthenticated `/judge`, an authorized artifact download of exactly 520
records, and that a known private object is still denied anonymously. If any
check fails, the deploy is marked failed and the report is retained as a build
artifact.

Details in [`docs/cloud.md`](docs/cloud.md) and
[`docs/references/deployment.md`](docs/references/deployment.md).

## 6. Setup

These steps were verified against a clean checkout of this repository, via
`git archive`, during the work recorded in
[`docs/demo-runbook.md`](docs/demo-runbook.md) — backend, frontend and the
full container, each reaching a working `/judge` with the seed ready. The
runbook carries the longer explanations; this section is the short path.

### 6.1 Backend

From `apps/api`:

```shell
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8080
```

`GET /api/health` answers immediately with no further setup. Everything past
that — guest sessions, the inbox, `/judge` — needs `DATABASE_URL` pointed at a
reachable PostgreSQL 16 database, migrated:

```shell
export DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME
uv run alembic upgrade head
```

Alembic reads `DATABASE_URL` from the shell environment rather than from
`.env`, so export it before migrating even though the running server picks the
same variable up from `.env` on its own. Without it, `GET /api/health/ready`
returns `503` with `"reason": "DATABASE_URL is not set"`.

### 6.2 Frontend

From `apps/web`:

```shell
bun install
bun run dev
```

Vite proxies `/api` to `http://localhost:8080`, so start the backend first.
`bun run build` produces the same `apps/web/dist` that the container serves in
production.

### 6.3 Full Container

From the repository root, exactly as deployed:

```shell
docker build -t averis-local .
docker run --rm -p 8080:8080 --env-file apps/api/.env averis-local
```

The image builds the frontend with Bun, then copies the compiled assets and
the checked-in synthetic bundle into a Python 3.12 runtime serving both on
port 8080 as a non-root user.

### 6.4 Environment Variables

None of these are secrets in the repository; `apps/api/.env.example` ships
them empty.

| Variable                            | Purpose                                            |
| ----------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL 16 DSN. Required for anything stateful. |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2` | Gemini extraction; the second is a 429 failover.   |
| `TYPESAFE_API_KEY`                  | Pinned `jev-1.13.0` typed decisions.               |
| `GEMINI_MODEL`                      | Locked to `gemini-3.5-flash`.                      |
| `JEV_MODEL`                         | Locked to `jev-1.13.0`.                            |
| `DATA_POLICY`                       | `synthetic-only`, enforced server-side.            |
| `GCS_BUCKET`                        | Private bucket for evidence objects.               |

`APP_VERSION`, `WEB_DIST` and `BUNDLE_DIR` are deliberately left commented out
in `.env.example` — `docker run --env-file` treats an empty `VAR=` as setting
it blank, which would override the image's own correct defaults and break the
seed build.

## 7. Verification

| Check                                       | Result                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| API suite, PostgreSQL 16 in CI              | passing, including migrations through `alembic upgrade head` |
| Web suite and production build              | passing                                                    |
| Lint and format                             | `ruff check`, `ruff format --check` clean                  |
| Deployment smoke, against the live Cloud Run URL | all checks passing, report retained per deploy         |
| Gate 1 completeness                         | 520 ids, `email_001`–`email_520`, no gaps                   |

CI runs the full API suite against a real PostgreSQL 16 service on every pull
request, so the persistence, idempotency and append-only guarantees are
exercised against a real database rather than a mock.

## 8. Limitations And Claims Boundary

Stated plainly, because a demo that overclaims is worse than one that does
less.

- **Synthetic data only.** The 520-email bundle is the organisers' synthetic
  dataset. No real customer or production data is processed, and the upload
  policy enforces this server-side.
- **Latency figures come only from the retained benchmark artifact.** Ad-hoc
  timings observed during a demo are measurements of that moment, not a
  published latency claim.
- **Seeded demo baseline.** The inbox a visitor sees is a deterministic
  prepared baseline so the demo is repeatable and Reset All is meaningful. A
  `/judge` upload, by contrast, runs live against the real providers, and the
  two are always distinguishable — a live run is labelled `live`, a prepared
  example is labelled `PREPARED FALLBACK`.
- **No fallback provider.** If Gemini or Jev fails, the run fails visibly.
  There is no second model quietly substituting an answer.
- **Human sign-off is required by design,** not a limitation to be engineered
  away. Anything that cannot be decided safely goes to a named reviewer.

## 9. Repository Map

```
apps/api/            FastAPI service: ingestion, extraction, comparison,
                     reconciliation, submission, persistence, judge runs
apps/web/            React 19 + Vite frontend, including the public /judge flow
data/                The organisers' synthetic 520-email bundle
docs/                Architecture, AI, cloud, runbook, PRD, TRD, design
infra/               One-time idempotent GCP setup
scripts/             Deployment smoke check and GCP control verification
.github/workflows/   CI (PostgreSQL 16) and Deploy (Cloud Run)
```

## 10. Licence And Attribution

This repository is MIT licensed — see [`LICENSE`](LICENSE).

Third-party dependencies, their licences, fonts, icons and the synthetic
dataset's provenance are recorded in
[`docs/references/third-party-notices.md`](docs/references/third-party-notices.md).
Note in particular that **PyMuPDF is dual-licensed AGPL-3.0 or commercial**;
the notices file documents what that means for this repository's use of it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
