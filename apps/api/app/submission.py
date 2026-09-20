import json
from collections.abc import AsyncIterator, Iterable
from contextlib import asynccontextmanager
from enum import StrEnum
from hashlib import sha256
from typing import Literal, Self
from uuid import UUID

import httpx
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.contracts import (
    Category,
    ComparedField,
    EvaluatorOutput,
    ReviewReason,
    serialize_evaluator_output,
)

EXPECTED_EMAIL_IDS = tuple(f"email_{index:03d}" for index in range(1, 521))
_EXPECTED_EMAIL_ID_SET = frozenset(EXPECTED_EMAIL_IDS)
_STRUCTURAL_PRECEDENCE = (
    ReviewReason.UNREADABLE,
    ReviewReason.WRONG_DOC_TYPE,
    ReviewReason.MISSING_ATTACHMENT,
    ReviewReason.MISSING_VALUE,
)


class _FrozenModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class StructuralDiagnostic(_FrozenModel):
    reason: ReviewReason
    detail: str = Field(min_length=1)
    attachment_id: str | None = Field(default=None, min_length=1)
    document_role: Literal["SI", "DRAFT_BL", "OTHER"] | None = None
    source_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    parser_route: str | None = Field(default=None, min_length=1)
    parser_version: str | None = Field(default=None, min_length=1)
    provider_request_id: str | None = Field(default=None, min_length=1)


class SubmissionFieldSnapshot(_FrozenModel):
    field: ComparedField
    deterministic_result: Literal["MATCH", "MISMATCH"] | None = None
    semantic_probability: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def has_exactly_one_decision_source(self) -> Self:
        sources = (
            self.deterministic_result is not None,
            self.semantic_probability is not None,
        )
        if sum(sources) != 1:
            raise ValueError(
                "field snapshot requires exactly one deterministic result or "
                "semantic probability"
            )
        return self

    @property
    def batch_result(self) -> Literal["MATCH", "MISMATCH"]:
        if self.semantic_probability is not None:
            return "MATCH" if self.semantic_probability >= 0.85 else "MISMATCH"
        if self.deterministic_result is None:  # pragma: no cover - validator invariant
            raise RuntimeError("field snapshot has no decision source")
        return self.deterministic_result


class SubmissionCaseSnapshot(_FrozenModel):
    email_id: str = Field(pattern=r"^email_[0-9]{3}$")
    case_id: UUID
    category: Category
    structural_diagnostics: tuple[StructuralDiagnostic, ...] = ()
    field_snapshots: tuple[SubmissionFieldSnapshot, ...] = ()

    @model_validator(mode="after")
    def snapshot_shape_is_unambiguous(self) -> Self:
        fields = [snapshot.field for snapshot in self.field_snapshots]
        if len(fields) != len(set(fields)):
            raise ValueError("field snapshots must be unique by field")
        if self.category is not Category.BL_COMPARISON and (
            self.structural_diagnostics or self.field_snapshots
        ):
            raise ValueError(
                "non-comparison snapshots cannot contain structural or field results"
            )
        if self.structural_diagnostics and self.field_snapshots:
            raise ValueError(
                "a structural review snapshot cannot contain comparison results"
            )
        return self


class SubmissionBlockerCode(StrEnum):
    MISSING_CATEGORY = "MISSING_CATEGORY"
    PROVIDER_FAILURE = "PROVIDER_FAILURE"
    SCHEMA_FAILURE = "SCHEMA_FAILURE"
    DUPLICATE_EMAIL_ID = "DUPLICATE_EMAIL_ID"
    INCOMPLETE_EMAIL_SET = "INCOMPLETE_EMAIL_SET"
    UNEXPECTED_EMAIL_ID = "UNEXPECTED_EMAIL_ID"
    INCOMPLETE_COMPARISON = "INCOMPLETE_COMPARISON"


class SubmissionBlocker(_FrozenModel):
    code: SubmissionBlockerCode
    message: str = Field(min_length=1)
    email_id: str | None = None


class SubmissionBlockedError(ValueError):
    def __init__(self, blockers: Iterable[SubmissionBlocker]) -> None:
        self.blockers = tuple(blockers)
        if not self.blockers:
            raise ValueError("SubmissionBlockedError requires at least one blocker")
        super().__init__("; ".join(blocker.message for blocker in self.blockers))


class SubmissionArtifact(_FrozenModel):
    canonical_bytes: bytes
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    record_count: Literal[520]


class ScoreCounts(_FrozenModel):
    tp: int = Field(ge=0)
    fp: int = Field(ge=0)
    fn: int = Field(ge=0)


class Stage1Score(_FrozenModel):
    accuracy: float = Field(ge=0.0, le=1.0)
    macro_f1: float = Field(ge=0.0, le=1.0)
    rule_pct: float | None = Field(ge=0.0, le=1.0)
    per: dict[Category, ScoreCounts]
    confusion: dict[Category, dict[Category, int]]

    @model_validator(mode="after")
    def contains_all_categories(self) -> Self:
        expected = set(Category)
        if set(self.per) != expected or set(self.confusion) != expected:
            raise ValueError("stage1 category maps must contain all categories")
        for predicted_counts in self.confusion.values():
            if not set(predicted_counts) <= expected:
                raise ValueError("confusion matrix contains an unknown category")
            if any(count < 0 for count in predicted_counts.values()):
                raise ValueError("confusion matrix counts cannot be negative")
        return self


