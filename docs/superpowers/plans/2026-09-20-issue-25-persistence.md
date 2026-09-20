# Issue 25 PostgreSQL Persistence Implementation Plan

> **For implementers:** Follow test-driven development task by task. Keep every
> database mutation and its audit event in one PostgreSQL transaction. Do not use
> SQLite as a substitute for the PostgreSQL integration tests.

**Goal:** Add durable PostgreSQL persistence, migrations, private object-storage
metadata, idempotent ingestion, deterministic reconciliation keys, append-only
review/audit history, and isolated guest namespaces for LadingLens.

**Architecture:** SQLAlchemy 2 declarative models describe the domain schema and
Alembic owns database creation. `PersistenceService` owns transaction boundaries;
`PrivateObjectStore` owns bytes outside those transactions because GCS and
PostgreSQL cannot commit atomically. An ingestion request row serializes each
workspace/idempotency-key pair. A guest reset creates a new workspace generation,
leaving all previous rows and audit history intact.

**Stack:** Python 3.12, SQLAlchemy asyncio, asyncpg, Alembic, PostgreSQL 16,
Pydantic, Google Cloud Storage, pytest, pytest-asyncio, Ruff.

---

## Locked decisions

- Every guest session owns one or more immutable workspace generations. Mutable
  domain rows reference a workspace; the active generation is resolved through
  the guest session record. Reset creates a new workspace and never deletes the
  old workspace, another guest's data, shared seed data, or audit history.
- `source_objects.content_hash` is globally unique and points to a private,
  content-addressed GCS object key. Workspace authorization is enforced through
  receipt/attachment links, never through direct object-key lookup.
- The receipt idempotency key is unique per workspace. A replay with the same
  request hash returns the original receipt without another audit row. Reuse with
  a different hash commits one conflict audit row, then raises outside that
  transaction so the conflict audit is retained.
- Review assignments, review actions, and audit events are insert-only, enforced
  by PostgreSQL triggers as well as the service API.
- Reconciliation `subject_key` is computed from validated inputs. Callers cannot
  provide an authoritative subject key.
- Migrations are applied as an explicit CI/deployment step, never from application
  startup.

## Task 1: Dependencies, test harness, and migration skeleton

**Files:**

- Modify: `apps/api/pyproject.toml`
- Modify: `apps/api/uv.lock`
- Add: `apps/api/alembic.ini`
- Add: `apps/api/migrations/env.py`
- Add: `apps/api/migrations/script.py.mako`
- Add: `apps/api/tests/conftest.py`
- Modify: `.github/workflows/ci.yml`

1. Add failing test-harness checks that require `TEST_DATABASE_URL` for marked
   PostgreSQL tests and create/drop a clean schema around the test session.
2. Add Alembic and Google Cloud Storage dependencies; configure async migrations
   against `DATABASE_URL` and import the application metadata.
3. Add PostgreSQL 16 to the API CI job with a health check. Run `alembic upgrade
   head`, `alembic check`, and the complete pytest suite against it.
4. Regenerate `uv.lock`, run the existing unit suite, and commit.

## Task 2: Canonical ORM schema and initial migration

**Files:**

- Add: `apps/api/app/models.py`
- Add: `apps/api/migrations/versions/20260920_0001_persistence.py`
- Add: `apps/api/tests/test_models.py`
- Add: `apps/api/tests/test_migrations.py`

1. Write metadata tests for all required tables and named uniqueness constraints:
   `source_objects`, `email_receipts`, `extraction_cache`, `cases`,
   `field_verdicts`, `expected_shipments`, `reconciliation_results`,
   `review_assignments`, `review_actions`, `audit_events`, and
   `submission_runs`. Include support tables for guest sessions/workspaces,
   ingestion requests, attachment links, and reconciliation runs.
2. Define typed SQLAlchemy 2 models using UUID primary keys, timezone-aware
   timestamps, PostgreSQL JSONB, explicit foreign keys, enum/check constraints,
   and the TRD uniqueness rules. Keep `source_objects` free of public URLs.
