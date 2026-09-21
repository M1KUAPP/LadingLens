"""Live judge runs over an uploaded synthetic SI/draft-BL pair.

An upload is checked against the synthetic-only policy before anything is
written. It is then received into the guest's own workspace as a one-email
inbox whose BL_COMPARISON category the uploader declared (audited as
declared, never as a model decision) and compared by the same pipeline as
every other case. A provider failure makes a FAILED run with a plain message
and no outcome; a retry reruns the pipeline on the same case. The prepared
fallback shown beside a run is the seed's labelled example, never the
upload's result.
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from collections.abc import AsyncIterator, Iterator, Sequence
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from uuid import UUID, uuid4

from fastapi import Request

from app.api.errors import ApiProblem
from app.api.views import field_verdict_view
from app.config import Settings
from app.contracts import Category
from app.formats import preflight
from app.guest import GuestContext
from app.observability import bind_request_context
from app.persistence import (
    AttachmentInput,
    AuditContext,
    InactiveWorkspace,
    JudgeAttempt,
    JudgeRunSnapshot,
    PersistenceService,
    ReceiptInput,
)
from app.pipeline import ComparisonPipeline
from app.seed_catalog import SeedCatalog
from app.storage import sha256_hex

logger = logging.getLogger(__name__)

ACCEPTED_FORMATS = ("txt", "pdf", "docx", "xlsx")
JUDGE_SENDER = "judge-upload@ladinglens.invalid"
JUDGE_SUBJECT = "Judge upload"
JUDGE_PROMPT_VERSION = "judge-upload-v1"
# The uploader declares the pair a BL comparison; no model classified it.
DECLARED_MODEL = "judge-declared"
DECLARED_PROBABILITIES = {
    category.value: 1.0 if category is Category.BL_COMPARISON else 0.0
    for category in Category
}
SESSION_RESET_MESSAGE = (
    "Your demo was reset while this check ran. Upload the pair again."
)

_AT_CAPACITY = "The AI provider is at capacity. Try again in a minute."
_FAILURE_MESSAGES = {
    "rate_limited": _AT_CAPACITY,
    "quota_exhausted": _AT_CAPACITY,
    "timeout": "The AI provider did not answer in time.",
    "provider_unconfigured": "Live AI checks are not configured on this server.",
}
_OTHER_FAILURE_MESSAGE = "The AI provider could not complete the check."
_SLOT_BY_ROLE = {"SI": "si_file", "DRAFT_BL": "draft_bl_file"}

# A crafted upload can burn hundreds of MB while parsing; a request that
# cannot get a concurrency slot this soon fails closed instead of risking
# the instance.
_SLOT_WAIT_SECONDS = 5.0
_JUDGE_BUSY_MESSAGE = "Other checks are running. Try again in a minute."

JudgeRunView = dict[str, Any]


class UploadedFile(Protocol):
    """One uploaded file, as Starlette's UploadFile presents it."""

    filename: str | None

    async def read(self, size: int = -1) -> bytes: ...


@dataclass(frozen=True, slots=True)
class _Upload:
    slot: str
    file_name: str
    data: bytes
    detected_format: str


def _already_succeeded() -> ApiProblem:
    return ApiProblem(409, "already_succeeded", "This check already has a result.")


@contextmanager
def _check_errors(run_id: UUID) -> Iterator[None]:
    """Report a reset or an unexpected failure of a check in the envelope."""
    try:
        yield
    except ApiProblem:
        raise
    except InactiveWorkspace as error:
        raise ApiProblem(409, "session_reset", SESSION_RESET_MESSAGE) from error
    except Exception as error:
        # Error text can carry document text: log the run, the type, and the
        # frames it was raised through, never the message.
        logger.error(
            "Judge check %s failed (%s)\n%s",
            run_id,
            type(error).__name__,
            "".join(traceback.format_tb(error.__traceback__)).rstrip(),
        )
        raise ApiProblem(
            500, "check_error", "The check could not be completed. Try again."
        ) from error


