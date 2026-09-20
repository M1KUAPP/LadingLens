from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

API_DIR = Path(__file__).resolve().parents[1]

REQUIRED_TABLES = {
    "audit_events",
    "cases",
    "classification_attempts",
    "email_attachments",
    "email_receipts",
    "expected_shipments",
    "extraction_cache",
    "field_verdicts",
    "guest_sessions",
    "ingestion_requests",
    "reconciliation_results",
    "reconciliation_runs",
    "review_actions",
    "review_assignments",
    "source_objects",
    "submission_runs",
    "workspaces",
}


def test_reconciliation_schema_revision_is_alembic_head() -> None:
    config = Config(str(API_DIR / "alembic.ini"))

    assert ScriptDirectory.from_config(config).get_current_head() == "20260921_0003"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_initial_migration_creates_schema_at_alembic_head(
    postgres_engine,
) -> None:
    config = Config(str(API_DIR / "alembic.ini"))
    head_revision = ScriptDirectory.from_config(config).get_current_head()

    async with postgres_engine.connect() as connection:
        tables = await connection.run_sync(
            lambda sync_connection: set(inspect(sync_connection).get_table_names())
        )
        current_revision = await connection.scalar(
            text("SELECT version_num FROM alembic_version")
        )

    assert REQUIRED_TABLES <= tables
    assert current_revision == head_revision


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classification_attempts_are_append_only_and_case_checks_reject_fabrication(
    postgres_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    workspace_id = await _seed_workspace(postgres_session_factory)
    email_id = uuid.uuid4()
    case_id = uuid.uuid4()
    attempt_id = uuid.uuid4()

    async with postgres_session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO email_receipts "
                "(email_id, workspace_id, message_hash, received_at, sender) "
                "VALUES (:email_id, :workspace_id, :message_hash, now(), 'ops@test')"
            ),
            {
                "email_id": email_id,
                "workspace_id": workspace_id,
                "message_hash": "a" * 64,
            },
        )
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO cases "
                    "(case_id, workspace_id, email_id, category, classification_state, "
                    "model_version, prompt_version, normalization_version, rule_version) "
                    "VALUES (:case_id, :workspace_id, :email_id, 'GENERAL', 'PENDING', "
                    "'jev-1.13.0', 'classification-v1', 'normalization-v1', 'rules-1')"
                ),
                {
                    "case_id": case_id,
                    "workspace_id": workspace_id,
                    "email_id": email_id,
                },
            )
        await session.rollback()

    async with postgres_session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO email_receipts "
                "(email_id, workspace_id, message_hash, received_at, sender) "
                "VALUES (:email_id, :workspace_id, :message_hash, now(), 'ops@test')"
            ),
            {
                "email_id": email_id,
                "workspace_id": workspace_id,
                "message_hash": "a" * 64,
            },
        )
        await session.execute(
            text(
                "INSERT INTO cases "
                "(case_id, workspace_id, email_id, classification_state, model_version, "
                "prompt_version, normalization_version, rule_version) "
                "VALUES (:case_id, :workspace_id, :email_id, 'PENDING', "
                "'jev-1.13.0', 'classification-v1', 'normalization-v1', 'rules-1')"
            ),
            {
                "case_id": case_id,
                "workspace_id": workspace_id,
                "email_id": email_id,
            },
        )
        await session.execute(
            text(
                "INSERT INTO classification_attempts "
                "(classification_attempt_id, case_id, requested_model, prompt_version, "
                "rule_version, outcome, retryable, correlation_id, started_at, "
                "completed_at) VALUES (:attempt_id, :case_id, 'jev-1.13.0', "
                "'classification-v1', 'rules-1', 'PROVIDER_FAILED', true, 'corr-1', "
                "now(), now())"
            ),
            {"attempt_id": attempt_id, "case_id": case_id},
        )
        await session.commit()

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "UPDATE classification_attempts SET outcome = 'SUCCEEDED' "
                    "WHERE classification_attempt_id = :attempt_id"
                ),
                {"attempt_id": attempt_id},
            )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_classified_case_requires_complete_evidence(
    postgres_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    workspace_id = await _seed_workspace(postgres_session_factory)
    email_id = uuid.uuid4()

    async with postgres_session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO email_receipts "
                "(email_id, workspace_id, message_hash, received_at, sender) "
                "VALUES (:email_id, :workspace_id, :message_hash, now(), 'ops@test')"
            ),
            {
                "email_id": email_id,
                "workspace_id": workspace_id,
                "message_hash": "c" * 64,
            },
        )
        await session.commit()

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO cases "
                    "(case_id, workspace_id, email_id, classification_state, "
                    "category, model_version, prompt_version, normalization_version, "
                    "rule_version) VALUES (:case_id, :workspace_id, :email_id, "
                    "'CLASSIFIED', 'GENERAL', 'jev-1.13.0', 'classification-v1', "
                    "'normalization-v1', 'rules-1')"
                ),
                {
                    "case_id": uuid.uuid4(),
                    "workspace_id": workspace_id,
                    "email_id": email_id,
                },
            )


