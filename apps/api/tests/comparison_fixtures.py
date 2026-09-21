"""Shared PostgreSQL fixtures for building BL_READY comparison cases.

``build_bl_ready_case`` persists the bundle's ``email_001`` SI/BL attachments
and classifies the resulting case as BL_READY, exactly as Gate 1 does. It is
used by the comparison persistence tests and is reusable by later tasks that
also need a case sitting at the comparison gate.

``FailingRoleDecider``, ``FailingEquivalence``, and
``rate_limited_then_succeeded_scan`` are the Jev/Gemini provider fakes
shared by the pipeline and provider-failure-matrix tests.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID

from app.contracts import Category, ComparedField
from app.formats import detect_format
from app.gemini import KeyAttempt
from app.jev import JevFailureCode, JevProviderFailure
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

_MEDIA_TYPES = {"txt": "text/plain", "pdf": "application/pdf"}


async def build_bl_ready_case(
    service: PersistenceService,
    workspace_id: UUID,
    *,
    idempotency_key: str = "comparison-fixture",
    assigned_owner_id: str = "bl-owner",
    si_file: str = "email_001_SI.txt",
    bl_file: str = "email_001_BL.txt",
) -> tuple[UUID, UUID]:
    """Persist the given SI/BL attachments and classify the case BL_READY.

    Defaults to email_001's identical SI/BL pair. Returns ``(email_id,
    case_id)``.
    """
    si_bytes = (BUNDLE_ATTACHMENTS / si_file).read_bytes()
    bl_bytes = (BUNDLE_ATTACHMENTS / bl_file).read_bytes()
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
                file_name=si_file,
                data=si_bytes,
                declared_media_type=_MEDIA_TYPES[detect_format(si_bytes)],
                detected_format=detect_format(si_bytes),
            ),
            AttachmentInput(
                file_name=bl_file,
                data=bl_bytes,
                declared_media_type=_MEDIA_TYPES[detect_format(bl_bytes)],
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


class FailingRoleDecider:
    """Raises instead of deciding, like a Jev role-decision provider timeout."""

    async def decide(self, documents, *, correlation_id=None):
        raise JevProviderFailure(
            code=JevFailureCode.TIMEOUT,
            retryable=True,
            email_ids=tuple(document.document_id for document in documents),
            correlation_id=correlation_id or "role-corr",
            message="Jev request timed out",
        )


class FailingEquivalence:
    """Raises instead of judging, like a Jev equivalence provider timeout."""

    async def judge(self, questions, *, correlation_id=None):
        raise JevProviderFailure(
            code=JevFailureCode.TIMEOUT,
            retryable=True,
            email_ids=tuple(question.field.value for question in questions),
            correlation_id=correlation_id or "equiv-corr",
            message="Jev request timed out",
        )


async def rate_limited_then_succeeded_scan(contents, config=None, *, attempts=None):
    """A scan read that only succeeds after the second key."""
    attempts.append(KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429))
    attempts.append(KeyAttempt(key_index=2, outcome="SUCCEEDED", status_code=None))
    fields = {
        field.value: {
            "value": (
                "1 x 40'HC"
                if field is ComparedField.CONTAINER_COUNT
                else "1,000 KG"
                if field is ComparedField.GROSS_WEIGHT_KG
                else f"V {field.value}"
            ),
            "page": 1,
            "region": "party",
        }
        for field in ComparedField
    }
    text = json.dumps(
        {
            "document_title": "SHIPPING INSTRUCTION",
            "transcription": "SHIPPING INSTRUCTION",
            "fields": fields,
        }
    )
    response = SimpleNamespace(text=text, model_version="gemini-3.5-flash-002")
    return response, tuple(attempts)
