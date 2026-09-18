# Deployment

Averis ships as a single container: a FastAPI backend that also serves the
built React frontend. Merging to `main` builds the image and deploys it to
Cloud Run via GitHub Actions.

Contents:

1.  [How Deploys Work](#how-deploys-work)
1.  [Resource Names](#resource-names)
1.  [API Keys](#api-keys)
1.  [Running Locally](#running-locally)
1.  [Cost Guardrails](#cost-guardrails)

## How Deploys Work

`.github/workflows/deploy.yml` runs on every push to `main` that touches
non-documentation files (and via `workflow_dispatch`). It:

1.  Authenticates to Google Cloud with Workload Identity Federation.
2.  Syncs GitHub secrets into Secret Manager (see [API Keys](#api-keys)).
3.  Builds the `Dockerfile` and pushes the image to Artifact Registry.
4.  Deploys the image to Cloud Run and curls `/api/health`.

Pull requests and non-`main` pushes run `.github/workflows/ci.yml` instead:
ruff + pytest for `apps/api`, `bun run build` for `apps/web`.

## Resource Names

| Resource                | Name                                                     |
| ----------------------- | -------------------------------------------------------- |
| GCP project             | `muba-m1ku`                                              |
| Region                  | `asia-southeast1`                                        |
| Artifact Registry repo  | `averis`                                                 |
| Image                   | `asia-southeast1-docker.pkg.dev/muba-m1ku/averis/averis` |
| Cloud Run service       | `averis`                                                 |
| Runtime service account | `averis-runtime@muba-m1ku.iam.gserviceaccount.com`       |
| Deploy service account  | `averis-deployer@muba-m1ku.iam.gserviceaccount.com`      |
| Docs bucket             | `muba-m1ku-averis-docs`                                  |

The workflow reads repository variables `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, `DEPLOY_SA`, `RUNTIME_SA`, and `GCS_BUCKET`.

## API Keys

The app reads `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_API_KEY_2`,
`TYPESAFE_API_KEY`, and `OPENAI_API_KEY` from the environment. To add or
rotate a key, set the matching GitHub secret and redeploy:

```shell
$ gh secret set GEMINI_API_KEY
```

On the next deploy, the workflow copies each non-empty GitHub secret into
Secret Manager (`averis-database-url`, `averis-gemini-api-key`,
`averis-gemini-api-key-2`, `averis-typesafe-api-key`,
`averis-openai-api-key`), adds a new version only if the value changed, and
mounts the secrets that exist on the Cloud Run service. Unset secrets are
skipped.

Both Gemini keys are free tier: `gemini-3.5-flash-lite` (the default, set by
`GEMINI_MODEL`) allows 500 requests a day and Flash only 20. Quota is per
Google Cloud project, so `GEMINI_API_KEY_2` must come from a different project.
The app uses it only when the first key returns a rate-limit error (429).

## Running Locally

Backend (from `apps/api`, with optional env vars in `apps/api/.env`):

```shell
$ uv sync
$ uv run uvicorn app.main:app --reload --port 8080
```

Frontend (from `apps/web`; Vite proxies `/api` to `localhost:8080`):

```shell
$ bun install
$ bun run dev
```

Full container, exactly as deployed:

```shell
$ docker build -t averis-local .
$ docker run -p 8080:8080 averis-local
```

## Cost Guardrails

- Cloud Run scales to zero when idle (`--min-instances 0`) and is capped at
  two instances (`--max-instances 2`), with modest CPU/memory limits.
- A RM30/month budget alert emails the team when spend is exceeded. It is an
  alert only; it does not cap or stop spend, so treat the email as a prompt
  to shut things down or raise the budget deliberately.
