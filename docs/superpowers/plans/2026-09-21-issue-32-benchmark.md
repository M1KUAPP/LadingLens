# Issue 32 Live-Path Benchmark and Test Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the historical Flash-Lite/OpenRouter benchmark with a
benchmark of the locked live path (Gemini 3.5 Flash via `google-genai`,
pinned `jev-1.13.0`) that writes raw, versioned per-trial JSON, and prove
every failure mode and dataset edge case with integration tests, including a
mocked-provider run over the full 520-email bundle that publishes a valid
submission artifact.

**Architecture:** The benchmark drives the product's own components
(`DocumentAnalyzer` with `GeminiExtractor` and `JevDocumentRoleClient`, then
`admit_pair`/`compare_fields`/`JevEquivalenceClient`) on the scanned pair,
timing each provider stage through thin timing wrappers, with no cache and
no database. Integration tests run the same pipeline against PostgreSQL with
deterministic fake providers.

**Tech Stack:** Python 3.12, google-genai, typesafe-sdk, PyMuPDF, pytest,
PostgreSQL.

**Spec:** GitHub issue #32; `docs/TRD.md` "Deployment, security, and
observability", "Verification matrix", decision register "Latency claim";
research `docs/research/build/live-path-latency-method.md`.

## Global Constraints

- No OpenRouter, no Flash-Lite, no `jev-latest`; models come from
  `Settings.gemini_model` and `app.jev.JEV_MODEL`.
- Inputs: `data/sdoc-hackathon-bundle/attachments/email_512_SI.pdf` and
  `email_512_BL.pdf`, recorded with SHA-256.
- Method: 3 warm-up trials (recorded, excluded from statistics) then 20
  measured trials, sequential (concurrency 1), `time.perf_counter()`,
  nearest-rank p95 `rank = max(1, min(n, ceil(0.95 * n)))`, target
  `p95 < 10_000 ms` on the end-to-end live check. Gemini SDK retries stay
  off (no `HttpOptions.retry_options`); Jev `RetryPolicy(max_retries=0)`.
- Output: one JSON file per run in `apps/api/scripts/benchmark-results/`
  named `<UTC yyyymmddThhmmssZ>-<git short sha>.json` with run metadata,
  every trial (including warm-up and failures), and the summary.
- A claim is published only from a retained artifact; the historical Flash
  Lite numbers are never cited as Flash evidence.

### Task 1: Read scanned attachments concurrently

Modify `DocumentAnalyzer.analyze` so scanned attachments are read with
`asyncio.gather` (results kept in input order; each failure stays attached
to its own attachment). Test: two scans with a fake extractor that records
overlap (both calls in flight before either returns). Commit —
`perf(api): read scanned attachments concurrently`.

### Task 2: Rewrite the benchmark script

Rewrite `apps/api/scripts/benchmark_latency.py` with pure, tested helpers
(`nearest_rank(values, q)`, `summarize(trials)`, `artifact_path(now, sha)`,
`build_artifact(...)`) and a `run_benchmark(*, analyzer_factory,
equivalence, trials, warmup, clock)` core that tests drive with fakes; the
CLI (`uv run python scripts/benchmark_latency.py --trials 20 --warmup 3`)
refuses to run without `GEMINI_API_KEY` and `TYPESAFE_API_KEY` (exit 2, no
artifact). Test file `apps/api/tests/test_benchmark_latency.py`. Commit —
`feat(api): benchmark the locked Gemini and Jev live path`.

### Task 3: Dataset edge-case integration matrix

`apps/api/tests/test_integration_matrix.py` (PostgreSQL) runs
`ComparisonPipeline.run_case` on receipted bundle emails with deterministic
fake providers: `email_507`/`email_509` → `missing_attachment`;
`email_511`/`email_515` → `unreadable`; `email_501`/`email_502`/`email_503`
→ `wrong_doc_type`; `email_516` → `missing_value`; `email_512` scanned pair
→ seven verdicts with `scanned_pdf` anchors; `email_291` DOCX and
`email_005` XLSX provenance; `email_013` Chinese-label code-point offsets.
Commit — `test(api): cover dataset edge cases end to end`.

### Task 4: Provider failure matrix

Same file or `tests/test_failure_matrix.py`: 429 on key 1 then success on
key 2 (audit `GEMINI_SECOND_KEY_USED`), 429 on both keys → fail closed
(`quota_exhausted`/`rate_limited`, case stays `BL_READY`, audit
`EXTRACTION_FAILED`), Gemini timeout, invalid schema shape, Jev timeout on
roles and on equivalence, a missing category blocking a submission run
(`MISSING_CATEGORY`/`PROVIDER_FAILURE` blocker), and an idempotency
conflict (same key, different bytes → `IdempotencyConflict` plus audit).
Commit — `test(api): prove the provider failure matrix fails closed`.

### Task 5: Mocked 520-email run publishes a valid artifact

Ingest all 520 emails with `InboxIngestionService` and a fake classifier
backed by the seed decisions, run `ComparisonPipeline.run_pending` with fake
role/equivalence/Gemini providers backed by the seed decisions, then
`execute_submission_run`; assert `PUBLISHED`, 520 records, five keys each,
and `validate_submission_artifact` passes. Commit —
`test(api): publish a mocked-provider submission over the full bundle`.

### Task 6: Live measurement and retained artifact

With provider keys available, run the benchmark once, commit the JSON
artifact, and record the p95 verdict in
`docs/research/build/live-path-latency-method.md` ("Measured result"
section quoting the artifact path, trial count, method, p50/p95/max, and
pass/fail). Without keys, leave the claim unpublished and say so in the PR.
