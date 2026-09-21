"""The grounded control-graph chat: corpus shape, retrieval, and fail-closed.

The provider is a fake injected into GraphChatService; no Gemini key or
network is needed. The corpus itself is built from the real seed catalog.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from google.genai import errors

from app import gemini
from app.api.errors import ApiProblem
from app.config import get_settings
from app.gemini import GeminiCallError, KeyAttempt
from app.graph_chat import (
    ChatTurn,
    GraphChatService,
    build_corpus,
    retrieve,
)
from app.seed_catalog import SeedCatalog, load_seed_catalog


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def catalog() -> SeedCatalog:
    return await load_seed_catalog(get_settings())


def _model_answer(**overrides) -> dict:
    answer = {
        "answer": "email_001 is one such email [1].",
        "refused": False,
        "citations": [{"ref": 1, "node_id": "email:email_001", "edge_id": None}],
        "followups": [
            "Which emails are held?",
            "Which cases mismatch?",
            "Which ports appear?",
            "Which shipments lack a case?",
        ],
    }
    answer.update(overrides)
    return answer


def _ok_payload(answer: dict):
    return SimpleNamespace(text=json.dumps(answer)), (
        KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),
    )


def _recording_generate(record: dict, answer: dict):
    async def generate(contents, config=None, *, model=None):
        record["contents"] = contents
        record["config"] = config
        record["model"] = model
        return _ok_payload(answer)

    return generate


# --- corpus shape ------------------------------------------------------------


async def test_every_corpus_node_id_is_kind_colon_identifier(
    catalog: SeedCatalog,
) -> None:
    corpus = build_corpus(catalog)

    assert corpus.nodes
    for node in corpus.nodes:
        assert node.id == f"{node.kind}:{node.identifier}"
    assert len({node.id for node in corpus.nodes}) == len(corpus.nodes)
    assert len({edge.id for edge in corpus.edges}) == len(corpus.edges)


async def test_no_corpus_edge_endpoint_dangles(catalog: SeedCatalog) -> None:
    corpus = build_corpus(catalog)
    node_ids = {node.id for node in corpus.nodes}

    assert corpus.edges
    for edge in corpus.edges:
        assert edge.source in node_ids
        assert edge.target in node_ids


async def test_retrieval_caps_the_subset_and_keeps_only_internal_edges(
    catalog: SeedCatalog,
) -> None:
    corpus = build_corpus(catalog)
    subset = retrieve(corpus, "email")

    assert len(subset.nodes) == 60
    node_ids = {node.id for node in subset.nodes}
    assert all(
        edge.source in node_ids and edge.target in node_ids for edge in subset.edges
    )


# --- grounding validation -----------------------------------------------------


async def test_a_citation_outside_the_retrieved_subset_is_ungrounded(
    catalog: SeedCatalog,
) -> None:
    corpus = build_corpus(catalog)
    subset = retrieve(corpus, "email_001")
    sent = {node.id for node in subset.nodes}
    uncited = next(node.id for node in corpus.nodes if node.id not in sent)
    service = GraphChatService(
        get_settings(),
        generate=_recording_generate(
            {},
            _model_answer(citations=[{"ref": 1, "node_id": uncited, "edge_id": None}]),
        ),
    )

    result = await service.answer("email_001", [], catalog)

    assert result["grounded"] is False
    assert result["citations"] == []
    assert result["highlight"] == {
        "node_ids": [],
        "edge_ids": [],
        "focus_node_id": None,
    }
    # No part of the bad answer leaks through.
    assert result["answer"] != "email_001 is one such email [1]."
    assert len(result["followups"]) == 4


async def test_an_answer_with_no_citations_and_no_refusal_is_ungrounded(
    catalog: SeedCatalog,
) -> None:
    service = GraphChatService(
        get_settings(),
        generate=_recording_generate(
            {}, _model_answer(citations=[], answer="There are three.")
        ),
    )

    result = await service.answer("email_001", [], catalog)

    assert result["grounded"] is False
    assert result["citations"] == []


async def test_an_explicit_refusal_is_a_first_class_ungrounded_answer(
    catalog: SeedCatalog,
) -> None:
    refusal = _model_answer(
        answer="The control graph cannot answer that.",
        refused=True,
        citations=[],
        followups=["q1", "q2", "q3", "q4"],
    )
    service = GraphChatService(
        get_settings(), generate=_recording_generate({}, refusal)
    )

    result = await service.answer("email_001", [], catalog)

    assert result["grounded"] is False
    assert result["answer"] == "The control graph cannot answer that."
    assert result["citations"] == []
    assert result["followups"] == ["q1", "q2", "q3", "q4"]


async def test_a_grounded_answer_carries_only_sent_ids(catalog: SeedCatalog) -> None:
    corpus = build_corpus(catalog)
    subset = retrieve(corpus, "email_001")
    node_id = subset.nodes[0].id
    answer = _model_answer(citations=[{"ref": 1, "node_id": node_id, "edge_id": None}])
    service = GraphChatService(get_settings(), generate=_recording_generate({}, answer))

    result = await service.answer("email_001", [], catalog)

    assert result["grounded"] is True
    assert result["answer"] == "email_001 is one such email [1]."
    assert result["citations"] == [
        {
            "ref": 1,
            "node_id": node_id,
            "edge_id": None,
            "label": subset.nodes[0].identifier,
            "kind": subset.nodes[0].kind,
            "state": subset.nodes[0].state,
        }
    ]
    assert node_id in result["highlight"]["node_ids"]
    assert result["highlight"]["focus_node_id"] == node_id
    assert result["provider"]["decision_source"] == "live"


async def test_an_inline_marker_without_a_citation_is_ungrounded(
    catalog: SeedCatalog,
) -> None:
    service = GraphChatService(
        get_settings(),
        generate=_recording_generate(
            {}, _model_answer(answer="Two emails differ [1][9].")
        ),
    )

    result = await service.answer("email_001", [], catalog)

    assert result["grounded"] is False


# --- request validation -------------------------------------------------------


async def test_a_question_over_500_characters_is_rejected(
    catalog: SeedCatalog,
) -> None:
    service = GraphChatService(get_settings(), generate=_recording_generate({}, {}))

    with pytest.raises(ApiProblem) as caught:
        await service.answer("x" * 501, [], catalog)

    assert caught.value.status == 422


async def test_a_blank_question_is_rejected(catalog: SeedCatalog) -> None:
    service = GraphChatService(get_settings(), generate=_recording_generate({}, {}))

    with pytest.raises(ApiProblem) as caught:
        await service.answer("   ", [], catalog)

    assert caught.value.status == 422


async def test_history_beyond_six_turns_is_rejected(catalog: SeedCatalog) -> None:
    service = GraphChatService(get_settings(), generate=_recording_generate({}, {}))
    history = [ChatTurn(role="user", content="hi")] * 7

    with pytest.raises(ApiProblem) as caught:
        await service.answer("email_001", history, catalog)

    assert caught.value.status == 422


async def test_a_history_turn_over_2000_characters_is_rejected(
    catalog: SeedCatalog,
) -> None:
    service = GraphChatService(get_settings(), generate=_recording_generate({}, {}))
    history = [ChatTurn(role="assistant", content="x" * 2001)]

    with pytest.raises(ApiProblem) as caught:
        await service.answer("email_001", history, catalog)

    assert caught.value.status == 422


# --- the outgoing provider call -----------------------------------------------


async def test_the_chat_path_calls_the_pinned_flash_lite_model(
    catalog: SeedCatalog,
) -> None:
    record: dict = {}
    service = GraphChatService(
        get_settings(), generate=_recording_generate(record, _model_answer())
    )

    await service.answer("email_001", [], catalog)

    assert record["model"] == "gemini-3.5-flash-lite"


async def test_the_extraction_default_model_is_unchanged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value="ok")
    monkeypatch.setattr(gemini, "_clients", lambda: (client,))
    monkeypatch.setattr(
        gemini,
        "get_settings",
        lambda: SimpleNamespace(gemini_model="gemini-3.5-flash"),
    )

    await gemini.generate_traced("hi")

    client.aio.models.generate_content.assert_awaited_once_with(
        model="gemini-3.5-flash", contents="hi", config=None
    )


async def test_the_outgoing_request_never_ends_on_a_model_turn(
    catalog: SeedCatalog,
) -> None:
    record: dict = {}
    service = GraphChatService(
        get_settings(), generate=_recording_generate(record, _model_answer())
    )
    history = [
        ChatTurn(role="user", content="first"),
        ChatTurn(role="assistant", content="answered"),
    ]

    await service.answer("email_001", history, catalog)

    contents = record["contents"]
    assert contents[-1].role == "user"
    assert [content.role for content in contents] == ["user", "model", "user"]


async def test_the_chat_config_sets_no_sampling_parameters(
    catalog: SeedCatalog,
) -> None:
    record: dict = {}
    service = GraphChatService(
        get_settings(), generate=_recording_generate(record, _model_answer())
    )

    await service.answer("email_001", [], catalog)

    config = record["config"]
    for parameter in ("temperature", "top_p", "top_k"):
        assert getattr(config, parameter, None) is None
        assert parameter not in config.model_dump(exclude_none=True)


# --- generate_with_backoff -----------------------------------------------------


def _api_error(code: int) -> errors.APIError:
    return errors.ClientError(code, {"error": {"message": "boom"}})


def _failing_then_ok(failures: list[int], record: dict):
    async def generate_traced(contents, config=None, *, attempts=None, model=None):
        record["calls"] = record.get("calls", 0) + 1
        if attempts is not None:
            attempts.append(
                KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429)
            )
        if record["calls"] <= len(failures):
            raise GeminiCallError(_api_error(failures[record["calls"] - 1]), ())
        return "ok", tuple(attempts or ())

    return generate_traced


async def test_backoff_retries_a_429(monkeypatch: pytest.MonkeyPatch) -> None:
    record: dict = {}
    monkeypatch.setattr(gemini, "generate_traced", _failing_then_ok([429, 429], record))
    sleeps: list[float] = []

    async def sleep(duration: float) -> None:
        sleeps.append(duration)

    response, _ = await gemini.generate_with_backoff(
        "hi", None, sleep=sleep, uniform=lambda a, b: b
    )

    assert response == "ok"
    assert record["calls"] == 3
    assert sleeps == [0.4, 0.8]


async def test_backoff_retries_a_503(monkeypatch: pytest.MonkeyPatch) -> None:
    record: dict = {}
    monkeypatch.setattr(gemini, "generate_traced", _failing_then_ok([503], record))

    async def sleep(duration: float) -> None:
        pass

    response, _ = await gemini.generate_with_backoff(
        "hi", None, sleep=sleep, uniform=lambda a, b: b
    )

    assert response == "ok"
    assert record["calls"] == 2


async def test_backoff_does_not_retry_a_400(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    record: dict = {}
    monkeypatch.setattr(gemini, "generate_traced", _failing_then_ok([400], record))

    async def sleep(duration: float) -> None:
        raise AssertionError("a 400 must not be retried")

    with pytest.raises(GeminiCallError):
        await gemini.generate_with_backoff(
            "hi", None, sleep=sleep, uniform=lambda a, b: b
        )

    assert record["calls"] == 1


async def test_backoff_stops_at_the_wall_clock_budget(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    record: dict = {}
    monkeypatch.setattr(
        gemini, "generate_traced", _failing_then_ok([503, 503, 503], record)
    )
    now = [0.0]
    sleeps: list[float] = []

    def monotonic() -> float:
        # Each provider call burns 6 seconds of the 10-second budget.
        return now[0]

    async def fake_traced(contents, config=None, *, attempts=None, model=None):
        record["calls"] = record.get("calls", 0) + 1
        now[0] += 6.0
        raise GeminiCallError(_api_error(503), ())

    monkeypatch.setattr(gemini, "generate_traced", fake_traced)

    async def sleep(duration: float) -> None:
        sleeps.append(duration)

    with pytest.raises(GeminiCallError):
        await gemini.generate_with_backoff(
            "hi",
            None,
            sleep=sleep,
            monotonic=monotonic,
            uniform=lambda a, b: b,
        )

    assert record["calls"] == 2
    assert sleeps == [0.4]
