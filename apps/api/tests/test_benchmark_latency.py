from __future__ import annotations

import dataclasses
import json
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

import scripts.benchmark_latency as m
from app.contracts import ComparedField, ExtractedValue, ExtractionResult, Provenance
from app.extraction import DocumentAnalysis, ExtractionFailure
from app.formats import Preflight
from app.gemini import KeyAttempt
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
    _TimingGeminiExtractor,
    _TimingRoleDecider,
    _token_usage,
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

# A minimal, schema-valid Gemini scan answer for _TimingGeminiExtractor tests.
SCAN_JSON = (
    '{"document_title": "T", "transcription": "T", "fields": {'
    + ", ".join(
        f'"{field.value}": {{"value": "V", "page": 1, "region": "party"}}'
        for field in F
    )
    + "}}"
)


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
        completed_at_utc="2026-09-21T00:05:00+00:00",
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
        {
            "gemini": _gemini_metadata(_Settings(), endpoint="https://example.invalid"),
            "jev": _jev_metadata(
                _Settings(), endpoint="https://example.invalid/v1/systemone"
            ),
        }
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
        completed_at_utc="2026-09-21T00:05:00+00:00",
        git_sha="14dbd75",
        host_label="test-host",
        inputs={
            "si": {"path": "x", "sha256": "y"},
            "bl": {"path": "x2", "sha256": "y2"},
        },
        gemini=_gemini_metadata(_Settings(), endpoint="https://example.invalid"),
        jev=_jev_metadata(_Settings(), endpoint="https://example.invalid/v1/systemone"),
        trial_count=1,
        warmup_count=0,
        trials=[_trial(0)],
    )
    blob = json.dumps(artifact)
    assert "SECRET-GEMINI-MARKER" not in blob
    assert "SECRET-TYPESAFE-MARKER" not in blob


# ---------------------------------------------------------------------------
# Resolved endpoints (fix: no longer hardcoded constants in the artifact)
# ---------------------------------------------------------------------------


def test_gemini_resolved_endpoint_reads_the_constructed_clients_base_url(monkeypatch):
    fake_client = SimpleNamespace(
        _api_client=SimpleNamespace(
            _http_options=SimpleNamespace(base_url="https://overridden.example/")
        )
    )
    monkeypatch.setattr(m, "_clients", lambda: (fake_client,))
    assert m._gemini_resolved_endpoint() == "https://overridden.example/"


def test_gemini_resolved_endpoint_falls_back_when_no_client_is_configured(monkeypatch):
    monkeypatch.setattr(m, "_clients", lambda: ())
    assert m._gemini_resolved_endpoint() == m.GEMINI_ENDPOINT


def test_jev_resolved_endpoint_reflects_an_overridden_base_url_env(monkeypatch):
    monkeypatch.setenv("TYPESAFE_BASE_URL", "https://overridden.typesafe.example")
    client = m.AsyncTypeSafeClient(api_key="fake-key-not-real")
    assert (
        m._jev_resolved_endpoint(client)
        == "https://overridden.typesafe.example/v1/systemone"
    )


def test_jev_resolved_endpoint_is_the_sdk_default_without_an_override(monkeypatch):
    monkeypatch.delenv("TYPESAFE_BASE_URL", raising=False)
    client = m.AsyncTypeSafeClient(api_key="fake-key-not-real")
    assert m._jev_resolved_endpoint(client) == m.JEV_ENDPOINT


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
    admission = records[0].admission
    assert admission.admitted is True
    assert admission.equivalence_question_count == 0


@pytest.mark.asyncio
async def test_run_benchmark_end_to_end_status_matches_a_failed_pipeline_stage():
    """A failed scan/role/equivalence stage must not leave end_to_end "ok"."""
    stages = _three_stages()
    stages["gemini_scan_si"] = _stage(50.0, "error", "quota_exhausted")
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
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

    end_to_end = records[0].stages["end_to_end"]
    assert end_to_end.status == "error"
    assert end_to_end.failure_code == "quota_exhausted"
    assert records[0].status == "error"
    assert records[0].failure_code == "quota_exhausted"


