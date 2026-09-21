from __future__ import annotations

import asyncio
from typing import Any

import pytest

from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevDocumentRoleClient,
    JevFailureCode,
    JevProviderFailure,
    RoleDocument,
)


class _FakeRetryPolicy:
    def __init__(self, *, max_retries: int):
        self.max_retries = max_retries


class _FakeChoice:
    def __init__(self, *, instructions: str, criteria: dict[str, str]):
        self.instructions = instructions
        self.criteria = criteria


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


@pytest.fixture(autouse=True)
def _fake_sdk(monkeypatch):
    monkeypatch.setattr("app.jev._sdk_types", lambda: (_FakeChoice, _FakeRetryPolicy))


def _answer(role: str = "SI") -> dict[str, object]:
    probabilities = {"SI": 0.05, "DRAFT_BL": 0.05, "OTHER": 0.05}
    probabilities[role] = 0.9
    return {
        "type": "choice",
        "choice": role,
        "confidence": 0.9,
        "probabilities": probabilities,
    }


def _response(
    answers: dict[str, object], model: str = JEV_MODEL, request_id: str = "req-1"
) -> dict[str, object]:
    return {"model": model, "request_id": request_id, "answers": answers}


DOCS = [
    RoleDocument(document_id="att-si", text="SHIPPING INSTRUCTION\nShipper: ACME"),
    RoleDocument(document_id="att-bl", text="BILL OF LADING (DRAFT)\nSHIPPER: ACME"),
]


@pytest.mark.asyncio
async def test_each_document_is_asked_alone_by_content_only():
    # Asked together, the pinned model mixes the documents up (issue #77), so
    # every call carries exactly one document and one question.
    client = _FakeSystemOneClient(
        [
            _response({"att-si": _answer("SI")}, request_id="req-si"),
            _response({"att-bl": _answer("DRAFT_BL")}, request_id="req-bl"),
        ]
    )

    decisions = await JevDocumentRoleClient(client).decide(
        DOCS, correlation_id="corr-1"
    )

    assert [decision.role for decision in decisions] == [
        DocumentRole.SI,
        DocumentRole.DRAFT_BL,
    ]
    assert decisions[0].probabilities == {"SI": 0.9, "DRAFT_BL": 0.05, "OTHER": 0.05}
    assert decisions[0].returned_model == JEV_MODEL
    assert [decision.provider_request_id for decision in decisions] == [
        "req-si",
        "req-bl",
    ]
    assert len(client.calls) == 2
    for call, document in zip(client.calls, DOCS, strict=True):
        assert call["model"] == JEV_MODEL
        assert set(call["questions"]) == {document.document_id}
        criteria = call["questions"][document.document_id].criteria
        assert set(criteria) == {"SI", "DRAFT_BL", "OTHER"}
        assert call["state"] == {
            "documents": {document.document_id: {"text": document.text}}
        }
        assert call["extra_headers"] == {"X-Correlation-ID": "corr-1"}


class _OverlapCheckingClient:
    """Answers only once every document's call is in flight."""

    def __init__(self, expected: int) -> None:
        self.expected = expected
        self.in_flight = 0
        self.all_in_flight = asyncio.Event()

    async def system_one(self, **kwargs: Any) -> object:
        self.in_flight += 1
        if self.in_flight == self.expected:
            self.all_in_flight.set()
        await self.all_in_flight.wait()
        [document_id] = kwargs["questions"]
        role = "SI" if document_id == "att-si" else "DRAFT_BL"
        return _response({document_id: _answer(role)})


@pytest.mark.asyncio
async def test_the_documents_are_asked_about_concurrently():
    client = _OverlapCheckingClient(expected=len(DOCS))

    decisions = await asyncio.wait_for(
        JevDocumentRoleClient(client).decide(DOCS, correlation_id="c"), timeout=2
    )

    assert [decision.role for decision in decisions] == [
        DocumentRole.SI,
        DocumentRole.DRAFT_BL,
    ]


@pytest.mark.asyncio
async def test_long_documents_are_truncated_before_sending():
    long_doc = RoleDocument(document_id="d", text="x" * 10_000)
    client = _FakeSystemOneClient([_response({"d": _answer("OTHER")})])

    await JevDocumentRoleClient(client).decide([long_doc], correlation_id="c")

    assert len(client.calls[0]["state"]["documents"]["d"]["text"]) == 6000


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        _response({"att-other": _answer("DRAFT_BL")}),  # answers another document
        _response({"att-bl": _answer("INVOICE")}),
        _response({"att-bl": _answer("DRAFT_BL")}, model="jev-latest"),
        _response(
            {
                "att-bl": {
                    "type": "choice",
                    "choice": "OTHER",
                    "confidence": 0.9,
                    "probabilities": {"SI": 0.05, "DRAFT_BL": 0.9, "OTHER": 0.05},
                },
            }
        ),  # choice is not the most probable label
    ],
)
async def test_invalid_answers_fail_closed_without_partial_results(response):
    client = _FakeSystemOneClient([_response({"att-si": _answer("SI")}), response])

    with pytest.raises(JevProviderFailure) as caught:
        await JevDocumentRoleClient(client).decide(DOCS, correlation_id="c")

    assert caught.value.email_ids == ("att-si", "att-bl")


@pytest.mark.asyncio
async def test_timeout_is_a_retryable_provider_failure():
    client = _FakeSystemOneClient([TimeoutError()])

    with pytest.raises(JevProviderFailure) as caught:
        await JevDocumentRoleClient(client).decide(DOCS, correlation_id="c")

    assert caught.value.code is JevFailureCode.TIMEOUT
    assert caught.value.retryable is True


@pytest.mark.asyncio
async def test_one_document_failing_fails_the_whole_request_retryably():
    client = _FakeSystemOneClient(
        [
            _response({"att-si": _answer("SI")}),
            _response({"att-bl": _answer("DRAFT_BL")}),
            TimeoutError("provider timeout"),
        ]
    )
    docs = [
        *DOCS,
        RoleDocument(document_id="att-inv", text="COMMERCIAL INVOICE"),
    ]

    with pytest.raises(JevProviderFailure) as caught:
        await JevDocumentRoleClient(client).decide(
            docs, correlation_id="corr-late-failure"
        )

    assert caught.value.code is JevFailureCode.TIMEOUT
    assert caught.value.email_ids == ("att-si", "att-bl", "att-inv")
    assert len(client.calls) == 3


@pytest.mark.asyncio
async def test_empty_input_makes_no_request():
    client = _FakeSystemOneClient([])
    assert await JevDocumentRoleClient(client).decide([]) == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_a_failed_document_keeps_the_provider_error_as_its_cause():
    timeout = TimeoutError("provider timeout")
    client = _FakeSystemOneClient([timeout, _response({"att-bl": _answer("DRAFT_BL")})])

    with pytest.raises(JevProviderFailure) as caught:
        await JevDocumentRoleClient(client).decide(DOCS, correlation_id="c")

    assert caught.value.__cause__ is timeout
