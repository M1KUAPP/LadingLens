# Cloud and AI claims for LadingLens documentation

This is research input for GitHub issue #44: it backs every cloud and AI
claim LadingLens (Averis) can make in judge-facing documentation with a
repository file and a primary source, and flags what cannot yet be
claimed. It checks `docs/TRD.md`'s locked architecture against the deployed
configuration, the current code, and each vendor's own documentation.

**Status: dated snapshot.** This page records the repository as
researched on 2026-09-21, before issue #30 (the product API) and issue
#32 (the live-path latency benchmark) landed. For the current state, see
[docs/references/cloud.md](/docs/references/cloud.md) and
[docs/references/ai.md](/docs/references/ai.md); the research findings
below are left exactly as originally written.

Contents:

1.  [Fact table: cloud and AI components](#fact-table-cloud-and-ai-components)
1.  [What can and cannot be claimed](#what-can-and-cannot-be-claimed)
1.  [Hackathon rules for docs, AI, and cloud usage](#hackathon-rules-for-docs-ai-and-cloud-usage)
1.  [Repository vs. TRD mismatches](#repository-vs-trd-mismatches)
1.  [Implications for LadingLens documentation](#implications-for-ladinglens-documentation)

## Fact table: cloud and AI components

| Component                      | Role in LadingLens                                                                                            | Repo evidence                                                                                                                   | Primary source                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Cloud Run                      | Hosts the single container serving FastAPI routes and the built React SPA.                                    | `Dockerfile`; `.github/workflows/deploy.yml`; `docs/references/deployment.md`                                                   | [Cloud Run overview][cloud-run-overview]                                        |
| Artifact Registry              | Stores the image the deploy job builds and pushes each run.                                                   | `.github/workflows/deploy.yml` (`*-docker.pkg.dev`, `docker push`)                                                              | [Artifact Registry overview][artifact-registry]                                 |
| Secret Manager                 | Holds the four runtime secrets mounted into Cloud Run; no other secret is granted.                            | `.github/workflows/deploy.yml` (`sync_secret`); `docs/references/deployment.md` Secret Quarantine                               | [Secret Manager overview][secret-manager]                                       |
| Workload Identity Federation   | Authenticates the deploy job with a short-lived token, restricted to `main` and the repo's numeric ID.        | `.github/workflows/deploy.yml` (`auth@v2`); `infra/gcp-setup.sh` (`--attribute-condition`)                                      | [WIF for deployment pipelines][wif-pipelines]; [GitHub OIDC hardening][gh-oidc] |
| Cloud Storage (private bucket) | Stores source documents and submission artifacts as private, content-addressed objects.                       | `apps/api/app/storage.py`; `infra/gcp-setup.sh`; `scripts/verify_gcp_controls.py`                                               | [Uniform bucket-level access][gcs-ubla]; [Public access prevention][gcs-pap]    |
| PostgreSQL (Neon)              | Durable system of record for cases, shipments, reconciliation, review, and audit.                             | `apps/api/app/db.py` docstring; `test_deployment_hardening.py::test_neon_style_database_url_is_safe_for_runtime_and_migrations` | Not named in `deployment.md` — see wording guidance                             |
| Gemini 3.5 Flash               | Target model for scanned or locally ambiguous document extraction.                                            | `apps/api/app/gemini.py`; `apps/api/app/config.py` (`Literal["gemini-3.5-flash"]`)                                              | [Gemini API models][gemini-models]; [Gemini API terms][gemini-terms]            |
| TypeSafe Jev `jev-1.13.0`      | Typed `Choice` for email category (wired) and doc type (target); typed `Noul` for field equivalence (target). | `apps/api/app/jev.py`; `apps/api/app/ingestion.py` (`Gate1Classifier`); `pyproject.toml` (`typesafe-sdk==0.7.0`)                | [TypeSafe introduction][ts-intro]; [Choice][ts-choice]; [Noul][ts-noul]         |
| Deterministic Python           | Owns preflight, local parsing, normalization, numeric comparison, schema, and state.                          | `docs/TRD.md` locked architecture table; `apps/api/app/contracts.py`, `persistence.py`                                          | Team decision, not a vendor claim                                               |
| Named human reviewer           | Approves, corrects, or rejects a `BL_COMPARISON` case; owns disposition.                                      | `docs/TRD.md` (`CaseReviewAction`)                                                                                              | Team decision, not a vendor claim                                               |

## What can and cannot be claimed

- Cloud Run's region setting is a deployment choice, not proof of AI
  processing location. Cloud Run's docs state only that "customer data
  associated with the Cloud Run resource is stored in the selected region"
  ([Cloud Run locations][cloud-run-locations]); they say nothing about a
  called third-party API. `docs/TRD.md` and `docs/research/ideation/
qa-defence.md` already lock this boundary — reuse their wording rather
  than a stronger one.
- Workload Identity Federation removes the GCP service-account _key_ from
  GitHub, not all secrets. `DATABASE_URL`, `GEMINI_API_KEY`, and
  `TYPESAFE_API_KEY` are still long-lived GitHub Actions secrets synced
  into Secret Manager on every deploy (`.github/workflows/deploy.yml`,
  `sync_secret` step); [WIF for deployment pipelines][wif-pipelines]
  describes only the deploy job's own identity.
- The deployment is synthetic-data-only; do not describe it as
  PDPA-compliant or safe for real shipping documents. `DATA_POLICY` is a
  literal `"synthetic-only"` in `apps/api/app/config.py` and the deploy
  workflow. [Gemini API terms][gemini-terms] warn that on unpaid tiers
  "human reviewers may read, annotate, and process your API input and
  output," and instruct: "do not submit sensitive, confidential, or
  personal information."
- Do not call `gemini-3.5-flash` Google's newest or most accurate model.
  [Gemini API models][gemini-models] currently lists it as a stable but
  superseded Flash tier beneath newer 3.6/3.7/3.8 Flash releases. Google's
  model catalog moves fast, so re-check the live page rather than reuse
  this line verbatim at publish time.
- Jev does not do the arithmetic. TypeSafe's own guidance for this model
  says "Jev is not a calculator" and recommends implementers "keep the
  arithmetic in code" ([Jev 1.13 jaggedness][ts-jaggedness]); `docs/TRD.md`
  locks `container_count` and `gross_weight_kg` checks to deterministic
  Python for exactly this reason.
- Pinning `jev-1.13.0` instead of the `jev-latest` alias is the
  vendor-recommended practice, not just a team preference.
  [TypeSafe's model guidance][ts-models] says an alias "move[s] when a new
  release ships, so the answers behind it can change without a change on
  your side," and recommends pinning once thresholds are calibrated
  against a version.
- No live latency number can be claimed yet. `apps/api/scripts/
benchmark-results/` does not exist in the repository, and the only
  benchmark script present still calls an OpenRouter Flash-Lite endpoint
  and `jev-latest`, not the approved path. Any p95 claim needs a retained,
  versioned artifact per `docs/TRD.md`'s deployment section.
- "No alternative provider" is a codebase-enforced absence, not a promise
  against ever adding one. `apps/api/tests/test_provider_configuration.py`
  asserts no `openai` or `qwen` string appears in `Settings` fields,
  `.env.example`, or any file under `apps/api/app/`; state the claim at
  that precision.
- **Unverified:** Neon's specific data-location commitments for this
  project's database. `docs/references/deployment.md` never names the
  Postgres provider; only `apps/api/app/db.py`'s docstring, a test name,
  and `docs/research/ideation/qa-defence.md`'s prose say "Neon." This
  research did not fetch Neon's own documentation.
- **Unverified:** whether the Cloud Run service is reachable by a judge
  today. `docs/TRD.md`'s own Deployment row calls remote deployment status
  "unverified" as of its writing; this research read configuration and
  code only, not the live URL.

## Hackathon rules for docs, AI, and cloud usage

`docs/sources/google-docs/rules-and-regulations.md` is the in-repo copy of
the official rules; the organizers "reserve the right to modify the rules
and regulations without prior notice," so recheck the live document before
submission.

Under **AI Usage Requirement**:

> All submissions **must** incorporate AI and **utilize cloud
> infrastructure** as part of the solution's development, deployment or
> core functionality.
>
> Solutions that do not **meaningfully integrate cloud infrastructure** may
> receive significantly reduced scores.

Under **Submission Components** (part of `## Submission`):

> **GitHub Repository Link** _(Mandatory)_
>
> - Link to the project's source code with a clear README file that
>   includes setup instructions.
>
> **Slide Deck / Documentation Link** _(Mandatory)_
>
> - Provide a publicly accessible link to slide deck or project
>   documentation ... This should include: Technical Architecture,
>   Implementation Details, Challenges Faced, Future Roadmap

**Second Part: Project Details** (the Google Forms submission structure)
repeats item 5 in the same words: the documentation link must cover "the
technical architecture, implementation details, challenges, and future
roadmap."

`docs/research/ideation/qa-defence.md`'s competition-rules audit records
two gaps against these clauses as of 20 September 2026: no root
`README.md` existed, and "a configured key is not meaningful integration"
for the AI Usage Requirement until an AI workflow visibly runs. This
research did not re-run that audit; re-check both against the current tree
before publishing.

## Repository vs. TRD mismatches

Two cells in `docs/TRD.md`'s "Scope and delivery status" Current column no
longer match the code on this branch (`feat/issue-27-extraction`), reported
neutrally and not fixed here.

1.  **Gemini model default.** The Configuration row states: "`apps/api/
app/config.py` defaults `GEMINI_MODEL` to `gemini-3.5-flash-lite`."
    The current `apps/api/app/config.py` instead types `gemini_model` as
    `Literal["gemini-3.5-flash"]` — `gemini-3.5-flash-lite` is not a
    non-default value, it fails Pydantic validation entirely.
    `apps/api/tests/test_provider_configuration.py::
test_unapproved_model_or_data_policy_is_rejected` asserts exactly
    this: setting `GEMINI_MODEL=gemini-3.5-flash-lite` raises a
    `ValidationError`. `apps/api/.env.example` and `.github/workflows/
deploy.yml` also already carry `gemini-3.5-flash`, i.e. the code
    already matches the TRD's Target, not its stated Current.
2.  **Jev client and product decision calls.** The Jev row states: "A
    TypeSafe key setting and a historical benchmark script exist; no
    client or product decision calls exist." `apps/api/app/jev.py`
    (18 KB) already implements `JevCategoryClient.classify()` — batching,
    retry policy, typed-answer parsing — and `apps/api/app/ingestion.py`'s
    `InboxIngestionService` already calls it through a `Gate1Classifier`
    protocol for email categorization, exercised by `apps/api/tests/
test_gate1.py` and `apps/api/tests/test_jev.py`. This is a real
    client and a real product decision call at the service layer. It is
    not yet reachable through an HTTP route — `apps/api/app/main.py`
    exposes only `/api/health` and `/api/health/ready` — so the TRD's
    separate "API and SPA" row (no product routes yet) remains accurate.

This branch is mid-flight on issue #27 (extraction), so some staleness in
a living Current column is expected; this is a snapshot, not a defect
report.

## Implications for LadingLens documentation

- Write cloud and AI claims at the same precision `docs/TRD.md` and
  `docs/research/ideation/qa-defence.md` already use: name the exact
  service and control, and say what it does not prove in the same breath
  (region, residency, compliance).
- Keep the "no live latency number yet" and "free tier is synthetic-only"
  language until `apps/api/scripts/benchmark-results/` holds a retained,
  versioned run on the approved Gemini/Jev path.
- Re-verify the two TRD mismatches above, and the AI Usage Requirement
  gap noted in `qa-defence.md`, against the tree at submission time —
  both are fast-moving on an active branch.
- Treat this file as research input for whoever writes the public
  `README.md` and slide deck; it is not itself submission-ready copy.

[cloud-run-overview]: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
[cloud-run-locations]: https://docs.cloud.google.com/run/docs/locations
[artifact-registry]: https://docs.cloud.google.com/artifact-registry/docs/overview
[secret-manager]: https://docs.cloud.google.com/secret-manager/docs/overview
[wif-pipelines]: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
[gh-oidc]: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect
[gcs-ubla]: https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access
[gcs-pap]: https://docs.cloud.google.com/storage/docs/public-access-prevention
[gemini-models]: https://ai.google.dev/gemini-api/docs/models
[gemini-terms]: https://ai.google.dev/gemini-api/terms
[ts-intro]: https://docs.typesafe.ai/introduction.md
[ts-choice]: https://docs.typesafe.ai/primitives/choice.md
[ts-noul]: https://docs.typesafe.ai/primitives/noul.md
[ts-models]: https://docs.typesafe.ai/models.md
[ts-jaggedness]: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md
