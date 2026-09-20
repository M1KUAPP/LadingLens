import asyncio
import json
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.contracts import ComparedField, EvaluatorOutput
from app.models import (
    CaseRecord,
    EmailReceipt,
    FieldVerdictRecord,
    GuestSession,
    SubmissionEvaluation,
    SubmissionRun,
    SubmissionRunRecord,
    Workspace,
)
from app.persistence import AuditContext, CaseInput, PersistenceService
from app.storage import InMemoryPrivateObjectStore
from app.submission import (
    EXPECTED_EMAIL_IDS,
    StructuralDiagnostic,
    SubmissionArtifact,
    SubmissionBlocker,
    SubmissionCaseSnapshot,
    build_submission_artifact,
    score_submission_artifact,
)


def _audit() -> AuditContext:
    return AuditContext(request_id="submission-test", rule_version="rules-1")


def _manifest_hash() -> str:
    return sha256("\n".join(EXPECTED_EMAIL_IDS).encode()).hexdigest()


def _snapshots(case_ids: list[UUID]) -> list[SubmissionCaseSnapshot]:
    return [
        SubmissionCaseSnapshot(
            email_id=email_id,
            case_id=case_id,
            category="GENERAL",
        )
        for email_id, case_id in zip(EXPECTED_EMAIL_IDS, case_ids, strict=True)
    ]


@pytest.mark.asyncio
async def test_submission_run_rejects_noncanonical_manifest_before_database_access():
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="exact 520-email manifest"):
        await service.create_submission_run(
            workspace_id=uuid4(),
            input_manifest_hash=_manifest_hash(),
            expected_email_ids=list(EXPECTED_EMAIL_IDS[:-1]),
            rule_version="rules-1",
            audit=_audit(),
        )


@pytest.mark.asyncio
async def test_submission_stage_rejects_tampered_artifact_before_database_access():
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]
    case_ids = [UUID(int=index) for index in range(1, 521)]
    artifact = build_submission_artifact(_snapshots(case_ids))
    tampered = SubmissionArtifact(
        canonical_bytes=b"{}",
        sha256=artifact.sha256,
        record_count=520,
    )

    with pytest.raises(ValueError, match="artifact hash"):
        await service.stage_submission_run(
            workspace_id=uuid4(),
            submission_run_id=uuid4(),
            snapshots=_snapshots(case_ids),
            artifact=tampered,
            version_manifest={"rule_version": "rules-1"},
            audit=_audit(),
        )


@pytest.mark.asyncio
async def test_case_persistence_rejects_structural_reason_that_ignores_precedence():
    service = PersistenceService(object(), InMemoryPrivateObjectStore())  # type: ignore[arg-type]
    case = CaseInput(
        case_id=uuid4(),
        email_id=uuid4(),
        evaluator_output=EvaluatorOutput(
            category="BL_COMPARISON",
            status="NEEDS_REVIEW",
            review_reason="missing_attachment",
            defect_fields=[],
            has_defect=False,
        ),
        field_verdicts=(),
        assigned_owner_id="reviewer",
        model_version="jev-1.13.0",
        prompt_version="comparison-v1",
        normalization_version="normalization-v1",
        rule_version="rules-1",
        structural_diagnostics=(
            StructuralDiagnostic(reason="missing_attachment", detail="missing BL"),
            StructuralDiagnostic(reason="unreadable", detail="corrupt SI"),
        ),
    )

    with pytest.raises(ValueError, match="do not match"):
        await service.persist_case(
            workspace_id=uuid4(),
            case=case,
            audit=_audit(),
        )


def test_persisted_field_snapshot_accepts_semantic_not_applicable_route():
    verdict = FieldVerdictRecord(
        field_verdict_id=uuid4(),
        case_id=uuid4(),
        field=ComparedField.CONSIGNEE,
        si_value={},
        draft_bl_value={},
        deterministic_result="NOT_APPLICABLE",
        semantic_probability=0.84,
        interactive_state="REVIEW",
        batch_result="MISMATCH",
    )

    snapshot = PersistenceService._submission_field_snapshot(verdict)

    assert snapshot.semantic_probability == pytest.approx(0.84)
    assert snapshot.deterministic_result is None


def test_persisted_field_snapshot_rejects_two_final_decision_sources():
    verdict = FieldVerdictRecord(
        field_verdict_id=uuid4(),
        case_id=uuid4(),
        field=ComparedField.CONSIGNEE,
        si_value={},
        draft_bl_value={},
        deterministic_result="MATCH",
        semantic_probability=0.99,
        interactive_state="MATCH",
        batch_result="MATCH",
    )

    with pytest.raises(ValueError, match="unambiguous"):
        PersistenceService._submission_field_snapshot(verdict)


