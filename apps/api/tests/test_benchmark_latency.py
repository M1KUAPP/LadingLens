from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from app.contracts import ComparedField, ExtractedValue, ExtractionResult, Provenance
from app.extraction import DocumentAnalysis
from app.formats import Preflight
from app.jev import (
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevProviderFailure,
    JevRoleDecision,
)
from scripts.benchmark_latency import (
    STAGE_NAMES,
    PairAnalyzed,
    StageRecord,
    TrialRecord,
    _gemini_metadata,
    _jev_metadata,
    artifact_path,
    build_artifact,
    nearest_rank,
    run_benchmark,
    summarize,
)

F = ComparedField
VALUES = {
    F.SHIPPER: "APRIL FAR EAST (M) SDN BHD",
    F.CONSIGNEE: "MOORIM SP CO., LTD",
    F.NOTIFY_PARTY: "UAB NOVAKOPA",
    F.PORT_OF_LOADING: "PORT KLANG (WESTPORT), MALAYSIA (MYPKG)",
    F.PORT_OF_DISCHARGE: "CALLAO, PERU (PECLL)",
    F.CONTAINER_COUNT: "1 x 40'HC",
    F.GROSS_WEIGHT_KG: "21,577 KG",
}


# ---------------------------------------------------------------------------
# Fixtures shared by the run_benchmark tests
# ---------------------------------------------------------------------------


def _check() -> Preflight:
    return Preflight(
        content_hash="a" * 64,
        byte_size=10,
        detected_format="pdf",
        status="OK",
        scanned=True,
        page_count=1,
    )


def _role(document_id: str, role: DocumentRole) -> JevRoleDecision:
    probabilities = {"SI": 0.05, "DRAFT_BL": 0.05, "OTHER": 0.05}
    probabilities[role.value] = 0.9
    return JevRoleDecision(
        document_id=document_id,
        role=role,
        probabilities=probabilities,
        confidence=0.9,
        returned_model="jev-1.13.0",
        provider_request_id="role-req",
        correlation_id="c",
    )


def _doc(
    document_id: str, role: DocumentRole, values=None, **overrides
) -> DocumentAnalysis:
    values = VALUES if values is None else values
    extraction = ExtractionResult(
        values=[
            ExtractedValue(
                field=field,
                raw_value=raw,
                provenance=Provenance.model_validate(
                    {
                        "attachment_id": document_id,
                        "file_name": f"{document_id}.pdf",
                        "format": "txt",
                        "location": {
                            "kind": "txt",
                            "line": index + 1,
                            "start_col": 0,
                            "end_col": len(raw),
                        },
                    }
                ),
            )
            for index, (field, raw) in enumerate(values.items())
        ]
    )
    fields = {
        "attachment_id": document_id,
        "file_name": f"{document_id}.pdf",
        "preflight": _check(),
        "route": "gemini_scan",
        "role": _role(document_id, role),
        "extraction": extraction,
        "model_version": "gemini-3.5-flash-002",
    }
    fields.update(overrides)
    return DocumentAnalysis(**fields)


def _stage(
    elapsed_ms=100.0,
    status="ok",
    failure_code=None,
    model_version=None,
    request_id=None,
):
    return StageRecord(elapsed_ms, status, failure_code, model_version, request_id)


def _three_stages() -> dict[str, StageRecord]:
    return {
        "gemini_scan_si": _stage(
            100.0, model_version="gemini-3.5-flash-002", request_id="si-resp"
        ),
        "gemini_scan_bl": _stage(
            120.0, model_version="gemini-3.5-flash-002", request_id="bl-resp"
        ),
        "jev_document_role": _stage(
            80.0, model_version="jev-1.13.0", request_id="role-req"
        ),
    }


class _FakeAnalyzer:
    def __init__(self, result):
        self.result = result
        self.calls: list[str] = []

    async def analyze_pair(self, *, correlation_id):
        self.calls.append(correlation_id)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


class _FakeEquivalence:
    def __init__(self, results):
        self.results = iter(results)
        self.calls: list[tuple] = []

    async def judge(self, questions, *, correlation_id=None):
        self.calls.append((tuple(questions), correlation_id))
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result


class _FakeClock:
    """Deterministic stand-in for time.perf_counter: +1.0 per call."""

    def __init__(self):
        self.value = 0.0

    def __call__(self):
        self.value += 1.0
        return self.value


# ---------------------------------------------------------------------------
# nearest_rank
# ---------------------------------------------------------------------------


def test_nearest_rank_p95_of_20_is_19th_smallest_not_the_max():
    values = list(range(1, 21))  # 1..20
    assert nearest_rank(values, 0.95) == 19


def test_nearest_rank_returns_an_observed_value_not_an_interpolation():
    values = [1.0, 2.0, 100.0]
    # q=0.5 -> rank = ceil(1.5) = 2 -> second-smallest, not an average.
    assert nearest_rank(values, 0.5) == 2.0


def test_nearest_rank_single_value():
    assert nearest_rank([42.0], 0.95) == 42.0


