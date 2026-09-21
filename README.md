<a id="readme-top"></a>

<!-- PROJECT LOGO -->

<br />
<div align="center">
  <a href="https://github.com/Averis-T010NG/LadingLens">
    <img src="assets/hero.png" alt="LadingLens" width="100%">
  </a>

  <h3>LadingLens</h3>

  <p>
    <b>Every email accounted for. Every expected shipment answered for.</b>
    <br />
    A shipping inbox-control system that reconciles expected shipments with cases and verifies SI-to-BL decisions against source evidence for human sign-off.
    <br />
    <a href="https://averis-222536409832.asia-southeast1.run.app"><strong>Live Demo »</strong></a>
    &middot;
    <a href="https://averis-222536409832.asia-southeast1.run.app/judge">Judge Mode</a>
    &middot;
    <a href="docs/demo-runbook.md">Demo Runbook</a>
    <br />
  </p>

[![React][React.js]][React-url]
[![TypeScript][TypeScript.org]][TypeScript-url]
[![Vite][Vite.dev]][Vite-url]
[![Bun][Bun.sh]][Bun-url]
[![Python][Python.org]][Python-url]
[![FastAPI][FastAPI.com]][FastAPI-url]
[![PostgreSQL][PostgreSQL.org]][PostgreSQL-url]
[![Gemini][Gemini.google]][Gemini-url]
[![TypeSafe Jev][TypeSafe.ai]][TypeSafe-url]
[![Cloud Run][CloudRun.google]][CloudRun-url]
[![Docker][Docker.com]][Docker-url]
[![GitHub Actions][GitHubActions.com]][GitHubActions-url]

</div>

<!-- TABLE OF CONTENTS -->

## Table of Contents

<details>
  <summary>Expand</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#screenshots">Screenshots</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#architecture">Architecture</a></li>
        <li><a href="#tech-stack">Tech Stack</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#team">Team</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

