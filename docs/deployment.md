# Deployment

LadingLens deploys as a single Cloud Run service: FastAPI serves the API
routes and the compiled React build from the same container. The service is
deliberately locked to synthetic data, Gemini 3.5 Flash, and Jev 1.13.0.
Everything in this document describes the deployed state as verified; names
match `.github/workflows/deploy.yml`, `scripts/verify_gcp_controls.py`,
`scripts/smoke_deployment.py`, and the live GCP configuration.

Contents:

1.  [How deploys work](#how-deploys-work)
1.  [Resource names](#resource-names)
1.  [Workload Identity trust path](#workload-identity-trust-path)
1.  [Service accounts](#service-accounts)
1.  [Secrets and environment](#secrets-and-environment)
1.  [Private object storage](#private-object-storage)
1.  [Database migration](#database-migration)
1.  [Post-deploy verification](#post-deploy-verification)
1.  [Structured request logging](#structured-request-logging)
1.  [Synthetic-only upload policy](#synthetic-only-upload-policy)

## How deploys work

`.github/workflows/deploy.yml` runs on pushes to `main` (ignoring
documentation-only changes) and on `workflow_dispatch`. One `deploy` job,
serialized by a `deploy` concurrency group:

1.  Authenticates to Google Cloud through Workload Identity Federation as the
    deployer service account.
1.  Reapplies bucket hardening (uniform bucket-level access, public access
    prevention) and runs `scripts/verify_gcp_controls.py`; a failed control
    stops the deploy before any build.
1.  Synchronizes the approved GitHub secrets into Secret Manager. Required
    secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `TYPESAFE_API_KEY`) must be set
    or the step fails; `GEMINI_API_KEY_2` is optional and skipped when unset.
1.  Builds the image and pushes it to Artifact Registry, tagged with the git
    SHA.
1.  Updates and executes the `averis-migrate` Cloud Run job; a failed Alembic
    upgrade stops deployment before the service image changes.
1.  Deploys the `averis` Cloud Run service with the locked environment and a
    replacement secret map.
1.  Runs `scripts/smoke_deployment.py` against the public URL and retains the
    JSON report as a workflow artifact named `deployment-smoke-<git sha>`.

## Resource names

- GCP project: `muba-m1ku`; region: `asia-southeast1`.
- Cloud Run service: `averis`, publicly reachable at
  `https://averis-op7lf5dspq-as.a.run.app` (`--allow-unauthenticated`).
- Service shape: minimum 0 and maximum 2 instances, 1 GiB memory, 1 CPU,
  40 concurrent requests, 300-second timeout.
- Image: `asia-southeast1-docker.pkg.dev/muba-m1ku/averis/averis:<git sha>`,
  from the Artifact Registry Docker repository `averis`.
- Migration job: `averis-migrate`, same image and runtime service account.
- Workload Identity: pool `github-averis`, provider `github` in project
  number `222536409832`.
- Deployer service account:
  `averis-deployer@muba-m1ku.iam.gserviceaccount.com`.
- Runtime service account:
  `averis-runtime@muba-m1ku.iam.gserviceaccount.com`.
- Private object bucket: `gs://muba-m1ku-averis-docs`.
- Private canary object: `private-canary/smoke.txt` (repository variable
  `SMOKE_PRIVATE_OBJECT_KEY`).

The workflow reads repository variables `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, `DEPLOY_SA`, `RUNTIME_SA`, `GCS_BUCKET`,
`SMOKE_ARTIFACT_PATH`, and `SMOKE_PRIVATE_OBJECT_KEY`. `infra/gcp-setup.sh`
creates or reconciles every resource above; note the live IAM below is
narrower than the roles that script grants, so the script is a provisioning
reference, not the permission source of truth.

## Workload Identity trust path

GitHub Actions never holds a service-account key. The OIDC provider `github`
in pool `github-averis` (project number `222536409832`) issues tokens for
`https://token.actions.githubusercontent.com` and admits only:

```text
projects/222536409832/locations/global/workloadIdentityPools/github-averis/providers/github

assertion.repository=='Averis-T010NG/LadingLens'
    && assertion.ref=='refs/heads/main'
```

The attribute mapping exposes `google.subject=assertion.sub`,
`attribute.repository`, and `attribute.ref`. The deployer service account
grants `roles/iam.workloadIdentityUser` to exactly one principal:

```text
principalSet://iam.googleapis.com/projects/222536409832/
  locations/global/workloadIdentityPools/github-averis/
  attribute.repository/Averis-T010NG/LadingLens
```

Only workflows running on `main` in `Averis-T010NG/LadingLens` can therefore
impersonate the deployer.

## Service accounts

The deployer `averis-deployer@muba-m1ku.iam.gserviceaccount.com` exists only
to ship the service. It holds:

- `roles/run.admin` and `roles/secretmanager.admin` on the project, to deploy
  the service and synchronize secrets;
- the custom role `projects/muba-m1ku/roles/averisDeployPolicyReader`, whose
  only permission is `resourcemanager.projects.getIamPolicy`, so the
  fail-closed control verification can read the project IAM policy;
- `roles/artifactregistry.writer` on the `averis` repository, to push images;
- `roles/storage.legacyBucketOwner` and `roles/storage.legacyObjectReader`
  on the bucket, to reapply hardening and write the canary; and
- `roles/iam.serviceAccountUser` on the runtime account, to attach it to the
  service and the migration job.

The runtime `averis-runtime@muba-m1ku.iam.gserviceaccount.com` is the only
identity the service runs as, and it holds **no project-level IAM role at
all**. Its entire access is:

- `roles/secretmanager.secretAccessor` granted per-secret on exactly the four
  approved secrets below — nothing else in Secret Manager is reachable; and
- `roles/storage.objectCreator` and `roles/storage.objectViewer` on the
  bucket, each conditioned by the IAM condition titled
  `averis-private-object-prefixes`, which limits both roles to objects under
  `source-objects/` and `submission-artifacts/` only.

It cannot list the bucket, read outside those prefixes, use an object-admin
role, or read project resources.

## Secrets and environment

The runtime receives exactly four secrets, mounted from Secret Manager as
`latest` versions:

- `DATABASE_URL` from `averis-database-url` (PostgreSQL; also the only secret
  on the migration job);
- `GEMINI_API_KEY` from `averis-gemini-api-key`;
- `GEMINI_API_KEY_2` from `averis-gemini-api-key-2` (second free-tier key,
  used only when the first is rate-limited); and
- `TYPESAFE_API_KEY` from `averis-typesafe-api-key`.

The deploy step substitutes the whole secret map: any secret not in this
list — including the quarantined `averis-openai-api-key` — is neither synced
nor mounted. Non-secret configuration is set explicitly:

```text
GCS_BUCKET=muba-m1ku-averis-docs
APP_VERSION=<git sha>
GEMINI_MODEL=gemini-3.5-flash
JEV_MODEL=jev-1.13.0
RULE_VERSION=gate-2-v1
DATA_POLICY=synthetic-only
```

`GEMINI_MODEL`, `JEV_MODEL`, and `DATA_POLICY` are additionally validated as
literal values by `apps/api/app/config.py`, so an environment override cannot
select another model or enable real-document mode.

## Private object storage

`gs://muba-m1ku-averis-docs` has uniform bucket-level access and enforced
public-access prevention, and no binding grants `allUsers` or
`allAuthenticatedUsers`. The deploy step reapplies both hardening flags on
every run and the control verifier re-checks them remotely.

Source evidence and generated artifacts live under two prefixes,
`source-objects/` and `submission-artifacts/`, which are the only prefixes
the runtime can read or write (see
[Service accounts](#service-accounts)). Browsers never receive a public or
signed object URL: evidence bytes are served only through guest-authorized
API endpoints such as `/api/evidence/{id}`.

The object `private-canary/smoke.txt` is the known-private canary. The
control verifier requires it to exist, and the smoke check requires an
anonymous request to its public URL to be denied with HTTP 401 or 403 — a
404 is not accepted as proof of privacy.

## Database migration

`averis-migrate` is a Cloud Run job on the same image, executing
`alembic upgrade head` with `DATABASE_URL` from `averis-database-url:latest`,
the runtime service account, one retry, and a 10-minute task timeout. The
deploy workflow runs it to completion before `gcloud run deploy`; a failed
migration fails the job before traffic moves.

## Post-deploy verification

`scripts/smoke_deployment.py` is the public-surface check. It mints a demo
guest session through the unauthenticated `POST /api/session`, then requires
all of:

- `GET /api/health` → `ok` with a deployed version;
- `GET /api/health/ready` → `ok`, PostgreSQL reachable, approved key
  presence only (`gemini`, `gemini_2`, `typesafe`), `synthetic-only` policy;
- `/`, a deep client route, and `/judge` → the React entry point,
  unauthenticated and without redirects;
- `GET /api/artifacts/submission.json` with the guest
  `X-LadingLens-Session` header → the exact ordered 520-email,
  five-key evaluator artifact; and
- the canary object URL → anonymous HTTP 401 or 403.

It fails closed on a missing route, a redirect, HTML masquerading as an API
response, a signed or credentialed URL, or a partial artifact. Run it
manually with:

```shell
python scripts/smoke_deployment.py \
  --base-url https://averis-op7lf5dspq-as.a.run.app \
  --artifact-path /api/artifacts/submission.json \
  --private-object-url \
    https://storage.googleapis.com/muba-m1ku-averis-docs/private-canary/smoke.txt
```

`scripts/verify_gcp_controls.py` re-checks the control plane directly —
bucket hardening, no public principals, the conditioned runtime storage
roles, zero project-level runtime roles, the exact four-secret accessor
allowlist, and canary existence:

```shell
python scripts/verify_gcp_controls.py \
  --project muba-m1ku \
  --bucket muba-m1ku-averis-docs \
  --runtime-service-account averis-runtime@muba-m1ku.iam.gserviceaccount.com \
  --canary-key private-canary/smoke.txt
```

## Structured request logging

`apps/api/app/observability.py` emits one JSON `http_request` event per
request on the `averis.events` logger: server-generated `request_id`
(also returned as `X-Request-ID`), method and matched route template,
`model_version`, `rule_version`, `latency_ms`, `retries`,
`terminal_state`, `status_code`, plus `case_ids`, `source_hashes`, and
`route_choice` for the domain context of that request — `LIVE` on the judge
upload, retry, and run endpoints, `PREPARED`/`RECORDED` on seed-served
reads. Domain values are bound per request through
`bind_request_context`; requests without domain context emit empty lists and
`HTTP` route choice.

The emitter accepts only an allowlisted field set, validates shapes (SHA-256
hex for `source_hashes`, HTTP range for `status_code`), and rejects
credential-like values matching bearer tokens, API keys, passwords, or
PostgreSQL URLs. It never logs URLs, query strings, headers, bodies,
filenames, or exception messages; unhandled errors return only the safe
request ID. Uvicorn's access log is disabled (`--no-access-log`) so no raw
request target is logged alongside the structured event.

## Synthetic-only upload policy

The policy is enforced in code, not merely declared. `JudgeService.upload`
in `apps/api/app/judge.py` rejects any upload without an explicit
`synthetic_confirmed` form field before any persistence, object write, or
provider call, returning `422` with code `synthetic_only`. The deployed
setting is locked by `Literal["synthetic-only"]` in
`apps/api/app/config.py`, surfaced publicly by `GET /api/judge/policy` and
`/api/health/ready`, and asserted by the smoke check above.
