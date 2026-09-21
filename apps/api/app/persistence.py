from __future__ import annotations

import json
import math
from collections import defaultdict
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.contracts import (
    Category,
    ComparedField,
    EvaluatorOutput,
    ExtractionResult,
    FieldVerdict,
    ReconciliationOutcome,
    ReconciliationResult,
    ReviewReason,
    Status,
    serialize_evaluator_output,
)
from app.models import (
    AuditEventRecord,
    CaseRecord,
    ClassificationAttempt,
    DocumentRoleDecisionRecord,
    EmailAttachment,
    EmailReceipt,
    ExpectedShipmentRecord,
    ExtractionCache,
    FieldVerdictRecord,
    GuestSession,
    IngestionRequest,
    JudgeRunRecord,
    ReconciliationResultRecord,
    ReconciliationRun,
    ReviewActionRecord,
    ReviewAssignmentRecord,
    SourceObject,
    SubmissionEvaluation,
    SubmissionRun,
    SubmissionRunRecord,
    Workspace,
)
from app.storage import PrivateObjectStore, sha256_hex
from app.submission import (
    EXPECTED_EMAIL_IDS,
    StructuralDiagnostic,
    SubmissionArtifact,
    SubmissionBlockedError,
    SubmissionBlocker,
    SubmissionBlockerCode,
    SubmissionCaseSnapshot,
    SubmissionFieldSnapshot,
    SubmissionScoreResult,
    build_submission_artifact,
    score_submission_artifact,
    select_structural_review_reason,
    validate_submission_artifact,
)


class IdempotencyConflict(RuntimeError):
    pass


class InactiveWorkspace(ValueError):
    """The workspace is not a guest's active namespace: a reset retired it."""


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
class CachedExtractionEntry:
    extractor_route: str
    result: ExtractionResult
    document_text: str | None


@dataclass(frozen=True, slots=True)
class DocumentRoleDecisionInput:
    attachment_id: UUID
    content_hash: str
    outcome: str
    role: str | None
    role_probabilities: dict[str, float] | None
    requested_model: str
    returned_model: str | None
    prompt_version: str
    provider_request_id: str | None
    correlation_id: str
    safe_diagnostic: str | None
    retryable: bool | None
    started_at: datetime
    completed_at: datetime


@dataclass(frozen=True, slots=True)
class DocumentRoleSnapshot:
    attachment_id: UUID
    content_hash: str
    outcome: str
    role: str | None
    role_probabilities: dict[str, float] | None
    returned_model: str | None
    provider_request_id: str | None


@dataclass(frozen=True, slots=True)
class SubmissionRunResult:
    submission_run_id: UUID
    created: bool


@dataclass(frozen=True, slots=True)
class SubmissionStageResult:
    submission_run_id: UUID
    validation_count: int
    artifact_hash: str
    staged: bool


@dataclass(frozen=True, slots=True)
class SubmissionPublicationResult:
    submission_run_id: UUID
    artifact_hash: str
    private_artifact_key: str


@dataclass(frozen=True, slots=True)
class SubmissionPipelineResult:
    submission_run_id: UUID
    publication_state: str
    blockers: tuple[SubmissionBlocker, ...] = ()
    artifact_hash: str | None = None
    private_artifact_key: str | None = None
    submission_evaluation_id: UUID | None = None


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
    structural_diagnostics: tuple[StructuralDiagnostic, ...] = ()


@dataclass(frozen=True, slots=True)
class StoredAttachment:
    attachment_id: UUID
    file_name: str
    content_hash: str
    data: bytes


@dataclass(frozen=True, slots=True)
class CaseDocuments:
    case_id: UUID
    email_id: UUID
    source_message_id: str | None
    classification_state: str
    category: Category | None
    assigned_owner_id: str | None
    attachments: tuple[StoredAttachment, ...]


@dataclass(frozen=True, slots=True)
class CaseReviewActionRecord:
    review_action_id: UUID
    actor_id: str
    action: str
    rationale: str
    corrected_fields: dict[str, Any] | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class CaseReviewStatus:
    case_id: UUID
    classification_state: str
    status: Status | None
    review_reason: ReviewReason | None
    assigned_owner_id: str | None
    review_fields: tuple[ComparedField, ...]
    disposition: str
    actions: tuple[CaseReviewActionRecord, ...]


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
    actions: tuple[CaseReviewActionRecord, ...] = ()


@dataclass(frozen=True, slots=True)
class JudgeAttempt:
    """How one judge check ended: SUCCEEDED, or FAILED with a failure."""

    state: str
    latency_ms: int
    completed_at: datetime
    failure_code: str | None = None
    failure_retryable: bool | None = None
    failure_message: str | None = None


@dataclass(frozen=True, slots=True)
class JudgeDocumentSnapshot:
    attachment_id: UUID
    slot: str
    file_name: str
    detected_format: str
    byte_size: int
    role: str | None


@dataclass(frozen=True, slots=True)
class JudgeRunSnapshot:
    judge_run_id: UUID
    case_id: UUID
    state: str
    attempt: int
    failure_code: str | None
    failure_retryable: bool | None
    failure_message: str | None
    latency_ms: int
    created_at: datetime
    completed_at: datetime
    documents: tuple[JudgeDocumentSnapshot, ...]
    evaluator_output: EvaluatorOutput | None
    field_verdicts: tuple[FieldVerdict, ...]
    structural_diagnostics: tuple[StructuralDiagnostic, ...]


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


def validate_case_action_input(
    action: str, corrected_fields: dict[str, Any] | None
) -> None:
    """Reject a case disposition's corrected fields that cannot be recorded."""
    if action == "CORRECT":
        if not corrected_fields:
            raise ValueError("CORRECT requires corrected_fields")
        valid_fields = {field.value for field in ComparedField}
        for key, value in corrected_fields.items():
            if key not in valid_fields:
                raise ValueError("corrected_fields keys must be compared fields")
            if isinstance(value, bool) or not isinstance(value, (str, int, float)):
                raise ValueError(  # noqa: TRY004 - one atomic validation surface
                    "corrected_fields values must be str, int, or float"
                )
            if isinstance(value, float) and not math.isfinite(value):
                # JSONB rejects NaN and Infinity at write time.
                raise ValueError("corrected_fields values must be finite numbers")
            if isinstance(value, str) and "\x00" in value:
                # JSONB, like any PostgreSQL text, cannot store a NUL character.
                raise ValueError("corrected_fields values must not contain NUL")
    elif corrected_fields:
        raise ValueError(f"{action} cannot carry corrected_fields")


def _review_action_record(action: ReviewActionRecord) -> CaseReviewActionRecord:
    return CaseReviewActionRecord(
        review_action_id=action.review_action_id,
        actor_id=action.actor_id,
        action=action.action,
        rationale=action.rationale,
        corrected_fields=action.corrected_fields,
        created_at=action.created_at,
    )


def _case_review_status(
    case: CaseRecord,
    verdict_rows: Sequence[FieldVerdictRecord],
    action_rows: Sequence[ReviewActionRecord],
) -> CaseReviewStatus:
    verdicts_by_field = {verdict.field: verdict for verdict in verdict_rows}
    review_fields = tuple(
        field
        for field in ComparedField
        if (verdict := verdicts_by_field.get(field)) is not None
        and verdict.interactive_state == "REVIEW"
    )
    actions = tuple(_review_action_record(action) for action in action_rows)
    if actions:
        disposition = {
            "APPROVE": "APPROVED",
            "CORRECT": "CORRECTED",
            "REJECT": "REJECTED",
        }[actions[-1].action]
    elif case.classification_state != "CLASSIFIED":
        disposition = "OPEN"
    elif case.status is Status.NEEDS_REVIEW or review_fields:
        disposition = "IN_REVIEW"
    else:
        disposition = "AUTO_COMPLETED"
    return CaseReviewStatus(
        case_id=case.case_id,
        classification_state=case.classification_state,
        status=case.status,
        review_reason=case.review_reason,
        assigned_owner_id=case.assigned_owner_id,
        review_fields=review_fields,
        disposition=disposition,
        actions=actions,
    )