@pytest.mark.asyncio
async def test_summarize_excludes_end_to_end_of_failed_trials_and_fails_pass_at_n_zero():
    """Reproduces the reported bug: three quota_exhausted trials must not
    report end_to_end n=3/pass=True; they must be excluded (n=0), and an
    unavailable p95 (n=0) always means pass=False -- never True."""
    stages = _three_stages()
    stages["gemini_scan_si"] = _stage(50.0, "error", "quota_exhausted")
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
        stages=stages,
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=3,
        warmup=0,
        clock=_FakeClock(),
    )
    summary = summarize(records)
    end_to_end = summary["stages"]["end_to_end"]
    assert end_to_end["n"] == 0
    assert end_to_end["p95_ms"] is None
    assert end_to_end["pass"] is False


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
    assert records[0].admission.equivalence_question_count == 1


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
        status_code=429,
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
    assert stage.http_status == 429
    assert records[0].status == "error"
    assert records[0].failure_code == "rate_limited"


@pytest.mark.asyncio
async def test_run_benchmark_marks_a_not_admitted_pair_as_a_failed_trial():
    # Two SI-role documents: admit_pair cannot pair them, so compare_fields
    # is never reachable and no Jev equivalence call is possible. Every
    # upstream stage still succeeds -- only the missing admission must turn
    # this into a failed end-to-end trial.
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
    assert records[0].stages["jev_equivalence"].status == "not_reached"
    assert records[0].stages["gemini_scan_si"].status == "ok"
    assert records[0].status == "error"
    assert records[0].failure_code == "not_admitted"
    admission = records[0].admission
    assert admission.admitted is False
    assert admission.structural_review_reason == "wrong_doc_type"
    assert admission.diagnostic_reasons == ("wrong_doc_type", "missing_attachment")
    assert admission.equivalence_question_count is None


@pytest.mark.asyncio
async def test_summarize_excludes_end_to_end_of_trials_whose_pair_was_not_admitted():
    """Reproduces the reported bug: the committed artifact's 5 "ok" trials all
    have jev_equivalence "skipped" (now "not_reached") -- a trial whose pair
    was never admitted must not count toward end_to_end n, even though every
    scan/role stage succeeded."""
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("si2", DocumentRole.SI)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=3,
        warmup=0,
        clock=_FakeClock(),
    )
    summary = summarize(records)
    end_to_end = summary["stages"]["end_to_end"]
    assert end_to_end["n"] == 0
    assert end_to_end["p95_ms"] is None
    assert end_to_end["pass"] is False


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


# ---------------------------------------------------------------------------
# _token_usage / _TimingGeminiExtractor (Gemini token usage per scan stage)
# ---------------------------------------------------------------------------


def test_token_usage_extracts_known_fields_from_a_fake_response():
    usage = SimpleNamespace(
        total_token_count=2031,
        prompt_token_count=1500,
        candidates_token_count=531,
        thoughts_token_count=999,  # present on the real type; not captured
    )
    assert _token_usage(usage) == {
        "total_token_count": 2031,
        "prompt_token_count": 1500,
        "candidates_token_count": 531,
    }


def test_token_usage_is_none_when_response_has_no_usage_metadata():
    assert _token_usage(None) is None


@pytest.mark.asyncio
async def test_timing_gemini_extractor_records_token_usage_on_a_scan(monkeypatch):
    async def fake_generate_traced(contents, config=None, *, attempts=None):
        response = SimpleNamespace(
            text=SCAN_JSON,
            model_version="gemini-3.5-flash-002",
            response_id="resp-1",
            usage_metadata=SimpleNamespace(
                total_token_count=100, prompt_token_count=80, candidates_token_count=20
            ),
        )
        return response, ()

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    await extractor.read_scan(b"si-bytes")

    stage = extractor.stages["gemini_scan_si"]
    assert stage.status == "ok"
    assert stage.usage == {
        "total_token_count": 100,
        "prompt_token_count": 80,
        "candidates_token_count": 20,
    }


@pytest.mark.asyncio
async def test_timing_gemini_extractor_usage_is_none_when_response_lacks_it(
    monkeypatch,
):
    async def fake_generate_traced(contents, config=None, *, attempts=None):
        response = SimpleNamespace(
            text=SCAN_JSON, model_version="gemini-3.5-flash-002", response_id="resp-1"
        )
        return response, ()

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    await extractor.read_scan(b"si-bytes")

    assert extractor.stages["gemini_scan_si"].usage is None


