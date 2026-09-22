import json
from uuid import UUID

import httpx
import pytest
from pydantic import ValidationError

from app.contracts import ComparedField
from app.submission import (
    EXPECTED_EMAIL_IDS,
    StructuralDiagnostic,
    SubmissionBlockedError,
    SubmissionBlockerCode,
    SubmissionCaseSnapshot,
    SubmissionFieldSnapshot,
    build_submission_artifact,
    score_submission_artifact,
    select_structural_review_reason,
)


def _general_snapshot(index: int) -> SubmissionCaseSnapshot:
    return SubmissionCaseSnapshot(
        email_id=f"email_{index:03d}",
        case_id=UUID(int=index),
        category="GENERAL",
    )


def _complete_snapshots() -> list[SubmissionCaseSnapshot]:
    return [_general_snapshot(index) for index in range(1, 521)]


def _field_snapshots(
    *, semantic_mismatch: ComparedField | None = None
) -> tuple[SubmissionFieldSnapshot, ...]:
    snapshots = []
    for field in ComparedField:
        if field == semantic_mismatch:
            snapshots.append(
                SubmissionFieldSnapshot(field=field, semantic_probability=0.84)
            )
        else:
            snapshots.append(
                SubmissionFieldSnapshot(field=field, deterministic_result="MATCH")
            )
    return tuple(snapshots)


def _replace_snapshot(
    snapshots: list[SubmissionCaseSnapshot], replacement: SubmissionCaseSnapshot
) -> None:
    snapshots[int(replacement.email_id[-3:]) - 1] = replacement


def test_expected_manifest_contains_exact_bundle_ids():
    assert len(EXPECTED_EMAIL_IDS) == 520
    assert EXPECTED_EMAIL_IDS[0] == "email_001"
    assert EXPECTED_EMAIL_IDS[-1] == "email_520"
    assert len(set(EXPECTED_EMAIL_IDS)) == 520


def test_artifact_has_exact_template_keys_for_every_email():
    artifact = build_submission_artifact(_complete_snapshots())
    payload = json.loads(artifact.canonical_bytes)

    assert list(payload) == list(EXPECTED_EMAIL_IDS)
    assert all(
        list(record)
        == [
            "category",
            "status",
            "review_reason",
            "defect_fields",
            "has_defect",
        ]
        for record in payload.values()
    )
    assert artifact.record_count == 520
    assert len(artifact.sha256) == 64


@pytest.mark.parametrize("remove_index", [0, 259, 519])
def test_artifact_rejects_missing_email_id(remove_index: int):
    snapshots = _complete_snapshots()
    missing_id = snapshots.pop(remove_index).email_id

    with pytest.raises(SubmissionBlockedError) as raised:
        build_submission_artifact(snapshots)

    assert any(
        blocker.code is SubmissionBlockerCode.INCOMPLETE_EMAIL_SET
        and missing_id in blocker.message
        for blocker in raised.value.blockers
    )


def test_artifact_rejects_unexpected_email_id():
    snapshots = _complete_snapshots()
    snapshots[-1] = SubmissionCaseSnapshot(
        email_id="email_999",
        case_id=UUID(int=999),
        category="GENERAL",
    )

    with pytest.raises(SubmissionBlockedError) as raised:
        build_submission_artifact(snapshots)

    assert any(
        blocker.code is SubmissionBlockerCode.UNEXPECTED_EMAIL_ID
        and blocker.email_id == "email_999"
        for blocker in raised.value.blockers
    )


def test_artifact_rejects_duplicate_email_id():
    snapshots = _complete_snapshots()
    snapshots[-1] = snapshots[0]

    with pytest.raises(SubmissionBlockedError) as raised:
        build_submission_artifact(snapshots)

    assert any(
        blocker.code is SubmissionBlockerCode.DUPLICATE_EMAIL_ID
        and blocker.email_id == "email_001"
        for blocker in raised.value.blockers
    )


