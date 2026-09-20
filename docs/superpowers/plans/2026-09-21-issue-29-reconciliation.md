# Issue 29 Expected-Shipment Reconciliation Plan

> **For implementers:** Follow test-driven development task by task. A
> reconciliation exception is its own review target and must never create a
> fabricated email case.

**Goal:** Import a visibly synthetic expected-shipment ledger independently of
the inbox and reconcile it with received cases into all six auditable Gate 2
outcomes, including `SYN-042` as a true `MISSING_CASE` result.

**Architecture:** A strict CSV parser validates and hashes each synthetic ledger
row before persistence. A pure deterministic engine matches typed, normalized
identifiers and emits immutable result drafts. `PersistenceService` imports a
validated ledger batch atomically, snapshots the current ledger and cases, and
commits one new run, all results, exception assignments, and audits in one
transaction. Intentional reruns always create new immutable run IDs.

**Stack:** Python 3.12, Pydantic, SQLAlchemy asyncio, PostgreSQL, Alembic,
pytest, Ruff.

---

## Locked decisions

- The fixture lives under the organizer bundle's `fixtures/` directory and is
  plainly labelled synthetic in its filename, source-system column, and file
  header. It uses real bundle email IDs only as deterministic match fixtures.
- Every imported row retains `shipment_id`, optional `booking_reference`, typed
  external identifiers, lifecycle, required documents, optional booking cutoff,
  owner, `source_updated_at`, source freshness, and an exact canonical row hash.
- Import identity is `(source_system, shipment_id, source_hash)`. Replaying the
  same file creates no new rows or audit events; changed source content creates
  a new immutable version.
- Identifier keys and values are trimmed, case-folded for matching, and kept in
  separate namespaces. Matching uses exact normalized values only; partial or
  fuzzy matches are forbidden.
- Candidate links are computed before outcomes. A conflict or multi-candidate
  connected component becomes `DUPLICATE_OR_AMBIGUOUS` with the full sorted
  shipment and case candidate sets; no winner is selected.
- For an unambiguous shipment, `STALE` takes precedence over every otherwise
  clearable result. Current linked cases become `CASE_PRESENT` when all required
  documents exist, otherwise `DOCUMENT_MISSING`.
- A current shipment with no linked case becomes `MISSING_CASE` only in
  `DRAFT_BL_EXPECTED` or `BL_CHECK_REQUIRED`. Other lifecycles do not start the
  missing-case clock and produce no shipment result until eligible.
- A booking-specific `cutoff_at` is authoritative when present. The prototype
  fallback is `source_updated_at + 24 hours`; equality at the effective cutoff
  starts the clock. This timer affects urgency metadata, not whether an eligible
  shipment is recognized as missing.
- A received comparison case with no candidate shipment becomes
  `UNMATCHED_CASE`. `MISSING_CASE` always has `case_ids=[]`; no `CaseRecord` is
  synthesized.
- `SOURCE_STALE` and `DUPLICATE_OR_AMBIGUOUS` cannot clear a shipment. Each gets
  a reconciliation-exception assignment owned by the source owner, or by the
  configured exception queue when candidate owners disagree.
- Review actions are append-only `ASSIGN`, `ACKNOWLEDGE`, `ESCALATE`, and
  `RESOLVE` events against the reconciliation result. Resolving review state
  does not mutate or clear the immutable result; only a new run can change the
  outcome.
- A run and every result, assignment, and audit event commit atomically. Any
  validation, reference, or audit failure leaves no partial run.

## Task 1: Synthetic ledger fixture and strict parser

**Files:**

- Add: `data/sdoc-hackathon-bundle/fixtures/SYNTHETIC_expected_shipments.csv`
- Add: `apps/api/app/reconciliation.py`
- Add: `apps/api/tests/test_reconciliation.py`

1. Write failing tests for the fixture label, required columns, strict UTC
   timestamps, supported lifecycles/documents/freshness, duplicate IDs, unknown
   columns, blank owners, and malformed external identifiers.
