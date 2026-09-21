"""build_services wires Jev's real clients only when TYPESAFE_API_KEY is set.

Without a key, a judge check must still fail closed -- through the same
JevProviderFailure contract as any other provider outage -- and label
itself `provider_unconfigured` so the friendly failure message and the
prepared fallback both work the way the product promises.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import pytest
import pytest_asyncio
from typesafe_sdk import AsyncTypeSafeClient

from app.api import deps
from app.config import get_settings
from app.guest import SESSION_HEADER
from app.jev import JevDocumentRoleClient, JevEquivalenceClient
from app.main import app

SI_TEXT = """SHIPPING INSTRUCTION
========================================

Shipper: WIRING TEST TRADING PTE LTD
Consignee: WIRING TEST RECEIVER CO LTD
Notify Party: WIRING TEST LOGISTICS LTD
Port of Loading: SINGAPORE (SGSIN)
Port of Discharge: BUSAN, KOREA (KRPUS)
No. of Containers: 1 x 20'GP
Gross Weight (KG): 1,000 KG
"""
BL_TEXT = """BILL OF LADING (DRAFT)
========================================

SHIPPER: WIRING TEST TRADING PTE LTD
CONSIGNEE: WIRING TEST RECEIVER CO LTD
Notify: WIRING TEST LOGISTICS LTD
Port of Loading (POL): SINGAPORE (SGSIN)
POD: BUSAN, KOREA (KRPUS)
Container Count: 1 x 20'GP
Gross Wt (kgs): 1,000 KG
"""


@pytest.fixture(autouse=True)
def _clean_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """A developer's local .env must never reach a real provider from here."""
    settings = get_settings()
    for field in (
        "gemini_api_key",
        "gemini_api_key_2",
        "typesafe_api_key",
        "gcs_bucket",
    ):
        monkeypatch.setattr(settings, field, None)


async def test_build_services_wires_jev_only_when_the_typesafe_key_is_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(deps, "get_session_factory", lambda: object())
    settings = get_settings()

    unconfigured = deps.build_services(settings)
    assert unconfigured.typesafe_client is None
    pipeline = unconfigured.judge._pipeline
    assert isinstance(pipeline._roles, deps._JevNotWired)
    assert pipeline._roles is pipeline._equivalence

    monkeypatch.setattr(settings, "typesafe_api_key", "test-typesafe-key")
    configured = deps.build_services(settings)
    try:
        assert isinstance(configured.typesafe_client, AsyncTypeSafeClient)
        pipeline = configured.judge._pipeline
        assert isinstance(pipeline._roles, JevDocumentRoleClient)
        assert isinstance(pipeline._equivalence, JevEquivalenceClient)
        # Both wrappers share the one client; neither opens its own.
        assert pipeline._roles._client is configured.typesafe_client
        assert pipeline._equivalence._client is configured.typesafe_client
    finally:
        await configured.typesafe_client.aclose()


@pytest_asyncio.fixture
async def client(
    monkeypatch: pytest.MonkeyPatch, postgres_session_factory
) -> AsyncIterator[httpx.AsyncClient]:
    monkeypatch.setattr(deps, "get_session_factory", lambda: postgres_session_factory)
    services = deps.build_services(get_settings())
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client
    app.state.services = previous_services


async def _guest(client: httpx.AsyncClient) -> dict[str, str]:
    created = await client.post("/api/session")
    return {SESSION_HEADER: created.json()["session_token"]}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_judge_run_without_a_typesafe_key_fails_closed_as_unconfigured(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest(client)

    response = await client.post(
        "/api/judge/runs",
        files={
            "si_file": ("SYN_SI_wiring.txt", SI_TEXT.encode(), "text/plain"),
            "draft_bl_file": ("SYN_BL_wiring.txt", BL_TEXT.encode(), "text/plain"),
        },
        data={"synthetic_confirmed": "true"},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source"] == "live"
    assert body["state"] == "FAILED"
    assert body["outcome"] is None
    assert body["field_verdicts"] == []
    assert body["failure"] == {
        "code": "provider_unconfigured",
        "retryable": False,
        "message": "Live AI checks are not configured on this server.",
    }


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_the_prepared_fallback_still_works_without_a_typesafe_key(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest(client)

    response = await client.get("/api/judge/fallback", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "PREPARED FALLBACK"
    assert body["source"] == "prepared"
