"""Run the comparison pipeline for a BL_READY case end to end.

Loads a case's stored attachments, extracts and role-decides them, admits
the SI/draft-BL pair, and records the resulting verdicts or structural
review reason. Every provider call (Gemini, Jev) happens outside a database
transaction; the persistence methods open their own. A provider failure
never fabricates a result: the case is left BL_READY and the run reports
PROVIDER_FAILED with the failure code.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, Protocol
from uuid import UUID, uuid4

from app.comparison import (
    admit_pair,
    compare_fields,
    comparison_output,
    equivalence_questions,
    needs_interactive_review,
    resolve_verdicts,
    structural_output,
)
from app.contracts import EvaluatorOutput
from app.extraction import (
    AttachmentInput,
    DocumentAnalysis,
    DocumentAnalyzer,
    ExtractionFailure,
    GeminiExtractor,
    PersistenceExtractionCache,
    RoleDecider,
)
from app.gemini import KeyAttempt
from app.jev import (
    EQUIVALENCE_PROMPT_VERSION,
    JEV_MODEL,
    ROLE_PROMPT_VERSION,
    EquivalenceQuestion,
    JevEquivalence,
    JevProviderFailure,
)
from app.normalization import NORMALIZATION_VERSION
from app.persistence import (
    AuditContext,
    DocumentRoleDecisionInput,
    PersistenceService,
    ReviewAssignmentInput,
)


class EquivalenceJudge(Protocol):
    async def judge(
        self,
        questions: Sequence[EquivalenceQuestion],
        *,
        correlation_id: str | None = None,
    ) -> list[JevEquivalence]: ...


@dataclass(frozen=True, slots=True)
class ComparisonRun:
    case_id: UUID
    state: Literal["COMPARED", "NEEDS_REVIEW", "PROVIDER_FAILED"]
    evaluator_output: EvaluatorOutput | None
    failure_code: str | None
    retryable: bool | None
    analyses: tuple[DocumentAnalysis, ...]


def _model_version(analyses: Sequence[DocumentAnalysis]) -> str:
    gemini_versions = {
        analysis.model_version
        for analysis in analyses
        if analysis.model_version is not None
    }
    return "; ".join(sorted({JEV_MODEL} | gemini_versions))


def _used_second_key(attempts: Sequence[KeyAttempt]) -> bool:
    seen_rate_limited = False
    for attempt in attempts:
        if attempt.outcome == "RATE_LIMITED":
            seen_rate_limited = True
        elif attempt.outcome == "SUCCEEDED" and seen_rate_limited:
            return True
    return False


def _serialize_attempts(attempts: Sequence[KeyAttempt]) -> list[dict[str, object]]:
    return [
        {
            "key_index": attempt.key_index,
            "outcome": attempt.outcome,
            "status_code": attempt.status_code,
        }
        for attempt in attempts
    ]


class ComparisonPipeline:
    """Compare a BL_READY case's SI/draft-BL pair and record the verdict."""

    def __init__(
        self,
        persistence: PersistenceService,
        *,
        roles: RoleDecider,
        gemini: GeminiExtractor,
        equivalence: EquivalenceJudge,
        gemini_model: str = "gemini-3.5-flash",
    ) -> None:
        self._persistence = persistence
        self._roles = roles
        self._gemini = gemini
        self._equivalence = equivalence
        self._gemini_model = gemini_model

    async def run_case(
        self, *, workspace_id: UUID, case_id: UUID, audit: AuditContext
    ) -> ComparisonRun:
        documents = await self._persistence.load_case_documents(
            workspace_id=workspace_id, case_id=case_id
        )
        if documents.classification_state != "BL_READY":
            raise ValueError("case is not awaiting comparison")

        analyzer = DocumentAnalyzer(
            roles=self._roles,
            gemini=self._gemini,
            cache=PersistenceExtractionCache(
                self._persistence, workspace_id=workspace_id, audit=audit
            ),
            gemini_model=self._gemini_model,
        )
        attachments = [
            AttachmentInput(
                attachment_id=str(stored.attachment_id),
                file_name=stored.file_name,
                data=stored.data,
            )
            for stored in documents.attachments
        ]
        started_at = datetime.now(UTC)
        analyses = await analyzer.analyze(attachments, correlation_id=audit.request_id)
        completed_at = datetime.now(UTC)

        await self._record_role_decisions(
            workspace_id=workspace_id,
            analyses=analyses,
            started_at=started_at,
            completed_at=completed_at,
            audit=audit,
        )
        await self._record_extraction_events(
            workspace_id=workspace_id, analyses=analyses, audit=audit
        )

        admission = admit_pair(analyses)
        if admission.blocking_failure is not None:
            failure = admission.blocking_failure
            return ComparisonRun(
                case_id=case_id,
                state="PROVIDER_FAILED",
                evaluator_output=None,
                failure_code=failure.code.value,
                retryable=failure.retryable,
                analyses=analyses,
            )

        model_version = _model_version(analyses)

        if admission.diagnostics:
            output = structural_output(admission.diagnostics)
            await self._persistence.record_comparison_result(
                case_id=case_id,
                evaluator_output=output,
                field_verdicts=(),
                structural_diagnostics=admission.diagnostics,
                model_version=model_version,
                prompt_version=EQUIVALENCE_PROMPT_VERSION,
                normalization_version=NORMALIZATION_VERSION,
                audit=audit,
            )
            await self._assign_case_review(
                workspace_id=workspace_id,
                case_id=case_id,
                owner=documents.assigned_owner_id,
                audit=audit,
            )
            return ComparisonRun(
                case_id=case_id,
                state="NEEDS_REVIEW",
                evaluator_output=output,
                failure_code=None,
                retryable=None,
                analyses=analyses,
            )

        drafts = compare_fields(admission)
        questions = equivalence_questions(drafts)
        equivalences: list[JevEquivalence] = []
        if questions:
            try:
                equivalences = await self._equivalence.judge(
                    questions, correlation_id=audit.request_id
                )
            except JevProviderFailure as failure:
                return ComparisonRun(
                    case_id=case_id,
                    state="PROVIDER_FAILED",
                    evaluator_output=None,
                    failure_code=failure.code.value,
                    retryable=failure.retryable,
                    analyses=analyses,
                )

        verdicts = resolve_verdicts(drafts, equivalences)
        output = comparison_output(verdicts)
        await self._persistence.record_comparison_result(
            case_id=case_id,
            evaluator_output=output,
            field_verdicts=verdicts,
            structural_diagnostics=(),
            model_version=model_version,
            prompt_version=EQUIVALENCE_PROMPT_VERSION,
            normalization_version=NORMALIZATION_VERSION,
            audit=audit,
        )
        if needs_interactive_review(verdicts):
            await self._assign_case_review(
                workspace_id=workspace_id,
                case_id=case_id,
                owner=documents.assigned_owner_id,
                audit=audit,
            )
        return ComparisonRun(
            case_id=case_id,
            state="COMPARED",
            evaluator_output=output,
            failure_code=None,
            retryable=None,
            analyses=analyses,
        )

    async def run_pending(
        self, *, workspace_id: UUID, audit: AuditContext
    ) -> tuple[ComparisonRun, ...]:
        case_ids = await self._persistence.list_cases_awaiting_comparison(
            workspace_id=workspace_id
        )
        runs = [
            await self.run_case(workspace_id=workspace_id, case_id=case_id, audit=audit)
            for case_id in case_ids
        ]
        return tuple(runs)

    async def _assign_case_review(
        self, *, workspace_id: UUID, case_id: UUID, owner: str, audit: AuditContext
    ) -> None:
        await self._persistence.append_review_assignment(
            workspace_id=workspace_id,
            assignment=ReviewAssignmentInput(
                review_assignment_id=uuid4(),
                target_type="CASE",
                case_id=case_id,
                reconciliation_id=None,
                assigned_owner_id=owner,
                state="ASSIGNED",
            ),
            audit=audit,
        )

    async def _record_role_decisions(
        self,
        *,
        workspace_id: UUID,
        analyses: Sequence[DocumentAnalysis],
        started_at: datetime,
        completed_at: datetime,
        audit: AuditContext,
    ) -> None:
        for analysis in analyses:
            if analysis.role is not None:
                decision = DocumentRoleDecisionInput(
                    attachment_id=UUID(analysis.attachment_id),
                    content_hash=analysis.preflight.content_hash,
                    outcome="SUCCEEDED",
                    role=analysis.role.role.value,
                    role_probabilities=analysis.role.probabilities,
                    requested_model=JEV_MODEL,
                    returned_model=analysis.role.returned_model,
                    prompt_version=ROLE_PROMPT_VERSION,
                    provider_request_id=analysis.role.provider_request_id,
                    correlation_id=analysis.role.correlation_id,
                    safe_diagnostic=None,
                    retryable=None,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            elif isinstance(analysis.failure, JevProviderFailure):
                failure = analysis.failure
                decision = DocumentRoleDecisionInput(
                    attachment_id=UUID(analysis.attachment_id),
                    content_hash=analysis.preflight.content_hash,
                    outcome="PROVIDER_FAILED",
                    role=None,
                    role_probabilities=None,
                    requested_model=JEV_MODEL,
                    returned_model=None,
                    prompt_version=ROLE_PROMPT_VERSION,
                    provider_request_id=failure.provider_request_id,
                    correlation_id=failure.correlation_id,
                    safe_diagnostic=failure.code.value,
                    retryable=failure.retryable,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            else:
                continue
            await self._persistence.record_document_role_decision(
                workspace_id=workspace_id, decision=decision, audit=audit
            )

    async def _record_extraction_events(
        self,
        *,
        workspace_id: UUID,
        analyses: Sequence[DocumentAnalysis],
        audit: AuditContext,
    ) -> None:
        for analysis in analyses:
            content_hash = analysis.preflight.content_hash
            if _used_second_key(analysis.key_attempts):
                await self._persistence.record_extraction_event(
                    workspace_id=workspace_id,
                    content_hash=content_hash,
                    event_type="GEMINI_SECOND_KEY_USED",
                    payload={"attempts": _serialize_attempts(analysis.key_attempts)},
                    audit=audit,
                )
            if isinstance(analysis.failure, ExtractionFailure):
                failure = analysis.failure
                await self._persistence.record_extraction_event(
                    workspace_id=workspace_id,
                    content_hash=content_hash,
                    event_type="EXTRACTION_FAILED",
                    payload={
                        "code": failure.code.value,
                        "retryable": failure.retryable,
                        "attempts": _serialize_attempts(failure.key_attempts),
                    },
                    audit=audit,
                )
