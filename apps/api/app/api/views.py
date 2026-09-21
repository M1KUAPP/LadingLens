"""Pure mappers from seed records to the `/api` contract shapes.

Each mapper takes an optional guest-overlay record alongside the seed data.
Until Task 5 lands copy-on-write actions, callers always pass ``None``: the
seed disposition and an empty history are shown. Once a guest workspace
holds a materialized copy of a case, its overlay's disposition and actions
win, exactly as written here.
"""

from __future__ import annotations

from typing import Any

from app.contracts import (
    Category,
    FieldVerdict,
    ReconciliationOutcome,
    ReconciliationResult,
    ReviewReason,
    Status,
)
from app.persistence import CaseReviewStatus, ReconciliationExceptionState
from app.seed_catalog import (
    SEED_VERSION,
    SeedAttachment,
    SeedCase,
    SeedCatalog,
    SeedEmail,
)

_HELD_DISPOSITIONS = {"IN_REVIEW", "APPROVED", "CORRECTED", "REJECTED"}


def _document_type(role: str | None) -> str:
    return role if role in {"SI", "DRAFT_BL"} else "UNKNOWN"


def _parse_state(attachment: SeedAttachment, case: SeedCase) -> tuple[str, str | None]:
    if attachment.detected_format == "unknown":
        return "REJECTED", "File type is not TXT, PDF, DOCX, or XLSX"
    diagnostic = next(
        (
            item
            for item in case.structural_diagnostics
            if item.reason is ReviewReason.UNREADABLE
            and item.attachment_id == attachment.attachment_id
        ),
        None,
    )
    if diagnostic is not None:
        return "UNREADABLE", diagnostic.detail
    return "PARSED", None


def _attachment_view(attachment: SeedAttachment, case: SeedCase) -> dict[str, Any]:
    parse_state, error = _parse_state(attachment, case)
    role = case.analyses_roles.get(attachment.attachment_id)
    return {
        "attachment_id": attachment.attachment_id,
        "file_name": attachment.file_name,
        "detected_format": attachment.detected_format,
        "document_type": _document_type(role),
        "parse_state": parse_state,
        "byte_size": attachment.byte_size,
        "error": error,
    }


def _field_verdict_view(verdict: FieldVerdict) -> dict[str, Any]:
    return {
        "field": verdict.field.value,
        "si": verdict.si.model_dump(mode="json"),
        "draft_bl": verdict.draft_bl.model_dump(mode="json"),
        "verdict": verdict.interactive_state,
        "semantic_probability": verdict.semantic_probability,
        "reason": verdict.reason,
    }


def _held_review_evidence(case: SeedCase) -> tuple[str, float | None]:
    """The one-line reason a case is held, and the probability driving it.

    A case is held either because of a structural diagnostic (a missing,
    unreadable, or wrong-type attachment, or a missing value) or because a
    field's semantic probability fell in the interactive review band; the
    two never happen together for the same case.
    """
    if case.structural_diagnostics:
        return case.structural_diagnostics[0].detail, None
    review_verdicts = [
        verdict
        for verdict in case.field_verdicts
        if verdict.interactive_state == "REVIEW"
    ]
    lowest = min(review_verdicts, key=lambda verdict: verdict.semantic_probability)
    return lowest.reason, lowest.semantic_probability