2. Define immutable `ExpectedShipment`, `CaseSnapshot`, and result-draft models.
   Compute a canonical SHA-256 row hash from typed content rather than raw CSV
   formatting.
3. Implement all-or-nothing CSV parsing and normalized identifier indexing.
4. Make the fixture cover every outcome while reserving `SYN-042`, booking
   `SYN-BK-042`, lifecycle `DRAFT_BL_EXPECTED`, and no matching email.
5. Prove parsing and hashing are deterministic; run focused tests and Ruff.

## Task 2: Deterministic six-outcome engine

**Files:**

- Modify: `apps/api/app/contracts.py`
- Modify: `apps/api/app/reconciliation.py`
- Modify: `apps/api/tests/test_contracts.py`
- Modify: `apps/api/tests/test_reconciliation.py`

1. Tighten shipment-backed contracts so `CASE_PRESENT`, `DOCUMENT_MISSING`, and
   `SOURCE_STALE` require nonempty `case_ids`; keep `MISSING_CASE` empty.
2. Write table-driven failing tests for all six outcomes, exact match bases,
   sorted candidate sets, deterministic subject keys, stale precedence, and
   eligible versus ineligible lifecycle behavior.
3. Implement connected-candidate detection and the locked precedence without
   database or provider dependencies.
4. Test booking cutoff override, fallback cutoff, exact boundary, UTC handling,
   input-order invariance, and `SYN-042` with no case.
5. Prove stale and ambiguous results can never be interpreted as clearable.

## Task 3: Durable shipment and outcome invariants

**Files:**

- Add: `apps/api/migrations/versions/20260921_0003_reconciliation.py`
- Modify: `apps/api/app/models.py`
- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/tests/test_models.py`
- Modify: `apps/api/tests/test_migrations.py`
- Modify: `apps/api/tests/test_persistence.py`

1. Add explicit `booking_reference`, `required_documents`, `cutoff_at`, and
   required source-owner columns, plus reconciliation outcome-shape checks.
2. Add append-only protection for expected-shipment versions, reconciliation
   runs, and results.
3. Implement atomic validated batch import with idempotent replay and one audit
   per newly imported version. Roll back the entire batch on audit failure.
4. Implement one atomic operation that creates a run, verifies every referenced
   shipment/case belongs to the workspace, writes all results and audits, and
   creates exception assignments for stale and ambiguous results.
5. Test same-file replay, changed-source versioning, workspace isolation,
   invalid references, all six persisted shapes, rollback, and intentional
   same-input reruns producing distinct immutable result sets.

## Task 4: Reconciliation exception review

**Files:**

- Modify: `apps/api/app/persistence.py`
- Modify: `apps/api/tests/test_persistence.py`

1. Add workspace-scoped result and review-history reads with current owner and
   state derived from append-only events.
2. Serialize review transitions by locking the target, validating the latest
   state, and appending action, resulting assignment state, and audits in one
   transaction.
3. Require an owner for `ASSIGN`; preserve the current owner for acknowledge,
   escalate, and resolve unless a replacement is explicitly valid.
4. Test all four actions on both stale and ambiguous results, append-only
   history, rollback on audit failure, and zero fabricated cases for `SYN-042`.

## Task 5: End-to-end verification and review

1. Load the real 520-email bundle, derive deterministic case snapshots, import
   the synthetic CSV independently, and prove all six outcomes are emitted.
2. Assert `SYN-042` is `MISSING_CASE`, has `case_ids=[]`, uses booking
   `SYN-BK-042`, and has a reconciliation-only review path.
3. Run the complete API suite, Ruff check/format, compile checks, offline Alembic
   upgrade/downgrade SQL, frozen dependency verification, and the web build.
4. Refresh Graphify and query the CSV-to-run-to-result-to-review path.
5. Request independent acceptance review against every issue #29 criterion,
   repair all concrete findings, and keep the branch local until publication is
   explicitly authorized.