| Submission Field        | Detail                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Team**                | **T010NG**: `@kymil4` (Backend, Pipeline, Frontend), `@AlaskanTuna` (Fullstack, DevOps, Cloud), `@chaosiris` (Persistence, Deployment, Verification), `@DrxgClanPC` (Ideation, Pitch, Review) |
| **Problem Statement**   | Averis Smart Document (SDoc) challenge — shipping inbox accounting and SI-to-BL verification                                                                                                  |
| **Live Prototype**      | **https://averis-222536409832.asia-southeast1.run.app** (public, opens in incognito, no account required)                                                                                     |
| **Public Judge Path**   | **https://averis-222536409832.asia-southeast1.run.app/judge** (reachable directly, no sign-in)                                                                                                |
| **Video Presentation**  | _Pending — tracked in [#46](https://github.com/Averis-T010NG/LadingLens/issues/46)_                                                                                                           |
| **Presentation Slides** | [`docs/pitch/deck/ladinglens-deck.html`](docs/pitch/deck/ladinglens-deck.html) · [`ladinglens-deck.pdf`](docs/pitch/deck/ladinglens-deck.pdf)                                                 |
| **Data**                | Synthetic only. The 520-email bundle is the organisers' synthetic dataset; no real customer data is processed.                                                                                |

Averis's shipping-operations team gets every kind of message in one inbox, up to 2,000 emails a day. For a document-checking request, an analyst compares the customer's Shipping Instruction (SI) with the draft Bill of Lading (BL) field by field. The two documents label the same field differently, such as `Port of Loading` against `Load Port`.

Two failures matter, and only one of them is visible from the inbox. The first is a mismatch between the two documents that a tired reader misses. The second is a shipment that was expected and never arrived as an email at all. **You cannot notice an email you never received.**

<div align="center">
  <img src="assets/problem-6koma.png" alt="Six-panel manga: a coordinator buried under 520 emails, checking seven fields across an SI and a draft BL by hand, rubber-stamping at midnight while POD SGSIN versus NLRTM slips past, a manager demanding to know where SYN-042 went when no email ever arrived for it, the two gates balancing the books, and a calm evidence-backed sign-off" width="100%" />
</div>

LadingLens, built for the [Averis x Monash Hackathon 2026](docs/BRIEF.md), treats both failures as one control problem. It borrows the answer from double-entry bookkeeping: check the inbox against an independent record of what should have been there. Two independent controls and a named human sit around the inbox:

- **Gate 1 accounts for every received email.** Each email is receipted and hashed before anything else runs, then given exactly one category: `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL` or `SPAM`.
- **Gate 2 reconciles what was supposed to arrive.** An expected-shipment ledger is checked against the cases that exist, so a shipment whose email never came in still surfaces as `MISSING_CASE`.
- **Evidence comparison checks each valid SI/draft-BL pair over seven fields.** The fields are shipper, consignee, notify party, port of loading, port of discharge, container count and gross weight. The SI is always the reference, and every verdict shows where in both documents it came from.
- **A named human makes every consequential decision.** Held cases are approved, corrected or rejected by a person, never by the system.

Limitations:

- The deployment runs on synthetic data only (`DATA_POLICY=synthetic-only`). Real shipping documents stay out until retention, access, transfer and provider controls are approved.
- Entry is guest-only. The sign-in page's email and password fields are presentational and never sent or stored.
- A guest first sees a prepared seed baseline, labelled as prepared. Only uploads on the Upload page (`/judge` or `/upload`) run the live AI path.
- The live path is slow and quota-bound. In the one retained benchmark run, only 5 of 20 end-to-end trials completed, with a p95 of 25.6 s, so the 10-second target is not met ([docs/ai.md](docs/ai.md#measured-latency)). A provider failure fails closed with a plain message and a labelled prepared fallback, never a fabricated result.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Screenshots

Captured at 1440x900 against the deployed service. Each image links to its
live route.

| Public judge path                                                                                           | Landing                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [![Judge](assets/screens/02-judge.png)](https://averis-222536409832.asia-southeast1.run.app/judge)          | [![Landing](assets/screens/01-landing.png)](https://averis-222536409832.asia-southeast1.run.app/)                            |
| **Inbox**                                                                                                   | **Case evidence**                                                                                                            |
| [![Inbox](assets/screens/03-inbox.png)](https://averis-222536409832.asia-southeast1.run.app/inbox)          | [![Case evidence](assets/screens/04-email-detail.png)](https://averis-222536409832.asia-southeast1.run.app/emails/email_001) |
| **Review queue**                                                                                            | **Evaluation**                                                                                                               |
| [![Review queue](assets/screens/05-review.png)](https://averis-222536409832.asia-southeast1.run.app/review) | [![Evaluation](assets/screens/06-evaluation.png)](https://averis-222536409832.asia-southeast1.run.app/evaluation)            |
| **Control graph**                                                                                           | **Settings**                                                                                                                 |
| [![Control graph](assets/screens/07-graph.png)](https://averis-222536409832.asia-southeast1.run.app/graph)  | [![Settings](assets/screens/08-settings.png)](https://averis-222536409832.asia-southeast1.run.app/settings)                  |

<p align="right"><a href="#readme-top">&uarr;</a></p>

### How It Works

The five-minute walkthrough in the [demo runbook](docs/demo-runbook.md#five-minute-demo-script), step by step:

1. **Sign in as a guest.** Open the [live demo](https://averis-222536409832.asia-southeast1.run.app) and choose **Sign in as Guest** on `/auth`. The email and password fields do nothing. You land on `/inbox`, already seeded with all 520 synthetic emails.

   [![Inbox](assets/screens/03-inbox.png)](https://averis-222536409832.asia-southeast1.run.app/inbox)

2. **Gate 1: every email is accounted for.** The inbox lists every received email with its category and outcome. Only a `BL_COMPARISON` email goes on to evidence comparison.

3. **Compare the evidence.** Open a comparison case such as `/emails/email_001`. The seven fields sit side by side, with the SI as the reference. Each verdict is `MATCH`, `MISMATCH` or `REVIEW`, and shows the evidence it came from in both documents.

   [![Case evidence](assets/screens/04-email-detail.png)](https://averis-222536409832.asia-southeast1.run.app/emails/email_001)

4. **Hand held cases to a person.** `/review` lists the cases the system will not decide alone, with the reason for each. `email_511`'s draft BL will not open, and `email_516` has fields the customer left blank. A named reviewer approves, corrects or rejects each one.

   [![Review queue](assets/screens/05-review.png)](https://averis-222536409832.asia-southeast1.run.app/review)

5. **Gate 2: catch what never arrived.** On `/reconciliation`, shipment `SYN-042` expects a draft BL, but no email ever created a case for it. Gate 2 marks it `MISSING_CASE`, which Gate 1 could never catch on its own.

   [![Reconciliation](assets/screens/07-graph.png)](https://averis-222536409832.asia-southeast1.run.app/graph)

6. **Check a pair of your own.** Open [`/judge`](https://averis-222536409832.asia-southeast1.run.app/judge); no sign-in is needed, and it opens the workspace's **Upload** page. Upload one SI and one draft BL as TXT, PDF, DOCX or XLSX, up to 5 MiB each. Confirm they are synthetic and choose **Check documents**. A waiting screen follows the three pipeline steps while the live run works: you get all seven verdicts with evidence, or a plain failure with a retry button and a labelled `PREPARED FALLBACK` example underneath.

   [![Judge](assets/screens/02-judge.png)](https://averis-222536409832.asia-southeast1.run.app/judge)

7. **Reset and repeat.** **Reset All** on `/settings` returns your guest workspace to the seed baseline exactly as shipped, ready for the next person.

   [![Settings](assets/screens/08-settings.png)](https://averis-222536409832.asia-southeast1.run.app/settings)

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Features

- **Every email receipted and categorised.** All 520 bundle emails are hashed, persisted and categorised, and replaying the same batch changes nothing.
- **Independent shipment reconciliation.** Every expected shipment resolves to exactly one of six outcomes: `CASE_PRESENT`, `DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`, `DUPLICATE_OR_AMBIGUOUS` or `SOURCE_STALE`.
- **Seven-field comparison with source evidence.** How precise the evidence is depends on the format:
  - TXT: line and column
  - digital PDF: text bounding box
  - XLSX: sheet and cell
  - DOCX: table cell or paragraph
  - scanned PDF: approximate page and region
- **A locked match policy.** When text differs, it gets a typed match probability. Values of 0.85 and above are `MATCH`, 0.30 and below are `MISMATCH`, and anything between is held for a reviewer. Numbers are compared in Python, never by a model.
- **Fail-closed AI.** A Gemini or Jev failure is classified, audited and shown as a failure with a retry. It never becomes a verdict.
- **Append-only audit trail.** A Postgres trigger rejects in-place updates and deletes on every append-only table, including audit events, review actions, reconciliation results and model decisions.
- **Human sign-off.** Held cases can be approved, corrected or rejected. Reconciliation exceptions can be assigned, acknowledged, escalated or resolved.
- **Control graph.** Cases, shipments and exceptions appear as a Cytoscape graph, with an accessible table view.
- **Evaluation view.** It counts classification coverage and each kind of outcome: comparison, processing status and reconciliation.
- **Guest workspaces.** There is no sign-up. A guest's first action on a seed case copies it into their own workspace, and Reset All restores the shared baseline.
- **Public judge mode.** `/judge` runs a fresh SI/draft-BL pair through the same live pipeline as every other case, with no account.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/architecture-dark.png">
  <img src="docs/readme/architecture-light.png" alt="LadingLens architecture: the React SPA calls FastAPI on Cloud Run over HTTPS. FastAPI uses PostgreSQL, a private Cloud Storage bucket, Secret Manager, Gemini 3.5 Flash and Jev jev-1.13.0. GitHub Actions pushes images to Artifact Registry, which Cloud Run deploys.">
</picture>

A single Cloud Run container serves the FastAPI API and the compiled React app. PostgreSQL is the system of record. Source documents are stored as create-only objects in a private Cloud Storage bucket. The runtime gets its secrets from Secret Manager.

GitHub Actions authenticates through Workload Identity Federation. On each deploy it runs the database migrations as a Cloud Run job first, then smoke-checks the live service.

Each kind of decision has exactly one owner:

| Owner                    | Decides                                                                                                                                                                       | Never decides                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Deterministic Python     | File checks; parsing TXT, XLSX, DOCX and digital PDFs; normalisation; both numeric comparisons; schema, state, persistence and audit                                          | What a document is, or what its text means         |
| Gemini 3.5 Flash         | Field values from a scanned PDF or a document whose local parse is ambiguous. Every answer is schema-validated, and a grounded answer must appear verbatim in the source text | Clean digital documents, categories or equivalence |
| Jev `jev-1.13.0`, pinned | Email category, document role (SI, draft BL or other) and textual field equivalence                                                                                           | Numbers, arithmetic or persistence                 |
| Named human reviewer     | Approving, correcting or rejecting a held case; assigning, acknowledging, escalating or resolving an exception                                                                | Nothing: theirs is the only final disposition      |

The diagram's source is [`docs/readme/architecture.json`](docs/readme/architecture.json). It is drawn with [Archify][Archify-url] and exported in the LadingLens palette by [`docs/readme/export-architecture.mjs`](docs/readme/export-architecture.mjs). There is more detail in [docs/architecture.md](docs/architecture.md), [docs/ai.md](docs/ai.md), [docs/cloud.md](docs/cloud.md) and the [API reference](docs/references/api.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Tech Stack

- **Frontend:** React 19, React Router 7, TypeScript 6, Vite 8, Cytoscape.js and Hugeicons, with Archivo and Martian Mono self-hosted. Tested with Vitest and Testing Library, and built with Bun.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2 (async, on asyncpg), Alembic, Pydantic Settings, PyMuPDF, openpyxl and python-docx. Managed with uv, linted with Ruff, and tested with pytest.
- **AI:** Gemini 3.5 Flash through `google-genai`, and TypeSafe Jev `jev-1.13.0` through `typesafe-sdk` 0.7.0.
- **Data:** PostgreSQL 16, and Google Cloud Storage for source documents and submission artifacts.
- **Cloud and delivery:**
  - Cloud Run, as a service and a migration job
  - Artifact Registry and Secret Manager
  - Workload Identity Federation
  - GitHub Actions and Docker

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- GETTING STARTED -->

## Getting Started

This runs LadingLens locally, with the API on port 8080 and the Vite dev server in front of it. The [demo runbook](docs/demo-runbook.md) covers every step in more detail.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Prerequisites

- [uv](https://docs.astral.sh/uv/), which installs the pinned Python 3.12 and the API's dependencies.
- [Bun](https://bun.sh/), which installs and builds the web app.
- PostgreSQL 16, for anything past the bare health check. With Docker, this starts one that matches the commands below:

  ```shell
  docker run --name ladinglens-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=averis -p 5432:5432 -d postgres:16
  ```

- [Docker](https://www.docker.com/), only to run PostgreSQL as above or to build the full container image.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Installation

1. Clone the repository.

   ```shell
   git clone https://github.com/Averis-T010NG/LadingLens.git
   cd LadingLens
   ```

2. Configure, install and migrate the API.

   ```shell
   cd apps/api
   cp .env.example .env
   uv sync
   export DATABASE_URL=postgres://postgres:postgres@localhost:5432/averis
   uv run alembic upgrade head
   ```

   Set the same `DATABASE_URL` in `apps/api/.env` too. The server reads it from `.env`, but `alembic` never reads `.env`. It takes `DATABASE_URL` from the shell, and without it falls back to `alembic.ini`'s local default.

3. Start the API.

   ```shell
   uv run uvicorn app.main:app --reload --port 8080
   ```

   At startup it builds the seed baseline: the real pipeline, replayed over the checked-in 520-email synthetic bundle, with prepared decisions in place of provider calls. `http://localhost:8080/api/health/ready` reports whether the database is reachable. To rebuild the prepared decisions file, run `uv run python scripts/build_seed_decisions.py` from `apps/api`.

4. In a second terminal, start the web app, then open the URL Vite prints (`http://localhost:5173` by default). Vite proxies `/api` to port 8080.

   ```shell
   cd apps/web
   bun install
   bun run dev
   ```

5. Or build and run the full container from the repository root, exactly as deployed.

   ```shell
   docker build -t ladinglens .
   docker run --rm -p 8080:8080 --env-file apps/api/.env \
     -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/averis \
     --add-host=host.docker.internal:host-gateway ladinglens
   ```

   Inside the container, `localhost` is the container itself. The `-e` flag overrides `DATABASE_URL` for the container only, so `apps/api/.env` still works for step 3. `--add-host` makes `host.docker.internal` reach your machine on Linux as well. The app is then at `http://localhost:8080`.

All settings live in `apps/api/.env`. The example file lists every one, and no value in it is a secret.

| Variable                                                   | Needed for                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                             | Everything past `/api/health`. A Neon-style `postgres://` URL is rewritten for `asyncpg` automatically. |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2`                       | Live Gemini extraction on `/judge`. The second key is tried only after the first hits a rate limit.     |
| `TYPESAFE_API_KEY`                                         | Live Jev decisions on `/judge`.                                                                         |
| `GCS_BUCKET`                                               | Durable object storage. When unset, objects are kept in memory.                                         |
| `GEMINI_MODEL`, `JEV_MODEL`, `DATA_POLICY`, `RULE_VERSION` | Locked values. Keep them as `.env.example` has them.                                                    |

Without the AI keys, the seed baseline still works in full. A `/judge` check fails closed with "Live AI checks are not configured on this server."

The tests run the same commands CI does. The PostgreSQL integration tests run only when `TEST_DATABASE_URL` is set, for example to `postgresql+asyncpg://postgres:postgres@localhost:5432/averis`.

```shell
cd apps/api && uv run ruff check && uv run ruff format --check && uv run pytest
cd apps/web && bun run test && bun run build
```

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- ROADMAP -->

## Roadmap

See [open issues](https://github.com/Averis-T010NG/LadingLens/issues) for a full list of proposed features (and known issues).

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- CONTRIBUTING -->

## Team

<a href="https://github.com/Averis-T010NG/LadingLens/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Averis-T010NG/LadingLens" alt="Team" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

Dependencies keep their own licences. The [third-party notices](docs/references/third-party-notices.md) list them, including PyMuPDF's AGPL-3.0 terms.

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- Averis and the [Averis x Monash Hackathon 2026](https://averisxmonashhackathon2026.my/) organisers, MUMTEC and GDG on Campus at Monash University Malaysia, for the challenge and the synthetic dataset
- [Google Gemini](https://ai.google.dev/) and [TypeSafe](https://docs.typesafe.ai/)
- [Archify][Archify-url]
- [Hugeicons](https://hugeicons.com/)
- [Shields.io](https://shields.io)
- [contrib.rocks](https://contrib.rocks)

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- MARKDOWN LINKS & IMAGES -->

[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript.org]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Vite.dev]: https://img.shields.io/badge/Vite-9135FF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vite.dev/
[Bun.sh]: https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white
[Bun-url]: https://bun.sh/
[Python.org]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[FastAPI.com]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[PostgreSQL.org]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[Gemini.google]: https://img.shields.io/badge/Gemini_3.5_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white
[Gemini-url]: https://ai.google.dev/
[TypeSafe.ai]: https://img.shields.io/badge/TypeSafe_Jev-0F172A?style=for-the-badge
[TypeSafe-url]: https://docs.typesafe.ai/
[CloudRun.google]: https://img.shields.io/badge/Cloud_Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white
[CloudRun-url]: https://cloud.google.com/run
[Docker.com]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[GitHubActions.com]: https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white
[GitHubActions-url]: https://github.com/features/actions
[Archify-url]: https://github.com/tt-a1i/archify