def _held_review(
    seed_email: SeedEmail, overlay: CaseReviewStatus | None
) -> dict[str, Any] | None:
    case = seed_email.case
    disposition = overlay.disposition if overlay is not None else case.disposition
    if disposition not in _HELD_DISPOSITIONS:
        return None
    evidence_summary, probability = _held_review_evidence(case)
    actions = overlay.actions if overlay is not None else ()
    return {
        "case_id": case.case_id,
        "email_id": seed_email.email_id,
        "status": case.evaluator_output.status.value,
        "review_reason": (
            case.evaluator_output.review_reason.value
            if case.evaluator_output.review_reason is not None
            else None
        ),
        "probability": probability,
        "assigned_owner": case.assigned_owner_id,
        "disposition": disposition,
        "immutable_source": {
            "email_id": seed_email.email_id,
            "sender": seed_email.sender,
            "subject": seed_email.subject,
            "received_at": seed_email.received_at.isoformat(),
            "message_hash": seed_email.message_hash,
        },
        "evidence_summary": evidence_summary,
        "history": [
            {
                "id": str(action.review_action_id),
                "timestamp": action.created_at.isoformat(),
                "actor": action.actor_id,
                "action": action.action,
                "note": action.rationale,
            }
            for action in actions
        ],
    }


def inbox_row(
    seed_email: SeedEmail, overlay: CaseReviewStatus | None
) -> dict[str, Any]:
    case = seed_email.case
    disposition = overlay.disposition if overlay is not None else case.disposition
    return {
        "email_id": seed_email.email_id,
        "sender": seed_email.sender,
        "subject": seed_email.subject,
        "attachments": [item.file_name for item in seed_email.attachments],
        "outcome": case.evaluator_output.model_dump(mode="json"),
        "disposition": disposition,
        "source": case.decision_source,
    }


def email_detail_view(
    seed_email: SeedEmail, overlay: CaseReviewStatus | None
) -> dict[str, Any]:
    case = seed_email.case
    return {
        "email_id": seed_email.email_id,
        "source": case.decision_source,
        "is_prepared": case.decision_source == "prepared",
        "category": case.category.value,
        "status": case.evaluator_output.status.value,
        "review_reason": (
            case.evaluator_output.review_reason.value
            if case.evaluator_output.review_reason is not None
            else None
        ),
        "sender": seed_email.sender,
        "subject": seed_email.subject,
        "received_at": seed_email.received_at.isoformat(),
        "attachments": [
            _attachment_view(item, case) for item in seed_email.attachments
        ],
        "field_verdicts": [
            _field_verdict_view(verdict) for verdict in case.field_verdicts
        ],
        "held_review": _held_review(seed_email, overlay),
    }


def reconciliation_row(
    result: ReconciliationResult, overlay: ReconciliationExceptionState | None
) -> dict[str, Any]:
    root = result.root
    assignment = (
        {"assigned_owner_id": overlay.assigned_owner_id, "state": overlay.state}
        if overlay is not None
        else None
    )
    return {
        "reconciliation_id": str(root.reconciliation_id),
        "outcome": root.outcome,
        "subject_key": root.subject_key,
        "shipment_id": getattr(root, "shipment_id", None),
        "case_ids": list(getattr(root, "case_ids", ())),
        "candidate_shipment_ids": list(getattr(root, "candidate_shipment_ids", ())),
        "candidate_case_ids": list(getattr(root, "candidate_case_ids", ())),
        "match_basis": list(root.match_basis),
        "source_freshness": root.source_freshness,
        "assignment": assignment,
        "history": [],
    }


def gate_summary(catalog: SeedCatalog) -> dict[str, Any]:
    emails = catalog.emails.values()
    by_category = {category.value: 0 for category in Category}
    comparison = {status.value: 0 for status in Status}
    for email in emails:
        by_category[email.case.category.value] += 1
        comparison[email.case.evaluator_output.status.value] += 1
    outcomes = {outcome.value: 0 for outcome in ReconciliationOutcome}
    for result in catalog.reconciliation.results:
        outcomes[result.root.outcome] += 1
    return {
        "seed_version": SEED_VERSION,
        "source": catalog.decision_source,
        "gate1": {
            "received": len(catalog.emails),
            "accounted": len(catalog.emails),
            "by_category": by_category,
        },
        "comparison": comparison,
        "gate2": {
            "shipments": len(catalog.reconciliation.shipments),
            "outcomes": outcomes,
        },
    }