# ---------------------------------------------------------------------------
# Raw HTTP status per stage (fix 5)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_timing_gemini_extractor_records_http_status_on_failure(monkeypatch):
    from google.genai import errors as genai_errors

    from app.gemini import GeminiCallError

    key_attempts = (KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),)

    async def fake_generate_traced(contents, config=None, *, attempts=None):
        raise GeminiCallError(
            genai_errors.ClientError(429, {"error": {"message": "quota"}}), key_attempts
        )

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    with pytest.raises(ExtractionFailure):
        await extractor.read_scan(b"si-bytes")

    stage = extractor.stages["gemini_scan_si"]
    assert stage.status == "error"
    assert stage.http_status == 429


@pytest.mark.asyncio
async def test_timing_gemini_extractor_http_status_is_none_on_success(monkeypatch):
    async def fake_generate_traced(contents, config=None, *, attempts=None):
        response = SimpleNamespace(
            text=SCAN_JSON, model_version="gemini-3.5-flash-002", response_id="resp-1"
        )
        return response, ()

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    await extractor.read_scan(b"si-bytes")

    assert extractor.stages["gemini_scan_si"].http_status is None


@pytest.mark.asyncio
async def test_timing_role_decider_records_http_status_on_failure():
    failure = JevProviderFailure(
        code=JevFailureCode.OVERLOADED,
        retryable=True,
        email_ids=("SI", "BL"),
        correlation_id="c",
        message="Jev is overloaded",
        provider_request_id="role-req-failed",
        status_code=529,
    )

    class _FailingRoles:
        async def decide(self, documents, *, correlation_id=None):
            raise failure

    decider = _TimingRoleDecider(_FailingRoles())
    with pytest.raises(JevProviderFailure):
        await decider.decide([], correlation_id="c")

    assert decider.stage.status == "error"
    assert decider.stage.http_status == 529
    assert decider.stage.failure_code == "overloaded"


# ---------------------------------------------------------------------------
# Gemini key attempts per scan stage, never the key itself (fix 6)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_timing_gemini_extractor_records_key_attempts_on_failure(monkeypatch):
    from google.genai import errors as genai_errors

    from app.gemini import GeminiCallError

    key_attempts = (
        KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),
        KeyAttempt(key_index=2, outcome="SUCCEEDED", status_code=None),
    )

    async def fake_generate_traced(contents, config=None, *, attempts=None):
        raise GeminiCallError(
            genai_errors.ClientError(429, {"error": {"message": "quota"}}), key_attempts
        )

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    with pytest.raises(ExtractionFailure):
        await extractor.read_scan(b"si-bytes")

    stage = extractor.stages["gemini_scan_si"]
    assert stage.key_attempts == key_attempts
    # Only key_index/outcome/status_code ever appear -- never the key value.
    for attempt in stage.key_attempts:
        assert not hasattr(attempt, "api_key")
        assert set(dataclasses.asdict(attempt)) == {
            "key_index",
            "outcome",
            "status_code",
        }


@pytest.mark.asyncio
async def test_timing_gemini_extractor_records_key_attempts_on_success(monkeypatch):
    key_attempts = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)

    async def fake_generate_traced(contents, config=None, *, attempts=None):
        response = SimpleNamespace(
            text=SCAN_JSON, model_version="gemini-3.5-flash-002", response_id="resp-1"
        )
        return response, key_attempts

    monkeypatch.setattr(m, "generate_traced", fake_generate_traced)
    extractor = _TimingGeminiExtractor(labels={b"si-bytes": "gemini_scan_si"})

    await extractor.read_scan(b"si-bytes")

    assert extractor.stages["gemini_scan_si"].key_attempts == key_attempts


def test_timing_gemini_extractor_key_attempts_default_to_empty():
    assert StageRecord(100.0, "ok").key_attempts == ()


# ---------------------------------------------------------------------------
# Resilience: unclassified exceptions and partial-run evidence (fix 4)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_benchmark_records_unclassified_post_analysis_exception_and_continues():
    """An exception _call_batch re-raises unclassified (not JevProviderFailure)
    must not crash the run or lose the trials that already completed."""
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
            RuntimeError(
                "unclassified _call_batch error: must not leak into failure_code"
            ),
            [
                JevEquivalence(
                    field=ComparedField.SHIPPER,
                    probability=0.91,
                    returned_model="jev-1.13.0",
                    provider_request_id="eq-req",
                    correlation_id="c",
                )
            ],
        ]
    )

    records = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=2,
        warmup=0,
        clock=_FakeClock(),
    )

    assert len(records) == 2
    first = records[0].stages["jev_equivalence"]
    assert first.status == "error"
    assert first.failure_code == "RuntimeError"  # the type name only, never the message
    assert records[0].status == "error"
    assert records[0].failure_code == "RuntimeError"
    # the run continued: the second trial completed normally.
    assert records[1].stages["jev_equivalence"].status == "ok"
    assert records[1].status == "ok"


