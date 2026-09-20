from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.contracts import (
    Category,
    ComparedField,
    ReconciliationOutcome,
    ReviewReason,
    Status,
)


class Base(DeclarativeBase):
    pass


def _uuid_column() -> Mapped[UUID]:
    return mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)


def _created_at_column() -> Mapped[datetime]:
    return mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


def _enum(enum_class: type[StrEnum], name: str) -> Enum:
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda members: [member.value for member in members],
    )


class GuestSession(Base):
    __tablename__ = "guest_sessions"
    __table_args__ = (
        CheckConstraint("current_generation > 0", name="ck_guest_current_generation"),
    )

    guest_session_id: Mapped[UUID] = _uuid_column()
    session_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    current_generation: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = _created_at_column()


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        UniqueConstraint(
            "guest_session_id",
            "generation",
            name="uq_workspaces_guest_generation",
        ),
        CheckConstraint("generation > 0", name="ck_workspace_generation"),
    )

    workspace_id: Mapped[UUID] = _uuid_column()
    guest_session_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("guest_sessions.guest_session_id"), nullable=True, index=True
    )
    seed_workspace_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=True, index=True
    )
    generation: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_shared_seed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = _created_at_column()


class SourceObject(Base):
    __tablename__ = "source_objects"
    __table_args__ = (
        UniqueConstraint("content_hash", name="uq_source_objects_content_hash"),
        UniqueConstraint(
            "private_object_key", name="uq_source_objects_private_object_key"
        ),
        CheckConstraint("byte_size >= 0", name="ck_source_objects_byte_size"),
        CheckConstraint(
            "content_hash ~ '^[0-9a-f]{64}$'",
            name="ck_source_objects_content_hash",
        ),
    )

    source_object_id: Mapped[UUID] = _uuid_column()
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    private_object_key: Mapped[str] = mapped_column(Text, nullable=False)
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    media_type: Mapped[str | None] = mapped_column(String(255))
    detected_format: Mapped[str] = mapped_column(String(32), nullable=False)
    parser_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING"
    )
    parser_diagnostic: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at_column()


class EmailReceipt(Base):
    __tablename__ = "email_receipts"
    __table_args__ = (
        Index(
            "uq_email_receipts_source_message",
            "workspace_id",
            "source_message_id",
            unique=True,
            postgresql_where=text("source_message_id IS NOT NULL"),
        ),
        Index(
            "uq_email_receipts_fallback",
            "workspace_id",
            "message_hash",
            "received_at",
            "sender",
            unique=True,
            postgresql_where=text("source_message_id IS NULL"),
        ),
        CheckConstraint(
            "message_hash ~ '^[0-9a-f]{64}$'", name="ck_email_receipts_message_hash"
        ),
    )

    email_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    source_message_id: Mapped[str | None] = mapped_column(String(512))
    message_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    sender: Mapped[str] = mapped_column(String(512), nullable=False)
    subject: Mapped[str | None] = mapped_column(Text)
    body_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at_column()


class EmailAttachment(Base):
    __tablename__ = "email_attachments"
    __table_args__ = (
        UniqueConstraint("email_id", "ordinal", name="uq_email_attachments_ordinal"),
    )

    attachment_id: Mapped[UUID] = _uuid_column()
    email_id: Mapped[UUID] = mapped_column(
        ForeignKey("email_receipts.email_id"), nullable=False, index=True
    )
    source_object_id: Mapped[UUID] = mapped_column(
        ForeignKey("source_objects.source_object_id"), nullable=False, index=True
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    declared_media_type: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = _created_at_column()


class IngestionRequest(Base):
    __tablename__ = "ingestion_requests"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "idempotency_key", name="uq_ingestion_workspace_key"
        ),
        CheckConstraint(
            "request_hash ~ '^[0-9a-f]{64}$'", name="ck_ingestion_request_hash"
        ),
    )

    ingestion_request_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    email_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("email_receipts.email_id"), nullable=True
    )
    state: Mapped[str] = mapped_column(
        String(16), nullable=False, default="PROCESSING", server_default="PROCESSING"
    )
    created_at: Mapped[datetime] = _created_at_column()