class JudgeService:
    def __init__(
        self,
        persistence: PersistenceService,
        pipeline: ComparisonPipeline,
        *,
        settings: Settings,
    ) -> None:
        self._persistence = persistence
        self._pipeline = pipeline
        self._settings = settings
        self._check_slots = asyncio.Semaphore(settings.max_concurrent_judge_checks)

    @asynccontextmanager
    async def _slot(self) -> AsyncIterator[None]:
        """One of a bounded number of concurrent memory-heavy checks per
        process; 503 judge_busy, writing nothing, if none frees up in time.
        """
        try:
            await asyncio.wait_for(self._check_slots.acquire(), _SLOT_WAIT_SECONDS)
        except TimeoutError as error:
            raise ApiProblem(503, "judge_busy", _JUDGE_BUSY_MESSAGE) from error
        try:
            yield
        finally:
            self._check_slots.release()

    async def upload(
        self,
        ctx: GuestContext,
        *,
        si: UploadedFile | None,
        draft_bl: UploadedFile | None,
        synthetic_confirmed: bool,
        request: Request,
        files: Sequence[UploadedFile] | None = None,
    ) -> JudgeRunView:
        if not synthetic_confirmed:
            raise ApiProblem(
                422,
                "synthetic_only",
                "Confirm that both files contain synthetic data only.",
            )
        request_id = request.state.request_id
        bind_request_context(request, route_choice="LIVE")
        run_id = uuid4()
        started_at = datetime.now(UTC)
        async with self._slot():
            uploads = await self._accepted(
                _upload_slots(files, si=si, draft_bl=draft_bl)
            )
            with _check_errors(run_id):
                case_id = await self._receive(
                    ctx, run_id, uploads, request_id=request_id
                )
                bind_request_context(
                    request,
                    case_ids=(str(case_id),),
                    source_hashes=tuple(sha256_hex(upload.data) for upload in uploads),
                    route_choice="LIVE",
                )
                attempt = await self._check(ctx, case_id, started_at, request_id)
                await self._persistence.record_judge_run(
                    workspace_id=ctx.workspace_id,
                    judge_run_id=run_id,
                    case_id=case_id,
                    slots=[upload.slot for upload in uploads],
                    started_at=started_at,
                    attempt=attempt,
                    audit=self._audit(request_id),
                )
                return await self.get(ctx, str(run_id))

    async def retry(
        self, ctx: GuestContext, run_id: str, *, request: Request
    ) -> JudgeRunView:
        request_id = request.state.request_id
        run = await self._run(ctx, run_id)
        bind_request_context(
            request,
            case_ids=(str(run.case_id),),
            route_choice="LIVE",
            retries=run.attempt,
        )
        if run.state == "SUCCEEDED":
            raise _already_succeeded()
        started_at = datetime.now(UTC)
        async with self._slot():
            with _check_errors(run.judge_run_id):
                try:
                    attempt = await self._check(
                        ctx, run.case_id, started_at, request_id
                    )
                except ValueError as error:
                    if str(error) != "case is not awaiting comparison":
                        raise
                    # The case was compared, by a concurrent retry or by one
                    # that stopped before recording the run: it has a result.
                    attempt = _succeeded(started_at)
                if not await self._persistence.record_judge_retry(
                    workspace_id=ctx.workspace_id,
                    judge_run_id=run.judge_run_id,
                    attempt=attempt,
                    audit=self._audit(request_id),
                ):
                    raise _already_succeeded()
                return await self.get(ctx, run_id)

    async def get(
        self, ctx: GuestContext, run_id: str, *, request: Request | None = None
    ) -> JudgeRunView:
        run = await self._run(ctx, run_id)
        if request is not None:
            bind_request_context(
                request, case_ids=(str(run.case_id),), route_choice="LIVE"
            )
        return _run_view(run)

    async def list(
        self, ctx: GuestContext, *, request: Request | None = None
    ) -> list[JudgeRunView]:
        runs = await self._persistence.get_judge_runs(workspace_id=ctx.workspace_id)
        if request is not None:
            bind_request_context(
                request,
                case_ids=tuple(str(run.case_id) for run in runs),
                route_choice="LIVE",
            )
        return [_run_view(run) for run in runs]

    async def document(
        self,
        ctx: GuestContext,
        run_id: str,
        document_id: str,
        *,
        request: Request | None = None,
    ) -> tuple[bytes, str, str]:
        """One uploaded file of a run: its bytes, file name, and format."""
        run = await self._run(ctx, run_id)
        document = next(
            (item for item in run.documents if str(item.attachment_id) == document_id),
            None,
        )
        if document is None:
            raise ApiProblem(
                404, "document_not_found", "No document exists with that ID."
            )
        stored = await self._persistence.load_case_documents(
            workspace_id=ctx.workspace_id, case_id=run.case_id
        )
        data = next(
            item.data
            for item in stored.attachments
            if item.attachment_id == document.attachment_id
        )
        if request is not None:
            bind_request_context(
                request,
                case_ids=(str(run.case_id),),
                source_hashes=(sha256_hex(data),),
                route_choice="LIVE",
            )
        return data, document.file_name, document.detected_format

    def _audit(self, request_id: str) -> AuditContext:
        """The audit context of a check and of the run records it writes."""
        return AuditContext(
            request_id=request_id, rule_version=self._settings.rule_version
        )

    async def _run(self, ctx: GuestContext, run_id: str) -> JudgeRunSnapshot:
        """This guest's run, or 404: another guest's, a reset one, or no run."""
        try:
            judge_run_id = UUID(run_id)
        except ValueError:
            runs = ()
        else:
            runs = await self._persistence.get_judge_runs(
                workspace_id=ctx.workspace_id, judge_run_id=judge_run_id
            )
        if not runs:
            raise ApiProblem(404, "run_not_found", "No check exists with that ID.")
        return runs[0]

    async def _accepted(
        self, files: dict[str, UploadedFile | None]
    ) -> tuple[_Upload, ...]:
        """Both uploads, or 422 upload_rejected naming what is wrong per slot."""
        limit = self._settings.max_upload_bytes
        uploads: list[_Upload] = []
        rejections: list[dict[str, str]] = []
        for slot, file in files.items():
            if file is None:
                rejections.append({"slot": slot, "reason": "missing"})
                continue
            # One byte past the limit is enough to know a file is too large.
            data = await file.read(limit + 1)
            file_name = file.filename or slot
            if not data:
                reason = "empty"
            elif len(data) > limit:
                reason = "too_large"
            else:
                # The bytes decide the format, never the file name.
                check = preflight(data, file_name=file_name)
                if check.status == "TOO_LARGE":
                    reason = "too_large"
                elif check.detected_format in ACCEPTED_FORMATS:
                    uploads.append(
                        _Upload(slot, file_name, data, check.detected_format)
                    )
                    continue
                else:
                    reason = "unsupported_format"
            rejections.append({"slot": slot, "reason": reason})
        if rejections:
            raise ApiProblem(
                422,
                "upload_rejected",
                "One or more files could not be used.",
                details=rejections,
            )
        return tuple(uploads)

    async def _receive(
        self,
        ctx: GuestContext,
        run_id: UUID,
        uploads: tuple[_Upload, ...],
        *,
        request_id: str,
    ) -> UUID:
        """Receive the pair as an email whose category the uploader declared."""
        audit = AuditContext(
            request_id=request_id,
            rule_version=self._settings.rule_version,
            model_version=DECLARED_MODEL,
            prompt_version=JUDGE_PROMPT_VERSION,
        )
        received_at = datetime.now(UTC)
        receipt = await self._persistence.persist_receipt(
            workspace_id=ctx.workspace_id,
            idempotency_key=f"judge:{run_id}",
            receipt=ReceiptInput(
                source_message_id=f"judge:{run_id}",
                received_at=received_at,
                sender=JUDGE_SENDER,
                subject=JUDGE_SUBJECT,
                message_bytes=_message_bytes(uploads),
                attachments=tuple(
                    AttachmentInput(
                        file_name=upload.file_name,
                        data=upload.data,
                        declared_media_type=None,
                        detected_format=upload.detected_format,
                    )
                    for upload in uploads
                ),
            ),
            audit=audit,
        )
        case_id = await self._persistence.ensure_classification_case(
            workspace_id=ctx.workspace_id, email_id=receipt.email_id, audit=audit
        )
        await self._persistence.record_classification_success(
            case_id=case_id,
            category=Category.BL_COMPARISON,
            category_probabilities=DECLARED_PROBABILITIES,
            requested_model=DECLARED_MODEL,
            returned_model=DECLARED_MODEL,
            provider_request_id=None,
            correlation_id=request_id,
            started_at=received_at,
            completed_at=datetime.now(UTC),
            audit=audit,
            assigned_owner_id=self._settings.demo_owner_id,
        )
        return case_id

    async def _check(
        self,
        ctx: GuestContext,
        case_id: UUID,
        started_at: datetime,
        request_id: str,
    ) -> JudgeAttempt:
        comparison = await self._pipeline.run_case(
            workspace_id=ctx.workspace_id,
            case_id=case_id,
            audit=self._audit(request_id),
        )
        if comparison.state != "PROVIDER_FAILED":
            # COMPARED or NEEDS_REVIEW: the check completed, even when a
            # document it could not read went to a reviewer instead.
            return _succeeded(started_at)
        completed_at = datetime.now(UTC)
        return JudgeAttempt(
            state="FAILED",
            latency_ms=_latency_ms(started_at, completed_at),
            completed_at=completed_at,
            failure_code=comparison.failure_code,
            failure_retryable=comparison.retryable,
            failure_message=_FAILURE_MESSAGES.get(
                comparison.failure_code or "", _OTHER_FAILURE_MESSAGE
            ),
        )


