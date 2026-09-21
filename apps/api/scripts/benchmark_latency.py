"""Benchmark the product's locked live path: Gemini 3.5 Flash via the
official `google-genai` client and pinned `jev-1.13.0` via `typesafe-sdk`.

This drives the app's own components -- `DocumentAnalyzer`, `GeminiExtractor`,
`JevDocumentRoleClient`, `JevEquivalenceClient`, and the pure comparison
helpers in `app.comparison` -- against the fixed SI/draft-BL scanned pair in
`data/sdoc-hackathon-bundle/attachments/`, with no cache and no database. See
docs/research/build/live-path-latency-method.md for the method this
implements (timing, warm-up, and the nearest-rank percentile formula).

Usage: uv run python scripts/benchmark_latency.py --trials 20 --warmup 3
Requires GEMINI_API_KEY and TYPESAFE_API_KEY (exits 2 if either is unset).
"""

from __future__ import annotations

import argparse
import asyncio
import contextvars
import dataclasses
import hashlib
import json
import math
import os
import platform
import subprocess
import sys
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol

# Run as `uv run python scripts/benchmark_latency.py` (not `-m`), so Python
# puts scripts/ on sys.path, not apps/api/; add apps/api/ so `app.*` and
# `scripts.*` (this module, for the test suite) both import.
_API_DIR = str(Path(__file__).resolve().parent.parent)
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

import typesafe_sdk
from google.genai import types
from google.genai.version import __version__ as GENAI_SDK_VERSION
from typesafe_sdk import AsyncTypeSafeClient
from typesafe_sdk._core.constants import SYSTEM_ONE_PATH

from app.comparison import admit_pair, compare_fields, equivalence_questions
from app.config import Settings, get_settings
from app.extraction import (
    GEMINI_TIMEOUT_SECONDS,
    AttachmentInput,
    DocumentAnalysis,
    DocumentAnalyzer,
    ExtractionFailure,
    GeminiExtractor,
    GeminiOutcome,
)
from app.gemini import KeyAttempt, _clients, generate_traced
from app.jev import (
    JEV_MODEL,
    REQUEST_TIMEOUT_SECONDS,
    EquivalenceQuestion,
    JevDocumentRoleClient,
    JevEquivalence,
    JevEquivalenceClient,
    JevProviderFailure,
)
from app.submission import select_structural_review_reason

REPO_ROOT = Path(__file__).resolve().parents[3]
ATTACHMENTS_DIR = REPO_ROOT / "data" / "sdoc-hackathon-bundle" / "attachments"
SI_PATH = ATTACHMENTS_DIR / "email_512_SI.pdf"
BL_PATH = ATTACHMENTS_DIR / "email_512_BL.pdf"
RESULTS_DIR = Path(__file__).resolve().parent / "benchmark-results"

# Fallback only -- the artifact records what the constructed client actually
# resolved (see _gemini_resolved_endpoint/_jev_resolved_endpoint). This is
# the google-genai default (google/genai/_api_client.py) neither Settings
# nor app/gemini.py override.
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/"
# Fallback only. typesafe_sdk's DEFAULT_BASE_URL + the System One path,
# matching TYPESAFE_BASE_URL unset; see
# docs/research/build/live-path-latency-method.md.
JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone"

END_TO_END_THRESHOLD_MS = 10_000

STAGE_NAMES = (
    "gemini_scan_si",
    "gemini_scan_bl",
    "jev_document_role",
    "jev_equivalence",
    "end_to_end",
)

MEASUREMENT_METHOD = (
    "time.perf_counter() brackets each provider call: "
    "elapsed_ms = (perf_counter() - t0) * 1000. Wall-clock UTC is recorded "
    "separately per trial for correlation with provider logs only, never "
    "for the elapsed measurement."
)
PERCENTILE_METHOD = (
    "Nearest-rank (Hyndman-Fan Type 1): rank = max(1, min(n, ceil(q * n))), "
    "1-indexed into the ascending-sorted values for that stage's warm, "
    "successful trials; p50 uses q=0.5, p95 uses q=0.95. Always an observed "
    "trial, never interpolated."
)