3. Create the initial Alembic revision. Add a PostgreSQL function and triggers
   that reject `UPDATE` and `DELETE` on `review_assignments`, `review_actions`,
   and `audit_events`.
4. Add integration tests that migrate an empty database, exercise required
   uniqueness constraints, and prove raw `UPDATE`/`DELETE` fails on append-only
   tables.
5. Run migration checks, tests, and Ruff; commit.

## Task 3: Private object storage and idempotent receipt persistence

**Files:**

- Add: `apps/api/app/storage.py`
- Add: `apps/api/app/persistence.py`
- Add: `apps/api/tests/test_storage.py`
- Add: `apps/api/tests/test_persistence.py`

1. Write unit tests for SHA-256 calculation, opaque content-addressed object keys,
   byte preservation, and object deduplication using an in-memory store.
2. Define `PrivateObjectStore.put_if_absent(content_hash, data)` and implement an
   in-memory fake plus a GCS adapter. The GCS adapter stores private objects and
   returns an object key, never a public URL.
3. Write PostgreSQL integration tests for first receipt persistence, same-key/
   same-hash replay, same-key/different-bytes conflict, scoped receipt uniqueness,
   and exactly one audit row per mutation.
4. Implement `PersistenceService.persist_receipt`. Validate the supplied hash
   against exact bytes before storage. Upload before the DB transaction, commit
   receipt/attachment metadata with one audit event, return the original on exact
   replay, and commit the conflict audit before raising `IdempotencyConflict`.
5. Inject an audit writer in tests, force it to fail, and prove the receipt/domain
   mutation rolls back in the same transaction.
6. Run integration tests and Ruff; commit.

## Task 4: Reconciliation keys, append-only review operations, and guest reset

**Files:**

- Modify: `apps/api/app/contracts.py`
- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/tests/test_contracts.py`
- Modify: `apps/api/tests/test_persistence.py`

1. Add failing contract tests for all six outcome-discriminated reconciliation
   shapes and malformed combinations from the TRD.
2. Implement those Pydantic contracts and a deterministic `subject_key` helper:
   `shipment:<id>` for shipment-backed and missing-case rows, `case:<id>` for a
   single unmatched case, and SHA-256 of canonical sorted JSON for multi-case or
   ambiguous subjects.
3. Add PostgreSQL tests for `(reconciliation_run_id, subject_key)` uniqueness,
   canonical ordering, append-only review assignment/action writes, exactly one
   audit row per mutation, and rollback when the audit write fails.
4. Implement transactional persistence operations for reconciliation results,
   review assignments, and review actions. Never expose update/delete operations
   for append-only records.
5. Add guest-isolation tests: identical business identifiers can exist in two
   workspaces; reset yields an empty active namespace; old audit rows, another
   guest's rows, and immutable shared seed rows remain unchanged.
6. Implement guest reset by creating a new workspace generation and switching the
   guest session pointer in one transaction.
7. Run integration tests and Ruff; commit.

## Task 5: Extraction cache and submission-run foundations

**Files:**

- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/tests/test_persistence.py`

1. Write tests proving only schema-valid extraction results are cached and the
   cache key is exactly `(content_hash, extractor_version,
   extraction_schema_version)`.
2. Implement cache read/write operations with one audit event for a successful
   new cache mutation and no success row for invalid data.
3. Write tests for unique submission-run `(input_manifest_hash, rule_version)`,
   immutable publication state, and persisted expected IDs/validation count. Keep
   artifact publication itself for issue #31.
4. Implement the submission-run repository foundation needed by issue #31.
5. Run the full API suite, Alembic upgrade/check, Ruff check, and Ruff format
   check; commit.

## Task 6: Final verification and review

1. Rebase on the latest `origin/main` only if doing so does not disturb unrelated
   user work.
2. Run the complete PostgreSQL-backed API suite and migration checks.
3. Run the web build because the shared CI workflow changed.
4. Run `git diff --check` and scan runtime code/config for public GCS URLs and
   unapproved provider references.
5. Request independent code review against every issue #25 acceptance criterion;
   fix findings and repeat the full verification suite.
6. Prepare the branch for publication. Do not push until repository publication
   is explicitly authorized.
