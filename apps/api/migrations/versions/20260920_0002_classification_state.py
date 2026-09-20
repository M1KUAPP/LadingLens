"""Persist classification state and provider attempts."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260920_0002"
down_revision: str | None = "20260920_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("email_receipts", sa.Column("body_text", sa.Text(), nullable=True))

    op.add_column(
        "cases",
        sa.Column(
            "classification_state",
            sa.String(length=24),
            server_default="CLASSIFIED",
            nullable=False,
        ),
    )
    op.add_column(
        "cases",
        sa.Column(
            "category_probabilities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "cases", sa.Column("provider_request_id", sa.String(length=255), nullable=True)
    )
    op.add_column("cases", sa.Column("provider_error", sa.Text(), nullable=True))
    op.add_column("cases", sa.Column("provider_retryable", sa.Boolean(), nullable=True))
    op.add_column(
        "cases",
        sa.Column(
            "provider_attempt_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "cases",
        sa.Column(
            "provider_last_attempt_at", sa.DateTime(timezone=True), nullable=True
        ),
    )

    op.alter_column("cases", "category", existing_type=sa.String(), nullable=True)
    op.alter_column("cases", "status", existing_type=sa.String(), nullable=True)
    op.alter_column(
        "cases",
        "evaluator_output",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
    )
    op.alter_column(
        "cases",
        "classification_state",
        existing_type=sa.String(length=24),
        server_default="PENDING",
        nullable=False,
    )

    op.create_check_constraint(
        "ck_cases_classification_evidence",
        "cases",
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
    )
    op.create_check_constraint(
        "ck_cases_classification_state",
        "cases",
        "classification_state IN "
        "('PENDING', 'PROVIDER_FAILED', 'BL_READY', 'CLASSIFIED')",
    )
    op.create_check_constraint(
        "ck_cases_provider_attempt_count",
        "cases",
        "provider_attempt_count >= 0",
    )
    op.create_check_constraint(
        "ck_cases_provider_state",
        "cases",
        "(classification_state = 'PROVIDER_FAILED' AND "
        "provider_error IS NOT NULL AND provider_retryable IS NOT NULL) OR "
        "(classification_state <> 'PROVIDER_FAILED' AND "
        "provider_error IS NULL AND provider_retryable IS NULL)",
    )
    op.create_check_constraint(
        "ck_cases_category_probabilities_object",
        "cases",
        "category_probabilities IS NULL OR "
        "jsonb_typeof(category_probabilities) = 'object'",
    )

    op.create_table(
        "classification_attempts",
        sa.Column(
            "classification_attempt_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_model", sa.String(length=128), nullable=False),
        sa.Column("returned_model", sa.String(length=128), nullable=True),
        sa.Column("prompt_version", sa.String(length=128), nullable=False),
        sa.Column("rule_version", sa.String(length=128), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("safe_diagnostic", sa.Text(), nullable=True),
        sa.Column("retryable", sa.Boolean(), nullable=False),
        sa.Column("provider_request_id", sa.String(length=255), nullable=True),
        sa.Column("correlation_id", sa.String(length=255), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.PrimaryKeyConstraint("classification_attempt_id"),
        sa.CheckConstraint(
            "outcome IN ('SUCCEEDED', 'PROVIDER_FAILED')",
            name="ck_classification_attempt_outcome",
        ),
        sa.CheckConstraint(
            "completed_at >= started_at",
            name="ck_classification_attempt_timestamps",
        ),
    )
    op.create_index(
        "ix_classification_attempts_case_id",
        "classification_attempts",
        ["case_id"],
    )
    op.execute(
        "CREATE TRIGGER trg_classification_attempts_append_only "
        "BEFORE UPDATE OR DELETE ON classification_attempts "
        "FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation()"
    )


def downgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM cases WHERE classification_state <> 'CLASSIFIED' "
        "OR category IS NULL OR status IS NULL OR evaluator_output IS NULL) THEN "
        "RAISE EXCEPTION 'cannot downgrade while classification state is incomplete'; "
        "END IF; END $$"
    )
    op.execute(
        "DROP TRIGGER trg_classification_attempts_append_only "
        "ON classification_attempts"
    )
    op.drop_index(
        "ix_classification_attempts_case_id", table_name="classification_attempts"
    )
    op.drop_table("classification_attempts")
    op.drop_constraint("ck_cases_category_probabilities_object", "cases", type_="check")
    op.drop_constraint("ck_cases_provider_state", "cases", type_="check")
    op.drop_constraint("ck_cases_provider_attempt_count", "cases", type_="check")
    op.drop_constraint("ck_cases_classification_state", "cases", type_="check")
    op.drop_constraint("ck_cases_classification_evidence", "cases", type_="check")
    op.alter_column(
        "cases",
        "evaluator_output",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )
    op.alter_column("cases", "status", existing_type=sa.String(), nullable=False)
    op.alter_column("cases", "category", existing_type=sa.String(), nullable=False)
    op.drop_column("cases", "provider_last_attempt_at")
    op.drop_column("cases", "provider_attempt_count")
    op.drop_column("cases", "provider_retryable")
    op.drop_column("cases", "provider_error")
    op.drop_column("cases", "provider_request_id")
    op.drop_column("cases", "category_probabilities")
    op.drop_column("cases", "classification_state")
    op.drop_column("email_receipts", "body_text")