class Stage3Score(_FrozenModel):
    defect_precision: float = Field(ge=0.0, le=1.0)
    defect_recall: float = Field(ge=0.0, le=1.0)
    defect_f1: float = Field(ge=0.0, le=1.0)
    field_f1: float = Field(ge=0.0, le=1.0)
    exact_match_rate: float = Field(ge=0.0, le=1.0)
    doc_total: int = Field(ge=0)


class ReviewReasonScore(_FrozenModel):
    total: int = Field(ge=0)
    caught: int = Field(ge=0)

    @model_validator(mode="after")
    def caught_does_not_exceed_total(self) -> Self:
        if self.caught > self.total:
            raise ValueError("caught review reasons cannot exceed total")
        return self


class ReliabilityScore(_FrozenModel):
    escalation_recall: float = Field(ge=0.0, le=1.0)
    escalation_precision: float = Field(ge=0.0, le=1.0)
    escalation_f1: float = Field(ge=0.0, le=1.0)
    gold_review: int = Field(ge=0)
    pred_review: int = Field(ge=0)
    per_reason: dict[ReviewReason, ReviewReasonScore]

    @model_validator(mode="after")
    def contains_all_review_reasons(self) -> Self:
        if set(self.per_reason) != set(ReviewReason):
            raise ValueError("reliability must contain every structural review reason")
        return self


class EndToEndScore(_FrozenModel):
    success: int = Field(ge=0)
    total: int = Field(ge=0)
    rate: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def success_does_not_exceed_total(self) -> Self:
        if self.success > self.total:
            raise ValueError("end-to-end success cannot exceed total")
        return self


class ScoreWeights(_FrozenModel):
    stage1: float = Field(ge=0.0, le=1.0)
    stage3: float = Field(ge=0.0, le=1.0)
    end_to_end: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> Self:
        if abs(self.stage1 + self.stage3 + self.end_to_end - 1.0) > 1e-9:
            raise ValueError("score weights must sum to one")
        return self


class SubmissionScoreboard(_FrozenModel):
    stage1: Stage1Score
    stage3: Stage3Score
    reliability: ReliabilityScore
    end_to_end: EndToEndScore
    weights: ScoreWeights
    final_score: float = Field(ge=0.0, le=1.0)
    n_emails: Literal[520]


class SubmissionScoreResult(_FrozenModel):
    endpoint: str | None
    outcome: Literal["SUCCEEDED", "FAILED", "UNAVAILABLE"]
    scoreboard: SubmissionScoreboard | None = None
    safe_failure: str | None = None

    @model_validator(mode="after")
    def result_shape_matches_outcome(self) -> Self:
        if self.outcome == "SUCCEEDED":
            if self.scoreboard is None or self.safe_failure is not None:
                raise ValueError("successful scoring requires only a scoreboard")
        elif self.scoreboard is not None or not self.safe_failure:
            raise ValueError("unsuccessful scoring requires only a safe failure")
        return self


def select_structural_review_reason(
    diagnostics: Iterable[StructuralDiagnostic],
) -> ReviewReason | None:
    present = {diagnostic.reason for diagnostic in diagnostics}
    return next(
        (reason for reason in _STRUCTURAL_PRECEDENCE if reason in present), None
    )


def _output_for_snapshot(snapshot: SubmissionCaseSnapshot) -> EvaluatorOutput:
    if snapshot.category is not Category.BL_COMPARISON:
        return EvaluatorOutput(
            category=snapshot.category,
            status="OK",
            review_reason=None,
            defect_fields=[],
            has_defect=False,
        )

    structural_reason = select_structural_review_reason(snapshot.structural_diagnostics)
    if structural_reason is not None:
        return EvaluatorOutput(
            category=snapshot.category,
            status="NEEDS_REVIEW",
            review_reason=structural_reason,
            defect_fields=[],
            has_defect=False,
        )

    snapshots_by_field = {
        field_snapshot.field: field_snapshot
        for field_snapshot in snapshot.field_snapshots
    }
    missing_fields = [
        field.value for field in ComparedField if field not in snapshots_by_field
    ]
    if missing_fields:
        raise SubmissionBlockedError(
            (
                SubmissionBlocker(
                    code=SubmissionBlockerCode.INCOMPLETE_COMPARISON,
                    email_id=snapshot.email_id,
                    message=(
                        f"{snapshot.email_id} is missing comparison verdicts for: "
                        f"{', '.join(missing_fields)}"
                    ),
                ),
            )
        )

    defect_fields = [
        field
        for field in ComparedField
        if snapshots_by_field[field].batch_result == "MISMATCH"
    ]
    return EvaluatorOutput(
        category=snapshot.category,
        status="MISMATCH" if defect_fields else "OK",
        review_reason=None,
        defect_fields=defect_fields,
        has_defect=bool(defect_fields),
    )


