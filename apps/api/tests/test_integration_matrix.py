"""Dataset edge-case integration matrix.

Runs `ComparisonPipeline.run_case` on receipted bundle emails chosen for
their structural review reasons, their attachment formats, and a
code-point/byte-offset edge case, each with deterministic fake providers.
No network call is ever made and no organiser answer key is read.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.contracts import Category, ComparedField, ReviewReason, Status
from app.extraction import GeminiExtractor
from app.formats import detect_format
from app.gemini import KeyAttempt
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevEquivalence,
    JevRoleDecision,
)
from app.models import FieldVerdictRecord, GuestSession, Workspace
from app.persistence import (
    AttachmentInput,
    AuditContext,
    PersistenceService,
    ReceiptInput,
)
from app.pipeline import ComparisonPipeline
from app.storage import InMemoryPrivateObjectStore

F = ComparedField

BUNDLE_ATTACHMENTS = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "sdoc-hackathon-bundle"
    / "attachments"
)
_MEDIA_TYPES = {
    "txt": "text/plain",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
_BL_READY_PROBABILITIES = {
    "BL_COMPARISON": 0.96,
    "SI_REQUEST": 0.01,
    "INVOICE_QUERY": 0.01,
    "GENERAL": 0.01,
    "SPAM": 0.01,
}


async def _create_workspace(session_factory) -> UUID:
    guest_session_id = uuid4()
    workspace_id = uuid4()
    async with session_factory() as session, session.begin():
        session.add(
            GuestSession(
                guest_session_id=guest_session_id,
                session_key=f"guest-{guest_session_id}",
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
    return workspace_id


def _audit(request_id: str = "matrix-request") -> AuditContext:
    return AuditContext(request_id=request_id, rule_version="rules-1")


async def _build_case(
    service: PersistenceService,
    workspace_id: UUID,
    *,
    idempotency_key: str,
    files: Sequence[str],
    assigned_owner_id: str = "bl-owner",
) -> tuple[UUID, UUID]:
    """Persist the given bundle attachments (any count or format) and
    classify the case BL_READY, like Gate 1 does.

    Generalizes ``comparison_fixtures.build_bl_ready_case``, which always
    persists exactly one fixed SI/BL txt-or-pdf pair: several edge cases
    here need a single attachment (email_507/509) or a DOCX/XLSX pair
    (email_291/005), which that fixed two-argument shape cannot express.
    """
    attachments = []
    for name in files:
        data = (BUNDLE_ATTACHMENTS / name).read_bytes()
        fmt = detect_format(data)
        attachments.append(
            AttachmentInput(
                file_name=name,
                data=data,
                declared_media_type=_MEDIA_TYPES[fmt],
                detected_format=fmt,
            )
        )
    audit = _audit(f"{idempotency_key}-request")
    receipt = ReceiptInput(
        source_message_id=f"{idempotency_key}-message",
        received_at=datetime(2026, 9, 20, 10, tzinfo=UTC),
        sender="ops@example.com",
        subject="Draft BL for review",
        message_bytes=f"raw message bytes for {idempotency_key}".encode(),
        body_text="Please compare the attached documents.",
        attachments=tuple(attachments),
    )
    persisted = await service.persist_receipt(
        workspace_id=workspace_id,
        idempotency_key=idempotency_key,
        receipt=receipt,
        audit=audit,
    )
    case_id = await service.ensure_classification_case(
        workspace_id=workspace_id, email_id=persisted.email_id, audit=audit
    )
    when = datetime(2026, 9, 20, 10, 5, tzinfo=UTC)
    await service.record_classification_success(
        case_id=case_id,
        category=Category.BL_COMPARISON,
        category_probabilities=_BL_READY_PROBABILITIES,
        requested_model=JEV_MODEL,
        returned_model=JEV_MODEL,
        provider_request_id="req",
        correlation_id="corr",
        started_at=when,
        completed_at=when,
        audit=audit,
        assigned_owner_id=assigned_owner_id,
    )
    return persisted.email_id, case_id


def _role_decision(document_id: str, role: DocumentRole) -> JevRoleDecision:
    probabilities = {"SI": 0.05, "DRAFT_BL": 0.05, "OTHER": 0.05}
    probabilities[role.value] = 0.9
    return JevRoleDecision(
        document_id=document_id,
        role=role,
        probabilities=probabilities,
        confidence=0.9,
        returned_model=JEV_MODEL,
        provider_request_id="role-req",
        correlation_id="role-corr",
    )


class _RoleDecider:
    """Maps attachment file names to roles for the fake Jev role decision.

    Defaults by filename convention ("_SI." -> SI, "_BL." -> DRAFT_BL, else
    OTHER); an explicit override is needed for a bundle file whose name
    says BL but whose content is a different document type
    (email_501/502/503), since production decides the role from content,
    never from the filename.
    """

    def __init__(self) -> None:
        self._roles: dict[str, DocumentRole] = {}

    def register(
        self, attachment_id: UUID, file_name: str, *, role: DocumentRole | None = None
    ) -> None:
        if role is None:
            if "_SI." in file_name:
                role = DocumentRole.SI
            elif "_BL." in file_name:
                role = DocumentRole.DRAFT_BL
            else:
                role = DocumentRole.OTHER
        self._roles[str(attachment_id)] = role

    async def decide(self, documents, *, correlation_id=None):
        return [
            _role_decision(document.document_id, self._roles[document.document_id])
            for document in documents
        ]


async def _new_case(
    service: PersistenceService,
    workspace_id: UUID,
    roles: _RoleDecider,
    *,
    idempotency_key: str,
    files: Sequence[str],
    role_overrides: Mapping[str, DocumentRole] | None = None,
) -> tuple[UUID, UUID]:
    """Build a BL_READY case and teach the fake role decider its attachments."""
    email_id, case_id = await _build_case(
        service, workspace_id, idempotency_key=idempotency_key, files=files
    )
    documents = await service.load_case_documents(
        workspace_id=workspace_id, case_id=case_id
    )
    overrides = role_overrides or {}
    for attachment in documents.attachments:
        roles.register(
            attachment.attachment_id,
            attachment.file_name,
            role=overrides.get(attachment.file_name),
        )
    return email_id, case_id


async def _boom_generate(contents, config=None, *, attempts=None):
    raise AssertionError("Gemini must not be called for these fixtures")


def _gemini_stub() -> GeminiExtractor:
    return GeminiExtractor(generate=_boom_generate)


class _FakeEquivalence:
    """Returns a fixed probability per field; a missing field is a bug."""

    def __init__(self, probabilities: dict[ComparedField, float]) -> None:
        self._probabilities = probabilities

    async def judge(self, questions, *, correlation_id=None):
        return [
            JevEquivalence(
                field=question.field,
                probability=self._probabilities[question.field],
                returned_model=JEV_MODEL,
                provider_request_id="equiv-req",
                correlation_id=correlation_id or "equiv-corr",
            )
            for question in questions
        ]


class _UncalledEquivalence:
    async def judge(self, questions, *, correlation_id=None):
        raise AssertionError("Jev equivalence must not be called for this fixture")


def _scan_json() -> str:
    """A schema-valid GeminiDocument JSON where all seven fields match."""
    fields = {
        field.value: {
            "value": (
                "1 x 40'HC"
                if field is F.CONTAINER_COUNT
                else "1,000 KG"
                if field is F.GROSS_WEIGHT_KG
                else f"V {field.value}"
            ),
            "page": 1,
            "region": "party",
        }
        for field in ComparedField
    }
    return json.dumps(
        {
            "document_title": "SHIPPING INSTRUCTION",
            "transcription": "SHIPPING INSTRUCTION",
            "fields": fields,
        }
    )


class _FakeGeminiResponse:
    def __init__(self, text: str) -> None:
        self.text = text
        self.model_version = "gemini-3.5-flash-matrix-test"


async def _matching_scan_generate(contents, config=None, *, attempts=None):
    """Both the SI and BL scan calls answer with the same fields."""
    ok = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
    return _FakeGeminiResponse(_scan_json()), ok


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("email_id", ["email_507", "email_509"])
async def test_single_attachment_email_is_missing_attachment(
    postgres_session_factory, email_id: str
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key=f"{email_id}-missing-attachment",
        files=[f"{email_id}_SI.txt"],
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.status == Status.NEEDS_REVIEW
    assert run.evaluator_output.review_reason == ReviewReason.MISSING_ATTACHMENT


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("email_id", ["email_511", "email_515"])
async def test_corrupt_pdf_attachment_is_unreadable(
    postgres_session_factory, email_id: str
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key=f"{email_id}-unreadable",
        files=[f"{email_id}_SI.txt", f"{email_id}_BL.pdf"],
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.status == Status.NEEDS_REVIEW
    assert run.evaluator_output.review_reason == ReviewReason.UNREADABLE


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("email_id", ["email_501", "email_502", "email_503"])
async def test_bl_named_attachment_with_other_content_is_wrong_doc_type(
    postgres_session_factory, email_id: str
) -> None:
    """The bundle's *_BL.txt file for these three emails is really a
    commercial invoice / packing list / certificate of origin: production
    decides the role from content (Jev), so the fake role decider is told
    the true role explicitly rather than inferring DRAFT_BL from the name."""
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    bl_file = f"{email_id}_BL.txt"
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key=f"{email_id}-wrong-doc-type",
        files=[f"{email_id}_SI.txt", bl_file],
        role_overrides={bl_file: DocumentRole.OTHER},
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.status == Status.NEEDS_REVIEW
    assert run.evaluator_output.review_reason == ReviewReason.WRONG_DOC_TYPE


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_placeholder_value_is_missing_value(postgres_session_factory) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-516-missing-value",
        files=["email_516_SI.txt", "email_516_BL.txt"],
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "NEEDS_REVIEW"
    assert run.evaluator_output.status == Status.NEEDS_REVIEW
    assert run.evaluator_output.review_reason == ReviewReason.MISSING_VALUE


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_scanned_pair_produces_seven_verdicts_with_scanned_pdf_anchors(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-512-scanned-pair",
        files=["email_512_SI.pdf", "email_512_BL.pdf"],
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=GeminiExtractor(generate=_matching_scan_generate),
        equivalence=_UncalledEquivalence(),
        # A distinct extractor version keeps this test's cache write from
        # leaking into other tests sharing the same scanned PDF bytes: the
        # extraction cache is keyed by (content_hash, extractor_version)
        # only, not by workspace.
        gemini_model="gemini-3.5-flash-integration-matrix-scan",
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.OK

    async with postgres_session_factory() as session:
        verdicts = (
            await session.scalars(
                select(FieldVerdictRecord).where(FieldVerdictRecord.case_id == case_id)
            )
        ).all()
    assert len(verdicts) == 7
    assert {verdict.field for verdict in verdicts} == set(ComparedField)
    assert all(verdict.deterministic_result == "MATCH" for verdict in verdicts)
    assert all(
        verdict.si_value["provenance"]["format"] == "scanned_pdf"
        for verdict in verdicts
    )
    assert all(
        verdict.draft_bl_value["provenance"]["format"] == "scanned_pdf"
        for verdict in verdicts
    )
    assert all(
        verdict.si_value["provenance"]["location"]["kind"] == "scanned_pdf"
        for verdict in verdicts
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_docx_and_xlsx_attachments_keep_their_own_format_provenance(
    postgres_session_factory,
) -> None:
    """email_291: SI is XLSX, BL is DOCX. consignee differs (needs Jev),
    container_count differs numerically (deterministic MISMATCH), and
    gross_weight_kg differs only in comma formatting (21745 == 21,745, a
    deterministic MATCH) -- each field verdict must keep its own document's
    format in its provenance, not fall back to a shared or default format."""
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-291-docx-xlsx",
        files=["email_291_SI.xlsx", "email_291_BL.docx"],
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.CONSIGNEE: 0.02}),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.MISMATCH
    assert set(run.evaluator_output.defect_fields) == {F.CONSIGNEE, F.CONTAINER_COUNT}

    async with postgres_session_factory() as session:
        verdicts = {
            verdict.field: verdict
            for verdict in (
                await session.scalars(
                    select(FieldVerdictRecord).where(
                        FieldVerdictRecord.case_id == case_id
                    )
                )
            ).all()
        }
    assert len(verdicts) == 7
    for verdict in verdicts.values():
        assert verdict.si_value["provenance"]["format"] == "xlsx"
        assert verdict.draft_bl_value["provenance"]["format"] == "docx"
    assert verdicts[F.CONTAINER_COUNT].deterministic_result == "MISMATCH"
    assert verdicts[F.GROSS_WEIGHT_KG].deterministic_result == "MATCH"
    assert verdicts[F.CONSIGNEE].semantic_probability == 0.02
    assert verdicts[F.CONSIGNEE].batch_result == "MISMATCH"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_xlsx_pair_matches_with_xlsx_provenance_both_sides(
    postgres_session_factory,
) -> None:
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-005-xlsx-pair",
        files=["email_005_SI.xlsx", "email_005_BL.xlsx"],
    )

    pipeline = ComparisonPipeline(
        service, roles=roles, gemini=_gemini_stub(), equivalence=_UncalledEquivalence()
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    assert run.evaluator_output.status == Status.OK

    async with postgres_session_factory() as session:
        verdicts = (
            await session.scalars(
                select(FieldVerdictRecord).where(FieldVerdictRecord.case_id == case_id)
            )
        ).all()
    assert len(verdicts) == 7
    assert all(verdict.deterministic_result == "MATCH" for verdict in verdicts)
    assert all(
        verdict.si_value["provenance"]["format"] == "xlsx" for verdict in verdicts
    )
    assert all(
        verdict.draft_bl_value["provenance"]["format"] == "xlsx" for verdict in verdicts
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_chinese_label_value_keeps_code_point_offsets(
    postgres_session_factory,
) -> None:
    """email_013's gross_weight_kg label is "Gross Weight毛重(KGS)": the two
    CJK characters are 1 code point each but 3 UTF-8 bytes each. The value's
    start_col/end_col must be counted in Unicode code points (as Python
    string indexing does), not UTF-8 bytes, or the anchor would land 4
    columns too late (2 characters x (3 bytes - 1 character) short-fall)."""
    workspace_id = await _create_workspace(postgres_session_factory)
    service = PersistenceService(postgres_session_factory, InMemoryPrivateObjectStore())
    roles = _RoleDecider()
    _, case_id = await _new_case(
        service,
        workspace_id,
        roles,
        idempotency_key="email-013-chinese-label",
        files=["email_013_SI.txt", "email_013_BL.txt"],
    )

    pipeline = ComparisonPipeline(
        service,
        roles=roles,
        gemini=_gemini_stub(),
        equivalence=_FakeEquivalence({F.PORT_OF_DISCHARGE: 0.02}),
    )
    run = await pipeline.run_case(
        workspace_id=workspace_id, case_id=case_id, audit=_audit()
    )

    assert run.state == "COMPARED"
    si_analysis = next(a for a in run.analyses if a.file_name == "email_013_SI.txt")
    weight = next(
        value
        for value in si_analysis.extraction.values
        if value.field == F.GROSS_WEIGHT_KG
    )
    assert weight.raw_value == "67,311 KG"

    si_text = (BUNDLE_ATTACHMENTS / "email_013_SI.txt").read_bytes().decode("utf-8")
    line_text = next(line for line in si_text.split("\n") if "Gross Weight" in line)
    expected_line = next(
        index
        for index, line in enumerate(si_text.split("\n"), start=1)
        if "Gross Weight" in line
    )
    prefix, _, value_text = line_text.partition(": ")
    assert value_text == "67,311 KG"

    location = weight.provenance.root.location
    assert location.kind == "txt"
    assert location.line == expected_line
    # The code-point length of the label prefix, not its UTF-8 byte length
    # (21 code points here vs. 25 UTF-8 bytes, since 毛 and 重 are each 3
    # bytes but 1 code point).
    assert location.start_col == len(prefix) + len(": ") == 21
    assert location.end_col == location.start_col + len(value_text) == 30
