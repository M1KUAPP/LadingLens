from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path, PurePosixPath
from typing import Protocol
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.contracts import Category
from app.formats import detect_format
from app.jev import JEV_MODEL, JevClassification, JevProviderFailure
from app.persistence import (
    AttachmentInput,
    AuditContext,
    PersistedReceipt,
    ReceiptInput,
)


class InboxSource(Protocol):
    def emails(self) -> Iterable[Mapping[str, object]]: ...

    def read_bytes(self, path: str) -> bytes: ...


class BundleEmail(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, strict=True)

    email_id: str
    sender: str = Field(alias="from")
    subject: str | None
    body: str
    attachments: list[str]

    @field_validator("email_id", "sender")
    @classmethod
    def _require_nonblank_identifier(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


@dataclass(frozen=True, slots=True)
class AttachmentReceipt:
    filename: str
    data: bytes
    declared_mime: str | None
    detected_format: str
    byte_size: int
    content_hash: str
    ordinal: int


@dataclass(frozen=True, slots=True)
class ReceivedEmail:
    email_id: str
    source_message_id: str
    idempotency_key: str
    received_at: datetime
    sender: str
    subject: str | None
    body_text: str
    message_bytes: bytes
    message_hash: str
    attachments: tuple[AttachmentReceipt, ...]


class Gate1Persistence(Protocol):
    async def persist_receipt(
        self,
        *,
        workspace_id: UUID,
        idempotency_key: str,
        receipt: ReceiptInput,
        audit: AuditContext,
    ) -> PersistedReceipt: ...

    async def ensure_classification_case(
        self,
        *,
        workspace_id: UUID,
        email_id: UUID,
        audit: AuditContext,
    ) -> UUID: ...

    async def get_classification_state(self, *, case_id: UUID) -> str: ...

    async def record_classification_success(self, **kwargs: object) -> UUID: ...

    async def record_classification_failure(self, **kwargs: object) -> UUID: ...


class Gate1Classifier(Protocol):
    async def classify(
        self,
        emails: tuple[ReceivedEmail, ...],
        *,
        correlation_id: str | None = None,
    ) -> list[JevClassification]: ...


@dataclass(frozen=True, slots=True)
class Gate1RunSummary:
    total_emails: int
    receipt_replays: int
    classified: int
    skipped: int
    failed: int
    failure_code: str | None = None


@dataclass(frozen=True, slots=True)
class _PendingClassification:
    email: ReceivedEmail
    case_id: UUID


class InboxIngestionService:
    """Receipt an inbox before running fail-closed Gate 1 classification."""

    def __init__(
        self,
        persistence: Gate1Persistence,
        classifier: Gate1Classifier,
        *,
        bl_owner_id: str,
    ) -> None:
        if not bl_owner_id.strip():
            raise ValueError("bl_owner_id must not be empty")
        self._persistence = persistence
        self._classifier = classifier
        self._bl_owner_id = bl_owner_id.strip()

    async def ingest(
        self,
        *,
        workspace_id: UUID,
        source: InboxSource,
        received_at: datetime,
        audit: AuditContext,
    ) -> Gate1RunSummary:
        emails = read_bundle(source, received_at=received_at)
        pending: list[_PendingClassification] = []
        receipt_replays = 0
        skipped = 0

        for email in emails:
            persisted = await self._persistence.persist_receipt(
                workspace_id=workspace_id,
                idempotency_key=email.idempotency_key,
                receipt=_receipt_input(email),
                audit=audit,
            )
            receipt_replays += int(persisted.replayed)
            case_id = await self._persistence.ensure_classification_case(
                workspace_id=workspace_id,
                email_id=persisted.email_id,
                audit=audit,
            )
            state = await self._persistence.get_classification_state(case_id=case_id)
            if state in {"CLASSIFIED", "BL_READY"}:
                skipped += 1
                continue
            if state not in {"PENDING", "PROVIDER_FAILED"}:
                raise ValueError(f"unsupported classification state: {state}")
            pending.append(_PendingClassification(email=email, case_id=case_id))

        if not pending:
            return Gate1RunSummary(
                total_emails=len(emails),
                receipt_replays=receipt_replays,
                classified=0,
                skipped=skipped,
                failed=0,
            )

        started_at = datetime.now(UTC)
        pending_emails = tuple(item.email for item in pending)
        try:
            results = await self._classifier.classify(
                pending_emails,
                correlation_id=audit.request_id,
            )
        except JevProviderFailure as failure:
            completed_at = datetime.now(UTC)
            await self._record_failures(
                pending,
                safe_diagnostic=failure.code.value,
                retryable=failure.retryable,
                provider_request_id=failure.provider_request_id,
                correlation_id=failure.correlation_id,
                started_at=started_at,
                completed_at=completed_at,
                audit=audit,
            )
            return Gate1RunSummary(
                total_emails=len(emails),
                receipt_replays=receipt_replays,
                classified=0,
                skipped=skipped,
                failed=len(pending),
                failure_code=failure.code.value,
            )

        completed_at = datetime.now(UTC)
        result_by_id = {result.email_id: result for result in results}
        pending_ids = {item.email.email_id for item in pending}
        results_are_complete = (
            len(result_by_id) == len(results) == len(pending)
            and set(result_by_id) == pending_ids
            and all(result.returned_model == JEV_MODEL for result in results)
            and all(result.correlation_id == audit.request_id for result in results)
        )
        if not results_are_complete:
            provider_request_id = next(
                (result.provider_request_id for result in results),
                None,
            )
            await self._record_failures(
                pending,
                safe_diagnostic="invalid_answer",
                retryable=True,
                provider_request_id=provider_request_id,
                correlation_id=audit.request_id,
                started_at=started_at,
                completed_at=completed_at,
                audit=audit,
            )
            return Gate1RunSummary(
                total_emails=len(emails),
                receipt_replays=receipt_replays,
                classified=0,
                skipped=skipped,
                failed=len(pending),
                failure_code="invalid_answer",
            )

        for item in pending:
            result = result_by_id[item.email.email_id]
            await self._persistence.record_classification_success(
                case_id=item.case_id,
                category=result.category,
                category_probabilities=result.probabilities,
                requested_model=JEV_MODEL,
                returned_model=result.returned_model,
                provider_request_id=result.provider_request_id,
                correlation_id=result.correlation_id,
                started_at=started_at,
                completed_at=completed_at,
                audit=audit,
                assigned_owner_id=(
                    self._bl_owner_id
                    if result.category is Category.BL_COMPARISON
                    else None
                ),
            )

        return Gate1RunSummary(
            total_emails=len(emails),
            receipt_replays=receipt_replays,
            classified=len(pending),
            skipped=skipped,
            failed=0,
        )

    async def _record_failures(
        self,
        pending: list[_PendingClassification],
        *,
        safe_diagnostic: str,
        retryable: bool,
        provider_request_id: str | None,
        correlation_id: str,
        started_at: datetime,
        completed_at: datetime,
        audit: AuditContext,
    ) -> None:
        for item in pending:
            await self._persistence.record_classification_failure(
                case_id=item.case_id,
                requested_model=JEV_MODEL,
                returned_model=None,
                safe_diagnostic=safe_diagnostic,
                retryable=retryable,
                provider_request_id=provider_request_id,
                correlation_id=correlation_id,
                started_at=started_at,
                completed_at=completed_at,
                audit=audit,
            )


def _receipt_input(email: ReceivedEmail) -> ReceiptInput:
    return ReceiptInput(
        source_message_id=email.source_message_id,
        received_at=email.received_at,
        sender=email.sender,
        subject=email.subject,
        body_text=email.body_text,
        message_bytes=email.message_bytes,
        attachments=tuple(
            AttachmentInput(
                file_name=attachment.filename,
                data=attachment.data,
                declared_media_type=attachment.declared_mime,
                detected_format=attachment.detected_format,
            )
            for attachment in email.attachments
        ),
    )


_FORMAT_BY_SUFFIX = {
    ".txt": "txt",
    ".pdf": "pdf",
    ".docx": "docx",
    ".xlsx": "xlsx",
}


def read_bundle(
    source: InboxSource,
    *,
    received_at: datetime,
) -> tuple[ReceivedEmail, ...]:
    """Validate and read an organizer inbox without inventing source timestamps."""
    received_at = _utc_received_at(received_at)
    bundle_emails: list[BundleEmail] = []
    seen_email_ids: set[str] = set()

    for record in source.emails():
        email = BundleEmail.model_validate(record)
        if email.email_id in seen_email_ids:
            raise ValueError(f"duplicate email_id: {email.email_id}")
        seen_email_ids.add(email.email_id)
        _validate_attachment_paths(email.attachments)
        bundle_emails.append(email)

    received_emails: list[ReceivedEmail] = []
    for email in bundle_emails:
        message_bytes = canonical_message_bytes(email)
        attachments = tuple(
            _read_attachment(source, path, ordinal)
            for ordinal, path in enumerate(email.attachments, start=1)
        )
        received_emails.append(
            ReceivedEmail(
                email_id=email.email_id,
                source_message_id=email.email_id,
                idempotency_key=email.email_id,
                received_at=received_at,
                sender=email.sender,
                subject=email.subject,
                body_text=email.body,
                message_bytes=message_bytes,
                message_hash=sha256(message_bytes).hexdigest(),
                attachments=attachments,
            )
        )
    return tuple(received_emails)


def _utc_received_at(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
        raise ValueError("received_at must be an aware UTC datetime")
    return value.astimezone(UTC)


def canonical_message_bytes(email: BundleEmail) -> bytes:
    payload = email.model_dump(mode="json", by_alias=True)
    canonical_json = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return canonical_json.encode("utf-8")


def _validate_attachment_paths(paths: list[str]) -> None:
    seen: set[str] = set()
    for path in paths:
        _validate_attachment_path(path)
        if path in seen:
            raise ValueError(f"duplicate attachment path: {path}")
        seen.add(path)


def _validate_attachment_path(path: str) -> None:
    if (
        not path
        or "\x00" in path
        or "\\" in path
        or any(character in path for character in "%?#")
        or not path.startswith("attachments/")
    ):
        raise ValueError(f"unsafe attachment path: {path!r}")
    parts = path.split("/")
    if any(part in {"", ".", ".."} or ":" in part for part in parts):
        raise ValueError(f"unsafe attachment path: {path!r}")
    if PurePosixPath(path).is_absolute():
        raise ValueError(f"unsafe attachment path: {path!r}")


def _read_attachment(
    source: InboxSource,
    relative_path: str,
    ordinal: int,
) -> AttachmentReceipt:
    _check_local_source_path(source, relative_path)
    try:
        data = source.read_bytes(relative_path)
    except (FileNotFoundError, KeyError) as error:
        raise ValueError(f"missing attachment: {relative_path}") from error
    except OSError as error:
        raise ValueError(f"could not read attachment: {relative_path}") from error
    if not isinstance(data, bytes):
        raise TypeError(f"attachment read did not return bytes: {relative_path}")

    filename = PurePosixPath(relative_path).name
    detected_format = detect_format(data)
    suffix = PurePosixPath(filename).suffix.lower()
    expected_format = _FORMAT_BY_SUFFIX.get(suffix)
    if expected_format is None:
        if detected_format != "unknown":
            raise ValueError(
                f"attachment extension does not match content: {relative_path}"
            )
    elif expected_format != detected_format:
        raise ValueError(
            f"attachment extension does not match content: {relative_path}"
        )

    return AttachmentReceipt(
        filename=filename,
        data=data,
        declared_mime=None,
        detected_format=detected_format,
        byte_size=len(data),
        content_hash=sha256(data).hexdigest(),
        ordinal=ordinal,
    )


def _check_local_source_path(source: InboxSource, relative_path: str) -> None:
    source_location = getattr(source, "source", None)
    if not isinstance(source_location, (str, Path)):
        return
    location_text = str(source_location)
    if urlsplit(location_text).scheme.lower() in {"http", "https"}:
        return

    root = Path(location_text).absolute()
    source_components = [*reversed(root.parents), root]
    for component in source_components:
        if _is_link(component):
            raise ValueError(f"bundle source contains a symlink: {component}")

    attachment_root = root / "attachments"
    candidate = root
    for part in PurePosixPath(relative_path).parts:
        candidate /= part
        if _is_link(candidate):
            raise ValueError(f"attachment path contains a symlink: {relative_path}")

    resolved_root = attachment_root.resolve(strict=False)
    resolved_candidate = candidate.resolve(strict=False)
    try:
        resolved_candidate.relative_to(resolved_root)
    except ValueError as error:
        raise ValueError(
            f"attachment path escapes attachments/: {relative_path}"
        ) from error


def _is_link(path: Path) -> bool:
    return path.is_symlink() or bool(getattr(path, "is_junction", lambda: False)())