StageStatus = Literal["ok", "error", "not_needed", "skipped", "not_reached"]


@dataclass(frozen=True, slots=True)
class StageRecord:
    elapsed_ms: float | None
    status: StageStatus
    failure_code: str | None = None
    model_version: str | None = None
    request_id: str | None = None
    usage: dict | None = None
    http_status: int | None = None
    # Gemini's second-key fallback, key index and outcome/status only --
    # KeyAttempt never carries the key value itself.
    key_attempts: tuple[KeyAttempt, ...] = ()


@dataclass(frozen=True, slots=True)
class AdmissionRecord:
    """Whether `app.comparison.admit_pair` admitted the trial's SI/draft-BL pair.

    `structural_review_reason`/`diagnostic_reasons` are populated only when
    not admitted; `equivalence_question_count` only when admitted.
    """

    admitted: bool
    structural_review_reason: str | None = None
    diagnostic_reasons: tuple[str, ...] = ()
    equivalence_question_count: int | None = None


@dataclass(frozen=True, slots=True)
class TrialRecord:
    trial_index: int
    warmup: bool
    started_at_utc: str
    status: Literal["ok", "error"]
    failure_code: str | None
    stages: dict[str, StageRecord]
    admission: AdmissionRecord | None = None


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def nearest_rank(values: Sequence[float], q: float) -> float:
    """The nearest-rank quantile: rank = max(1, min(n, ceil(q * n))).

    Always an observed value from `values`, never interpolated -- see
    docs/research/build/live-path-latency-method.md#percentiles-for-20-30-trials.
    """
    if not values:
        raise ValueError("nearest_rank requires at least one value")
    ordered = sorted(values)
    n = len(ordered)
    rank = max(1, min(n, math.ceil(q * n)))
    return ordered[rank - 1]


def summarize(trials: Sequence[TrialRecord]) -> dict:
    """n/p50/p95/max per stage over non-warmup trials whose stage succeeded.

    Each stage's pool holds only the measured trials in which that stage
    itself succeeded. `end_to_end` succeeds only when every pipeline stage
    of the trial did, so a failed trial's short elapsed time never enters
    the end-to-end percentiles. A per-stage pool can still include a
    successful stage from a trial that failed later (for example both scans
    of a trial whose role call failed), because that stage's time is real.

    A trial whose SI/draft-BL pair `admit_pair` did not admit -- structural
    diagnostics or a blocking failure -- is an `end_to_end` failure too
    (`error`/`not_admitted`), even when every scan and role stage succeeded:
    it never reached a complete comparison, so its shorter elapsed time must
    not enter the end-to-end pool.

    `end_to_end` additionally carries the 10-second SLO threshold and
    whether p95 passes it. Pass rule: `pass` is True only when p95 is a
    real, computed value under the threshold. When no trial succeeded
    (n=0, p95_ms=None) `pass` is always False -- an unmeasured run is not
    a passing one, however few or fast the failures were.
    """
    measured = [trial for trial in trials if not trial.warmup]
    stages: dict[str, dict] = {}
    for name in STAGE_NAMES:
        values = [
            trial.stages[name].elapsed_ms
            for trial in measured
            if trial.stages[name].status == "ok"
            and trial.stages[name].elapsed_ms is not None
        ]
        n = len(values)
        entry = {
            "n": n,
            "p50_ms": nearest_rank(values, 0.5) if n else None,
            "p95_ms": nearest_rank(values, 0.95) if n else None,
            "max_ms": max(values) if n else None,
        }
        if name == "end_to_end":
            entry["threshold_ms"] = END_TO_END_THRESHOLD_MS
            entry["pass"] = (
                entry["p95_ms"] is not None
                and entry["p95_ms"] < END_TO_END_THRESHOLD_MS
            )
        stages[name] = entry
    return {"n": len(measured), "stages": stages}


