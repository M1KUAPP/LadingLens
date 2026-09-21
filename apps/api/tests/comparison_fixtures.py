"""Shared PostgreSQL fixtures for building BL_READY comparison cases.

``build_bl_ready_case`` persists the bundle's ``email_001`` SI/BL attachments
and classifies the resulting case as BL_READY, exactly as Gate 1 does. It is
used by the comparison persistence tests and is reusable by later tasks that
also need a case sitting at the comparison gate.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from app.contracts import Category
from app.formats import detect_format
from app.persistence import (
    AttachmentInput,
    AuditContext,
    PersistenceService,
    ReceiptInput,
)

BUNDLE_ATTACHMENTS = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "sdoc-hackathon-bundle"
    / "attachments"
)

_BL_READY_PROBABILITIES = {
    "BL_COMPARISON": 0.96,
    "SI_REQUEST": 0.01,
    "INVOICE_QUERY": 0.01,
    "GENERAL": 0.01,
    "SPAM": 0.01,
}


async def build_bl_ready_case(
    service: PersistenceService,
    workspace_id: UUID,
    *,
    idempotency_key: str = "comparison-fixture",
    assigned_owner_id: str = "bl-owner",
) -> tuple[UUID, UUID]:
    """Persist email_001's SI/BL attachments and classify the case BL_READY.

    Returns ``(email_id, case_id)``.
    """
    si_bytes = (BUNDLE_ATTACHMENTS / "email_001_SI.txt").read_bytes()
    bl_bytes = (BUNDLE_ATTACHMENTS / "email_001_BL.txt").read_bytes()
    audit = AuditContext(
        request_id=f"{idempotency_key}-request", rule_version="rules-1"
    )
    receipt = ReceiptInput(
        source_message_id=f"{idempotency_key}-message",
        received_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
        sender="ops@example.com",
        subject="Draft BL for review",
        message_bytes=f"raw message bytes for {idempotency_key}".encode(),
        body_text="Please compare the attached SI and draft BL.",
        attachments=(
            AttachmentInput(
                file_name="email_001_SI.txt",
                data=si_bytes,
                declared_media_type="text/plain",
                detected_format=detect_format(si_bytes),
            ),
            AttachmentInput(
                file_name="email_001_BL.txt",
                data=bl_bytes,
                declared_media_type="text/plain",
                detected_format=detect_format(bl_bytes),
            ),
        ),
    )
    persisted = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key=idempotency_key,
        receipt=receipt,
        audit=audit,
    )
    case_id = await service.ensure_classification_case(
        workspace_id=workspace_id,
        email_id=persisted.email_id,
        audit=audit,
    )
    when = datetime(2026, 9, 20, 10, 5, tzinfo=UTC)
    await service.record_classification_success(
        case_id=case_id,
        category=Category.BL_COMPARISON,
        category_probabilities=_BL_READY_PROBABILITIES,
        requested_model="jev-1.13.0",
        returned_model="jev-1.13.0",
        provider_request_id="req",
        correlation_id="corr",
        started_at=when,
        completed_at=when,
        audit=audit,
        assigned_owner_id=assigned_owner_id,
    )
    return persisted.email_id, case_id
