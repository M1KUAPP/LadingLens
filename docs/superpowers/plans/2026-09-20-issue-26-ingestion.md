# Issue 26 Bundle Ingestion and Jev Classification Plan

> **For implementers:** Follow test-driven development task by task. Provider
> failures must remain visible and must never be converted into a category.

**Goal:** Receipt all 520 synthetic bundle emails and exact attachment bytes,
classify every successful item with pinned Jev `jev-1.13.0`, and persist either
one typed category outcome or an explicit retryable provider failure.

**Architecture:** A loader-compatible reader converts the organizer `Inbox`
records into strict Pydantic receipt inputs and performs deterministic attachment
format detection. `JevCategoryClient` sends bounded batches of independent
`Choice` questions through the official TypeSafe SDK, validates the entire typed
response, and returns no partial result. `InboxIngestionService` receipts
each email idempotently before any provider call, creates one case shell, then
records category success or failure through transaction-owning persistence
operations.

**Stack:** Python 3.12, Pydantic, TypeSafe SDK, SQLAlchemy asyncio, PostgreSQL,
GCS storage adapter, Jev/System One API, pytest, Ruff.

---

## Locked decisions

- The organizer `Inbox` API is the source boundary: `emails()` supplies records
  and `read_bytes(path)` supplies exact attachment bytes. The application does
  not depend on the bundle directory being importable as a Python package.
- The source message ID and idempotency key are derived from `email_id`; this is
  required to preserve the distinct `email_206` and `email_450` records even
  though their sender, subject, body, and empty attachment sets are identical.
  The message hash is computed from canonical JSON bytes; attachment hashes are
  computed from the exact bytes returned by `read_bytes`.
- Attachment paths must be relative, remain under `attachments/`, and contain no
  parent traversal. Detected format uses file signatures plus container checks,
  not only the extension.
- Jev requests pin `model: jev-1.13.0`. Each bounded batch sends one Choice
  question per email and all five category criteria. Batch size remains
  configurable so state stays comfortably below Jev's 32k state limit and avoids
  accuracy loss from irrelevant context.
- The Jev response is all-or-nothing: model ID, answer keys, answer type, selected
  category, probability keys/ranges/sum, and confidence are validated. Timeout,
  429/quota, 529/overload, HTTP error, malformed JSON, and invalid typed output
  become explicit provider failures; no category fallback exists.
- A received case exists before classification. Its category/status are nullable
  only while category work is pending or failed. Each call writes an append-only
  provider-attempt row containing requested/returned model, outcome, safe error,
  retryability, request/correlation IDs, and timestamp. The case mirrors the
  current visible retry state; a later successful retry clears that state without
  erasing attempt history.
- Non-comparison success writes exact evaluator output with `status=OK`, no review
  reason, and no defects. `BL_COMPARISON` records category evidence and a named
  owner, then remains ready for issue #27 preflight/extraction rather than
  inventing a final comparison status.

## Task 1: Strict loader-compatible bundle reader

**Files:**

- Add: `apps/api/app/ingestion.py`
- Add: `apps/api/tests/test_ingestion.py`

1. Write tests against the real organizer `loader.py` proving the exact ID set is
   `email_001` through `email_520`, with no duplicates or missing IDs.
2. Define `InboxSource`, `BundleEmail`, `ReceivedEmail`, and `AttachmentReceipt`
   contracts. Reject unknown record keys, blank identifiers, malformed
   attachments, unsafe paths, missing files, and duplicate attachment paths.
3. Implement canonical message bytes, exact SHA-256 hashing, MIME inference,
   ordinal retention, byte size, safe attachment reads, and signature-aware
   detection for TXT/PDF/DOCX/XLSX/unknown.
4. Add fixture tests for path traversal, extension/signature disagreement,
   Unicode text, binary files, and stable repeated reads.
5. Run focused tests and Ruff; commit.

## Task 2: Classification-ready persistence state

**Files:**

- Modify: `apps/api/app/models.py`
- Modify: `apps/api/app/persistence.py`
- Add: `apps/api/migrations/versions/20260920_0002_classification_state.py`
- Modify: `apps/api/tests/test_models.py`
- Modify: `apps/api/tests/test_migrations.py`
- Modify: `apps/api/tests/test_persistence.py`

1. Write failing metadata/migration tests for `email_receipts.body_text` and case
   classification state: nullable category/status/output while pending or failed,
   processing state, probability distribution, provider request ID, provider
   error fields, and an append-only provider-attempt table.
2. Add the migration and matching models. Database checks must prevent a
   successful category state without category evidence and prevent a failure
   state from carrying a fabricated category.
3. Extend `ReceiptInput` and receipt persistence with body text.
4. Add idempotent `ensure_classification_case`, transactional
   `record_classification_success`, and `record_classification_failure` methods.
   Each new mutation appends exactly one audit event and rolls back on audit
   failure.
5. Prove non-comparison success maps to exact `OK` evaluator output, BL comparison
   requires an assigned owner while leaving final comparison status pending,
   and failure leaves category/status/output unset with a visible retry state.
6. Run PostgreSQL-marked tests where available, unit tests, migration SQL, and
   Ruff; commit.

## Task 3: Pinned Jev Choice client

**Files:**

- Modify: `apps/api/pyproject.toml`
- Modify: `apps/api/uv.lock`
- Add: `apps/api/app/jev.py`
- Add: `apps/api/tests/test_jev.py`

1. Add pinned runtime `typesafe-sdk` and strict application response models.
2. Write injected-client tests that assert the exact pinned model, one Choice per
   email, all five criteria, bounded batches, explicit timeout/retry policy, and
   outbound correlation IDs.
3. Implement the async adapter around `AsyncTypeSafeClient.system_one`. Validate
   complete answer coverage and exact probability distributions; reject aliases
   and unexpected answer shapes.
4. Map timeout, 429, 529, other HTTP failures, invalid JSON, and invalid typed
   responses to structured `JevProviderFailure` values. Do not retry onto another
   provider or model.
5. Add tests for all failures and a valid multi-email batch; run tests/Ruff and
   commit.

## Task 4: End-to-end Gate 1 orchestration

**Files:**

- Modify: `apps/api/app/ingestion.py`
- Add: `apps/api/tests/test_gate1.py`

1. Define narrow persistence and classifier protocols so orchestration tests use
   deterministic fakes while production uses `PersistenceService` and
   `JevCategoryClient`.
2. Write the 520-record orchestration test first. Assert 520 receipts, 520 case
   shells, exactly one category result per successful email, original attachment
   ordering/hashes, and batched rather than per-email classifier calls.
3. Implement receipt-first orchestration. Receipt/audit state must commit before
   any Jev call. Replays return existing receipts/cases and do not duplicate rows.
4. Persist each successful answer with probabilities, response model, request ID,
   prompt version, and rule version. Give BL cases the configured queue owner;
   deterministically map every non-BL category to `OK`.
5. On any batch provider failure, persist a failure for every affected case with
   category unset and return a resumable summary. Do not process a partial or
   malformed response.
6. Test timeout, quota, invalid answer, retry success, and complete rerun
   idempotency; run tests and Ruff; commit.

## Task 5: Final verification and review

1. Run frozen dependency sync, complete API tests, Ruff check/format, offline
   Alembic upgrade/downgrade SQL, and the web production build.
2. Run Graphify update and query the receipt-to-Jev-to-case paths.
3. Request independent review against every issue #26 acceptance criterion and
   repair all concrete findings.
4. Keep the branch local until repository publication is explicitly authorized.
