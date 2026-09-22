# Cloud deployment

Averis (LadingLens) runs as one Cloud Run container that serves both the
FastAPI backend and the compiled React front end. The most recent
successful deploy published the service at
[https://averis-222536409832.asia-southeast1.run.app](https://averis-222536409832.asia-southeast1.run.app),
with the public judge page at
[/judge](https://averis-222536409832.asia-southeast1.run.app/judge). Every
control below is enforced in code, not just described; see
[`docs/references/deployment.md`](/docs/references/deployment.md) for the
operator's exact commands.

Contents:

1.  [Deployed service](#deployed-service)
1.  [Data and storage](#data-and-storage)
1.  [Identity and secrets](#identity-and-secrets)
1.  [Observability](#observability)
1.  [Cost guardrails](#cost-guardrails)
1.  [Data policy and residency](#data-policy-and-residency)
1.  [See also](#see-also)

## Deployed service

The [`Dockerfile`](/Dockerfile) builds one image in two stages: it
compiles the React app with Bun, then copies the built assets into a
Python 3.12 runtime that also holds the FastAPI app. One Uvicorn process
serves both;
[`apps/api/app/main.py`](/apps/api/app/main.py) mounts the compiled front
end and falls back to `index.html` for client-side routes outside
`/api/`, which is how a path like `/judge` resolves, proven by
[`test_spa_fallback_never_masks_unknown_api_routes`](/apps/api/tests/test_health.py).
The deploy pipeline's smoke check independently re-verifies that `/judge`
stays public, proven by
[`test_smoke_rejects_judge_redirect_to_auth`](/apps/api/tests/test_smoke_deployment.py).
The container runs as a non-root user.

[`.github/workflows/deploy.yml`](/.github/workflows/deploy.yml) pushes
that image to Artifact Registry, then updates and runs the
`averis-migrate` Cloud Run job (`alembic upgrade head`) before touching
the live service — a failed migration stops the deploy before the new
image is released. It then deploys the `averis` Cloud Run service and
runs a post-deploy smoke check
([`scripts/smoke_deployment.py`](/scripts/smoke_deployment.py)) against
the public URL. See
[deployment.md § How Deploys Work](/docs/references/deployment.md#how-deploys-work)
for the full sequence, and
[`apps/api/tests/test_deployment_hardening.py`](/apps/api/tests/test_deployment_hardening.py)
(`test_runtime_image_contains_migration_assets`,
`test_deploy_fails_closed_on_remote_storage_and_iam_controls`) for what is
tested.

## Data and storage

PostgreSQL is the system of record for cases, shipments, reconciliation
runs, review actions, and the audit trail
([`apps/api/app/models.py`](/apps/api/app/models.py)). The runtime reads
`DATABASE_URL` from Secret Manager; the connection helper's docstring
describes a Neon-style `postgres://` URL and rewrites it to an `asyncpg`
DSN ([`apps/api/app/db.py`](/apps/api/app/db.py)), the same converter the
Alembic migration environment uses, proven by
[`test_neon_style_database_url_is_safe_for_runtime_and_migrations`](/apps/api/tests/test_deployment_hardening.py).
`deployment.md` does not name the Postgres host, so this page does not
claim a specific provider's data-residency commitments — only that the
connection string is Neon-style.

Source documents and generated submission artifacts are content-addressed
objects (`source-objects/<hash[:2]>/<hash>` and
`submission-artifacts/<hash[:2]>/<hash>.json` keys, sharded by the hash's
first two hex characters) in a single private Cloud Storage bucket,
written with a create-only, if-generation-match upload so an object can
never be silently overwritten
([`apps/api/app/storage.py`](/apps/api/app/storage.py), proven by
[`apps/api/tests/test_storage.py`](/apps/api/tests/test_storage.py)). The
store exposes no signed-URL code path; objects can only be read
server-side. Every deploy reapplies uniform bucket-level access and
public access prevention, even when the bucket already exists
([`deploy.yml`](/.github/workflows/deploy.yml),
[`infra/gcp-setup.sh`](/infra/gcp-setup.sh)), and the runtime identity
gets only conditioned `objectCreator`/`objectViewer` grants on those two
prefixes — never `objectAdmin` — enforced by a fail-closed verifier
([`scripts/verify_gcp_controls.py`](/scripts/verify_gcp_controls.py),
proven by
[`test_rejects_any_unapproved_runtime_storage_role`](/apps/api/tests/test_gcp_controls.py)).
See
[deployment.md § Private Object Storage](/docs/references/deployment.md#private-object-storage).

## Identity and secrets

The deploy job authenticates to Google Cloud with Workload Identity
Federation (`google-github-actions/auth@v2` in `deploy.yml`) instead of a
downloaded service-account key. The OIDC provider trusts only GitHub's
immutable numeric repository ID and the `main` branch, so a repository
rename cannot silently widen deploy trust
([`infra/gcp-setup.sh`](/infra/gcp-setup.sh), proven by
[`test_gcp_setup_reconciles_wif_to_the_canonical_repository`](/apps/api/tests/test_deployment_hardening.py)).
WIF only secures the deploy job's own identity: `DATABASE_URL`,
`GEMINI_API_KEY`, and `TYPESAFE_API_KEY` remain long-lived GitHub Actions
secrets that are synced into Secret Manager on every deploy.

Runtime configuration mounts exactly these Secret Manager entries
([`deploy.yml`](/.github/workflows/deploy.yml)):

| Environment variable | Secret Manager ID         | Required |
| -------------------- | ------------------------- | -------- |
| `DATABASE_URL`       | `averis-database-url`     | Yes      |
| `GEMINI_API_KEY`     | `averis-gemini-api-key`   | Yes      |
| `GEMINI_API_KEY_2`   | `averis-gemini-api-key-2` | No       |
| `TYPESAFE_API_KEY`   | `averis-typesafe-api-key` | Yes      |

No other secret is granted to the runtime service account: the
deploy-time verifier fails closed unless the account's secret access
matches exactly this allowlist and it holds no project-level role
([`scripts/verify_gcp_controls.py`](/scripts/verify_gcp_controls.py),
proven by
[`apps/api/tests/test_gcp_controls.py`](/apps/api/tests/test_gcp_controls.py)
`test_rejects_extra_runtime_secret_or_object_admin` and
`test_rejects_project_level_runtime_access`). See
[deployment.md § Secrets and environment](/docs/references/deployment.md#secrets-and-environment)
for the exact secret map and the quarantined legacy secret. No secret
value is reproduced here or in the linked reference page.

## Observability

Every request emits one allowlisted, structured JSON `http_request` event
to stdout for Cloud Logging: a request ID, matched route, route choice,
method, model and rule version, latency, retry count, terminal state, and
status code, plus any bound case IDs and source hashes
([`apps/api/app/observability.py`](/apps/api/app/observability.py)). A
value that looks like a bearer token, API key, password, or Postgres URL
is rejected before it can reach the log, proven by
[`test_emit_event_rejects_secret_fields_and_values`](/apps/api/tests/test_observability.py).
Uvicorn's own access log is disabled in the container
(`--no-access-log` in the [`Dockerfile`](/Dockerfile), proven by
[`test_runtime_image_contains_migration_assets`](/apps/api/tests/test_deployment_hardening.py)),
so no raw request target or query string is ever emitted alongside the
safe event.
Unhandled errors return the same opaque request ID without exception
text, proven by
[`test_unhandled_error_returns_the_safe_server_request_id`](/apps/api/tests/test_observability.py).
See
[deployment.md § Structured request logging](/docs/references/deployment.md#structured-request-logging)
for the complete field list.

## Cost guardrails

Cloud Run scales to zero when idle and is capped at two instances
(`--min-instances 0 --max-instances 2` in
[`deploy.yml`](/.github/workflows/deploy.yml)). Artifact Registry keeps
only the five newest images and deletes anything older than a day
([`infra/gcp-setup.sh`](/infra/gcp-setup.sh)). A RM30 monthly budget
alert, at 50%, 90%, and 100% of spend, emails the team
([`infra/gcp-setup.sh`](/infra/gcp-setup.sh)); it is an alert, not an
enforced spending cap. See
[deployment.md § Resource names](/docs/references/deployment.md#resource-names)
for the full service shape.

## Data policy and residency

The deployed environment is locked to synthetic data. `data_policy` is a
literal `"synthetic-only"` field in
[`apps/api/app/config.py`](/apps/api/app/config.py); any other value
fails Pydantic validation at startup, so an environment override cannot
silently switch it to real documents, proven by
[`test_unapproved_model_or_data_policy_is_rejected`](/apps/api/tests/test_provider_configuration.py).
`/api/health/ready` reports the active policy and boolean key presence
only, never credentials
([`apps/api/app/main.py`](/apps/api/app/main.py), proven by
[`test_ready_with_reachable_database`](/apps/api/tests/test_health.py)),
and the post-deploy smoke check independently re-asserts
`data_policy == "synthetic-only"` against the live service before a
deploy is treated as healthy
([`scripts/smoke_deployment.py`](/scripts/smoke_deployment.py)).

Cloud Run's region (`asia-southeast1`) is a deployment choice only.
Cloud Run's own documentation states only that "customer data associated
with the Cloud Run resource is stored in the selected region" — it says
nothing about a third-party API called from inside that resource, so
this page makes no inference-residency, provider-processing-location, or
PDPA/production-privacy-compliance claim. Real-document processing stays
disabled until retention, access, transfer, and provider controls are
separately approved
([`docs/TRD.md`](/docs/TRD.md#deployment-security-and-observability)).

## See also

- [Cloud Run overview][cloud-run-overview]
- [Cloud Run locations][cloud-run-locations], which backs the residency
  limit above
- [Workload Identity Federation for deployment pipelines][wif-pipelines]
- [Uniform bucket-level access][gcs-ubla]
- [Public access prevention][gcs-pap]

[cloud-run-overview]: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
[cloud-run-locations]: https://docs.cloud.google.com/run/docs/locations
[wif-pipelines]: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
[gcs-ubla]: https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access
[gcs-pap]: https://docs.cloud.google.com/storage/docs/public-access-prevention