@pytest.mark.asyncio
async def test_run_benchmark_accumulates_into_a_caller_provided_records_list():
    """main() passes its own list so a partial run's trials survive a crash."""
    analyzed = PairAnalyzed(
        analyses=(_doc("si", DocumentRole.SI), _doc("bl", DocumentRole.DRAFT_BL)),
        stages=_three_stages(),
    )
    analyzer = _FakeAnalyzer(analyzed)
    equivalence = _FakeEquivalence([])
    sink: list[TrialRecord] = []

    result = await run_benchmark(
        analyzer_factory=lambda: analyzer,
        equivalence=equivalence,
        trials=1,
        warmup=0,
        clock=_FakeClock(),
        records=sink,
    )

    assert result is sink
    assert len(sink) == 1


def test_build_artifact_defaults_to_completed_true():
    artifact = build_artifact(
        started_at_utc="2026-09-21T00:00:00+00:00",
        completed_at_utc="2026-09-21T00:05:00+00:00",
        git_sha="14dbd75",
        host_label="test-host",
        inputs={
            "si": {"path": "x", "sha256": "y"},
            "bl": {"path": "x2", "sha256": "y2"},
        },
        gemini={"sdk": "google-genai"},
        jev={"sdk": "typesafe-sdk"},
        trial_count=1,
        warmup_count=0,
        trials=[_trial(0)],
    )
    assert artifact["run"]["completed"] is True


def test_build_artifact_records_completed_false():
    artifact = build_artifact(
        started_at_utc="2026-09-21T00:00:00+00:00",
        completed_at_utc="2026-09-21T00:05:00+00:00",
        git_sha="14dbd75",
        host_label="test-host",
        inputs={
            "si": {"path": "x", "sha256": "y"},
            "bl": {"path": "x2", "sha256": "y2"},
        },
        gemini={"sdk": "google-genai"},
        jev={"sdk": "typesafe-sdk"},
        trial_count=20,
        warmup_count=3,
        trials=[_trial(0)],
        completed=False,
    )
    assert artifact["run"]["completed"] is False


def test_main_writes_a_partial_artifact_with_completed_false_when_interrupted(
    monkeypatch, tmp_path
):
    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "fake-gemini-key"
        typesafe_api_key = "fake-typesafe-key"

    monkeypatch.setattr(m, "get_settings", lambda: _Settings())
    monkeypatch.setattr(m, "RESULTS_DIR", tmp_path)
    monkeypatch.setattr(
        m, "_gemini_resolved_endpoint", lambda: "https://fake-gemini.example"
    )

    partial_stage = StageRecord(500.0, "ok")

    async def fake_run_live(
        settings, si_input, bl_input, *, trials, warmup, records, meta
    ):
        meta["jev_endpoint"] = "https://resolved-jev.example/v1/systemone"
        records.append(
            TrialRecord(
                trial_index=0,
                warmup=False,
                started_at_utc="2026-01-01T00:00:00+00:00",
                status="ok",
                failure_code=None,
                stages={name: partial_stage for name in STAGE_NAMES},
            )
        )
        raise RuntimeError("simulated interruption")

    monkeypatch.setattr(m, "_run_live", fake_run_live)

    exit_code = m.main(["--trials", "1", "--warmup", "0"])

    assert exit_code == 1
    written = list(tmp_path.glob("*.json"))
    assert len(written) == 1
    artifact = json.loads(written[0].read_text())
    assert artifact["run"]["completed"] is False
    assert len(artifact["trials"]) == 1
    assert artifact["run"]["jev"]["endpoint"] == (
        "https://resolved-jev.example/v1/systemone"
    )


