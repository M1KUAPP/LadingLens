"""The deterministic seed baseline: the real pipeline over the synthetic bundle.

The organiser bundle runs once per process through the same preflight,
parsers, pair admission, comparison, reconciliation, and submission
serializer as a live case. A versioned decisions file stands in for the
providers, so every seed record carries its decision source (``prepared`` or
``recorded``) and is never presented as live model output.
"""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from pathlib import Path
from types import MappingProxyType
from typing import Annotated, Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from app.api.errors import ApiProblem
from app.comparison import (
    FieldDraft,
    admit_pair,
    compare_fields,
    comparison_output,
    equivalence_questions,
    needs_interactive_review,
    resolve_verdicts,
    structural_output,
)
from app.config import Settings
from app.contracts import (
    Category,
    ComparedField,
    EvaluatorOutput,
    FieldVerdict,
    ReconciliationResult,
    Status,
)
from app.extraction import (
    AttachmentInput,
    DocumentAnalysis,
    DocumentAnalyzer,
    ExtractionFailure,
    ExtractionFailureCode,
    GeminiDocument,
    GeminiOutcome,
)
from app.formats import parse_document
from app.ingestion import read_bundle
from app.jev import DocumentRole, JevEquivalence, JevRoleDecision, RoleDocument
from app.reconciliation import (
    CaseSnapshot,
    DocumentKind,
    ExpectedShipment,
    load_expected_shipments_csv,
    materialize_reconciliation_results,
    reconcile_shipments,
)
from app.submission import (
    StructuralDiagnostic,
    SubmissionCaseSnapshot,
    SubmissionFieldSnapshot,
    build_submission_artifact,
)

SEED_VERSION = "seed-v1"
DECISIONS_PATH = Path(__file__).resolve().parent / "seed" / "decisions-v1.json"
SEED_RECEIVED_AT = datetime(2026, 9, 20, tzinfo=UTC)
SEED_RECONCILED_AT = datetime(2026, 9, 21, tzinfo=UTC)
SEED_DECISIONS_MODEL = "seed-decisions"
PREPARED_BASELINE_REASON = (
    "Prepared baseline: the texts differ after normalization and were not judged by Jev"
)
FALLBACK_EMAIL_ID = "email_004"
EXPECTED_SHIPMENTS_CSV = Path("fixtures") / "SYNTHETIC_expected_shipments.csv"
RECONCILIATION_RUN_ID = uuid5(
    NAMESPACE_URL, f"ladinglens:{SEED_VERSION}:reconciliation"
)

# An SI prints its booking reference and order (OC) number as a label and a
# value; XLSX joins cells as " | B14: " with a coordinate, DOCX joins cells
# with a bare " | " and no coordinate (see app/formats.py).
_LABEL_VALUE = (
    r"\b\.?:?[ \t]*(?:\|[ \t]*(?:[A-Z]{1,3}\d+:[ \t]*)?)?([A-Za-z0-9][^\s|]*)"
)
_IDENTIFIERS = (
    (
        "booking_reference",
        re.compile(r"\bBooking (?:Reference|Ref|No)" + _LABEL_VALUE, re.IGNORECASE),
    ),
    ("order_number", re.compile(r"\bOC No" + _LABEL_VALUE, re.IGNORECASE)),
)

DecisionSource = Literal["prepared", "recorded"]
Disposition = Literal["IN_REVIEW", "AUTO_COMPLETED"]
Probability = Annotated[float, Field(ge=0.0, le=1.0)]


