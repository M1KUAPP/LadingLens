# Issue 30 Product API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI routes that serve the React app and the public `/judge`
path: anonymous guest sessions, a versioned deterministic seed baseline,
case and reconciliation review actions, private evidence and artifact
downloads, a live judge upload with an honest failure contract, and a
guest-scoped Reset All.

**Architecture:** A server-minted guest session (token hashed at rest) maps
to the current generation of that guest's workspace. The seed baseline is
computed in memory, once per process, by running the real deterministic
pipeline over the checked-in synthetic bundle with a versioned decisions
file (`app/seed/decisions-v1.json`) standing in for provider answers; it is
never mutated. A guest's mutations live in PostgreSQL in their own
workspace: a review action on a seed case first materializes that case into
the guest workspace (copy-on-write, deterministic UUIDv5 ids), then appends
through the existing append-only persistence. `POST /api/reset` starts a new
workspace generation, so the old generation's rows disappear from reads and
any in-flight write for it fails closed. Judge uploads run live through
#27/#28's pipeline inside the request.

**Tech Stack:** FastAPI, Starlette, python-multipart, SQLAlchemy 2 async,
PostgreSQL, pydantic v2, pytest, httpx `ASGITransport`.

**Spec:** GitHub issue #30; `docs/TRD.md` "Failure contract" and
"Deployment, security, and observability"; research
`docs/research/build/guest-sessions-and-judge-api.md`.

## Global Constraints

- Error envelope for every `/api/*` error: `{"error": {"code": str,
  "message": str}}` (plus optional `"details"` list). Plain-language
  messages, no stack traces or secrets.
- Every `/api/*` response carries `Cache-Control: no-store`.
- Session header `X-LadingLens-Session`; tokens are
  `secrets.token_urlsafe(32)`; the database stores only
  `sha256(token)` hex in `guest_sessions.session_key`. Missing or unknown
  token → `401 session_required`.
- Seed: `SEED_VERSION = "seed-v1"`, decisions file
  `apps/api/app/seed/decisions-v1.json`, bundle directory from
  `Settings.bundle_dir` (default `<repo>/data/sdoc-hackathon-bundle`; the
  image copies the bundle to `/app/data/sdoc-hackathon-bundle` and sets
  `BUNDLE_DIR`). Every seed record is labelled with its decision source
  (`prepared` or `recorded`) and never presented as live.
- Judge upload policy (server-enforced): two files, each at most
  `Settings.max_upload_bytes = 5 * 1024 * 1024`, non-empty, detected by
  magic bytes as TXT, PDF, DOCX, or XLSX (`app.formats.preflight`, not the
  file name), form field `synthetic_confirmed=true` required
  (`422 synthetic_only` otherwise), `Settings.data_policy ==
  "synthetic-only"`.
- Judge result contract: `source` is `"live"` for uploads and
  `"prepared"` for the fallback; a provider failure returns `state:
  "FAILED"` with `failure {code, retryable, message}` and no outcome; only
  a later successful attempt on the same run sets `state: "SUCCEEDED"`.
- Evidence bytes only via API endpoints with `X-Content-Type-Options:
  nosniff`, `Content-Disposition: inline; filename="..."`, and
  authorization to the caller's workspace or the seed; never a bucket URL.
- No other model provider; no `openai`/`qwen` strings under `app/`.
- Commands from `apps/api`: `uv run pytest`, `uv run ruff check`,
  `uv run ruff format --check`; PostgreSQL tests need
  `TEST_DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:55432/averis`.

## API Contract

