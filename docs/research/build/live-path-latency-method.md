# Live-path latency benchmark methodology

Research for issue #32: how to replace the historical
`apps/api/scripts/benchmark_latency.py` (OpenRouter Flash-Lite plus
`jev-latest`) with a benchmark of the locked live path — the official
`google-genai` client calling `gemini-3.5-flash`, and `typesafe-sdk` calling
pinned `jev-1.13.0` — so the p95-below-10-seconds gate in `docs/TRD.md` can
be evaluated honestly.

Contents:

1.  [Historical script: why it cannot supply Flash evidence](#historical-script-why-it-cannot-supply-flash-evidence)
1.  [Timing network calls: perf_counter, monotonic, and time](#timing-network-calls-perf_counter-monotonic-and-time)
1.  [Percentiles for 20-30 trials](#percentiles-for-20-30-trials)
1.  [Warm-up trials: cold start versus steady state](#warm-up-trials-cold-start-versus-steady-state)
1.  [Gemini API: timeouts, response metadata, and rate limits](#gemini-api-timeouts-response-metadata-and-rate-limits)
1.  [TypeSafe Jev: pinned model, endpoint, and request ID](#typesafe-jev-pinned-model-endpoint-and-request-id)
1.  [Reproducibility record](#reproducibility-record)
1.  [Implications for LadingLens](#implications-for-ladinglens)
1.  [Measured result](#measured-result)

## Historical script: why it cannot supply Flash evidence

`apps/api/scripts/benchmark_latency.py` times OpenRouter's
`google/gemini-3.5-flash-lite` over raw `requests.post` (lines 27, 61), not
the `google-genai` SDK, and Jev's `model` hard-coded to `"jev-latest"`
(line 100), not pinned `jev-1.13.0`. `docs/TRD.md` is explicit: "The
existing Flash Lite study ... does not establish Gemini 3.5 Flash latency,
quota, or an SLO" (`docs/TRD.md:707-710`). `docs/research/ideation/latency.md`
reports p50 3.02 s / p95 3.28 s for that Flash-Lite path — real numbers,
wrong model and client. **They must not be cited as Gemini 3.5 Flash
evidence.** The live path is already locked: `apps/api/app/gemini.py`
(`google-genai`, model from `Settings.gemini_model`, pinned
`"gemini-3.5-flash"`, `apps/api/app/config.py:15`) and `apps/api/app/jev.py`
(`JEV_MODEL = "jev-1.13.0"`, line 15).

## Timing network calls: perf_counter, monotonic, and time

`time.time()` is wall-clock and **not** monotonic — "it can return a lower
value than a previous call if the system clock has been set back" — so it
must not measure a duration. `time.monotonic()` "cannot go backwards" but
carries no resolution guarantee. `time.perf_counter()` is monotonic and is
"the clock with the highest available resolution to measure a short
duration," the documented choice for one network call [python-time]. The
historical script already does this correctly
(`apps/api/scripts/benchmark_latency.py:25`); keep `t0 =
time.perf_counter(); ...; elapsed_s = time.perf_counter() - t0`. Record a
separate `datetime.now(timezone.utc).isoformat()` per trial as metadata for
correlating with provider logs — never use it for the elapsed measurement.

[python-time]: https://docs.python.org/3/library/time.html

## Percentiles for 20-30 trials

Hyndman and Fan (1996) define nine sample-quantile estimators, numbered
identically in R's and NumPy's docs [r-quantile] [hyndman-fan]. NumPy's
`percentile(method=...)` defaults to `'linear'` = **Type 7**
[numpy-percentile]. Python's `statistics.quantiles(method=...)` defaults to
`"exclusive"` (`i / (m + 1)`, algebraically Type 6); `"inclusive"` uses
`(i - 1) / (m - 1)`, algebraically Type 7 [python-statistics]. **Neither
stdlib default is nearest-rank** — both interpolate, so p95 can be a value
no trial produced.

For a small, judge-auditable count (20-30), recommend **nearest-rank**
(Type 1): always an observed trial, and reproducible from one formula over
`sorted_trials`, the trials sorted ascending:

```python
rank = max(1, min(n, math.ceil(0.95 * n)))  # 1-indexed
p95 = sorted_trials[rank - 1]
```

At `n = 20`: `rank = ceil(19.0) = 19`, so p95 is the **19th of 20** ordered
values, not the maximum. This exposes a bug in the historical `stats()`
(`apps/api/scripts/benchmark_latency.py:133-144`): `idx95 = int(len(data_s)
* 0.95)` truncates instead of ceiling and never subtracts 1, so at `n = 20`
it reads `data_s[19]` — the maximum, one rank too high. State the formula
in the artifact so the number is reproducible without re-reading code.

[r-quantile]: https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html
[hyndman-fan]: https://doi.org/10.1080/00031305.1996.10473566
[numpy-percentile]: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html
[python-statistics]: https://docs.python.org/3/library/statistics.html#statistics.quantiles

## Warm-up trials: cold start versus steady state

A fresh HTTP client's first request pays DNS, TCP, and TLS handshake cost
that later requests skip, because both SDKs pool and reuse connections:
`httpx` documents `max_keepalive_connections`/`keepalive_expiry` as the
knobs controlling reuse [httpx-limits], and `typesafe_sdk`'s transport,
`httpx2`, is "a drop-in fork of httpx" (`typesafe_sdk/_core/errors.py`). The
Gemini client here is built once and cached (`@lru_cache` on `_clients()`,
`apps/api/app/gemini.py:9-13`) and the TypeSafe client is likewise
long-lived (`apps/api/app/jev.py:472-482`), so only the first call per run
is a true cold start.

Discard a small, fixed warm-up count instead of guessing per run: 3 calls
per stage, excluded from statistics but still written to the raw JSON as
`"warm": false` — never delete data. Report the cold trial(s) separately
beside the warm-set mean/p50/p95, so the cold-start tax is visible but does
not skew the SLO.

[httpx-limits]: https://www.python-httpx.org/advanced/resource-limits/

## Gemini API: timeouts, response metadata, and rate limits

**Timeout and retries.** `types.HttpOptions.timeout` is "Timeout for the
request in milliseconds" (`google-genai` 2.24.0, `types.py:2669-2671`,
pinned in `apps/api/uv.lock:547`); set it per-client
(`genai.Client(http_options=types.HttpOptions(timeout=ms))`) or per-call via
`GenerateContentConfig(http_options=...)` [genai-types-source]. By default
`HttpRetryOptions` retries HTTP 408/429/5xx up to 5 attempts with
exponential backoff (`types.py:2596-2621`), matching the troubleshooting
guide's "the Python SDK automatically retries transient errors up to four
times" [genai-troubleshooting] — so unless the benchmark sets
`HttpRetryOptions(attempts=1)`, one "trial" can silently span several
attempts.

**Response metadata.** `model_version` on the response is "Output only. The
model version used to generate the response" (`types.py:8600`) — record it
every trial, since `"gemini-3.5-flash"` is an alias and the served build
can change. `response_id` (`:8608`) and `usage_metadata` (token counts,
`:8445`) are also present; record for cost/quota context, not latency.

**Rate limits and 429.** `gemini-3.5-flash` is a current Stable model
("Our legacy Flash model, providing baseline speed ... for routine,
high-throughput workloads") [genai-models]. The rate-limits page dimensions
limits as RPM/TPM/RPD per tier ("vary depending on the specific model") and
points to the live console instead of fixed numbers: "View your active
rate limits in AI Studio" [genai-rate-limits]. **Unverified**: no live
account's exact numeric RPM/TPM/RPD for `gemini-3.5-flash` was available
here; the benchmark must not hardcode a guessed quota. On exhaustion the
API returns HTTP 429, status `RESOURCE_EXHAUSTED` — "Some resource has been
exhausted, perhaps a per-user quota ..." (`google/rpc/code.proto`, code 8),
mapped to HTTP 429 Too Many Requests [rpc-code-proto] [aip-193]. The SDK
raises `errors.ClientError` with `.code == 429`;
`apps/api/app/gemini.py:26-32` already catches this to fail over keys.

[genai-types-source]: https://github.com/googleapis/python-genai/blob/v2.24.0/google/genai/types.py
[genai-troubleshooting]: https://ai.google.dev/gemini-api/docs/troubleshooting
[genai-models]: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash
[genai-rate-limits]: https://ai.google.dev/gemini-api/docs/rate-limits
[rpc-code-proto]: https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
[aip-193]: https://google.aip.dev/193

## TypeSafe Jev: pinned model, endpoint, and request ID

**Pinned model.** `JEV_MODEL = "jev-1.13.0"` (`apps/api/app/jev.py:15`); the
TRD decision register locks "Jev `jev-1.13.0` makes typed semantic
decisions" (`docs/TRD.md:795`). `docs.typesafe.ai/models.md` describes
`jev-1.13.0` as TypeSafe's "flagship model and the first System One model,"
rate-limited to "250,000 tokens per second / 1,200 requests per minute,"
with a 64k-token context [typesafe-models]. `jev-latest`/`jev-preview`
alias to it today but are documented to move on a new release, which is
exactly why the app rejects any response whose `model` is not the literal
pin (`apps/api/app/jev.py:439`).

**Endpoint.** `typesafe-sdk==0.7.0` (`apps/api/pyproject.toml:15`) defaults
`base_url` to `"https://api.typesafe.ai"` (`typesafe_sdk/constants.py:15`,
overridable via `TYPESAFE_BASE_URL`) and the System One path to
`"/v1/systemone"` (`typesafe_sdk/_core/constants.py:5`), giving
`https://api.typesafe.ai/v1/systemone` — the same URL the historical script
already hard-codes (`apps/api/scripts/benchmark_latency.py:121`).

**Request ID.** Every response carries an `x-typesafe-request-id` header
(`typesafe_sdk/_core/constants.py:18`), exposed as a cached `.request_id`
property (`typesafe_sdk/_core/schemas/base.py:80-82`) and already read by
`apps/api/app/jev.py:436`; log it per trial for support correlation. SDK
default per-call timeout is 10.0 s (`typesafe_sdk/constants.py:21`); the
app overrides to 20.0 s with zero SDK-level retries
(`REQUEST_TIMEOUT_SECONDS = 20.0`, `RetryPolicy(max_retries=0)`,
`apps/api/app/jev.py:16,538-540`) — match the app's real config, not the
SDK default.

[typesafe-models]: https://docs.typesafe.ai/models.md

## Reproducibility record

Write one versioned JSON file per run to
`apps/api/scripts/benchmark-results/` (confirmed absent in this checkout).
Once per run, record: UTC timestamp; SHA-256 of each input PDF; SDK
versions (`google-genai` 2.24.0, `typesafe-sdk` 0.7.0); the resolved
endpoint host per provider (log what was actually used, since
`HttpOptions.base_url`/`Config.base_url` can override the default); model
ids; full config (timeouts, retry attempts, concurrency = 1); trial and
warm-up counts; and the benchmark host/region. Per trial — including
failed or discarded ones — record: `trial_id`, `stage`, `warm` (bool), UTC
start timestamp, `elapsed_s`, `status`/`http_status`,
`model_version_returned`, `response_id`/`request_id`, and usage tokens:

```json
{"trial_id": 1, "stage": "gemini_extract_dual_doc", "warm": false,
 "started_at_utc": "2026-09-21T18:00:03.114Z", "elapsed_s": 2.41,
 "status": "ok", "http_status": 200,
 "model_version_returned": "gemini-3.5-flash-002",
 "response_id": "abcd1234", "usage": {"total_token_count": 2031}}
```

The SHA-256 values were computed in this checkout with `shasum -a 256`
against `data/sdoc-hackathon-bundle/attachments/email_512_SI.pdf`
(`17490c98...1ea20d`) and `email_512_BL.pdf` (`5ecd746a...c9d944`).

## Implications for LadingLens

The rewritten `apps/api/scripts/benchmark_latency.py` should:

1.  **Call the real path.** Reuse `apps/api/app/gemini.py:generate()` and
    `apps/api/app/jev.py:JevCategoryClient.classify()`, or their exact model
    ids, timeouts, and retry policy, so the benchmark cannot drift from
    production.
2.  **Trials.** 3 warm-up calls per stage (`"warm": false`, discarded from
    stats), then 20 measured calls per stage (`"warm": true`); 23 sequential
    calls per stage, `concurrency = 1`. Log every trial, including warm-up
    and failures, in the [reproducibility record](#reproducibility-record)
    schema above.
3.  **Percentile method and retry discipline.** Nearest-rank: `rank =
    max(1, min(n, ceil(0.95 * n)))`; p95 is the `rank`-th smallest warm
    trial — state this formula in the script and its printed report. Set
    `HttpRetryOptions(attempts=1)` for Gemini and keep
    `RetryPolicy(max_retries=0)` for Jev, so each trial is exactly one HTTP
    attempt feeding that formula, and a 429 is a recorded failure rather
    than a hidden retry loop.
4.  **Stages.** Measure Gemini extraction on the scanned pair
    (`email_512_SI.pdf`, `email_512_BL.pdf`), the Jev decision call, and
    end-to-end separately, mirroring `docs/research/ideation/latency.md`'s
    structure on the locked path.
5.  **Dependencies.** Declare the PDF-rasterization library the new script
    uses (e.g. `pymupdf`) in `apps/api/pyproject.toml`: none of `pymupdf`,
    `openpyxl`, or `python-docx` appear there or in `apps/api/uv.lock`
    today, so the historical `import pymupdf` is undeclared
    (`docs/TRD.md:713-716`).
6.  **Gate evaluation.** Only after this artifact exists with real
    `gemini-3.5-flash`/`jev-1.13.0` trials may the p95-below-10-seconds
    claim in FR-15 (`docs/TRD.md:784`) be evaluated — from that recorded
    file, never the historical Flash-Lite numbers.

## Measured result

The first live run is retained at
[`apps/api/scripts/benchmark-results/20260921T085704Z-4eb1401.json`][run-1]
(GitHub Actions run 35579538701 on a GitHub-hosted `ubuntu-latest` runner,
commit `4eb1401`). It called `gemini-3.5-flash` through `google-genai`
2.24.0 and `jev-1.13.0` through `typesafe-sdk` 0.7.0 on `email_512_SI.pdf`
and `email_512_BL.pdf`: 3 warm-up trials, then 20 measured trials, one at a
time, with a 40-second Gemini timeout, SDK retries off, and the nearest-rank
p95 above. Each stage's figures use only the measured trials in which that
stage succeeded.

| Stage                  | Succeeded | p50     | p95     | Max     |
| ---------------------- | --------- | ------- | ------- | ------- |
| Gemini scan, SI        | 6 of 20   | 19.7 s  | 27.5 s  | 27.5 s  |
| Gemini scan, draft BL  | 14 of 20  | 16.7 s  | 38.4 s  | 38.4 s  |
| Jev document role      | 15 of 20  | 0.18 s  | 0.26 s  | 0.26 s  |
| End to end             | 5 of 20   | 19.9 s  | 25.6 s  | 25.6 s  |

The Jev equivalence call was never needed: after normalisation the two
scans carry the same seven values, so nothing was sent to Jev.

**Verdict: the p95-below-10-seconds target is not met.** Only 5 of the 20
measured trials completed, and their end-to-end p95 is 25.6 seconds. The
other 15 failed closed: 9 Gemini reads hit the 40-second timeout (most
after a 429 on the first key), 5 got a 503 from Gemini, and the last trial
found the per-day quota exhausted on both keys. Every successful Gemini
read took 12.9 to 38.4 seconds and used 600 to 1,360 thinking tokens beyond
its 714 prompt tokens and its output, so the model's default thinking, not
the pipeline, dominates the latency. LadingLens therefore publishes no
latency figure below 10 seconds.

The next step is to set a minimal thinking level for extraction and
re-measure with the workflow's manual dispatch once the free-tier daily
quota allows, or with billing enabled. The run also shows that free-tier
limits alone can take the live scan path offline, which the fail-closed
judge flow already discloses.

[run-1]: /apps/api/scripts/benchmark-results/20260921T085704Z-4eb1401.json
