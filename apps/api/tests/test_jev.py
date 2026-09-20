from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

import httpx2
import pytest
from typesafe_sdk import SystemOneResponse

from app.contracts import Category
from app.jev import (
    JEV_MODEL,
    JevCategoryClient,
    JevFailureCode,
    JevProviderFailure,
)


@dataclass(frozen=True)
class _Attachment:
    filename: str


@dataclass(frozen=True)
class _Email:
    email_id: str
    sender: str | None
    subject: str | None
    body_text: str
    attachments: tuple[_Attachment, ...] = ()


class _FakeRetryPolicy:
    def __init__(self, *, max_retries: int):
        self.max_retries = max_retries


class _FakeChoice:
    def __init__(self, *, instructions: str, criteria: dict[str, str]):
        self.type = "choice"
        self.instructions = instructions
        self.criteria = criteria


class _ProviderError(Exception):
    def __init__(
        self,
        *,
        status: int,
        request_id: str,
        field_path: str | None = None,
    ):
        self.status = status
        self.request_id = request_id
        if field_path is not None:
            self.field_path = field_path


class _FakeSystemOneClient:
    def __init__(self, responses: list[object]):
        self.responses = iter(responses)
        self.calls: list[dict[str, Any]] = []

    async def system_one(self, **kwargs: Any) -> object:
        self.calls.append(kwargs)
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


def _answer(
    category: str = Category.BL_COMPARISON.value,
) -> dict[str, object]:
    probabilities = {
        "BL_COMPARISON": 0.02,
        "SI_REQUEST": 0.02,
        "INVOICE_QUERY": 0.02,
        "GENERAL": 0.02,
        "SPAM": 0.02,
    }
    probabilities[category] = 0.92
    return {
        "type": "choice",
        "choice": category,
        "confidence": 0.93,
        "probabilities": probabilities,
    }


def _response(
    answers: dict[str, object],
    *,
    model: str = JEV_MODEL,
    request_id: str = "jev-request-1",
) -> SimpleNamespace:
    return SimpleNamespace(model=model, answers=answers, request_id=request_id)


def _email(email_id: str) -> _Email:
    return _Email(
        email_id=email_id,
        sender="ops@example.test",
        subject=f"Shipment {email_id}",
        body_text=f"Please review the shipment documents for {email_id}.",
        attachments=(_Attachment(f"{email_id}_SI.txt"),),
    )


@pytest.fixture(autouse=True)
def _typesafe_sdk_retry_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(
        sys.modules,
        "typesafe_sdk",
        SimpleNamespace(Choice=_FakeChoice, RetryPolicy=_FakeRetryPolicy),
    )


@pytest.mark.asyncio
async def test_classifies_emails_as_bounded_choice_batches_with_pinned_requests() -> (
    None
):
    client = _FakeSystemOneClient(
        [
            _response(
                {
                    "email_001": _answer(),
                    "email_002": _answer(Category.INVOICE_QUERY.value),
                },
                request_id="request-1",
            ),
            _response(
                {"email_003": _answer(Category.SPAM.value)}, request_id="request-2"
            ),
        ]
    )
    classifier = JevCategoryClient(client, batch_size=2)

    results = await classifier.classify(
        [_email("email_001"), _email("email_002"), _email("email_003")],
        correlation_id="ingestion-run-1",
    )

    assert [result.email_id for result in results] == [
        "email_001",
        "email_002",
        "email_003",
    ]
    assert [result.category for result in results] == [
        Category.BL_COMPARISON,
        Category.INVOICE_QUERY,
        Category.SPAM,
    ]
    assert results[0].probabilities == {
        "BL_COMPARISON": 0.92,
        "SI_REQUEST": 0.02,
        "INVOICE_QUERY": 0.02,
        "GENERAL": 0.02,
        "SPAM": 0.02,
    }
    assert results[0].confidence == 0.93
    assert results[0].returned_model == "jev-1.13.0"
    assert [result.provider_request_id for result in results] == [
        "request-1",
        "request-1",
        "request-2",
    ]
    assert {result.correlation_id for result in results} == {"ingestion-run-1"}

    first, second = client.calls
    assert first["model"] == second["model"] == "jev-1.13.0"
    assert first["timeout"] == second["timeout"] == 20.0
    assert first["retry"].max_retries == second["retry"].max_retries == 0
    assert (
        first["extra_headers"]
        == second["extra_headers"]
        == {"X-Correlation-ID": "ingestion-run-1"}
    )
    assert set(first["questions"]) == {"email_001", "email_002"}
    assert set(second["questions"]) == {"email_003"}
    assert all(
        question.type == "choice"
        and set(question.criteria)
        == {
            "BL_COMPARISON",
            "SI_REQUEST",
            "INVOICE_QUERY",
            "GENERAL",
            "SPAM",
        }
        for call in client.calls
        for question in call["questions"].values()
    )
    assert first["state"]["emails"]["email_001"] == {
        "email_id": "email_001",
        "sender": "ops@example.test",
        "subject": "Shipment email_001",
        "body_text": "Please review the shipment documents for email_001.",
        "attachments": ["email_001_SI.txt"],
    }