def artifact_path(now: datetime, sha: str) -> Path:
    """`<UTC yyyymmddThhmmssZ>-<git short sha>.json`, relative to the results dir.

    `now` must already be UTC (e.g. `datetime.now(UTC)`).
    """
    return Path(f"{now.strftime('%Y%m%dT%H%M%SZ')}-{sha}.json")


def _gemini_metadata(settings: Settings, *, endpoint: str) -> dict:
    """Gemini run metadata. Never reads settings.gemini_api_key."""
    return {
        "sdk": "google-genai",
        "sdk_version": GENAI_SDK_VERSION,
        "model_requested": settings.gemini_model,
        "endpoint": endpoint,
        "timeout_seconds": GEMINI_TIMEOUT_SECONDS,
        "retry_options": {"attempts": 1},
    }


def _jev_metadata(settings: Settings, *, endpoint: str) -> dict:
    """Jev run metadata. Never reads settings.typesafe_api_key."""
    return {
        "sdk": "typesafe-sdk",
        "sdk_version": typesafe_sdk.__version__,
        "model_requested": JEV_MODEL,
        "endpoint": endpoint,
        "timeout_seconds": REQUEST_TIMEOUT_SECONDS,
        "retry_policy": {"max_retries": 0},
    }


def _gemini_resolved_endpoint() -> str:
    """The base URL the configured google-genai client actually resolved to.

    Read from the constructed client (app.gemini._clients()[0], the same
    client generate_traced tries first) rather than assumed, since
    HttpOptions.base_url can override the default. Falls back to the
    documented default if no client is configured or the SDK's internal
    shape changes underneath this introspection.
    """
    clients = _clients()
    if clients:
        http_options = getattr(clients[0], "_api_client", None)
        http_options = getattr(http_options, "_http_options", None)
        base_url = getattr(http_options, "base_url", None)
        if base_url:
            return base_url
    return GEMINI_ENDPOINT


def _jev_resolved_endpoint(client: AsyncTypeSafeClient) -> str:
    """The base URL the constructed typesafe-sdk client actually resolved to.

    Read from the client's own resolved Config (api_key > TYPESAFE_BASE_URL
    env > DEFAULT_BASE_URL, exactly typesafe_sdk._core.config.Config.resolve's
    precedence) rather than reimplemented, then append the System One path.
    """
    base_url = getattr(getattr(client, "_config", None), "base_url", None)
    if not base_url:
        return JEV_ENDPOINT
    return f"{base_url.rstrip('/')}{SYSTEM_ONE_PATH}"


def build_artifact(
    *,
    started_at_utc: str,
    completed_at_utc: str,
    git_sha: str,
    host_label: str,
    inputs: dict,
    gemini: dict,
    jev: dict,
    trial_count: int,
    warmup_count: int,
    trials: Sequence[TrialRecord],
    completed: bool = True,
) -> dict:
    """Assemble the full JSON-serializable artifact for one benchmark run.

    `completed` is False when the run was interrupted (KeyboardInterrupt or
    an unexpected error escaped run_benchmark itself) before every
    requested trial ran; `trials`/`summary` still cover whatever did
    complete -- evidence is written, never discarded.
    """
    return {
        "run": {
            "started_at_utc": started_at_utc,
            "completed_at_utc": completed_at_utc,
            "git_sha": git_sha,
            "host_label": host_label,
            "inputs": inputs,
            "gemini": gemini,
            "jev": jev,
            "trial_count": trial_count,
            "warmup_count": warmup_count,
            "concurrency": 1,
            "measurement_method": MEASUREMENT_METHOD,
            "percentile_method": PERCENTILE_METHOD,
            "completed": completed,
        },
        "trials": [dataclasses.asdict(trial) for trial in trials],
        "summary": summarize(trials),
    }