async def _seed_append_only_rows(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, uuid.UUID]:
    workspace_id = await _seed_workspace(session_factory)
    expected_shipment_id = uuid.uuid4()
    run_id = uuid.uuid4()
    reconciliation_id = uuid.uuid4()
    assignment_id = uuid.uuid4()
    action_id = uuid.uuid4()
    audit_event_id = uuid.uuid4()

    async with session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO expected_shipments "
                "(expected_shipment_id, workspace_id, source_system, shipment_id, "
                "source_hash, imported_row, identifiers, lifecycle, documents, "
                "booking_reference, required_documents, cutoff_at, "
                "source_owner_id, source_freshness, source_updated_at) "
                "VALUES (:id, :workspace_id, 'SYNTHETIC_FIXTURE', 'SYN-001', "
                ":source_hash, '{}', '{}', 'DRAFT_BL_EXPECTED', '[]', "
                "'SYN-BK-001', '[\"DRAFT_BL\"]', now(), 'ops-owner', "
                "'CURRENT', now())"
            ),
            {
                "id": expected_shipment_id,
                "workspace_id": workspace_id,
                "source_hash": "c" * 64,
            },
        )
        await session.execute(
            text(
                "INSERT INTO reconciliation_runs "
                "(reconciliation_run_id, workspace_id, source_hash, rule_version) "
                "VALUES (:id, :workspace_id, :source_hash, 'test')"
            ),
            {
                "id": run_id,
                "workspace_id": workspace_id,
                "source_hash": "a" * 64,
            },
        )
        await session.execute(
            text(
                "INSERT INTO reconciliation_results "
                "(reconciliation_id, reconciliation_run_id, subject_key, outcome, "
                "shipment_id, case_ids, match_basis, source_freshness) "
                "VALUES (:id, :run_id, :subject_key, 'SOURCE_STALE', 'SYN-001', "
                "'[\"case-1\"]', '[]', 'STALE')"
            ),
            {
                "id": reconciliation_id,
                "run_id": run_id,
                "subject_key": str(reconciliation_id),
            },
        )
        await session.execute(
            text(
                "INSERT INTO review_assignments "
                "(review_assignment_id, workspace_id, target_type, "
                "reconciliation_id, assigned_owner_id, state) "
                "VALUES (:id, :workspace_id, 'RECONCILIATION_EXCEPTION', "
                ":reconciliation_id, 'reviewer', 'OPEN')"
            ),
            {
                "id": assignment_id,
                "workspace_id": workspace_id,
                "reconciliation_id": reconciliation_id,
            },
        )
        await session.execute(
            text(
                "INSERT INTO review_actions "
                "(review_action_id, workspace_id, target_type, reconciliation_id, "
                "actor_id, action, rationale) "
                "VALUES (:id, :workspace_id, 'RECONCILIATION_EXCEPTION', "
                ":reconciliation_id, 'reviewer', 'CONFIRM', 'test')"
            ),
            {
                "id": action_id,
                "workspace_id": workspace_id,
                "reconciliation_id": reconciliation_id,
            },
        )
        await session.execute(
            text(
                "INSERT INTO audit_events "
                "(audit_event_id, workspace_id, actor_kind, entity_type, entity_id, "
                "event_type, source_hashes, rule_version, request_id, payload_hash) "
                "VALUES (:id, :workspace_id, 'guest', 'case', 'case-1', 'created', "
                "'[]', 'test', 'request-1', :payload_hash)"
            ),
            {
                "id": audit_event_id,
                "workspace_id": workspace_id,
                "payload_hash": "b" * 64,
            },
        )
        await session.commit()

    return {
        "expected_shipments": expected_shipment_id,
        "reconciliation_runs": run_id,
        "reconciliation_results": reconciliation_id,
        "review_assignments": assignment_id,
        "review_actions": action_id,
        "audit_events": audit_event_id,
    }