```text
POST /api/session                      -> 201 {session_token, generation, seed_version}
GET  /api/session                      -> 200 {generation, seed_version}
POST /api/reset                        -> 200 {generation, seed_version, reset_at}
GET  /api/summary                      -> 200 GateSummary
GET  /api/emails                       -> 200 {seed_version, source, received_count, emails: InboxRow[]}
GET  /api/emails/{email_id}            -> 200 EmailDetail | 404
POST /api/cases/{case_id}/review-actions  body CaseActionBody -> 200 EmailDetail | 409 | 422
GET  /api/reconciliation               -> 200 {shipments: ShipmentRow[], results: ReconciliationRow[]}
POST /api/reconciliation/{reconciliation_id}/actions body ExceptionActionBody -> 200 ReconciliationRow | 409 | 422
GET  /api/evidence/{attachment_id}     -> 200 bytes | 404
GET  /api/artifacts/submission.json    -> 200 application/json attachment
GET  /api/artifacts/expected-shipments.csv -> 200 text/csv attachment
GET  /api/judge/policy                 -> 200 {accepted_formats, max_file_bytes, data_policy, confirmation_required}
POST /api/judge/runs  multipart(si_file, draft_bl_file, synthetic_confirmed) -> 201 JudgeRun | 422 | 409
GET  /api/judge/runs                   -> 200 {runs: JudgeRun[]}
GET  /api/judge/runs/{run_id}          -> 200 JudgeRun | 404
POST /api/judge/runs/{run_id}/retry    -> 200 JudgeRun | 404 | 409
GET  /api/judge/runs/{run_id}/documents/{document_id} -> 200 bytes | 404
GET  /api/judge/fallback               -> 200 PreparedFallback
```

Shapes (JSON; `ExtractedValue` and `Provenance` are the `app.contracts`
JSON dumps):

```text
InboxRow        {email_id, sender, subject, attachments: [file_name], outcome: EvaluatorOutput|null,
                 disposition, source}
EmailDetail     {email_id, source, is_prepared, category, status, review_reason, sender, subject,
                 received_at, attachments: [{attachment_id, file_name, detected_format,
                 document_type: SI|DRAFT_BL|COMMERCIAL_INVOICE|UNKNOWN, parse_state:
                 PARSED|MISSING|UNREADABLE|REJECTED, byte_size, error}],
                 field_verdicts: [{field, si, draft_bl, verdict: MATCH|MISMATCH|REVIEW,
                 semantic_probability, reason}],
                 held_review: null | {case_id, email_id, status, review_reason, probability,
                 assigned_owner, disposition, immutable_source: {email_id, sender, subject,
                 received_at, message_hash}, evidence_summary, history: [{id, timestamp, actor,
                 action, note}]}}
CaseActionBody  {action: APPROVE|CORRECT|REJECT, actor_id, rationale, corrected_fields: {field: str|number}|null}
ShipmentRow     ExpectedShipment fields from app.reconciliation plus source_hash
ReconciliationRow {reconciliation_id, outcome, subject_key, shipment_id, case_ids,
                 candidate_shipment_ids, candidate_case_ids, match_basis, source_freshness,
                 assignment: null | {assigned_owner_id, state}, history: [...]}
ExceptionActionBody {action: ASSIGN|ACKNOWLEDGE|ESCALATE|RESOLVE, actor_id, rationale, assigned_owner_id|null}
GateSummary     {seed_version, source, gate1: {received, accounted, by_category},
                 comparison: {OK, MISMATCH, NEEDS_REVIEW}, gate2: {shipments, outcomes}}
JudgeRun        {run_id, source: "live", state: SUCCEEDED|FAILED, attempt, created_at, completed_at,
                 latency_ms, documents: [{document_id, slot: si_file|draft_bl_file, file_name,
                 detected_format, byte_size, role: SI|DRAFT_BL|OTHER|null, evidence_url}],
                 outcome: EvaluatorOutput|null, field_verdicts: [...as EmailDetail...],
                 diagnostics: [{reason, detail, document_role}], failure: null | {code, retryable, message}}
PreparedFallback {label: "PREPARED FALLBACK", source: "prepared", example_id, note,
                 documents: [...with evidence_url "/api/evidence/{attachment_id}"],
                 outcome, field_verdicts}
```

---

### Task 1: Error envelope, guest sessions, and reset

**Files:**
- Create: `apps/api/app/api/__init__.py`, `apps/api/app/api/errors.py`,
  `apps/api/app/api/deps.py`, `apps/api/app/api/session.py`,
  `apps/api/app/guest.py`
- Modify: `apps/api/app/main.py` (install errors + routers),
  `apps/api/app/db.py` (add `get_session_factory()`),
  `apps/api/app/config.py` (`bundle_dir`, `max_upload_bytes`,
  `demo_owner_id="docs-demo"`), `apps/api/.env.example` (`BUNDLE_DIR=`)
