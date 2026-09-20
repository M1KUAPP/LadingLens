# Live-Path Latency Budget and Feasibility

This document presents empirical latency measurements for the live document
processing pipeline using `gemini-3.5-flash-lite` and the Jev decision layer.
It evaluates the feasibility of an interactive live demo where judges submit
unseen documents on stage.

Contents:

1.  [Executive Summary](#executive-summary)
1.  [Test Methodology and Environment](#test-methodology-and-environment)
1.  [Extraction Latency Benchmarks](#extraction-latency-benchmarks)
    1.  [Single-Document Extraction](#single-document-extraction)
    2.  [Dual-Document Extraction in a Single Request](#dual-document-extraction-in-a-single-request)
    3.  [Comparison of Extraction Strategies](#comparison-of-extraction-strategies)
1.  [Decision Layer Latency Benchmarks](#decision-layer-latency-benchmarks)
1.  [End-to-End Latency Profile](#end-to-end-latency-profile)
1.  [Rate Limits and Failure Behavior](#rate-limits-and-failure-behavior)
1.  [Live Demo Feasibility Verdict](#live-demo-feasibility-verdict)
1.  [Caching and Precomputation Recommendations](#caching-and-precomputation-recommendations)

## Executive Summary

The previous hackathon team failed their demo because a background queue stalled
for 25 minutes. To guarantee this does not happen to us, we conducted empirical
benchmarking on the worst-case inputs: full-page scanned raster PDFs
(`email_512_BL.pdf` and `email_512_SI.pdf`) processed by `gemini-3.5-flash-lite`
for vision-based extraction, followed by Jev (`jev-1.13.0`) for discrepancy
detection.

The verdict is a confident **YES: a live unseen-document demo is viable**.
End-to-end p50 latency is **3.02 seconds** and p95 latency is **3.28 seconds**
when batching both documents into a single extraction call. This provides
a near-instantaneous user experience well within typical human attention spans
on stage.

## Test Methodology and Environment

Testing was executed with real network calls over 10 consecutive trials for
each pipeline stage:

- **Workload**: Pair of scanned image-only PDFs (`email_512_BL.pdf` and
  `email_512_SI.pdf`), rendered to PNG (1240x1754 px, 24-bit RGB) and sent as
  base64 image payloads.
- **Vision Extraction**: `google/gemini-3.5-flash-lite` extracting 9 key fields
  (B/L number, shipper, consignee, notify party, POL, POD, gross weight,
  container count, vessel).
- **Decision Layer**: `jev-latest` (`jev-1.13.0`) evaluating 4 concurrent
  `noul` questions on field equivalence.
- **Metrics**: Wall-clock time recorded via high-resolution monotonic timer
  (`time.perf_counter`), computing minimum, maximum, mean, p50, and p95.

## Extraction Latency Benchmarks

### Single-Document Extraction

Wall-clock time to upload and extract 9 structured fields from a single
scanned raster PDF:

- **Mean**: 1.61 s
- **Minimum**: 1.35 s
- **Maximum**: 1.81 s
- **p50 (Median)**: 1.64 s
- **p95**: 1.81 s

### Dual-Document Extraction in a Single Request

Passing both the Bill of Lading and the Shipping Instruction images in one
multiparts prompt to extract both document schemas simultaneously:

- **Mean**: 1.90 s
- **Minimum**: 1.65 s
- **Maximum**: 2.17 s
- **p50 (Median)**: 1.87 s
- **p95**: 2.17 s

### Comparison of Extraction Strategies

Submitting both documents in a single prompt takes an average of 1.90 s,
compared to 3.22 s for sequential calls (1.61 s x 2). Furthermore:

1.  **Latency savings**: 1.32 s lower latency compared to sequential
    execution.
2.  **API quota efficiency**: Uses 1 API request instead of 2, doubling the
    effective throughput of the daily quota.
3.  **Context awareness**: Allows the extraction model to cross-reference
    document structure when resolving ambiguous fields.

## Decision Layer Latency Benchmarks

Evaluating 4 parallel `noul` questions via the TypeSafe Jev API
(`api.typesafe.ai/v1/systemone`):

- **Mean**: 1.07 s
- **Minimum**: 0.92 s
- **Maximum**: 1.25 s
- **p50 (Median)**: 1.09 s
- **p95**: 1.25 s

Jev consistently delivers sub-1.3s response times across all trials, with an
average latency of ~1.07 s.

## End-to-End Latency Profile

Combining dual-document extraction with Jev decision verification yields the
following end-to-end latency distribution across 10 trials:

| Metric | Combined Extraction + Jev | Parallel Extractions + Jev |
| ------ | ------------------------- | -------------------------- |
| Min    | 2.67 s                    | 2.70 s                     |
| Mean   | 2.98 s                    | 2.79 s                     |
| p50    | 3.02 s                    | 2.75 s                     |
| p95    | 3.28 s                    | 2.91 s                     |
| Max    | 3.28 s                    | 2.91 s                     |

Even in worst-case conditions (scanned raster images), the entire end-to-end
pipeline completes in under 3.5 seconds.

## Rate Limits and Failure Behavior

The production configuration uses Google Gemini free-tier keys with fallback
redundancy:

1.  **Rate Limits**:
    - `gemini-3.5-flash-lite`: 15 requests per minute (RPM), 500 requests per
      day (RPD).
    - `gemini-2.5-flash`: 15 RPM, but restricted to 20 RPD on free tier.
2.  **Key Failover Architecture**:
    - As implemented in `apps/api/app/gemini.py`, requests are routed to
      `GEMINI_API_KEY`.
    - If Google returns an HTTP 429 (Rate Limit / Quota Exceeded), the client
      catches `errors.ClientError` with code 429 and retries the request using
      `GEMINI_API_KEY_2`.
    - Because quota limits are enforced per GCP project rather than per key,
      `GEMINI_API_KEY_2` belongs to a separate GCP project (`muba-m1ku-sec`).
3.  **Timeout Handling**:
    - Cloud Run request timeout is configured to 300 s, preventing gateway
      drops.
    - Client timeout on HTTP requests should be capped at 10 s to trigger
      fallback rapidly if an upstream stall occurs.

## Live Demo Feasibility Verdict

Is a live unseen-document demo viable? **YES.**

- **Target budget**: Under 10 seconds for real-time audience engagement.
- **Measured budget**: ~3.0 seconds (p50) / ~3.3 seconds (p95).
- **Risk factor**: Exceeding 15 RPM during high-frequency testing or rehearsal.

## Caching and Precomputation Recommendations

To protect the live demo from network hiccups or quota exhaustion:

1.  **Persistent Storage in Postgres**:
    Store all extracted schemas, bounding boxes, and Jev verdicts keyed by
    document content hash (`SHA-256`). If the same document is re-uploaded
    during rehearsal or presentation, response time drops from 3 s to <50 ms.
2.  **Prepared Fallback Dataset**:
    Pre-populate the database with the hackathon bundle's canonical cases (e.g.,
    `email_001` through `email_050`) so they never touch external APIs on stage.
3.  **Live Ingestion Route**:
    Keep the live extraction path open exclusively for the judge's custom
    document challenge.
4.  **Single-Call Policy**:
    Always use the combined dual-document extraction prompt rather than two
    separate calls to conserve the 500 RPD quota.
