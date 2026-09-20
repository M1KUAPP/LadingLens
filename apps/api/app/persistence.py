from __future__ import annotations

import json
import math
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.contracts import (
    Category,
    ComparedField,
    EvaluatorOutput,
    ExtractionResult,
    FieldVerdict,
    ReconciliationOutcome,
    ReconciliationResult,
    Status,
)
from app.models import (
    AuditEventRecord,
    CaseRecord,
    ClassificationAttempt,
    EmailAttachment,
    EmailReceipt,
    ExpectedShipmentRecord,
    ExtractionCache,
    FieldVerdictRecord,
    GuestSession,
    IngestionRequest,
    ReconciliationResultRecord,
    ReconciliationRun,
    ReviewActionRecord,
    ReviewAssignmentRecord,
    SourceObject,
    SubmissionRun,
    Workspace,
)
from app.storage import PrivateObjectStore, sha256_hex


class IdempotencyConflict(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class AttachmentInput:
    file_name: str
    data: bytes
    declared_media_type: str | None
    detected_format: str


@dataclass(frozen=True, slots=True)
class ReceiptInput:
    source_message_id: str | None
    received_at: datetime
    sender: str
    subject: str | None
    message_bytes: bytes
    attachments: tuple[AttachmentInput, ...]
    body_text: str | None = None


@dataclass(frozen=True, slots=True)
class AuditContext:
    request_id: str
    rule_version: str
    actor_kind: str = "SYSTEM"
    actor_id: str | None = None
    model_version: str | None = None
    prompt_version: str | None = None


@dataclass(frozen=True, slots=True)
class PersistedReceipt:
    email_id: UUID
    replayed: bool


@dataclass(frozen=True, slots=True)
class GuestWorkspace:
    workspace_id: UUID
    generation: int
    seed_workspace_id: UUID | None


@dataclass(frozen=True, slots=True)
class ReviewAssignmentInput:
    review_assignment_id: UUID
    target_type: str
    case_id: UUID | None
    reconciliation_id: UUID | None
    assigned_owner_id: str
    state: str


@dataclass(frozen=True, slots=True)
class ReviewActionInput:
    review_action_id: UUID
    target_type: str
    case_id: UUID | None
    reconciliation_id: UUID | None
    actor_id: str
    action: str
    rationale: str
    corrected_fields: dict[str, Any] | None = None
    assigned_owner_id: str | None = None


@dataclass(frozen=True, slots=True)
class CacheWriteResult:
    extraction_cache_id: UUID
    created: bool


@dataclass(frozen=True, slots=True)
class SubmissionRunResult:
    submission_run_id: UUID
    created: bool


@dataclass(frozen=True, slots=True)
class CaseInput:
    case_id: UUID
    email_id: UUID
    evaluator_output: EvaluatorOutput
    field_verdicts: tuple[FieldVerdict, ...]
    assigned_owner_id: str | None
    model_version: str
    prompt_version: str
    normalization_version: str
    rule_version: str


@dataclass(frozen=True, slots=True)
class ExpectedShipmentInput:
    source_system: str
    shipment_id: str
    source_hash: str
    imported_row: dict[str, Any]
    identifiers: dict[str, Any]
    lifecycle: str
    documents: list[dict[str, Any]]
    assigned_owner_id: str | None
    source_freshness: str
    source_updated_at: datetime
    booking_reference: str | None = None
    required_documents: tuple[str, ...] = ()
    cutoff_at: datetime | None = None
    source_owner_id: str | None = None


@dataclass(frozen=True, slots=True)
class ExpectedShipmentWriteResult:
    expected_shipment_id: UUID
    created: bool


@dataclass(frozen=True, slots=True)
class ExpectedShipmentBatchResult:
    expected_shipment_ids: tuple[UUID, ...]
    created_count: int


@dataclass(frozen=True, slots=True)
class ReconciliationRunWriteResult:
    reconciliation_run_id: UUID
    reconciliation_ids: tuple[UUID, ...]


@dataclass(frozen=True, slots=True)
class ReconciliationExceptionState:
    reconciliation_id: UUID
    assigned_owner_id: str
    state: str
    review_assignment_ids: tuple[UUID, ...]
    review_action_ids: tuple[UUID, ...]


AuditWriter = Callable[
    [AsyncSession, AuditEventRecord],
    Awaitable[None],
]


def _canonical_json(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()


def _payload_hash(value: object) -> str:
    return sha256(_canonical_json(value)).hexdigest()


def _expected_shipment_values(
    shipment: ExpectedShipmentInput,
    *,
    expected_shipment_id: UUID,
    workspace_id: UUID,
) -> dict[str, Any]:
    source_system = shipment.source_system.strip()
    shipment_id = shipment.shipment_id.strip()
    source_owner_id = (
        shipment.source_owner_id or shipment.assigned_owner_id or ""
    ).strip()
    booking_reference = (
        shipment.booking_reference.strip() if shipment.booking_reference else None
    )
    if not source_system or not shipment_id:
        raise ValueError("shipment source system and ID must not be empty")
    if not source_owner_id:
        raise ValueError("shipment source owner must not be empty")
    if len(shipment.source_hash) != 64 or any(
        character not in "0123456789abcdef" for character in shipment.source_hash
    ):
        raise ValueError("shipment source_hash must be lowercase SHA-256")
    if shipment.source_freshness not in {"CURRENT", "STALE"}:
        raise ValueError("shipment source_freshness must be CURRENT or STALE")
    if shipment.source_updated_at.utcoffset() is None:
        raise ValueError("shipment source_updated_at must be timezone-aware")
    if shipment.cutoff_at is not None and shipment.cutoff_at.utcoffset() is None:
        raise ValueError("shipment cutoff_at must be timezone-aware")
    required_documents = list(shipment.required_documents)
    if len(required_documents) != len(set(required_documents)) or not set(
        required_documents
    ) <= {"SI", "DRAFT_BL"}:
        raise ValueError("shipment required_documents are invalid")
    return {
        "expected_shipment_id": expected_shipment_id,
        "workspace_id": workspace_id,
        "source_system": source_system,
        "shipment_id": shipment_id,
        "source_hash": shipment.source_hash,
        "imported_row": shipment.imported_row,
        "identifiers": shipment.identifiers,
        "lifecycle": shipment.lifecycle,
        "documents": shipment.documents,
        "booking_reference": booking_reference,
        "required_documents": required_documents,
        "cutoff_at": shipment.cutoff_at,
        "source_owner_id": source_owner_id,
        "assigned_owner_id": shipment.assigned_owner_id,
        "source_freshness": shipment.source_freshness,
        "source_updated_at": shipment.source_updated_at,
    }


def receipt_request_hash(receipt: ReceiptInput) -> str:
    return _payload_hash(
        {
            "attachment_hashes": [
                sha256_hex(attachment.data) for attachment in receipt.attachments
            ],
            "body_text": receipt.body_text,
            "message_hash": sha256_hex(receipt.message_bytes),
        }
    )


async def _default_audit_writer(
    session: AsyncSession,
    event: AuditEventRecord,
) -> None:
    session.add(event)


class PersistenceService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        object_store: PrivateObjectStore,
        *,
        audit_writer: AuditWriter | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._object_store = object_store
        self._audit_writer = audit_writer or _default_audit_writer

    async def persist_receipt(
        self,
        *,
        workspace_id: UUID,
        idempotency_key: str,
        receipt: ReceiptInput,
        audit: AuditContext,
    ) -> PersistedReceipt:
        if not idempotency_key.strip():
            raise ValueError("idempotency_key must not be empty")
        if not receipt.sender.strip():
            raise ValueError("receipt sender must not be empty")

        async with self._session_factory() as authorization_session:
            await self._require_active_guest_workspace(
                authorization_session, workspace_id
            )

        request_hash = receipt_request_hash(receipt)
        stored_attachments = [
            (
                attachment,
                sha256_hex(attachment.data),
                await self._object_store.put_if_absent(
                    sha256_hex(attachment.data), attachment.data
                ),
            )
            for attachment in receipt.attachments
        ]

        conflict: IdempotencyConflict | None = None
        persisted: PersistedReceipt | None = None
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            request_id = await session.scalar(
                postgres_insert(IngestionRequest)
                .values(
                    ingestion_request_id=uuid4(),
                    workspace_id=workspace_id,
                    idempotency_key=idempotency_key,
                    request_hash=request_hash,
                    email_id=None,
                    state="PROCESSING",
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        IngestionRequest.workspace_id,
                        IngestionRequest.idempotency_key,
                    ]
                )
                .returning(IngestionRequest.ingestion_request_id)
            )

            if request_id is None:
                existing = await session.scalar(
                    select(IngestionRequest)
                    .where(
                        IngestionRequest.workspace_id == workspace_id,
                        IngestionRequest.idempotency_key == idempotency_key,
                    )
                    .with_for_update()
                )
                if existing is None:
                    raise RuntimeError("idempotency reservation disappeared")
                if existing.request_hash == request_hash:
                    if existing.email_id is None or existing.state != "COMPLETED":
                        raise RuntimeError("idempotency request is incomplete")
                    persisted = PersistedReceipt(
                        email_id=existing.email_id,
                        replayed=True,
                    )
                else:
                    await self._append_audit(
                        session,
                        workspace_id=workspace_id,
                        entity_type="EMAIL",
                        entity_id=str(
                            existing.email_id or existing.ingestion_request_id
                        ),
                        event_type="IDEMPOTENCY_CONFLICT",
                        source_hashes=[existing.request_hash, request_hash],
                        payload={
                            "idempotency_key": idempotency_key,
                            "original_request_hash": existing.request_hash,
                            "conflicting_request_hash": request_hash,
                        },
                        audit=audit,
                    )
                    conflict = IdempotencyConflict(
                        "idempotency key was already used with different source bytes"
                    )
            else:
                email = EmailReceipt(
                    email_id=uuid4(),
                    workspace_id=workspace_id,
                    source_message_id=receipt.source_message_id,
                    message_hash=sha256_hex(receipt.message_bytes),
                    received_at=receipt.received_at,
                    sender=receipt.sender,
                    subject=receipt.subject,
                    body_text=receipt.body_text,
                )
                session.add(email)
                await session.flush()

                for ordinal, stored in enumerate(stored_attachments, start=1):
                    attachment, content_hash, object_key = stored
                    source_object_id = await self._upsert_source_object(
                        session,
                        content_hash=content_hash,
                        private_object_key=object_key,
                        byte_size=len(attachment.data),
                        media_type=attachment.declared_media_type,
                        detected_format=attachment.detected_format,
                    )
                    session.add(
                        EmailAttachment(
                            attachment_id=uuid4(),
                            email_id=email.email_id,
                            source_object_id=source_object_id,
                            ordinal=ordinal,
                            file_name=attachment.file_name,
                            declared_media_type=attachment.declared_media_type,
                        )
                    )

                await session.execute(
                    update(IngestionRequest)
                    .where(IngestionRequest.ingestion_request_id == request_id)
                    .values(email_id=email.email_id, state="COMPLETED")
                )
                await self._append_audit(
                    session,
                    workspace_id=workspace_id,
                    entity_type="EMAIL",
                    entity_id=str(email.email_id),
                    event_type="EMAIL_RECEIVED",
                    source_hashes=[
                        content_hash for _, content_hash, _ in stored_attachments
                    ],
                    payload={
                        "email_id": str(email.email_id),
                        "request_hash": request_hash,
                    },
                    audit=audit,
                )
                persisted = PersistedReceipt(email_id=email.email_id, replayed=False)

        if conflict is not None:
            raise conflict
        if persisted is None:
            raise RuntimeError("receipt persistence produced no result")
        return persisted

    async def ensure_classification_case(
        self,
        *,
        workspace_id: UUID,
        email_id: UUID,
        audit: AuditContext,
    ) -> UUID:
        """Create the single pending case shell for an email, if absent."""
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            email = await session.scalar(
                select(EmailReceipt).where(EmailReceipt.email_id == email_id)
            )
            if email is None or email.workspace_id != workspace_id:
                raise ValueError("email does not belong to workspace")

            case_id = uuid4()
            inserted_id = await session.scalar(
                postgres_insert(CaseRecord)
                .values(
                    case_id=case_id,
                    workspace_id=workspace_id,
                    email_id=email_id,
                    classification_state="PENDING",
                    category=None,
                    category_probabilities=None,
                    status=None,
                    review_reason=None,
                    evaluator_output=None,
                    model_version=audit.model_version or "jev-1.13.0",
                    prompt_version=audit.prompt_version or "classification-v1",
                    normalization_version="normalization-v1",
                    rule_version=audit.rule_version,
                    provider_attempt_count=0,
                )
                .on_conflict_do_nothing(index_elements=[CaseRecord.email_id])
                .returning(CaseRecord.case_id)
            )
            if inserted_id is None:
                existing = await session.scalar(
                    select(CaseRecord)
                    .where(CaseRecord.email_id == email_id)
                    .with_for_update()
                )
                if existing is None:
                    raise RuntimeError("classification case disappeared")
                if existing.workspace_id != workspace_id:
                    raise ValueError("email does not belong to workspace")
                return existing.case_id

            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="CASE",
                entity_id=str(case_id),
                event_type="CASE_CLASSIFICATION_PENDING",
                source_hashes=[email.message_hash],
                payload={
                    "case_id": str(case_id),
                    "email_id": str(email_id),
                    "classification_state": "PENDING",
                },
                audit=audit,
            )
            return case_id

    async def record_classification_success(
        self,
        *,
        case_id: UUID,
        category: Category | str,
        category_probabilities: dict[str, float],
        requested_model: str,
        returned_model: str | None,
        provider_request_id: str | None,
        correlation_id: str,
        started_at: datetime,
        completed_at: datetime,
        audit: AuditContext,
        assigned_owner_id: str | None = None,
    ) -> UUID:
        category = Category(category)
        probabilities = self._validate_category_probabilities(category_probabilities)
        if category is Category.BL_COMPARISON:
            if not assigned_owner_id or not assigned_owner_id.strip():
                raise ValueError("BL_COMPARISON requires an assigned owner")
            assigned_owner_id = assigned_owner_id.strip()
        self._validate_attempt(
            requested_model, correlation_id, started_at, completed_at
        )

        async with self._session_factory() as session, session.begin():
            case = await self._lock_classification_case(session, case_id)
            attempt_id = uuid4()
            state = "BL_READY" if category is Category.BL_COMPARISON else "CLASSIFIED"
            prompt_version = audit.prompt_version or case.prompt_version
            if not prompt_version.strip() or not audit.rule_version.strip():
                raise ValueError(
                    "classification prompt and rule versions must not be empty"
                )
            output = (
                None
                if state == "BL_READY"
                else EvaluatorOutput(
                    category=category,
                    status=Status.OK,
                    review_reason=None,
                    has_defect=False,
                    defect_fields=[],
                ).model_dump(mode="json")
            )
            case.classification_state = state
            case.category = category
            case.category_probabilities = probabilities
            case.status = None if output is None else Status.OK
            case.review_reason = None
            case.evaluator_output = output
            case.assigned_owner_id = assigned_owner_id
            case.model_version = returned_model or requested_model
            case.prompt_version = prompt_version
            case.rule_version = audit.rule_version
            case.provider_request_id = provider_request_id
            case.provider_error = None
            case.provider_retryable = None
            case.provider_attempt_count += 1
            case.provider_last_attempt_at = completed_at
            session.add(
                ClassificationAttempt(
                    classification_attempt_id=attempt_id,
                    case_id=case_id,
                    requested_model=requested_model,
                    returned_model=returned_model,
                    prompt_version=prompt_version,
                    rule_version=audit.rule_version,
                    outcome="SUCCEEDED",
                    safe_diagnostic=None,
                    retryable=False,
                    provider_request_id=provider_request_id,
                    correlation_id=correlation_id,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            )
            await self._append_audit(
                session,
                workspace_id=case.workspace_id,
                entity_type="CASE",
                entity_id=str(case_id),
                event_type="CASE_CLASSIFICATION_SUCCEEDED",
                source_hashes=await self._email_source_hashes(session, case.email_id),
                payload={
                    "case_id": str(case_id),
                    "category": category.value,
                    "classification_state": state,
                    "category_probabilities": probabilities,
                    "provider_request_id": provider_request_id,
                    "correlation_id": correlation_id,
                },
                audit=audit,
            )
            return attempt_id

    async def get_classification_state(self, *, case_id: UUID) -> str:
        """Return the current Gate 1 state without exposing mutable ORM records."""
        async with self._session_factory() as session:
            case = await session.scalar(
                select(CaseRecord).where(CaseRecord.case_id == case_id)
            )
            if case is None:
                raise ValueError("classification case does not exist")
            await self._require_active_guest_workspace(session, case.workspace_id)
            return case.classification_state

    async def record_classification_failure(
        self,
        *,
        case_id: UUID,
        requested_model: str,
        returned_model: str | None,
        safe_diagnostic: str,
        retryable: bool,
        provider_request_id: str | None,
        correlation_id: str,
        started_at: datetime,
        completed_at: datetime,
        audit: AuditContext,
    ) -> UUID:
        if not safe_diagnostic.strip():
            raise ValueError("safe_diagnostic must not be empty")
        self._validate_attempt(
            requested_model, correlation_id, started_at, completed_at
        )

        async with self._session_factory() as session, session.begin():
            case = await self._lock_classification_case(session, case_id)
            attempt_id = uuid4()
            prompt_version = audit.prompt_version or case.prompt_version
            if not prompt_version.strip() or not audit.rule_version.strip():
                raise ValueError(
                    "classification prompt and rule versions must not be empty"
                )
            case.classification_state = "PROVIDER_FAILED"
            case.category = None
            case.category_probabilities = None
            case.status = None
            case.review_reason = None
            case.evaluator_output = None
            case.provider_request_id = provider_request_id
            case.provider_error = safe_diagnostic
            case.provider_retryable = retryable
            case.prompt_version = prompt_version
            case.rule_version = audit.rule_version
            case.provider_attempt_count += 1
            case.provider_last_attempt_at = completed_at
            session.add(
                ClassificationAttempt(
                    classification_attempt_id=attempt_id,
                    case_id=case_id,
                    requested_model=requested_model,
                    returned_model=returned_model,
                    prompt_version=prompt_version,
                    rule_version=audit.rule_version,
                    outcome="PROVIDER_FAILED",
                    safe_diagnostic=safe_diagnostic,
                    retryable=retryable,
                    provider_request_id=provider_request_id,
                    correlation_id=correlation_id,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            )
            await self._append_audit(
                session,
                workspace_id=case.workspace_id,
                entity_type="CASE",
                entity_id=str(case_id),
                event_type="CASE_CLASSIFICATION_FAILED",
                source_hashes=await self._email_source_hashes(session, case.email_id),
                payload={
                    "case_id": str(case_id),
                    "classification_state": "PROVIDER_FAILED",
                    "requested_model": requested_model,
                    "returned_model": returned_model,
                    "provider_request_id": provider_request_id,
                    "correlation_id": correlation_id,
                    "retryable": retryable,
                    "safe_diagnostic": safe_diagnostic,
                },
                audit=audit,
            )
            return attempt_id

    async def persist_case(
        self,
        *,
        workspace_id: UUID,
        case: CaseInput,
        audit: AuditContext,
    ) -> UUID:
        verdict_fields = [verdict.field for verdict in case.field_verdicts]
        if len(verdict_fields) != len(set(verdict_fields)):
            raise ValueError("field verdicts must contain each compared field once")
        if case.evaluator_output.category is Category.BL_COMPARISON:
            if set(verdict_fields) != set(ComparedField):
                raise ValueError("BL_COMPARISON requires all seven field verdicts")
        elif verdict_fields:
            raise ValueError("non-comparison cases cannot contain field verdicts")

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            email_workspace_id = await session.scalar(
                select(EmailReceipt.workspace_id).where(
                    EmailReceipt.email_id == case.email_id
                )
            )
            if email_workspace_id != workspace_id:
                raise ValueError("email does not belong to workspace")
            source_hashes = list(
                await session.scalars(
                    select(SourceObject.content_hash)
                    .join(
                        EmailAttachment,
                        EmailAttachment.source_object_id
                        == SourceObject.source_object_id,
                    )
                    .where(EmailAttachment.email_id == case.email_id)
                    .order_by(EmailAttachment.ordinal)
                )
            )
            session.add(
                CaseRecord(
                    case_id=case.case_id,
                    workspace_id=workspace_id,
                    email_id=case.email_id,
                    classification_state="CLASSIFIED",
                    category=case.evaluator_output.category,
                    status=case.evaluator_output.status,
                    review_reason=case.evaluator_output.review_reason,
                    assigned_owner_id=case.assigned_owner_id,
                    evaluator_output=case.evaluator_output.model_dump(mode="json"),
                    model_version=case.model_version,
                    prompt_version=case.prompt_version,
                    normalization_version=case.normalization_version,
                    rule_version=case.rule_version,
                )
            )
            for verdict in case.field_verdicts:
                session.add(
                    FieldVerdictRecord(
                        field_verdict_id=uuid4(),
                        case_id=case.case_id,
                        field=verdict.field,
                        si_value=verdict.si.model_dump(mode="json"),
                        draft_bl_value=verdict.draft_bl.model_dump(mode="json"),
                        deterministic_result=verdict.deterministic_result,
                        semantic_probability=verdict.semantic_probability,
                        interactive_state=verdict.interactive_state,
                        batch_result=verdict.batch_result,
                        reason=verdict.reason,
                    )
                )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="CASE",
                entity_id=str(case.case_id),
                event_type="CASE_RECORDED",
                source_hashes=source_hashes,
                payload={
                    "email_id": str(case.email_id),
                    "evaluator_output": case.evaluator_output.model_dump(mode="json"),
                    "field_verdict_count": len(case.field_verdicts),
                },
                audit=audit,
            )
        return case.case_id

    async def persist_expected_shipment(
        self,
        *,
        workspace_id: UUID,
        shipment: ExpectedShipmentInput,
        audit: AuditContext,
    ) -> ExpectedShipmentWriteResult:
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            expected_shipment_id = uuid4()
            created_id = await session.scalar(
                postgres_insert(ExpectedShipmentRecord)
                .values(
                    **_expected_shipment_values(
                        shipment,
                        expected_shipment_id=expected_shipment_id,
                        workspace_id=workspace_id,
                    )
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        ExpectedShipmentRecord.workspace_id,
                        ExpectedShipmentRecord.source_system,
                        ExpectedShipmentRecord.shipment_id,
                        ExpectedShipmentRecord.source_hash,
                    ]
                )
                .returning(ExpectedShipmentRecord.expected_shipment_id)
            )
            if created_id is None:
                existing_id = await session.scalar(
                    select(ExpectedShipmentRecord.expected_shipment_id).where(
                        ExpectedShipmentRecord.workspace_id == workspace_id,
                        ExpectedShipmentRecord.source_system == shipment.source_system,
                        ExpectedShipmentRecord.shipment_id == shipment.shipment_id,
                        ExpectedShipmentRecord.source_hash == shipment.source_hash,
                    )
                )
                if existing_id is None:
                    raise RuntimeError("expected shipment upsert produced no row")
                return ExpectedShipmentWriteResult(
                    expected_shipment_id=existing_id,
                    created=False,
                )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SHIPMENT",
                entity_id=str(created_id),
                event_type="EXPECTED_SHIPMENT_IMPORTED",
                source_hashes=[shipment.source_hash],
                payload={
                    "shipment_id": shipment.shipment_id,
                    "source_system": shipment.source_system,
                },
                audit=audit,
            )
        return ExpectedShipmentWriteResult(
            expected_shipment_id=created_id,
            created=True,
        )

    async def import_expected_shipments(
        self,
        *,
        workspace_id: UUID,
        shipments: Sequence[ExpectedShipmentInput],
        audit: AuditContext,
    ) -> ExpectedShipmentBatchResult:
        """Atomically import immutable shipment versions from one validated batch."""
        prepared: list[tuple[ExpectedShipmentInput, UUID, dict[str, Any]]] = []
        seen: dict[tuple[str, str, str], ExpectedShipmentInput] = {}
        for shipment in shipments:
            key = (
                shipment.source_system.strip(),
                shipment.shipment_id.strip(),
                shipment.source_hash,
            )
            existing = seen.get(key)
            if existing is not None:
                if existing != shipment:
                    raise ValueError(
                        "shipment batch contains conflicting source versions"
                    )
                continue
            seen[key] = shipment
            expected_shipment_id = uuid4()
            prepared.append(
                (
                    shipment,
                    expected_shipment_id,
                    _expected_shipment_values(
                        shipment,
                        expected_shipment_id=expected_shipment_id,
                        workspace_id=workspace_id,
                    ),
                )
            )

        persisted_ids: list[UUID] = []
        created_count = 0
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            for shipment, expected_shipment_id, values in prepared:
                created_id = await session.scalar(
                    postgres_insert(ExpectedShipmentRecord)
                    .values(**values)
                    .on_conflict_do_nothing(
                        index_elements=[
                            ExpectedShipmentRecord.workspace_id,
                            ExpectedShipmentRecord.source_system,
                            ExpectedShipmentRecord.shipment_id,
                            ExpectedShipmentRecord.source_hash,
                        ]
                    )
                    .returning(ExpectedShipmentRecord.expected_shipment_id)
                )
                if created_id is None:
                    created_id = await session.scalar(
                        select(ExpectedShipmentRecord.expected_shipment_id).where(
                            ExpectedShipmentRecord.workspace_id == workspace_id,
                            ExpectedShipmentRecord.source_system
                            == shipment.source_system.strip(),
                            ExpectedShipmentRecord.shipment_id
                            == shipment.shipment_id.strip(),
                            ExpectedShipmentRecord.source_hash == shipment.source_hash,
                        )
                    )
                    if created_id is None:
                        raise RuntimeError("expected shipment upsert produced no row")
                else:
                    created_count += 1
                    await self._append_audit(
                        session,
                        workspace_id=workspace_id,
                        entity_type="SHIPMENT",
                        entity_id=str(created_id),
                        event_type="EXPECTED_SHIPMENT_IMPORTED",
                        source_hashes=[shipment.source_hash],
                        payload={
                            "shipment_id": shipment.shipment_id.strip(),
                            "source_system": shipment.source_system.strip(),
                        },
                        audit=audit,
                    )
                persisted_ids.append(created_id)
        return ExpectedShipmentBatchResult(
            expected_shipment_ids=tuple(persisted_ids),
            created_count=created_count,
        )

    async def persist_reconciliation_run(
        self,
        *,
        workspace_id: UUID,
        reconciliation_run_id: UUID,
        source_hash: str,
        rule_version: str,
        results: Sequence[ReconciliationResult],
        exception_queue_owner: str,
        audit: AuditContext,
    ) -> ReconciliationRunWriteResult:
        """Persist a complete immutable run, or roll the whole run back."""
        if len(source_hash) != 64 or any(
            character not in "0123456789abcdef" for character in source_hash
        ):
            raise ValueError("reconciliation source_hash must be lowercase SHA-256")
        if not rule_version.strip():
            raise ValueError("reconciliation rule_version must not be empty")
        if not exception_queue_owner.strip():
            raise ValueError("exception_queue_owner must not be empty")

        contracts = [result.root for result in results]
        reconciliation_ids = [contract.reconciliation_id for contract in contracts]
        subject_keys = [contract.subject_key for contract in contracts]
        if len(reconciliation_ids) != len(set(reconciliation_ids)):
            raise ValueError("reconciliation IDs must be unique within a run")
        if len(subject_keys) != len(set(subject_keys)):
            raise ValueError("reconciliation subject keys must be unique within a run")
        if any(
            contract.reconciliation_run_id != reconciliation_run_id
            for contract in contracts
        ):
            raise ValueError("every result must reference the persisted run ID")

        shipment_ids: set[str] = set()
        raw_case_ids: set[str] = set()
        for contract in contracts:
            shipment_id = getattr(contract, "shipment_id", None)
            if shipment_id is not None:
                shipment_ids.add(shipment_id)
            shipment_ids.update(getattr(contract, "candidate_shipment_ids", None) or [])
            raw_case_ids.update(getattr(contract, "case_ids", None) or [])
            raw_case_ids.update(getattr(contract, "candidate_case_ids", None) or [])
        try:
            case_ids = {UUID(case_id) for case_id in raw_case_ids}
        except ValueError as exc:
            raise ValueError("reconciliation case references must be UUIDs") from exc

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            shipment_rows = list(
                await session.scalars(
                    select(ExpectedShipmentRecord)
                    .where(
                        ExpectedShipmentRecord.workspace_id == workspace_id,
                        ExpectedShipmentRecord.shipment_id.in_(shipment_ids),
                    )
                    .order_by(
                        ExpectedShipmentRecord.source_updated_at.desc(),
                        ExpectedShipmentRecord.created_at.desc(),
                    )
                )
            )
            owner_by_shipment: dict[str, str] = {}
            for row in shipment_rows:
                owner_by_shipment.setdefault(row.shipment_id, row.source_owner_id)
            missing_shipments = shipment_ids - set(owner_by_shipment)
            if missing_shipments:
                missing = ", ".join(sorted(missing_shipments))
                raise ValueError(
                    f"shipment references do not belong to workspace: {missing}"
                )

            persisted_case_ids = set(
                await session.scalars(
                    select(CaseRecord.case_id).where(
                        CaseRecord.workspace_id == workspace_id,
                        CaseRecord.case_id.in_(case_ids),
                    )
                )
            )
            missing_cases = case_ids - persisted_case_ids
            if missing_cases:
                missing = ", ".join(sorted(str(case_id) for case_id in missing_cases))
                raise ValueError(
                    f"case references do not belong to workspace: {missing}"
                )

            session.add(
                ReconciliationRun(
                    reconciliation_run_id=reconciliation_run_id,
                    workspace_id=workspace_id,
                    source_hash=source_hash,
                    rule_version=rule_version.strip(),
                )
            )
            for contract in contracts:
                session.add(
                    ReconciliationResultRecord(
                        reconciliation_id=contract.reconciliation_id,
                        reconciliation_run_id=reconciliation_run_id,
                        subject_key=contract.subject_key,
                        outcome=contract.outcome,
                        shipment_id=getattr(contract, "shipment_id", None),
                        case_ids=getattr(contract, "case_ids", None),
                        candidate_shipment_ids=getattr(
                            contract, "candidate_shipment_ids", None
                        ),
                        candidate_case_ids=getattr(
                            contract, "candidate_case_ids", None
                        ),
                        match_basis=contract.match_basis,
                        source_freshness=contract.source_freshness,
                        reviewed_at=contract.reviewed_at,
                        created_at=contract.created_at,
                    )
                )
            await session.flush()

            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="RECONCILIATION_RUN",
                entity_id=str(reconciliation_run_id),
                event_type="RECONCILIATION_RUN_CREATED",
                source_hashes=[source_hash],
                payload={
                    "result_count": len(contracts),
                    "rule_version": rule_version.strip(),
                },
                audit=audit,
            )
            for result, contract in zip(results, contracts, strict=True):
                await self._append_audit(
                    session,
                    workspace_id=workspace_id,
                    entity_type="RECONCILIATION",
                    entity_id=str(contract.reconciliation_id),
                    event_type="RECONCILIATION_RECORDED",
                    source_hashes=[source_hash],
                    payload=result.model_dump(mode="json"),
                    audit=audit,
                )
                outcome = ReconciliationOutcome(contract.outcome)
                if outcome not in {
                    ReconciliationOutcome.SOURCE_STALE,
                    ReconciliationOutcome.DUPLICATE_OR_AMBIGUOUS,
                }:
                    continue
                candidate_shipments = (
                    [contract.shipment_id]
                    if outcome is ReconciliationOutcome.SOURCE_STALE
                    else list(contract.candidate_shipment_ids)
                )
                owners = {owner_by_shipment[item] for item in candidate_shipments}
                owner = (
                    next(iter(owners))
                    if len(owners) == 1
                    else exception_queue_owner.strip()
                )
                assignment_id = uuid4()
                session.add(
                    ReviewAssignmentRecord(
                        review_assignment_id=assignment_id,
                        workspace_id=workspace_id,
                        target_type="RECONCILIATION_EXCEPTION",
                        case_id=None,
                        reconciliation_id=contract.reconciliation_id,
                        assigned_owner_id=owner,
                        state="ASSIGNED",
                    )
                )
                await self._append_audit(
                    session,
                    workspace_id=workspace_id,
                    entity_type="REVIEW_ASSIGNMENT",
                    entity_id=str(assignment_id),
                    event_type="REVIEW_ASSIGNED",
                    source_hashes=[source_hash],
                    payload={
                        "assigned_owner_id": owner,
                        "reconciliation_id": str(contract.reconciliation_id),
                        "state": "ASSIGNED",
                        "target_type": "RECONCILIATION_EXCEPTION",
                    },
                    audit=audit,
                )

        return ReconciliationRunWriteResult(
            reconciliation_run_id=reconciliation_run_id,
            reconciliation_ids=tuple(reconciliation_ids),
        )

    async def persist_reconciliation_result(
        self,
        *,
        workspace_id: UUID,
        result: ReconciliationResult,
        audit: AuditContext,
    ) -> UUID:
        contract = result.root
        reconciliation_id = contract.reconciliation_id
        reconciliation_run_id = contract.reconciliation_run_id

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(ReconciliationRun).where(
                    ReconciliationRun.reconciliation_run_id == reconciliation_run_id,
                    ReconciliationRun.workspace_id == workspace_id,
                )
            )
            if run is None:
                raise ValueError("reconciliation run does not belong to workspace")
            record = ReconciliationResultRecord(
                reconciliation_id=reconciliation_id,
                reconciliation_run_id=reconciliation_run_id,
                subject_key=contract.subject_key,
                outcome=contract.outcome,
                shipment_id=getattr(contract, "shipment_id", None),
                case_ids=getattr(contract, "case_ids", None),
                candidate_shipment_ids=getattr(
                    contract, "candidate_shipment_ids", None
                ),
                candidate_case_ids=getattr(contract, "candidate_case_ids", None),
                match_basis=contract.match_basis,
                source_freshness=contract.source_freshness,
                reviewed_at=contract.reviewed_at,
                created_at=contract.created_at,
            )
            session.add(record)
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="RECONCILIATION",
                entity_id=str(reconciliation_id),
                event_type="RECONCILIATION_RECORDED",
                source_hashes=[run.source_hash],
                payload=result.model_dump(mode="json"),
                audit=audit,
            )
        return reconciliation_id

    async def reset_guest_namespace(
        self,
        *,
        session_key: str,
        audit: AuditContext,
    ) -> GuestWorkspace:
        if not session_key.strip():
            raise ValueError("session_key must not be empty")

        async with self._session_factory() as session, session.begin():
            guest_session = await session.scalar(
                select(GuestSession)
                .where(GuestSession.session_key == session_key)
                .with_for_update()
            )
            if guest_session is None:
                raise ValueError("guest session does not exist")
            old_workspace = await session.scalar(
                select(Workspace).where(
                    Workspace.guest_session_id == guest_session.guest_session_id,
                    Workspace.generation == guest_session.current_generation,
                    Workspace.is_shared_seed.is_(False),
                )
            )
            if old_workspace is None:
                raise ValueError("guest session has no active mutable workspace")

            generation = guest_session.current_generation + 1
            new_workspace = Workspace(
                workspace_id=uuid4(),
                guest_session_id=guest_session.guest_session_id,
                generation=generation,
                is_shared_seed=False,
                seed_workspace_id=old_workspace.seed_workspace_id,
            )
            session.add(new_workspace)
            guest_session.current_generation = generation
            await self._append_audit(
                session,
                workspace_id=old_workspace.workspace_id,
                entity_type="WORKSPACE",
                entity_id=str(new_workspace.workspace_id),
                event_type="GUEST_NAMESPACE_RESET",
                source_hashes=[],
                payload={
                    "new_workspace_id": str(new_workspace.workspace_id),
                    "generation": generation,
                },
                audit=audit,
            )
        return GuestWorkspace(
            workspace_id=new_workspace.workspace_id,
            generation=generation,
            seed_workspace_id=new_workspace.seed_workspace_id,
        )

    async def append_review_assignment(
        self,
        *,
        workspace_id: UUID,
        assignment: ReviewAssignmentInput,
        audit: AuditContext,
    ) -> UUID:
        if assignment.state not in {
            "ASSIGNED",
            "ACKNOWLEDGED",
            "ESCALATED",
            "RESOLVED",
        }:
            raise ValueError("invalid review assignment state")
        if not assignment.assigned_owner_id.strip():
            raise ValueError("assigned_owner_id must not be empty")
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            await self._require_review_target(
                session,
                workspace_id=workspace_id,
                target_type=assignment.target_type,
                case_id=assignment.case_id,
                reconciliation_id=assignment.reconciliation_id,
            )
            session.add(
                ReviewAssignmentRecord(
                    review_assignment_id=assignment.review_assignment_id,
                    workspace_id=workspace_id,
                    target_type=assignment.target_type,
                    case_id=assignment.case_id,
                    reconciliation_id=assignment.reconciliation_id,
                    assigned_owner_id=assignment.assigned_owner_id,
                    state=assignment.state,
                )
            )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="REVIEW_ASSIGNMENT",
                entity_id=str(assignment.review_assignment_id),
                event_type="REVIEW_ASSIGNED",
                source_hashes=[],
                payload={
                    "assigned_owner_id": assignment.assigned_owner_id,
                    "state": assignment.state,
                    "target_type": assignment.target_type,
                },
                audit=audit,
            )
        return assignment.review_assignment_id

    async def append_review_action(
        self,
        *,
        workspace_id: UUID,
        action: ReviewActionInput,
        audit: AuditContext,
    ) -> UUID:
        allowed_actions = (
            {"APPROVE", "CORRECT", "REJECT"}
            if action.target_type == "CASE"
            else {"ASSIGN", "ACKNOWLEDGE", "ESCALATE", "RESOLVE"}
        )
        if action.action not in allowed_actions:
            raise ValueError("review action is invalid for target_type")
        if not action.actor_id.strip() or not action.rationale.strip():
            raise ValueError("review actor and rationale must not be empty")
        if action.action == "ASSIGN" and (
            not action.assigned_owner_id or not action.assigned_owner_id.strip()
        ):
            raise ValueError("ASSIGN requires assigned_owner_id")
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            await self._require_review_target(
                session,
                workspace_id=workspace_id,
                target_type=action.target_type,
                case_id=action.case_id,
                reconciliation_id=action.reconciliation_id,
            )
            state_assignment: ReviewAssignmentRecord | None = None
            if action.target_type == "RECONCILIATION_EXCEPTION":
                latest_assignment = await session.scalar(
                    select(ReviewAssignmentRecord)
                    .where(
                        ReviewAssignmentRecord.workspace_id == workspace_id,
                        ReviewAssignmentRecord.target_type
                        == "RECONCILIATION_EXCEPTION",
                        ReviewAssignmentRecord.reconciliation_id
                        == action.reconciliation_id,
                    )
                    .order_by(
                        ReviewAssignmentRecord.created_at.desc(),
                        ReviewAssignmentRecord.review_assignment_id.desc(),
                    )
                    .limit(1)
                    .with_for_update()
                )
                if (
                    latest_assignment is not None
                    and latest_assignment.state == "RESOLVED"
                ):
                    raise ValueError("resolved reconciliation review cannot be changed")
                owner = (
                    action.assigned_owner_id.strip()
                    if action.assigned_owner_id is not None
                    and action.assigned_owner_id.strip()
                    else (
                        latest_assignment.assigned_owner_id
                        if latest_assignment is not None
                        else action.actor_id.strip()
                    )
                )
                state = {
                    "ASSIGN": "ASSIGNED",
                    "ACKNOWLEDGE": "ACKNOWLEDGED",
                    "ESCALATE": "ESCALATED",
                    "RESOLVE": "RESOLVED",
                }[action.action]
                state_assignment = ReviewAssignmentRecord(
                    review_assignment_id=uuid4(),
                    workspace_id=workspace_id,
                    target_type="RECONCILIATION_EXCEPTION",
                    case_id=None,
                    reconciliation_id=action.reconciliation_id,
                    assigned_owner_id=owner,
                    state=state,
                )
                session.add(state_assignment)
            session.add(
                ReviewActionRecord(
                    review_action_id=action.review_action_id,
                    workspace_id=workspace_id,
                    target_type=action.target_type,
                    case_id=action.case_id,
                    reconciliation_id=action.reconciliation_id,
                    actor_id=action.actor_id,
                    action=action.action,
                    rationale=action.rationale,
                    corrected_fields=action.corrected_fields,
                    assigned_owner_id=action.assigned_owner_id,
                )
            )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="REVIEW_ACTION",
                entity_id=str(action.review_action_id),
                event_type=f"REVIEW_{action.action}",
                source_hashes=[],
                payload={
                    "action": action.action,
                    "assigned_owner_id": action.assigned_owner_id,
                    "corrected_fields": action.corrected_fields,
                    "target_type": action.target_type,
                },
                audit=audit,
            )
            if state_assignment is not None:
                await self._append_audit(
                    session,
                    workspace_id=workspace_id,
                    entity_type="REVIEW_ASSIGNMENT",
                    entity_id=str(state_assignment.review_assignment_id),
                    event_type="REVIEW_STATE_CHANGED",
                    source_hashes=[],
                    payload={
                        "action": action.action,
                        "assigned_owner_id": state_assignment.assigned_owner_id,
                        "reconciliation_id": str(action.reconciliation_id),
                        "state": state_assignment.state,
                        "target_type": action.target_type,
                    },
                    audit=audit,
                )
        return action.review_action_id

    async def get_reconciliation_exception_state(
        self,
        *,
        workspace_id: UUID,
        reconciliation_id: UUID,
    ) -> ReconciliationExceptionState:
        async with self._session_factory() as session:
            target = await session.scalar(
                select(ReconciliationResultRecord.reconciliation_id)
                .join(ReconciliationRun)
                .where(
                    ReconciliationResultRecord.reconciliation_id == reconciliation_id,
                    ReconciliationRun.workspace_id == workspace_id,
                )
            )
            if target is None:
                raise ValueError("reconciliation target does not belong to workspace")
            assignments = list(
                await session.scalars(
                    select(ReviewAssignmentRecord)
                    .where(
                        ReviewAssignmentRecord.workspace_id == workspace_id,
                        ReviewAssignmentRecord.target_type
                        == "RECONCILIATION_EXCEPTION",
                        ReviewAssignmentRecord.reconciliation_id == reconciliation_id,
                    )
                    .order_by(
                        ReviewAssignmentRecord.created_at,
                        ReviewAssignmentRecord.review_assignment_id,
                    )
                )
            )
            if not assignments:
                raise ValueError("reconciliation target has no review assignment")
            action_ids = tuple(
                await session.scalars(
                    select(ReviewActionRecord.review_action_id)
                    .where(
                        ReviewActionRecord.workspace_id == workspace_id,
                        ReviewActionRecord.target_type == "RECONCILIATION_EXCEPTION",
                        ReviewActionRecord.reconciliation_id == reconciliation_id,
                    )
                    .order_by(
                        ReviewActionRecord.created_at,
                        ReviewActionRecord.review_action_id,
                    )
                )
            )
        current = assignments[-1]
        return ReconciliationExceptionState(
            reconciliation_id=reconciliation_id,
            assigned_owner_id=current.assigned_owner_id,
            state=current.state,
            review_assignment_ids=tuple(
                item.review_assignment_id for item in assignments
            ),
            review_action_ids=action_ids,
        )

    async def cache_extraction(
        self,
        *,
        workspace_id: UUID,
        content_hash: str,
        extractor_route: str,
        extractor_version: str,
        extraction_schema_version: str,
        result: ExtractionResult,
        provenance: list[dict[str, Any]],
        audit: AuditContext,
    ) -> CacheWriteResult:
        if not isinstance(result, ExtractionResult):
            raise TypeError("result must be an ExtractionResult")
        validated_result = ExtractionResult.model_validate(
            result.model_dump(mode="json", warnings=False)
        )
        result_payload = validated_result.model_dump(mode="json")
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            source_object_id = await self._scoped_source_object_id(
                session,
                workspace_id=workspace_id,
                content_hash=content_hash,
            )
            cache_id = uuid4()
            created_id = await session.scalar(
                postgres_insert(ExtractionCache)
                .values(
                    extraction_cache_id=cache_id,
                    content_hash=content_hash,
                    extractor_route=extractor_route,
                    extractor_version=extractor_version,
                    extraction_schema_version=extraction_schema_version,
                    result=result_payload,
                    provenance=provenance,
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        ExtractionCache.content_hash,
                        ExtractionCache.extractor_version,
                        ExtractionCache.extraction_schema_version,
                    ]
                )
                .returning(ExtractionCache.extraction_cache_id)
            )
            if created_id is None:
                existing_id = await session.scalar(
                    select(ExtractionCache.extraction_cache_id).where(
                        ExtractionCache.content_hash == content_hash,
                        ExtractionCache.extractor_version == extractor_version,
                        ExtractionCache.extraction_schema_version
                        == extraction_schema_version,
                    )
                )
                if existing_id is None:
                    raise RuntimeError("extraction cache upsert produced no row")
                return CacheWriteResult(
                    extraction_cache_id=existing_id,
                    created=False,
                )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="ATTACHMENT",
                entity_id=str(source_object_id),
                event_type="EXTRACTION_CACHED",
                source_hashes=[content_hash],
                payload={
                    "extraction_schema_version": extraction_schema_version,
                    "extractor_route": extractor_route,
                    "extractor_version": extractor_version,
                    "result": result_payload,
                },
                audit=audit,
            )
        return CacheWriteResult(extraction_cache_id=created_id, created=True)

    async def get_cached_extraction(
        self,
        *,
        workspace_id: UUID,
        content_hash: str,
        extractor_version: str,
        extraction_schema_version: str,
    ) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            await self._scoped_source_object_id(
                session,
                workspace_id=workspace_id,
                content_hash=content_hash,
            )
            return await session.scalar(
                select(ExtractionCache.result).where(
                    ExtractionCache.content_hash == content_hash,
                    ExtractionCache.extractor_version == extractor_version,
                    ExtractionCache.extraction_schema_version
                    == extraction_schema_version,
                )
            )

    async def create_submission_run(
        self,
        *,
        workspace_id: UUID,
        input_manifest_hash: str,
        expected_email_ids: list[str],
        rule_version: str,
        audit: AuditContext,
    ) -> SubmissionRunResult:
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run_id = uuid4()
            created_id = await session.scalar(
                postgres_insert(SubmissionRun)
                .values(
                    submission_run_id=run_id,
                    workspace_id=workspace_id,
                    input_manifest_hash=input_manifest_hash,
                    expected_email_ids=expected_email_ids,
                    validation_count=0,
                    rule_version=rule_version,
                    publication_state="PENDING",
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        SubmissionRun.workspace_id,
                        SubmissionRun.input_manifest_hash,
                        SubmissionRun.rule_version,
                    ]
                )
                .returning(SubmissionRun.submission_run_id)
            )
            if created_id is None:
                existing_id = await session.scalar(
                    select(SubmissionRun.submission_run_id).where(
                        SubmissionRun.workspace_id == workspace_id,
                        SubmissionRun.input_manifest_hash == input_manifest_hash,
                        SubmissionRun.rule_version == rule_version,
                    )
                )
                if existing_id is None:
                    raise RuntimeError("submission run upsert produced no row")
                return SubmissionRunResult(
                    submission_run_id=existing_id,
                    created=False,
                )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SUBMISSION_RUN",
                entity_id=str(created_id),
                event_type="SUBMISSION_RUN_CREATED",
                source_hashes=[input_manifest_hash],
                payload={
                    "expected_email_ids": expected_email_ids,
                    "rule_version": rule_version,
                },
                audit=audit,
            )
        return SubmissionRunResult(submission_run_id=created_id, created=True)

    async def _require_active_guest_workspace(
        self,
        session: AsyncSession,
        workspace_id: UUID,
    ) -> None:
        guest_session = await session.scalar(
            select(GuestSession)
            .join(
                Workspace,
                Workspace.guest_session_id == GuestSession.guest_session_id,
            )
            .where(
                Workspace.workspace_id == workspace_id,
                Workspace.is_shared_seed.is_(False),
                Workspace.generation == GuestSession.current_generation,
            )
            .with_for_update(of=GuestSession)
        )
        if guest_session is None:
            raise ValueError("workspace is not an active mutable guest namespace")

    async def _require_review_target(
        self,
        session: AsyncSession,
        *,
        workspace_id: UUID,
        target_type: str,
        case_id: UUID | None,
        reconciliation_id: UUID | None,
    ) -> None:
        if target_type == "CASE" and case_id is not None and reconciliation_id is None:
            target_exists = await session.scalar(
                select(CaseRecord.case_id).where(
                    CaseRecord.case_id == case_id,
                    CaseRecord.workspace_id == workspace_id,
                )
            )
        elif (
            target_type == "RECONCILIATION_EXCEPTION"
            and case_id is None
            and reconciliation_id is not None
        ):
            target_exists = await session.scalar(
                select(ReconciliationResultRecord.reconciliation_id)
                .join(
                    ReconciliationRun,
                    ReconciliationResultRecord.reconciliation_run_id
                    == ReconciliationRun.reconciliation_run_id,
                )
                .where(
                    ReconciliationResultRecord.reconciliation_id == reconciliation_id,
                    ReconciliationRun.workspace_id == workspace_id,
                )
            )
        else:
            raise ValueError("review target shape does not match target_type")
        if target_exists is None:
            raise ValueError("review target does not belong to workspace")

    async def _upsert_source_object(
        self,
        session: AsyncSession,
        *,
        content_hash: str,
        private_object_key: str,
        byte_size: int,
        media_type: str | None,
        detected_format: str,
    ) -> UUID:
        source_object_id = await session.scalar(
            postgres_insert(SourceObject)
            .values(
                source_object_id=uuid4(),
                content_hash=content_hash,
                private_object_key=private_object_key,
                byte_size=byte_size,
                media_type=media_type,
                detected_format=detected_format,
                parser_status="PENDING",
            )
            .on_conflict_do_nothing(index_elements=[SourceObject.content_hash])
            .returning(SourceObject.source_object_id)
        )
        if source_object_id is not None:
            return source_object_id
        existing_id = await session.scalar(
            select(SourceObject.source_object_id).where(
                SourceObject.content_hash == content_hash
            )
        )
        if existing_id is None:
            raise RuntimeError("source object upsert produced no row")
        return existing_id

    async def _scoped_source_object_id(
        self,
        session: AsyncSession,
        *,
        workspace_id: UUID,
        content_hash: str,
    ) -> UUID:
        source_object_id = await session.scalar(
            select(SourceObject.source_object_id)
            .join(
                EmailAttachment,
                EmailAttachment.source_object_id == SourceObject.source_object_id,
            )
            .join(EmailReceipt, EmailReceipt.email_id == EmailAttachment.email_id)
            .where(
                SourceObject.content_hash == content_hash,
                EmailReceipt.workspace_id == workspace_id,
            )
        )
        if source_object_id is None:
            raise ValueError("source object is not linked to workspace")
        return source_object_id

    async def _lock_classification_case(
        self,
        session: AsyncSession,
        case_id: UUID,
    ) -> CaseRecord:
        workspace_id = await session.scalar(
            select(CaseRecord.workspace_id).where(CaseRecord.case_id == case_id)
        )
        if workspace_id is None:
            raise ValueError("classification case does not exist")
        # Match every other mutation's lock order: guest session before domain row.
        # This avoids a re-ingest/result deadlock on GuestSession -> CaseRecord.
        await self._require_active_guest_workspace(session, workspace_id)
        case = await session.scalar(
            select(CaseRecord).where(CaseRecord.case_id == case_id).with_for_update()
        )
        if case is None:
            raise ValueError("classification case does not exist")
        if case.classification_state not in {"PENDING", "PROVIDER_FAILED"}:
            raise ValueError("classification case is not awaiting provider results")
        return case

    @staticmethod
    def _validate_attempt(
        requested_model: str,
        correlation_id: str,
        started_at: datetime,
        completed_at: datetime,
    ) -> None:
        if not requested_model.strip():
            raise ValueError("requested_model must not be empty")
        if not correlation_id.strip():
            raise ValueError("correlation_id must not be empty")
        if started_at.utcoffset() is None or completed_at.utcoffset() is None:
            raise ValueError("classification attempt timestamps must be timezone-aware")
        if completed_at < started_at:
            raise ValueError("completed_at must not precede started_at")

    @staticmethod
    def _validate_category_probabilities(
        category_probabilities: dict[str, float],
    ) -> dict[str, float]:
        normalized: dict[str, float] = {}
        for raw_category, raw_probability in category_probabilities.items():
            try:
                probability_category = Category(raw_category)
                probability = float(raw_probability)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    "category probabilities must use known categories"
                ) from exc
            if not math.isfinite(probability) or not 0 <= probability <= 1:
                raise ValueError("category probabilities must be between 0 and 1")
            normalized[probability_category.value] = probability
        if set(normalized) != {item.value for item in Category}:
            raise ValueError("category probabilities must cover every category")
        if not math.isclose(sum(normalized.values()), 1.0, rel_tol=0.0, abs_tol=0.02):
            raise ValueError("category probabilities must sum to approximately 1")
        return normalized

    async def _email_source_hashes(
        self,
        session: AsyncSession,
        email_id: UUID,
    ) -> list[str]:
        message_hash = await session.scalar(
            select(EmailReceipt.message_hash).where(EmailReceipt.email_id == email_id)
        )
        if message_hash is None:
            raise ValueError("classification email does not exist")
        attachment_hashes = list(
            await session.scalars(
                select(SourceObject.content_hash)
                .join(
                    EmailAttachment,
                    EmailAttachment.source_object_id == SourceObject.source_object_id,
                )
                .where(EmailAttachment.email_id == email_id)
                .order_by(EmailAttachment.ordinal)
            )
        )
        return [message_hash, *attachment_hashes]

    async def _append_audit(
        self,
        session: AsyncSession,
        *,
        workspace_id: UUID,
        entity_type: str,
        entity_id: str,
        event_type: str,
        source_hashes: list[str],
        payload: dict[str, Any],
        audit: AuditContext,
    ) -> None:
        await self._audit_writer(
            session,
            AuditEventRecord(
                audit_event_id=uuid4(),
                workspace_id=workspace_id,
                actor_kind=audit.actor_kind,
                actor_id=audit.actor_id,
                entity_type=entity_type,
                entity_id=entity_id,
                event_type=event_type,
                source_hashes=source_hashes,
                model_version=audit.model_version,
                prompt_version=audit.prompt_version,
                rule_version=audit.rule_version,
                request_id=audit.request_id,
                payload_hash=_payload_hash(payload),
            ),
        )