class SeedDecisions(BaseModel):
    """Answers that stand in for the providers when the seed is built.

    ``categories`` and ``equivalence`` are keyed by email id; ``roles`` and
    ``scans`` by the SHA-256 of the attachment bytes.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    seed_version: str
    decision_source: DecisionSource
    recorded_at: AwareDatetime
    categories: dict[str, Category]
    roles: dict[str, DocumentRole]
    equivalence: dict[str, dict[ComparedField, Probability]]
    scans: dict[str, GeminiDocument]
    notes: list[str]


@dataclass(frozen=True, slots=True)
class SeedAttachment:
    attachment_id: str
    email_id: str
    ordinal: int
    file_name: str
    bundle_path: str
    content_hash: str
    detected_format: str
    byte_size: int


@dataclass(frozen=True, slots=True)
class SeedCase:
    case_id: str
    email_id: str
    category: Category
    evaluator_output: EvaluatorOutput
    field_verdicts: tuple[FieldVerdict, ...]
    structural_diagnostics: tuple[StructuralDiagnostic, ...]
    analyses_roles: Mapping[str, str | None]
    assigned_owner_id: str | None
    disposition: Disposition
    decision_source: DecisionSource


@dataclass(frozen=True, slots=True)
class SeedEmail:
    email_id: str
    sender: str
    subject: str | None
    body_text: str
    received_at: datetime
    message_hash: str
    attachments: tuple[SeedAttachment, ...]
    case: SeedCase


@dataclass(frozen=True, slots=True)
class SeedReconciliation:
    run_id: UUID
    reconciled_at: datetime
    shipments: tuple[ExpectedShipment, ...]
    results: tuple[ReconciliationResult, ...]


@dataclass(frozen=True, slots=True)
class SeedCatalog:
    emails: Mapping[str, SeedEmail]
    attachments: Mapping[str, SeedAttachment]
    reconciliation: SeedReconciliation
    submission_json: bytes
    fallback_email_id: str
    decision_source: DecisionSource
    _attachment_data: Mapping[str, bytes] = field(repr=False)

    @classmethod
    async def build(
        cls, bundle_dir: Path, decisions: SeedDecisions, *, demo_owner_id: str
    ) -> SeedCatalog:
        if decisions.seed_version != SEED_VERSION:
            raise ValueError(
                f"the seed decisions are {decisions.seed_version!r}, "
                f"catalog expects {SEED_VERSION!r}"
            )
        source = _BundleDirectory(bundle_dir)
        received = read_bundle(source, received_at=SEED_RECEIVED_AT)
        uncategorized = [
            email.email_id
            for email in received
            if email.email_id not in decisions.categories
        ]
        if uncategorized:
            raise ValueError(
                "the seed decisions have no category for " + ", ".join(uncategorized)
            )

        paths = {record["email_id"]: record["attachments"] for record in source.records}
        attachments: dict[str, SeedAttachment] = {}
        data: dict[str, bytes] = {}
        for email in received:
            for receipt in email.attachments:
                attachment_id = f"{email.email_id}-{receipt.ordinal}"
                attachments[attachment_id] = SeedAttachment(
                    attachment_id=attachment_id,
                    email_id=email.email_id,
                    ordinal=receipt.ordinal,
                    file_name=receipt.filename,
                    bundle_path=paths[email.email_id][receipt.ordinal - 1],
                    content_hash=receipt.content_hash,
                    detected_format=receipt.detected_format,
                    byte_size=receipt.byte_size,
                )
                data[attachment_id] = receipt.data

        analyzer = DocumentAnalyzer(
            roles=_DecidedRoles(
                decisions.roles,
                {key: item.content_hash for key, item in attachments.items()},
            ),
            gemini=_DecidedScans(decisions.scans),
        )
        emails: dict[str, SeedEmail] = {}
        snapshots: list[CaseSnapshot] = []
        for email in received:
            case_id = f"seed-case:{email.email_id}"
            category = decisions.categories[email.email_id]
            items = tuple(
                attachments[f"{email.email_id}-{receipt.ordinal}"]
                for receipt in email.attachments
            )
            if category is Category.BL_COMPARISON:
                analyses = await analyzer.analyze(
                    [
                        AttachmentInput(
                            attachment_id=item.attachment_id,
                            file_name=item.file_name,
                            data=data[item.attachment_id],
                        )
                        for item in items
                    ],
                    correlation_id=case_id,
                )
                case = _comparison_case(
                    case_id, email.email_id, analyses, decisions, demo_owner_id
                )
                snapshots.append(_case_snapshot(case_id, analyses, data, decisions))
            else:
                case = _classified_case(
                    case_id, email.email_id, category, items, decisions
                )
            emails[email.email_id] = SeedEmail(
                email_id=email.email_id,
                sender=email.sender,
                subject=email.subject,
                body_text=email.body_text,
                received_at=email.received_at,
                message_hash=email.message_hash,
                attachments=items,
                case=case,
            )

        fallback = emails.get(FALLBACK_EMAIL_ID)
        if fallback is None or fallback.case.category is not Category.BL_COMPARISON:
            raise ValueError(
                f"the prepared judge example {FALLBACK_EMAIL_ID} must be a "
                "BL_COMPARISON email"
            )
        return cls(
            emails=MappingProxyType(emails),
            attachments=MappingProxyType(attachments),
            reconciliation=_reconcile(bundle_dir, tuple(snapshots)),
            submission_json=_submission_json(emails.values()),
            fallback_email_id=FALLBACK_EMAIL_ID,
            decision_source=decisions.decision_source,
            _attachment_data=MappingProxyType(data),
        )

    def read_attachment(self, attachment_id: str) -> bytes:
        """The bundle bytes of one seed attachment; KeyError when unknown."""
        return self._attachment_data[attachment_id]


class _BundleDirectory:
    """The organiser bundle on disk, read in email-id order."""

    def __init__(self, root: Path) -> None:
        # read_bundle refuses symlinks and attachment paths escaping `source`.
        self.source = str(root)
        self.records = [
            json.loads(path.read_text(encoding="utf-8"))
            for path in sorted((root / "inbox").glob("email_*.json"))
        ]

    def emails(self) -> list[dict[str, object]]:
        return self.records

    def read_bytes(self, path: str) -> bytes:
        return (Path(self.source) / path).read_bytes()


class _DecidedRoles:
    """Document roles read from the decisions, never presented as Jev output."""

    def __init__(
        self, roles: Mapping[str, DocumentRole], hashes: Mapping[str, str]
    ) -> None:
        self._roles = roles
        self._hashes = hashes

    async def decide(
        self, documents: Sequence[RoleDocument], *, correlation_id: str | None = None
    ) -> list[JevRoleDecision]:
        decisions: list[JevRoleDecision] = []
        for document in documents:
            role = self._roles.get(self._hashes[document.document_id])
            if role is None:
                raise ValueError(
                    f"the seed decisions have no document role for "
                    f"{document.document_id}"
                )
            decisions.append(
                JevRoleDecision(
                    document_id=document.document_id,
                    role=role,
                    # A prepared answer, not a model's probability distribution.
                    probabilities={
                        item.value: 1.0 if item is role else 0.0
                        for item in DocumentRole
                    },
                    confidence=1.0,
                    returned_model=SEED_DECISIONS_MODEL,
                    provider_request_id="prepared",
                    correlation_id=correlation_id,
                )
            )
        return decisions


class _DecidedScans:
    """Stands in for Gemini with the decisions' scan transcriptions only."""

    def __init__(self, scans: Mapping[str, GeminiDocument]) -> None:
        self._scans = scans

    async def read_scan(self, data: bytes) -> GeminiOutcome:
        document = self._scans.get(sha256(data).hexdigest())
        if document is None:
            raise ExtractionFailure(
                ExtractionFailureCode.UNCONFIGURED,
                retryable=False,
                message="The seed decisions have no transcription for this scan",
            )
        return GeminiOutcome(document=document, key_attempts=())

    async def read_text(self, text: str, *, source_format: str) -> GeminiOutcome:
        raise ExtractionFailure(
            ExtractionFailureCode.UNCONFIGURED,
            retryable=False,
            message="The seed decisions do not read ambiguous documents",
        )