@pytest.mark.asyncio
async def test_later_batch_failure_marks_the_whole_uncommitted_request_retryable() -> (
    None
):
    client = _FakeSystemOneClient(
        [
            _response(
                {
                    "email_001": _answer(Category.GENERAL.value),
                    "email_002": _answer(Category.SPAM.value),
                },
                request_id="request-1",
            ),
            TimeoutError("provider timeout"),
        ]
    )
    classifier = JevCategoryClient(client, batch_size=2)

    with pytest.raises(JevProviderFailure) as caught:
        await classifier.classify(
            [_email(f"email_{number:03}") for number in range(1, 5)],
            correlation_id="ingestion-run-late-failure",
        )

    assert caught.value.code is JevFailureCode.TIMEOUT
    assert caught.value.email_ids == (
        "email_001",
        "email_002",
        "email_003",
        "email_004",
    )
    assert len(client.calls) == 2


@pytest.mark.asyncio
async def test_rejects_missing_or_extra_answer_keys_without_returning_partial_results() -> (
    None
):
    client = _FakeSystemOneClient(
        [_response({"email_001": _answer(), "unexpected": _answer()})]
    )

    with pytest.raises(JevProviderFailure) as caught:
        await JevCategoryClient(client).classify(
            [_email("email_001"), _email("email_002")],
            correlation_id="ingestion-run-2",
        )

    assert caught.value.code is JevFailureCode.INVALID_ANSWER
    assert caught.value.email_ids == ("email_001", "email_002")
    assert caught.value.correlation_id == "ingestion-run-2"


@pytest.mark.asyncio
async def test_real_sdk_response_without_request_id_becomes_malformed_failure() -> None:
    response = SystemOneResponse.model_construct(
        model=JEV_MODEL,
        answers={"email_001": _answer(Category.GENERAL.value)},
    )
    client = _FakeSystemOneClient([response])

    with pytest.raises(JevProviderFailure) as caught:
        await JevCategoryClient(client).classify(
            [_email("email_001")],
            correlation_id="missing-provider-request-id",
        )

    assert caught.value.code is JevFailureCode.MALFORMED_RESPONSE
    assert caught.value.retryable is True
    assert caught.value.email_ids == ("email_001",)


@pytest.mark.asyncio
async def test_real_sdk_response_exposes_provider_request_id_from_header() -> None:
    raw = httpx2.Response(
        200,
        json={
            "model": JEV_MODEL,
            "usage": {"input_tokens": 20, "output_tokens": 5},
            "answers": {"email_001": _answer(Category.GENERAL.value)},
        },
        headers={"x-typesafe-request-id": "real-sdk-request-id"},
        request=httpx2.Request("POST", "https://api.typesafe.ai/v1/systemone"),
    )
    response = SystemOneResponse.from_http_response(raw)

    results = await JevCategoryClient(_FakeSystemOneClient([response])).classify(
        [_email("email_001")],
        correlation_id="real-sdk-response",
    )

    assert results[0].provider_request_id == "real-sdk-request-id"
    assert results[0].returned_model == JEV_MODEL


