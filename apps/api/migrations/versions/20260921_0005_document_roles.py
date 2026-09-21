"""Persist document-role decisions and cache scan transcriptions."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260921_0005"
down_revision: str | None = "20260921_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


OUTCOME_SHAPE = (
    "COALESCE((outcome = 'SUCCEEDED' AND "
    "role IN ('SI', 'DRAFT_BL', 'OTHER') AND "
    "jsonb_typeof(role_probabilities) = 'object' AND "
    "returned_model IS NOT NULL AND safe_diagnostic IS NULL AND "
    "retryable IS NULL) OR "
    "(outcome = 'PROVIDER_FAILED' AND role IS NULL AND "
    "role_probabilities IS NULL AND safe_diagnostic IS NOT NULL AND "
    "btrim(safe_diagnostic) <> '' AND retryable IS NOT NULL), FALSE)"
)


def upgrade() -> None:
    op.add_column(
        "extraction_cache", sa.Column("document_text", sa.Text(), nullable=True)
    )

    op.create_table(
        "document_role_decisions",
        sa.Column(
            "document_role_decision_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attachment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=True),
        sa.Column(
            "role_probabilities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("requested_model", sa.String(length=128), nullable=False),
        sa.Column("returned_model", sa.String(length=128), nullable=True),
        sa.Column("prompt_version", sa.String(length=128), nullable=False),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column("provider_request_id", sa.String(length=255), nullable=True),
        sa.Column("correlation_id", sa.String(length=255), nullable=False),
        sa.Column("safe_diagnostic", sa.Text(), nullable=True),
        sa.Column("retryable", sa.Boolean(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["attachment_id"], ["email_attachments.attachment_id"]),
        sa.PrimaryKeyConstraint("document_role_decision_id"),
        sa.CheckConstraint(
            "content_hash ~ '^[0-9a-f]{64}$'",
            name="ck_document_role_decisions_content_hash",
        ),
        sa.CheckConstraint(
            OUTCOME_SHAPE,
            name="ck_document_role_decisions_outcome_shape",
        ),
        sa.CheckConstraint(
            "completed_at >= started_at",
            name="ck_document_role_decisions_timestamps",
        ),
    )
    op.create_index(
        "ix_document_role_decisions_workspace_id",
        "document_role_decisions",
        ["workspace_id"],
    )
    op.create_index(
        "ix_document_role_decisions_attachment_id",
        "document_role_decisions",
        ["attachment_id"],
    )
    op.execute(
        "CREATE TRIGGER trg_document_role_decisions_append_only "
        "BEFORE UPDATE OR DELETE ON document_role_decisions "
        "FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation()"
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER trg_document_role_decisions_append_only "
        "ON document_role_decisions"
    )
    op.drop_index(
        "ix_document_role_decisions_attachment_id",
        table_name="document_role_decisions",
    )
    op.drop_index(
        "ix_document_role_decisions_workspace_id",
        table_name="document_role_decisions",
    )
    op.drop_table("document_role_decisions")
    op.drop_column("extraction_cache", "document_text")
