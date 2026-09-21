"""Review actions on seed cases and reconciliation exceptions.

A guest's first action on a seed record copies it into the guest's own
workspace (see app.materialize) and is recorded on that copy, so the shared
seed and every other guest are unaffected. The whole request is validated
before anything is copied, so an invalid action writes nothing.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.api.deps import GuestDep, MaterializerDep, SeedCatalogDep, ServicesDep
from app.api.errors import ApiProblem
from app.api.views import email_detail_view, reconciliation_row
from app.materialize import seed_email_for_case
from app.persistence import (
    AuditContext,
    ReviewActionInput,
    validate_case_action_input,
)
from app.review import CaseReviewService, ReviewRejected

router = APIRouter(prefix="/api", tags=["actions"])


class CaseActionBody(BaseModel):
    action: Literal["APPROVE", "CORRECT", "REJECT"]
    actor_id: str
    rationale: str
    corrected_fields: dict[str, Any] | None = None


class ExceptionActionBody(BaseModel):
    action: Literal["ASSIGN", "ACKNOWLEDGE", "ESCALATE", "RESOLVE"]
    actor_id: str
    rationale: str
    assigned_owner_id: str | None = None


def _named_reviewer(actor_id: str, rationale: str) -> tuple[str, str]:
    actor_id, rationale = actor_id.strip(), rationale.strip()
    if not actor_id or not rationale:
        raise ApiProblem(
            422,
            "invalid_review_action",
            "A reviewer name and a reason are required.",
        )
    return actor_id, rationale


@router.post("/cases/{case_id}/review-actions")
async def submit_case_action(
    case_id: str,
    body: CaseActionBody,
    request: Request,
    guest: GuestDep,
    services: ServicesDep,
    catalog: SeedCatalogDep,
    materializer: MaterializerDep,
) -> dict[str, object]:
    seed_email = seed_email_for_case(catalog, case_id)
    if seed_email is None:
        raise ApiProblem(404, "case_not_found", "No case exists with that ID.")
    actor_id, rationale = _named_reviewer(body.actor_id, body.rationale)
    try:
        validate_case_action_input(body.action, body.corrected_fields)
    except ValueError as error:
        raise ApiProblem(
            422,
            "invalid_review_action",
            "The corrected fields do not fit this action.",
            details=[str(error)],
        ) from error
    if seed_email.case.disposition != "IN_REVIEW":
        raise ApiProblem(409, "not_in_review", "This case is not held for review.")
    request_id = request.state.request_id
    guest_case_id = await materializer.ensure_case(
        guest, seed_email.email_id, request_id=request_id
    )
    try:
        status = await CaseReviewService(services.persistence).submit(
            workspace_id=guest.workspace_id,
            case_id=guest_case_id,
            action=body.action,
            actor_id=actor_id,
            rationale=rationale,
            corrected_fields=body.corrected_fields,
            request_id=request_id,
            rule_version=services.settings.rule_version,
        )
    except ReviewRejected as rejection:
        # The input was validated above, so a rejection is a race: another
        # decision settled the case, or a reset retired the workspace (this
        # re-read then raises InactiveWorkspace, reported as session_reset).
        current = await services.persistence.get_case_review_status(
            workspace_id=guest.workspace_id, case_id=guest_case_id
        )
        if current.actions:
            raise ApiProblem(
                409, "already_settled", "This case already has a review decision."
            ) from rejection
        raise
    return email_detail_view(seed_email, status)


@router.post("/reconciliation/{reconciliation_id}/actions")
async def submit_exception_action(
    reconciliation_id: UUID,
    body: ExceptionActionBody,
    request: Request,
    guest: GuestDep,
    services: ServicesDep,
    catalog: SeedCatalogDep,
    materializer: MaterializerDep,
) -> dict[str, object]:
    seed_result = next(
        (
            result
            for result in catalog.reconciliation.results
            if result.root.reconciliation_id == reconciliation_id
        ),
        None,
    )
    if seed_result is None:
        raise ApiProblem(
            404,
            "reconciliation_not_found",
            "No reconciliation result exists with that ID.",
        )
    actor_id, rationale = _named_reviewer(body.actor_id, body.rationale)
    owner = (body.assigned_owner_id or "").strip() or None
    if body.action == "ASSIGN" and owner is None:
        raise ApiProblem(
            422, "invalid_review_action", "An assignment needs the new owner's name."
        )
    request_id = request.state.request_id
    guest_reconciliation_id = await materializer.ensure_exception(
        guest, reconciliation_id, request_id=request_id
    )
    try:
        await services.persistence.append_review_action(
            workspace_id=guest.workspace_id,
            action=ReviewActionInput(
                review_action_id=uuid4(),
                target_type="RECONCILIATION_EXCEPTION",
                case_id=None,
                reconciliation_id=guest_reconciliation_id,
                actor_id=actor_id,
                action=body.action,
                rationale=rationale,
                assigned_owner_id=owner,
            ),
            audit=AuditContext(
                request_id=request_id,
                rule_version=services.settings.rule_version,
                actor_kind="REVIEWER",
                actor_id=actor_id,
            ),
        )
    except ValueError as error:
        overlay = (await materializer.exception_overlays(guest)).get(reconciliation_id)
        if overlay is not None and overlay.state == "RESOLVED":
            raise ApiProblem(
                409, "already_resolved", "This exception is already resolved."
            ) from error
        raise
    overlays = await materializer.exception_overlays(guest)
    return reconciliation_row(seed_result, overlays.get(reconciliation_id))