# ---------------------------------------------------------------------------
# run_benchmark core
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class PairAnalyzed:
    """One trial's extraction stages.

    `analyses` is the product's real `(si, bl)` `DocumentAnalysis` pair,
    ready for `app.comparison.admit_pair`. `stages` always has exactly
    "gemini_scan_si", "gemini_scan_bl", and "jev_document_role".
    """

    analyses: tuple[DocumentAnalysis, DocumentAnalysis]
    stages: dict[str, StageRecord]


class PairAnalyzer(Protocol):
    async def analyze_pair(self, *, correlation_id: str) -> PairAnalyzed: ...


class EquivalenceJudge(Protocol):
    async def judge(
        self,
        questions: Sequence[EquivalenceQuestion],
        *,
        correlation_id: str | None = None,
    ) -> list[JevEquivalence]: ...


def _trial_status(
    stages: dict[str, StageRecord],
) -> tuple[Literal["ok", "error"], str | None]:
    """The pipeline status end_to_end and the TrialRecord both report.

    Derived from the four pipeline stages only (never from `end_to_end`
    itself, which does not exist yet when this is called from
    `run_benchmark` -- it is *set from* this function's result). A
    `jev_equivalence` stage of `not_reached` -- the SI/draft-BL pair was not
    admitted -- is an error too, with failure_code `not_admitted`, even
    though nothing raised.
    """
    for name in STAGE_NAMES[:-1]:  # every stage except end_to_end
        stage = stages[name]
        if stage.status == "error":
            return "error", stage.failure_code
        if stage.status == "not_reached":
            return "error", "not_admitted"
    return "ok", None


async def run_benchmark(
    *,
    analyzer_factory: Callable[[], PairAnalyzer],
    equivalence: EquivalenceJudge,
    trials: int,
    warmup: int,
    clock: Callable[[], float],
    records: list[TrialRecord] | None = None,
) -> list[TrialRecord]:
    """Run `warmup` discarded trials then `trials` measured ones, sequentially.

    Every trial is recorded, including warm-up and failures. A trial never
    raises: an unexpected analyzer error, and an unclassified error from
    admission/comparison/equivalence, are both caught and recorded as a
    failed trial so the run continues.

    Pass a caller-owned `records` list (mutated in place, and also
    returned) so a caller can still read every trial completed so far even
    if something outside this function's control -- KeyboardInterrupt, or a
    bug this function does not anticipate -- interrupts the loop.
    """
    if records is None:
        records = []
    for index in range(warmup + trials):
        is_warmup = index < warmup
        started_at = datetime.now(UTC).isoformat()
        correlation_id = f"benchmark-{index}"
        analyzer = analyzer_factory()
        t0 = clock()
        try:
            analyzed = await analyzer.analyze_pair(correlation_id=correlation_id)
        except Exception as error:  # noqa: BLE001 - record, never crash the run
            elapsed_ms = (clock() - t0) * 1000
            stages = {name: StageRecord(None, "skipped") for name in STAGE_NAMES[:-1]}
            stages["end_to_end"] = StageRecord(
                elapsed_ms, "error", type(error).__name__
            )
            records.append(
                TrialRecord(
                    index, is_warmup, started_at, "error", type(error).__name__, stages
                )
            )
            continue

        stages = dict(analyzed.stages)
        admission_record: AdmissionRecord | None = None
        try:
            admission = admit_pair(analyzed.analyses)
            if admission.admitted:
                drafts = compare_fields(admission)
                questions = equivalence_questions(drafts)
                admission_record = AdmissionRecord(
                    admitted=True, equivalence_question_count=len(questions)
                )
                if questions:
                    eq_t0 = clock()
                    try:
                        answers = await equivalence.judge(
                            questions, correlation_id=correlation_id
                        )
                    except JevProviderFailure as failure:
                        elapsed_ms = (clock() - eq_t0) * 1000
                        stages["jev_equivalence"] = StageRecord(
                            elapsed_ms=elapsed_ms,
                            status="error",
                            failure_code=failure.code.value,
                            request_id=failure.provider_request_id,
                            http_status=failure.status_code,
                        )
                    else:
                        elapsed_ms = (clock() - eq_t0) * 1000
                        stages["jev_equivalence"] = StageRecord(
                            elapsed_ms=elapsed_ms,
                            status="ok",
                            model_version=(
                                answers[0].returned_model if answers else None
                            ),
                            request_id=(
                                answers[0].provider_request_id if answers else None
                            ),
                        )
                else:
                    stages["jev_equivalence"] = StageRecord(None, "not_needed")
            else:
                reason = select_structural_review_reason(admission.diagnostics)
                admission_record = AdmissionRecord(
                    admitted=False,
                    structural_review_reason=reason.value if reason else None,
                    diagnostic_reasons=tuple(
                        diagnostic.reason.value for diagnostic in admission.diagnostics
                    ),
                )
                stages["jev_equivalence"] = StageRecord(None, "not_reached")
        except Exception as error:  # noqa: BLE001 - record, never crash the run
            # An unclassified error anywhere in admission/comparison/
            # equivalence (e.g. one app.jev._call_batch re-raises as-is).
            # failure_code is the exception's type name only -- never
            # str(error), which could echo document content.
            stages["jev_equivalence"] = StageRecord(
                elapsed_ms=None, status="error", failure_code=type(error).__name__
            )

        status, failure_code = _trial_status(stages)
        stages["end_to_end"] = StageRecord((clock() - t0) * 1000, status, failure_code)
        records.append(
            TrialRecord(
                index,
                is_warmup,
                started_at,
                status,
                failure_code,
                stages,
                admission_record,
            )
        )
    return records