- Test: `apps/api/tests/test_api_session.py`

**Interfaces:**
- Produces: `ApiProblem(Exception)(status: int, code: str, message: str,
  details: list | None = None)`; `install_api_errors(app)` (handler for
  `ApiProblem`, `RequestValidationError` → `422 invalid_request`, and a
  middleware adding `Cache-Control: no-store` to `/api/*`);
  `GuestContext(guest_session_id: UUID, session_key: str, workspace_id:
  UUID, generation: int)`; `GuestSessions(session_factory, persistence)`
  with `async create() -> tuple[str, GuestContext]`, `async resolve(token:
  str | None) -> GuestContext | None`, `async reset(token: str, *,
  request_id: str) -> GuestContext`; `Services` dataclass (`settings`,
  `session_factory`, `persistence`, `object_store`, `guests`, plus fields
  later tasks fill: `seed`, `judge`, `reviews`); `get_services(request) ->
  Services` (reads `request.app.state.services`, building it lazily with
  `build_services(get_settings())`); `require_guest(request, services) ->
  GuestContext` (FastAPI dependency; `401 session_required`).

`GuestSessions.create`: token = `secrets.token_urlsafe(32)`, key =
`sha256(token.encode()).hexdigest()`; in one transaction insert
`GuestSession(session_key=key, current_generation=1)` and `Workspace(
guest_session_id=..., generation=1, is_shared_seed=False,
seed_workspace_id=None)`. `resolve` finds the session by key and its
workspace at `current_generation`. `reset` calls
`persistence.reset_guest_namespace(session_key=key,
audit=AuditContext(request_id=request_id, rule_version=settings.rule_version,
actor_kind="REVIEWER", actor_id="guest"))` and returns the new context.

