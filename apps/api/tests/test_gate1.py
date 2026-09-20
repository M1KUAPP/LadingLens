from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from app.contracts import Category
from app.ingestion import InboxIngestionService
from app.jev import (
    JEV_MODEL,
    JevClassification,
    JevFailureCode,
    JevProviderFailure,
)
from app.persistence import AuditContext, PersistedReceipt, ReceiptInput

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_ROOT = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
RECEIVED_AT = datetime(2026, 9, 20, 12, tzinfo=UTC)
PROBABILITIES = {
    "BL_COMPARISON": 0.02,
    "SI_REQUEST": 0.02,
    "INVOICE_QUERY": 0.02,
    "GENERAL": 0.92,
    "SPAM": 0.02,
}


def _load_organizer_inbox():
    loader_path = BUNDLE_ROOT / "loader.py"
    spec = importlib.util.spec_from_file_location("gate1_organizer_loader", loader_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Inbox(str(BUNDLE_ROOT))


class _MemoryInbox:
    def __init__(self, records: list[dict], files: dict[str, bytes] | None = None):
        self._records = records
        self._files = files or {}

    def emails(self) -> list[dict]:
        return self._records

    def read_bytes(self, path: str) -> bytes:
        return self._files[path]


def _record(email_id: str) -> dict:
    return {
        "email_id": email_id,
        "from": "sender@example.test",
        "subject": f"Subject {email_id}",
        "body": f"Body {email_id}",
        "attachments": [],
    }


@dataclass(frozen=True)
class _SuccessCall:
    case_id: UUID
    category: Category
    category_probabilities: dict[str, float]
    requested_model: str
    returned_model: str | None
    provider_request_id: str | None
    correlation_id: str
    assigned_owner_id: str | None


class _FakePersistence:
    def __init__(self) -> None:
        self.receipts: dict[str, UUID] = {}
        self.receipt_inputs: dict[str, ReceiptInput] = {}
        self.cases_by_email: dict[UUID, UUID] = {}
        self.case_states: dict[UUID, str] = {}
        self.case_source_ids: dict[UUID, str] = {}
        self.success_calls: list[_SuccessCall] = []
        self.failure_calls: list[dict[str, object]] = []

    async def persist_receipt(
        self,
        *,
        workspace_id: UUID,
        idempotency_key: str,
        receipt: ReceiptInput,
        audit: AuditContext,
    ) -> PersistedReceipt:
        del workspace_id, audit
        existing = self.receipts.get(idempotency_key)
        if existing is not None:
            return PersistedReceipt(email_id=existing, replayed=True)
        email_id = uuid4()
        self.receipts[idempotency_key] = email_id
        self.receipt_inputs[idempotency_key] = receipt
        return PersistedReceipt(email_id=email_id, replayed=False)

    async def ensure_classification_case(
        self,
        *,
        workspace_id: UUID,
        email_id: UUID,
        audit: AuditContext,
    ) -> UUID:
        del workspace_id, audit
        if email_id in self.cases_by_email:
            return self.cases_by_email[email_id]
        case_id = uuid4()
        self.cases_by_email[email_id] = case_id
        self.case_states[case_id] = "PENDING"
        source_id = next(
            key for key, value in self.receipts.items() if value == email_id
        )
        self.case_source_ids[case_id] = source_id
        return case_id

    async def get_classification_state(self, *, case_id: UUID) -> str:
        return self.case_states[case_id]

    async def record_classification_success(self, **kwargs) -> UUID:
        category = Category(kwargs["category"])
        call = _SuccessCall(
            case_id=kwargs["case_id"],
            category=category,
            category_probabilities=kwargs["category_probabilities"],
            requested_model=kwargs["requested_model"],
            returned_model=kwargs["returned_model"],
            provider_request_id=kwargs["provider_request_id"],
            correlation_id=kwargs["correlation_id"],
            assigned_owner_id=kwargs["assigned_owner_id"],
        )
        self.success_calls.append(call)
        self.case_states[call.case_id] = (
            "BL_READY" if category is Category.BL_COMPARISON else "CLASSIFIED"
        )
        return uuid4()

    async def record_classification_failure(self, **kwargs) -> UUID:
        self.failure_calls.append(kwargs)
        self.case_states[kwargs["case_id"]] = "PROVIDER_FAILED"
        return uuid4()


class _SuccessfulClassifier:
    def __init__(self, categories: dict[str, Category] | None = None) -> None:
        self.categories = categories or {}
        self.calls: list[tuple[str, ...]] = []
        self.persistence: _FakePersistence | None = None

    async def classify(self, emails, *, correlation_id: str | None = None):
        email_ids = tuple(email.email_id for email in emails)
        self.calls.append(email_ids)
        if self.persistence is not None:
            assert len(self.persistence.receipts) == len(email_ids)
            assert len(self.persistence.cases_by_email) == len(email_ids)
        return [
            JevClassification(
                email_id=email.email_id,
                category=self.categories.get(email.email_id, Category.GENERAL),
                probabilities={
                    **PROBABILITIES,
                    **(
                        {
                            "GENERAL": 0.02,
                            self.categories[email.email_id].value: 0.92,
                        }
                        if email.email_id in self.categories
                        else {}
                    ),
                },
                confidence=0.93,
                returned_model=JEV_MODEL,
                provider_request_id="jev-request-1",
                correlation_id=correlation_id or "generated",
            )
            for email in emails
        ]


class _FailingClassifier:
    def __init__(self, code: JevFailureCode = JevFailureCode.RATE_LIMITED) -> None:
        self.code = code
        self.calls = 0

    async def classify(self, emails, *, correlation_id: str | None = None):
        self.calls += 1
        raise JevProviderFailure(
            code=self.code,
            retryable=True,
            email_ids=tuple(email.email_id for email in emails),
            correlation_id=correlation_id or "generated",
            provider_request_id="failed-request",
            status_code=429,
            message="Jev rate limit was exceeded",
        )


def _audit() -> AuditContext:
    return AuditContext(
        request_id="gate1-run-1",
        rule_version="gate1-rules-v1",
        model_version=JEV_MODEL,
        prompt_version="category-prompt-v1",
    )


@pytest.mark.asyncio
async def test_gate1_receipts_and_classifies_all_520_before_idempotent_replay() -> None:
    persistence = _FakePersistence()
    classifier = _SuccessfulClassifier()
    classifier.persistence = persistence
    service = InboxIngestionService(
        persistence,
        classifier,
        bl_owner_id="bl-ops-queue",
    )
    workspace_id = uuid4()

    first = await service.ingest(
        workspace_id=workspace_id,
        source=_load_organizer_inbox(),
        received_at=RECEIVED_AT,
        audit=_audit(),
    )
    replay = await service.ingest(
        workspace_id=workspace_id,
        source=_load_organizer_inbox(),
        received_at=RECEIVED_AT,
        audit=_audit(),
    )

    assert first.total_emails == first.classified == 520
    assert first.failed == first.skipped == first.receipt_replays == 0
    assert len(persistence.receipts) == len(persistence.cases_by_email) == 520
    assert len(persistence.success_calls) == 520
    assert classifier.calls == [tuple(f"email_{number:03}" for number in range(1, 521))]
    assert replay.total_emails == replay.skipped == replay.receipt_replays == 520
    assert replay.classified == replay.failed == 0
    assert len(persistence.receipts) == len(persistence.cases_by_email) == 520
    receipt_001 = persistence.receipt_inputs["email_001"]
    assert receipt_001.source_message_id == "email_001"
    assert receipt_001.body_text
    assert (
        sum(len(receipt.attachments) for receipt in persistence.receipt_inputs.values())
        == 250
    )
    assert any(
        len(receipt.attachments) == 2 for receipt in persistence.receipt_inputs.values()
    )


@pytest.mark.asyncio
async def test_gate1_failure_is_visible_for_every_case_and_retry_succeeds() -> None:
    persistence = _FakePersistence()
    failing = _FailingClassifier()
    service = InboxIngestionService(
        persistence,
        failing,
        bl_owner_id="bl-ops-queue",
    )
    source = _MemoryInbox([_record("email_a"), _record("email_b")])
    workspace_id = uuid4()

    failed = await service.ingest(
        workspace_id=workspace_id,
        source=source,
        received_at=RECEIVED_AT,
        audit=_audit(),
    )

    assert failed.failed == 2
    assert failed.classified == failed.skipped == 0
    assert {call["safe_diagnostic"] for call in persistence.failure_calls} == {
        "rate_limited"
    }
    assert all(
        call["provider_request_id"] == "failed-request"
        for call in persistence.failure_calls
    )
    assert set(persistence.case_states.values()) == {"PROVIDER_FAILED"}

    successful = _SuccessfulClassifier()
    retry_service = InboxIngestionService(
        persistence,
        successful,
        bl_owner_id="bl-ops-queue",
    )
    retried = await retry_service.ingest(
        workspace_id=workspace_id,
        source=source,
        received_at=RECEIVED_AT,
        audit=_audit(),
    )

    assert retried.receipt_replays == retried.classified == 2
    assert retried.failed == retried.skipped == 0
    assert set(persistence.case_states.values()) == {"CLASSIFIED"}


@pytest.mark.asyncio
async def test_gate1_assigns_bl_owner_and_rejects_incomplete_classifier_output() -> (
    None
):
    persistence = _FakePersistence()
    categories = {"email_bl": Category.BL_COMPARISON}
    classifier = _SuccessfulClassifier(categories)
    service = InboxIngestionService(
        persistence,
        classifier,
        bl_owner_id="bl-ops-queue",
    )
    workspace_id = uuid4()
    source = _MemoryInbox([_record("email_general"), _record("email_bl")])

    summary = await service.ingest(
        workspace_id=workspace_id,
        source=source,
        received_at=RECEIVED_AT,
        audit=_audit(),
    )

    assert summary.classified == 2
    calls = {
        persistence.case_source_ids[call.case_id]: call
        for call in persistence.success_calls
    }
    assert calls["email_general"].assigned_owner_id is None
    assert calls["email_bl"].assigned_owner_id == "bl-ops-queue"
    assert all(
        call.requested_model == call.returned_model == JEV_MODEL
        for call in calls.values()
    )

    incomplete_persistence = _FakePersistence()
    incomplete_service = InboxIngestionService(
        incomplete_persistence,
        _IncompleteClassifier(),
        bl_owner_id="bl-ops-queue",
    )
    incomplete = await incomplete_service.ingest(
        workspace_id=uuid4(),
        source=_MemoryInbox([_record("email_1"), _record("email_2")]),
        received_at=RECEIVED_AT,
        audit=_audit(),
    )

    assert incomplete.failed == 2
    assert incomplete.classified == 0
    assert {
        call["safe_diagnostic"] for call in incomplete_persistence.failure_calls
    } == {"invalid_answer"}


class _IncompleteClassifier:
    async def classify(self, emails, *, correlation_id: str | None = None):
        email = emails[0]
        return [
            JevClassification(
                email_id=email.email_id,
                category=Category.GENERAL,
                probabilities=PROBABILITIES,
                confidence=0.93,
                returned_model=JEV_MODEL,
                provider_request_id="partial-request",
                correlation_id=correlation_id or "generated",
            )
        ]
