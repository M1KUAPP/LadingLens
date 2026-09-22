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
detail lives in [docs/references/ai.md](/docs/references/ai.md) and
[docs/references/cloud.md](/docs/references/cloud.md); this page covers
what the decisions are and who owns them.

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
is generated from the bundle
([`build_expected_shipments.py`](/apps/api/scripts/build_expected_shipments.py)):
one shipment per seed BL case, keyed by the booking, order and BL numbers
its documents and email name, plus three documented scenarios. One of
them is shipment `SHP-5RFR-37631`, named by `email_007`'s SI request, at
lifecycle `DRAFT_BL_EXPECTED` with no matching case. Reconciliation
resolves it to `MISSING_CASE` — proof that a never-arrived email can be
caught even though nothing was ever misclassified. The seed reconciles the
220 shipments into 204 present cases, 12 with a missing document, 2
unmatched scans, one stale source, one ambiguous booking and that one
missing case. Proven by
[`apps/api/tests/test_reconciliation.py`](/apps/api/tests/test_reconciliation.py)
(`by_subject["shipment:SHP-5RFR-37631"].outcome is
ReconciliationOutcome.MISSING_CASE`) and by
`test_reconciliation_fixture_produces_all_six_outcomes`, which reaches
every outcome from the fixture's scenario rows.

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
value, never the draft BL. The two numeric fields are normalized and
compared in Python and are never asked of Jev.

Party and port text that differs is judged by Jev as a typed match
probability, and `apps/api/app/comparison.py` locks three bands
(`band()`, `MATCH_THRESHOLD = 0.85`, `MISMATCH_THRESHOLD = 0.30`):
`P >= 0.85` is `MATCH`; `P <= 0.30` is `MISMATCH`; and the locked middle
band, `0.30 < P < 0.85`, is interactive `REVIEW` — the case is held for
a named reviewer, since `pipeline.py` assigns a `review_owner_id`
whenever [`needs_interactive_review`](/apps/api/app/comparison.py) is
true — while the batch evaluator artifact conservatively scores that
same field `MISMATCH` and adds it to `defect_fields`
(`resolve_verdicts`, `comparison_output`). A field is never silently
dropped between the two views: interactive `REVIEW` always becomes
batch `MISMATCH`, never `MATCH`.

Proven by
[`test_numbers_are_compared_deterministically_with_si_as_reference`](/apps/api/tests/test_comparison.py),
`test_all_seven_fields_get_a_verdict_and_ok_when_equal`, and
`test_band_boundaries_map_interactive_and_batch`.

## Decision ownership

| Owner                                                                                                                                                                                                                                                                 | Decides                                                                                                                                                                                                                                                                           | Never decides                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Deterministic Python ([`formats.py`](/apps/api/app/formats.py), [`normalization.py`](/apps/api/app/normalization.py), [`comparison.py`](/apps/api/app/comparison.py), [`contracts.py`](/apps/api/app/contracts.py), [`persistence.py`](/apps/api/app/persistence.py)) | File preflight, hashing, and MIME/magic-byte checks; local TXT/XLSX/DOCX/digital-PDF parsing with exact anchors; value normalization; both numeric field comparisons; schema validation, state transitions, and all persistence and audit                                         | Document identity or text meaning                                       |
| Gemini 3.5 Flash ([`extraction.py`](/apps/api/app/extraction.py), [`gemini.py`](/apps/api/app/gemini.py))                                                                                                                                                             | Extracts field values only from a scanned PDF or a document whose local parse is materially ambiguous (`Route`: `gemini_scan` / `gemini_ambiguous`); every answer is schema-validated, and a grounded answer must be found verbatim in the source text or extraction fails closed | Parsing a clean digital document; classification; equivalence judgments |
| Jev `jev-1.13.0` ([`jev.py`](/apps/api/app/jev.py), pinned in [`config.py`](/apps/api/app/config.py))                                                                                                                                                                 | Three typed decisions: email category (`JevCategoryClient`), document role — SI, draft BL, or other (`JevDocumentRoleClient`) — and textual field equivalence (`JevEquivalenceClient`)                                                                                            | Arithmetic, numeric fields, or persistence                              |
| Named human reviewer ([`review.py`](/apps/api/app/review.py))                                                                                                                                                                                                         | Approves, corrects, or rejects a held case; assigns, acknowledges, escalates, or resolves a reconciliation exception                                                                                                                                                              | Nothing — the only actor whose action is a final disposition            |

