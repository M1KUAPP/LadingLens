# LadingLens architecture

LadingLens is a shipping inbox-control system for Averis: it accounts for
every email that reaches an operator's inbox, independently checks the
shipments that were supposed to arrive against the cases that actually
did, and — for a validated Shipping Instruction (SI) and draft Bill of
Lading (draft BL) pair — compares seven fields against the SI as the
reference. Two gates decide whether a case needs a person, and a named
human makes every consequential approval, correction, or rejection.

Every claim on this page links to the file that implements it and, where
one exists, the test that proves it. AI-provider and cloud-deployment
detail lives in [docs/ai.md](/docs/ai.md) and
[docs/cloud.md](/docs/cloud.md); this page covers what the decisions are
and who owns them.

Contents:

1.  [Gate 1: every email is accounted for](#gate-1-every-email-is-accounted-for)
1.  [Gate 2: the expected-shipment ledger](#gate-2-the-expected-shipment-ledger)
1.  [Evidence comparison: SI to draft BL](#evidence-comparison-si-to-draft-bl)
1.  [Decision ownership](#decision-ownership)
1.  [Processing flow and structural-reason precedence](#processing-flow-and-structural-reason-precedence)
1.  [Module map](#module-map)
1.  [Data model](#data-model)
1.  [Guest sessions, the seed baseline, and Reset All](#guest-sessions-the-seed-baseline-and-reset-all)
1.  [The public /judge page](#the-public-judge-page)
1.  [See also](#see-also)

## Gate 1: every email is accounted for

Gate 1 answers "did we see it, and what is it?" for every email that
reaches the inbox.
[`apps/api/app/ingestion.py`](/apps/api/app/ingestion.py) receipts an
email before anything else runs: it hashes the message and every
attachment and persists an immutable receipt
(`Gate1Persistence.persist_receipt`); repeating the same idempotency key
and source hash returns the original result instead of a second case.
Pinned Jev then assigns exactly one closed-set
[`Category`](/apps/api/app/contracts.py) — `BL_COMPARISON`, `SI_REQUEST`,
`INVOICE_QUERY`, `GENERAL`, or `SPAM` — and every category is persisted,
not only `BL_COMPARISON`. A non-comparison category completes as an `OK`
outcome; only `BL_COMPARISON` continues to evidence comparison.

Proven by
[`test_gate1_receipts_and_classifies_all_520_before_idempotent_replay`](/apps/api/tests/test_gate1.py),
which classifies all 520 bundle emails and replays the same batch
idempotently.

## Gate 2: the expected-shipment ledger

Gate 2 is independent of Gate 1: it starts from what was supposed to
arrive, not from what the inbox happened to receive.
[`apps/api/app/reconciliation.py`](/apps/api/app/reconciliation.py) loads
an expected-shipment CSV (`load_expected_shipments_csv`) and reconciles it
against the case ledger (`reconcile_shipments`). Every shipment resolves
to exactly one
[`ReconciliationOutcome`](/apps/api/app/contracts.py): `CASE_PRESENT`,
`DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`,
`DUPLICATE_OR_AMBIGUOUS`, or `SOURCE_STALE`.

The checked-in synthetic fixture
([`data/sdoc-hackathon-bundle/fixtures/SYNTHETIC_expected_shipments.csv`](/data/sdoc-hackathon-bundle/fixtures/SYNTHETIC_expected_shipments.csv))
carries shipment `SYN-042` at lifecycle `DRAFT_BL_EXPECTED` with no
matching case. Reconciliation resolves it to `MISSING_CASE` — proof that
a never-arrived email can be caught even though nothing was ever
misclassified. Proven by
[`apps/api/tests/test_reconciliation.py`](/apps/api/tests/test_reconciliation.py)
(`by_subject["shipment:SYN-042"].outcome is
ReconciliationOutcome.MISSING_CASE`) and by
`test_reconciliation_fixture_produces_all_six_outcomes`, which reaches
every outcome from that one fixture.

## Evidence comparison: SI to draft BL

Only a `BL_COMPARISON` case whose two required attachments both validate
— one SI, one draft BL — reaches comparison (`admit_pair` in
[`apps/api/app/comparison.py`](/apps/api/app/comparison.py)); anything
else stops at a structural `NEEDS_REVIEW` (see
[Processing flow](#processing-flow-and-structural-reason-precedence)). A
validated pair is compared over the same seven
[`ComparedField`](/apps/api/app/contracts.py) values — `shipper`,
`consignee`, `notify_party`, `port_of_loading`, `port_of_discharge`,
`container_count`, `gross_weight_kg` — and the SI is always the reference
value, never the draft BL. Party and port text that differs is judged by
Jev as a typed match probability, banded at `MATCH_THRESHOLD = 0.85` and
`MISMATCH_THRESHOLD = 0.30`; the two numeric fields are normalized and
compared in Python and are never asked of Jev.

Proven by
[`test_numbers_are_compared_deterministically_with_si_as_reference`](/apps/api/tests/test_comparison.py)
and `test_all_seven_fields_get_a_verdict_and_ok_when_equal`.

## Decision ownership

| Owner | Decides | Never decides |
| --- | --- | --- |
| Deterministic Python ([`formats.py`](/apps/api/app/formats.py), [`normalization.py`](/apps/api/app/normalization.py), [`comparison.py`](/apps/api/app/comparison.py), [`contracts.py`](/apps/api/app/contracts.py), [`persistence.py`](/apps/api/app/persistence.py)) | File preflight, hashing, and MIME/magic-byte checks; local TXT/XLSX/DOCX/digital-PDF parsing with exact anchors; value normalization; both numeric field comparisons; schema validation, state transitions, and all persistence and audit | Document identity or text meaning |
| Gemini 3.5 Flash ([`extraction.py`](/apps/api/app/extraction.py), [`gemini.py`](/apps/api/app/gemini.py)) | Extracts field values only from a scanned PDF or a document whose local parse is materially ambiguous (`Route`: `gemini_scan` / `gemini_ambiguous`); every answer is schema-validated, and a grounded answer must be found verbatim in the source text or extraction fails closed | Parsing a clean digital document; classification; equivalence judgments |
| Jev `jev-1.13.0` ([`jev.py`](/apps/api/app/jev.py), pinned in [`config.py`](/apps/api/app/config.py)) | Three typed decisions: email category (`JevCategoryClient`), document role — SI, draft BL, or other (`JevDocumentRoleClient`) — and textual field equivalence (`JevEquivalenceClient`) | Arithmetic, numeric fields, or persistence |
| Named human reviewer ([`review.py`](/apps/api/app/review.py)) | Approves, corrects, or rejects a held case; assigns, acknowledges, escalates, or resolves a reconciliation exception | Nothing — the only actor whose action is a final disposition |

No alternative model provider is wired into the runtime:
[`test_settings_have_no_alternative_provider_fields` and
`test_runtime_python_has_no_alternative_provider_references`](/apps/api/tests/test_provider_configuration.py)
assert no `openai` or `qwen` string reaches `app/`, and `gemini_model` and
`jev_model` are typed `Literal` fields in
[`config.py`](/apps/api/app/config.py) that reject any other value,
proven by `test_unapproved_model_or_data_policy_is_rejected`. See
[docs/ai.md](/docs/ai.md) for the prompts, retries, and audit fields
behind each provider call.

## Processing flow and structural-reason precedence

[`apps/api/app/pipeline.py`](/apps/api/app/pipeline.py) runs one case end
to end — extraction, role decision, pair admission, comparison, and
persistence — with every provider call made outside an open database
transaction, so a slow provider never holds a lock. A provider failure
never fabricates a result: the case is left exactly where it was and the
run reports why. The full state machine (`RECEIVED` through `APPROVED` /
`CORRECTED` / `REJECTED`, and the separate reconciliation-exception
lifecycle) is in
[docs/TRD.md § End-to-end flow and state machine](/docs/TRD.md#end-to-end-flow-and-state-machine).

Before a `BL_COMPARISON` case can produce a seven-field result,
[`select_structural_review_reason`](/apps/api/app/submission.py) picks at
most one structural reason using a fixed precedence, evaluating every
diagnostic and keeping the rest in the audit trail:

1.  `unreadable` — a required document is corrupt or unparseable.
1.  `wrong_doc_type` — a supplied candidate is not an SI or draft BL for
    its required role.
1.  `missing_attachment` — no candidate was supplied for a required role.
1.  `missing_value` — both documents validated, but a required value is
    absent after extraction and normalization.

Proven by
[`test_structural_precedence_selects_one_reason_and_retains_all_diagnostics`
and `test_structural_precedence_covers_every_priority_level`](/apps/api/tests/test_submission.py).
See
[docs/TRD.md § Structural reason precedence](/docs/TRD.md#structural-reason-precedence)
for the full rationale.

## Module map

### `apps/api/app/*`

| Module | Role |
| --- | --- |
| [`ingestion.py`](/apps/api/app/ingestion.py) | Gate 1 receipt and Jev category classification |
| [`jev.py`](/apps/api/app/jev.py) | Pinned `jev-1.13.0` client: category, document role, textual equivalence |
| [`formats.py`](/apps/api/app/formats.py) | Deterministic preflight and local TXT/XLSX/DOCX/digital-PDF parsing with provenance |
| [`gemini.py`](/apps/api/app/gemini.py) | Configured Gemini clients; retries the second key only after a 429 |
| [`extraction.py`](/apps/api/app/extraction.py) | Routes scans and locally ambiguous documents to Gemini; schema-validates and grounds the result |
| [`normalization.py`](/apps/api/app/normalization.py) | Deterministic value normalization: units, text keys, LOCODEs, placeholders |
| [`comparison.py`](/apps/api/app/comparison.py) | Pair admission, seven-field comparison, Jev-band mapping |
| [`contracts.py`](/apps/api/app/contracts.py) | Canonical enums, typed records, the five-key evaluator shape |
| [`reconciliation.py`](/apps/api/app/reconciliation.py) | Expected-shipment CSV import and Gate 2 outcome resolution |
| [`submission.py`](/apps/api/app/submission.py) | Structural-reason precedence and the 520-record evaluator artifact |
| [`pipeline.py`](/apps/api/app/pipeline.py) | Runs one case through extraction, comparison, and persistence |
| [`review.py`](/apps/api/app/review.py) | Named-reviewer case dispositions |
| [`persistence.py`](/apps/api/app/persistence.py) | Every PostgreSQL read/write, idempotency, and the audit trail |
| [`models.py`](/apps/api/app/models.py) | The 20 SQLAlchemy tables (see [Data model](#data-model)) |
| [`storage.py`](/apps/api/app/storage.py) | Content-addressed, create-only private GCS object access |
| [`observability.py`](/apps/api/app/observability.py) | Structured, secret-scrubbed request logging |
| `api/*`, `guest.py`, `seed_catalog.py`, `materialize.py` | The product HTTP surface: guest sessions, the seed baseline, reads, evidence, and review actions (see [Guest sessions](#guest-sessions-the-seed-baseline-and-reset-all)) |

### `apps/web/src/*`

| Path | Role |
| --- | --- |
| [`pages/`](/apps/web/src/pages) | Route-level screens: inbox, review queue, control graph, evaluation, settings, auth, landing |
| [`features/email-detail/`](/apps/web/src/features/email-detail) | Case detail: comparison grid and evidence viewer |
| [`features/review-queue/`](/apps/web/src/features/review-queue) | The held-case queue and reviewer disposition actions |
| [`features/reconciliation/`](/apps/web/src/features/reconciliation) | The shipment ledger and reconciliation-exception actions |
| [`features/control-graph/`](/apps/web/src/features/control-graph) | A Cytoscape visualization of the control graph, with an accessible table fallback |
| `features/judge/` | The public `/judge` upload, live result, and prepared-fallback panels (see [The public /judge page](#the-public-judge-page)) |
| [`domain/contracts.ts`](/apps/web/src/domain/contracts.ts) | Mirrors the backend's canonical enums (`Category`, `Status`, `ComparedField`, and more) |
| [`routing/routes.tsx`](/apps/web/src/routing/routes.tsx) | The client route table |
| `lib/api.ts`, `lib/demo-reset.ts`, `lib/reset-context.tsx` | The guest-session HTTP client and Reset All (see [Guest sessions](#guest-sessions-the-seed-baseline-and-reset-all)) |

## Data model

PostgreSQL is the system of record; all 20 tables are defined in
[`apps/api/app/models.py`](/apps/api/app/models.py) and written only
through [`apps/api/app/persistence.py`](/apps/api/app/persistence.py).

| Group | Tables | Append-only? |
| --- | --- | --- |
| Identity and workspace | `guest_sessions`, `workspaces` | No — a reset increments a generation counter and inserts a new workspace row rather than editing the old one |
| Source and cache | `source_objects`, `email_receipts`, `email_attachments`, `ingestion_requests`, `extraction_cache` | No — content-addressed, idempotent upsert keyed by hash |
| Case and comparison | `cases`, `field_verdicts`, `classification_attempts` | `classification_attempts` yes; `cases` and `field_verdicts` update in place as a case progresses |
| Shipment ledger | `expected_shipments`, `reconciliation_runs`, `reconciliation_results` | Yes, all three — a source update or a rerun is a new row, never an edit |
| Review and audit | `review_assignments`, `review_actions`, `audit_events` | Yes, all three — no update or delete path |
| Submission artifact | `submission_runs`, `submission_run_records`, `submission_evaluations` | `submission_run_records` yes; the run (`submission_runs`) advances through states until one artifact publishes |

The append-only tables reject a raw SQL `UPDATE` or `DELETE` at the
database level, not only in application code — proven by
[`test_append_only_rows_reject_raw_update_and_delete`](/apps/api/tests/test_migrations.py)
(covering `expected_shipments`, `reconciliation_runs`,
`reconciliation_results`, `review_assignments`, `review_actions`,
`audit_events`, and `submission_run_records`) and
[`test_classification_attempts_are_append_only_and_case_checks_reject_fabrication`](/apps/api/tests/test_migrations.py).

## Guest sessions, the seed baseline, and Reset All

A visitor is never asked to sign up. The web client mints an anonymous
guest session on first API call (`POST /api/session`;
`GuestSessions.create` in `apps/api/app/guest.py`): a random token is
returned once, only its SHA-256 (`session_key`) is stored, and it maps to
generation 1 of a new `Workspace` row
([`apps/api/app/models.py`](/apps/api/app/models.py), which already
defines `GuestSession` and `Workspace` on this branch). Every later
request carries that token in the `X-LadingLens-Session` header
(`apps/web/src/lib/api.ts`); the server resolves it back to the caller's
current workspace and generation.

What a guest sees by default is the **seed baseline**: the real pipeline
(`apps/api/app/seed_catalog.py`) run once per process over the checked-in
synthetic bundle, with a versioned decisions file
(`apps/api/app/seed/decisions-v1.json`) standing in for what a provider
would have answered. That file is explicitly **prepared, not recorded** —
its own `decision_source` field is `"prepared"`, and its notes say plainly
that no provider was called and no organiser answer key was read;
categories come from the team's offline classification, document roles
from a transparent header rule, and the six scanned PDFs' fields from
human transcriptions. It is never presented as live model output. The
seed baseline is shared and read-only; a guest's first review or
reconciliation-exception action copies that one seed record into their
own workspace first (copy-on-write, deterministic UUIDv5 IDs —
`SeedMaterializer` in `apps/api/app/materialize.py`), so the shared seed
is never mutated and every guest's changes are theirs alone. This is
distinct from a judge's own live upload through `/judge` — see
[The public /judge page](#the-public-judge-page).

**Reset All** (`/settings`, `apps/web/src/pages/SettingsPage.tsx`)
discards a guest's own changes and returns them to the seed baseline. It
calls `POST /api/reset`, which starts a new workspace generation for that
guest through
[`PersistenceService.reset_guest_namespace`](/apps/api/app/persistence.py)
— already on this branch: the old generation's rows simply stop being
read, and any in-flight write against it fails closed. The web client
also clears its own local demo state (`apps/web/src/lib/demo-reset.ts`)
and never touches another guest's workspace
(`apps/web/src/lib/reset-context.tsx`).

The guest-session token issuance, the seed-catalog builder, copy-on-write
materialization, and the HTTP routes that call them
(`apps/api/app/guest.py`, `seed_catalog.py`, `materialize.py`, `api/*`,
`apps/web/src/lib/api.ts`, `lib/demo-reset.ts`, `lib/reset-context.tsx`,
`pages/SettingsPage.tsx`) are built on branches `feat/issue-30-product-api`
and `feat/issue-40-settings` and are not yet on this branch; only the
underlying `reset_guest_namespace` primitive above is. See
[docs/superpowers/plans/2026-09-21-issue-30-product-api.md](/docs/superpowers/plans/2026-09-21-issue-30-product-api.md)
for the full contract.

## The public /judge page

`/judge` is the one route in the web app that needs no guest session in
advance: `apps/web/src/routing/routes.tsx` renders it outside the
operator route guard, and the page mints a session for itself on mount.
A visitor uploads exactly one SI and one draft BL; the upload panel
enforces the synthetic-only confirmation and the size/format policy
fetched from `GET /api/judge/policy` before anything reaches the server
(`apps/web/src/features/judge/components/UploadPanel.tsx`).

A submission posts to `POST /api/judge/runs` and is designed to run live,
through the same pipeline as every other case, for that one pair —
never the prepared seed baseline
(`apps/web/src/features/judge/judge-api.ts`, `types.ts`). On success the
page shows all seven field verdicts with their evidence
(`JudgeView.tsx`, `phase === 'result'`). On a provider failure, the run
reports `state: "FAILED"` with a `{code, retryable, message}` failure and
no outcome; the page discloses that failure first, keeps the uploaded
file names visible, offers a retry when `retryable` is true
(`components/FailurePanel.tsx`), and only then renders a distinctly
labelled `PREPARED FALLBACK` panel fetched from `GET /api/judge/fallback`
as a separate example (`source: "prepared"`) — never as the visitor's own
result (`components/PreparedFallbackPanel.tsx`). This failure-first
ordering is proven by
`apps/web/src/features/judge/JudgeView.test.tsx`'s
`discloses a restored failure before the labelled prepared fallback,
keeping the uploaded file names visible`.

The exact request/response contract (`POST /api/judge/runs`, retry,
`GET /api/judge/fallback`) is specified in the product-API plan linked
above and is fully implemented by the frontend client cited here, on
branch `feat/issue-39-judge`. **The matching server-side route that runs
a live upload has not been written on any branch yet** — everything else
in [Guest sessions](#guest-sessions-the-seed-baseline-and-reset-all)
above (sessions, the seed baseline, reads, evidence, and copy-on-write
review actions) is implemented and pending merge; only the live-judge-run
endpoint itself is still unwritten. Until it lands, a `/judge` upload has
no server to call.

## See also

- [docs/references/api.md](/docs/references/api.md) — the full HTTP
  contract, written alongside the product API (issue #30).
- [docs/ai.md](/docs/ai.md) — AI provider prompts, retries, and audit
  fields.
- [docs/cloud.md](/docs/cloud.md) — the Cloud Run deployment, storage,
  and data-policy controls; the preliminary deployment is
  synthetic-data-only.
- [docs/TRD.md](/docs/TRD.md) — the full technical contract this page
  summarizes.