class ExtractionCache(Base):
    __tablename__ = "extraction_cache"
    __table_args__ = (
        UniqueConstraint(
            "content_hash",
            "extractor_version",
            "extraction_schema_version",
            name="uq_extraction_cache_version",
        ),
    )

    extraction_cache_id: Mapped[UUID] = _uuid_column()
    content_hash: Mapped[str] = mapped_column(
        ForeignKey("source_objects.content_hash"), nullable=False
    )
    extractor_route: Mapped[str] = mapped_column(String(64), nullable=False)
    extractor_version: Mapped[str] = mapped_column(String(128), nullable=False)
    extraction_schema_version: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    provenance: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = _created_at_column()


class CaseRecord(Base):
    __tablename__ = "cases"
    __table_args__ = (
        UniqueConstraint("email_id", name="uq_cases_email_id"),
        CheckConstraint(
            "(classification_state IN ('PENDING', 'PROVIDER_FAILED') AND "
            "category IS NULL AND status IS NULL AND review_reason IS NULL AND "
            "evaluator_output IS NULL AND category_probabilities IS NULL) OR "
            "(classification_state = 'BL_READY' AND "
            "category IS NOT NULL AND category = 'BL_COMPARISON' AND "
            "status IS NULL AND "
            "review_reason IS NULL AND evaluator_output IS NULL AND "
            "category_probabilities IS NOT NULL AND "
            "assigned_owner_id IS NOT NULL) OR "
            "(classification_state = 'CLASSIFIED' AND category IS NOT NULL AND "
            "status IS NOT NULL AND evaluator_output IS NOT NULL AND "
            "jsonb_typeof(evaluator_output) = 'object' AND "
            "evaluator_output->>'category' = category AND "
            "evaluator_output->>'status' = status AND "
            "evaluator_output ? 'review_reason' AND "
            "evaluator_output ? 'has_defect' AND "
            "jsonb_typeof(evaluator_output->'has_defect') = 'boolean' AND "
            "evaluator_output ? 'defect_fields' AND "
            "jsonb_typeof(evaluator_output->'defect_fields') = 'array')",
            name="ck_cases_classification_evidence",
        ),
        CheckConstraint(
            "classification_state IN "
            "('PENDING', 'PROVIDER_FAILED', 'BL_READY', 'CLASSIFIED')",
            name="ck_cases_classification_state",
        ),
        CheckConstraint(
            "provider_attempt_count >= 0", name="ck_cases_provider_attempt_count"
        ),
        CheckConstraint(
            "(classification_state = 'PROVIDER_FAILED' AND "
            "provider_error IS NOT NULL AND provider_retryable IS NOT NULL) OR "
            "(classification_state <> 'PROVIDER_FAILED' AND "
            "provider_error IS NULL AND provider_retryable IS NULL)",
            name="ck_cases_provider_state",
        ),
        CheckConstraint(
            "category_probabilities IS NULL OR "
            "jsonb_typeof(category_probabilities) = 'object'",
            name="ck_cases_category_probabilities_object",
        ),
        CheckConstraint(
            "jsonb_typeof(structural_diagnostics) = 'array'",
            name="ck_cases_structural_diagnostics_array",
        ),
    )

    case_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    email_id: Mapped[UUID] = mapped_column(
        ForeignKey("email_receipts.email_id"), nullable=False
    )
    classification_state: Mapped[str] = mapped_column(
        String(24), nullable=False, default="PENDING", server_default="PENDING"
    )
    category: Mapped[Category | None] = mapped_column(
        _enum(Category, "category"), nullable=True
    )
    category_probabilities: Mapped[dict[str, float] | None] = mapped_column(JSONB)
    provider_request_id: Mapped[str | None] = mapped_column(String(255))
    provider_error: Mapped[str | None] = mapped_column(Text)
    provider_retryable: Mapped[bool | None] = mapped_column(Boolean)
    provider_attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    provider_last_attempt_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    status: Mapped[Status | None] = mapped_column(
        _enum(Status, "case_status"), nullable=True
    )
    review_reason: Mapped[ReviewReason | None] = mapped_column(
        _enum(ReviewReason, "review_reason"), nullable=True
    )
    assigned_owner_id: Mapped[str | None] = mapped_column(String(255))
    evaluator_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    structural_diagnostics: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    model_version: Mapped[str] = mapped_column(String(128), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(128), nullable=False)
    normalization_version: Mapped[str] = mapped_column(String(128), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = _created_at_column()


class ClassificationAttempt(Base):
    __tablename__ = "classification_attempts"
    __table_args__ = (
        CheckConstraint(
            "outcome IN ('SUCCEEDED', 'PROVIDER_FAILED')",
            name="ck_classification_attempt_outcome",
        ),
        CheckConstraint(
            "completed_at >= started_at",
            name="ck_classification_attempt_timestamps",
        ),
    )

    classification_attempt_id: Mapped[UUID] = _uuid_column()
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.case_id"), nullable=False, index=True
    )
    requested_model: Mapped[str] = mapped_column(String(128), nullable=False)
    returned_model: Mapped[str | None] = mapped_column(String(128))
    prompt_version: Mapped[str] = mapped_column(String(128), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(128), nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    safe_diagnostic: Mapped[str | None] = mapped_column(Text)
    retryable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    provider_request_id: Mapped[str | None] = mapped_column(String(255))
    correlation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = _created_at_column()


class FieldVerdictRecord(Base):
    __tablename__ = "field_verdicts"
    __table_args__ = (
        UniqueConstraint("case_id", "field", name="uq_field_verdict_case_field"),
        CheckConstraint(
            "semantic_probability IS NULL OR "
            "(semantic_probability >= 0 AND semantic_probability <= 1)",
            name="ck_field_verdict_probability",
        ),
    )

    field_verdict_id: Mapped[UUID] = _uuid_column()
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.case_id"), nullable=False, index=True
    )
    field: Mapped[ComparedField] = mapped_column(
        _enum(ComparedField, "compared_field"), nullable=False
    )
    si_value: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    draft_bl_value: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    deterministic_result: Mapped[str | None] = mapped_column(String(32))
    semantic_probability: Mapped[float | None]
    interactive_state: Mapped[str | None] = mapped_column(String(32))
    batch_result: Mapped[str | None] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at_column()