def _exception_state(
    reconciliation_id: UUID,
    assignments: Sequence[ReviewAssignmentRecord],
    action_rows: Sequence[ReviewActionRecord],
) -> ReconciliationExceptionState:
    current = assignments[-1]
    return ReconciliationExceptionState(
        reconciliation_id=reconciliation_id,
        assigned_owner_id=current.assigned_owner_id,
        state=current.state,
        review_assignment_ids=tuple(item.review_assignment_id for item in assignments),
        review_action_ids=tuple(item.review_action_id for item in action_rows),
        actions=tuple(_review_action_record(item) for item in action_rows),
    )


def _judge_run_snapshot(
    run: JudgeRunRecord,
    case: CaseRecord,
    verdict_rows: Sequence[FieldVerdictRecord],
    attachment_rows: Sequence[tuple[EmailAttachment, SourceObject]],
    roles: dict[UUID, str | None],
) -> JudgeRunSnapshot:
    field_order = {field: index for index, field in enumerate(ComparedField)}
    return JudgeRunSnapshot(
        judge_run_id=run.judge_run_id,
        case_id=run.case_id,
        state=run.state,
        attempt=run.attempt,
        failure_code=run.failure_code,
        failure_retryable=run.failure_retryable,
        failure_message=run.failure_message,
        latency_ms=run.latency_ms,
        created_at=run.created_at,
        completed_at=run.updated_at,
        documents=tuple(
            JudgeDocumentSnapshot(
                attachment_id=attachment.attachment_id,
                slot=run.slots[str(attachment.attachment_id)],
                file_name=attachment.file_name,
                detected_format=source.detected_format,
                byte_size=source.byte_size,
                role=roles.get(attachment.attachment_id),
            )
            for attachment, source in attachment_rows
        ),
        evaluator_output=(
            None
            if case.evaluator_output is None
            else EvaluatorOutput.model_validate(case.evaluator_output)
        ),
        field_verdicts=tuple(
            FieldVerdict(
                field=row.field,
                si=row.si_value,
                draft_bl=row.draft_bl_value,
                deterministic_result=row.deterministic_result,
                semantic_probability=row.semantic_probability,
                interactive_state=row.interactive_state,
                batch_result=row.batch_result,
                reason=row.reason,
            )
            for row in sorted(verdict_rows, key=lambda row: field_order[row.field])
        ),
        structural_diagnostics=tuple(
            StructuralDiagnostic.model_validate(item)
            for item in case.structural_diagnostics
        ),
    )


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
        self._validate_case_evidence(
            case.evaluator_output, case.field_verdicts, case.structural_diagnostics
        )

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
                    structural_diagnostics=[
                        diagnostic.model_dump(mode="json")
                        for diagnostic in case.structural_diagnostics
                    ],
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
                    "structural_diagnostics": [
                        diagnostic.model_dump(mode="json")
                        for diagnostic in case.structural_diagnostics
                    ],
                },
                audit=audit,
            )
        return case.case_id

    async def record_comparison_result(
        self,
        *,
        case_id: UUID,
        evaluator_output: EvaluatorOutput,
        field_verdicts: tuple[FieldVerdict, ...],
        structural_diagnostics: tuple[StructuralDiagnostic, ...],
        model_version: str,
        prompt_version: str,
        normalization_version: str,
        audit: AuditContext,
        review_owner_id: str | None = None,
    ) -> None:
        self._validate_case_evidence(
            evaluator_output, field_verdicts, structural_diagnostics
        )
        if review_owner_id is not None and not review_owner_id.strip():
            raise ValueError("review_owner_id must not be empty")

        async with self._session_factory() as session, session.begin():
            workspace_id = await session.scalar(
                select(CaseRecord.workspace_id).where(CaseRecord.case_id == case_id)
            )
            if workspace_id is None:
                raise ValueError("classification case does not exist")
            # Match every other mutation's lock order: guest session before domain row.
            await self._require_active_guest_workspace(session, workspace_id)
            case = await session.scalar(
                select(CaseRecord)
                .where(CaseRecord.case_id == case_id)
                .with_for_update()
            )
            if case is None:
                raise ValueError("classification case does not exist")
            if (
                case.classification_state != "BL_READY"
                or case.category is not Category.BL_COMPARISON
            ):
                raise ValueError("case is not awaiting comparison")

            case.classification_state = "CLASSIFIED"
            case.status = evaluator_output.status
            case.review_reason = evaluator_output.review_reason
            case.evaluator_output = evaluator_output.model_dump(mode="json")
            case.structural_diagnostics = [
                diagnostic.model_dump(mode="json")
                for diagnostic in structural_diagnostics
            ]
            case.model_version = model_version
            case.prompt_version = prompt_version
            case.normalization_version = normalization_version
            case.rule_version = audit.rule_version
            for verdict in field_verdicts:
                session.add(
                    FieldVerdictRecord(
                        field_verdict_id=uuid4(),
                        case_id=case_id,
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
                entity_id=str(case_id),
                event_type="CASE_COMPARED",
                source_hashes=await self._email_source_hashes(session, case.email_id),
                payload={
                    "case_id": str(case_id),
                    "evaluator_output": evaluator_output.model_dump(mode="json"),
                    "field_verdict_count": len(field_verdicts),
                    "structural_diagnostics": [
                        diagnostic.model_dump(mode="json")
                        for diagnostic in structural_diagnostics
                    ],
                },
                audit=audit,
            )

            if review_owner_id is not None:
                assignment_id = uuid4()
                session.add(
                    ReviewAssignmentRecord(
                        review_assignment_id=assignment_id,
                        workspace_id=workspace_id,
                        target_type="CASE",
                        case_id=case_id,
                        reconciliation_id=None,
                        assigned_owner_id=review_owner_id,
                        state="ASSIGNED",
                    )
                )
                await self._append_audit(
                    session,
                    workspace_id=workspace_id,
                    entity_type="REVIEW_ASSIGNMENT",
                    entity_id=str(assignment_id),
                    event_type="REVIEW_ASSIGNED",
                    source_hashes=[],
                    payload={
                        "assigned_owner_id": review_owner_id,
                        "state": "ASSIGNED",
                        "target_type": "CASE",
                    },
                    audit=audit,
                )

    async def load_case_documents(
        self,
        *,
        workspace_id: UUID,
        case_id: UUID,
    ) -> CaseDocuments:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            case = await session.scalar(
                select(CaseRecord).where(CaseRecord.case_id == case_id)
            )
            if case is None or case.workspace_id != workspace_id:
                raise ValueError("case does not belong to workspace")
            source_message_id = await session.scalar(
                select(EmailReceipt.source_message_id).where(
                    EmailReceipt.email_id == case.email_id
                )
            )
            rows = (
                await session.execute(
                    select(EmailAttachment, SourceObject)
                    .join(
                        SourceObject,
                        EmailAttachment.source_object_id
                        == SourceObject.source_object_id,
                    )
                    .where(EmailAttachment.email_id == case.email_id)
                    .order_by(EmailAttachment.ordinal)
                )
            ).all()

        attachments: list[StoredAttachment] = []
        for attachment, source_object in rows:
            data = await self._object_store.read_private(
                source_object.private_object_key
            )
            if sha256_hex(data) != source_object.content_hash:
                raise ValueError("stored attachment bytes do not match content hash")
            attachments.append(
                StoredAttachment(
                    attachment_id=attachment.attachment_id,
                    file_name=attachment.file_name,
                    content_hash=source_object.content_hash,
                    data=data,
                )
            )
        return CaseDocuments(
            case_id=case.case_id,
            email_id=case.email_id,
            source_message_id=source_message_id,
            classification_state=case.classification_state,
            category=case.category,
            assigned_owner_id=case.assigned_owner_id,
            attachments=tuple(attachments),
        )

    async def list_cases_awaiting_comparison(
        self,
        *,
        workspace_id: UUID,
    ) -> tuple[UUID, ...]:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            case_ids = list(
                await session.scalars(
                    select(CaseRecord.case_id)
                    .where(
                        CaseRecord.workspace_id == workspace_id,
                        CaseRecord.classification_state == "BL_READY",
                    )
                    .order_by(CaseRecord.created_at, CaseRecord.case_id)
                )
            )
        return tuple(case_ids)

    async def get_case_review_status(
        self,
        *,
        workspace_id: UUID,
        case_id: UUID,
    ) -> CaseReviewStatus:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            case = await session.scalar(
                select(CaseRecord).where(CaseRecord.case_id == case_id)
            )
            if case is None or case.workspace_id != workspace_id:
                raise ValueError("case does not belong to workspace")
            verdict_rows = list(
                await session.scalars(
                    select(FieldVerdictRecord).where(
                        FieldVerdictRecord.case_id == case_id
                    )
                )
            )
            action_rows = list(
                await session.scalars(
                    select(ReviewActionRecord)
                    .where(
                        ReviewActionRecord.target_type == "CASE",
                        ReviewActionRecord.case_id == case_id,
                    )
                    .order_by(
                        ReviewActionRecord.created_at,
                        ReviewActionRecord.review_action_id,
                    )
                )
            )
        return _case_review_status(case, verdict_rows, action_rows)

    async def get_case_review_statuses(
        self,
        *,
        workspace_id: UUID,
    ) -> dict[UUID, CaseReviewStatus]:
        """The review status of every case in a workspace, keyed by case ID."""
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            cases = list(
                await session.scalars(
                    select(CaseRecord).where(CaseRecord.workspace_id == workspace_id)
                )
            )
            verdict_rows = list(
                await session.scalars(
                    select(FieldVerdictRecord)
                    .join(CaseRecord, CaseRecord.case_id == FieldVerdictRecord.case_id)
                    .where(CaseRecord.workspace_id == workspace_id)
                )
            )
            action_rows = list(
                await session.scalars(
                    select(ReviewActionRecord)
                    .where(
                        ReviewActionRecord.workspace_id == workspace_id,
                        ReviewActionRecord.target_type == "CASE",
                    )
                    .order_by(
                        ReviewActionRecord.created_at,
                        ReviewActionRecord.review_action_id,
                    )
                )
            )

        verdicts_by_case: dict[UUID, list[FieldVerdictRecord]] = defaultdict(list)
        for verdict in verdict_rows:
            verdicts_by_case[verdict.case_id].append(verdict)
        actions_by_case: dict[UUID, list[ReviewActionRecord]] = defaultdict(list)
        for action in action_rows:
            actions_by_case[action.case_id].append(action)
        return {
            case.case_id: _case_review_status(
                case, verdicts_by_case[case.case_id], actions_by_case[case.case_id]
            )
            for case in cases
        }

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
            await session.flush()
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
            if action.target_type == "CASE":
                case = await session.scalar(
                    select(CaseRecord)
                    .where(CaseRecord.case_id == action.case_id)
                    .with_for_update()
                )
                if case is None:
                    raise ValueError("case does not belong to workspace")
                in_review_field = await session.scalar(
                    select(FieldVerdictRecord.field_verdict_id)
                    .where(
                        FieldVerdictRecord.case_id == action.case_id,
                        FieldVerdictRecord.interactive_state == "REVIEW",
                    )
                    .limit(1)
                )
                if case.classification_state != "CLASSIFIED" or (
                    case.status is not Status.NEEDS_REVIEW and in_review_field is None
                ):
                    raise ValueError("case is not open for review")
                existing_action = await session.scalar(
                    select(ReviewActionRecord.review_action_id).where(
                        ReviewActionRecord.target_type == "CASE",
                        ReviewActionRecord.case_id == action.case_id,
                    )
                )
                if existing_action is not None:
                    raise ValueError("case already has a review action")
                validate_case_action_input(action.action, action.corrected_fields)
            state_assignment: ReviewAssignmentRecord | None = None
            if action.target_type == "CASE":
                # A disposition closes the case's open review assignment.
                latest_assignment = await session.scalar(
                    select(ReviewAssignmentRecord)
                    .where(
                        ReviewAssignmentRecord.workspace_id == workspace_id,
                        ReviewAssignmentRecord.target_type == "CASE",
                        ReviewAssignmentRecord.case_id == action.case_id,
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
                    and latest_assignment.state != "RESOLVED"
                ):
                    state_assignment = ReviewAssignmentRecord(
                        review_assignment_id=uuid4(),
                        workspace_id=workspace_id,
                        target_type="CASE",
                        case_id=action.case_id,
                        reconciliation_id=None,
                        assigned_owner_id=latest_assignment.assigned_owner_id,
                        state="RESOLVED",
                    )
                    session.add(state_assignment)
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
                target = (
                    {"case_id": str(action.case_id)}
                    if action.target_type == "CASE"
                    else {"reconciliation_id": str(action.reconciliation_id)}
                )
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
                        **target,
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
            action_rows = list(
                await session.scalars(
                    select(ReviewActionRecord)
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
        return _exception_state(reconciliation_id, assignments, action_rows)

    async def get_reconciliation_exception_states(
        self,
        *,
        workspace_id: UUID,
    ) -> dict[UUID, ReconciliationExceptionState | None]:
        """Every reconciliation result in a workspace, keyed by ID, with its
        exception review state, or None while the result was never assigned."""
        async with self._session_factory() as session:
            reconciliation_ids = list(
                await session.scalars(
                    select(ReconciliationResultRecord.reconciliation_id)
                    .join(ReconciliationRun)
                    .where(ReconciliationRun.workspace_id == workspace_id)
                )
            )
            assignment_rows = list(
                await session.scalars(
                    select(ReviewAssignmentRecord)
                    .where(
                        ReviewAssignmentRecord.workspace_id == workspace_id,
                        ReviewAssignmentRecord.target_type
                        == "RECONCILIATION_EXCEPTION",
                    )
                    .order_by(
                        ReviewAssignmentRecord.created_at,
                        ReviewAssignmentRecord.review_assignment_id,
                    )
                )
            )
            action_rows = list(
                await session.scalars(
                    select(ReviewActionRecord)
                    .where(
                        ReviewActionRecord.workspace_id == workspace_id,
                        ReviewActionRecord.target_type == "RECONCILIATION_EXCEPTION",
                    )
                    .order_by(
                        ReviewActionRecord.created_at,
                        ReviewActionRecord.review_action_id,
                    )
                )
            )

        assignments: dict[UUID, list[ReviewAssignmentRecord]] = defaultdict(list)
        for assignment in assignment_rows:
            assignments[assignment.reconciliation_id].append(assignment)
        actions: dict[UUID, list[ReviewActionRecord]] = defaultdict(list)
        for action in action_rows:
            actions[action.reconciliation_id].append(action)
        return {
            reconciliation_id: _exception_state(
                reconciliation_id,
                assignments[reconciliation_id],
                actions[reconciliation_id],
            )
            if assignments[reconciliation_id]
            else None
            for reconciliation_id in reconciliation_ids
        }

    async def record_document_role_decision(
        self,
        *,
        workspace_id: UUID,
        decision: DocumentRoleDecisionInput,
        audit: AuditContext,
    ) -> UUID:
        self._validate_document_role_decision(decision)

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            scoped_attachment = (
                await session.execute(
                    select(EmailReceipt.workspace_id, SourceObject.content_hash)
                    .select_from(EmailAttachment)
                    .join(
                        EmailReceipt,
                        EmailReceipt.email_id == EmailAttachment.email_id,
                    )
                    .join(
                        SourceObject,
                        SourceObject.source_object_id
                        == EmailAttachment.source_object_id,
                    )
                    .where(EmailAttachment.attachment_id == decision.attachment_id)
                )
            ).first()
            if (
                scoped_attachment is None
                or scoped_attachment.workspace_id != workspace_id
            ):
                raise ValueError("attachment does not belong to workspace")
            if scoped_attachment.content_hash != decision.content_hash:
                raise ValueError("content hash does not match the attachment")

            decision_id = uuid4()
            session.add(
                DocumentRoleDecisionRecord(
                    document_role_decision_id=decision_id,
                    workspace_id=workspace_id,
                    attachment_id=decision.attachment_id,
                    content_hash=decision.content_hash,
                    outcome=decision.outcome,
                    role=decision.role,
                    role_probabilities=decision.role_probabilities,
                    requested_model=decision.requested_model,
                    returned_model=decision.returned_model,
                    prompt_version=decision.prompt_version,
                    rule_version=audit.rule_version,
                    provider_request_id=decision.provider_request_id,
                    correlation_id=decision.correlation_id,
                    safe_diagnostic=decision.safe_diagnostic,
                    retryable=decision.retryable,
                    started_at=decision.started_at,
                    completed_at=decision.completed_at,
                )
            )
            event_type = (
                "DOCUMENT_ROLE_DECIDED"
                if decision.outcome == "SUCCEEDED"
                else "DOCUMENT_ROLE_FAILED"
            )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="ATTACHMENT",
                entity_id=str(decision.attachment_id),
                event_type=event_type,
                source_hashes=[decision.content_hash],
                payload={
                    "role": decision.role,
                    "role_probabilities": decision.role_probabilities,
                    "provider_request_id": decision.provider_request_id,
                    "correlation_id": decision.correlation_id,
                    "safe_diagnostic": decision.safe_diagnostic,
                },
                audit=audit,
            )
            return decision_id

    async def latest_document_role_decisions(
        self,
        *,
        workspace_id: UUID,
        email_id: UUID,
    ) -> dict[UUID, DocumentRoleSnapshot]:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            email_workspace_id = await session.scalar(
                select(EmailReceipt.workspace_id).where(
                    EmailReceipt.email_id == email_id
                )
            )
            if email_workspace_id != workspace_id:
                raise ValueError("email does not belong to workspace")
            decisions = await session.scalars(
                select(DocumentRoleDecisionRecord)
                .join(
                    EmailAttachment,
                    EmailAttachment.attachment_id
                    == DocumentRoleDecisionRecord.attachment_id,
                )
                .where(
                    EmailAttachment.email_id == email_id,
                    DocumentRoleDecisionRecord.workspace_id == workspace_id,
                )
                .order_by(
                    DocumentRoleDecisionRecord.created_at,
                    DocumentRoleDecisionRecord.document_role_decision_id,
                )
            )
            latest: dict[UUID, DocumentRoleSnapshot] = {}
            for record in decisions:
                latest[record.attachment_id] = DocumentRoleSnapshot(
                    attachment_id=record.attachment_id,
                    content_hash=record.content_hash,
                    outcome=record.outcome,
                    role=record.role,
                    role_probabilities=record.role_probabilities,
                    returned_model=record.returned_model,
                    provider_request_id=record.provider_request_id,
                )
            return latest

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
        document_text: str | None = None,
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
                    document_text=document_text,
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

    async def get_cached_extraction_entry(
        self,
        *,
        workspace_id: UUID,
        content_hash: str,
        extractor_version: str,
        extraction_schema_version: str,
    ) -> CachedExtractionEntry | None:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            await self._scoped_source_object_id(
                session,
                workspace_id=workspace_id,
                content_hash=content_hash,
            )
            row = (
                await session.execute(
                    select(
                        ExtractionCache.extractor_route,
                        ExtractionCache.result,
                        ExtractionCache.document_text,
                    ).where(
                        ExtractionCache.content_hash == content_hash,
                        ExtractionCache.extractor_version == extractor_version,
                        ExtractionCache.extraction_schema_version
                        == extraction_schema_version,
                    )
                )
            ).first()
            if row is None:
                return None
            return CachedExtractionEntry(
                extractor_route=row.extractor_route,
                result=ExtractionResult.model_validate(row.result),
                document_text=row.document_text,
            )

    async def record_extraction_event(
        self,
        *,
        workspace_id: UUID,
        content_hash: str,
        event_type: str,
        payload: dict[str, Any],
        audit: AuditContext,
    ) -> None:
        if event_type not in {"GEMINI_SECOND_KEY_USED", "EXTRACTION_FAILED"}:
            raise ValueError("unsupported extraction event type")

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            source_object_id = await self._scoped_source_object_id(
                session,
                workspace_id=workspace_id,
                content_hash=content_hash,
            )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="ATTACHMENT",
                entity_id=str(source_object_id),
                event_type=event_type,
                source_hashes=[content_hash],
                payload=payload,
                audit=audit,
            )

    async def create_submission_run(
        self,
        *,
        workspace_id: UUID,
        input_manifest_hash: str,
        expected_email_ids: list[str],
        rule_version: str,
        serializer_version: str = "submission-v1",
        version_manifest: dict[str, Any] | None = None,
        audit: AuditContext,
    ) -> SubmissionRunResult:
        if expected_email_ids != list(EXPECTED_EMAIL_IDS):
            raise ValueError("submission runs require the exact 520-email manifest")
        if len(input_manifest_hash) != 64 or any(
            character not in "0123456789abcdef" for character in input_manifest_hash
        ):
            raise ValueError("input_manifest_hash must be a lowercase SHA-256 digest")
        if not rule_version.strip() or not serializer_version.strip():
            raise ValueError(
                "submission rule and serializer versions must not be empty"
            )
        version_manifest = dict(version_manifest or {})
        _canonical_json(version_manifest)

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
                    blockers=[],
                    serializer_version=serializer_version,
                    version_manifest=version_manifest,
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
                existing = await session.scalar(
                    select(SubmissionRun).where(
                        SubmissionRun.workspace_id == workspace_id,
                        SubmissionRun.input_manifest_hash == input_manifest_hash,
                        SubmissionRun.rule_version == rule_version,
                    )
                )
                if existing is None:
                    raise RuntimeError("submission run upsert produced no row")
                if existing.expected_email_ids != expected_email_ids:
                    raise IdempotencyConflict(
                        "submission run replay changed the expected email manifest"
                    )
                if (
                    existing.serializer_version != serializer_version
                    or existing.version_manifest != version_manifest
                ):
                    raise IdempotencyConflict(
                        "submission run replay changed its version manifest"
                    )
                return SubmissionRunResult(
                    submission_run_id=existing.submission_run_id,
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
                    "serializer_version": serializer_version,
                    "version_manifest": version_manifest,
                },
                audit=audit,
            )
        return SubmissionRunResult(submission_run_id=created_id, created=True)

    async def collect_submission_case_snapshots(
        self,
        *,
        workspace_id: UUID,
    ) -> tuple[SubmissionCaseSnapshot, ...]:
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            rows = (
                await session.execute(
                    select(EmailReceipt.source_message_id, CaseRecord)
                    .outerjoin(CaseRecord, CaseRecord.email_id == EmailReceipt.email_id)
                    .where(
                        EmailReceipt.workspace_id == workspace_id,
                        EmailReceipt.source_message_id.in_(EXPECTED_EMAIL_IDS),
                    )
                )
            ).all()
            cases_by_email = {
                source_message_id: case
                for source_message_id, case in rows
                if source_message_id is not None
            }
            classified_case_ids = [
                case.case_id
                for case in cases_by_email.values()
                if case is not None and case.classification_state == "CLASSIFIED"
            ]
            verdicts = list(
                await session.scalars(
                    select(FieldVerdictRecord)
                    .where(FieldVerdictRecord.case_id.in_(classified_case_ids))
                    .order_by(FieldVerdictRecord.case_id, FieldVerdictRecord.field)
                )
            )

        verdicts_by_case: dict[UUID, list[FieldVerdictRecord]] = {}
        for verdict in verdicts:
            verdicts_by_case.setdefault(verdict.case_id, []).append(verdict)

        blockers: list[SubmissionBlocker] = []
        snapshots: list[SubmissionCaseSnapshot] = []
        missing_receipts = [
            email_id
            for email_id in EXPECTED_EMAIL_IDS
            if email_id not in cases_by_email
        ]
        if missing_receipts:
            blockers.append(
                SubmissionBlocker(
                    code=SubmissionBlockerCode.INCOMPLETE_EMAIL_SET,
                    message=(
                        "missing persisted inbox receipts for: "
                        + ", ".join(missing_receipts)
                    ),
                )
            )

        for email_id in EXPECTED_EMAIL_IDS:
            if email_id not in cases_by_email:
                continue
            case = cases_by_email[email_id]
            if case is None or case.classification_state == "PENDING":
                blockers.append(
                    SubmissionBlocker(
                        code=SubmissionBlockerCode.MISSING_CATEGORY,
                        email_id=email_id,
                        message=f"{email_id} has no completed category decision",
                    )
                )
                continue
            if case.classification_state == "PROVIDER_FAILED":
                blockers.append(
                    SubmissionBlocker(
                        code=SubmissionBlockerCode.PROVIDER_FAILURE,
                        email_id=email_id,
                        message=f"{email_id} category provider attempt failed",
                    )
                )
                continue
            if case.classification_state == "BL_READY":
                blockers.append(
                    SubmissionBlocker(
                        code=SubmissionBlockerCode.INCOMPLETE_COMPARISON,
                        email_id=email_id,
                        message=(f"{email_id} awaits the document comparison pipeline"),
                    )
                )
                continue
            if case.classification_state != "CLASSIFIED" or case.category is None:
                blockers.append(
                    SubmissionBlocker(
                        code=SubmissionBlockerCode.SCHEMA_FAILURE,
                        email_id=email_id,
                        message=f"{email_id} has an invalid persisted case state",
                    )
                )
                continue

            try:
                if case.category is not Category.BL_COMPARISON:
                    snapshots.append(
                        SubmissionCaseSnapshot(
                            email_id=email_id,
                            case_id=case.case_id,
                            category=case.category,
                        )
                    )
                    continue

                structural_diagnostics = tuple(
                    StructuralDiagnostic.model_validate(diagnostic)
                    for diagnostic in case.structural_diagnostics
                )
                field_snapshots: tuple[SubmissionFieldSnapshot, ...] = ()
                if not structural_diagnostics:
                    field_snapshots = tuple(
                        self._submission_field_snapshot(verdict)
                        for verdict in verdicts_by_case.get(case.case_id, [])
                    )
                snapshots.append(
                    SubmissionCaseSnapshot(
                        email_id=email_id,
                        case_id=case.case_id,
                        category=case.category,
                        structural_diagnostics=structural_diagnostics,
                        field_snapshots=field_snapshots,
                    )
                )
            except ValueError as error:
                blockers.append(
                    SubmissionBlocker(
                        code=SubmissionBlockerCode.SCHEMA_FAILURE,
                        email_id=email_id,
                        message=f"{email_id} comparison evidence is invalid: {error}",
                    )
                )

        if blockers:
            raise SubmissionBlockedError(blockers)
        return tuple(snapshots)

    async def execute_submission_run(
        self,
        *,
        workspace_id: UUID,
        input_manifest_hash: str,
        rule_version: str,
        serializer_version: str,
        version_manifest: dict[str, Any],
        scoring_endpoint: str | None,
        audit: AuditContext,
    ) -> SubmissionPipelineResult:
        run_result = await self.create_submission_run(
            workspace_id=workspace_id,
            input_manifest_hash=input_manifest_hash,
            expected_email_ids=list(EXPECTED_EMAIL_IDS),
            rule_version=rule_version,
            serializer_version=serializer_version,
            version_manifest=version_manifest,
            audit=audit,
        )
        async with self._session_factory() as session:
            run = await session.get(SubmissionRun, run_result.submission_run_id)
            if run is None or run.workspace_id != workspace_id:
                raise RuntimeError("submission run disappeared after creation")
            current_state = run.publication_state

        artifact: SubmissionArtifact | None = None
        if current_state not in {"STAGED", "PUBLISHED"}:
            try:
                snapshots = await self.collect_submission_case_snapshots(
                    workspace_id=workspace_id
                )
                artifact = build_submission_artifact(snapshots)
                await self.stage_submission_run(
                    workspace_id=workspace_id,
                    submission_run_id=run_result.submission_run_id,
                    snapshots=snapshots,
                    artifact=artifact,
                    version_manifest=version_manifest,
                    audit=audit,
                )
            except SubmissionBlockedError as error:
                resulting_state = await self.mark_submission_run_blocked(
                    workspace_id=workspace_id,
                    submission_run_id=run_result.submission_run_id,
                    blockers=error.blockers,
                    audit=audit,
                )
                if resulting_state == "BLOCKED":
                    return SubmissionPipelineResult(
                        submission_run_id=run_result.submission_run_id,
                        publication_state="BLOCKED",
                        blockers=error.blockers,
                    )
                artifact = None
            except (IdempotencyConflict, ValueError) as error:
                blocker = SubmissionBlocker(
                    code=SubmissionBlockerCode.SCHEMA_FAILURE,
                    message=f"submission staging failed validation: {error}",
                )
                resulting_state = await self.mark_submission_run_blocked(
                    workspace_id=workspace_id,
                    submission_run_id=run_result.submission_run_id,
                    blockers=(blocker,),
                    audit=audit,
                )
                if resulting_state == "BLOCKED":
                    return SubmissionPipelineResult(
                        submission_run_id=run_result.submission_run_id,
                        publication_state="BLOCKED",
                        blockers=(blocker,),
                    )
                artifact = None
            except (RuntimeError, SQLAlchemyError) as error:
                blocker = SubmissionBlocker(
                    code=SubmissionBlockerCode.SCHEMA_FAILURE,
                    message=(
                        f"submission staging failed safely: {type(error).__name__}"
                    ),
                )
                resulting_state = await self.mark_submission_run_blocked(
                    workspace_id=workspace_id,
                    submission_run_id=run_result.submission_run_id,
                    blockers=(blocker,),
                    audit=audit,
                )
                if resulting_state == "BLOCKED":
                    return SubmissionPipelineResult(
                        submission_run_id=run_result.submission_run_id,
                        publication_state="BLOCKED",
                        blockers=(blocker,),
                    )
                artifact = None

        publication = await self.publish_submission_run(
            workspace_id=workspace_id,
            submission_run_id=run_result.submission_run_id,
            audit=audit,
        )
        if artifact is None:
            artifact_bytes = await self._object_store.read_private(
                publication.private_artifact_key
            )
            artifact = SubmissionArtifact(
                canonical_bytes=artifact_bytes,
                sha256=publication.artifact_hash,
                record_count=520,
            )
            validate_submission_artifact(artifact)

        started_at = datetime.now(UTC)
        scoring_result = await score_submission_artifact(
            artifact,
            endpoint=scoring_endpoint,
        )
        evaluation_id = await self.append_submission_evaluation(
            workspace_id=workspace_id,
            submission_run_id=run_result.submission_run_id,
            result=scoring_result,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            audit=audit,
        )
        return SubmissionPipelineResult(
            submission_run_id=run_result.submission_run_id,
            publication_state="PUBLISHED",
            artifact_hash=publication.artifact_hash,
            private_artifact_key=publication.private_artifact_key,
            submission_evaluation_id=evaluation_id,
        )

    @staticmethod
    def _submission_field_snapshot(
        verdict: FieldVerdictRecord,
    ) -> SubmissionFieldSnapshot:
        if (
            verdict.deterministic_result in {"MATCH", "MISMATCH"}
            and verdict.semantic_probability is None
        ):
            snapshot = SubmissionFieldSnapshot(
                field=verdict.field,
                deterministic_result=verdict.deterministic_result,
            )
        elif (
            verdict.deterministic_result in {None, "NOT_APPLICABLE"}
            and verdict.semantic_probability is not None
        ):
            snapshot = SubmissionFieldSnapshot(
                field=verdict.field,
                semantic_probability=float(verdict.semantic_probability),
            )
        else:
            raise ValueError(
                f"{verdict.field.value} lacks one unambiguous comparison decision"
            )
        if verdict.batch_result != snapshot.batch_result:
            raise ValueError(
                f"{verdict.field.value} batch result contradicts its evidence"
            )
        return snapshot

    async def mark_submission_run_blocked(
        self,
        *,
        workspace_id: UUID,
        submission_run_id: UUID,
        blockers: Sequence[SubmissionBlocker],
        audit: AuditContext,
    ) -> str:
        blocker_payload = [blocker.model_dump(mode="json") for blocker in blockers]
        if not blocker_payload:
            raise ValueError("a blocked submission run requires at least one blocker")
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(SubmissionRun)
                .where(SubmissionRun.submission_run_id == submission_run_id)
                .with_for_update()
            )
            if run is None or run.workspace_id != workspace_id:
                raise ValueError("submission run does not belong to workspace")
            if run.publication_state in {"STAGED", "PUBLISHED"}:
                return run.publication_state
            if run.publication_state == "BLOCKED" and run.blockers == blocker_payload:
                return "BLOCKED"
            run.publication_state = "BLOCKED"
            run.blockers = blocker_payload
            run.validation_count = 0
            run.staged_at = None
            run.updated_at = datetime.now(UTC)
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SUBMISSION_RUN",
                entity_id=str(submission_run_id),
                event_type="SUBMISSION_RUN_BLOCKED",
                source_hashes=[run.input_manifest_hash],
                payload={"blockers": blocker_payload},
                audit=audit,
            )
        return "BLOCKED"

    async def stage_submission_run(
        self,
        *,
        workspace_id: UUID,
        submission_run_id: UUID,
        snapshots: Sequence[SubmissionCaseSnapshot],
        artifact: SubmissionArtifact,
        version_manifest: dict[str, Any],
        audit: AuditContext,
    ) -> SubmissionStageResult:
        validate_submission_artifact(artifact)
        rebuilt = build_submission_artifact(snapshots)
        if rebuilt != artifact:
            raise ValueError("artifact does not match the supplied case snapshots")
        _canonical_json(version_manifest)
        snapshots_by_id = {snapshot.email_id: snapshot for snapshot in snapshots}

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(SubmissionRun)
                .where(SubmissionRun.submission_run_id == submission_run_id)
                .with_for_update()
            )
            if run is None or run.workspace_id != workspace_id:
                raise ValueError("submission run does not belong to workspace")
            if run.expected_email_ids != list(EXPECTED_EMAIL_IDS):
                raise IdempotencyConflict(
                    "submission run has a different email manifest"
                )
            if run.version_manifest != version_manifest:
                raise IdempotencyConflict(
                    "submission run has a different version manifest"
                )
            if run.publication_state in {"STAGED", "PUBLISHED"}:
                existing_artifact = await self._submission_artifact_from_records(
                    session,
                    submission_run_id=submission_run_id,
                    expected_email_ids=run.expected_email_ids,
                )
                if existing_artifact.sha256 != artifact.sha256:
                    raise IdempotencyConflict(
                        "staged submission replay changed the artifact"
                    )
                return SubmissionStageResult(
                    submission_run_id=submission_run_id,
                    validation_count=520,
                    artifact_hash=artifact.sha256,
                    staged=False,
                )

            case_ids = [snapshot.case_id for snapshot in snapshots]
            case_rows = (
                await session.execute(
                    select(
                        CaseRecord,
                        EmailReceipt.source_message_id,
                        EmailReceipt.message_hash,
                    )
                    .join(EmailReceipt, EmailReceipt.email_id == CaseRecord.email_id)
                    .where(CaseRecord.case_id.in_(case_ids))
                    .with_for_update()
                )
            ).all()
            cases_by_id = {
                case.case_id: (case, source_message_id, message_hash)
                for case, source_message_id, message_hash in case_rows
            }
            verdicts = list(
                await session.scalars(
                    select(FieldVerdictRecord)
                    .where(FieldVerdictRecord.case_id.in_(case_ids))
                    .order_by(FieldVerdictRecord.case_id, FieldVerdictRecord.field)
                    .with_for_update()
                )
            )
            verdicts_by_case: dict[UUID, list[FieldVerdictRecord]] = {}
            for verdict in verdicts:
                verdicts_by_case.setdefault(verdict.case_id, []).append(verdict)
            attachment_hash_rows = (
                await session.execute(
                    select(CaseRecord.case_id, SourceObject.content_hash)
                    .join(
                        EmailAttachment,
                        EmailAttachment.email_id == CaseRecord.email_id,
                    )
                    .join(
                        SourceObject,
                        SourceObject.source_object_id
                        == EmailAttachment.source_object_id,
                    )
                    .where(CaseRecord.case_id.in_(case_ids))
                    .order_by(CaseRecord.case_id, EmailAttachment.ordinal)
                    .with_for_update()
                )
            ).all()
            attachment_hashes_by_case: dict[UUID, list[str]] = {}
            for case_id, content_hash in attachment_hash_rows:
                attachment_hashes_by_case.setdefault(case_id, []).append(content_hash)

            artifact_records = validate_submission_artifact(artifact)
            for email_id in EXPECTED_EMAIL_IDS:
                snapshot = snapshots_by_id[email_id]
                persisted = cases_by_id.get(snapshot.case_id)
                if persisted is None:
                    raise ValueError(f"{email_id} references a missing case")
                case, source_message_id, message_hash = persisted
                if (
                    case.workspace_id != workspace_id
                    or source_message_id != email_id
                    or case.classification_state != "CLASSIFIED"
                ):
                    raise ValueError(f"{email_id} does not reference a classified case")
                if case.evaluator_output is None:
                    raise ValueError(f"{email_id} has no persisted evaluator output")
                persisted_output = EvaluatorOutput.model_validate(case.evaluator_output)
                output_payload = serialize_evaluator_output(persisted_output)
                if output_payload != artifact_records[email_id]:
                    raise IdempotencyConflict(
                        f"{email_id} artifact output differs from persisted case state"
                    )
                snapshot_diagnostics = [
                    diagnostic.model_dump(mode="json")
                    for diagnostic in snapshot.structural_diagnostics
                ]
                if case.structural_diagnostics != snapshot_diagnostics:
                    raise IdempotencyConflict(
                        f"{email_id} structural diagnostics changed before staging"
                    )

                case_verdicts = verdicts_by_case.get(case.case_id, [])
                field_order = {
                    field: index for index, field in enumerate(ComparedField)
                }
                persisted_field_snapshots = tuple(
                    sorted(
                        (
                            self._submission_field_snapshot(verdict)
                            for verdict in case_verdicts
                        ),
                        key=lambda field_snapshot: field_order[field_snapshot.field],
                    )
                )
                snapshot_field_snapshots = tuple(
                    sorted(
                        snapshot.field_snapshots,
                        key=lambda field_snapshot: field_order[field_snapshot.field],
                    )
                )
                if persisted_field_snapshots != snapshot_field_snapshots:
                    raise IdempotencyConflict(
                        f"{email_id} comparison verdicts changed before staging"
                    )

                persisted_verdicts = [
                    {
                        "field": verdict.field.value,
                        "deterministic_result": verdict.deterministic_result,
                        "semantic_probability": verdict.semantic_probability,
                        "interactive_state": verdict.interactive_state,
                        "batch_result": verdict.batch_result,
                        "reason": verdict.reason,
                        "si_value": verdict.si_value,
                        "draft_bl_value": verdict.draft_bl_value,
                    }
                    for verdict in case_verdicts
                ]
                source_state = {
                    "email_id": email_id,
                    "case_id": str(case.case_id),
                    "classification_state": case.classification_state,
                    "evaluator_output": output_payload,
                    "structural_diagnostics": case.structural_diagnostics,
                    "field_verdicts": persisted_verdicts,
                    "source_hashes": [
                        message_hash,
                        *attachment_hashes_by_case.get(case.case_id, []),
                    ],
                    "versions": {
                        "model_version": case.model_version,
                        "prompt_version": case.prompt_version,
                        "normalization_version": case.normalization_version,
                        "rule_version": case.rule_version,
                    },
                }
                record_version_manifest = {
                    **version_manifest,
                    "case_model_version": case.model_version,
                    "case_prompt_version": case.prompt_version,
                    "normalization_version": case.normalization_version,
                    "case_rule_version": case.rule_version,
                }
                session.add(
                    SubmissionRunRecord(
                        submission_run_record_id=uuid4(),
                        submission_run_id=submission_run_id,
                        email_id=email_id,
                        case_id=case.case_id,
                        evaluator_output=output_payload,
                        record_hash=_payload_hash(output_payload),
                        source_state_hash=_payload_hash(source_state),
                        diagnostics=case.structural_diagnostics,
                        version_manifest=record_version_manifest,
                    )
                )

            # The database rejects record inserts after the run becomes STAGED.
            # Flush the complete set while the locked run is still resumable.
            await session.flush()
            run.publication_state = "STAGED"
            run.validation_count = 520
            run.blockers = []
            run.staged_at = datetime.now(UTC)
            run.updated_at = run.staged_at
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SUBMISSION_RUN",
                entity_id=str(submission_run_id),
                event_type="SUBMISSION_RUN_STAGED",
                source_hashes=[run.input_manifest_hash, artifact.sha256],
                payload={
                    "artifact_hash": artifact.sha256,
                    "validation_count": 520,
                    "version_manifest": version_manifest,
                },
                audit=audit,
            )
        return SubmissionStageResult(
            submission_run_id=submission_run_id,
            validation_count=520,
            artifact_hash=artifact.sha256,
            staged=True,
        )

    async def publish_submission_run(
        self,
        *,
        workspace_id: UUID,
        submission_run_id: UUID,
        audit: AuditContext,
    ) -> SubmissionPublicationResult:
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(SubmissionRun).where(
                    SubmissionRun.submission_run_id == submission_run_id
                )
            )
            if run is None or run.workspace_id != workspace_id:
                raise ValueError("submission run does not belong to workspace")
            if run.publication_state == "PUBLISHED":
                if not run.artifact_hash or not run.private_artifact_key:
                    raise RuntimeError(
                        "published submission run is missing its artifact"
                    )
                return SubmissionPublicationResult(
                    submission_run_id=submission_run_id,
                    artifact_hash=run.artifact_hash,
                    private_artifact_key=run.private_artifact_key,
                )
            if run.publication_state != "STAGED":
                raise ValueError("submission run must be staged before publication")
            artifact = await self._submission_artifact_from_records(
                session,
                submission_run_id=submission_run_id,
                expected_email_ids=run.expected_email_ids,
            )

        private_key = await self._object_store.put_artifact_if_absent(
            artifact.sha256, artifact.canonical_bytes
        )

        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(SubmissionRun)
                .where(SubmissionRun.submission_run_id == submission_run_id)
                .with_for_update()
            )
            if run is None or run.workspace_id != workspace_id:
                raise ValueError("submission run does not belong to workspace")
            if run.publication_state == "PUBLISHED":
                if (
                    run.artifact_hash != artifact.sha256
                    or run.private_artifact_key != private_key
                ):
                    raise IdempotencyConflict(
                        "published submission replay resolved a different artifact"
                    )
                return SubmissionPublicationResult(
                    submission_run_id=submission_run_id,
                    artifact_hash=artifact.sha256,
                    private_artifact_key=private_key,
                )
            if run.publication_state != "STAGED":
                raise IdempotencyConflict("submission state changed during publication")
            locked_artifact = await self._submission_artifact_from_records(
                session,
                submission_run_id=submission_run_id,
                expected_email_ids=run.expected_email_ids,
            )
            if locked_artifact.sha256 != artifact.sha256:
                raise IdempotencyConflict("staged records changed during publication")

            published_at = datetime.now(UTC)
            run.artifact_hash = artifact.sha256
            run.private_artifact_key = private_key
            run.published_at = published_at
            run.updated_at = published_at
            run.publication_state = "PUBLISHED"
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SUBMISSION_RUN",
                entity_id=str(submission_run_id),
                event_type="SUBMISSION_RUN_PUBLISHED",
                source_hashes=[run.input_manifest_hash, artifact.sha256],
                payload={
                    "artifact_hash": artifact.sha256,
                    "private_artifact_key": private_key,
                    "validation_count": run.validation_count,
                },
                audit=audit,
            )
        return SubmissionPublicationResult(
            submission_run_id=submission_run_id,
            artifact_hash=artifact.sha256,
            private_artifact_key=private_key,
        )

    async def append_submission_evaluation(
        self,
        *,
        workspace_id: UUID,
        submission_run_id: UUID,
        result: SubmissionScoreResult,
        started_at: datetime,
        completed_at: datetime,
        audit: AuditContext,
    ) -> UUID:
        if completed_at < started_at:
            raise ValueError("submission evaluation cannot finish before it starts")
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            run = await session.scalar(
                select(SubmissionRun).where(
                    SubmissionRun.submission_run_id == submission_run_id
                )
            )
            if (
                run is None
                or run.workspace_id != workspace_id
                or run.publication_state != "PUBLISHED"
                or run.artifact_hash is None
            ):
                raise ValueError("only a published submission run can be evaluated")
            evaluation_id = uuid4()
            scoreboard = (
                result.scoreboard.model_dump(mode="json")
                if result.scoreboard is not None
                else None
            )
            session.add(
                SubmissionEvaluation(
                    submission_evaluation_id=evaluation_id,
                    submission_run_id=submission_run_id,
                    artifact_hash=run.artifact_hash,
                    endpoint=result.endpoint,
                    outcome=result.outcome,
                    scoreboard=scoreboard,
                    safe_failure=result.safe_failure,
                    started_at=started_at,
                    completed_at=completed_at,
                )
            )
            await self._append_audit(
                session,
                workspace_id=workspace_id,
                entity_type="SUBMISSION_EVALUATION",
                entity_id=str(evaluation_id),
                event_type="SUBMISSION_EVALUATION_RECORDED",
                source_hashes=[run.artifact_hash],
                payload={
                    "submission_run_id": str(submission_run_id),
                    "endpoint": result.endpoint,
                    "outcome": result.outcome,
                    "scoreboard": scoreboard,
                    "safe_failure": result.safe_failure,
                },
                audit=audit,
            )
        return evaluation_id

    async def record_judge_run(
        self,
        *,
        workspace_id: UUID,
        judge_run_id: UUID,
        case_id: UUID,
        slots: Sequence[str],
        started_at: datetime,
        attempt: JudgeAttempt,
    ) -> None:
        """Record a judge upload's first check.

        ``slots`` names the upload field of each attachment of the case's
        email, in the order the attachments were received.
        """
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            case = await session.scalar(
                select(CaseRecord).where(CaseRecord.case_id == case_id)
            )
            if case is None or case.workspace_id != workspace_id:
                raise ValueError("case does not belong to workspace")
            attachment_ids = await session.scalars(
                select(EmailAttachment.attachment_id)
                .where(EmailAttachment.email_id == case.email_id)
                .order_by(EmailAttachment.ordinal)
            )
            session.add(
                JudgeRunRecord(
                    judge_run_id=judge_run_id,
                    workspace_id=workspace_id,
                    email_id=case.email_id,
                    case_id=case_id,
                    state=attempt.state,
                    attempt=1,
                    failure_code=attempt.failure_code,
                    failure_retryable=attempt.failure_retryable,
                    failure_message=attempt.failure_message,
                    latency_ms=attempt.latency_ms,
                    slots=dict(zip(map(str, attachment_ids), slots, strict=True)),
                    created_at=started_at,
                    updated_at=attempt.completed_at,
                )
            )

    async def record_judge_retry(
        self,
        *,
        workspace_id: UUID,
        judge_run_id: UUID,
        attempt: JudgeAttempt,
    ) -> bool:
        """Record another check of a FAILED judge run; False once it succeeded."""
        async with self._session_factory() as session, session.begin():
            await self._require_active_guest_workspace(session, workspace_id)
            retried = await session.scalar(
                update(JudgeRunRecord)
                .where(
                    JudgeRunRecord.judge_run_id == judge_run_id,
                    JudgeRunRecord.workspace_id == workspace_id,
                    JudgeRunRecord.state == "FAILED",
                )
                .values(
                    state=attempt.state,
                    attempt=JudgeRunRecord.attempt + 1,
                    failure_code=attempt.failure_code,
                    failure_retryable=attempt.failure_retryable,
                    failure_message=attempt.failure_message,
                    latency_ms=attempt.latency_ms,
                    updated_at=attempt.completed_at,
                )
                .returning(JudgeRunRecord.judge_run_id)
            )
        return retried is not None

    async def get_judge_runs(
        self,
        *,
        workspace_id: UUID,
        judge_run_id: UUID | None = None,
    ) -> tuple[JudgeRunSnapshot, ...]:
        """A workspace's judge runs, newest first, each with its case evidence.

        A document's role is its latest role decision's: None when that
        decision failed or none was recorded.
        """
        async with self._session_factory() as session:
            await self._require_active_guest_workspace(session, workspace_id)
            query = select(JudgeRunRecord).where(
                JudgeRunRecord.workspace_id == workspace_id
            )
            if judge_run_id is not None:
                query = query.where(JudgeRunRecord.judge_run_id == judge_run_id)
            runs = list(
                await session.scalars(
                    query.order_by(
                        JudgeRunRecord.created_at.desc(), JudgeRunRecord.judge_run_id
                    )
                )
            )
            if not runs:
                return ()
            case_ids = [run.case_id for run in runs]
            email_ids = [run.email_id for run in runs]
            cases = {
                case.case_id: case
                for case in await session.scalars(
                    select(CaseRecord).where(CaseRecord.case_id.in_(case_ids))
                )
            }
            verdict_rows: dict[UUID, list[FieldVerdictRecord]] = defaultdict(list)
            for verdict in await session.scalars(
                select(FieldVerdictRecord).where(
                    FieldVerdictRecord.case_id.in_(case_ids)
                )
            ):
                verdict_rows[verdict.case_id].append(verdict)
            attachment_rows: dict[UUID, list[tuple[EmailAttachment, SourceObject]]] = (
                defaultdict(list)
            )
            for attachment, source in (
                await session.execute(
                    select(EmailAttachment, SourceObject)
                    .join(
                        SourceObject,
                        EmailAttachment.source_object_id
                        == SourceObject.source_object_id,
                    )
                    .where(EmailAttachment.email_id.in_(email_ids))
                    .order_by(EmailAttachment.ordinal)
                )
            ).all():
                attachment_rows[attachment.email_id].append((attachment, source))
            roles: dict[UUID, str | None] = {}
            for decision in await session.scalars(
                select(DocumentRoleDecisionRecord)
                .join(
                    EmailAttachment,
                    EmailAttachment.attachment_id
                    == DocumentRoleDecisionRecord.attachment_id,
                )
                .where(
                    EmailAttachment.email_id.in_(email_ids),
                    DocumentRoleDecisionRecord.workspace_id == workspace_id,
                )
                .order_by(
                    DocumentRoleDecisionRecord.created_at,
                    DocumentRoleDecisionRecord.document_role_decision_id,
                )
            ):
                roles[decision.attachment_id] = decision.role
        return tuple(
            _judge_run_snapshot(
                run,
                cases[run.case_id],
                verdict_rows[run.case_id],
                attachment_rows[run.email_id],
                roles,
            )
            for run in runs
        )

    async def _submission_artifact_from_records(
        self,
        session: AsyncSession,
        *,
        submission_run_id: UUID,
        expected_email_ids: list[str],
    ) -> SubmissionArtifact:
        records = list(
            await session.scalars(
                select(SubmissionRunRecord)
                .where(SubmissionRunRecord.submission_run_id == submission_run_id)
                .order_by(SubmissionRunRecord.email_id)
            )
        )
        if expected_email_ids != list(EXPECTED_EMAIL_IDS) or [
            record.email_id for record in records
        ] != list(EXPECTED_EMAIL_IDS):
            raise ValueError("staged submission does not contain the exact manifest")
        payload: dict[str, dict[str, object]] = {}
        for record in records:
            output = EvaluatorOutput.model_validate(record.evaluator_output)
            serialized = serialize_evaluator_output(output)
            if _payload_hash(serialized) != record.record_hash:
                raise IdempotencyConflict(
                    f"staged record hash mismatch for {record.email_id}"
                )
            payload[record.email_id] = serialized
        canonical_bytes = json.dumps(
            payload,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
        artifact = SubmissionArtifact(
            canonical_bytes=canonical_bytes,
            sha256=sha256_hex(canonical_bytes),
            record_count=len(records),
        )
        validate_submission_artifact(artifact)
        return artifact

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
            raise InactiveWorkspace(
                "workspace is not an active mutable guest namespace"
            )

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
    def _validate_case_evidence(
        evaluator_output: EvaluatorOutput,
        field_verdicts: Sequence[FieldVerdict],
        structural_diagnostics: Sequence[StructuralDiagnostic],
    ) -> None:
        verdict_fields = [verdict.field for verdict in field_verdicts]
        if len(verdict_fields) != len(set(verdict_fields)):
            raise ValueError("field verdicts must contain each compared field once")
        if evaluator_output.category is Category.BL_COMPARISON:
            if evaluator_output.status is Status.NEEDS_REVIEW:
                selected_reason = select_structural_review_reason(
                    structural_diagnostics
                )
                if field_verdicts or selected_reason is None:
                    raise ValueError(
                        "structural BL_COMPARISON requires diagnostics and no verdicts"
                    )
                if selected_reason != evaluator_output.review_reason:
                    raise ValueError(
                        "structural diagnostics do not match the evaluator review reason"
                    )
            else:
                if structural_diagnostics:
                    raise ValueError(
                        "compared BL_COMPARISON cannot contain structural diagnostics"
                    )
                if set(verdict_fields) != set(ComparedField):
                    raise ValueError("BL_COMPARISON requires all seven field verdicts")
        elif verdict_fields or structural_diagnostics:
            raise ValueError("non-comparison cases cannot contain comparison evidence")

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

    @staticmethod
    def _validate_document_role_decision(decision: DocumentRoleDecisionInput) -> None:
        if decision.outcome not in {"SUCCEEDED", "PROVIDER_FAILED"}:
            raise ValueError(
                "document role outcome must be SUCCEEDED or PROVIDER_FAILED"
            )
        if not decision.requested_model.strip():
            raise ValueError("requested_model must not be empty")
        if not decision.prompt_version.strip():
            raise ValueError("prompt_version must not be empty")
        if not decision.correlation_id.strip():
            raise ValueError("correlation_id must not be empty")
        if (
            decision.started_at.utcoffset() is None
            or decision.completed_at.utcoffset() is None
        ):
            raise ValueError("document role decision timestamps must be timezone-aware")
        if decision.completed_at < decision.started_at:
            raise ValueError("completed_at must not precede started_at")

        if decision.outcome == "SUCCEEDED":
            if decision.role not in {"SI", "DRAFT_BL", "OTHER"}:
                raise ValueError(
                    "SUCCEEDED document role decisions require a known role"
                )
            if decision.role_probabilities is None or set(
                decision.role_probabilities
            ) != {"SI", "DRAFT_BL", "OTHER"}:
                raise ValueError(
                    "SUCCEEDED document role decisions require probabilities for "
                    "every role"
                )
            total = 0.0
            for raw_probability in decision.role_probabilities.values():
                try:
                    probability = float(raw_probability)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        "document role probabilities must be numeric"
                    ) from exc
                if not math.isfinite(probability) or not 0 <= probability <= 1:
                    raise ValueError(
                        "document role probabilities must be between 0 and 1"
                    )
                total += probability
            if not math.isclose(total, 1.0, rel_tol=0.0, abs_tol=0.02):
                raise ValueError(
                    "document role probabilities must sum to approximately 1"
                )
            if not decision.returned_model or not decision.returned_model.strip():
                raise ValueError(
                    "SUCCEEDED document role decisions require returned_model"
                )
            if decision.safe_diagnostic is not None or decision.retryable is not None:
                raise ValueError(
                    "SUCCEEDED document role decisions must not carry a diagnostic"
                )
        else:
            if decision.role is not None or decision.role_probabilities is not None:
                raise ValueError(
                    "PROVIDER_FAILED document role decisions cannot carry a role"
                )
            if not decision.safe_diagnostic or not decision.safe_diagnostic.strip():
                raise ValueError(
                    "PROVIDER_FAILED document role decisions require a safe_diagnostic"
                )
            if not isinstance(decision.retryable, bool):
                raise ValueError(
                    "PROVIDER_FAILED document role decisions require retryable"
                )

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
