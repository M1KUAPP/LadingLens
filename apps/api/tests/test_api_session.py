from collections.abc import AsyncIterator
from hashlib import sha256

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import Services
from app.config import get_settings
from app.guest import SEED_VERSION, SESSION_HEADER, GuestSessions
from app.main import app
from app.models import GuestSession
from app.persistence import PersistenceService
from app.storage import InMemoryPrivateObjectStore


@pytest_asyncio.fixture
async def client(postgres_session_factory) -> AsyncIterator[httpx.AsyncClient]:
    object_store = InMemoryPrivateObjectStore()
    persistence = PersistenceService(postgres_session_factory, object_store)
    services = Services(
        settings=get_settings(),
        session_factory=postgres_session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=GuestSessions(postgres_session_factory, persistence),
    )
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client
    app.state.services = previous_services


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_create_session_returns_token_and_stores_only_its_hash(
    client: httpx.AsyncClient, postgres_session_factory
) -> None:
    response = await client.post("/api/session")

    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    token = body["session_token"]
    assert len(token) >= 43
    assert body["generation"] == 1
    assert body["seed_version"] == SEED_VERSION

    expected_key = sha256(token.encode()).hexdigest()
    async with postgres_session_factory() as session:
        stored = await session.scalar(
            select(GuestSession).where(GuestSession.session_key == expected_key)
        )
        raw_token_row = await session.scalar(
            select(GuestSession).where(GuestSession.session_key == token)
        )
    assert stored is not None
    assert raw_token_row is None


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_get_session_requires_a_valid_token(client: httpx.AsyncClient) -> None:
    missing = await client.get("/api/session")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "session_required"

    unknown = await client.get(
        "/api/session", headers={SESSION_HEADER: "unknown-token"}
    )
    assert unknown.status_code == 401
    assert unknown.json()["error"]["code"] == "session_required"

    created = await client.post("/api/session")
    token = created.json()["session_token"]

    ok = await client.get("/api/session", headers={SESSION_HEADER: token})
    assert ok.status_code == 200
    assert ok.json() == {"generation": 1, "seed_version": SEED_VERSION}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_reset_advances_generation_and_retires_the_old_workspace(
    client: httpx.AsyncClient,
) -> None:
    created = await client.post("/api/session")
    token = created.json()["session_token"]
    headers = {SESSION_HEADER: token}

    first_reset = await client.post("/api/reset", headers=headers)
    assert first_reset.status_code == 200
    first_body = first_reset.json()
    assert first_body["generation"] == 2
    assert first_body["seed_version"] == SEED_VERSION
    assert "reset_at" in first_body

    second_reset = await client.post("/api/reset", headers=headers)
    assert second_reset.status_code == 200
    assert second_reset.json()["generation"] == 3

    current = await client.get("/api/session", headers=headers)
    assert current.json()["generation"] == 3


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_resetting_one_session_does_not_affect_another(
    client: httpx.AsyncClient,
) -> None:
    session_a = await client.post("/api/session")
    session_b = await client.post("/api/session")
    token_a = session_a.json()["session_token"]
    token_b = session_b.json()["session_token"]

    reset_a = await client.post("/api/reset", headers={SESSION_HEADER: token_a})
    assert reset_a.json()["generation"] == 2

    state_b = await client.get("/api/session", headers={SESSION_HEADER: token_b})
    assert state_b.json()["generation"] == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_reset_maps_a_database_failure_to_503(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    created = await client.post("/api/session")
    token = created.json()["session_token"]

    async def _boom(*_args, **_kwargs):
        raise SQLAlchemyError("db unavailable")

    monkeypatch.setattr(PersistenceService, "reset_guest_namespace", _boom)

    response = await client.post("/api/reset", headers={SESSION_HEADER: token})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "reset_unavailable"