# ---------------------------------------------------------------------------
# Live wiring: the product's real components, timed
# ---------------------------------------------------------------------------

_scan_label: contextvars.ContextVar[str] = contextvars.ContextVar(
    "benchmark_scan_label"
)

# The method doc (docs/research/build/live-path-latency-method.md) shows the
# SDK default retries transient errors up to 5 times; pin one attempt so a
# trial is exactly one HTTP call and a 429 is a recorded failure, not a
# hidden retry loop.
_GEMINI_RETRY_OFF = types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1))


def _token_usage(usage_metadata: object) -> dict | None:
    """Total/prompt/candidates token counts from a response's usage_metadata.

    None when the response carried no usage_metadata at all (never raises
    on a shape the SDK didn't send -- getattr with a None default).
    """
    if usage_metadata is None:
        return None
    return {
        "total_token_count": getattr(usage_metadata, "total_token_count", None),
        "prompt_token_count": getattr(usage_metadata, "prompt_token_count", None),
        "candidates_token_count": getattr(
            usage_metadata, "candidates_token_count", None
        ),
    }


class _TimingGeminiExtractor(GeminiExtractor):
    """The product's real GeminiExtractor, timing each labeled scan call and
    capturing the response id and token usage GeminiOutcome does not expose.

    One instance is shared for both concurrent scan calls DocumentAnalyzer
    makes; calls are told apart by their exact attachment bytes (`labels`).
    """

    def __init__(self, *, labels: dict[bytes, str]) -> None:
        self._labels = labels
        self._response_ids: dict[str, str | None] = {}
        self._usage: dict[str, dict | None] = {}
        self.stages: dict[str, StageRecord] = {}
        super().__init__(self._timed_generate)

    async def _timed_generate(self, contents, config=None, *, attempts=None):
        if config is not None:
            config = config.model_copy(update={"http_options": _GEMINI_RETRY_OFF})
        response, attempts_out = await generate_traced(
            contents, config, attempts=attempts
        )
        label = _scan_label.get()
        self._response_ids[label] = getattr(response, "response_id", None)
        self._usage[label] = _token_usage(getattr(response, "usage_metadata", None))
        return response, attempts_out

    async def read_scan(self, data: bytes) -> GeminiOutcome:
        label = self._labels[data]
        token = _scan_label.set(label)
        t0 = time.perf_counter()
        try:
            outcome = await super().read_scan(data)
        except ExtractionFailure as failure:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            self.stages[label] = StageRecord(
                elapsed_ms=elapsed_ms,
                status="error",
                failure_code=failure.code.value,
                request_id=self._response_ids.get(label),
                usage=self._usage.get(label),
                http_status=(
                    failure.key_attempts[-1].status_code
                    if failure.key_attempts
                    else None
                ),
                key_attempts=failure.key_attempts,
            )
            raise
        else:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            self.stages[label] = StageRecord(
                elapsed_ms=elapsed_ms,
                status="ok",
                model_version=outcome.model_version,
                request_id=self._response_ids.get(label),
                usage=self._usage.get(label),
                key_attempts=outcome.key_attempts,
            )
            return outcome
        finally:
            _scan_label.reset(token)


