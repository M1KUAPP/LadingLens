from sqlalchemy import CheckConstraint, UniqueConstraint

from app.models import Base

REQUIRED_TABLES = {
    "source_objects",
    "email_receipts",
    "classification_attempts",
    "extraction_cache",
    "cases",
    "field_verdicts",
    "expected_shipments",
    "reconciliation_results",
    "review_assignments",
    "review_actions",
    "audit_events",
    "submission_evaluations",
    "submission_run_records",
    "submission_runs",
}

SUPPORT_TABLES = {
    "guest_sessions",
    "workspaces",
    "ingestion_requests",
    "email_attachments",
    "reconciliation_runs",
}


def _unique_constraint_columns(table_name: str) -> set[tuple[str, ...]]:
    table = Base.metadata.tables[table_name]
    return {
        tuple(column.name for column in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }


def _unique_index_columns(table_name: str) -> set[tuple[str, ...]]:
    table = Base.metadata.tables[table_name]
    return {
        tuple(column.name for column in index.columns)
        for index in table.indexes
        if index.unique
    }


def _check_constraint(table_name: str, constraint_name: str) -> CheckConstraint:
    table = Base.metadata.tables[table_name]
    return next(
        constraint
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
        and constraint.name == constraint_name
    )


def test_metadata_contains_required_and_support_tables() -> None:
    assert REQUIRED_TABLES | SUPPORT_TABLES <= set(Base.metadata.tables)


def test_source_objects_are_content_addressed_and_private() -> None:
    table = Base.metadata.tables["source_objects"]

    assert ("content_hash",) in _unique_constraint_columns("source_objects")
    assert ("private_object_key",) in _unique_constraint_columns("source_objects")
    assert "public_url" not in table.columns


def test_receipt_uniqueness_uses_scoped_partial_indexes() -> None:
    unique_indexes = _unique_index_columns("email_receipts")

    assert ("workspace_id", "source_message_id") in unique_indexes
    assert (
        "workspace_id",
        "message_hash",
        "received_at",
        "sender",
    ) in unique_indexes


def test_trd_cache_and_domain_uniqueness_constraints_are_present() -> None:
    assert (
        "content_hash",
        "extractor_version",
        "extraction_schema_version",
    ) in _unique_constraint_columns("extraction_cache")
    assert ("email_id",) in _unique_constraint_columns("cases")
    assert ("case_id", "field") in _unique_constraint_columns("field_verdicts")
    assert (
        "workspace_id",
        "source_system",
        "shipment_id",
        "source_hash",
    ) in _unique_constraint_columns("expected_shipments")
    assert (
        "reconciliation_run_id",
        "subject_key",
    ) in _unique_constraint_columns("reconciliation_results")
    assert (
        "workspace_id",
        "input_manifest_hash",
        "rule_version",
    ) in _unique_constraint_columns("submission_runs")


def test_idempotency_key_and_guest_generation_are_scoped() -> None:
    assert (
        "workspace_id",
        "idempotency_key",
    ) in _unique_constraint_columns("ingestion_requests")
    assert (
        "guest_session_id",
        "generation",
    ) in _unique_constraint_columns("workspaces")


def test_guest_workspace_can_reference_an_immutable_seed_workspace() -> None:
    table = Base.metadata.tables["workspaces"]
    seed_foreign_keys = {
        foreign_key.target_fullname
        for foreign_key in table.c.seed_workspace_id.foreign_keys
    }

    assert seed_foreign_keys == {"workspaces.workspace_id"}


def test_audit_event_has_no_cascading_target_foreign_key() -> None:
    table = Base.metadata.tables["audit_events"]
    target_columns = {"entity_type", "entity_id"}

    assert target_columns <= set(table.columns.keys())
    assert all(
        foreign_key.parent.name not in target_columns
        for foreign_key in table.foreign_keys
    )


def test_classification_metadata_supports_pending_and_ready_cases() -> None:
    receipt = Base.metadata.tables["email_receipts"]
    cases = Base.metadata.tables["cases"]
    attempts = Base.metadata.tables["classification_attempts"]

    assert receipt.c.body_text.nullable
    assert cases.c.category.nullable
    assert cases.c.status.nullable
    assert cases.c.evaluator_output.nullable
    assert "classification_state" in cases.c
    assert "category_probabilities" in cases.c
    assert "provider_error" in cases.c
    assert "provider_retryable" in cases.c
    assert {"requested_model", "returned_model", "outcome"} <= set(attempts.c.keys())
    assert {"safe_diagnostic", "retryable", "provider_request_id"} <= set(
        attempts.c.keys()
    )
    assert {
        "prompt_version",
        "rule_version",
        "correlation_id",
        "started_at",
        "completed_at",
    } <= set(attempts.c.keys())

    constraint_names = {constraint.name for constraint in cases.constraints}
    assert "ck_cases_classification_evidence" in constraint_names
    evidence_constraint = next(
        constraint
        for constraint in cases.constraints
        if constraint.name == "ck_cases_classification_evidence"
    )
    assert (
        "classification_state = 'BL_READY' AND category IS NOT NULL AND "
        "category = 'BL_COMPARISON'"
    ) in str(evidence_constraint.sqltext)


def test_expected_shipments_retain_typed_reconciliation_inputs() -> None:
    table = Base.metadata.tables["expected_shipments"]

    assert {
        "booking_reference",
        "required_documents",
        "cutoff_at",
        "source_owner_id",
    } <= set(table.c.keys())
    assert table.c.booking_reference.nullable
    assert not table.c.required_documents.nullable
    assert table.c.cutoff_at.nullable
    assert table.c.cutoff_at.type.timezone
    assert not table.c.source_owner_id.nullable

    assert "jsonb_typeof(required_documents) = 'array'" in str(
        _check_constraint(
            "expected_shipments", "ck_expected_shipments_required_documents"
        ).sqltext
    )
    assert "source_freshness IN ('CURRENT', 'STALE')" in str(
        _check_constraint(
            "expected_shipments", "ck_expected_shipments_source_freshness"
        ).sqltext
    )


def test_reconciliation_results_enforce_discriminated_outcome_shapes() -> None:
    shape = str(
        _check_constraint(
            "reconciliation_results", "ck_reconciliation_results_outcome_shape"
        ).sqltext
    )

    assert shape.startswith("COALESCE((")
    assert shape.endswith(", FALSE)")
    assert "outcome IN ('CASE_PRESENT', 'DOCUMENT_MISSING')" in shape
    for outcome in (
        "MISSING_CASE",
        "UNMATCHED_CASE",
        "DUPLICATE_OR_AMBIGUOUS",
        "SOURCE_STALE",
    ):
        assert f"outcome = '{outcome}'" in shape
    assert "jsonb_array_length(case_ids) > 0" in shape
    assert "case_ids = '[]'::jsonb" in shape
    assert "jsonb_array_length(candidate_shipment_ids) > 0" in shape
    assert "jsonb_array_length(candidate_case_ids) > 0" in shape
    ambiguous_shape = shape.split("outcome = 'DUPLICATE_OR_AMBIGUOUS'", 1)[1].split(
        "outcome = 'SOURCE_STALE'", 1
    )[0]
    assert "source_freshness = 'CURRENT'" not in ambiguous_shape

    assert "source_freshness IN ('CURRENT', 'STALE')" in str(
        _check_constraint(
            "reconciliation_results", "ck_reconciliation_results_source_freshness"
        ).sqltext
    )


def test_submission_runs_enforce_resumable_publication_state() -> None:
    table = Base.metadata.tables["submission_runs"]

    assert {
        "blockers",
        "serializer_version",
        "version_manifest",
        "staged_at",
        "updated_at",
    } <= set(table.c.keys())
    assert not table.c.blockers.nullable
    assert not table.c.serializer_version.nullable
    assert not table.c.version_manifest.nullable
    assert table.c.staged_at.type.timezone
    assert table.c.updated_at.type.timezone

    assert "publication_state IN ('PENDING', 'BLOCKED', 'STAGED', 'PUBLISHED')" in str(
        _check_constraint(
            "submission_runs", "ck_submission_runs_publication_state"
        ).sqltext
    )
    publication_shape = str(
        _check_constraint(
            "submission_runs", "ck_submission_runs_publication_shape"
        ).sqltext
    )
    assert "publication_state = 'PUBLISHED'" in publication_shape
    assert "artifact_hash IS NOT NULL" in publication_shape
    assert "private_artifact_key IS NOT NULL" in publication_shape
    assert "published_at IS NOT NULL" in publication_shape
    assert "artifact_hash IS NULL" in publication_shape
    assert "private_artifact_key IS NULL" in publication_shape
    assert "published_at IS NULL" in publication_shape

    assert "jsonb_typeof(blockers) = 'array'" in str(
        _check_constraint("submission_runs", "ck_submission_runs_blockers").sqltext
    )
    assert "jsonb_typeof(version_manifest) = 'object'" in str(
        _check_constraint(
            "submission_runs", "ck_submission_runs_version_manifest"
        ).sqltext
    )
    artifact_key_shape = str(
        _check_constraint("submission_runs", "ck_submission_runs_artifact_key").sqltext
    )
    assert "'submission-artifacts/'" in artifact_key_shape
    assert "substr(artifact_hash, 1, 2)" in artifact_key_shape
    assert "artifact_hash || '.json'" in artifact_key_shape


def test_submission_snapshots_are_unique_and_exact_shape() -> None:
    table = Base.metadata.tables["submission_run_records"]

    assert (
        "submission_run_id",
        "email_id",
    ) in _unique_constraint_columns("submission_run_records")
    assert {
        "case_id",
        "evaluator_output",
        "record_hash",
        "source_state_hash",
        "diagnostics",
        "version_manifest",
    } <= set(table.c.keys())

    output_shape = str(
        _check_constraint(
            "submission_run_records", "ck_submission_run_records_output_shape"
        ).sqltext
    )
    assert "submission_evaluator_output_key_count(evaluator_output) = 5" in output_shape
    for key in (
        "category",
        "status",
        "review_reason",
        "defect_fields",
        "has_defect",
    ):
        assert key in output_shape
    assert "submission_defect_fields_are_canonical" in output_shape
    assert "evaluator_output->>'status' = 'NEEDS_REVIEW'" in output_shape
    assert "evaluator_output->>'status' = 'MISMATCH'" in output_shape
    assert "evaluator_output->>'status' = 'OK'" in output_shape

    assert "jsonb_typeof(diagnostics) = 'array'" in str(
        _check_constraint(
            "submission_run_records", "ck_submission_run_records_diagnostics"
        ).sqltext
    )
    assert "jsonb_typeof(version_manifest) = 'object'" in str(
        _check_constraint(
            "submission_run_records", "ck_submission_run_records_version_manifest"
        ).sqltext
    )


def test_submission_evaluations_retain_success_or_safe_failure() -> None:
    table = Base.metadata.tables["submission_evaluations"]

    assert {
        "submission_run_id",
        "artifact_hash",
        "endpoint",
        "outcome",
        "scoreboard",
        "safe_failure",
        "started_at",
        "completed_at",
    } <= set(table.c.keys())
    assert table.c.endpoint.nullable
    assert table.c.scoreboard.nullable
    assert table.c.safe_failure.nullable
    assert "outcome IN ('SUCCEEDED', 'FAILED', 'UNAVAILABLE')" in str(
        _check_constraint(
            "submission_evaluations", "ck_submission_evaluations_outcome"
        ).sqltext
    )
    result_shape = str(
        _check_constraint(
            "submission_evaluations", "ck_submission_evaluations_result_shape"
        ).sqltext
    )
    assert "outcome = 'SUCCEEDED'" in result_shape
    assert "jsonb_typeof(scoreboard) = 'object'" in result_shape
    assert "safe_failure IS NOT NULL" in result_shape


def test_cases_retain_all_structural_diagnostics_as_an_array() -> None:
    cases = Base.metadata.tables["cases"]

    assert "structural_diagnostics" in cases.c
    assert not cases.c.structural_diagnostics.nullable
    assert "jsonb_typeof(structural_diagnostics) = 'array'" in str(
        _check_constraint("cases", "ck_cases_structural_diagnostics_array").sqltext
    )
