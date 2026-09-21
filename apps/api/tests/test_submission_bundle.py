"""A mocked-provider run over the full 520-email bundle publishes a valid
submission artifact.

Every provider here is a deterministic fake backed only by the committed
seed decisions (``app/seed/decisions-v1.json`` via ``app.seed_catalog``): no
network call is made and no organiser answer key is read. This exercises
the real `InboxIngestionService`, `ComparisonPipeline`, and
`execute_submission_run` against PostgreSQL end to end.
"""

from __future__ import annotations

import importlib.util
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

import pytest

from app.contracts import Category
from app.extraction import ExtractionFailure, ExtractionFailureCode, GeminiOutcome
from app.ingestion import InboxIngestionService
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevClassification,
    JevEquivalence,
    JevRoleDecision,
)
from app.models import GuestSession, Workspace
from app.persistence import AuditContext, PersistenceService
from app.pipeline import ComparisonPipeline
from app.seed_catalog import DECISIONS_PATH, SeedDecisions
from app.storage import InMemoryPrivateObjectStore
from app.submission import (
    EXPECTED_EMAIL_IDS,
    SubmissionArtifact,
    validate_submission_artifact,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_ROOT = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
BL_OWNER = "bl-owner"
_SUBMISSION_FIELD_KEYS = {
    "category",
    "status",
    "review_reason",
    "defect_fields",
    "has_defect",
}


def _load_bundle_inbox():
    """The bundle's own loader.py, exactly as the organiser bundle ships it."""
    loader_path = BUNDLE_ROOT / "loader.py"
    spec = importlib.util.spec_from_file_location(
        "bundle_submission_loader", loader_path
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Inbox(str(BUNDLE_ROOT))


def _seed_decisions() -> SeedDecisions:
    return SeedDecisions.model_validate_json(DECISIONS_PATH.read_bytes())


def _audit(request_id: str) -> AuditContext:
    return AuditContext(request_id=request_id, rule_version="rules-1")


class _SeedClassifier:
    """Gate 1 category decisions read only from the seed decisions file."""

    def __init__(self, categories: dict[str, Category]) -> None:
        self._categories = categories

    async def classify(self, emails, *, correlation_id=None):
        results = []
        for email in emails:
            category = self._categories[email.email_id]
            results.append(
                JevClassification(
                    email_id=email.email_id,
                    category=category,
                    probabilities={
                        item.value: 1.0 if item is category else 0.0
                        for item in Category
                    },
                    confidence=1.0,
                    returned_model=JEV_MODEL,
                    provider_request_id="seed-category",
                    correlation_id=correlation_id,
                )
            )
        return results


class _SeedRoles:
    """Document-role decisions read only from the seed decisions' content-hash map."""

    def __init__(self, roles: dict[str, DocumentRole], hashes: dict[str, str]) -> None:
        self._roles = roles
        self._hashes = hashes

    async def decide(self, documents, *, correlation_id=None):
        decisions = []
        for document in documents:
            role = self._roles[self._hashes[document.document_id]]
            decisions.append(
                JevRoleDecision(
                    document_id=document.document_id,
                    role=role,
                    probabilities={
                        item.value: 1.0 if item is role else 0.0
                        for item in DocumentRole
                    },
                    confidence=1.0,
                    returned_model=JEV_MODEL,
                    provider_request_id="seed-role",
                    correlation_id=correlation_id or "seed-role-corr",
                )
            )
        return decisions


class _SeedGemini:
    """Scanned-PDF transcriptions read only from the seed decisions' scans map."""

    def __init__(self, scans) -> None:
        self._scans = scans

    async def read_scan(self, data: bytes) -> GeminiOutcome:
        document = self._scans.get(sha256(data).hexdigest())
        if document is None:
            raise ExtractionFailure(
                ExtractionFailureCode.UNCONFIGURED,
                retryable=False,
                message="the seed decisions have no transcription for this scan",
            )
        return GeminiOutcome(document=document, key_attempts=())

    async def read_text(self, text: str, *, source_format: str) -> GeminiOutcome:
        raise ExtractionFailure(
            ExtractionFailureCode.UNCONFIGURED,
            retryable=False,
            message="the seed decisions do not read ambiguous documents",
        )


class _SeedEquivalence:
    """No Jev equivalence answer was ever recorded in the seed decisions file
    (``decisions.equivalence`` is empty): its own notes document that a
    textual difference surviving normalization is a prepared MISMATCH, never
    a Jev judgement. A probability under the MISMATCH threshold reproduces
    that exact policy for the real pipeline's equivalence call."""

    async def judge(self, questions, *, correlation_id=None):
        return [
            JevEquivalence(
                field=question.field,
                probability=0.0,
                returned_model=JEV_MODEL,
                provider_request_id="seed-equivalence",
                correlation_id=correlation_id or "seed-equivalence-corr",
            )
            for question in questions
        ]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_mocked_bundle_run_publishes_a_valid_submission_artifact(
    postgres_session_factory,
) -> None:
    decisions = _seed_decisions()
    guest_session_id = uuid4()
    workspace_id = uuid4()
    async with postgres_session_factory() as session, session.begin():
        session.add(
            GuestSession(
                guest_session_id=guest_session_id,
                session_key=f"bundle-{guest_session_id}",
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
    store = InMemoryPrivateObjectStore()
    service = PersistenceService(postgres_session_factory, store)

    ingestion = InboxIngestionService(
        service, _SeedClassifier(decisions.categories), bl_owner_id=BL_OWNER
    )
    summary = await ingestion.ingest(
        workspace_id=workspace_id,
        source=_load_bundle_inbox(),
        received_at=datetime(2026, 9, 20, tzinfo=UTC),
        audit=_audit("bundle-ingest"),
    )
    assert summary.total_emails == 520
    assert summary.classified == 520
    assert summary.failed == 0

    bl_ready_case_ids = await service.list_cases_awaiting_comparison(
        workspace_id=workspace_id
    )
    hashes: dict[str, str] = {}
    for case_id in bl_ready_case_ids:
        documents = await service.load_case_documents(
            workspace_id=workspace_id, case_id=case_id
        )
        for attachment in documents.attachments:
            hashes[str(attachment.attachment_id)] = attachment.content_hash

    pipeline = ComparisonPipeline(
        service,
        roles=_SeedRoles(decisions.roles, hashes),
        gemini=_SeedGemini(decisions.scans),
        equivalence=_SeedEquivalence(),
    )
    runs = await pipeline.run_pending(
        workspace_id=workspace_id, audit=_audit("bundle-compare")
    )
    assert len(runs) == len(bl_ready_case_ids)
    assert all(run.state in {"COMPARED", "NEEDS_REVIEW"} for run in runs)
    assert await service.list_cases_awaiting_comparison(workspace_id=workspace_id) == ()

    result = await service.execute_submission_run(
        workspace_id=workspace_id,
        input_manifest_hash=sha256("\n".join(EXPECTED_EMAIL_IDS).encode()).hexdigest(),
        rule_version="rules-1",
        serializer_version="submission-v1",
        version_manifest={"jev_model": JEV_MODEL, "ai_model": "gemini-3.5-flash"},
        scoring_endpoint=None,
        audit=_audit("bundle-submit"),
    )

    assert result.publication_state == "PUBLISHED"
    assert result.artifact_hash is not None
    assert result.private_artifact_key is not None

    artifact_bytes = await store.read_private(result.private_artifact_key)
    assert sha256(artifact_bytes).hexdigest() == result.artifact_hash

    validated = validate_submission_artifact(
        SubmissionArtifact(
            canonical_bytes=artifact_bytes,
            sha256=result.artifact_hash,
            record_count=520,
        )
    )
    assert list(validated) == list(EXPECTED_EMAIL_IDS)
    assert len(validated) == 520
    assert all(len(record) == 5 for record in validated.values())
    assert all(set(record) == _SUBMISSION_FIELD_KEYS for record in validated.values())