class _TimingRoleDecider:
    """Times the product's real `JevDocumentRoleClient.decide()` call."""

    def __init__(self, inner: JevDocumentRoleClient) -> None:
        self._inner = inner
        self.stage = StageRecord(None, "skipped")

    async def decide(self, documents, *, correlation_id=None):
        t0 = time.perf_counter()
        try:
            decisions = await self._inner.decide(
                documents, correlation_id=correlation_id
            )
        except JevProviderFailure as failure:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            self.stage = StageRecord(
                elapsed_ms=elapsed_ms,
                status="error",
                failure_code=failure.code.value,
                request_id=failure.provider_request_id,
                http_status=failure.status_code,
            )
            raise
        elapsed_ms = (time.perf_counter() - t0) * 1000
        self.stage = StageRecord(
            elapsed_ms,
            "ok",
            None,
            decisions[0].returned_model if decisions else None,
            # One call per document, so record every call's request id.
            ", ".join(
                dict.fromkeys(
                    decision.provider_request_id
                    for decision in decisions
                    if decision.provider_request_id
                )
            )
            or None,
        )
        return decisions


class LiveAnalyzer:
    """Drives the product's real `DocumentAnalyzer` for one SI/draft-BL pair."""

    def __init__(
        self,
        *,
        si: AttachmentInput,
        bl: AttachmentInput,
        role_client: JevDocumentRoleClient,
    ) -> None:
        self._si, self._bl = si, bl
        self._gemini = _TimingGeminiExtractor(
            labels={si.data: "gemini_scan_si", bl.data: "gemini_scan_bl"}
        )
        self._roles = _TimingRoleDecider(role_client)
        self._analyzer = DocumentAnalyzer(roles=self._roles, gemini=self._gemini)

    async def analyze_pair(self, *, correlation_id: str) -> PairAnalyzed:
        analyses = await self._analyzer.analyze(
            [self._si, self._bl], correlation_id=correlation_id
        )
        skipped = StageRecord(None, "skipped")
        stages = {
            "gemini_scan_si": self._gemini.stages.get("gemini_scan_si", skipped),
            "gemini_scan_bl": self._gemini.stages.get("gemini_scan_bl", skipped),
            "jev_document_role": self._roles.stage,
        }
        return PairAnalyzed(analyses=(analyses[0], analyses[1]), stages=stages)