@pytest.mark.asyncio
async def test_rejects_a_blank_explicit_correlation_id_before_calling_the_provider() -> (
    None
):
    client = _FakeSystemOneClient([])

    with pytest.raises(ValueError, match="correlation_id"):
        await JevCategoryClient(client).classify(
            [_email("email_001")], correlation_id=""
        )

    assert client.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mutate",
    [
        lambda answer: answer.update(choice="BL_COMPARISON_ALIAS"),
        lambda answer: answer.update(type="noul"),
        lambda answer: answer["probabilities"].pop("SPAM"),
        lambda answer: answer["probabilities"].update(SPAM=float("nan")),
        lambda answer: answer["probabilities"].update(SPAM=1.01),
        lambda answer: answer["probabilities"].update(SPAM=0.05),
        lambda answer: answer["probabilities"].update(SPAM=True),
        lambda answer: answer.update(confidence=float("inf")),
        lambda answer: answer.update(unexpected="field"),
    ],
    ids=[
        "category-alias",
        "wrong-answer-type",
        "incomplete-probability-keys",
        "non-finite-probability",
        "out-of-range-probability",
        "probability-sum",
        "boolean-probability",
        "non-finite-confidence",
        "unexpected-answer-field",
    ],
)
async def test_rejects_invalid_choice_answers(mutate: Any) -> None:
    answer = _answer()
    mutate(answer)
    client = _FakeSystemOneClient([_response({"email_001": answer})])

    with pytest.raises(JevProviderFailure) as caught:
        await JevCategoryClient(client).classify([_email("email_001")])

    assert caught.value.code is JevFailureCode.INVALID_ANSWER
    assert caught.value.retryable is True
    assert caught.value.provider_request_id == "jev-request-1"


@pytest.mark.asyncio
async def test_rejects_a_response_from_any_model_other_than_the_pinned_model() -> None:
    client = _FakeSystemOneClient(
        [_response({"email_001": _answer()}, model="jev-latest")]
    )

    with pytest.raises(JevProviderFailure) as caught:
        await JevCategoryClient(client).classify([_email("email_001")])

    assert caught.value.code is JevFailureCode.INVALID_ANSWER
    assert caught.value.retryable is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "code", "retryable", "status"),
    [
        (TimeoutError("timed out"), JevFailureCode.TIMEOUT, True, None),
        (
            ConnectionError("connection failed"),
            JevFailureCode.CONNECTION_ERROR,
            True,
            None,
        ),
        (
            _ProviderError(status=401, request_id="auth-request"),
            JevFailureCode.AUTHENTICATION_ERROR,
            False,
            401,
        ),
        (
            _ProviderError(status=429, request_id="rate-request"),
            JevFailureCode.RATE_LIMITED,
            True,
            429,
        ),
        (
            _ProviderError(status=529, request_id="overload-request"),
            JevFailureCode.OVERLOADED,
            True,
            529,
        ),
        (
            _ProviderError(status=503, request_id="server-request"),
            JevFailureCode.SERVER_ERROR,
            True,
            503,
        ),
        (
            _ProviderError(status=422, request_id="invalid-request"),
            JevFailureCode.HTTP_ERROR,
            False,
            422,
        ),
        (
            _ProviderError(
                status=200, request_id="malformed-request", field_path="answers"
            ),
            JevFailureCode.MALFORMED_RESPONSE,
            True,
            200,
        ),
        (
            json.JSONDecodeError("invalid JSON", "{", 0),
            JevFailureCode.MALFORMED_RESPONSE,
            True,
            None,
        ),
    ],
    ids=[
        "timeout",
        "connection",
        "authentication",
        "rate-limit",
        "overload",
        "server-error",
        "other-http-error",
        "typed-response-error",
        "invalid-json",
    ],
)
async def test_maps_provider_errors_to_structured_failures(
    error: Exception,
    code: JevFailureCode,
    retryable: bool,
    status: int | None,
) -> None:
    client = _FakeSystemOneClient([error])

    with pytest.raises(JevProviderFailure) as caught:
        await JevCategoryClient(client).classify(
            [_email("email_001")], correlation_id="ingestion-run-3"
        )

    failure = caught.value
    assert failure.code is code
    assert failure.retryable is retryable
    assert failure.status_code == status
    assert failure.correlation_id == "ingestion-run-3"
    assert failure.email_ids == ("email_001",)
    assert failure.provider_request_id is None or failure.provider_request_id.endswith(
        "request"
    )
