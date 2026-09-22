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
    <a href="docs/references/demo-runbook.md">Demo Runbook</a>
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
    <li>
      <a href="#faq">FAQ</a>
      <ul>
        <li><a href="#problem-solution-alignment">Problem-Solution Alignment</a></li>
        <li><a href="#ai-and-cloud-infrastructure-integration">AI and Cloud Infrastructure Integration</a></li>
        <li><a href="#user-feedback-and-testing">User Feedback and Testing</a></li>
        <li><a href="#coding-challenges">Coding Challenges</a></li>
        <li><a href="#success-metrics">Success Metrics</a></li>
        <li><a href="#scalability-plans">Scalability Plans</a></li>
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
| **Video Presentation**  | **https://youtu.be/U5_-aXgpJdU**                                                                                                                                                              |
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
- The live path is slow and quota-bound. In the one retained benchmark run, only 5 of 20 end-to-end trials completed, with a p95 of 25.6 s, so the 10-second target is not met ([docs/references/ai.md](docs/references/ai.md#measured-latency)). A provider failure fails closed with a plain message and a labelled prepared fallback, never a fabricated result.

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

The five-minute walkthrough in the [demo runbook](docs/references/demo-runbook.md#five-minute-demo-script), step by step:

1. **Sign in as a guest.** Open the [live demo](https://averis-222536409832.asia-southeast1.run.app) and choose **Sign in as Guest** on `/auth`. The email and password fields do nothing. You land on `/inbox`, already seeded with all 520 synthetic emails.

   [![Inbox](assets/screens/03-inbox.png)](https://averis-222536409832.asia-southeast1.run.app/inbox)

2. **Gate 1: every email is accounted for.** The inbox lists every received email with its category and outcome. Only a `BL_COMPARISON` email goes on to evidence comparison.

3. **Compare the evidence.** Open a comparison case such as `/emails/email_001`. The seven fields sit side by side, with the SI as the reference. Each verdict is `MATCH`, `MISMATCH` or `REVIEW`, and shows the evidence it came from in both documents.

   [![Case evidence](assets/screens/04-email-detail.png)](https://averis-222536409832.asia-southeast1.run.app/emails/email_001)

4. **Hand held cases to a person.** `/review` lists the 20 cases the system will not decide alone, with the reason for each. `email_511`'s draft BL will not open, `email_512` is an image-only scan whose values were read by OCR, and `email_516` has fields the customer left blank. A named reviewer approves, corrects or rejects each one.

   [![Review queue](assets/screens/05-review.png)](https://averis-222536409832.asia-southeast1.run.app/review)

5. **Gate 2: catch what never arrived.** `/reconciliation` opens on its inputs: the expected-shipment ledger and the BL cases that arrived. Run reconciliation, and shipment `SHP-5RFR-37631`, named by an SI request, expects a draft BL, but no email ever created a case for it. Gate 2 marks it `MISSING_CASE`, which Gate 1 could never catch on its own, and its exceptions join the review queue.

   [![Reconciliation](assets/screens/09-reconciliation.png)](https://averis-222536409832.asia-southeast1.run.app/reconciliation)

6. **Check a pair of your own.** Open [`/judge`](https://averis-222536409832.asia-southeast1.run.app/judge); no sign-in is needed, and it opens the workspace's **Upload** page. Drop one SI and one draft BL, in either order, as TXT, PDF, DOCX or XLSX, up to 5 MiB each; the check reads each file to tell which is which. Confirm they are synthetic and choose **Check documents**. To check up to 20 pairs in one go, drop a `.json` batch of dataset email records (with their attachment files) or pairs. A waiting screen follows the three pipeline steps while the live run works: you get all seven verdicts with evidence, or a plain failure with a retry button and a labelled `PREPARED FALLBACK` example underneath.

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
- **Human sign-off.** Held cases can be approved, corrected or rejected. Reconciliation exceptions can be acknowledged, escalated or resolved.
- **Control graph.** Every case reads as one chain from email to shipment, with the verdict of each stage on its link and the parties, ports and shipments that connect cases traceable across them.
- **Evaluation view.** It counts classification coverage and each kind of outcome: comparison, processing status and reconciliation.
- **Submission artifacts.** The Upload page downloads `submission.json` in the organisers' scored format, and `/reconciliation` downloads the expected-shipments CSV ledger it reconciles against (a replacement CSV can be imported there too).
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

The diagram's source is [`docs/readme/architecture.json`](docs/readme/architecture.json). It is drawn with [Archify][Archify-url] and exported in the LadingLens palette by [`docs/readme/export-architecture.mjs`](docs/readme/export-architecture.mjs). There is more detail in [docs/references/architecture.md](docs/references/architecture.md), [docs/references/ai.md](docs/references/ai.md), [docs/references/cloud.md](docs/references/cloud.md) and the [API reference](docs/references/api.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Tech Stack

- **Frontend:** React 19, React Router 7, TypeScript 6, Vite 8 and Hugeicons, with Archivo and Martian Mono self-hosted. Tested with Vitest and Testing Library, and built with Bun.
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

This runs LadingLens locally, with the API on port 8080 and the Vite dev server in front of it. The [demo runbook](docs/references/demo-runbook.md) covers every step in more detail.

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

   At startup it builds the seed baseline: the real pipeline, replayed over the checked-in 520-email synthetic bundle, with prepared decisions in place of provider calls. `http://localhost:8080/api/health/ready` reports whether the database is reachable. To rebuild the prepared data, run these from `apps/api` in order: `uv run python scripts/build_seed_decisions.py` (the decisions file), `scripts/build_expected_shipments.py` (the expected-shipment ledger) and `scripts/build_web_fixtures.py` (the web app's fixtures).

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

<!-- FAQ -->

## FAQ

Short answers about how LadingLens fits the challenge, how it is built and tested, and where it goes next.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Problem-Solution Alignment

The challenge asks for a system that goes from an email inbox to a discrepancy report. LadingLens covers each capability it lists, including the advanced stage:

- **Classify.** Gate 1 receipts and hashes every email, then gives it exactly one of the five categories. Only a `BL_COMPARISON` email goes on to the check.
- **Extract data.** TXT, XLSX, DOCX and digital PDFs are parsed locally with exact anchors. Gemini 3.5 Flash reads only image-only scans and fields a local parse leaves ambiguous.
- **Compare.** Seven fields, with the SI as the reference, side by side with where each value came from. Label variants such as `Port of Loading` and `Load Port` map to one field, and normalisation plus Jev tell a real discrepancy from a formatting difference.
- **Ask for help.** An unreadable file, a missing attachment or value, a wrong document type or an uncertain match is held for a person with the evidence and the reason. A provider failure is shown as a failure, with a retry.

It also covers the failure an inbox-only design cannot see: an email that never arrived. Gate 2 checks an independent expected-shipment ledger against the cases, so `SHP-5RFR-37631` surfaces as `MISSING_CASE` with no email behind it. The result is a desk that works by exception, not by volume.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### AI and Cloud Infrastructure Integration

Two AI providers do narrow, checked jobs, and deterministic Python owns everything else, including every number and every state change.

- **Gemini 3.5 Flash** transcribes field values from a scanned PDF or an ambiguous field. The answer must fit a strict JSON schema, and a value is kept only if it is grounded: found verbatim in the document's own text, or tied to a valid page and region on a scan.
- **Jev `jev-1.13.0`**, pinned, decides the email category, each document's role (SI, draft BL or other) and whether two differently written text values mean the same thing. A response from any other model version is rejected.
- **Gemini 3.5 Flash-Lite** answers questions about the control graph. An answer that cites anything outside what it was given is refused, not shown.
- **A failure never becomes a verdict.** Each Gemini or Jev failure is classified, audited and shown with a retry, and nothing silently falls back to another provider.

In the cloud, one Cloud Run service serves the API and the compiled React app, and a Cloud Run job runs the database migrations before each release. PostgreSQL is the system of record, source documents are create-only objects in a private Cloud Storage bucket, and the runtime reads exactly four secrets from Secret Manager. GitHub Actions deploys through Workload Identity Federation, so it never holds a service-account key, and every deploy must pass a smoke check against the live URL. There is more in [docs/references/ai.md](docs/references/ai.md) and [docs/references/cloud.md](docs/references/cloud.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>

### User Feedback and Testing

Averis's operators have not used LadingLens yet. It runs only on the organisers' synthetic bundle, so there is no real-user feedback or production accuracy figure to report, and we do not invent one. What we test instead:

- **Every pull request.** CI runs Ruff, applies every migration to a real PostgreSQL 16 and runs pytest against it. The web app gets Vitest with Testing Library and a production build.
- **Every deploy.** A fail-closed smoke check covers health, readiness on the real database, the SPA fallback, a public `/judge`, the exact 520-record submission artifact and anonymous denial of a private object.
- **The live path.** A GitHub Actions benchmark timed the real providers over 20 trials and kept the raw result in the repository (see [Success Metrics](#success-metrics)).
- **Anyone, including judges.** `/judge` checks a pair nobody has seen before, with no account, and Reset All returns the workspace to the baseline for the next person.

The feedback loop for a pilot is already built in. Every approval, correction and rejection records who made it and why, in an append-only history. Those overrides, with review-queue age and how often a held case really needed a person, are what we would use to recalibrate the match thresholds, which must happen before any production use.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Coding Challenges

- **Seeing an absence.** No classifier, however accurate, can find an email that never arrived. Gate 2 needed a record from outside the inbox, so we built an expected-shipment ledger (synthetic for now) and reconciled it against the cases, with six explicit outcomes.
- **Keeping models honest.** We treat every model answer as untrusted input: schema-checked JSON, verbatim grounding against the document's own text, a page and region for scans, and a pinned-version check on every Jev response. A value that fails is refused, never guessed.
- **Discrepancy or formatting?** Deterministic normalisation runs first, and only text that still differs goes to Jev, with rules per field. A port that differs only in spelling, punctuation or an added country or UN/LOCODE is the same port, but a different city is not, even with the same UN/LOCODE. A party name may differ in case or abbreviations, but not in words that change the legal entity.
- **Provenance in every format.** Each value keeps an anchor to its source: line and column in TXT, a bounding box in a digital PDF, a cell in XLSX, a table cell or paragraph in DOCX. An image-only scan has no text layer, so its anchor is approximate and the case is held for a person even after comparison.
- **One verdict, two contracts.** The organisers' scored format allows `NEEDS_REVIEW` only for four structural reasons, but an operator should still see an uncertain text match. So the same verdict maps twice: an ambiguous field is `REVIEW` on screen and `MISMATCH` in `submission.json`.
- **Free-tier latency and quota.** In the retained run, 15 of 20 live trials failed closed: 9 Gemini timeouts, most after a rate limit, 5 provider 503s, then an exhausted daily quota. Gemini's thinking time dominated the trials that finished. We made each failure visible and retryable, and we publish the miss rather than hide it.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Success Metrics

The first four rows are the prepared seed baseline over the organisers' 520-email synthetic bundle, labelled as prepared in the app. The last is the one retained live run, GitHub Actions run 35579538701 ([measured latency](docs/references/ai.md#measured-latency)).

| Metric              | Target                                                   | Result                                                |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| Gate 1 completeness | Every received email ends on a recorded outcome          | 520 of 520 accounted for, 0 lost                      |
| Outcome split       | Refusals published beside passes, never folded into them | 454 `OK`, 46 `MISMATCH`, 20 `NEEDS_REVIEW`            |
| Gate 2 absence      | An expected shipment with no email still surfaces        | `SHP-5RFR-37631` is `MISSING_CASE`                    |
| Scored artifact     | One exact five-key record per email ID                   | 520 records, re-checked on every deploy               |
| Live-path latency   | p95 under 10 s                                           | **Not met:** p95 25.6 s, and 5 of 20 trials completed |

We publish no accuracy score: the answer key is private, and the organisers' self-evaluation scoreboard is a development aid, not the final assessment. With real users, we would track escalation precision and recall, review-queue age and override causes, not accuracy alone.

<p align="right"><a href="#readme-top">&uarr;</a></p>

### Scalability Plans

Averis's desk can see up to 2,000 emails a day. Today's build is sized for a hackathon on purpose: one Cloud Run service that scales from zero to two instances, each taking 40 concurrent requests, with a RM30 monthly budget alert. Several choices already carry to a larger volume:

- **Durable state lives outside the container**, in PostgreSQL and Cloud Storage, so capacity grows by raising the instance cap. Each instance bounds its own memory-heavy live checks, two at a time by default.
- **No work is repeated.** Identical attachments are stored once by content hash, extraction results are cached by model, prompt and parser version, and replaying a batch changes nothing.
- **Provider calls are batched.** Jev classifies up to 16 emails per request.

The real bottleneck is the AI provider, not the container. Next, in order:

1. **Make the live path fast enough.** Issue per-document calls concurrently, keep the extraction path warm and lower Gemini's thinking level, then re-measure the same way until p95 is under 10 s.
2. **Reconcile the real ledger.** Replace the synthetic expected-shipment CSV with the operational booking feed, so Gate 2 reports on live bookings.
3. **Harden for volume.** Authenticated connectors for the live inbox and booking systems, durable and recoverable background jobs, monitoring and alerts, and thresholds calibrated on measured data.
4. **Earn real documents.** Approve retention, access, transfer and provider controls, which rules out today's free-tier AI keys, before a single production document is processed.

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