def test_nearest_rank_sorts_unordered_input():
    assert nearest_rank([5, 1, 3, 2, 4], 0.95) == nearest_rank([1, 2, 3, 4, 5], 0.95)


def test_nearest_rank_rejects_empty_input():
    with pytest.raises(ValueError):
        nearest_rank([], 0.95)


# ---------------------------------------------------------------------------
# summarize
# ---------------------------------------------------------------------------


def _trial(index, *, warmup=False, status="ok", failure_code=None, stages=None):
    return TrialRecord(
        trial_index=index,
        warmup=warmup,
        started_at_utc="2026-09-21T00:00:00+00:00",
        status=status,
        failure_code=failure_code,
        stages=stages if stages is not None else dict(_end_to_end_only(1000.0)),
    )


def _end_to_end_only(elapsed_ms, status="ok"):
    stages = {
        name: _stage(None, "skipped") for name in STAGE_NAMES if name != "end_to_end"
    }
    stages["end_to_end"] = _stage(elapsed_ms, status)
    return stages


def test_summarize_excludes_warmup_trials():
    trials = [
        _trial(0, warmup=True, stages=_end_to_end_only(999999.0)),
        *[_trial(i, stages=_end_to_end_only(1000.0 + i)) for i in range(1, 21)],
    ]
    summary = summarize(trials)
    assert summary["n"] == 20
    assert summary["stages"]["end_to_end"]["n"] == 20
    assert summary["stages"]["end_to_end"]["max_ms"] < 999999.0


def test_summarize_excludes_failed_trials_from_stage_stats():
    trials = [
        _trial(
            0,
            status="error",
            failure_code="provider_error",
            stages=_end_to_end_only(50.0, "error"),
        ),
        *[_trial(i, stages=_end_to_end_only(1000.0)) for i in range(1, 4)],
    ]
    summary = summarize(trials)
    assert summary["stages"]["end_to_end"]["n"] == 3


def test_summarize_reports_null_stats_when_a_stage_is_never_needed():
    stages = _end_to_end_only(1000.0)
    stages["jev_equivalence"] = _stage(None, "not_needed")
    trials = [_trial(i, stages=dict(stages)) for i in range(3)]
    summary = summarize(trials)
    eq = summary["stages"]["jev_equivalence"]
    assert eq == {"n": 0, "p50_ms": None, "p95_ms": None, "max_ms": None}


def test_summarize_end_to_end_pass_when_p95_under_threshold():
    trials = [_trial(i, stages=_end_to_end_only(500.0)) for i in range(20)]
    summary = summarize(trials)
    assert summary["stages"]["end_to_end"]["threshold_ms"] == 10_000
    assert summary["stages"]["end_to_end"]["pass"] is True


def test_summarize_end_to_end_fail_when_p95_at_or_over_threshold():
    trials = [_trial(i, stages=_end_to_end_only(12_000.0)) for i in range(20)]
    summary = summarize(trials)
    assert summary["stages"]["end_to_end"]["pass"] is False


# ---------------------------------------------------------------------------
# artifact_path / build_artifact
# ---------------------------------------------------------------------------


def test_artifact_path_format():
    now = datetime(2026, 9, 21, 18, 0, 3, tzinfo=UTC)
    assert str(artifact_path(now, "14dbd75")) == "20260921T180003Z-14dbd75.json"


def test_build_artifact_contains_run_trials_and_summary():
    trials = [_trial(0, warmup=True), _trial(1)]
    artifact = build_artifact(
        started_at_utc="2026-09-21T00:00:00+00:00",
        git_sha="14dbd75",
        host_label="test-host",
        inputs={
            "si": {"path": "x", "sha256": "y"},
            "bl": {"path": "x2", "sha256": "y2"},
        },
        gemini={"sdk": "google-genai"},
        jev={"sdk": "typesafe-sdk"},
        trial_count=1,
        warmup_count=1,
        trials=trials,
    )
    assert artifact["run"]["git_sha"] == "14dbd75"
    assert artifact["run"]["concurrency"] == 1
    assert len(artifact["trials"]) == 2
    assert artifact["trials"][0]["warmup"] is True
    assert artifact["summary"]["n"] == 1  # only the non-warmup trial


def test_gemini_and_jev_metadata_never_carry_the_api_key():
    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "SECRET-GEMINI-MARKER"
        typesafe_api_key = "SECRET-TYPESAFE-MARKER"

    blob = json.dumps(
        {"gemini": _gemini_metadata(_Settings()), "jev": _jev_metadata(_Settings())}
    )
    assert "SECRET-GEMINI-MARKER" not in blob
    assert "SECRET-TYPESAFE-MARKER" not in blob