class ExpectedShipmentRecord(Base):
    __tablename__ = "expected_shipments"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "source_system",
            "shipment_id",
            "source_hash",
            name="uq_expected_shipments_source_version",
        ),
        CheckConstraint(
            "source_hash ~ '^[0-9a-f]{64}$'", name="ck_expected_shipments_source_hash"
        ),
        CheckConstraint(
            "jsonb_typeof(identifiers) = 'object'",
            name="ck_expected_shipments_identifiers",
        ),
        CheckConstraint(
            "jsonb_typeof(documents) = 'array'",
            name="ck_expected_shipments_documents",
        ),
        CheckConstraint(
            "jsonb_typeof(required_documents) = 'array'",
            name="ck_expected_shipments_required_documents",
        ),
        CheckConstraint(
            "source_freshness IN ('CURRENT', 'STALE')",
            name="ck_expected_shipments_source_freshness",
        ),
        CheckConstraint(
            "btrim(source_owner_id) <> ''",
            name="ck_expected_shipments_source_owner",
        ),
        CheckConstraint(
            "booking_reference IS NULL OR btrim(booking_reference) <> ''",
            name="ck_expected_shipments_booking_reference",
        ),
    )

    expected_shipment_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    source_system: Mapped[str] = mapped_column(String(128), nullable=False)
    shipment_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    imported_row: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    identifiers: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    lifecycle: Mapped[str] = mapped_column(String(64), nullable=False)
    documents: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    booking_reference: Mapped[str | None] = mapped_column(String(255))
    required_documents: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    cutoff_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_owner_id: Mapped[str | None] = mapped_column(String(255))
    source_freshness: Mapped[str] = mapped_column(String(16), nullable=False)
    source_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = _created_at_column()


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"
    __table_args__ = (
        CheckConstraint(
            "source_hash ~ '^[0-9a-f]{64}$'",
            name="ck_reconciliation_runs_source_hash",
        ),
    )

    reconciliation_run_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = _created_at_column()


