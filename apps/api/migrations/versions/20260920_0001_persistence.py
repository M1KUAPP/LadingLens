"""Create the initial PostgreSQL persistence schema."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260920_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "guest_sessions",
        sa.Column("guest_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_key", sa.String(length=128), nullable=False),
        sa.Column("current_generation", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("guest_session_id"),
        sa.UniqueConstraint("session_key"),
        sa.CheckConstraint(
            "current_generation > 0", name="ck_guest_current_generation"
        ),
    )

    op.create_table(
        "workspaces",
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "guest_session_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "seed_workspace_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column(
            "is_shared_seed",
            sa.Boolean(),
            server_default=sa.text("'false'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["guest_session_id"], ["guest_sessions.guest_session_id"]
        ),
        sa.ForeignKeyConstraint(["seed_workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("workspace_id"),
        sa.UniqueConstraint(
            "guest_session_id", "generation", name="uq_workspaces_guest_generation"
        ),
        sa.CheckConstraint("generation > 0", name="ck_workspace_generation"),
    )
    op.create_index(
        "ix_workspaces_guest_session_id", "workspaces", ["guest_session_id"]
    )
    op.create_index(
        "ix_workspaces_seed_workspace_id", "workspaces", ["seed_workspace_id"]
    )

    op.create_table(
        "source_objects",
        sa.Column("source_object_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("private_object_key", sa.Text(), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("media_type", sa.String(length=255), nullable=True),
        sa.Column("detected_format", sa.String(length=32), nullable=False),
        sa.Column("parser_status", sa.String(length=32), nullable=False),
        sa.Column("parser_diagnostic", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("source_object_id"),
        sa.UniqueConstraint("content_hash", name="uq_source_objects_content_hash"),
        sa.UniqueConstraint(
            "private_object_key", name="uq_source_objects_private_object_key"
        ),
        sa.CheckConstraint("byte_size >= 0", name="ck_source_objects_byte_size"),
        sa.CheckConstraint(
            "content_hash ~ '^[0-9a-f]{64}$'",
            name="ck_source_objects_content_hash",
        ),
    )

    op.create_table(
        "email_receipts",
        sa.Column("email_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_message_id", sa.String(length=512), nullable=True),
        sa.Column("message_hash", sa.String(length=64), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sender", sa.String(length=512), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("email_id"),
        sa.CheckConstraint(
            "message_hash ~ '^[0-9a-f]{64}$'",
            name="ck_email_receipts_message_hash",
        ),
    )
    op.create_index(
        "ix_email_receipts_workspace_id", "email_receipts", ["workspace_id"]
    )
    op.create_index(
        "uq_email_receipts_source_message",
        "email_receipts",
        ["workspace_id", "source_message_id"],
        unique=True,
        postgresql_where=sa.text("source_message_id IS NOT NULL"),
    )
    op.create_index(
        "uq_email_receipts_fallback",
        "email_receipts",
        ["workspace_id", "message_hash", "received_at", "sender"],
        unique=True,
        postgresql_where=sa.text("source_message_id IS NULL"),
    )

    op.create_table(
        "email_attachments",
        sa.Column("attachment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_object_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("declared_media_type", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["email_id"], ["email_receipts.email_id"]),
        sa.ForeignKeyConstraint(
            ["source_object_id"], ["source_objects.source_object_id"]
        ),
        sa.PrimaryKeyConstraint("attachment_id"),
        sa.UniqueConstraint("email_id", "ordinal", name="uq_email_attachments_ordinal"),
    )
    op.create_index("ix_email_attachments_email_id", "email_attachments", ["email_id"])
    op.create_index(
        "ix_email_attachments_source_object_id",
        "email_attachments",
        ["source_object_id"],
    )

    op.create_table(
        "ingestion_requests",
        sa.Column(
            "ingestion_request_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "state",
            sa.String(length=16),
            server_default=sa.text("'PROCESSING'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["email_id"], ["email_receipts.email_id"]),
        sa.PrimaryKeyConstraint("ingestion_request_id"),
        sa.UniqueConstraint(
            "workspace_id", "idempotency_key", name="uq_ingestion_workspace_key"
        ),
        sa.CheckConstraint(
            "request_hash ~ '^[0-9a-f]{64}$'", name="ck_ingestion_request_hash"
        ),
    )
    op.create_index(
        "ix_ingestion_requests_workspace_id", "ingestion_requests", ["workspace_id"]
    )

    op.create_table(
        "extraction_cache",
        sa.Column("extraction_cache_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("extractor_route", sa.String(length=64), nullable=False),
        sa.Column("extractor_version", sa.String(length=128), nullable=False),
        sa.Column("extraction_schema_version", sa.String(length=64), nullable=False),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "provenance", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["content_hash"], ["source_objects.content_hash"]),
        sa.PrimaryKeyConstraint("extraction_cache_id"),
        sa.UniqueConstraint(
            "content_hash",
            "extractor_version",
            "extraction_schema_version",
            name="uq_extraction_cache_version",
        ),
    )

    op.create_table(
        "cases",
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "BL_COMPARISON",
                "SI_REQUEST",
                "INVOICE_QUERY",
                "GENERAL",
                "SPAM",
                name="category",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "OK",
                "MISMATCH",
                "NEEDS_REVIEW",
                name="case_status",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "review_reason",
            sa.Enum(
                "wrong_doc_type",
                "missing_attachment",
                "unreadable",
                "missing_value",
                name="review_reason",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=True,
        ),
        sa.Column("assigned_owner_id", sa.String(length=255), nullable=True),
        sa.Column(
            "evaluator_output", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("model_version", sa.String(length=128), nullable=False),
        sa.Column("prompt_version", sa.String(length=128), nullable=False),
        sa.Column("normalization_version", sa.String(length=128), nullable=False),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["email_id"], ["email_receipts.email_id"]),
        sa.PrimaryKeyConstraint("case_id"),
        sa.UniqueConstraint("email_id", name="uq_cases_email_id"),
    )
    op.create_index("ix_cases_workspace_id", "cases", ["workspace_id"])

    op.create_table(
        "field_verdicts",
        sa.Column("field_verdict_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "field",
            sa.Enum(
                "shipper",
                "consignee",
                "notify_party",
                "port_of_loading",
                "port_of_discharge",
                "container_count",
                "gross_weight_kg",
                name="compared_field",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("si_value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "draft_bl_value", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("deterministic_result", sa.String(length=32), nullable=True),
        sa.Column("semantic_probability", sa.Float(), nullable=True),
        sa.Column("interactive_state", sa.String(length=32), nullable=True),
        sa.Column("batch_result", sa.String(length=32), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.PrimaryKeyConstraint("field_verdict_id"),
        sa.UniqueConstraint("case_id", "field", name="uq_field_verdict_case_field"),
        sa.CheckConstraint(
            "semantic_probability IS NULL OR "
            "(semantic_probability >= 0 AND semantic_probability <= 1)",
            name="ck_field_verdict_probability",
        ),
    )
    op.create_index("ix_field_verdicts_case_id", "field_verdicts", ["case_id"])

    op.create_table(
        "expected_shipments",
        sa.Column(
            "expected_shipment_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_system", sa.String(length=128), nullable=False),
        sa.Column("shipment_id", sa.String(length=255), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "imported_row", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "identifiers", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("lifecycle", sa.String(length=64), nullable=False),
        sa.Column("documents", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("assigned_owner_id", sa.String(length=255), nullable=True),
        sa.Column("source_freshness", sa.String(length=16), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("expected_shipment_id"),
        sa.UniqueConstraint(
            "workspace_id",
            "source_system",
            "shipment_id",
            "source_hash",
            name="uq_expected_shipments_source_version",
        ),
        sa.CheckConstraint(
            "source_hash ~ '^[0-9a-f]{64}$'",
            name="ck_expected_shipments_source_hash",
        ),
    )
    op.create_index(
        "ix_expected_shipments_workspace_id", "expected_shipments", ["workspace_id"]
    )

    op.create_table(
        "reconciliation_runs",
        sa.Column(
            "reconciliation_run_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("reconciliation_run_id"),
    )
    op.create_index(
        "ix_reconciliation_runs_workspace_id", "reconciliation_runs", ["workspace_id"]
    )

    op.create_table(
        "reconciliation_results",
        sa.Column("reconciliation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "reconciliation_run_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("subject_key", sa.String(length=255), nullable=False),
        sa.Column(
            "outcome",
            sa.Enum(
                "CASE_PRESENT",
                "DOCUMENT_MISSING",
                "MISSING_CASE",
                "UNMATCHED_CASE",
                "DUPLICATE_OR_AMBIGUOUS",
                "SOURCE_STALE",
                name="reconciliation_outcome",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("shipment_id", sa.String(length=255), nullable=True),
        sa.Column("case_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "candidate_shipment_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "candidate_case_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "match_basis", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("source_freshness", sa.String(length=16), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["reconciliation_run_id"], ["reconciliation_runs.reconciliation_run_id"]
        ),
        sa.PrimaryKeyConstraint("reconciliation_id"),
        sa.UniqueConstraint(
            "reconciliation_run_id",
            "subject_key",
            name="uq_reconciliation_run_subject",
        ),
    )
    op.create_index(
        "ix_reconciliation_results_reconciliation_run_id",
        "reconciliation_results",
        ["reconciliation_run_id"],
    )

    op.create_table(
        "review_assignments",
        sa.Column(
            "review_assignment_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reconciliation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assigned_owner_id", sa.String(length=255), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.ForeignKeyConstraint(
            ["reconciliation_id"], ["reconciliation_results.reconciliation_id"]
        ),
        sa.PrimaryKeyConstraint("review_assignment_id"),
        sa.CheckConstraint(
            "(target_type = 'CASE' AND case_id IS NOT NULL AND "
            "reconciliation_id IS NULL) OR "
            "(target_type = 'RECONCILIATION_EXCEPTION' AND case_id IS NULL AND "
            "reconciliation_id IS NOT NULL)",
            name="ck_review_assignment_target",
        ),
    )
    op.create_index(
        "ix_review_assignments_workspace_id", "review_assignments", ["workspace_id"]
    )

    op.create_table(
        "review_actions",
        sa.Column("review_action_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reconciliation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_id", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column(
            "corrected_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("assigned_owner_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.ForeignKeyConstraint(
            ["reconciliation_id"], ["reconciliation_results.reconciliation_id"]
        ),
        sa.PrimaryKeyConstraint("review_action_id"),
        sa.CheckConstraint(
            "(target_type = 'CASE' AND case_id IS NOT NULL AND "
            "reconciliation_id IS NULL) OR "
            "(target_type = 'RECONCILIATION_EXCEPTION' AND case_id IS NULL AND "
            "reconciliation_id IS NOT NULL)",
            name="ck_review_action_target",
        ),
    )
    op.create_index(
        "ix_review_actions_workspace_id", "review_actions", ["workspace_id"]
    )

    op.create_table(
        "audit_events",
        sa.Column("audit_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("actor_kind", sa.String(length=16), nullable=False),
        sa.Column("actor_id", sa.String(length=255), nullable=True),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column(
            "source_hashes", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("model_version", sa.String(length=128), nullable=True),
        sa.Column("prompt_version", sa.String(length=128), nullable=True),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column("request_id", sa.String(length=255), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("audit_event_id"),
        sa.CheckConstraint(
            "payload_hash ~ '^[0-9a-f]{64}$'", name="ck_audit_events_payload_hash"
        ),
    )
    op.create_index("ix_audit_events_workspace_id", "audit_events", ["workspace_id"])

    op.create_table(
        "submission_runs",
        sa.Column("submission_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("input_manifest_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "expected_email_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("validation_count", sa.Integer(), nullable=False),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column("publication_state", sa.String(length=32), nullable=False),
        sa.Column("artifact_hash", sa.String(length=64), nullable=True),
        sa.Column("private_artifact_key", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.PrimaryKeyConstraint("submission_run_id"),
        sa.UniqueConstraint(
            "workspace_id",
            "input_manifest_hash",
            "rule_version",
            name="uq_submission_runs_manifest_rule",
        ),
        sa.CheckConstraint(
            "validation_count >= 0", name="ck_submission_validation_count"
        ),
        sa.CheckConstraint(
            "input_manifest_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_manifest_hash",
        ),
    )
    op.create_index(
        "ix_submission_runs_workspace_id", "submission_runs", ["workspace_id"]
    )

    op.execute(
        """
        CREATE FUNCTION reject_append_only_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME
                USING ERRCODE = '55000';
        END;
        $$
        """
    )
    for table_name in ("review_assignments", "review_actions", "audit_events"):
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_append_only "
            f"BEFORE UPDATE OR DELETE ON {table_name} "
            "FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation()"
        )


def downgrade() -> None:
    for table_name in ("review_assignments", "review_actions", "audit_events"):
        op.execute(f"DROP TRIGGER trg_{table_name}_append_only ON {table_name}")
    op.execute("DROP FUNCTION reject_append_only_mutation()")

    op.drop_index("ix_submission_runs_workspace_id", table_name="submission_runs")
    op.drop_index("ix_audit_events_workspace_id", table_name="audit_events")
    op.drop_index("ix_review_actions_workspace_id", table_name="review_actions")
    op.drop_index("ix_review_assignments_workspace_id", table_name="review_assignments")
    op.drop_index(
        "ix_reconciliation_results_reconciliation_run_id",
        table_name="reconciliation_results",
    )
    op.drop_index(
        "ix_reconciliation_runs_workspace_id", table_name="reconciliation_runs"
    )
    op.drop_index("ix_expected_shipments_workspace_id", table_name="expected_shipments")
    op.drop_index("ix_field_verdicts_case_id", table_name="field_verdicts")
    op.drop_index("ix_cases_workspace_id", table_name="cases")
    op.drop_index("ix_ingestion_requests_workspace_id", table_name="ingestion_requests")
    op.drop_index(
        "ix_email_attachments_source_object_id", table_name="email_attachments"
    )
    op.drop_index("ix_email_attachments_email_id", table_name="email_attachments")
    op.drop_index("ix_email_receipts_workspace_id", table_name="email_receipts")
    op.drop_index("uq_email_receipts_fallback", table_name="email_receipts")
    op.drop_index("uq_email_receipts_source_message", table_name="email_receipts")
    op.drop_index("ix_workspaces_seed_workspace_id", table_name="workspaces")
    op.drop_index("ix_workspaces_guest_session_id", table_name="workspaces")

    op.drop_table("submission_runs")
    op.drop_table("audit_events")
    op.drop_table("review_actions")
    op.drop_table("review_assignments")
    op.drop_table("reconciliation_results")
    op.drop_table("reconciliation_runs")
    op.drop_table("expected_shipments")
    op.drop_table("field_verdicts")
    op.drop_table("cases")
    op.drop_table("extraction_cache")
    op.drop_table("ingestion_requests")
    op.drop_table("email_attachments")
    op.drop_table("email_receipts")
    op.drop_table("source_objects")
    op.drop_table("workspaces")
    op.drop_table("guest_sessions")
