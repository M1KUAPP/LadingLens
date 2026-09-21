"""Named-reviewer dispositions for cases held for review."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID, uuid4

from app.persistence import (
    AuditContext,
    CaseReviewStatus,
    PersistenceService,
    ReviewActionInput,
)

CaseAction = Literal["APPROVE", "CORRECT", "REJECT"]


class ReviewRejected(ValueError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class CaseReviewService:
    def __init__(self, persistence: PersistenceService) -> None:
        self._persistence = persistence

    async def submit(
        self,
        *,
        workspace_id: UUID,
        case_id: UUID,
        action: CaseAction,
        actor_id: str,
        rationale: str,
        corrected_fields: dict[str, Any] | None,
        request_id: str,
        rule_version: str,
    ) -> CaseReviewStatus:
        actor_id, rationale = actor_id.strip(), rationale.strip()
        if not actor_id or not rationale:
            raise ReviewRejected("A reviewer name and a reason are required")
        audit = AuditContext(
            request_id=request_id,
            rule_version=rule_version,
            actor_kind="REVIEWER",
            actor_id=actor_id,
        )
        try:
            await self._persistence.append_review_action(
                workspace_id=workspace_id,
                action=ReviewActionInput(
                    review_action_id=uuid4(),
                    target_type="CASE",
                    case_id=case_id,
                    reconciliation_id=None,
                    actor_id=actor_id,
                    action=action,
                    rationale=rationale,
                    corrected_fields=corrected_fields,
                ),
                audit=audit,
            )
        except ValueError as error:
            raise ReviewRejected(str(error)) from error
        return await self._persistence.get_case_review_status(
            workspace_id=workspace_id, case_id=case_id
        )