class ReconciliationResultRecord(Base):
    __tablename__ = "reconciliation_results"
    __table_args__ = (
        UniqueConstraint(
            "reconciliation_run_id",
            "subject_key",
            name="uq_reconciliation_run_subject",
        ),
        CheckConstraint(
            "source_freshness IN ('CURRENT', 'STALE')",
            name="ck_reconciliation_results_source_freshness",
        ),
        CheckConstraint(
            "jsonb_typeof(match_basis) = 'array'",
            name="ck_reconciliation_results_match_basis",
        ),
        CheckConstraint(
            "COALESCE((outcome IN ('CASE_PRESENT', 'DOCUMENT_MISSING') AND "
            "shipment_id IS NOT NULL AND btrim(shipment_id) <> '' AND "
            "jsonb_typeof(case_ids) = 'array' AND "
            "jsonb_array_length(case_ids) > 0 AND "
            "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
            "source_freshness = 'CURRENT') OR "
            "(outcome = 'MISSING_CASE' AND shipment_id IS NOT NULL AND "
            "btrim(shipment_id) <> '' AND case_ids = '[]'::jsonb AND "
            "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
            "source_freshness = 'CURRENT') OR "
            "(outcome = 'UNMATCHED_CASE' AND shipment_id IS NULL AND "
            "jsonb_typeof(case_ids) = 'array' AND "
            "jsonb_array_length(case_ids) > 0 AND "
            "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
            "source_freshness = 'CURRENT') OR "
            "(outcome = 'DUPLICATE_OR_AMBIGUOUS' AND shipment_id IS NULL AND "
            "case_ids IS NULL AND jsonb_typeof(candidate_shipment_ids) = 'array' "
            "AND jsonb_array_length(candidate_shipment_ids) > 0 AND "
            "jsonb_typeof(candidate_case_ids) = 'array' AND "
            "jsonb_array_length(candidate_case_ids) > 0) OR "
            "(outcome = 'SOURCE_STALE' AND shipment_id IS NOT NULL AND "
            "btrim(shipment_id) <> '' AND jsonb_typeof(case_ids) = 'array' AND "
            "jsonb_array_length(case_ids) > 0 AND "
            "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
            "source_freshness = 'STALE'), FALSE)",
            name="ck_reconciliation_results_outcome_shape",
        ),
    )

    reconciliation_id: Mapped[UUID] = _uuid_column()
    reconciliation_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("reconciliation_runs.reconciliation_run_id"),
        nullable=False,
        index=True,
    )
    subject_key: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome: Mapped[ReconciliationOutcome] = mapped_column(
        _enum(ReconciliationOutcome, "reconciliation_outcome"), nullable=False
    )
    shipment_id: Mapped[str | None] = mapped_column(String(255))
    case_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    candidate_shipment_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    candidate_case_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    match_basis: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    source_freshness: Mapped[str] = mapped_column(String(16), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at_column()


class ReviewAssignmentRecord(Base):
    __tablename__ = "review_assignments"
    __table_args__ = (
        CheckConstraint(
            "(target_type = 'CASE' AND case_id IS NOT NULL AND "
            "reconciliation_id IS NULL) OR "
            "(target_type = 'RECONCILIATION_EXCEPTION' AND case_id IS NULL AND "
            "reconciliation_id IS NOT NULL)",
            name="ck_review_assignment_target",
        ),
    )

    review_assignment_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    case_id: Mapped[UUID | None] = mapped_column(ForeignKey("cases.case_id"))
    reconciliation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("reconciliation_results.reconciliation_id")
    )
    assigned_owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = _created_at_column()


class ReviewActionRecord(Base):
    __tablename__ = "review_actions"
    __table_args__ = (
        CheckConstraint(
            "(target_type = 'CASE' AND case_id IS NOT NULL AND "
            "reconciliation_id IS NULL) OR "
            "(target_type = 'RECONCILIATION_EXCEPTION' AND case_id IS NULL AND "
            "reconciliation_id IS NOT NULL)",
            name="ck_review_action_target",
        ),
    )

    review_action_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    case_id: Mapped[UUID | None] = mapped_column(ForeignKey("cases.case_id"))
    reconciliation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("reconciliation_results.reconciliation_id")
    )
    actor_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_fields: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    assigned_owner_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = _created_at_column()


