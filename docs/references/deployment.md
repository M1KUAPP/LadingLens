# Deployment

Averis ships as one Cloud Run container: FastAPI serves API routes and the
compiled React application. The deployed preliminary service is deliberately
locked to synthetic data, Gemini 3.5 Flash, and Jev 1.13.0.

Contents:

1.  [How Deploys Work](#how-deploys-work)
1.  [Resource Names](#resource-names)
1.  [Runtime Configuration](#runtime-configuration)
1.  [Secret Quarantine](#secret-quarantine)
1.  [Private Object Storage](#private-object-storage)
1.  [Post-Deploy Smoke Check](#post-deploy-smoke-check)
1.  [Structured Logs](#structured-logs)
1.  [Running Locally](#running-locally)
1.  [Cost Guardrails](#cost-guardrails)

## How Deploys Work

`.github/workflows/deploy.yml` runs on every relevant push to `main` and via
`workflow_dispatch`. It:

1.  Authenticates to Google Cloud with Workload Identity Federation.
1.  Reapplies bucket hardening and verifies effective storage, IAM, exact-secret,
    and private-canary controls.
1.  Validates and synchronizes the approved secrets into Secret Manager.
1.  Builds the container and pushes it to Artifact Registry.
1.  Updates and executes the `averis-migrate` Cloud Run job. A failed Alembic
    migration stops deployment before the service image changes.
1.  Deploys `averis` with a replacement secret map and locked model and data
    policy values.
1.  Runs `scripts/smoke_deployment.py` against the public service URL.

Pull requests run `.github/workflows/ci.yml`. The API job uses PostgreSQL 16,
runs every migration, and then runs Ruff and pytest with
`TEST_DATABASE_URL`; database tests must not silently skip in CI. The web job
runs the frozen Bun install, full Vitest suite, and production build.

## Resource Names

| Resource                | Name                                                     |
| ----------------------- | -------------------------------------------------------- |
| GCP project             | `muba-m1ku`                                              |
| Region                  | `asia-southeast1`                                        |
| Artifact Registry repo  | `averis`                                                 |
| Image                   | `asia-southeast1-docker.pkg.dev/muba-m1ku/averis/averis` |
| Cloud Run service       | `averis`                                                 |
| Migration job           | `averis-migrate`                                         |
| Runtime service account | `averis-runtime@muba-m1ku.iam.gserviceaccount.com`       |
| Deploy service account  | `averis-deployer@muba-m1ku.iam.gserviceaccount.com`      |
| Private object bucket   | `muba-m1ku-averis-docs`                                  |

The workflow reads repository variables `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, `DEPLOY_SA`, `RUNTIME_SA`, `GCS_BUCKET`,
`SMOKE_ARTIFACT_PATH`, and `SMOKE_PRIVATE_OBJECT_KEY`.
`infra/gcp-setup.sh` reconciles the existing OIDC provider on every run and
restricts it to `main` plus GitHub's immutable numeric repository ID, so a
repository rename cannot silently break or broaden deployment trust.

## Runtime Configuration

The runtime receives these Secret Manager values only:

| Environment variable | Secret Manager name        | Required |
| -------------------- | -------------------------- | -------- |
| `DATABASE_URL`       | `averis-database-url`       | Yes      |
| `GEMINI_API_KEY`     | `averis-gemini-api-key`     | Yes      |
| `GEMINI_API_KEY_2`   | `averis-gemini-api-key-2`   | No       |
| `TYPESAFE_API_KEY`   | `averis-typesafe-api-key`   | Yes      |

Set or rotate a GitHub secret, then redeploy:

```shell
$ gh secret set GEMINI_API_KEY --repo Averis-T010NG/LadingLens
```

The workflow sets non-secret runtime configuration explicitly:

```text
GEMINI_MODEL=gemini-3.5-flash
JEV_MODEL=jev-1.13.0
RULE_VERSION=gate-2-v1
DATA_POLICY=synthetic-only
```

The application also validates the model and data policy as literal values.
An environment override cannot enable another model or real-document mode.
Readiness reports the active policy and only boolean key presence; it never
returns credentials.

## Secret Quarantine

`infra/gcp-setup.sh` removes the old prefix-wide Secret Manager grant and gives
the runtime service account access to the four exact secrets above. Re-run the
script after applying this change so remote IAM is actually narrowed. The
deploy-time verifier also rejects every direct project-level role on the runtime
service account; its access must come only from the exact secret and conditioned
bucket grants documented here.

After the hardened service is deployed, verify the effective Cloud Run secret
map and legacy-secret IAM before removing the unused secret:

```shell
$ gcloud run services describe averis \
    --project=muba-m1ku \
    --region=asia-southeast1 \
    --format='yaml(spec.template.spec.containers[0].env)'
$ gcloud secrets get-iam-policy averis-openai-api-key \
    --project=muba-m1ku
```

Neither output may grant or mount the legacy secret. Deleting the legacy secret
is a separate, deliberate operator action after that verification; the deploy
workflow never reads, syncs, or mounts it.

## Private Object Storage

Every `infra/gcp-setup.sh` run reapplies uniform bucket-level access and public
access prevention, even when the bucket already exists. The runtime receives
conditioned `objectCreator` and `objectViewer` grants, but not `objectAdmin`,
for `source-objects/` and `submission-artifacts/` only. Browser clients must
receive evidence through a guest-authorized API endpoint, never through a
public or signed GCS URL.

The setup script creates `private-canary/issue-33` when absent and stores that
key in `SMOKE_PRIVATE_OBJECT_KEY`. `scripts/verify_gcp_controls.py` fails closed
unless the canary exists, public access prevention and uniform bucket-level
access are active, no public principal is bound, runtime storage grants have
the exact conditioned shape, and runtime secret access matches the four-secret
allowlist. The deploy workflow repeats this control-plane verification before
building. A 404 is not proof of privacy: the public smoke check separately
requires 401 or 403 from that exact canary URL.

The current deployment remains synthetic-only. The server-side judge upload
boundary owned by issues #30 and #39 must require and validate synthetic input
before persistence, object upload, or provider invocation. The readiness policy
check is necessary but does not replace that endpoint test; issue #33 cannot be
closed until a deployed synthetic upload succeeds and an undeclared or
non-synthetic upload is rejected with no side effects.

## Post-Deploy Smoke Check

Configure `SMOKE_ARTIFACT_PATH` as a same-origin, guest-authorized API download
path for the generated evaluator artifact. Do not point it at a bundled static
file. Configure `SMOKE_PRIVATE_OBJECT_KEY` as the known canary described above.

The deploy workflow then runs:

```shell
$ python scripts/smoke_deployment.py \
    --base-url https://SERVICE_URL \
    --artifact-path /api/ARTIFACT_PATH \
    --private-object-url \
      https://storage.googleapis.com/BUCKET/KNOWN_PRIVATE_OBJECT_KEY
```

The script retries cold-start health and readiness and fails closed unless all
of these checks pass:

- `/api/health` returns `ok` with a deployed version;
- `/api/health/ready` proves PostgreSQL reachability, approved key presence,
  and `synthetic-only` policy;
- the root, a deep client route, and `/judge` return the React entry point
  without credentials;
- the artifact API returns the exact ordered 520-email, five-key JSON shape;
  and
- the known GCS object returns anonymous 401 or 403.

The script emits a machine-readable JSON result with the UTC check time,
measured request durations, and response hashes. The workflow retains that
report as an Actions artifact. It never accepts a signed URL, credentials in a
URL, HTML masquerading as an API response, a missing object, or a partial
artifact. HTTP 200 for `/judge` proves route delivery only. Final issue #33 and
#47 acceptance additionally requires the browser rehearsal of the real upload
controls, seven verdicts and evidence, controlled provider failure, retry, and
Reset All after the dependency-owned paths land.

## Structured Logs

FastAPI emits one JSON `http_request` event per request with a safe request ID,
matched route template, route choice, model and rule versions, latency, retry
count, terminal state, status, and any bound case IDs and source hashes. The
event helper accepts only an explicit field allowlist and rejects credential-
like values. It does not log query strings, request or response bodies,
headers, filenames, database URLs, exception messages, or secrets.
The container disables Uvicorn's unstructured access log so it cannot emit a
raw request target alongside the safe event.

The server generates each request ID and returns it in `X-Request-ID`; it does
not log caller-supplied correlation values that might contain an opaque secret.
Unhandled errors return the same safe ID without exception text. Domain routes
bind case and source identifiers through `bind_request_context` so the terminal
event remains correlated without logging document content.

## Running Locally

Backend, from `apps/api`, with optional variables in `apps/api/.env`:

```shell
$ uv sync
$ uv run uvicorn app.main:app --reload --port 8080
```

Frontend, from `apps/web`; Vite proxies `/api` to `localhost:8080`:

```shell
$ bun install
$ bun run dev
```

Full container, exactly as deployed:

```shell
$ docker build -t averis-local .
$ docker run --rm -p 8080:8080 averis-local
```

## Cost Guardrails

- Cloud Run scales to zero when idle and is capped at two modest instances.
- A RM30 monthly budget alert emails the team. It is an alert, not a hard spend
  cap, so the owner must act on it.
