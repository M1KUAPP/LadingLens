from uuid import uuid4

import pytest

from app.persistence import CaseReviewStatus
from app.review import CaseReviewService, ReviewRejected


class _Persistence:
    def __init__(self, error=None):
        self.error, self.actions, self.audits = error, [], []

    async def append_review_action(self, *, workspace_id, action, audit):
        if self.error:
            raise self.error
        self.actions.append(action)
        self.audits.append(audit)
        return action.review_action_id

    async def get_case_review_status(self, *, workspace_id, case_id):
        return CaseReviewStatus(
            case_id=case_id,
            classification_state="CLASSIFIED",
            status=None,
            review_reason=None,
            assigned_owner_id="owner",
            review_fields=(),
            disposition="APPROVED",
            actions=(),
        )


@pytest.mark.asyncio
async def test_submit_records_a_reviewer_action_append_only():
    persistence = _Persistence()
    case_id = uuid4()
    status = await CaseReviewService(persistence).submit(
        workspace_id=uuid4(),
        case_id=case_id,
        action="CORRECT",
        actor_id=" reviewer-1 ",
        rationale=" SI weight was mistyped ",
        corrected_fields={"gross_weight_kg": 21577},
        request_id="req-1",
        rule_version="gate-2-v1",
    )

    action = persistence.actions[0]
    assert (action.target_type, action.case_id, action.action) == (
        "CASE",
        case_id,
        "CORRECT",
    )
    assert (action.actor_id, action.rationale) == (
        "reviewer-1",
        "SI weight was mistyped",
    )
    assert action.corrected_fields == {"gross_weight_kg": 21577}
    assert persistence.audits[0].actor_kind == "REVIEWER"
    assert persistence.audits[0].actor_id == "reviewer-1"
    assert status.disposition == "APPROVED"


@pytest.mark.asyncio
async def test_persistence_refusal_becomes_a_review_rejection():
    service = CaseReviewService(_Persistence(ValueError("case is not awaiting review")))
    with pytest.raises(ReviewRejected) as caught:
        await service.submit(
            workspace_id=uuid4(),
            case_id=uuid4(),
            action="APPROVE",
            actor_id="r",
            rationale="ok",
            corrected_fields=None,
            request_id="q",
            rule_version="v",
        )
    assert caught.value.message == "case is not awaiting review"


@pytest.mark.asyncio
@pytest.mark.parametrize("actor, rationale", [("", "why"), ("r", "  ")])
async def test_blank_actor_or_rationale_is_rejected_before_writing(actor, rationale):
    persistence = _Persistence()
    with pytest.raises(ReviewRejected):
        await CaseReviewService(persistence).submit(
            workspace_id=uuid4(),
            case_id=uuid4(),
            action="REJECT",
            actor_id=actor,
            rationale=rationale,
            corrected_fields=None,
            request_id="q",
            rule_version="v",
        )
    assert persistence.actions == []
