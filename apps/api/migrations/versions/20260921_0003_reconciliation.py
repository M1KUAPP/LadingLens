"""Make expected shipments and reconciliation snapshots durable."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260921_0003"
down_revision: str | None = "20260920_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


OUTCOME_SHAPE = (
    "COALESCE((outcome IN ('CASE_PRESENT', 'DOCUMENT_MISSING') AND "
    "shipment_id IS NOT NULL AND btrim(shipment_id) <> '' AND "
    "jsonb_typeof(case_ids) = 'array' AND jsonb_array_length(case_ids) > 0 AND "
    "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
    "source_freshness = 'CURRENT') OR "
    "(outcome = 'MISSING_CASE' AND shipment_id IS NOT NULL AND "
    "btrim(shipment_id) <> '' AND case_ids = '[]'::jsonb AND "
    "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
    "source_freshness = 'CURRENT') OR "
    "(outcome = 'UNMATCHED_CASE' AND shipment_id IS NULL AND "
    "jsonb_typeof(case_ids) = 'array' AND jsonb_array_length(case_ids) > 0 AND "
    "candidate_shipment_ids IS NULL AND candidate_case_ids IS NULL AND "
    "source_freshness = 'CURRENT') OR "
    "(outcome = 'DUPLICATE_OR_AMBIGUOUS' AND shipment_id IS NULL AND "
    "case_ids IS NULL AND jsonb_typeof(candidate_shipment_ids) = 'array' AND "
    "jsonb_array_length(candidate_shipment_ids) > 0 AND "
    "jsonb_typeof(candidate_case_ids) = 'array' AND "
    "jsonb_array_length(candidate_case_ids) > 0) OR "
    "(outcome = 'SOURCE_STALE' AND shipment_id IS NOT NULL AND "
    "btrim(shipment_id) <> '' AND jsonb_typeof(case_ids) = 'array' AND "
    "jsonb_array_length(case_ids) > 0 AND candidate_shipment_ids IS NULL AND "
    "candidate_case_ids IS NULL AND source_freshness = 'STALE'), FALSE)"
)


def upgrade() -> None:
    op.add_column(
        "expected_shipments",
        sa.Column("booking_reference", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "expected_shipments",
        sa.Column(
            "required_documents",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "expected_shipments",
        sa.Column("cutoff_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "expected_shipments",
        sa.Column("source_owner_id", sa.String(length=255), nullable=True),
    )

    op.execute(
        "UPDATE expected_shipments SET "
        "booking_reference = NULLIF(btrim(imported_row->>'booking_reference'), ''), "
        "required_documents = CASE "
        "WHEN jsonb_typeof(imported_row->'required_documents') = 'array' "
        "THEN imported_row->'required_documents' ELSE '[]'::jsonb END, "
        "cutoff_at = CASE "
        "WHEN NULLIF(btrim(imported_row->>'cutoff_at'), '') IS NOT NULL "
        "THEN (imported_row->>'cutoff_at')::timestamptz ELSE NULL END, "
        "source_owner_id = COALESCE(NULLIF(btrim(assigned_owner_id), ''), "
        "NULLIF(btrim(imported_row->>'owner'), ''), 'legacy-unassigned')"
    )
    op.alter_column(
        "expected_shipments",
        "required_documents",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )
    op.alter_column(
        "expected_shipments",
        "source_owner_id",
        existing_type=sa.String(length=255),
        nullable=False,
    )

    op.create_check_constraint(
        "ck_expected_shipments_identifiers",
        "expected_shipments",
        "jsonb_typeof(identifiers) = 'object'",
    )
    op.create_check_constraint(
        "ck_expected_shipments_documents",
        "expected_shipments",
        "jsonb_typeof(documents) = 'array'",
    )
    op.create_check_constraint(
        "ck_expected_shipments_required_documents",
        "expected_shipments",
        "jsonb_typeof(required_documents) = 'array'",
    )
    op.create_check_constraint(
        "ck_expected_shipments_source_freshness",
        "expected_shipments",
        "source_freshness IN ('CURRENT', 'STALE')",
    )
    op.create_check_constraint(
        "ck_expected_shipments_source_owner",
        "expected_shipments",
        "btrim(source_owner_id) <> ''",
    )
    op.create_check_constraint(
        "ck_expected_shipments_booking_reference",
        "expected_shipments",
        "booking_reference IS NULL OR btrim(booking_reference) <> ''",
    )

    op.create_check_constraint(
        "ck_reconciliation_runs_source_hash",
        "reconciliation_runs",
        "source_hash ~ '^[0-9a-f]{64}$'",
    )
    op.create_check_constraint(
        "ck_reconciliation_results_source_freshness",
        "reconciliation_results",
        "source_freshness IN ('CURRENT', 'STALE')",
    )
    op.create_check_constraint(
        "ck_reconciliation_results_match_basis",
        "reconciliation_results",
        "jsonb_typeof(match_basis) = 'array'",
    )
    op.create_check_constraint(
        "ck_reconciliation_results_outcome_shape",
        "reconciliation_results",
        OUTCOME_SHAPE,
    )

    for table_name in (
        "expected_shipments",
        "reconciliation_runs",
        "reconciliation_results",
    ):
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_append_only "
            f"BEFORE UPDATE OR DELETE ON {table_name} "
            "FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation()"
        )


def downgrade() -> None:
    for table_name in (
        "reconciliation_results",
        "reconciliation_runs",
        "expected_shipments",
    ):
        op.execute(f"DROP TRIGGER trg_{table_name}_append_only ON {table_name}")

    op.drop_constraint(
        "ck_reconciliation_results_outcome_shape",
        "reconciliation_results",
        type_="check",
    )
    op.drop_constraint(
        "ck_reconciliation_results_match_basis",
        "reconciliation_results",
        type_="check",
    )
    op.drop_constraint(
        "ck_reconciliation_results_source_freshness",
        "reconciliation_results",
        type_="check",
    )
    op.drop_constraint(
        "ck_reconciliation_runs_source_hash", "reconciliation_runs", type_="check"
    )

    op.drop_constraint(
        "ck_expected_shipments_booking_reference",
        "expected_shipments",
        type_="check",
    )
    op.drop_constraint(
        "ck_expected_shipments_source_owner",
        "expected_shipments",
        type_="check",
    )
    op.drop_constraint(
        "ck_expected_shipments_source_freshness",
        "expected_shipments",
        type_="check",
    )
    op.drop_constraint(
        "ck_expected_shipments_required_documents",
        "expected_shipments",
        type_="check",
    )
    op.drop_constraint(
        "ck_expected_shipments_documents", "expected_shipments", type_="check"
    )
    op.drop_constraint(
        "ck_expected_shipments_identifiers", "expected_shipments", type_="check"
    )

    op.drop_column("expected_shipments", "source_owner_id")
    op.drop_column("expected_shipments", "cutoff_at")
    op.drop_column("expected_shipments", "required_documents")
    op.drop_column("expected_shipments", "booking_reference")