def _comparison_case(
    case_id: str,
    email_id: str,
    analyses: Sequence[DocumentAnalysis],
    decisions: SeedDecisions,
    owner_id: str,
) -> SeedCase:
    uncovered = [item.attachment_id for item in analyses if item.failure is not None]
    if uncovered:
        raise ValueError("the seed decisions do not cover " + ", ".join(uncovered))
    admission = admit_pair(analyses)
    verdicts: tuple[FieldVerdict, ...] = ()
    if admission.diagnostics:
        output = structural_output(admission.diagnostics)
    else:
        verdicts = _verdicts(email_id, case_id, compare_fields(admission), decisions)
        output = comparison_output(verdicts)
    in_review = output.status is Status.NEEDS_REVIEW or needs_interactive_review(
        verdicts
    )
    return SeedCase(
        case_id=case_id,
        email_id=email_id,
        category=Category.BL_COMPARISON,
        evaluator_output=output,
        field_verdicts=verdicts,
        structural_diagnostics=admission.diagnostics,
        analyses_roles=MappingProxyType(
            {
                item.attachment_id: item.role.role.value if item.role else None
                for item in analyses
            }
        ),
        assigned_owner_id=owner_id,
        disposition="IN_REVIEW" if in_review else "AUTO_COMPLETED",
        decision_source=decisions.decision_source,
    )