No alternative model provider is wired into the runtime:
[`test_settings_have_no_alternative_provider_fields` and
`test_runtime_python_has_no_alternative_provider_references`](/apps/api/tests/test_provider_configuration.py)
assert no `openai` or `qwen` string reaches `app/`, and `gemini_model` and
`jev_model` are typed `Literal` fields in
[`config.py`](/apps/api/app/config.py) that reject any other value,
proven by `test_unapproved_model_or_data_policy_is_rejected`. See
[docs/references/ai.md](/docs/references/ai.md) for the prompts, retries,
and audit fields behind each provider call.

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

An email with nothing attached whose own message, not the quoted thread,
asks for the draft BL never reaches this list: no document is due yet, so
it closes `OK` with no verdicts.
[`requests_draft_bl`](/apps/api/app/comparison.py) decides this for both
the seed and the live pipeline.

Proven by
[`test_structural_precedence_selects_one_reason_and_retains_all_diagnostics`
and `test_structural_precedence_covers_every_priority_level`](/apps/api/tests/test_submission.py).
See
[docs/TRD.md § Structural reason precedence](/docs/TRD.md#structural-reason-precedence)
for the full rationale.

## Module map

### `apps/api/app/*`

| Module                                                                                                                                     | Role                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ingestion.py`](/apps/api/app/ingestion.py)                                                                                               | Gate 1 receipt and Jev category classification                                                                                                                            |
| [`jev.py`](/apps/api/app/jev.py)                                                                                                           | Pinned `jev-1.13.0` client: category, document role, textual equivalence                                                                                                  |
| [`formats.py`](/apps/api/app/formats.py)                                                                                                   | Deterministic preflight and local TXT/XLSX/DOCX/digital-PDF parsing with provenance                                                                                       |
| [`gemini.py`](/apps/api/app/gemini.py)                                                                                                     | Configured Gemini clients; retries the second key only after a 429                                                                                                        |
| [`extraction.py`](/apps/api/app/extraction.py)                                                                                             | Routes scans and locally ambiguous documents to Gemini; schema-validates and grounds the result                                                                           |
| [`normalization.py`](/apps/api/app/normalization.py)                                                                                       | Deterministic value normalization: units, text keys, LOCODEs, placeholders                                                                                                |
| [`comparison.py`](/apps/api/app/comparison.py)                                                                                             | Pair admission, seven-field comparison, Jev-band mapping                                                                                                                  |
| [`contracts.py`](/apps/api/app/contracts.py)                                                                                               | Canonical enums, typed records, the five-key evaluator shape                                                                                                              |
| [`reconciliation.py`](/apps/api/app/reconciliation.py)                                                                                     | Expected-shipment CSV import and Gate 2 outcome resolution                                                                                                                |
| [`submission.py`](/apps/api/app/submission.py)                                                                                             | Structural-reason precedence and the 520-record evaluator artifact                                                                                                        |
| [`pipeline.py`](/apps/api/app/pipeline.py)                                                                                                 | Runs one case through extraction, comparison, and persistence                                                                                                             |
| [`review.py`](/apps/api/app/review.py)                                                                                                     | Named-reviewer case dispositions                                                                                                                                          |
| [`judge.py`](/apps/api/app/judge.py)                                                                                                       | `JudgeService`: runs a `/judge` upload through the same pipeline, with retry and the prepared fallback                                                                    |
| [`guest.py`](/apps/api/app/guest.py), [`seed_catalog.py`](/apps/api/app/seed_catalog.py), [`materialize.py`](/apps/api/app/materialize.py) | Guest-session issuance and reset, the prepared seed baseline, and copy-on-write materialization                                                                           |
| [`persistence.py`](/apps/api/app/persistence.py)                                                                                           | Every PostgreSQL read/write, idempotency, and the audit trail                                                                                                             |
| [`models.py`](/apps/api/app/models.py)                                                                                                     | The 21 SQLAlchemy tables (see [Data model](#data-model))                                                                                                                  |
| [`storage.py`](/apps/api/app/storage.py)                                                                                                   | Content-addressed, create-only private GCS object access                                                                                                                  |
| [`observability.py`](/apps/api/app/observability.py)                                                                                       | Structured, secret-scrubbed request logging                                                                                                                               |
| [`api/`](/apps/api/app/api)                                                                                                                | FastAPI routers — `session.py`, `inbox.py`, `reconciliation_routes.py`, `evidence.py`, `actions.py`, `judge_routes.py` — registered in [`main.py`](/apps/api/app/main.py) |

### `apps/web/src/*`

| Path                                                                                                                                                             | Role                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`pages/`](/apps/web/src/pages)                                                                                                                                  | Route-level screens: upload, inbox, review queue, reconciliation, control graph, evaluation, settings, auth, landing                                                                              |
| [`features/email-detail/`](/apps/web/src/features/email-detail)                                                                                                  | Case detail: comparison grid and evidence viewer                                                                                                                                                  |
| [`features/review-queue/`](/apps/web/src/features/review-queue)                                                                                                  | The held-case queue and reviewer disposition actions                                                                                                                                              |
| [`features/reconciliation/`](/apps/web/src/features/reconciliation)                                                                                              | The shipment ledger and reconciliation-exception actions                                                                                                                                          |
| [`features/control-graph/`](/apps/web/src/features/control-graph)                                                                                                | The control trace: the control graph read as one chain per case                                                                                                                                   |
| [`features/judge/`](/apps/web/src/features/judge)                                                                                                                | The public `/judge` upload, live result, and prepared-fallback panels                                                                                                                             |
| [`domain/contracts.ts`](/apps/web/src/domain/contracts.ts)                                                                                                       | Mirrors the backend's canonical enums (`Category`, `Status`, `ComparedField`, and more)                                                                                                           |
| [`routing/routes.tsx`](/apps/web/src/routing/routes.tsx)                                                                                                         | The client route table; `/judge` is the only _app-functionality_ route outside the operator guard — `/`, `/auth`, and the catch-all not-found route sit outside it too, but need no guest session |
| [`lib/api.ts`](/apps/web/src/lib/api.ts), [`lib/demo-reset.ts`](/apps/web/src/lib/demo-reset.ts), [`lib/reset-context.tsx`](/apps/web/src/lib/reset-context.tsx) | The guest-session HTTP client and Reset All                                                                                                                                                       |

## Data model

PostgreSQL is the system of record; all 21 tables are defined in
[`apps/api/app/models.py`](/apps/api/app/models.py) and written only
through [`apps/api/app/persistence.py`](/apps/api/app/persistence.py).

| Group                  | Tables                                                                                            | Append-only?                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and workspace | `guest_sessions`, `workspaces`                                                                    | No — a reset increments a generation counter and inserts a new workspace row rather than editing the old one                                |
| Source and cache       | `source_objects`, `email_receipts`, `email_attachments`, `ingestion_requests`, `extraction_cache` | No — content-addressed, idempotent upsert keyed by hash                                                                                     |
| Case and comparison    | `cases`, `field_verdicts`, `classification_attempts`, `document_role_decisions`                   | `classification_attempts` and `document_role_decisions` yes; `cases` and `field_verdicts` update in place as a case progresses              |
| Shipment ledger        | `expected_shipments`, `reconciliation_runs`, `reconciliation_results`                             | Yes, all three — a source update or a rerun is a new row, never an edit                                                                     |
| Review and audit       | `review_assignments`, `review_actions`, `audit_events`                                            | Yes, all three — no update or delete path                                                                                                   |
| Submission artifact    | `submission_runs`, `submission_run_records`, `submission_evaluations`                             | `submission_run_records` and `submission_evaluations` yes; the run (`submission_runs`) advances through states until one artifact publishes |
| Judge runs             | `judge_runs`                                                                                      | No — a retry updates the same row in place; its latest attempt is the current result                                                        |

That is 2 + 5 + 4 + 3 + 3 + 3 + 1 = 21 tables, matching
`REQUIRED_TABLES` in
[`apps/api/tests/test_migrations.py`](/apps/api/tests/test_migrations.py)
(lines 16-38).

The append-only tables reject a raw SQL `UPDATE` or `DELETE` at the
database level, via the same Postgres trigger function
(`reject_append_only_mutation`) in every case, not only in application
code. Proven directly by
[`test_append_only_rows_reject_raw_update_and_delete`](/apps/api/tests/test_migrations.py)
for `expected_shipments`, `reconciliation_runs`,
`reconciliation_results`, `review_assignments`, `review_actions`,
`audit_events`, and `submission_run_records`, and by
[`test_classification_attempts_are_append_only_and_case_checks_reject_fabrication`](/apps/api/tests/test_migrations.py)
for `classification_attempts`. `document_role_decisions` carries the
identical trigger, installed by
[`migrations/versions/20260921_0005_document_roles.py`](/apps/api/migrations/versions/20260921_0005_document_roles.py).

## Guest sessions, the seed baseline, and Reset All

A visitor is never asked to sign up. The web client mints an anonymous
guest session on first API call (`POST /api/session`;
[`GuestSessions.create`](/apps/api/app/guest.py)): a random token is
returned once, only its SHA-256 (`session_key`) is stored, and it maps to
generation 1 of a new [`Workspace`](/apps/api/app/models.py) row. Every
later request carries that token in the `X-LadingLens-Session` header
([`apps/web/src/lib/api.ts`](/apps/web/src/lib/api.ts)); the server
resolves it back to the caller's current workspace and generation.

What a guest sees by default is the **seed baseline**: the real pipeline
([`apps/api/app/seed_catalog.py`](/apps/api/app/seed_catalog.py)) run
once per process over the checked-in synthetic bundle, with a versioned
decisions file
([`apps/api/app/seed/decisions-v1.json`](/apps/api/app/seed/decisions-v1.json))
standing in for what a provider would have answered. That file is
explicitly **prepared, not recorded** — its own `decision_source` field
is `"prepared"`, and its notes say plainly that no provider was called
and no organiser answer key was read; categories come from the team's
offline classification, document roles from a transparent header rule,
and the six scanned PDFs' fields from human transcriptions. It is never
presented as live model output. The seed baseline is shared and
read-only; a guest's first review or reconciliation-exception action
copies that one seed record into their own workspace first
(copy-on-write, deterministic UUIDv5 IDs —
[`SeedMaterializer`](/apps/api/app/materialize.py)), so the shared seed
is never mutated and every guest's changes are theirs alone. This is
distinct from a judge's own live upload through `/judge` — see
[The public /judge page](#the-public-judge-page).

**Reset All** (`/settings`,
[`apps/web/src/pages/SettingsPage.tsx`](/apps/web/src/pages/SettingsPage.tsx))
discards a guest's own changes and returns them to the seed baseline. It
calls `POST /api/reset`, which starts a new workspace generation for
that guest through
[`PersistenceService.reset_guest_namespace`](/apps/api/app/persistence.py):
the old generation's rows simply stop being read, and any in-flight
write against it fails closed — including a `/judge` check in flight,
which surfaces as `409 session_reset` rather than a stale result. The
web client also clears its own local demo state
([`apps/web/src/lib/demo-reset.ts`](/apps/web/src/lib/demo-reset.ts))
and never touches another guest's workspace
([`apps/web/src/lib/reset-context.tsx`](/apps/web/src/lib/reset-context.tsx)).

See
[docs/superpowers/plans/2026-09-21-issue-30-product-api.md](/docs/superpowers/plans/2026-09-21-issue-30-product-api.md)
for the full contract.

## The public /judge page

`/judge` is the one route in the web app that needs no guest session in
advance:
[`apps/web/src/routing/routes.tsx`](/apps/web/src/routing/routes.tsx)
renders it outside the operator route guard, and the page mints a
session for itself on mount. A visitor uploads exactly one SI and one
draft BL; the upload panel enforces the synthetic-only confirmation and
the size/format policy fetched from `GET /api/judge/policy` before
anything reaches the server
([`components/UploadPanel.tsx`](/apps/web/src/features/judge/components/UploadPanel.tsx)).

`POST /api/judge/runs`
([`apps/api/app/api/judge_routes.py`](/apps/api/app/api/judge_routes.py),
registered in [`apps/api/app/main.py`](/apps/api/app/main.py)) hands the
upload to [`JudgeService.upload`](/apps/api/app/judge.py): it receives
the pair into the guest's own workspace as a one-email inbox whose
`BL_COMPARISON` category the uploader declared — audited as declared,
never as a model decision — and runs it through the same
[`ComparisonPipeline.run_case`](/apps/api/app/pipeline.py) as every
other case, never the prepared seed baseline. On success the page shows
all seven field verdicts with their evidence. On a provider failure the
run reports `state: "FAILED"` with a `{code, retryable, message}`
failure and no outcome — a plain message per failure code, such as "The
AI provider is at capacity" for a rate limit or "did not answer in time"
for a timeout — and `POST /api/judge/runs/{run_id}/retry` reruns the
same case. A reset that lands mid-check surfaces as `409 session_reset`
rather than a fabricated result (see [Guest
sessions](#guest-sessions-the-seed-baseline-and-reset-all)).
`GET /api/judge/fallback` always returns the seed's one labelled
`PREPARED FALLBACK` example (`source: "prepared"`) — never the visitor's
own upload — and the page discloses a failure first, keeps the uploaded
file names visible, and offers a retry before it ever shows that
separate fallback panel
([`components/FailurePanel.tsx`](/apps/web/src/features/judge/components/FailurePanel.tsx),
[`components/PreparedFallbackPanel.tsx`](/apps/web/src/features/judge/components/PreparedFallbackPanel.tsx)).

Proven end to end by
[`apps/api/tests/test_api_judge.py`](/apps/api/tests/test_api_judge.py):
`test_a_fresh_txt_pair_is_compared_live_with_anchored_evidence`,
`test_a_provider_timeout_fails_the_run_and_a_retry_completes_it`,
`test_the_prepared_fallback_is_labelled_and_never_the_upload`, and
`test_a_reset_while_the_check_runs_is_reported_as_session_reset`; and,
on the frontend, by
[`JudgeView.test.tsx`](/apps/web/src/features/judge/JudgeView.test.tsx)'s
`discloses a restored failure before the labelled prepared fallback,
keeping the uploaded file names visible`.

## See also

- [docs/references/api.md](/docs/references/api.md) — the full HTTP
  contract, written alongside the product API (issue #30).
- [docs/references/ai.md](/docs/references/ai.md) — AI provider prompts,
  retries, and audit fields.
- [docs/references/cloud.md](/docs/references/cloud.md) — the Cloud Run
  deployment, storage, and data-policy controls; the preliminary
  deployment is synthetic-data-only.
- [docs/TRD.md](/docs/TRD.md) — the full technical contract this page
  summarizes.