async def _seed_complete_general_cases(
    session_factory,
    *,
    first_case_state: str | None = None,
    include_bl_examples: bool = False,
) -> tuple[UUID, list[UUID]]:
    if first_case_state is not None and include_bl_examples:
        raise ValueError("special unfinished state and BL examples are exclusive")
    guest_session_id = uuid4()
    workspace_id = uuid4()
    case_ids: list[UUID] = []
    async with session_factory() as session, session.begin():
        session.add(
            GuestSession(
                guest_session_id=guest_session_id,
                session_key=f"submission-{guest_session_id}",
                current_generation=1,
            )
        )
        session.add(
            Workspace(
                workspace_id=workspace_id,
                guest_session_id=guest_session_id,
                generation=1,
                is_shared_seed=False,
            )
        )
        await session.flush()
        for index, email_label in enumerate(EXPECTED_EMAIL_IDS, start=1):
            email_id = uuid4()
            case_id = uuid4()
            case_ids.append(case_id)
            special_state = first_case_state if index == 1 else None
            is_classified = special_state is None
            is_bl_ready = special_state == "BL_READY"
            is_structural_bl = include_bl_examples and index == 1
            is_semantic_bl = include_bl_examples and index == 2
            is_classified_bl = is_structural_bl or is_semantic_bl
            is_any_bl = is_bl_ready or is_classified_bl
            evaluator_output = None
            structural_diagnostics: list[dict[str, object]] = []
            if is_structural_bl:
                evaluator_output = {
                    "category": "BL_COMPARISON",
                    "status": "NEEDS_REVIEW",
                    "review_reason": "unreadable",
                    "defect_fields": [],
                    "has_defect": False,
                }
                structural_diagnostics = [
                    diagnostic.model_dump(mode="json")
                    for diagnostic in (
                        StructuralDiagnostic(
                            reason="missing_attachment",
                            detail="draft BL role was not resolved",
                            document_role="DRAFT_BL",
                        ),
                        StructuralDiagnostic(
                            reason="unreadable",
                            detail="SI parser rejected a corrupt object stream",
                            attachment_id="attachment-si-001",
                            document_role="SI",
                            source_hash="9" * 64,
                            parser_route="digital-pdf",
                            parser_version="parser-v1",
                        ),
                    )
                ]
            elif is_semantic_bl:
                evaluator_output = {
                    "category": "BL_COMPARISON",
                    "status": "MISMATCH",
                    "review_reason": None,
                    "defect_fields": ["consignee"],
                    "has_defect": True,
                }
            elif is_classified:
                evaluator_output = {
                    "category": "GENERAL",
                    "status": "OK",
                    "review_reason": None,
                    "defect_fields": [],
                    "has_defect": False,
                }
            session.add(
                EmailReceipt(
                    email_id=email_id,
                    workspace_id=workspace_id,
                    source_message_id=email_label,
                    message_hash=sha256(email_label.encode()).hexdigest(),
                    received_at=datetime(2026, 9, 21, tzinfo=UTC),
                    sender="ops@example.test",
                )
            )
            await session.flush()
            session.add(
                CaseRecord(
                    case_id=case_id,
                    workspace_id=workspace_id,
                    email_id=email_id,
                    classification_state=special_state or "CLASSIFIED",
                    category=(
                        "BL_COMPARISON"
                        if is_any_bl
                        else "GENERAL"
                        if is_classified
                        else None
                    ),
                    category_probabilities=(
                        {
                            "BL_COMPARISON": 1.0 if is_any_bl else 0.0,
                            "SI_REQUEST": 0.0,
                            "INVOICE_QUERY": 0.0,
                            "GENERAL": 0.0 if is_any_bl else 1.0,
                            "SPAM": 0.0,
                        }
                        if is_classified or is_bl_ready
                        else None
                    ),
                    provider_error=(
                        "provider unavailable"
                        if special_state == "PROVIDER_FAILED"
                        else None
                    ),
                    provider_retryable=(
                        True if special_state == "PROVIDER_FAILED" else None
                    ),
                    status=(
                        "NEEDS_REVIEW"
                        if is_structural_bl
                        else "MISMATCH"
                        if is_semantic_bl
                        else "OK"
                        if is_classified
                        else None
                    ),
                    review_reason="unreadable" if is_structural_bl else None,
                    assigned_owner_id="reviewer" if is_any_bl else None,
                    evaluator_output=evaluator_output,
                    model_version="jev-1.13.0",
                    prompt_version="classification-v1",
                    normalization_version="normalization-v1",
                    rule_version="rules-1",
                    structural_diagnostics=structural_diagnostics,
                )
            )
            if is_semantic_bl:
                for field in ComparedField:
                    is_semantic_field = field is ComparedField.CONSIGNEE
                    session.add(
                        FieldVerdictRecord(
                            field_verdict_id=uuid4(),
                            case_id=case_id,
                            field=field,
                            si_value={
                                "raw_value": f"SI {field.value}",
                                "provenance": {"attachment_id": "si-002"},
                            },
                            draft_bl_value={
                                "raw_value": f"BL {field.value}",
                                "provenance": {"attachment_id": "bl-002"},
                            },
                            deterministic_result=(
                                "NOT_APPLICABLE" if is_semantic_field else "MATCH"
                            ),
                            semantic_probability=0.84 if is_semantic_field else None,
                            interactive_state=(
                                "REVIEW" if is_semantic_field else "MATCH"
                            ),
                            batch_result=("MISMATCH" if is_semantic_field else "MATCH"),
                            reason=(
                                "semantic ambiguity" if is_semantic_field else None
                            ),
                        )
                    )
    return workspace_id, case_ids


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_submission_publication_is_atomic_resumable_and_idempotent(
    postgres_session_factory,
) -> None:
    workspace_id, case_ids = await _seed_complete_general_cases(
        postgres_session_factory
    )
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)
    run = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        serializer_version="submission-v1",
        version_manifest={"jev_model": "jev-1.13.0", "ai_model": "gemini-3.5-flash"},
        audit=_audit(),
    )
    blocker = SubmissionBlocker(
        code="PROVIDER_FAILURE",
        email_id="email_001",
        message="provider attempt is incomplete",
    )
    await service.mark_submission_run_blocked(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        blockers=(blocker,),
        audit=_audit(),
    )

    snapshots = _snapshots(case_ids)
    artifact = build_submission_artifact(snapshots)
    staged = await service.stage_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        snapshots=snapshots,
        artifact=artifact,
        version_manifest={"jev_model": "jev-1.13.0", "ai_model": "gemini-3.5-flash"},
        audit=_audit(),
    )
    stale_blocker_state = await service.mark_submission_run_blocked(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        blockers=(blocker,),
        audit=_audit(),
    )
    published, concurrent_replay = await asyncio.gather(
        service.publish_submission_run(
            workspace_id=workspace_id,
            submission_run_id=run.submission_run_id,
            audit=_audit(),
        ),
        service.publish_submission_run(
            workspace_id=workspace_id,
            submission_run_id=run.submission_run_id,
            audit=_audit(),
        ),
    )
    replay = await service.publish_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        audit=_audit(),
    )

    assert staged.validation_count == 520
    assert stale_blocker_state == "STAGED"
    assert published.artifact_hash == artifact.sha256
    assert concurrent_replay == published
    assert replay == published
    assert (
        await store.read_private(published.private_artifact_key)
        == artifact.canonical_bytes
    )
    async with postgres_session_factory() as session:
        persisted_run = await session.get(SubmissionRun, run.submission_run_id)
        record_count = await session.scalar(
            select(func.count())
            .select_from(SubmissionRunRecord)
            .where(SubmissionRunRecord.submission_run_id == run.submission_run_id)
        )
    assert persisted_run is not None
    assert persisted_run.publication_state == "PUBLISHED"
    assert persisted_run.blockers == []
    assert record_count == 520

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "UPDATE submission_runs SET validation_count = 519 "
                    "WHERE submission_run_id = :run_id"
                ),
                {"run_id": run.submission_run_id},
            )

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO submission_run_records "
                    "(submission_run_record_id, submission_run_id, email_id, "
                    "case_id, evaluator_output, record_hash, source_state_hash, "
                    "diagnostics, version_manifest) VALUES "
                    "(:id, :run_id, 'email_999', :case_id, CAST(:output AS jsonb), "
                    ":record_hash, :source_hash, '[]', '{}')"
                ),
                {
                    "id": uuid4(),
                    "run_id": run.submission_run_id,
                    "case_id": case_ids[0],
                    "output": (
                        '{"category":"GENERAL","status":"OK",'
                        '"review_reason":null,"defect_fields":[],'
                        '"has_defect":false}'
                    ),
                    "record_hash": "a" * 64,
                    "source_hash": "b" * 64,
                },
            )

    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO submission_evaluations "
                    "(submission_evaluation_id, submission_run_id, artifact_hash, "
                    "outcome, safe_failure, started_at, completed_at) VALUES "
                    "(:id, :run_id, :artifact_hash, 'UNAVAILABLE', "
                    "'test mismatch', now(), now())"
                ),
                {
                    "id": uuid4(),
                    "run_id": run.submission_run_id,
                    "artifact_hash": "c" * 64,
                },
            )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("first_case_state", "expected_code"),
    [
        ("PENDING", "MISSING_CATEGORY"),
        ("PROVIDER_FAILED", "PROVIDER_FAILURE"),
        ("BL_READY", "INCOMPLETE_COMPARISON"),
    ],
)
async def test_pipeline_blocks_all_publication_while_upstream_case_is_unfinished(
    postgres_session_factory,
    first_case_state: str,
    expected_code: str,
) -> None:
    workspace_id, _ = await _seed_complete_general_cases(
        postgres_session_factory, first_case_state=first_case_state
    )
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)

    result = await service.execute_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        rule_version="rules-1",
        serializer_version="submission-v1",
        version_manifest={
            "jev_model": "jev-1.13.0",
            "ai_model": "gemini-3.5-flash",
        },
        scoring_endpoint=None,
        audit=_audit(),
    )

    assert result.publication_state == "BLOCKED"
    assert any(
        blocker.email_id == "email_001" and blocker.code.value == expected_code
        for blocker in result.blockers
    )
    assert result.artifact_hash is None
    assert store.objects == {}
    async with postgres_session_factory() as session:
        run = await session.get(SubmissionRun, result.submission_run_id)
        record_count = await session.scalar(
            select(func.count())
            .select_from(SubmissionRunRecord)
            .where(SubmissionRunRecord.submission_run_id == result.submission_run_id)
        )
    assert run is not None
    assert run.publication_state == "BLOCKED"
    assert run.validation_count == 0
    assert record_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_database_stage_covers_structural_and_semantic_bl_cases(
    postgres_session_factory,
) -> None:
    workspace_id, _ = await _seed_complete_general_cases(
        postgres_session_factory,
        include_bl_examples=True,
    )
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)
    version_manifest = {
        "jev_model": "jev-1.13.0",
        "ai_model": "gemini-3.5-flash",
    }
    run = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        version_manifest=version_manifest,
        audit=_audit(),
    )

    snapshots = await service.collect_submission_case_snapshots(
        workspace_id=workspace_id
    )
    artifact = build_submission_artifact(snapshots)
    payload = json.loads(artifact.canonical_bytes)
    await service.stage_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        snapshots=snapshots,
        artifact=artifact,
        version_manifest=version_manifest,
        audit=_audit(),
    )
    published = await service.publish_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        audit=_audit(),
    )

    assert payload["email_001"] == {
        "category": "BL_COMPARISON",
        "status": "NEEDS_REVIEW",
        "review_reason": "unreadable",
        "defect_fields": [],
        "has_defect": False,
    }
    assert payload["email_002"] == {
        "category": "BL_COMPARISON",
        "status": "MISMATCH",
        "review_reason": None,
        "defect_fields": ["consignee"],
        "has_defect": True,
    }
    assert published.artifact_hash == artifact.sha256
    async with postgres_session_factory() as session:
        records = list(
            await session.scalars(
                select(SubmissionRunRecord)
                .where(
                    SubmissionRunRecord.submission_run_id == run.submission_run_id,
                    SubmissionRunRecord.email_id.in_(["email_001", "email_002"]),
                )
                .order_by(SubmissionRunRecord.email_id)
            )
        )
    assert len(records[0].diagnostics) == 2
    assert len(records[1].source_state_hash) == 64
    assert records[0].source_state_hash != records[1].source_state_hash


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_publication_recovers_after_object_upload_crash(
    postgres_session_factory,
) -> None:
    class FailOnceAfterUploadStore(InMemoryPrivateObjectStore):
        def __init__(self) -> None:
            super().__init__()
            self.failed = False

        async def put_artifact_if_absent(self, content_hash: str, data: bytes) -> str:
            key = await super().put_artifact_if_absent(content_hash, data)
            if not self.failed:
                self.failed = True
                raise RuntimeError("simulated crash after private upload")
            return key

    workspace_id, case_ids = await _seed_complete_general_cases(
        postgres_session_factory
    )
    store = FailOnceAfterUploadStore()
    service = PersistenceService(postgres_session_factory, store)
    version_manifest = {"rule_version": "rules-1"}
    run = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        version_manifest=version_manifest,
        audit=_audit(),
    )
    snapshots = _snapshots(case_ids)
    artifact = build_submission_artifact(snapshots)
    await service.stage_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        snapshots=snapshots,
        artifact=artifact,
        version_manifest=version_manifest,
        audit=_audit(),
    )

    with pytest.raises(RuntimeError, match="simulated crash"):
        await service.publish_submission_run(
            workspace_id=workspace_id,
            submission_run_id=run.submission_run_id,
            audit=_audit(),
        )
    async with postgres_session_factory() as session:
        staged_run = await session.get(SubmissionRun, run.submission_run_id)
    assert staged_run is not None
    assert staged_run.publication_state == "STAGED"
    assert len(store.objects) == 1

    published = await service.publish_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        audit=_audit(),
    )

    assert published.artifact_hash == artifact.sha256
    assert (
        await store.read_private(published.private_artifact_key)
        == artifact.canonical_bytes
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_late_stage_failure_rolls_back_every_snapshot_row(
    postgres_session_factory,
) -> None:
    workspace_id, _ = await _seed_complete_general_cases(postgres_session_factory)

    async def fail_stage_audit(session, event) -> None:
        if event.event_type == "SUBMISSION_RUN_STAGED":
            raise RuntimeError("forced late failure")
        session.add(event)

    service = PersistenceService(
        postgres_session_factory,
        InMemoryPrivateObjectStore(),
        audit_writer=fail_stage_audit,
    )
    result = await service.execute_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        rule_version="rules-1",
        serializer_version="submission-v1",
        version_manifest={
            "jev_model": "jev-1.13.0",
            "ai_model": "gemini-3.5-flash",
        },
        scoring_endpoint=None,
        audit=_audit(),
    )

    async with postgres_session_factory() as session:
        persisted_run = await session.get(SubmissionRun, result.submission_run_id)
        record_count = await session.scalar(
            select(func.count())
            .select_from(SubmissionRunRecord)
            .where(SubmissionRunRecord.submission_run_id == result.submission_run_id)
        )
    assert result.publication_state == "BLOCKED"
    assert result.blockers[0].code.value == "SCHEMA_FAILURE"
    assert result.blockers[0].message.endswith("RuntimeError")
    assert persisted_run is not None
    assert persisted_run.publication_state == "BLOCKED"
    assert persisted_run.blockers == [result.blockers[0].model_dump(mode="json")]
    assert record_count == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_unavailable_scorer_is_retained_as_append_only_evidence(
    postgres_session_factory,
) -> None:
    workspace_id, case_ids = await _seed_complete_general_cases(
        postgres_session_factory
    )
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    run = await service.create_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=_manifest_hash(),
        expected_email_ids=list(EXPECTED_EMAIL_IDS),
        rule_version="rules-1",
        version_manifest={"rule_version": "rules-1"},
        audit=_audit(),
    )
    snapshots = _snapshots(case_ids)
    artifact = build_submission_artifact(snapshots)
    await service.stage_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        snapshots=snapshots,
        artifact=artifact,
        version_manifest={"rule_version": "rules-1"},
        audit=_audit(),
    )
    await service.publish_submission_run(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        audit=_audit(),
    )
    async with postgres_session_factory() as session:
        with pytest.raises(DBAPIError):
            await session.execute(
                text(
                    "INSERT INTO submission_evaluations "
                    "(submission_evaluation_id, submission_run_id, artifact_hash, "
                    "endpoint, outcome, started_at, completed_at) VALUES "
                    "(:id, :run_id, :artifact_hash, 'https://scorer.test/submit', "
                    "'SUCCEEDED', now(), now())"
                ),
                {
                    "id": uuid4(),
                    "run_id": run.submission_run_id,
                    "artifact_hash": artifact.sha256,
                },
            )
    started_at = datetime.now(UTC)
    result = await score_submission_artifact(artifact, endpoint=None)
    evaluation_id = await service.append_submission_evaluation(
        workspace_id=workspace_id,
        submission_run_id=run.submission_run_id,
        result=result,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        audit=_audit(),
    )

    async with postgres_session_factory() as session:
        evaluation = await session.get(SubmissionEvaluation, evaluation_id)
        persisted_run = await session.get(SubmissionRun, run.submission_run_id)
    assert evaluation is not None
    assert evaluation.outcome == "UNAVAILABLE"
    assert evaluation.safe_failure == "organizer scoring endpoint is not configured"
    assert persisted_run is not None
    assert persisted_run.publication_state == "PUBLISHED"

    for operation in (
        "UPDATE submission_evaluations SET outcome = outcome ",
        "DELETE FROM submission_evaluations ",
    ):
        async with postgres_session_factory() as session:
            with pytest.raises(DBAPIError):
                await session.execute(
                    text(operation + "WHERE submission_evaluation_id = :evaluation_id"),
                    {"evaluation_id": evaluation_id},
                )