async def _seed_workspace(
    session_factory: async_sessionmaker[AsyncSession],
) -> uuid.UUID:
    guest_session_id = uuid.uuid4()
    workspace_id = uuid.uuid4()

    async with session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO guest_sessions "
                "(guest_session_id, session_key, current_generation) "
                "VALUES (:id, :key, 1)"
            ),
            {"id": guest_session_id, "key": str(guest_session_id)},
        )
        await session.execute(
            text(
                "INSERT INTO workspaces "
                "(workspace_id, guest_session_id, generation) "
                "VALUES (:id, :guest_id, 1)"
            ),
            {"id": workspace_id, "guest_id": guest_session_id},
        )
        await session.commit()

    return workspace_id


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_ingestion_key_can_be_reserved_before_receipt_and_is_unique(
    postgres_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    workspace_id = await _seed_workspace(postgres_session_factory)
    request_id = uuid.uuid4()
    request_hash = "c" * 64

    async with postgres_session_factory() as session:
        state = await session.scalar(
            text(
                "INSERT INTO ingestion_requests "
                "(ingestion_request_id, workspace_id, idempotency_key, request_hash) "
                "VALUES (:id, :workspace_id, 'request-key', :request_hash) "
                "RETURNING state"
            ),
            {
                "id": request_id,
                "workspace_id": workspace_id,
                "request_hash": request_hash,
            },
        )
        await session.commit()

    assert state == "PROCESSING"

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO ingestion_requests "
                    "(ingestion_request_id, workspace_id, idempotency_key, "
                    "request_hash) "
                    "VALUES (:id, :workspace_id, 'request-key', :request_hash)"
                ),
                {
                    "id": uuid.uuid4(),
                    "workspace_id": workspace_id,
                    "request_hash": request_hash,
                },
            )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("table_name", "id_column"),
    [
        ("expected_shipments", "expected_shipment_id"),
        ("reconciliation_runs", "reconciliation_run_id"),
        ("reconciliation_results", "reconciliation_id"),
        ("review_assignments", "review_assignment_id"),
        ("review_actions", "review_action_id"),
        ("audit_events", "audit_event_id"),
    ],
)
@pytest.mark.parametrize("operation", ["UPDATE", "DELETE"])
async def test_append_only_rows_reject_raw_update_and_delete(
    postgres_session_factory: async_sessionmaker[AsyncSession],
    table_name: str,
    id_column: str,
    operation: str,
) -> None:
    row_ids = await _seed_append_only_rows(postgres_session_factory)

    if operation == "UPDATE":
        statement = text(
            f"UPDATE {table_name} SET {id_column} = {id_column} "
            f"WHERE {id_column} = :row_id"
        )
    else:
        statement = text(f"DELETE FROM {table_name} WHERE {id_column} = :row_id")

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(statement, {"row_id": row_ids[table_name]})


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("outcome", "shipment_id", "case_ids", "candidate_shipments", "candidate_cases"),
    [
        ("CASE_PRESENT", None, '["case-1"]', None, None),
        ("DOCUMENT_MISSING", "SYN-001", "[]", None, None),
        ("MISSING_CASE", "SYN-001", '["case-1"]', None, None),
        ("UNMATCHED_CASE", "SYN-001", '["case-1"]', None, None),
        ("DUPLICATE_OR_AMBIGUOUS", None, None, "[]", '["case-1"]'),
        ("SOURCE_STALE", "SYN-001", '["case-1"]', None, None),
    ],
)
async def test_reconciliation_outcome_shapes_reject_invalid_rows(
    postgres_session_factory: async_sessionmaker[AsyncSession],
    outcome: str,
    shipment_id: str | None,
    case_ids: str | None,
    candidate_shipments: str | None,
    candidate_cases: str | None,
) -> None:
    workspace_id = await _seed_workspace(postgres_session_factory)
    run_id = uuid.uuid4()

    async with postgres_session_factory() as session:
        await session.execute(
            text(
                "INSERT INTO reconciliation_runs "
                "(reconciliation_run_id, workspace_id, source_hash, rule_version) "
                "VALUES (:id, :workspace_id, :source_hash, 'test')"
            ),
            {
                "id": run_id,
                "workspace_id": workspace_id,
                "source_hash": "d" * 64,
            },
        )
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO reconciliation_results "
                    "(reconciliation_id, reconciliation_run_id, subject_key, "
                    "outcome, shipment_id, case_ids, candidate_shipment_ids, "
                    "candidate_case_ids, match_basis, source_freshness) "
                    "VALUES (:id, :run_id, 'invalid-shape', :outcome, :shipment_id, "
                    "CAST(:case_ids AS jsonb), CAST(:candidate_shipments AS jsonb), "
                    "CAST(:candidate_cases AS jsonb), '[]', :source_freshness)"
                ),
                {
                    "id": uuid.uuid4(),
                    "run_id": run_id,
                    "outcome": outcome,
                    "shipment_id": shipment_id,
                    "case_ids": case_ids,
                    "candidate_shipments": candidate_shipments,
                    "candidate_cases": candidate_cases,
                    "source_freshness": "CURRENT",
                },
            )