def _verdicts(
    email_id: str,
    case_id: str,
    drafts: Sequence[FieldDraft],
    decisions: SeedDecisions,
) -> tuple[FieldVerdict, ...]:
    """Seven verdicts; text that differs with no recorded Jev answer is a MISMATCH."""
    recorded = decisions.equivalence.get(email_id, {})
    unjudged = {
        question.field
        for question in equivalence_questions(drafts)
        if question.field not in recorded
    }
    drafts = [
        replace(draft, deterministic_result="MISMATCH")
        if draft.field in unjudged
        else draft
        for draft in drafts
    ]
    equivalences = [
        JevEquivalence(
            field=question.field,
            probability=recorded[question.field],
            returned_model=SEED_DECISIONS_MODEL,
            provider_request_id="recorded",
            correlation_id=case_id,
        )
        for question in equivalence_questions(drafts)
    ]
    return tuple(
        verdict.model_copy(update={"reason": PREPARED_BASELINE_REASON})
        if verdict.field in unjudged
        else verdict
        for verdict in resolve_verdicts(drafts, equivalences)
    )


def _classified_case(
    case_id: str,
    email_id: str,
    category: Category,
    attachments: Sequence[SeedAttachment],
    decisions: SeedDecisions,
) -> SeedCase:
    return SeedCase(
        case_id=case_id,
        email_id=email_id,
        category=category,
        evaluator_output=EvaluatorOutput(
            category=category,
            status=Status.OK,
            review_reason=None,
            defect_fields=[],
            has_defect=False,
        ),
        field_verdicts=(),
        structural_diagnostics=(),
        analyses_roles=MappingProxyType(
            {item.attachment_id: None for item in attachments}
        ),
        assigned_owner_id=None,
        disposition="AUTO_COMPLETED",
        decision_source=decisions.decision_source,
    )


def _case_snapshot(
    case_id: str,
    analyses: Sequence[DocumentAnalysis],
    data: Mapping[str, bytes],
    decisions: SeedDecisions,
) -> CaseSnapshot:
    """The case as Gate 2 sees it: SI identifiers and the roles present."""
    roles = {item.role.role.value for item in analyses if item.role is not None}
    si = next(
        (
            item
            for item in analyses
            if item.role is not None and item.role.role is DocumentRole.SI
        ),
        None,
    )
    identifiers: dict[str, str] = {}
    if si is not None:
        if si.preflight.scanned:
            text = decisions.scans[si.preflight.content_hash].transcription
        else:
            text = parse_document(
                data[si.attachment_id],
                si.preflight,
                attachment_id=si.attachment_id,
                file_name=si.file_name,
            ).text
        for name, pattern in _IDENTIFIERS:
            match = pattern.search(text)
            if match is not None:
                identifiers[name] = match[1]
    return CaseSnapshot(
        case_id=case_id,
        identifiers=identifiers,
        documents=tuple(kind for kind in DocumentKind if kind.value in roles),
    )


