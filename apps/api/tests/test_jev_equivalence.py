from __future__ import annotations

from typing import Any

import pytest

from app.contracts import ComparedField
from app.jev import (
    JEV_MODEL,
    EquivalenceQuestion,
    JevEquivalenceClient,
    JevFailureCode,
    JevProviderFailure,
)


class _FakeRetryPolicy:
    def __init__(self, *, max_retries: int):
        self.max_retries = max_retries


class _FakeNoul:
    def __init__(self, *, instructions: str, criteria: dict[str, str]):
        self.instructions = instructions
        self.criteria = criteria


class _Client:
    def __init__(self, responses):
        self.responses, self.calls = iter(responses), []

    async def system_one(self, **kwargs: Any) -> object:
        self.calls.append(kwargs)
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


@pytest.fixture(autouse=True)
def _fake_sdk(monkeypatch):
    monkeypatch.setattr("app.jev._sdk_types", lambda: (object, _FakeRetryPolicy))
    monkeypatch.setattr("app.jev._sdk_noul", lambda: _FakeNoul)


QUESTIONS = [
    EquivalenceQuestion(
        ComparedField.SHIPPER,
        "APRIL FINE PAPER TRADING",
        "APRIL FINE PAPER TRADING (MIDDLE EAST) FZE",
    ),
    EquivalenceQuestion(
        ComparedField.PORT_OF_DISCHARGE,
        "MOMBASA, KENYA (KEMBA)",
        "TUTICORIN, INDIA (KEMBA)",
    ),
]


def _ok(answers, model=JEV_MODEL, request_id="req-9"):
    return {"model": model, "request_id": request_id, "answers": answers}


@pytest.mark.asyncio
async def test_one_pinned_request_with_one_noul_per_text_field():
    client = _Client(
        [
            _ok(
                {
                    "shipper": {"type": "noul", "noul": 0.55},
                    "port_of_discharge": {"type": "noul", "noul": 0.02},
                }
            )
        ]
    )

    results = await JevEquivalenceClient(client).judge(QUESTIONS, correlation_id="corr")

    assert [(r.field, r.probability) for r in results] == [
        (ComparedField.SHIPPER, 0.55),
        (ComparedField.PORT_OF_DISCHARGE, 0.02),
    ]
    assert results[0].provider_request_id == "req-9"
    call = client.calls[0]
    assert len(client.calls) == 1
    assert call["model"] == JEV_MODEL
    assert set(call["questions"]) == {"shipper", "port_of_discharge"}
    assert set(call["questions"]["shipper"].criteria) == {"true", "false"}
    assert call["state"]["fields"]["shipper"] == {
        "shipping_instruction": "APRIL FINE PAPER TRADING",
        "draft_bill_of_lading": "APRIL FINE PAPER TRADING (MIDDLE EAST) FZE",
    }
    assert call["extra_headers"] == {"X-Correlation-ID": "corr"}


@pytest.mark.asyncio
async def test_numeric_fields_are_never_sent_to_jev():
    client = _Client([])
    with pytest.raises(ValueError):
        await JevEquivalenceClient(client).judge(
            [EquivalenceQuestion(ComparedField.GROSS_WEIGHT_KG, "1 KG", "2 KG")]
        )
    assert client.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        _ok({"shipper": {"type": "noul", "noul": 0.9}}),
        _ok(
            {
                "shipper": {"type": "noul", "noul": 1.5},
                "port_of_discharge": {"type": "noul", "noul": 0.1},
            }
        ),
        _ok(
            {
                "shipper": {"type": "choice", "noul": 0.9},
                "port_of_discharge": {"type": "noul", "noul": 0.1},
            }
        ),
        _ok(
            {
                "shipper": {"type": "noul", "noul": "high"},
                "port_of_discharge": {"type": "noul", "noul": 0.1},
            }
        ),
        _ok(
            {
                "shipper": {"type": "noul", "noul": 0.9},
                "port_of_discharge": {"type": "noul", "noul": 0.1},
            },
            model="jev-latest",
        ),
        _ok(
            {
                "shipper": {"type": "noul", "noul": 0.9},
                "port_of_discharge": {"type": "noul", "noul": 0.1},
            },
            request_id=None,
        ),
    ],
)
async def test_invalid_answers_fail_closed(response):
    with pytest.raises(JevProviderFailure) as caught:
        await JevEquivalenceClient(_Client([response])).judge(
            QUESTIONS, correlation_id="c"
        )
    assert caught.value.email_ids == ("shipper", "port_of_discharge")


@pytest.mark.asyncio
async def test_timeout_is_retryable():
    with pytest.raises(JevProviderFailure) as caught:
        await JevEquivalenceClient(_Client([TimeoutError()])).judge(
            QUESTIONS, correlation_id="c"
        )
    assert caught.value.code is JevFailureCode.TIMEOUT


@pytest.mark.asyncio
async def test_no_questions_makes_no_request():
    client = _Client([])
    assert await JevEquivalenceClient(client).judge([]) == []
    assert client.calls == []
