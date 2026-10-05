<a id="readme-top"></a>

<!-- PROJECT LOGO -->

<br />
<div align="center">
  <a href="https://github.com/M1KUAPP/LadingLens">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/readme/banner-dark.png">
      <img src="docs/readme/banner-light.png" alt="LadingLens banner">
    </picture>
  </a>

  <h3>LadingLens</h3>

  <p>
    A shipping inbox-control system that reconciles expected shipments with cases and checks SI-to-BL fields against source evidence for sign-off.
    <br />
    <a href="https://youtu.be/U5_-aXgpJdU"><strong>Watch the Demo »</strong></a>
    &middot;
    <a href="#screenshots">Screenshots</a>
    &middot;
    <a href="https://github.com/M1KUAPP/LadingLens/issues/new?labels=bug">Report a Bug</a>
    <br />
  </p>

[![TypeScript][typescript-badge]][typescript-url]
[![Python][python-badge]][python-url]
[![React][react-badge]][react-url]
[![Vite][vite-badge]][vite-url]
[![Bun][bun-badge]][bun-url]
[![FastAPI][fastapi-badge]][fastapi-url]
[![SQLAlchemy][sqlalchemy-badge]][sqlalchemy-url]
[![PostgreSQL][postgresql-badge]][postgresql-url]
[![Google Gemini][googlegemini-badge]][googlegemini-url]
[![TypeSafe Jev][typesafejev-badge]][typesafejev-url]
[![Cloud Run][cloudrun-badge]][cloudrun-url]
[![Docker][docker-badge]][docker-url]
[![uv][uv-badge]][uv-url]
[![Ruff][ruff-badge]][ruff-url]
[![pytest][pytest-badge]][pytest-url]

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

Every email accounted for. Every expected shipment answered for.

Averis's shipping-operations team gets every kind of message in one inbox, up to 2,000 emails a day. For a document-checking request, an analyst compares the customer's Shipping Instruction (SI) with the draft Bill of Lading (BL) field by field.

Two failures matter, and only one of them is visible from the inbox. The first is a mismatch between the two documents that a tired reader misses. The second is a shipment that was expected and never arrived as an email at all. **You cannot notice an email you never received.**

<div align="center">
  <img src="docs/readme/problem-6koma.png" alt="Six-panel manga: a coordinator buried under 520 emails, checking seven fields across an SI and a draft BL by hand, rubber-stamping at midnight while POD SGSIN versus NLRTM slips past, a manager demanding to know where SYN-042 went when no email ever arrived for it, the two gates balancing the books, and a calm evidence-backed sign-off" width="100%" />
</div>

LadingLens treats both failures as one control problem. It borrows the answer from double-entry bookkeeping: check the inbox against an independent record of what should have been there. Two independent controls and a named human sit around the inbox:

- **Gate 1 accounts for every received email.**
- **Gate 2 reconciles what was supposed to arrive.**
- **Evidence comparison checks each valid SI/draft-BL pair over seven fields.**
- **A named human makes every consequential decision.**