class AuditEventRecord(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint(
            "payload_hash ~ '^[0-9a-f]{64}$'", name="ck_audit_events_payload_hash"
        ),
    )

    audit_event_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    occurred_at: Mapped[datetime] = _created_at_column()
    actor_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(255))
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    source_hashes: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(128))
    prompt_version: Mapped[str | None] = mapped_column(String(128))
    rule_version: Mapped[str] = mapped_column(String(128), nullable=False)
    request_id: Mapped[str] = mapped_column(String(255), nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class SubmissionRun(Base):
    __tablename__ = "submission_runs"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "input_manifest_hash",
            "rule_version",
            name="uq_submission_runs_manifest_rule",
        ),
        CheckConstraint("validation_count >= 0", name="ck_submission_validation_count"),
        CheckConstraint(
            "input_manifest_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_manifest_hash",
        ),
        CheckConstraint(
            "jsonb_typeof(expected_email_ids) = 'array'",
            name="ck_submission_runs_expected_email_ids",
        ),
        CheckConstraint(
            "publication_state IN ('PENDING', 'BLOCKED', 'STAGED', 'PUBLISHED')",
            name="ck_submission_runs_publication_state",
        ),
        CheckConstraint(
            "jsonb_typeof(blockers) = 'array'",
            name="ck_submission_runs_blockers",
        ),
        CheckConstraint(
            "btrim(serializer_version) <> ''",
            name="ck_submission_runs_serializer_version",
        ),
        CheckConstraint(
            "jsonb_typeof(version_manifest) = 'object'",
            name="ck_submission_runs_version_manifest",
        ),
        CheckConstraint(
            "artifact_hash IS NULL OR artifact_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_runs_artifact_hash",
        ),
        CheckConstraint(
            "private_artifact_key IS NULL OR (artifact_hash IS NOT NULL AND "
            "private_artifact_key = 'submission-artifacts/' || "
            "substr(artifact_hash, 1, 2) || '/' || artifact_hash || '.json')",
            name="ck_submission_runs_artifact_key",
        ),
        CheckConstraint(
            "COALESCE((publication_state = 'PUBLISHED' AND "
            "artifact_hash IS NOT NULL AND private_artifact_key IS NOT NULL AND "
            "published_at IS NOT NULL AND staged_at IS NOT NULL AND "
            "validation_count = 520 AND blockers = '[]'::jsonb) OR "
            "(publication_state <> 'PUBLISHED' AND artifact_hash IS NULL AND "
            "private_artifact_key IS NULL AND published_at IS NULL), FALSE)",
            name="ck_submission_runs_publication_shape",
        ),
        CheckConstraint(
            "COALESCE((publication_state = 'PENDING' AND staged_at IS NULL AND "
            "blockers = '[]'::jsonb) OR "
            "(publication_state = 'BLOCKED' AND staged_at IS NULL AND "
            "jsonb_array_length(blockers) > 0) OR "
            "(publication_state IN ('STAGED', 'PUBLISHED') AND "
            "staged_at IS NOT NULL AND validation_count = 520 AND "
            "blockers = '[]'::jsonb), FALSE)",
            name="ck_submission_runs_state_shape",
        ),
    )

    submission_run_id: Mapped[UUID] = _uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.workspace_id"), nullable=False, index=True
    )
    input_manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expected_email_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    validation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rule_version: Mapped[str] = mapped_column(String(128), nullable=False)
    publication_state: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING", server_default="PENDING"
    )
    blockers: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    serializer_version: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="submission-v1",
        server_default="submission-v1",
    )
    version_manifest: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    artifact_hash: Mapped[str | None] = mapped_column(String(64))
    private_artifact_key: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at_column()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    staged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SubmissionRunRecord(Base):
    __tablename__ = "submission_run_records"
    __table_args__ = (
        UniqueConstraint(
            "submission_run_id",
            "email_id",
            name="uq_submission_run_records_run_email",
        ),
        CheckConstraint(
            "email_id ~ '^email_[0-9]{3}$'",
            name="ck_submission_run_records_email_id",
        ),
        CheckConstraint(
            "record_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_run_records_record_hash",
        ),
        CheckConstraint(
            "source_state_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_run_records_source_state_hash",
        ),
        CheckConstraint(
            "jsonb_typeof(diagnostics) = 'array'",
            name="ck_submission_run_records_diagnostics",
        ),
        CheckConstraint(
            "jsonb_typeof(version_manifest) = 'object'",
            name="ck_submission_run_records_version_manifest",
        ),
        CheckConstraint(
            "COALESCE(jsonb_typeof(evaluator_output) = 'object' AND "
            "jsonb_object_length(evaluator_output) = 5 AND "
            "evaluator_output ?& ARRAY['category', 'status', 'review_reason', "
            "'defect_fields', 'has_defect'] AND "
            "evaluator_output->>'category' IN ('BL_COMPARISON', 'SI_REQUEST', "
            "'INVOICE_QUERY', 'GENERAL', 'SPAM') AND "
            "evaluator_output->>'status' IN ('OK', 'MISMATCH', 'NEEDS_REVIEW') AND "
            "jsonb_typeof(evaluator_output->'defect_fields') = 'array' AND "
            "submission_defect_fields_are_canonical("
            "evaluator_output->'defect_fields') AND "
            "evaluator_output->'defect_fields' <@ "
            '\'["shipper", "consignee", "notify_party", '
            '"port_of_loading", "port_of_discharge", '
            '"container_count", "gross_weight_kg"]\'::jsonb AND '
            "jsonb_typeof(evaluator_output->'has_defect') = 'boolean' AND "
            "((evaluator_output->>'status' = 'OK' AND "
            "evaluator_output->>'review_reason' IS NULL AND "
            "evaluator_output->'has_defect' = 'false'::jsonb AND "
            "evaluator_output->'defect_fields' = '[]'::jsonb) OR "
            "(evaluator_output->>'status' = 'MISMATCH' AND "
            "evaluator_output->>'review_reason' IS NULL AND "
            "evaluator_output->'has_defect' = 'true'::jsonb AND "
            "jsonb_array_length(evaluator_output->'defect_fields') > 0) OR "
            "(evaluator_output->>'status' = 'NEEDS_REVIEW' AND "
            "evaluator_output->>'review_reason' IN ('wrong_doc_type', "
            "'missing_attachment', 'unreadable', 'missing_value') AND "
            "evaluator_output->'has_defect' = 'false'::jsonb AND "
            "evaluator_output->'defect_fields' = '[]'::jsonb)) AND "
            "(evaluator_output->>'category' = 'BL_COMPARISON' OR "
            "evaluator_output->>'status' = 'OK'), FALSE)",
            name="ck_submission_run_records_output_shape",
        ),
    )

    submission_run_record_id: Mapped[UUID] = _uuid_column()
    submission_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("submission_runs.submission_run_id"), nullable=False, index=True
    )
    email_id: Mapped[str] = mapped_column(String(32), nullable=False)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.case_id"), nullable=False, index=True
    )
    evaluator_output: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    record_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source_state_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    diagnostics: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    version_manifest: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = _created_at_column()


