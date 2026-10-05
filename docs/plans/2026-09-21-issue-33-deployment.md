# Issue 33 Deployment Hardening Implementation Plan

> **Scope note:** Issue #33 depends on the public judge and artifact API work.
> This plan hardens every deployment surface that exists now and makes the
> remaining live checks fail closed until those dependency-owned routes land.

**Goal:** Deploy one public Cloud Run service with only the approved provider
secrets, a pinned model, private object storage, safe structured logs, and a
repeatable smoke check that cannot report success when a required judge or
artifact path is missing.

**Architecture:** Infrastructure setup grants the runtime identity access to
an explicit secret allowlist and continuously enforces GCS public-access
prevention. FastAPI adds request correlation and allowlisted JSON event logs;
its SPA fallback never masks a missing API route. A standard-library Python
smoke runner verifies the public surface and an existing private canary object,
while the deploy workflow runs database migrations before shifting Cloud Run
traffic.

**Tech stack:** GitHub Actions, Google Cloud CLI, Cloud Run, Secret Manager,
PostgreSQL/Alembic, GCS, FastAPI/Starlette, Python standard library, pytest,
Ruff.

## Task 1: Pin the deployed provider and data policy

1. Add failing tests that reject any Gemini model other than
   `gemini-3.5-flash` and prove callers cannot override the model per request.
2. Add a locked `synthetic-only` data-policy setting and expose it in readiness
   output so deployment verification can assert the policy actually loaded.
3. Update the deployment workflow to mount only database, storage, Gemini, and
   Typesafe configuration and set the model and policy explicitly.

## Task 2: Quarantine legacy secrets and enforce private storage

1. Add static deployment tests for the approved secret and environment
   allowlists.
2. Change the GCP setup script from a project-wide `averis-*` secret grant to
   per-secret grants for the approved runtime secrets.
3. Reapply uniform bucket-level access and public-access prevention on every
   setup run, including pre-existing buckets.
4. Document legacy-secret quarantine and verification commands without
   claiming that remote state has already been changed.

## Task 3: Add safe structured request logging

1. Add failing tests for correlation IDs, latency and terminal-state output,
   domain observability fields, and rejection of secret-like fields.
2. Implement an allowlisted JSON event emitter and HTTP middleware. Generate a
   server-owned request ID, return it to the caller, and log the matched route
   rather than request bodies, credentials, or caller-supplied identifiers.
3. Include the pinned model and rule versions, retry count, and optional case
   and source identifiers in the event contract.

## Task 4: Make routing and database readiness honest

1. Add regression tests proving client-side routes fall back to `index.html`
   while unknown `/api/*` paths remain 404.
2. Restrict SPA fallback to `GET` and `HEAD` requests outside `/api`.
3. Copy Alembic assets into the runtime image, add PostgreSQL-backed CI, and
   run migrations as a pre-deploy Cloud Run job before service deployment.

## Task 5: Add a fail-closed deployment smoke runner

1. Test the runner with a local HTTP fixture for health, readiness, SPA,
   unauthenticated `/judge`, artifact JSON download, and denial of a known
   private GCS object.
2. Require an artifact path and existing private-object URL. A missing route,
   HTML masquerading as an API response, or public object response fails the
   run.
3. Call the runner from the deploy workflow with repository variables and
   document exact local and CI usage.

## Task 6: Verify, review, publish, and report remaining gates

1. Run focused tests during each task, then the full API suite with PostgreSQL,
   Ruff, compilation, Alembic upgrade/downgrade SQL, the web production build,
   and workflow/static checks.
2. Request an independent acceptance and security review and repair concrete
   findings.
3. Refresh Graphify when the approved binary is available; otherwise record
   the blocked supply-chain fetch rather than installing an untrusted package.
4. Push the branch, open a stacked pull request, and comment on #33 with exact
   completed and still-live-only criteria. Do not close #33 before the
   dependency-owned judge/upload/artifact routes and live Cloud Run smoke pass.