Watch the [video presentation](https://youtu.be/U5_-aXgpJdU), or read the [pitch deck](docs/pitch/deck/ladinglens-deck.html), also as a [PDF](docs/pitch/deck/ladinglens-deck.pdf). See the deployment's [limitations](docs/references/architecture.md#limitations).

Built for [Averis x Monash Hackathon 2026](https://averisxmonashhackathon2026.my/).

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Screenshots

Captured at 1440x900 against the deployed service.

<table>
  <tr>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/judge.png" alt="Judge" width="100%">
      <br />
      <strong>Public Judge Path</strong> · Checks one SI and one draft BL with the live pipeline, without signing in.
    </td>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/landing.png" alt="Landing" width="100%">
      <br />
      <strong>Landing</strong> · Introduces LadingLens: every email accounted for, every expected shipment answered for.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/inbox.png" alt="Inbox" width="100%">
      <br />
      <strong>Inbox</strong> · Lists every received email with its Gate 1 category and outcome.
    </td>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/email-detail.png" alt="Case evidence" width="100%">
      <br />
      <strong>Case Evidence</strong> · Compares seven fields side by side, each verdict backed by evidence from both documents.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/review.png" alt="Review queue" width="100%">
      <br />
      <strong>Review Queue</strong> · Queues held cases and reconciliation exceptions, each with its reason, for a named reviewer.
    </td>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/evaluation.png" alt="Evaluation" width="100%">
      <br />
      <strong>Evaluation</strong> · Counts classification coverage and every comparison, processing status and reconciliation outcome.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/graph.png" alt="Control graph" width="100%">
      <br />
      <strong>Control Graph</strong> · Traces each case from email to shipment, with each stage's verdict on its link.
    </td>
    <td width="50%" valign="top" align="left">
      <img src="docs/readme/screenshots/settings.png" alt="Settings" width="100%">
      <br />
      <strong>Settings</strong> · Offers Reset All, which returns the guest workspace to the seed baseline.
    </td>
  </tr>
</table>

<p align="right"><a href="#readme-top">&uarr;</a></p>

### How It Works

The five-minute walkthrough in the [demo runbook](docs/references/demo-runbook.md#five-minute-demo-script), step by step:

1.  **Sign in as a guest.** Open the [live demo](https://averis-222536409832.asia-southeast1.run.app) and choose **Sign in as Guest** on `/auth`. The email and password fields do nothing. You land on `/inbox`, already seeded with all 520 synthetic emails.

    <img src="docs/readme/steps/1-guest-sign-in.png" alt="The sign-in page, with the Sign in as Guest button below the email and password fields" width="100%">

2.  **Gate 1: every email is accounted for.** The inbox lists every received email with its category and outcome. Only a `BL_COMPARISON` email goes on to evidence comparison.

    <img src="docs/readme/steps/2-inbox-categories.png" alt="The inbox filtered to the BL_COMPARISON category, each email with its category and status" width="100%">

3.  **Compare the evidence.** Open a comparison case such as `/emails/email_001`. The seven fields sit side by side, with the SI as the reference. Each verdict is `MATCH`, `MISMATCH` or `REVIEW`, and shows the evidence it came from in both documents.

    <img src="docs/readme/steps/3-field-evidence.png" alt="The seven-field comparison for email_001, with the source evidence for the port of loading below it" width="100%">

4.  **Hand held cases to a person.** `/review` lists the 20 cases the system will not decide alone, with the reason for each. `email_511`'s draft BL will not open, `email_512` is an image-only scan whose values were read by OCR, and `email_516` has fields the customer left blank. A named reviewer approves, corrects or rejects each one.

    <img src="docs/readme/steps/4-held-case.png" alt="The held case email_511, with its unreadable draft BL, its review reason and the approve, correct and reject actions" width="100%">

5.  **Gate 2: catch what never arrived.** `/reconciliation` opens on its inputs: the expected-shipment ledger and the BL cases that arrived. Run reconciliation, and shipment `SHP-5RFR-37631`, named by an SI request, expects a draft BL, but no email ever created a case for it. Gate 2 marks it `MISSING_CASE`, which Gate 1 could never catch on its own, and its exceptions join the review queue.

    <img src="docs/readme/steps/5-missing-case.png" alt="A reconciliation run showing shipment SHP-5RFR-37631 as MISSING_CASE, with no received case beside it" width="100%">

6.  **Check a pair of your own.** Open [`/judge`](https://averis-222536409832.asia-southeast1.run.app/judge); no sign-in is needed, and it opens the workspace's **Upload** page. Drop one SI and one draft BL, in either order, as TXT, PDF, DOCX or XLSX, up to 5 MiB each; the check reads each file to tell which is which. Confirm they are synthetic and choose **Check documents**. To check up to 20 pairs in one go, drop a `.json` batch of dataset email records (with their attachment files) or pairs. A waiting screen follows the three pipeline steps while the live run works: you get all seven verdicts with evidence, or a plain failure with a retry button and a labeled `PREPARED FALLBACK` example underneath.

    <img src="docs/readme/steps/6-upload-pair.png" alt="The Upload page with one SI and one draft BL staged and the synthetic-data box checked" width="100%">

7.  **Reset and repeat.** **Reset All** on `/settings` returns your guest workspace to the seed baseline exactly as shipped, ready for the next person.

    <img src="docs/readme/steps/7-reset-all.png" alt="The Reset all demo data confirmation on the Settings page" width="100%">

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Features

- **Every email receipted and categorized.** All 520 bundle emails are hashed, persisted and categorized, and replaying the same batch changes nothing.
- **Independent shipment reconciliation.** Every expected shipment resolves to exactly one of six outcomes: `CASE_PRESENT`, `DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`, `DUPLICATE_OR_AMBIGUOUS` or `SOURCE_STALE`.
- **Seven-field comparison with source evidence.** How precise the evidence is depends on the format: line and column for TXT, a text bounding box for a digital PDF, sheet and cell for XLSX, a table cell or paragraph for DOCX, and an approximate page and region for a scanned PDF.
- **A locked match policy.** When text differs, it gets a typed match probability: values of 0.85 and above are `MATCH`, 0.30 and below are `MISMATCH`, and anything between is held for a reviewer. Numbers are compared in Python, never by a model.
- **Fail-closed AI.** A Gemini or Jev failure is classified, audited and shown as a failure with a retry. It never becomes a verdict.
- **Append-only audit trail.** A Postgres trigger rejects in-place updates and deletes on every append-only table, including audit events, review actions, reconciliation results and model decisions.
- **Human sign-off.** Held cases can be approved, corrected or rejected. Reconciliation exceptions can be acknowledged, escalated or resolved.
- **Control graph.** Every case reads as one chain from email to shipment, with the verdict of each stage on its link and the parties, ports and shipments that connect cases traceable across them.
- **Evaluation view.** It counts classification coverage and each kind of outcome: comparison, processing status and reconciliation.
- **Submission artifacts.** The Upload page downloads `submission.json` in the organizers' scored format, and `/reconciliation` downloads the expected-shipments CSV ledger it reconciles against (a replacement CSV can be imported there too).
- **Guest workspaces.** There is no sign-up. A guest's first action on a seed case copies it into their own workspace, and Reset All restores the shared baseline.
- **Public judge mode.** `/judge` runs a fresh SI/draft-BL pair through the same live pipeline as every other case, with no account.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/architecture-dark.svg">
  <img src="docs/readme/architecture-light.svg" alt="LadingLens architecture: the React SPA calls FastAPI on Cloud Run over HTTPS. FastAPI uses PostgreSQL, a private Cloud Storage bucket, Secret Manager, Gemini 3.5 Flash and Jev jev-1.13.0. Cloud Run deploys images from Artifact Registry.">
</picture>

The diagram is drawn with [archify](https://github.com/tt-a1i/archify) from [`architecture.json`](docs/readme/architecture.json).

A single Cloud Run container serves the FastAPI API and the compiled React app. PostgreSQL is the system of record. Source documents are stored as create-only objects in a private Cloud Storage bucket. The runtime gets its secrets from Secret Manager.

Deploys are manual. The [removed deploy workflow](https://github.com/M1KUAPP/LadingLens/blob/89b1d2fa5ed1825505f0f8b73d1b791cac260cf3/.github/workflows/deploy.yml) records the steps it ran: the database migrations as a Cloud Run job first, then the service deploy, then a smoke check of the live service.

Each kind of decision has exactly one owner:

| Owner                    | Decides                                                                                                                                                                       | Never decides                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Deterministic Python     | File checks; parsing TXT, XLSX, DOCX and digital PDFs; normalization; both numeric comparisons; schema, state, persistence and audit                                          | What a document is, or what its text means         |
| Gemini 3.5 Flash         | Field values from a scanned PDF or a document whose local parse is ambiguous. Every answer is schema-validated, and a grounded answer must appear verbatim in the source text | Clean digital documents, categories or equivalence |
| Jev `jev-1.13.0`, pinned | Email category, document role (SI, draft BL or other) and textual field equivalence                                                                                           | Numbers, arithmetic or persistence                 |
| Named human reviewer     | Approving, correcting or rejecting a held case; assigning, acknowledging, escalating or resolving an exception                                                                | Nothing: theirs is the only final disposition      |

[`docs/readme/export-architecture.mjs`](docs/readme/export-architecture.mjs) exports the diagram in the LadingLens palette. There is more detail in [docs/references/architecture.md](docs/references/architecture.md), [docs/references/ai.md](docs/references/ai.md), [docs/references/cloud.md](docs/references/cloud.md) and the [API reference](docs/references/api.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Tech Stack

- **Languages:** TypeScript 6 for the web app and Python 3.12 for the API.
- **Frontend:** React 19, React Router 7, Vite 8 and Hugeicons, with Archivo and Martian Mono self-hosted.
- **Backend:** FastAPI, SQLAlchemy 2 (async, on asyncpg), Alembic, Pydantic Settings, PyMuPDF, openpyxl and python-docx.
- **Data:** PostgreSQL 16, and Google Cloud Storage for source documents and submission artifacts.
- **AI and services:** Gemini 3.5 Flash through `google-genai`, and TypeSafe Jev `jev-1.13.0` through `typesafe-sdk` 0.7.0.
- **Infrastructure:** Cloud Run, as a service and a migration job; Artifact Registry and Secret Manager; and Docker.
- **Tooling:** Bun builds the web app and uv manages the API. Vitest and Testing Library test the web app, and Ruff and pytest lint and test the API.

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- GETTING STARTED -->

## Getting Started

This runs LadingLens locally, with the API on port 8080 and the Vite dev server in front of it, and needs no AI keys unless you want live `/judge` checks. See the [demo runbook](docs/references/demo-runbook.md) for more.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Prerequisites

- [uv](https://docs.astral.sh/uv/) — installs the pinned Python 3.12 and the API's dependencies.
- [Bun](https://bun.sh/) — installs and builds the web app.
- [PostgreSQL](https://www.postgresql.org/) 16 — for anything past the bare health check. With Docker, this starts one that matches the commands below:

  ```sh
  docker run --name ladinglens-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=averis -p 5432:5432 -d postgres:16
  ```

- [Docker](https://www.docker.com/) — only to run PostgreSQL as above or to build the full container image.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Installation

1.  **Clone the repository.**

    ```sh
    git clone https://github.com/M1KUAPP/LadingLens.git
    cd LadingLens
    ```

2.  **Configure, install and migrate the API.**

    ```sh
    cd apps/api
    cp .env.example .env
    uv sync
    export DATABASE_URL=postgres://postgres:postgres@localhost:5432/averis
    uv run alembic upgrade head
    ```

    Set the same `DATABASE_URL` in `apps/api/.env` too. The server reads it from `.env`, but `alembic` never reads `.env`. It takes `DATABASE_URL` from the shell, and without it falls back to `alembic.ini`'s local default.

    All settings live in `apps/api/.env`. The example file lists every one, and no value in it is a secret.

    | Variable                                                   | Needed for                                                                                              |
    | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
    | `DATABASE_URL`                                             | Everything past `/api/health`. A Neon-style `postgres://` URL is rewritten for `asyncpg` automatically. |
    | `GEMINI_API_KEY`, `GEMINI_API_KEY_2`                       | Live Gemini extraction on `/judge`. The second key is tried only after the first hits a rate limit.     |
    | `TYPESAFE_API_KEY`                                         | Live Jev decisions on `/judge`.                                                                         |
    | `GCS_BUCKET`                                               | Durable object storage. When unset, objects are kept in memory.                                         |
    | `GEMINI_MODEL`, `JEV_MODEL`, `DATA_POLICY`, `RULE_VERSION` | Locked values. Keep them as `.env.example` has them.                                                    |

    Without the AI keys, the seed baseline still works in full. A `/judge` check fails closed with "Live AI checks are not configured on this server."

3.  **Start the API.**

    ```sh
    uv run uvicorn app.main:app --reload --port 8080
    ```

    At startup it builds the seed baseline: the real pipeline, replayed over the checked-in 520-email synthetic bundle, with prepared decisions in place of provider calls. `http://localhost:8080/api/health/ready` reports whether the database is reachable. To rebuild the prepared data, run these from `apps/api` in order: `uv run python scripts/build_seed_decisions.py` (the decisions file), `scripts/build_expected_shipments.py` (the expected-shipment ledger) and `scripts/build_web_fixtures.py` (the web app's fixtures).

4.  **Start the web app in a second terminal.** Then open the URL Vite prints (`http://localhost:5173` by default). Vite proxies `/api` to port 8080.

    ```sh
    cd apps/web
    bun install
    bun run dev
    ```

5.  **Or build and run the full container, exactly as deployed.** Run these from the repository root.

    ```sh
    docker build -t ladinglens .
    docker run --rm -p 8080:8080 --env-file apps/api/.env \
      -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/averis \
      --add-host=host.docker.internal:host-gateway ladinglens
    ```

    Inside the container, `localhost` is the container itself. The `-e` flag overrides `DATABASE_URL` for the container only, so `apps/api/.env` still works for step 3. `--add-host` makes `host.docker.internal` reach your machine on Linux as well. The app is then at `http://localhost:8080`.

6.  **Run the checks.** From the repository root, after `bun install`, this runs Prettier, the API's Ruff checks and tests, and the web app's tests and build. The PostgreSQL integration tests run only when `TEST_DATABASE_URL` is set, for example to `postgresql+asyncpg://postgres:postgres@localhost:5432/averis`.

    ```sh
    bun run check
    ```

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- ROADMAP -->

## Roadmap

See [open issues](https://github.com/M1KUAPP/LadingLens/issues) for a full list of proposed features (and known issues).

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- CONTRIBUTING -->

## Team

<a href="https://github.com/M1KUAPP/LadingLens/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=M1KUAPP/LadingLens" alt="Team" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- LICENSE -->

## License

See [LICENSE](LICENSE) for more information.

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [Averis x Monash Hackathon 2026](https://averisxmonashhackathon2026.my/) — Averis and the organizers, MUMTEC and GDG on Campus at Monash University Malaysia, for the challenge and the synthetic dataset.
- [Google Gemini](https://ai.google.dev/) — Gemini 3.5 Flash, which reads field values from scanned PDFs and documents whose local parse is ambiguous.
- [TypeSafe](https://docs.typesafe.ai/) — Jev `jev-1.13.0`, which decides email categories, document roles and textual field equivalence.
- [archify](https://github.com/tt-a1i/archify) — architecture diagrams.
- [Hugeicons](https://hugeicons.com/) — the web app's icons.
- [PyMuPDF](https://github.com/pymupdf/PyMuPDF) — Dependencies keep their own licenses. The [third-party notices](docs/references/third-party-notices.md) list them, including PyMuPDF's AGPL-3.0 terms.
- [Shields.io](https://shields.io)
- [contrib.rocks](https://contrib.rocks)

<p align="right"><a href="#readme-top">&uarr;</a></p>

<!-- MARKDOWN LINKS & IMAGES -->

[typescript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[python-badge]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[python-url]: https://www.python.org/
[react-badge]: https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black
[react-url]: https://react.dev/
[vite-badge]: https://img.shields.io/badge/Vite-9135FF?style=for-the-badge&logo=vite&logoColor=white
[vite-url]: https://vite.dev/
[bun-badge]: https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white
[bun-url]: https://bun.sh/
[fastapi-badge]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[fastapi-url]: https://fastapi.tiangolo.com/
[sqlalchemy-badge]: https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white
[sqlalchemy-url]: https://www.sqlalchemy.org/
[postgresql-badge]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[postgresql-url]: https://www.postgresql.org/
[googlegemini-badge]: https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white
[googlegemini-url]: https://ai.google.dev/
[typesafejev-badge]: https://img.shields.io/badge/TypeSafe_Jev-0F172A?style=for-the-badge
[typesafejev-url]: https://docs.typesafe.ai/
[cloudrun-badge]: https://img.shields.io/badge/Cloud_Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white
[cloudrun-url]: https://cloud.google.com/run
[docker-badge]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[docker-url]: https://www.docker.com/
[uv-badge]: https://img.shields.io/badge/uv-DE5FE9?style=for-the-badge&logo=uv&logoColor=white
[uv-url]: https://docs.astral.sh/uv/
[ruff-badge]: https://img.shields.io/badge/Ruff-D7FF64?style=for-the-badge&logo=ruff&logoColor=black
[ruff-url]: https://docs.astral.sh/ruff/
[pytest-badge]: https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white
[pytest-url]: https://docs.pytest.org/