class SubmissionEvaluation(Base):
    __tablename__ = "submission_evaluations"
    __table_args__ = (
        CheckConstraint(
            "artifact_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_evaluations_artifact_hash",
        ),
        CheckConstraint(
            "outcome IN ('SUCCEEDED', 'FAILED', 'UNAVAILABLE')",
            name="ck_submission_evaluations_outcome",
        ),
        CheckConstraint(
            "completed_at >= started_at",
            name="ck_submission_evaluations_timestamps",
        ),
        CheckConstraint(
            "endpoint IS NULL OR btrim(endpoint) <> ''",
            name="ck_submission_evaluations_endpoint",
        ),
        CheckConstraint(
            "COALESCE((outcome = 'SUCCEEDED' AND endpoint IS NOT NULL AND "
            "jsonb_typeof(scoreboard) = 'object' AND safe_failure IS NULL) OR "
            "(outcome = 'FAILED' AND endpoint IS NOT NULL AND scoreboard IS NULL "
            "AND safe_failure IS NOT NULL AND btrim(safe_failure) <> '') OR "
            "(outcome = 'UNAVAILABLE' AND scoreboard IS NULL AND "
            "safe_failure IS NOT NULL AND btrim(safe_failure) <> ''), FALSE)",
            name="ck_submission_evaluations_result_shape",
        ),
    )

    submission_evaluation_id: Mapped[UUID] = _uuid_column()
    submission_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("submission_runs.submission_run_id"), nullable=False, index=True
    )
    artifact_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    endpoint: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    scoreboard: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    safe_failure: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = _created_at_column()