def test_build_artifact_never_contains_a_planted_key_value():
    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "SECRET-GEMINI-MARKER"
        typesafe_api_key = "SECRET-TYPESAFE-MARKER"

    artifact = build_artifact(
        started_at_utc="2026-09-21T00:00:00+00:00",
        git_sha="14dbd75",
        host_label="test-host",
        inputs={
            "si": {"path": "x", "sha256": "y"},
            "bl": {"path": "x2", "sha256": "y2"},
        },
        gemini=_gemini_metadata(_Settings()),
        jev=_jev_metadata(_Settings()),
        trial_count=1,
        warmup_count=0,
        trials=[_trial(0)],
    )
    blob = json.dumps(artifact)
    assert "SECRET-GEMINI-MARKER" not in blob
    assert "SECRET-TYPESAFE-MARKER" not in blob


# ---------------------------------------------------------------------------
# run_benchmark
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_benchmark_marks_the_first_warmup_trials():
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])
    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=2,
        warmup=1,
        clock=_FakeClock(),
    )
    assert [r.warmup for r in records] == [True, False, False]
    assert [r.trial_index for r in records] == [0, 1, 2]


@pytest.mark.asyncio
async def test_run_benchmark_records_not_needed_when_every_field_matches():
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
    )

    assert equivalence.calls == []
    stage = records[0].stages["jev_equivalence"]
    assert stage.status == "not_needed"
    assert stage.elapsed_ms is None
    assert records[0].status == "ok"


@pytest.mark.asyncio
async def test_run_benchmark_calls_equivalence_only_when_a_field_differs():
    bl_values = {**VALUES, F.SHIPPER: "SOMEBODY COMPLETELY DIFFERENT LTD"}
    analyzed = PairAnalyzed(
        analyses=(
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL, values=bl_values),
        ),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence(
        [
            [
                JevEquivalence(
                    field=ComparedField.SHIPPER,
                    probability=0.91,
                    returned_model="jev-1.13.0",
                    provider_request_id="eq-req",
                    correlation_id="c",
                )
            ]
        ]
    )

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
    )

    assert len(equivalence.calls) == 1
    questions, _correlation_id = equivalence.calls[0]
    assert [q.field for q in questions] == [ComparedField.SHIPPER]
    stage = records[0].stages["jev_equivalence"]
    assert stage.status == "ok"
    assert stage.model_version == "jev-1.13.0"
    assert stage.request_id == "eq-req"
    assert records[0].status == "ok"


@pytest.mark.asyncio
async def test_run_benchmark_records_equivalence_provider_failure():
    bl_values = {**VALUES, F.SHIPPER: "SOMEBODY COMPLETELY DIFFERENT LTD"}
    analyzed = PairAnalyzed(
        analyses=(
            _doc("si", DocumentRole.SI),
            _doc("bl", DocumentRole.DRAFT_BL, values=bl_values),
        ),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    failure = JevProviderFailure(
        code=JevFailureCode.RATE_LIMITED,
        retryable=True,
        email_ids=("shipper",),
        correlation_id="c",
        message="Jev rate limit was exceeded",
        provider_request_id="eq-req-failed",
    )
    equivalence = _FakeEquivalence([failure])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
    )

    stage = records[0].stages["jev_equivalence"]
    assert stage.status == "error"
    assert stage.failure_code == "rate_limited"
    assert stage.request_id == "eq-req-failed"
    assert records[0].status == "error"
    assert records[0].failure_code == "rate_limited"


@pytest.mark.asyncio
async def test_run_benchmark_skips_equivalence_when_pair_is_not_admitted():
    # Two SI-role documents: admit_pair cannot pair them, so compare_fields
    # is never reachable and no Jev equivalence call is possible.
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("si2", DocumentRole.SI)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
    )

    assert equivalence.calls == []
    assert records[0].stages["jev_equivalence"].status == "skipped"


@pytest.mark.asyncio
async def test_run_benchmark_propagates_analyzer_stage_records_unchanged():
    stages = _three_stages()
    stages["gemini_scan_si"] = _stage(999.0, "error", "quota_exhausted")
    analyzed = PairAnalyzed(
        analyses=(
            _doc("si", DocumentRole.SI, failure=None),
            _doc("bl", DocumentRole.DRAFT_BL),
        ),
        stages=stages,
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
    )

    assert records[0].stages["gemini_scan_si"] == StageRecord(
        999.0, "error", "quota_exhausted"
    )
    assert records[0].status == "error"
    assert records[0].failure_code == "quota_exhausted"


@pytest.mark.asyncio
async def test_run_benchmark_records_end_to_end_and_uses_injected_clock():
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])
    clock = _FakeClock()

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=clock,
    )

    end_to_end = records[0].stages["end_to_end"]
    assert end_to_end.status == "ok"
    # The fake clock advances by 1.0 (=1000ms) per call; one call brackets
    # the whole trial (no equivalence call in this scenario).
    assert end_to_end.elapsed_ms == 1000.0


@pytest.mark.asyncio
async def test_run_benchmark_recovers_from_an_unexpected_analyzer_error():
    analyzer = _FakeAnalyzer(RuntimeError("boom"))
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=2,
        warmup=0,
        clock=_FakeClock(),
    )

    assert len(records) == 2
    assert all(record.status == "error" for record in records)
    assert all(record.stages["end_to_end"].status == "error" for record in records)