def _reconcile(bundle_dir: Path, cases: tuple[CaseSnapshot, ...]) -> SeedReconciliation:
    shipments = load_expected_shipments_csv(bundle_dir / EXPECTED_SHIPMENTS_CSV)
    drafts = reconcile_shipments(shipments, cases, reconciled_at=SEED_RECONCILED_AT)
    results = tuple(
        ReconciliationResult.model_validate(
            result.root.model_dump()
            | {
                "reconciliation_id": uuid5(
                    NAMESPACE_URL,
                    f"ladinglens:{SEED_VERSION}:{result.root.subject_key}",
                )
            }
        )
        for result in materialize_reconciliation_results(
            drafts,
            reconciliation_run_id=RECONCILIATION_RUN_ID,
            created_at=SEED_RECONCILED_AT,
        )
    )
    return SeedReconciliation(
        run_id=RECONCILIATION_RUN_ID,
        reconciled_at=SEED_RECONCILED_AT,
        shipments=shipments,
        results=results,
    )


def _submission_json(emails: Iterable[SeedEmail]) -> bytes:
    return build_submission_artifact(
        SubmissionCaseSnapshot(
            email_id=email.email_id,
            # The artifact builder needs a UUID; it never appears in the bytes.
            case_id=uuid5(
                NAMESPACE_URL, f"ladinglens:{SEED_VERSION}:{email.case.case_id}"
            ),
            category=email.case.category,
            structural_diagnostics=email.case.structural_diagnostics,
            field_snapshots=tuple(
                SubmissionFieldSnapshot(
                    field=verdict.field,
                    deterministic_result=None
                    if verdict.semantic_probability is not None
                    else verdict.deterministic_result,
                    semantic_probability=verdict.semantic_probability,
                )
                for verdict in email.case.field_verdicts
            ),
        )
        for email in emails
    ).canonical_bytes


_catalog: SeedCatalog | None = None
_catalog_lock = asyncio.Lock()
_catalog_failed = False
_catalog_failed_at: datetime | None = None

# A failed build is retried at most this often; every call in between fails
# fast with 503 seed_unavailable instead of re-running the blocking build
# (bundle read, PDF/DOCX/XLSX parsing) on the event loop.
SEED_REBUILD_COOLDOWN = timedelta(seconds=60)
_SEED_UNAVAILABLE_MESSAGE = "The prepared demo data is not available right now."


def _now() -> datetime:
    return datetime.now(UTC)


def _in_cooldown() -> bool:
    return (
        _catalog_failed
        and _catalog_failed_at is not None
        and _now() - _catalog_failed_at < SEED_REBUILD_COOLDOWN
    )


async def load_seed_catalog(settings: Settings) -> SeedCatalog:
    """The process-wide seed catalog, built once on first use.

    A build that fails is cached rather than retried on every call: further
    calls raise 503 seed_unavailable until SEED_REBUILD_COOLDOWN has passed,
    when the next call retries the build (still serialized by the lock, so
    only one rebuild ever runs at a time).
    """
    global _catalog, _catalog_failed, _catalog_failed_at
    if _catalog is not None:
        return _catalog
    if _in_cooldown():
        raise ApiProblem(503, "seed_unavailable", _SEED_UNAVAILABLE_MESSAGE)
    async with _catalog_lock:
        if _catalog is not None:
            return _catalog
        if _in_cooldown():
            raise ApiProblem(503, "seed_unavailable", _SEED_UNAVAILABLE_MESSAGE)
        try:
            _catalog = await SeedCatalog.build(
                Path(settings.bundle_dir),
                SeedDecisions.model_validate_json(DECISIONS_PATH.read_bytes()),
                demo_owner_id=settings.demo_owner_id,
            )
        except Exception:
            _catalog_failed = True
            _catalog_failed_at = _now()
            raise
        _catalog_failed = False
        _catalog_failed_at = None
    return _catalog


def seed_status() -> Literal["ready", "building", "error"]:
    """The seed catalog's build state, without starting or waiting on one."""
    if _catalog is not None:
        return "ready"
    if _catalog_failed:
        return "error"
    return "building"