Routes (`api/session.py`, prefix `/api`): `POST /session` (201),
`GET /session` (guest required), `POST /reset` (guest required; returns
`{generation, seed_version: SEED_VERSION, reset_at}`; a database failure
maps to `503 reset_unavailable` "The demo database is unavailable. Nothing
was changed."). Use `SEED_VERSION = "seed-v1"` from a new constant in
`app/guest.py` until Task 2 moves it to the seed module.

- [ ] **Step 1: Write failing tests** (`tests/test_api_session.py`,
  PostgreSQL-marked): build the app with services whose `session_factory`
  is `postgres_session_factory` and an `InMemoryPrivateObjectStore`, via a
  fixture that sets `app.state.services`; use `httpx.AsyncClient(transport=
  httpx.ASGITransport(app=app), base_url="http://test")`. Cases:
  1. `POST /api/session` → 201, token length ≥ 43, generation 1,
     `Cache-Control: no-store`; the stored `session_key` is the SHA-256 of
     the token, never the token.
  2. `GET /api/session` without header → 401 with
     `{"error": {"code": "session_required", ...}}`; with an unknown token
     → 401; with the token → 200 generation 1.
  3. `POST /api/reset` → generation 2; a second reset → generation 3
     (idempotent in effect: each lands on a fresh seed workspace); the
     generation-1 workspace is no longer active (`resolve` returns the
     generation-3 workspace).
  4. Two sessions reset independently: resetting A leaves B at
     generation 1.
  5. `POST /api/reset` when `reset_guest_namespace` raises
     `SQLAlchemyError` (monkeypatch) → 503 `reset_unavailable`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** as specified. `build_services(settings)`
  creates the persistence service from `get_session_factory()` and the
  object store (`GcsPrivateObjectStore(settings.gcs_bucket)` when the
  bucket is set, else `InMemoryPrivateObjectStore()`), and `GuestSessions`.
- [ ] **Step 4: Run tests** (the new file plus `tests/test_health.py`).
- [ ] **Step 5: Lint and commit** —
  `feat(api): add guest sessions, error envelope, and reset`.

---

### Task 2: Deterministic seed catalog and bundle packaging

**Files:**
- Create: `apps/api/app/seed/__init__.py` (package marker),
  `apps/api/app/seed/decisions-v1.json`, `apps/api/app/seed_catalog.py`,
  `apps/api/scripts/build_seed_decisions.py`
- Modify: `apps/api/pyproject.toml` (include `app/seed/*.json` as package
  data if the build excludes it), `Dockerfile` (copy the bundle and set
  `BUNDLE_DIR`), `.dockerignore` (re-include `data/sdoc-hackathon-bundle`,
  excluding its `__pycache__`)
- Test: `apps/api/tests/test_seed_catalog.py`

**Interfaces:**
- Consumes: `read_bundle` (`app.ingestion`), `DocumentAnalyzer`,
  `AttachmentInput`, `GeminiOutcome`, `GeminiDocument`, `scan_extraction`
  (`app.extraction`), `admit_pair`, `compare_fields`,
  `equivalence_questions`, `resolve_verdicts`, `structural_output`,
  `comparison_output`, `needs_interactive_review` (`app.comparison`),
  `JevRoleDecision`, `DocumentRole`, `JevEquivalence` (`app.jev`),
  `reconcile_shipments`, `load_expected_shipments_csv`, `CaseSnapshot`,
  `DocumentKind` (`app.reconciliation`), `build_submission_artifact` or the
  #31 serializer (`app.submission`).
- Produces: `SEED_VERSION = "seed-v1"`; `SeedDecisions` (pydantic:
  `seed_version`, `decision_source: Literal["prepared", "recorded"]`,
  `recorded_at`, `categories: dict[email_id, str]`, `roles: dict[content_hash,
  str]`, `equivalence: dict[email_id, dict[field, float]]`, `scans:
  dict[content_hash, GeminiDocument]`, `notes: list[str]`);
  `SeedAttachment(attachment_id, email_id, ordinal, file_name, bundle_path,
  content_hash, detected_format, byte_size)`; `SeedCase(case_id,
  email_id, category, evaluator_output, field_verdicts, structural_diagnostics,
  analyses_roles: dict[attachment_id, str | None], assigned_owner_id,
  disposition, decision_source)`; `SeedEmail(email_id, sender, subject,
  body_text, received_at, message_hash, attachments, case)`;
  `SeedReconciliation(run_id, reconciled_at, shipments, results)`;
  `SeedCatalog` (`emails: dict[str, SeedEmail]`, `attachments: dict[str,
  SeedAttachment]`, `reconciliation`, `submission_json: bytes`,
  `fallback_email_id: str`, `decision_source`) with
  `async SeedCatalog.build(bundle_dir: Path, decisions: SeedDecisions) ->
  SeedCatalog`, `read_attachment(attachment_id) -> bytes`, and
  `load_seed_catalog(settings) -> SeedCatalog` (process-wide, built once
  behind an `asyncio.Lock`).

Seed rules:

- Attachment ids are `"{email_id}-{ordinal}"` (1-based); case ids are
  `"seed-case:{email_id}"`; `received_at` is the fixed
  `2026-09-20T00:00:00Z`; the reconciliation run id is
  `uuid5(NAMESPACE_URL, "ladinglens:seed-v1:reconciliation")` and each
  result id is `uuid5(NAMESPACE_URL, f"ladinglens:seed-v1:{subject_key}")`.
- Categories come from `decisions.categories` (every one of the 520 ids is
  required). Non-comparison emails get the `OK` evaluator output.
- `BL_COMPARISON` emails run through `DocumentAnalyzer` with in-memory
  providers backed by `decisions`: a role decider that returns
  `decisions.roles[content_hash]` (probabilities `{role: 1.0, others: 0.0}`
  are NOT invented — use a `JevRoleDecision` whose `returned_model` is
  `"seed-decisions"` and whose probabilities are the recorded ones when
  present, else `{role: 1.0, others: 0.0}` with `provider_request_id`
  `"prepared"`), and a Gemini stub that returns
  `decisions.scans[content_hash]` and raises `ExtractionFailure(UNCONFIGURED)`
  when absent. Then `admit_pair`; structural → `structural_output`;
  otherwise `compare_fields`, and for each equivalence question use
  `decisions.equivalence[email_id][field]` when present (a real recorded
  probability), else record the field as a deterministic `MISMATCH` with
  reason `"Prepared baseline: the texts differ after normalization and were
  not judged by Jev"`. A blocked case (missing scan or role) is a build
  error in `recorded` mode and, in `prepared` mode, must not occur (the
  prepared decisions cover every attachment).
- Disposition: `IN_REVIEW` when status is `NEEDS_REVIEW` or any field is
  `REVIEW`, else `AUTO_COMPLETED`; `assigned_owner_id` is
  `Settings.demo_owner_id` for `BL_COMPARISON` cases.
- Reconciliation: `load_expected_shipments_csv(bundle/fixtures/
  SYNTHETIC_expected_shipments.csv)`; case snapshots for every
  `BL_COMPARISON` seed case with identifiers `booking_reference` and
  `order_number` read from its SI text (TXT/DOCX/XLSX/digital-PDF text via
  the parsers: regex `Booking (?:Ref|No\.?|Reference)[.:]?\s*(\S+)` and `OC
  No\.?[:.]?\s*(\S+)`, case-insensitive; scans: the recorded transcription)
  and `documents` = the admitted roles; `reconcile_shipments(...,
  reconciled_at=2026-09-21T00:00:00Z)`; results materialized with the
  deterministic ids above.
- `submission_json`: the canonical 520-record artifact bytes for the seed
  outputs (reuse the #31 serializer that produces canonical bytes).
- `fallback_email_id`: the prepared judge example, `"email_004"` (a TXT pair
  with a textual difference), which must exist and be `BL_COMPARISON`.

`scripts/build_seed_decisions.py` writes the prepared
`decisions-v1.json`: categories copied from
`apps/web/src/data/inbox-fixture.json` (the team's prepared offline
classification), roles from a transparent header rule over each
attachment's parsed text (`SHIPPING INSTRUCTION`, `BL INSTRUCTION`, or
`BILL OF LADING INSTRUCTION` → `SI`; else `BILL OF LADING` → `DRAFT_BL`;
else `OTHER`), no equivalence probabilities, and the six scanned PDFs'
fields as prepared human transcriptions (below) with `page = 1`,
`document_title` and `transcription` filled; `decision_source =
"prepared"`, and a `notes` entry explaining each prepared source.

Prepared scan transcriptions (SI and draft BL carry the same values):

| Email | shipper | consignee | notify_party | port_of_loading | port_of_discharge | container_count | gross_weight_kg |
| ----- | ------- | --------- | ------------ | --------------- | ----------------- | --------------- | --------------- |
| 512 | APRIL FAR EAST (M) SDN BHD | AL GURG STATIONERY LLC | AL GURG STATIONERY LLC | NHAVA SHEVA, INDIA | TUTICORIN, INDIA | 6 x 40'HC | 128,544 KG |
| 513 | APRIL FINE PAPER TRADING | KPP-ANTALIS (SINGAPORE) PTE. LTD. | EAST BRIGHT FZ-LLC | NHAVA SHEVA, INDIA | VALPARAISO, CHILE | 10 x 40'HC | 237,750 KG |
| 514 | ASIA PACIFIC PAPERBOARD TRADING PTE LTD | EAST BRIGHT FZ-LLC | EAST BRIGHT FZ-LLC | NANTONG, CHINA | GDANSK, POLAND | 1 x 20'FCL | 22,825 KG |

Regions: party fields `party`, ports `routing`, counts and weights
`cargo`. Titles: `SHIPPING INSTRUCTION` (SI) and `BILL OF LADING (DRAFT)`
(BL); transcription = title plus one `Label: value` line per field.

- [ ] **Step 1: Write failing tests** (`tests/test_seed_catalog.py`, no
  database): building the catalog from the repo bundle and the committed
  decisions yields 520 emails, every category present, deterministic
  output (two builds produce identical `submission_json` bytes), 7 verdicts
  with local provenance for `email_001` (TXT anchors), `NEEDS_REVIEW`
  outcomes for `email_507` (`missing_attachment`), `email_511`
  (`unreadable`), `email_501` (`wrong_doc_type`), `email_516`
  (`missing_value`), `scanned_pdf` provenance for `email_512`, a
  `MISSING_CASE` result for `SYN-042` with no case ids, stable result ids,
  and `read_attachment("email_001-1")` equal to the bundle bytes; a
  decisions file missing a category raises `ValueError`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** the catalog and the generator; run the
  generator once and commit its output
  (`uv run python scripts/build_seed_decisions.py`).
- [ ] **Step 4: Run tests; build the Docker image locally only if Docker is
  available** (`docker build -t ladinglens-seed-check .` from the repo root)
  — otherwise state in the report that the Dockerfile change is untested.
- [ ] **Step 5: Lint and commit** —
  `feat(api): build the deterministic seed baseline from the synthetic bundle`.

---

### Task 3: Inbox, detail, summary, and reconciliation reads

**Files:**
- Create: `apps/api/app/api/inbox.py`, `apps/api/app/api/views.py`
  (pure mappers from seed/DB records to the contract shapes),
  `apps/api/app/api/reconciliation_routes.py`
- Modify: `apps/api/app/api/deps.py`, `apps/api/app/main.py`
- Test: `apps/api/tests/test_api_reads.py`

**Interfaces:**
- Consumes: `SeedCatalog`, `GuestContext`, persistence reads
  (`get_case_review_status`, `get_reconciliation_exception_state`).
- Produces: `email_detail_view(seed_email, overlay) -> dict`,
  `inbox_row(seed_email, overlay) -> dict`, `reconciliation_row(result,
  overlay) -> dict`, `gate_summary(catalog) -> dict`; routes
  `GET /api/emails`, `GET /api/emails/{email_id}`, `GET /api/summary`,
  `GET /api/reconciliation`.

Mapping rules: `verdict` = the `FieldVerdict.interactive_state`;
`document_type` from the case's analysis role (`SI`, `DRAFT_BL`, `OTHER` →
`UNKNOWN`), `parse_state` `UNREADABLE` for unreadable attachments,
`REJECTED` for unsupported, `PARSED` otherwise; `held_review` present when
the disposition is `IN_REVIEW`, `APPROVED`, `CORRECTED`, or `REJECTED`,
with `immutable_source` from the seed email and `history` = the guest
overlay's actions (`{id: review_action_id, timestamp, actor: actor_id,
action, note: rationale}`); `probability` = the lowest REVIEW-field
probability, if any. Overlay: when the guest workspace holds a
materialized copy of the case (Task 5), its disposition and actions win.
Until Task 5 lands, the overlay is empty.

- [ ] Steps: failing tests (seed-backed reads with a guest; 404 for an
  unknown email; list has 520 rows with sources; summary counts add up to
  520; reconciliation lists 6 shipments and includes `SYN-042` as
  `MISSING_CASE`), implement, run, lint, commit —
  `feat(api): serve seeded inbox, case detail, and reconciliation reads`.

---

### Task 4: Private evidence and artifact downloads

**Files:**
- Create: `apps/api/app/api/evidence.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_api_evidence.py`

**Interfaces:**
- Produces: `GET /api/evidence/{attachment_id}` (seed attachments by
  `SeedCatalog.read_attachment`; 404 for unknown ids and for any id that is
  not a seed attachment), `GET /api/artifacts/submission.json`
  (`SeedCatalog.submission_json`, `Content-Disposition: attachment;
  filename="ladinglens-submission-seed-v1.json"`, header
  `X-LadingLens-Source: prepared|recorded`), `GET
  /api/artifacts/expected-shipments.csv` (the bundle CSV bytes,
  `text/csv; charset=utf-8`, attachment filename
  `SYNTHETIC_expected_shipments.csv`). Media types by detected format:
  `text/plain; charset=utf-8`, `application/pdf`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

- [ ] Steps: failing tests (bytes equal the bundle file; `nosniff`,
  `no-store`, inline disposition; unknown id → 404; path traversal ids such
  as `..%2Fconfig` → 404; artifact has 520 keys with exactly five fields
  each; CSV starts with the header row; every download requires a session),
  implement, run, lint, commit —
  `feat(api): serve evidence and demo artifacts through private endpoints`.

---

### Task 5: Copy-on-write review actions for seed cases and exceptions

**Files:**
- Create: `apps/api/app/materialize.py`, `apps/api/app/api/actions.py`
- Modify: `apps/api/app/api/inbox.py`,
  `apps/api/app/api/reconciliation_routes.py` (overlays)
- Test: `apps/api/tests/test_api_actions.py`

**Interfaces:**
- Consumes: `PersistenceService.persist_receipt`, `persist_case`,
  `CaseInput`, `ReceiptInput`, `AttachmentInput`,
  `import_expected_shipments`, `persist_reconciliation_run`,
  `append_review_action`, `get_case_review_status`,
  `get_reconciliation_exception_state`; `CaseReviewService` (`app.review`).
- Produces: `guest_case_id(workspace_id, email_id) -> UUID` (uuid5 of
  `f"{workspace_id}:case:{email_id}"`), `guest_reconciliation_id(workspace_id,
  seed_id) -> UUID`; `SeedMaterializer(persistence, catalog)` with
  `async ensure_case(ctx, email_id) -> UUID` and `async
  ensure_exception(ctx, seed_reconciliation_id) -> UUID` (both idempotent
  and safe under concurrent calls: an `IntegrityError` on a concurrent
  insert re-reads). `persist_reconciliation_run` requires every referenced
  case to exist in the workspace as a UUID, so `ensure_exception`
  materializes only the one seed result being acted on: it imports the
  seed shipments into the guest workspace (idempotent import), materializes
  each case the result references with `ensure_case`, rewrites the result's
  case ids to the guest case UUIDs, and persists a one-result run with id
  `uuid5(workspace_id, f"seed-exception:{seed_reconciliation_id}")` and
  result id `guest_reconciliation_id(...)` (`exception_queue_owner` =
  the seed result's owner or `Settings.demo_owner_id`);
  routes `POST /api/cases/{case_id}/review-actions` (the path `case_id` is
  the seed case id `seed-case:{email_id}`) and `POST
  /api/reconciliation/{reconciliation_id}/actions` (seed result id).

Errors: case not found → 404 `case_not_found`; case not in review → 409
`not_in_review`; already settled → 409 `already_settled`; blank actor or
rationale, bad corrected fields → 422 `invalid_review_action`; resolved
exception → 409 `already_resolved`.

- [ ] Steps: failing tests — approve the held seed case `seed-case:email_516`
  → detail shows `APPROVED` with one history entry for that guest only;
  another guest still sees `IN_REVIEW`; a second action → 409; reset →
  `IN_REVIEW` again and replaying the approve succeeds (mutate → reset →
  replay); `ASSIGN` then `RESOLVE` on `SYN-042` updates only this guest's
  view; concurrent first actions from two tasks on one guest (use
  `asyncio.gather`) produce one materialized case and one accepted action
  plus one 409; a seed row is never modified (compare seed catalog data
  before and after). Implement, run, lint, commit —
  `feat(api): record guest review actions on seed cases copy-on-write`.

---

### Task 6: Live judge runs with prepared fallback

**Files:**
- Create: `apps/api/app/judge.py`, `apps/api/app/api/judge_routes.py`,
  `apps/api/migrations/versions/20260921_0006_judge_runs.py`
- Modify: `apps/api/app/models.py` (`JudgeRunRecord`),
  `apps/api/pyproject.toml` (`python-multipart`), `apps/api/uv.lock`,
  `apps/api/app/api/deps.py` (build the pipeline and judge service),
  `apps/api/tests/test_migrations.py` (head `20260921_0006`,
  `judge_runs` in `REQUIRED_TABLES`)
- Test: `apps/api/tests/test_api_judge.py`

**Interfaces:**
- Consumes: `ComparisonPipeline` (`app.pipeline`), `JevDocumentRoleClient`,
  `JevEquivalenceClient`, `GeminiExtractor`, `preflight`, persistence
  (`persist_receipt`, `ensure_classification_case`,
  `record_classification_success`, `load_case_documents`), `SeedCatalog`.
- Produces: table `judge_runs` (`judge_run_id` UUID pk, `workspace_id` FK,
  `email_id` FK, `case_id` FK, `state` in `SUCCEEDED|FAILED`,
  `attempt` ≥ 1, `failure_code`, `failure_retryable`, `failure_message`,
  `latency_ms`, `slots` JSONB mapping attachment id → slot, `created_at`,
  `updated_at`; check: `FAILED` requires failure fields, `SUCCEEDED`
  forbids them); `JudgeService` with `async upload(ctx, *, si:
  UploadedFile, draft_bl: UploadedFile, synthetic_confirmed: bool,
  request_id) -> JudgeRunView`, `async retry(ctx, run_id, *, request_id)`,
  `async get(ctx, run_id)`, `async list(ctx)`, `async document(ctx, run_id,
  document_id) -> tuple[bytes, str, str]`, `fallback(catalog) -> dict`.

Upload flow: validate policy (Global Constraints) and reject before any
write with `422 upload_rejected` and `details: [{slot, reason:
missing|empty|too_large|unsupported_format}]`; persist a receipt in the
guest workspace (`idempotency_key = f"judge:{run_id}"`, sender
`judge-upload@ladinglens.invalid`, subject `Judge upload`, message bytes =
canonical JSON of the two file names and hashes); create the case with
`ensure_classification_case` then `record_classification_success(category
=BL_COMPARISON, category_probabilities={"BL_COMPARISON": 1.0, others 0.0},
requested_model="judge-declared", returned_model="judge-declared",
provider_request_id=None, ..., assigned_owner_id=settings.demo_owner_id)`
with `AuditContext(prompt_version="judge-upload-v1")` — the category is
declared by the uploader, not inferred, and the audit says so; then
`pipeline.run_case`. `COMPARED`/`NEEDS_REVIEW` → `SUCCEEDED`;
`PROVIDER_FAILED` → `FAILED` with the failure code, retryable flag, and a
plain message per code (`rate_limited`/`quota_exhausted`: "The AI provider
is at capacity. Try again in a minute."; `timeout`: "The AI provider did
not answer in time."; `provider_unconfigured`: "Live AI checks are not
configured on this server."; others: "The AI provider could not complete
the check."). A reset during the run surfaces as `409 session_reset`
("Your demo was reset while this check ran. Upload the pair again."),
because every persistence write re-checks the active generation.
`retry` reruns `pipeline.run_case` on the same case and increments
`attempt`; it returns `409 already_succeeded` for a succeeded run.

`fallback(catalog)`: the seed `fallback_email_id` case as `PreparedFallback`
with `label = "PREPARED FALLBACK"`, `source = "prepared"`, `note = "A
prepared example, not your upload."`.

