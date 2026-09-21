"""Record live judge runs over uploaded SI/draft-BL pairs."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260921_0006"
down_revision: str | None = "20260921_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


FAILURE_SHAPE = (
    "COALESCE((state = 'FAILED' AND failure_code IS NOT NULL AND "
    "btrim(failure_code) <> '' AND failure_retryable IS NOT NULL AND "
    "failure_message IS NOT NULL AND btrim(failure_message) <> '') OR "
    "(state = 'SUCCEEDED' AND failure_code IS NULL AND "
    "failure_retryable IS NULL AND failure_message IS NULL), FALSE)"
)


def upgrade() -> None:
    op.create_table(
        "judge_runs",
        sa.Column("judge_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("failure_retryable", sa.Boolean(), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("slots", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.workspace_id"]),
        sa.ForeignKeyConstraint(["email_id"], ["email_receipts.email_id"]),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.PrimaryKeyConstraint("judge_run_id"),
        sa.CheckConstraint("attempt >= 1", name="ck_judge_runs_attempt"),
        sa.CheckConstraint("latency_ms >= 0", name="ck_judge_runs_latency_ms"),
        sa.CheckConstraint(
            "jsonb_typeof(slots) = 'object'", name="ck_judge_runs_slots"
        ),
        sa.CheckConstraint(FAILURE_SHAPE, name="ck_judge_runs_failure_shape"),
    )
    op.create_index("ix_judge_runs_workspace_id", "judge_runs", ["workspace_id"])


def downgrade() -> None:
    op.drop_index("ix_judge_runs_workspace_id", table_name="judge_runs")
    op.drop_table("judge_runs")
