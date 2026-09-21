from __future__ import annotations

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


def _response(answers: dict[str, object], model: str = JEV_MODEL) -> dict[str, object]:
    return {"model": model, "request_id": "req-1", "answers": answers}


DOCS = [
    RoleDocument(document_id="att-si", text="SHIPPING INSTRUCTION\nShipper: ACME"),
    RoleDocument(document_id="att-bl", text="BILL OF LADING (DRAFT)\nSHIPPER: ACME"),
]


@pytest.mark.asyncio
async def test_one_batched_pinned_choice_per_document_without_file_names():
    client = _FakeSystemOneClient(
        [
            _response({"att-si": _answer("SI")}),
            _response({"att-bl": _answer("DRAFT_BL")}),
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
    assert decisions[0].provider_request_id == "req-1"
    call = client.calls[0]
    assert call["model"] == JEV_MODEL
    assert set(call["questions"]) == {"att-si"}
    assert set(call["questions"]["att-si"].criteria) == {"SI", "DRAFT_BL", "OTHER"}
    assert call["state"] == {"documents": {"att-si": {"text": DOCS[0].text}}}
    assert call["extra_headers"] == {"X-Correlation-ID": "corr-1"}


@pytest.mark.asyncio
async def test_long_documents_are_truncated_before_sending():
    long_doc = RoleDocument(document_id="d", text="x" * 10_000)
    client = _FakeSystemOneClient([_response({"d": _answer("OTHER")})])

    await JevDocumentRoleClient(client).decide([long_doc], correlation_id="c")

    assert len(client.calls[0]["state"]["documents"]["d"]["text"]) == 6000


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "responses",
    [
        [_response({"att-si": _answer("SI")}), _response({})],  # missing a document
        [
            _response({"att-si": _answer("SI")}),
            _response({"att-bl": _answer("INVOICE")}),
        ],
        [
            _response({"att-si": _answer("SI")}),
            _response({"att-bl": _answer("DRAFT_BL")}, model="jev-latest"),
        ],
        [  # choice is not the most probable label
            _response(
                {
                    "att-si": {
                        "type": "choice",
                        "choice": "OTHER",
                        "confidence": 0.9,
                        "probabilities": {"SI": 0.9, "DRAFT_BL": 0.05, "OTHER": 0.05},
                    }
                }
            ),
            _response({"att-bl": _answer("DRAFT_BL")}),
        ],
        [  # an answer keyed to a document this request did not ask about
            _response({"att-si": _answer("SI"), "att-bl": _answer("DRAFT_BL")}),
        ],
    ],
)
async def test_invalid_answers_fail_closed_without_partial_results(responses):
    client = _FakeSystemOneClient(responses)

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
async def test_later_batch_failure_marks_the_whole_uncommitted_request_retryable():
    client = _FakeSystemOneClient(
        [
            _response({"att-si": _answer("SI"), "att-bl": _answer("DRAFT_BL")}),
            TimeoutError("provider timeout"),
        ]
    )
    docs = [
        *DOCS,
        RoleDocument(document_id="att-inv", text="COMMERCIAL INVOICE"),
    ]
    classifier = JevDocumentRoleClient(client, batch_size=2)

    with pytest.raises(JevProviderFailure) as caught:
        await classifier.decide(docs, correlation_id="corr-late-failure")

    assert caught.value.code is JevFailureCode.TIMEOUT
    assert caught.value.email_ids == ("att-si", "att-bl", "att-inv")
    assert len(client.calls) == 2


@pytest.mark.asyncio
async def test_empty_input_makes_no_request():
    client = _FakeSystemOneClient([])
    assert await JevDocumentRoleClient(client).decide([]) == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_each_document_is_asked_about_in_its_own_request():
    """One document per call, so an answer cannot borrow its neighbour's role.

    Live ``jev-1.13.0`` returns the first document's role for every document
    sharing a request, with a valid envelope and a distinct key per document,
    so only isolation keeps the answer honest. See issue #77.
    """
    client = _FakeSystemOneClient(
        [
            _response({"att-si": _answer("SI")}),
            _response({"att-bl": _answer("DRAFT_BL")}),
        ]
    )

    decisions = await JevDocumentRoleClient(client).decide(DOCS, correlation_id="c")

    assert [decision.role.value for decision in decisions] == ["SI", "DRAFT_BL"]
    assert len(client.calls) == 2
    for call, document in zip(client.calls, DOCS, strict=True):
        assert set(call["questions"]) == {document.document_id}
        assert set(call["state"]["documents"]) == {document.document_id}