def test_artifact_bytes_are_deterministic_and_follow_manifest_order():
    first = build_submission_artifact(_complete_snapshots())
    second = build_submission_artifact(list(reversed(_complete_snapshots())))

    assert first.canonical_bytes == second.canonical_bytes
    assert first.sha256 == second.sha256
    assert first.canonical_bytes.startswith(
        b'{"email_001":{"category":"GENERAL","status":"OK",'
        b'"review_reason":null,"defect_fields":[],"has_defect":false}'
    )


def test_structural_precedence_selects_one_reason_and_retains_all_diagnostics():
    snapshots = _complete_snapshots()
    structural_diagnostics = (
        StructuralDiagnostic(
            reason="missing_attachment", detail="Draft BL role has no candidate."
        ),
        StructuralDiagnostic(
            reason="wrong_doc_type", detail="Supplied workbook is not a draft BL."
        ),
        StructuralDiagnostic(
            reason="unreadable", detail="Supplied PDF has a corrupt object stream."
        ),
        StructuralDiagnostic(
            reason="missing_value", detail="Consignee is blank after normalization."
        ),
    )
    replacement = SubmissionCaseSnapshot(
        email_id="email_001",
        case_id=UUID(int=1),
        category="BL_COMPARISON",
        structural_diagnostics=structural_diagnostics,
    )
    _replace_snapshot(snapshots, replacement)

    payload = json.loads(build_submission_artifact(snapshots).canonical_bytes)

    assert payload["email_001"] == {
        "category": "BL_COMPARISON",
        "status": "NEEDS_REVIEW",
        "review_reason": "unreadable",
        "defect_fields": [],
        "has_defect": False,
    }
    assert replacement.structural_diagnostics == structural_diagnostics


@pytest.mark.parametrize(
    ("reasons", "expected"),
    [
        (["missing_value"], "missing_value"),
        (["missing_value", "missing_attachment"], "missing_attachment"),
        (
            ["missing_value", "missing_attachment", "wrong_doc_type"],
            "wrong_doc_type",
        ),
        (
            [
                "missing_value",
                "missing_attachment",
                "wrong_doc_type",
                "unreadable",
            ],
            "unreadable",
        ),
    ],
)
def test_structural_precedence_covers_every_priority_level(reasons, expected):
    diagnostics = tuple(
        StructuralDiagnostic(reason=reason, detail=f"Observed {reason}.")
        for reason in reasons
    )

    assert select_structural_review_reason(diagnostics).value == expected


def test_submission_snapshots_are_immutable():
    snapshot = _general_snapshot(1)

    with pytest.raises(ValidationError):
        snapshot.category = "SPAM"


@pytest.mark.parametrize("probability", [0.0, 0.30, 0.5, 0.849999])
def test_semantic_ambiguity_maps_to_batch_mismatch(probability: float):
    snapshots = _complete_snapshots()
    fields = tuple(
        SubmissionFieldSnapshot(
            field=field,
            semantic_probability=probability
            if field is ComparedField.CONSIGNEE
            else None,
            deterministic_result="MATCH"
            if field is not ComparedField.CONSIGNEE
            else None,
        )
        for field in ComparedField
    )
    _replace_snapshot(
        snapshots,
        SubmissionCaseSnapshot(
            email_id="email_001",
            case_id=UUID(int=1),
            category="BL_COMPARISON",
            field_snapshots=fields,
        ),
    )

    payload = json.loads(build_submission_artifact(snapshots).canonical_bytes)

    assert payload["email_001"] == {
        "category": "BL_COMPARISON",
        "status": "MISMATCH",
        "review_reason": None,
        "defect_fields": ["consignee"],
        "has_defect": True,
    }