def _upload_slots(
    files: Sequence[UploadedFile] | None,
    *,
    si: UploadedFile | None,
    draft_bl: UploadedFile | None,
) -> dict[str, UploadedFile | None]:
    """The upload's files by the slot each arrived in.

    Files sent unlabelled fill numbered slots: the pipeline decides which is
    the SI and which the draft BL from what each says, so the order they
    arrive in never matters. The labelled fields keep their names.
    """
    if not files:
        return {"si_file": si, "draft_bl_file": draft_bl}
    if len(files) > 2:
        raise ApiProblem(
            422,
            "upload_rejected",
            "One or more files could not be used.",
            details=[{"slot": "files", "reason": "too_many"}],
        )
    return {"file_1": files[0], "file_2": files[1] if len(files) == 2 else None}


def _latency_ms(started_at: datetime, completed_at: datetime) -> int:
    return round((completed_at - started_at) / timedelta(milliseconds=1))


def _succeeded(started_at: datetime) -> JudgeAttempt:
    completed_at = datetime.now(UTC)
    return JudgeAttempt(
        state="SUCCEEDED",
        latency_ms=_latency_ms(started_at, completed_at),
        completed_at=completed_at,
    )


def _message_bytes(uploads: tuple[_Upload, ...]) -> bytes:
    """The upload as a message: its file names and hashes, canonical JSON."""
    return json.dumps(
        {
            upload.slot: {
                "file_name": upload.file_name,
                "sha256": sha256_hex(upload.data),
            }
            for upload in uploads
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()


def _run_view(run: JudgeRunSnapshot) -> JudgeRunView:
    run_id = str(run.judge_run_id)
    # Only a completed check shows a result: a FAILED run never does, even
    # while a concurrent retry that just compared its case is still recording.
    completed = run.state == "SUCCEEDED"
    return {
        "run_id": run_id,
        "source": "live",
        "state": run.state,
        "attempt": run.attempt,
        "created_at": run.created_at.isoformat(),
        "completed_at": run.completed_at.isoformat(),
        "latency_ms": run.latency_ms,
        "documents": [
            {
                "document_id": str(document.attachment_id),
                "slot": document.slot,
                "file_name": document.file_name,
                "detected_format": document.detected_format,
                "byte_size": document.byte_size,
                "role": document.role,
                "evidence_url": (
                    f"/api/judge/runs/{run_id}/documents/{document.attachment_id}"
                ),
            }
            for document in run.documents
        ],
        "outcome": (
            run.evaluator_output.model_dump(mode="json")
            if completed and run.evaluator_output is not None
            else None
        ),
        "field_verdicts": (
            [field_verdict_view(verdict) for verdict in run.field_verdicts]
            if completed
            else []
        ),
        "diagnostics": (
            [
                {
                    "reason": diagnostic.reason.value,
                    "detail": diagnostic.detail,
                    "document_role": diagnostic.document_role,
                }
                for diagnostic in run.structural_diagnostics
            ]
            if completed
            else []
        ),
        "failure": (
            None
            if completed
            else {
                "code": run.failure_code,
                "retryable": run.failure_retryable,
                "message": run.failure_message,
            }
        ),
    }


def fallback(catalog: SeedCatalog) -> dict[str, Any]:
    """The seed's prepared example, labelled so it is never taken for the upload."""
    email = catalog.emails[catalog.fallback_email_id]
    case = email.case
    return {
        "label": "PREPARED FALLBACK",
        "source": "prepared",
        "example_id": email.email_id,
        "note": "A prepared example, not your upload.",
        "documents": [
            {
                "document_id": attachment.attachment_id,
                "slot": _SLOT_BY_ROLE[case.analyses_roles[attachment.attachment_id]],
                "file_name": attachment.file_name,
                "detected_format": attachment.detected_format,
                "byte_size": attachment.byte_size,
                "role": case.analyses_roles[attachment.attachment_id],
                "evidence_url": f"/api/evidence/{attachment.attachment_id}",
            }
            for attachment in email.attachments
        ],
        "outcome": case.evaluator_output.model_dump(mode="json"),
        "field_verdicts": [
            field_verdict_view(verdict) for verdict in case.field_verdicts
        ],
    }
