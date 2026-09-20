"""Add durable staging and scoring records for atomic submissions."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260921_0004"
down_revision: str | None = "20260921_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SUBMISSION_OUTPUT_SHAPE = (
    "COALESCE(jsonb_typeof(evaluator_output) = 'object' AND "
    "submission_evaluator_output_key_count(evaluator_output) = 5 AND "
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
    "evaluator_output->>'status' = 'OK'), FALSE)"
)

PUBLICATION_SHAPE = (
    "COALESCE((publication_state = 'PUBLISHED' AND "
    "artifact_hash IS NOT NULL AND private_artifact_key IS NOT NULL AND "
    "published_at IS NOT NULL AND staged_at IS NOT NULL AND "
    "validation_count = 520 AND blockers = '[]'::jsonb) OR "
    "(publication_state <> 'PUBLISHED' AND artifact_hash IS NULL AND "
    "private_artifact_key IS NULL AND published_at IS NULL), FALSE)"
)

RUN_STATE_SHAPE = (
    "COALESCE((publication_state = 'PENDING' AND staged_at IS NULL AND "
    "blockers = '[]'::jsonb) OR "
    "(publication_state = 'BLOCKED' AND staged_at IS NULL AND "
    "jsonb_array_length(blockers) > 0) OR "
    "(publication_state IN ('STAGED', 'PUBLISHED') AND "
    "staged_at IS NOT NULL AND validation_count = 520 AND "
    "blockers = '[]'::jsonb), FALSE)"
)

EVALUATION_RESULT_SHAPE = (
    "COALESCE((outcome = 'SUCCEEDED' AND endpoint IS NOT NULL AND "
    "jsonb_typeof(scoreboard) = 'object' AND safe_failure IS NULL) OR "
    "(outcome = 'FAILED' AND endpoint IS NOT NULL AND scoreboard IS NULL AND "
    "safe_failure IS NOT NULL AND btrim(safe_failure) <> '') OR "
    "(outcome = 'UNAVAILABLE' AND scoreboard IS NULL AND "
    "safe_failure IS NOT NULL AND btrim(safe_failure) <> ''), FALSE)"
)


def upgrade() -> None:
    op.add_column(
        "cases",
        sa.Column(
            "structural_diagnostics",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_cases_structural_diagnostics_array",
        "cases",
        "jsonb_typeof(structural_diagnostics) = 'array'",
    )

    op.add_column(
        "submission_runs",
        sa.Column(
            "blockers",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "submission_runs",
        sa.Column(
            "serializer_version",
            sa.String(length=128),
            server_default="submission-v1",
            nullable=False,
        ),
    )
    op.add_column(
        "submission_runs",
        sa.Column(
            "version_manifest",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "submission_runs",
        sa.Column("staged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "submission_runs",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.alter_column(
        "submission_runs",
        "publication_state",
        existing_type=sa.String(length=32),
        server_default="PENDING",
        existing_nullable=False,
    )

    op.create_check_constraint(
        "ck_submission_runs_expected_email_ids",
        "submission_runs",
        "jsonb_typeof(expected_email_ids) = 'array'",
    )
    op.create_check_constraint(
        "ck_submission_runs_publication_state",
        "submission_runs",
        "publication_state IN ('PENDING', 'BLOCKED', 'STAGED', 'PUBLISHED')",
    )
    op.create_check_constraint(
        "ck_submission_runs_blockers",
        "submission_runs",
        "jsonb_typeof(blockers) = 'array'",
    )
    op.create_check_constraint(
        "ck_submission_runs_serializer_version",
        "submission_runs",
        "btrim(serializer_version) <> ''",
    )
    op.create_check_constraint(
        "ck_submission_runs_version_manifest",
        "submission_runs",
        "jsonb_typeof(version_manifest) = 'object'",
    )
    op.create_check_constraint(
        "ck_submission_runs_artifact_hash",
        "submission_runs",
        "artifact_hash IS NULL OR artifact_hash ~ '^[0-9a-f]{64}$'",
    )
    op.create_check_constraint(
        "ck_submission_runs_artifact_key",
        "submission_runs",
        "private_artifact_key IS NULL OR (artifact_hash IS NOT NULL AND "
        "private_artifact_key = 'submission-artifacts/' || "
        "substr(artifact_hash, 1, 2) || '/' || artifact_hash || '.json')",
    )
    op.create_check_constraint(
        "ck_submission_runs_publication_shape",
        "submission_runs",
        PUBLICATION_SHAPE,
    )
    op.create_check_constraint(
        "ck_submission_runs_state_shape",
        "submission_runs",
        RUN_STATE_SHAPE,
    )

    op.execute(
        """
        CREATE FUNCTION submission_defect_fields_are_canonical(fields jsonb)
        RETURNS boolean
        LANGUAGE sql
        IMMUTABLE
        STRICT
        AS $$
            SELECT fields = COALESCE(
                (
                    SELECT jsonb_agg(field ORDER BY ordinal)
                    FROM (
                        VALUES
                            ('shipper', 1),
                            ('consignee', 2),
                            ('notify_party', 3),
                            ('port_of_loading', 4),
                            ('port_of_discharge', 5),
                            ('container_count', 6),
                            ('gross_weight_kg', 7)
                    ) AS allowed(field, ordinal)
                    WHERE fields ? field
                ),
                '[]'::jsonb
            )
        $$
        """
    )

    op.execute(
        """
        CREATE FUNCTION submission_evaluator_output_key_count(target jsonb)
        RETURNS integer
        LANGUAGE sql
        IMMUTABLE
        STRICT
        AS $$
            SELECT count(*)::integer FROM jsonb_object_keys(target)
        $$
        """
    )

    op.create_table(
        "submission_run_records",
        sa.Column(
            "submission_run_record_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("submission_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_id", sa.String(length=32), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "evaluator_output",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("record_hash", sa.String(length=64), nullable=False),
        sa.Column("source_state_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "diagnostics",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "version_manifest",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["submission_run_id"], ["submission_runs.submission_run_id"]
        ),
        sa.ForeignKeyConstraint(["case_id"], ["cases.case_id"]),
        sa.PrimaryKeyConstraint("submission_run_record_id"),
        sa.UniqueConstraint(
            "submission_run_id",
            "email_id",
            name="uq_submission_run_records_run_email",
        ),
        sa.CheckConstraint(
            "email_id ~ '^email_[0-9]{3}$'",
            name="ck_submission_run_records_email_id",
        ),
        sa.CheckConstraint(
            "record_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_run_records_record_hash",
        ),
        sa.CheckConstraint(
            "source_state_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_run_records_source_state_hash",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(diagnostics) = 'array'",
            name="ck_submission_run_records_diagnostics",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(version_manifest) = 'object'",
            name="ck_submission_run_records_version_manifest",
        ),
        sa.CheckConstraint(
            SUBMISSION_OUTPUT_SHAPE,
            name="ck_submission_run_records_output_shape",
        ),
    )
    op.create_index(
        "ix_submission_run_records_submission_run_id",
        "submission_run_records",
        ["submission_run_id"],
    )
    op.create_index(
        "ix_submission_run_records_case_id",
        "submission_run_records",
        ["case_id"],
    )

    op.create_table(
        "submission_evaluations",
        sa.Column(
            "submission_evaluation_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("submission_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_hash", sa.String(length=64), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column(
            "scoreboard",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("safe_failure", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["submission_run_id"], ["submission_runs.submission_run_id"]
        ),
        sa.PrimaryKeyConstraint("submission_evaluation_id"),
        sa.CheckConstraint(
            "artifact_hash ~ '^[0-9a-f]{64}$'",
            name="ck_submission_evaluations_artifact_hash",
        ),
        sa.CheckConstraint(
            "outcome IN ('SUCCEEDED', 'FAILED', 'UNAVAILABLE')",
            name="ck_submission_evaluations_outcome",
        ),
        sa.CheckConstraint(
            "completed_at >= started_at",
            name="ck_submission_evaluations_timestamps",
        ),
        sa.CheckConstraint(
            "endpoint IS NULL OR btrim(endpoint) <> ''",
            name="ck_submission_evaluations_endpoint",
        ),
        sa.CheckConstraint(
            EVALUATION_RESULT_SHAPE,
            name="ck_submission_evaluations_result_shape",
        ),
    )
    op.create_index(
        "ix_submission_evaluations_submission_run_id",
        "submission_evaluations",
        ["submission_run_id"],
    )

    for table_name in ("submission_run_records", "submission_evaluations"):
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_append_only "
            f"BEFORE UPDATE OR DELETE ON {table_name} "
            "FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation()"
        )

    op.execute(
        """
        CREATE FUNCTION guard_submission_run_record_insert()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            parent_state text;
        BEGIN
            SELECT publication_state INTO parent_state
            FROM submission_runs
            WHERE submission_run_id = NEW.submission_run_id
            FOR UPDATE;
            IF parent_state IN ('STAGED', 'PUBLISHED') THEN
                RAISE EXCEPTION 'submission run % no longer accepts records',
                    NEW.submission_run_id
                    USING ERRCODE = '55000';
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER trg_submission_run_records_insert_guard "
        "BEFORE INSERT ON submission_run_records "
        "FOR EACH ROW EXECUTE FUNCTION guard_submission_run_record_insert()"
    )

    op.execute(
        """
        CREATE FUNCTION guard_submission_evaluation_insert()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            parent_state text;
            parent_artifact_hash text;
        BEGIN
            SELECT publication_state, artifact_hash
            INTO parent_state, parent_artifact_hash
            FROM submission_runs
            WHERE submission_run_id = NEW.submission_run_id
            FOR UPDATE;
            IF parent_state IS DISTINCT FROM 'PUBLISHED'
               OR parent_artifact_hash IS DISTINCT FROM NEW.artifact_hash THEN
                RAISE EXCEPTION 'submission evaluation does not match a published run'
                    USING ERRCODE = '55000';
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER trg_submission_evaluations_insert_guard "
        "BEFORE INSERT ON submission_evaluations "
        "FOR EACH ROW EXECUTE FUNCTION guard_submission_evaluation_insert()"
    )

    op.execute(
        """
        CREATE FUNCTION guard_submission_run_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            expected_ids jsonb;
            staged_ids jsonb;
        BEGIN
            IF TG_OP = 'DELETE' THEN
                IF OLD.publication_state = 'PUBLISHED' THEN
                    RAISE EXCEPTION 'published submission run % is immutable',
                        OLD.submission_run_id
                        USING ERRCODE = '55000';
                END IF;
                RETURN OLD;
            END IF;
            IF TG_OP = 'UPDATE' AND OLD.publication_state = 'PUBLISHED' THEN
                RAISE EXCEPTION 'published submission run % is immutable',
                    OLD.submission_run_id
                    USING ERRCODE = '55000';
            END IF;
            IF NEW.publication_state = 'PUBLISHED' THEN
                SELECT jsonb_agg(
                    'email_' || lpad(sequence_number::text, 3, '0')
                    ORDER BY sequence_number
                ) INTO expected_ids
                FROM generate_series(1, 520) AS numbers(sequence_number);
                IF NEW.expected_email_ids IS DISTINCT FROM expected_ids THEN
                    RAISE EXCEPTION 'submission run % has an invalid manifest',
                        NEW.submission_run_id
                        USING ERRCODE = '23514';
                END IF;
                SELECT jsonb_agg(email_id ORDER BY email_id) INTO staged_ids
                FROM submission_run_records
                WHERE submission_run_id = NEW.submission_run_id;
                IF staged_ids IS DISTINCT FROM expected_ids THEN
                    RAISE EXCEPTION 'submission run % lacks the exact staged records',
                        NEW.submission_run_id
                        USING ERRCODE = '23514';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER trg_submission_runs_published_immutable "
        "BEFORE INSERT OR UPDATE OR DELETE ON submission_runs "
        "FOR EACH ROW EXECUTE FUNCTION guard_submission_run_mutation()"
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER trg_submission_runs_published_immutable ON submission_runs"
    )
    op.execute("DROP FUNCTION guard_submission_run_mutation()")
    op.execute(
        "DROP TRIGGER trg_submission_evaluations_insert_guard ON submission_evaluations"
    )
    op.execute("DROP FUNCTION guard_submission_evaluation_insert()")
    op.execute(
        "DROP TRIGGER trg_submission_run_records_insert_guard ON submission_run_records"
    )
    op.execute("DROP FUNCTION guard_submission_run_record_insert()")

    for table_name in ("submission_evaluations", "submission_run_records"):
        op.execute(f"DROP TRIGGER trg_{table_name}_append_only ON {table_name}")

    op.drop_index(
        "ix_submission_evaluations_submission_run_id",
        table_name="submission_evaluations",
    )
    op.drop_table("submission_evaluations")
    op.drop_index(
        "ix_submission_run_records_case_id",
        table_name="submission_run_records",
    )
    op.drop_index(
        "ix_submission_run_records_submission_run_id",
        table_name="submission_run_records",
    )
    op.drop_table("submission_run_records")
    op.execute("DROP FUNCTION submission_evaluator_output_key_count(jsonb)")
    op.execute("DROP FUNCTION submission_defect_fields_are_canonical(jsonb)")

    for constraint_name in (
        "ck_submission_runs_state_shape",
        "ck_submission_runs_publication_shape",
        "ck_submission_runs_artifact_key",
        "ck_submission_runs_artifact_hash",
        "ck_submission_runs_version_manifest",
        "ck_submission_runs_serializer_version",
        "ck_submission_runs_blockers",
        "ck_submission_runs_publication_state",
        "ck_submission_runs_expected_email_ids",
    ):
        op.drop_constraint(constraint_name, "submission_runs", type_="check")

    op.alter_column(
        "submission_runs",
        "publication_state",
        existing_type=sa.String(length=32),
        server_default=None,
        existing_nullable=False,
    )
    op.drop_column("submission_runs", "updated_at")
    op.drop_column("submission_runs", "staged_at")
    op.drop_column("submission_runs", "version_manifest")
    op.drop_column("submission_runs", "serializer_version")
    op.drop_column("submission_runs", "blockers")

    op.drop_constraint("ck_cases_structural_diagnostics_array", "cases", type_="check")
    op.drop_column("cases", "structural_diagnostics")