def test_semantic_threshold_is_a_batch_match():
    snapshots = _complete_snapshots()
    _replace_snapshot(
        snapshots,
        SubmissionCaseSnapshot(
            email_id="email_001",
            case_id=UUID(int=1),
            category="BL_COMPARISON",
            field_snapshots=tuple(
                SubmissionFieldSnapshot(
                    field=field,
                    semantic_probability=0.85
                    if field is ComparedField.CONSIGNEE
                    else None,
                    deterministic_result="MATCH"
                    if field is not ComparedField.CONSIGNEE
                    else None,
                )
                for field in ComparedField
            ),
        ),
    )

    payload = json.loads(build_submission_artifact(snapshots).canonical_bytes)

    assert payload["email_001"]["status"] == "OK"


def test_artifact_blocks_incomplete_bl_comparison_without_fabricating_output():
    snapshots = _complete_snapshots()
    _replace_snapshot(
        snapshots,
        SubmissionCaseSnapshot(
            email_id="email_001",
            case_id=UUID(int=1),
            category="BL_COMPARISON",
            field_snapshots=_field_snapshots()[:-1],
        ),
    )

    with pytest.raises(SubmissionBlockedError) as raised:
        build_submission_artifact(snapshots)

    assert raised.value.blockers == (raised.value.blockers[0],)
    assert raised.value.blockers[0].code is SubmissionBlockerCode.INCOMPLETE_COMPARISON
    assert raised.value.blockers[0].email_id == "email_001"


@pytest.mark.parametrize(
    "payload",
    [
        {
            "field": "shipper",
            "deterministic_result": "MATCH",
            "semantic_probability": 0.9,
        },
        {"field": "shipper"},
        {"field": "shipper", "semantic_probability": -0.01},
        {"field": "shipper", "semantic_probability": 1.01},
    ],
)
def test_field_snapshot_rejects_ambiguous_or_invalid_decision_sources(payload):
    with pytest.raises(ValidationError):
        SubmissionFieldSnapshot.model_validate(payload)


def _scoreboard() -> dict[str, object]:
    categories = [
        "BL_COMPARISON",
        "SI_REQUEST",
        "INVOICE_QUERY",
        "GENERAL",
        "SPAM",
    ]
    return {
        "stage1": {
            "accuracy": 0.9,
            "macro_f1": 0.88,
            "rule_pct": None,
            "per": {category: {"tp": 1, "fp": 0, "fn": 0} for category in categories},
            "confusion": {category: {category: 1} for category in categories},
        },
        "stage3": {
            "defect_precision": 0.8,
            "defect_recall": 0.75,
            "defect_f1": 0.774,
            "field_f1": 0.7,
            "exact_match_rate": 0.65,
            "doc_total": 20,
        },
        "reliability": {
            "escalation_recall": 0.7,
            "escalation_precision": 0.8,
            "escalation_f1": 0.746,
            "gold_review": 10,
            "pred_review": 9,
            "per_reason": {
                "unreadable": {"total": 3, "caught": 2},
                "wrong_doc_type": {"total": 3, "caught": 2},
                "missing_attachment": {"total": 2, "caught": 2},
                "missing_value": {"total": 2, "caught": 1},
            },
        },
        "end_to_end": {"success": 7, "total": 10, "rate": 0.7},
        "weights": {"stage1": 0.3, "stage3": 0.2, "end_to_end": 0.5},
        "final_score": 0.806,
        "n_emails": 520,
    }


