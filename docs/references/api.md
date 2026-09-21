# Product API

Averis's FastAPI backend serves the `/api/*` routes behind the React app and
the public `/judge` upload page: anonymous guest sessions, a versioned
synthetic seed baseline, review actions, and live judge document checks.
This reference describes what the deployed routes actually do, grounded in
`apps/api/app/api/*.py` and `apps/api/app/main.py`.

Every seed record -- the inbox, reconciliation, and their evidence -- comes
from one deterministic replay of the checked-in synthetic bundle; each one
is labelled `prepared` or `recorded` and is never presented as live output.
A judge upload is the only live path: it runs the real extraction and
comparison pipeline against the configured providers inside the request and
is always labelled `source: "live"`.

Contents:

1.  [Conventions](#conventions)
1.  [Health And Readiness](#health-and-readiness)
1.  [Guest Sessions And Reset](#guest-sessions-and-reset)
1.  [Inbox And Case Review](#inbox-and-case-review)
1.  [Reconciliation And Exception Review](#reconciliation-and-exception-review)
1.  [Evidence And Artifacts](#evidence-and-artifacts)
1.  [Judge Uploads](#judge-uploads)

## Conventions

Implemented in [apps/api/app/api/errors.py](/apps/api/app/api/errors.py) and
[apps/api/app/observability.py](/apps/api/app/observability.py).

- Every `/api/*` response carries `Cache-Control: no-store`.
- Every response, API or SPA, carries a server-generated `X-Request-ID`; the
  server never logs a caller-supplied correlation value.
- Guest routes read the session token from the `X-LadingLens-Session`
  header, minted by `POST /api/session` (see
  [Guest Sessions And Reset](#guest-sessions-and-reset)). A missing or
  unknown token returns `401 session_required`. `POST /api/session`,
  `GET /api/health`, and `GET /api/health/ready` do not require it.
- Every `/api/*` error responds `{"error": {"code": str, "message": str,
  "details"?: [...]}}` with plain-language messages -- no stack traces, no
  secrets. An unmatched route is `404 not_found`; a matched route called
  with the wrong method is `405 method_not_allowed`; a body that fails
  schema validation is `422 invalid_request`.
- A workspace reset mid-request answers `409 session_reset` on every route
  that touches persistence.
- A truly unexpected server error (a bug, not a handled failure) skips the
  envelope above and returns `500 {"status": "error", "request_id": str}`
  instead, still carrying `X-Request-ID`.

## Health And Readiness

Implemented in [apps/api/app/main.py](/apps/api/app/main.py); seed state
from [apps/api/app/seed_catalog.py](/apps/api/app/seed_catalog.py). Neither
route requires a session.

`GET /api/health` returns `200 {"status": "ok", "version": <app_version>}`.

`GET /api/health/ready` returns `200` when the database is reachable, or
`503` otherwise:

```text
200 {"status": "ok",    "keys": {...}, "data_policy": "synthetic-only", "seed": ...}
503 {"status": "error", "reason": str, "keys": {...}, "data_policy": "synthetic-only", "seed": ...}
```

`keys` reports only boolean presence (`gemini`, `gemini_2`, `typesafe`),
never a credential. A `reason` names why the database is unreachable by
exception class only (for example `"database unreachable (OSError)"`),
never the exception text. `seed` is one of:

- `ready` -- the shared synthetic seed baseline has finished building.
- `building` -- it has not finished yet (including before it has started).
- `error` -- the last build attempt raised; reads that need the seed will
  fail, but session, reset, and the live `/api/judge/*` routes do not
  depend on it and keep working.

## Guest Sessions And Reset

Implemented in [apps/api/app/api/session.py](/apps/api/app/api/session.py);
session storage in [apps/api/app/guest.py](/apps/api/app/guest.py). A token
is `secrets.token_urlsafe(32)`; only its SHA-256 hash is stored.

```text
POST /api/session -> 201 {session_token, generation, seed_version}
GET  /api/session -> 200 {generation, seed_version}
POST /api/reset   -> 200 {generation, seed_version, reset_at}
```

`POST /api/session` mints a new guest and needs no session header.
`GET /api/session` and `POST /api/reset` need one. `POST /api/reset` starts
a new workspace generation: the old generation's rows stop being read, and
any write still in flight against it fails `409 session_reset`. Both writes
return `503 session_unavailable` / `reset_unavailable` if the database is
down; nothing is changed.

## Inbox And Case Review

Reads implemented in
[apps/api/app/api/inbox.py](/apps/api/app/api/inbox.py); the case action in
[apps/api/app/api/actions.py](/apps/api/app/api/actions.py); response
shapes in [apps/api/app/api/views.py](/apps/api/app/api/views.py). Every
route needs a session.

```text
GET  /api/summary                        -> 200 GateSummary
GET  /api/emails                         -> 200 {seed_version, source, received_count, emails}
GET  /api/emails/{email_id}              -> 200 EmailDetail | 404 email_not_found
POST /api/cases/{case_id}/review-actions -> 200 EmailDetail | 404 | 409 | 422
```

Each email's `attachments[].document_type` is `SI`, `DRAFT_BL`, or
`UNKNOWN`; `parse_state` is `PARSED`, `UNREADABLE`, or `REJECTED`. Each
`field_verdicts[].verdict` is `MATCH`, `MISMATCH`, or `REVIEW`. A guest's
own prior review action on a case, if any, overlays the seed disposition;
every other guest still sees the plain seed.

`POST .../review-actions` takes `{action: APPROVE|CORRECT|REJECT, actor_id,
rationale, corrected_fields}`. The guest's first action on a seed case
copies it into that guest's own workspace before recording (the seed and
every other guest are unaffected). Errors: `404 case_not_found`; `409
not_in_review` (the case is not held for review) or `already_settled` (a
race already decided it); `422 invalid_review_action` (a blank, too-long,
or NUL-containing `actor_id`/`rationale`, or `corrected_fields` that do not
fit `action`).

## Reconciliation And Exception Review

Reads implemented in
[apps/api/app/api/reconciliation_routes.py](/apps/api/app/api/reconciliation_routes.py);
the exception action in
[apps/api/app/api/actions.py](/apps/api/app/api/actions.py). Every route
needs a session.

```text
GET  /api/reconciliation                            -> 200 {shipments, results}
POST /api/reconciliation/{reconciliation_id}/actions -> 200 ReconciliationRow | 404 | 409 | 422
```

`POST .../actions` takes `{action: ASSIGN|ACKNOWLEDGE|ESCALATE|RESOLVE,
actor_id, rationale, assigned_owner_id}`; `ASSIGN` requires
`assigned_owner_id`. Like a case action, the first action on a seed
exception copies it into the guest's workspace first. Errors: `404
reconciliation_not_found`; `409 already_resolved`; `422
invalid_review_action` (the same name validation as case actions, plus a
missing owner on `ASSIGN`).

## Evidence And Artifacts

Implemented in
[apps/api/app/api/evidence.py](/apps/api/app/api/evidence.py). Every route
needs a session and serves bytes only through the API, never a bucket URL.
Every download carries `X-Content-Type-Options: nosniff` and a defensively
quoted `Content-Disposition`.

```text
GET /api/evidence/{attachment_id}         -> 200 bytes (inline) | 404 attachment_not_found
GET /api/artifacts/submission.json        -> 200 application/json (attachment)
GET /api/artifacts/expected-shipments.csv -> 200 text/csv (attachment)
```

`GET /api/evidence/{id}` resolves only through the seed catalog's in-memory
attachment map, so an unknown or path-like ID is just a missing key -- a
`404`, never a filesystem read. `submission.json` also carries
`X-LadingLens-Source: prepared|recorded`, naming the decision source behind
that generation of the artifact.

## Judge Uploads

Implemented in
[apps/api/app/api/judge_routes.py](/apps/api/app/api/judge_routes.py);
upload and retry orchestration in
[apps/api/app/judge.py](/apps/api/app/judge.py); the comparison pipeline in
[apps/api/app/pipeline.py](/apps/api/app/pipeline.py); provider clients in
[apps/api/app/jev.py](/apps/api/app/jev.py) and
[apps/api/app/gemini.py](/apps/api/app/gemini.py). Every route needs a
session.

```text
GET  /api/judge/policy                               -> 200 {accepted_formats, max_file_bytes, data_policy, confirmation_required}
POST /api/judge/runs                                  -> 201 JudgeRun | 422 | 409
GET  /api/judge/runs                                  -> 200 {runs}
GET  /api/judge/runs/{run_id}                         -> 200 JudgeRun | 404 run_not_found
POST /api/judge/runs/{run_id}/retry                   -> 200 JudgeRun | 404 | 409
GET  /api/judge/runs/{run_id}/documents/{document_id} -> 200 bytes (inline) | 404
GET  /api/judge/fallback                              -> 200 PreparedFallback
```

`POST /api/judge/runs` takes multipart `si_file`, `draft_bl_file`, and
`synthetic_confirmed`. Each file must be non-empty, at most `max_file_bytes`
(5 MiB), and detected by magic bytes -- never the file name -- as TXT, PDF,
DOCX, or XLSX. A missing or false `synthetic_confirmed` is rejected before
anything is written: `422 synthetic_only`. A rejected file is `422
upload_rejected` with a `details` list of `{slot, reason}`, `reason` one of
`missing`, `empty`, `too_large`, `unsupported_format`. A reset mid-upload is
`409 session_reset`.

A `JudgeRun`'s `state` is `SUCCEEDED` or `FAILED`; only a later successful
attempt on the same run ever moves it to `SUCCEEDED`. A `FAILED` run has
`outcome: null`, empty `field_verdicts`/`diagnostics`, and a `failure`
object `{code, retryable, message}`. `GET .../runs/{id}/documents/{id}`
answers `404 run_not_found` or `404 document_not_found`. `POST
.../retry` reruns the pipeline on the same uploaded pair; it answers `409
already_succeeded` if the run already succeeded or a concurrent retry won
the race.

Uploads run through the real pipeline: Gemini 3.5 Flash extraction (the
product's dual API key, the second used only after a 429) and Jev 1.13.0
role and equivalence checks. Jev's client is built once and shared by both
checks, only when `TYPESAFE_API_KEY` is set; without it, every check fails
closed with:

```json
{"code": "provider_unconfigured", "retryable": false,
 "message": "Live AI checks are not configured on this server."}
```

`GET /api/judge/fallback` is unaffected either way: it always returns the
seed's labelled `PREPARED FALLBACK` example, never the caller's own upload,
so a reviewer always has something to compare a live result against.