- [ ] Steps: failing tests with fake providers (a role fake by content
  header, an equivalence fake, a Gemini stub) injected into the services:
  a fresh TXT pair (write two new synthetic TXT files in the test, not
  bundle copies) → 201 `SUCCEEDED`, 7 verdicts with TXT anchors, documents
  with evidence URLs that return the uploaded bytes to this guest and 404
  to another guest; equivalence fake raising `JevProviderFailure(TIMEOUT)`
  → 201 `FAILED` with `failure.code == "timeout"` and no outcome; retry
  with a working fake → 200 `SUCCEEDED`, `attempt == 2`; a PNG → 422
  `upload_rejected` with `unsupported_format`; a 6 MB file → `too_large`;
  missing confirmation → 422 `synthetic_only`; `GET /api/judge/fallback`
  has the label, `source: "prepared"`, 7 verdicts; after reset the run list
  is empty and the old run id is 404. Implement, run, lint, commit —
  `feat(api): run live judge uploads with a labelled prepared fallback`.

---

### Task 7: Wire real providers and document the API

**Files:**
- Modify: `apps/api/app/api/deps.py` (`build_services`: `JevDocumentRoleClient`
  and `JevEquivalenceClient` over one `AsyncTypeSafeClient(api_key=
  settings.typesafe_api_key)` created only when the key is set; otherwise a
  provider stub that raises `JevProviderFailure(AUTHENTICATION_ERROR,
  retryable=False)` so runs fail closed with `provider_unconfigured`-style
  messaging; `GeminiExtractor()`), `apps/api/app/main.py` (readiness
  reports `seed: ready|building|error`)
- Create: `docs/references/api.md` (the API contract above, in the repo
  Markdown style)
- Test: `apps/api/tests/test_api_wiring.py` (services build without keys;
  judge run without keys returns `FAILED` with a non-retryable failure and
  the fallback still works)

- [ ] Steps: failing tests, implement, run the full suite, lint, commit —
  `feat(api): wire provider clients and document the product API`.