def test_main_succeeds_normally_when_the_run_completes(monkeypatch, tmp_path):
    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "fake-gemini-key"
        typesafe_api_key = "fake-typesafe-key"

    monkeypatch.setattr(m, "get_settings", lambda: _Settings())
    monkeypatch.setattr(m, "RESULTS_DIR", tmp_path)
    monkeypatch.setattr(
        m, "_gemini_resolved_endpoint", lambda: "https://fake-gemini.example"
    )

    async def fake_run_live(
        settings, si_input, bl_input, *, trials, warmup, records, meta
    ):
        meta["jev_endpoint"] = "https://fake-jev.example/v1/systemone"

    monkeypatch.setattr(m, "_run_live", fake_run_live)

    exit_code = m.main(["--trials", "1", "--warmup", "0"])

    assert exit_code == 0
    written = list(tmp_path.glob("*.json"))
    assert len(written) == 1
    artifact = json.loads(written[0].read_text())
    assert artifact["run"]["completed"] is True


def test_main_stamps_started_at_utc_with_the_runs_start_not_its_finish(
    monkeypatch, tmp_path
):
    """Reproduces the reported bug: the committed artifact's started_at_utc
    (and file name) held 08:57:04, the write time, while trial 0 actually
    started at 08:45:23. The fake clock returns `finish` once `_run_live`
    has returned and `start` before that, so a single post-run `now()` call
    (the bug) reads as `finish`, not `start`."""

    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "fake-gemini-key"
        typesafe_api_key = "fake-typesafe-key"

    monkeypatch.setattr(m, "get_settings", lambda: _Settings())
    monkeypatch.setattr(m, "RESULTS_DIR", tmp_path)
    monkeypatch.setattr(
        m, "_gemini_resolved_endpoint", lambda: "https://fake-gemini.example"
    )

    start = datetime(2026, 9, 21, 8, 45, 23, tzinfo=UTC)
    finish = datetime(2026, 9, 21, 8, 57, 4, tzinfo=UTC)
    run_live_has_returned = False

    class _FakeDateTime:
        @staticmethod
        def now(tz=None):
            return finish if run_live_has_returned else start

    monkeypatch.setattr(m, "datetime", _FakeDateTime)

    async def fake_run_live(
        settings, si_input, bl_input, *, trials, warmup, records, meta
    ):
        nonlocal run_live_has_returned
        meta["jev_endpoint"] = "https://fake-jev.example/v1/systemone"
        run_live_has_returned = True

    monkeypatch.setattr(m, "_run_live", fake_run_live)

    exit_code = m.main(["--trials", "1", "--warmup", "0"])

    assert exit_code == 0
    written = list(tmp_path.glob("*.json"))
    assert len(written) == 1
    assert written[0].name.startswith("20260921T084523Z-")
    artifact = json.loads(written[0].read_text())
    assert artifact["run"]["started_at_utc"] == start.isoformat()
    assert artifact["run"]["completed_at_utc"] == finish.isoformat()
    assert artifact["trials"] == []


def _fake_main_environment(monkeypatch, results_dir):
    class _Settings:
        gemini_model = "gemini-3.5-flash"
        gemini_api_key = "fake-gemini-key"
        typesafe_api_key = "fake-typesafe-key"

    monkeypatch.setattr(m, "get_settings", lambda: _Settings())
    monkeypatch.setattr(m, "RESULTS_DIR", results_dir)
    monkeypatch.setattr(
        m, "_gemini_resolved_endpoint", lambda: "https://fake-gemini.example"
    )

    async def fake_run_live(
        settings, si_input, bl_input, *, trials, warmup, records, meta
    ):
        meta["jev_endpoint"] = "https://fake-jev.example/v1/systemone"

    monkeypatch.setattr(m, "_run_live", fake_run_live)


def test_main_still_writes_the_artifact_when_git_is_unavailable(monkeypatch, tmp_path):
    _fake_main_environment(monkeypatch, tmp_path)

    def no_git(*args, **kwargs):
        raise FileNotFoundError("git")

    monkeypatch.setattr(m.subprocess, "run", no_git)

    exit_code = m.main(["--trials", "1", "--warmup", "0"])

    assert exit_code == 0
    [written] = tmp_path.glob("*.json")
    assert written.name.endswith("-unknown.json")
    assert json.loads(written.read_text())["run"]["git_sha"] == "unknown"


def test_main_writes_to_the_requested_output_directory(monkeypatch, tmp_path):
    default_dir = tmp_path / "default"
    chosen_dir = tmp_path / "chosen"
    _fake_main_environment(monkeypatch, default_dir)

    exit_code = m.main(
        ["--trials", "1", "--warmup", "0", "--output-dir", str(chosen_dir)]
    )

    assert exit_code == 0
    assert len(list(chosen_dir.glob("*.json"))) == 1
    assert not default_dir.exists()