@pytest.mark.asyncio
async def test_scorer_posts_exact_locally_validated_artifact():
    artifact = build_submission_artifact(_complete_snapshots())
    received: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        received.append(request)
        return httpx.Response(200, json=_scoreboard())

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await score_submission_artifact(
            artifact,
            endpoint="https://evaluator.test/submit",
            client=client,
        )

    assert result.outcome == "SUCCEEDED"
    assert result.scoreboard is not None
    assert result.scoreboard.final_score == pytest.approx(0.806)
    assert result.safe_failure is None
    assert len(received) == 1
    assert received[0].content == artifact.canonical_bytes
    assert received[0].headers["content-type"] == "application/json"


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [400, 503])
async def test_scorer_retains_safe_http_failure(status_code: int):
    transport = httpx.MockTransport(
        lambda request: httpx.Response(status_code, text="secret server detail")
    )
    async with httpx.AsyncClient(transport=transport) as client:
        result = await score_submission_artifact(
            build_submission_artifact(_complete_snapshots()),
            endpoint="https://evaluator.test/submit",
            client=client,
        )

    assert result.outcome == "FAILED"
    assert result.scoreboard is None
    assert result.safe_failure == f"scorer returned HTTP {status_code}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(200, content=b"not-json"),
        httpx.Response(200, json={"final_score": 1.0}),
    ],
)
async def test_scorer_rejects_invalid_scoreboard(response: httpx.Response):
    transport = httpx.MockTransport(lambda request: response)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await score_submission_artifact(
            build_submission_artifact(_complete_snapshots()),
            endpoint="https://evaluator.test/submit",
            client=client,
        )

    assert result.outcome == "FAILED"
    assert result.scoreboard is None
    assert result.safe_failure == "scorer returned an invalid scoreboard"


@pytest.mark.asyncio
async def test_scorer_retains_safe_timeout_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await score_submission_artifact(
            build_submission_artifact(_complete_snapshots()),
            endpoint="https://evaluator.test/submit",
            client=client,
        )

    assert result.outcome == "FAILED"
    assert result.scoreboard is None
    assert result.safe_failure == "scorer request failed: ReadTimeout"


@pytest.mark.asyncio
async def test_scorer_records_unavailable_when_endpoint_is_not_configured():
    result = await score_submission_artifact(
        build_submission_artifact(_complete_snapshots()), endpoint=None
    )

    assert result.outcome == "UNAVAILABLE"
    assert result.endpoint is None
    assert result.scoreboard is None
    assert result.safe_failure == "organizer scoring endpoint is not configured"


@pytest.mark.asyncio
async def test_scorer_refuses_tampered_artifact_before_http_call():
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, json=_scoreboard())

    artifact = build_submission_artifact(_complete_snapshots())
    tampered = artifact.model_copy(update={"canonical_bytes": b"{}"})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(ValueError, match="artifact hash"):
            await score_submission_artifact(
                tampered,
                endpoint="https://evaluator.test/submit",
                client=client,
            )

    assert calls == 0


def test_a_draft_bl_request_awaiting_documents_submits_ok():
    snapshots = _complete_snapshots()
    _replace_snapshot(
        snapshots,
        SubmissionCaseSnapshot(
            email_id="email_003",
            case_id=UUID(int=3),
            category="BL_COMPARISON",
            awaiting_documents=True,
        ),
    )

    records = json.loads(build_submission_artifact(snapshots).canonical_bytes)

    assert records["email_003"] == {
        "category": "BL_COMPARISON",
        "status": "OK",
        "review_reason": None,
        "defect_fields": [],
        "has_defect": False,
    }


def test_a_comparison_without_verdicts_is_still_blocked():
    snapshots = _complete_snapshots()
    _replace_snapshot(
        snapshots,
        SubmissionCaseSnapshot(
            email_id="email_003", case_id=UUID(int=3), category="BL_COMPARISON"
        ),
    )

    with pytest.raises(SubmissionBlockedError) as error:
        build_submission_artifact(snapshots)

    assert error.value.blockers[0].code is SubmissionBlockerCode.INCOMPLETE_COMPARISON


@pytest.mark.parametrize(
    "shape",
    [
        {"field_snapshots": _field_snapshots()},
        {
            "structural_diagnostics": (
                StructuralDiagnostic(reason="missing_attachment", detail="No SI."),
            )
        },
    ],
)
def test_awaiting_documents_cannot_carry_comparison_results(shape):
    with pytest.raises(ValidationError):
        SubmissionCaseSnapshot(
            email_id="email_003",
            case_id=UUID(int=3),
            category="BL_COMPARISON",
            awaiting_documents=True,
            **shape,
        )
