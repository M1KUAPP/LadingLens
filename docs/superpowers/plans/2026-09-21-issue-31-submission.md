# Issue 31 Atomic Submission Run Plan

> **For implementers:** Follow test-driven development task by task. Never
> publish a partial artifact or turn missing pipeline state into a prediction.

**Goal:** Produce one immutable, exact-shape evaluator artifact for all 520
bundle emails, resume safely after incomplete provider or comparison work, and
publish only after every record validates.

**Architecture:** A pure serializer converts immutable case snapshots into the
organizer's exact five-key records and canonical artifact bytes. PostgreSQL
stages one append-only record snapshot per email before any object pointer can
be published. Private content-addressed storage receives the canonical bytes;
the run then atomically links the verified hash and transitions to `PUBLISHED`.
Scoring attempts are append-only evidence and never invalidate publication.

**Stack:** Python 3.12, Pydantic, SQLAlchemy asyncio, PostgreSQL, Alembic,
private GCS-compatible storage, HTTPX, pytest, Ruff.

---

## Locked decisions

- The artifact has exactly the IDs `email_001` through `email_520`. Every value
  has exactly five keys in shipped-template order: `category`, `status`,
  `review_reason`, `defect_fields`, `has_defect`.
- `OK` has no review reason or defects. `MISMATCH` has at least one unique
  defect field and no review reason. `NEEDS_REVIEW` has one of the four
  structural reasons and no defect fields.
- Non-comparison categories serialize only as `OK`. A `BL_COMPARISON` case must
  have either a selected structural reason or all seven field verdicts.
- Structural conditions are all evaluated and retained. Selection precedence
  is `unreadable`, `wrong_doc_type`, `missing_attachment`, then `missing_value`.
- Any semantic field below the `0.85` batch match threshold, including the
  interactive review band, serializes as `MISMATCH`; it is never a fifth review
  reason.
- A run is idempotent by `(workspace_id, input_manifest_hash, rule_version)`.
  Replays must also provide the exact same canonical expected-ID set.
- `submission_run_records` are immutable snapshots, not live views of mutable
  cases. A failed stage writes zero snapshot rows and leaves a structured,
  resumable `BLOCKED` run.
- Publication is two-phase because PostgreSQL and object storage do not share a
  transaction: atomically stage 520 rows, upload canonical bytes privately,
  then atomically link only the matching hash and publish. A crash may leave an
  inaccessible orphan blob, never a partial public artifact.
- Once published, record snapshots, artifact hash, object key, and version
  manifest cannot change. Self-evaluation is post-publication evidence.
- Organizer scoring responses and failures are append-only. HTTP 400, 503,
  timeout, or malformed score never unpublishes a valid artifact.
- The current branch must not claim an actual delivered 520-result run while
  issue #28 is absent and BL cases remain `BL_READY`. The implementation must
  surface that exact dependency as a resumable blocker rather than fabricating
  comparison outputs.

## Task 1: Exact artifact contract and serializer

**Files:**

- Add: `apps/api/app/submission.py`
- Add: `apps/api/tests/test_submission.py`
- Modify: `apps/api/app/contracts.py`
- Modify: `apps/api/tests/test_contracts.py`

1. Write failing tests for exact ID coverage, exact five keys, invalid enums,
   extra/missing keys, duplicate IDs, invalid cross-field combinations, and
   deterministic template-order bytes.
2. Strengthen `EvaluatorOutput` invariants for `OK`, `MISMATCH`, and
   `NEEDS_REVIEW`, canonical unique defect fields, and non-comparison output.
3. Define immutable submission case/field snapshots and blocker types.
4. Implement structural precedence while retaining all diagnostics, and map
   semantic ambiguity to batch mismatch fields.
5. Serialize canonical UTF-8 JSON and SHA-256 only after all 520 rows validate.

## Task 2: Durable staging and scoring schema

**Files:**

- Add: `apps/api/migrations/versions/20260921_0004_submission_runs.py`
- Modify: `apps/api/app/models.py`
- Modify: `apps/api/tests/test_models.py`
- Modify: `apps/api/tests/test_migrations.py`

1. Add append-only `submission_run_records` with run/email uniqueness, case
   reference, exact output JSON, record/source-state hashes, diagnostics, and
   version manifest.
2. Add append-only `submission_evaluations` with endpoint, outcome, scoreboard
   or safe failure, and timestamps.
3. Extend runs with `PENDING`, `BLOCKED`, `STAGED`, and `PUBLISHED` checks,
   blockers, serializer versions, timestamps, and all-or-none artifact fields.
4. Add case-level structural diagnostics and enforce JSON shape checks.
5. Protect snapshots/evaluations from update/delete and published run artifacts
   from mutation; prove invalid raw rows fail.

## Task 3: Resumable atomic publication

**Files:**

- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/app/storage.py`
- Add: `apps/api/tests/test_submission_persistence.py`
- Modify: `apps/api/tests/test_storage.py`

1. Validate the exact canonical 520-ID manifest before creating a run. On
   replay, reject a different expected-ID list for the same manifest/rule.
2. Add an atomic stage operation that locks the run, validates 520 unique
   records/references, inserts the entire immutable snapshot, and moves to
   `STAGED`; any fault rolls back every snapshot row.
3. Add a structured blocker transition that preserves prior receipts/cases and
   can be resumed into the same run after upstream recovery.
4. Add a submission-artifact object namespace and private read seam. Upload the
   canonical bytes by hash, then publish only if the staged snapshot recomputes
   to the same hash.
5. Test missing category, provider failure, malformed record, duplicate,
   incomplete count, forced late-row failure, replay, crash recovery, concurrent
   publish, and post-publication immutability.

## Task 4: Organizer self-evaluation evidence

**Files:**

- Modify: `apps/api/app/submission.py`
- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/tests/test_submission.py`
- Modify: `apps/api/tests/test_submission_persistence.py`

1. Implement an injected HTTPX scorer that posts only a locally validated
   published artifact and strictly validates the documented scoreboard shape.
2. Append success or safe failure evidence to `submission_evaluations` without
   changing publication state.
3. Test success, 400, 503, timeout, invalid JSON, and invalid score shape.
4. Record the organizer server as unavailable when no endpoint is configured;
   do not claim a measured development score.

## Task 5: Verification and truthful handoff

1. Run the complete API suite, Ruff, compile checks, offline Alembic
   upgrade/downgrade SQL, frozen dependency check, and merged web build.
2. Exercise a 520-row synthetic valid snapshot to prove atomic mechanics, plus
   the real current case state to prove publication blocks on unfinished #28
   work without emitting an artifact.
3. Refresh Graphify and query case snapshot to private artifact and scoring
   paths.
4. Request independent acceptance review and repair all concrete findings.
5. Publish the branch and link #31, while leaving the issue open until the real
   provider-backed 520 pipeline and scorer attempt are recorded.