async def _run_live(
    settings: Settings,
    si_input: AttachmentInput,
    bl_input: AttachmentInput,
    *,
    trials: int,
    warmup: int,
    records: list[TrialRecord],
    meta: dict[str, str],
) -> None:
    """Runs into `records` and `meta` (both mutated in place, so a caller
    keeps every trial completed so far and the Jev endpoint the client
    actually resolved even if this raises or is interrupted).
    """
    async with AsyncTypeSafeClient(api_key=settings.typesafe_api_key) as jev_client:
        meta["jev_endpoint"] = _jev_resolved_endpoint(jev_client)
        role_client = JevDocumentRoleClient(jev_client)
        equivalence_client = JevEquivalenceClient(jev_client)

        def analyzer_factory() -> LiveAnalyzer:
            return LiveAnalyzer(si=si_input, bl=bl_input, role_client=role_client)

        await run_benchmark(
            analyzer_factory=analyzer_factory,
            equivalence=equivalence_client,
            trials=trials,
            warmup=warmup,
            clock=time.perf_counter,
            records=records,
        )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Benchmark the live Gemini 3.5 Flash + Jev jev-1.13.0 path."
    )
    parser.add_argument("--trials", type=int, default=20)
    parser.add_argument("--warmup", type=int, default=3)
    parser.add_argument("--host-label", default=None)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory for the artifact (default: scripts/benchmark-results).",
    )
    return parser.parse_args(argv)


def _git_short_sha() -> str:
    """The checkout's short sha, or "unknown" outside a git checkout."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
    return result.stdout.strip() or "unknown"


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv)
    settings = get_settings()
    if not settings.gemini_api_key or not settings.typesafe_api_key:
        print(
            "GEMINI_API_KEY and TYPESAFE_API_KEY must both be set; refusing to run.",
            file=sys.stderr,
        )
        return 2

    host_label = (
        args.host_label or os.environ.get("BENCHMARK_HOST") or platform.platform()
    )
    si_bytes, bl_bytes = SI_PATH.read_bytes(), BL_PATH.read_bytes()
    si_input = AttachmentInput(
        attachment_id="SI", file_name=SI_PATH.name, data=si_bytes
    )
    bl_input = AttachmentInput(
        attachment_id="BL", file_name=BL_PATH.name, data=bl_bytes
    )

    trials: list[TrialRecord] = []
    meta = {"jev_endpoint": JEV_ENDPOINT}
    completed = True
    # Looked up before the run, so a missing git can never cost its results.
    git_sha = _git_short_sha()
    started_at = datetime.now(UTC)
    try:
        asyncio.run(
            _run_live(
                settings,
                si_input,
                bl_input,
                trials=args.trials,
                warmup=args.warmup,
                records=trials,
                meta=meta,
            )
        )
    except BaseException as error:  # noqa: BLE001 - write partial evidence, never lose it
        completed = False
        print(
            f"Benchmark run interrupted ({type(error).__name__}) after "
            f"{len(trials)} trial(s); writing the partial artifact.",
            file=sys.stderr,
        )

    completed_at = datetime.now(UTC)
    artifact = build_artifact(
        started_at_utc=started_at.isoformat(),
        completed_at_utc=completed_at.isoformat(),
        git_sha=git_sha,
        host_label=host_label,
        inputs={
            "si": {
                "path": str(SI_PATH.relative_to(REPO_ROOT)),
                "sha256": hashlib.sha256(si_bytes).hexdigest(),
            },
            "bl": {
                "path": str(BL_PATH.relative_to(REPO_ROOT)),
                "sha256": hashlib.sha256(bl_bytes).hexdigest(),
            },
        },
        gemini=_gemini_metadata(settings, endpoint=_gemini_resolved_endpoint()),
        jev=_jev_metadata(settings, endpoint=meta["jev_endpoint"]),
        trial_count=args.trials,
        warmup_count=args.warmup,
        trials=trials,
        completed=completed,
    )

    results_dir = args.output_dir or RESULTS_DIR
    results_dir.mkdir(parents=True, exist_ok=True)
    out_path = results_dir / artifact_path(started_at, git_sha)
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"Wrote {out_path}")
    return 0 if completed else 1


if __name__ == "__main__":
    sys.exit(main())
