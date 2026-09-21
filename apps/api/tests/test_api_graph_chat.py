"""GET /api/graph/corpus and POST /api/graph/chat over the seeded graph.

The provider is faked at the GraphChatService seam and guest sessions are
stubbed, so these tests need neither a database nor a Gemini key.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio

from app.api.deps import Services
from app.config import get_settings
from app.gemini import KeyAttempt
from app.graph_chat import GraphChatService
from app.guest import SESSION_HEADER, GuestContext
from app.main import app
from app.seed_catalog import SEED_VERSION

_HEADERS = {SESSION_HEADER: "test-token"}

_GROUNDED = {
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


class _Guests:
    """Resolves any presented token; the chat tests need no database."""

    async def resolve(self, token: str | None) -> GuestContext | None:
        if not token:
            return None
        return GuestContext(
            guest_session_id=uuid4(),
            session_key="key",
            workspace_id=uuid4(),
            generation=1,
        )


@pytest.fixture
def record() -> dict:
    return {"answer": dict(_GROUNDED)}


@pytest_asyncio.fixture
async def client(record: dict) -> AsyncIterator[httpx.AsyncClient]:
    async def generate(contents, config=None, *, model=None):
        record["contents"] = contents
        record["config"] = config
        record["model"] = model
        return SimpleNamespace(text=json.dumps(record["answer"])), (
            KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),
        )

    settings = get_settings()
    services = Services(
        settings=settings,
        session_factory=None,
        persistence=None,
        object_store=None,
        guests=_Guests(),
        graph_chat=GraphChatService(settings, generate=generate),
    )
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client
    app.state.services = previous_services


async def test_corpus_returns_the_derived_graph(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/graph/corpus", headers=_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "prepared"
    assert body["version"] == SEED_VERSION
    assert len(body["nodes"]) > 500
    assert len(body["edges"]) > 500
    node_ids = {node["id"] for node in body["nodes"]}
    assert "email:email_001" in node_ids
    for edge in body["edges"]:
        assert edge["source"] in node_ids
        assert edge["target"] in node_ids
    for node in body["nodes"]:
        assert node["id"] == f"{node['kind']}:{node['identifier']}"


async def test_corpus_requires_a_session(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/graph/corpus")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "session_required"


async def test_chat_returns_a_grounded_answer(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/graph/chat", json={"question": "email_001"}, headers=_HEADERS
    )

    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is True
    assert body["answer"] == "email_001 is one such email [1]."
    assert body["citations"][0]["node_id"] == "email:email_001"
    assert body["provider"] == {
        "model": "gemini-3.5-flash-lite",
        "decision_source": "live",
        "attempts": 1,
    }
    assert len(body["followups"]) == 4


async def test_chat_without_a_session_is_unauthorized(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post("/api/graph/chat", json={"question": "hi"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "session_required"


async def test_a_refusal_is_200_with_grounded_false_and_four_followups(
    client: httpx.AsyncClient, record: dict
) -> None:
    record["answer"] = {
        "answer": "The control graph does not answer that.",
        "refused": True,
        "citations": [],
        "followups": ["q1", "q2", "q3", "q4"],
    }

    response = await client.post(
        "/api/graph/chat",
        json={"question": "What is the weather?"},
        headers=_HEADERS,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is False
    assert body["answer"] == "The control graph does not answer that."
    assert body["citations"] == []
    assert body["highlight"] == {
        "node_ids": [],
        "edge_ids": [],
        "focus_node_id": None,
    }
    assert len(body["followups"]) == 4


async def test_a_question_over_500_characters_is_rejected(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(
        "/api/graph/chat", json={"question": "x" * 501}, headers=_HEADERS
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


async def test_history_beyond_six_turns_is_rejected(
    client: httpx.AsyncClient,
) -> None:
    history = [{"role": "user", "content": "hi"}] * 7

    response = await client.post(
        "/api/graph/chat",
        json={"question": "email_001", "history": history},
        headers=_HEADERS,
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


async def test_the_chat_path_calls_the_pinned_flash_lite_model(
    client: httpx.AsyncClient, record: dict
) -> None:
    await client.post(
        "/api/graph/chat", json={"question": "email_001"}, headers=_HEADERS
    )

    assert record["model"] == "gemini-3.5-flash-lite"