def build_submission_artifact(
    snapshots: Iterable[SubmissionCaseSnapshot],
) -> SubmissionArtifact:
    snapshots_by_id: dict[str, SubmissionCaseSnapshot] = {}
    blockers: list[SubmissionBlocker] = []
    for snapshot in snapshots:
        if snapshot.email_id in snapshots_by_id:
            blockers.append(
                SubmissionBlocker(
                    code=SubmissionBlockerCode.DUPLICATE_EMAIL_ID,
                    email_id=snapshot.email_id,
                    message=f"duplicate snapshot for {snapshot.email_id}",
                )
            )
            continue
        snapshots_by_id[snapshot.email_id] = snapshot
        if snapshot.email_id not in _EXPECTED_EMAIL_ID_SET:
            blockers.append(
                SubmissionBlocker(
                    code=SubmissionBlockerCode.UNEXPECTED_EMAIL_ID,
                    email_id=snapshot.email_id,
                    message=f"unexpected email ID: {snapshot.email_id}",
                )
            )

    missing_ids = [
        email_id for email_id in EXPECTED_EMAIL_IDS if email_id not in snapshots_by_id
    ]
    if missing_ids:
        blockers.append(
            SubmissionBlocker(
                code=SubmissionBlockerCode.INCOMPLETE_EMAIL_SET,
                message=f"missing expected email IDs: {', '.join(missing_ids)}",
            )
        )

    records: dict[str, dict[str, object]] = {}
    for email_id in EXPECTED_EMAIL_IDS:
        snapshot = snapshots_by_id.get(email_id)
        if snapshot is None:
            continue
        try:
            records[email_id] = serialize_evaluator_output(
                _output_for_snapshot(snapshot)
            )
        except SubmissionBlockedError as error:
            blockers.extend(error.blockers)

    if blockers:
        raise SubmissionBlockedError(blockers)

    canonical_bytes = json.dumps(
        records,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return SubmissionArtifact(
        canonical_bytes=canonical_bytes,
        sha256=sha256(canonical_bytes).hexdigest(),
        record_count=len(records),
    )


def validate_submission_artifact(artifact: SubmissionArtifact) -> dict[str, object]:
    if sha256(artifact.canonical_bytes).hexdigest() != artifact.sha256:
        raise ValueError("artifact hash does not match its canonical bytes")
    try:
        raw = json.loads(artifact.canonical_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("artifact is not valid UTF-8 JSON") from error
    if not isinstance(raw, dict) or list(raw) != list(EXPECTED_EMAIL_IDS):
        raise ValueError("artifact does not contain the exact ordered email manifest")

    validated: dict[str, object] = {}
    for email_id in EXPECTED_EMAIL_IDS:
        output = EvaluatorOutput.model_validate(raw[email_id])
        validated[email_id] = serialize_evaluator_output(output)
    canonical_bytes = json.dumps(
        validated,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    ).encode("utf-8")
    if canonical_bytes != artifact.canonical_bytes:
        raise ValueError("artifact bytes are not in canonical submission form")
    return validated


@asynccontextmanager
async def _scoring_client(
    client: httpx.AsyncClient | None,
) -> AsyncIterator[httpx.AsyncClient]:
    if client is not None:
        yield client
        return
    async with httpx.AsyncClient(timeout=30.0) as owned_client:
        yield owned_client


async def score_submission_artifact(
    artifact: SubmissionArtifact,
    *,
    endpoint: str | None,
    client: httpx.AsyncClient | None = None,
) -> SubmissionScoreResult:
    validate_submission_artifact(artifact)
    if endpoint is None or not endpoint.strip():
        return SubmissionScoreResult(
            endpoint=None,
            outcome="UNAVAILABLE",
            safe_failure="organizer scoring endpoint is not configured",
        )

    normalized_endpoint = endpoint.strip()
    try:
        async with _scoring_client(client) as scorer:
            response = await scorer.post(
                normalized_endpoint,
                content=artifact.canonical_bytes,
                headers={"Content-Type": "application/json"},
            )
    except httpx.RequestError as error:
        return SubmissionScoreResult(
            endpoint=normalized_endpoint,
            outcome="FAILED",
            safe_failure=f"scorer request failed: {type(error).__name__}",
        )

    if response.status_code < 200 or response.status_code >= 300:
        return SubmissionScoreResult(
            endpoint=normalized_endpoint,
            outcome="FAILED",
            safe_failure=f"scorer returned HTTP {response.status_code}",
        )
    try:
        scoreboard = SubmissionScoreboard.model_validate(response.json())
    except (ValueError, json.JSONDecodeError):
        return SubmissionScoreResult(
            endpoint=normalized_endpoint,
            outcome="FAILED",
            safe_failure="scorer returned an invalid scoreboard",
        )
    return SubmissionScoreResult(
        endpoint=normalized_endpoint,
        outcome="SUCCEEDED",
        scoreboard=scoreboard,
    )
