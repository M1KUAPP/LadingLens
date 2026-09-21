from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from google.genai import errors

from app import gemini


def _client(result=None, exc=None):
    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value=result, side_effect=exc)
    return client


def _rate_limited():
    return errors.ClientError(429, {"error": {"message": "quota"}})


@pytest.mark.asyncio
async def test_uses_approved_default_model(monkeypatch):
    client = _client(result="ok")
    monkeypatch.setattr(gemini, "_clients", lambda: (client,))
    monkeypatch.setattr(
        gemini,
        "get_settings",
        lambda: SimpleNamespace(gemini_model="gemini-3.5-flash"),
    )

    assert await gemini.generate("hi") == "ok"
    client.aio.models.generate_content.assert_awaited_once_with(
        model="gemini-3.5-flash", contents="hi", config=None
    )


@pytest.mark.asyncio
async def test_falls_back_to_second_key_on_429(monkeypatch):
    second = _client(result="ok")
    monkeypatch.setattr(
        gemini, "_clients", lambda: (_client(exc=_rate_limited()), second)
    )
    monkeypatch.setattr(
        gemini,
        "get_settings",
        lambda: SimpleNamespace(gemini_model="gemini-3.5-flash"),
    )
    assert await gemini.generate("hi") == "ok"
    second.aio.models.generate_content.assert_awaited_once_with(
        model="gemini-3.5-flash", contents="hi", config=None
    )


@pytest.mark.asyncio
async def test_raises_when_every_key_is_rate_limited(monkeypatch):
    monkeypatch.setattr(
        gemini,
        "_clients",
        lambda: (_client(exc=_rate_limited()), _client(exc=_rate_limited())),
    )
    monkeypatch.setattr(
        gemini,
        "get_settings",
        lambda: SimpleNamespace(gemini_model="gemini-3.5-flash"),
    )
    with pytest.raises(errors.ClientError):
        await gemini.generate("hi")


@pytest.mark.asyncio
async def test_no_keys_configured(monkeypatch):
    monkeypatch.setattr(gemini, "_clients", lambda: ())
    with pytest.raises(RuntimeError):
        await gemini.generate("hi")


def test_generate_has_no_per_call_model_override() -> None:
    assert "model" not in gemini.generate.__annotations__


@pytest.mark.asyncio
async def test_traced_call_reports_second_key_after_429(monkeypatch):
    second = _client(result="ok")
    monkeypatch.setattr(
        gemini, "_clients", lambda: (_client(exc=_rate_limited()), second)
    )
    monkeypatch.setattr(
        gemini, "get_settings", lambda: SimpleNamespace(gemini_model="gemini-3.5-flash")
    )

    response, attempts = await gemini.generate_traced("hi")

    assert response == "ok"
    assert attempts == (
        gemini.KeyAttempt(key_index=1, outcome="RATE_LIMITED", status_code=429),
        gemini.KeyAttempt(key_index=2, outcome="SUCCEEDED", status_code=None),
    )


@pytest.mark.asyncio
async def test_traced_call_never_uses_second_key_for_non_429(monkeypatch):
    second = _client(result="ok")
    rejected = errors.ClientError(400, {"error": {"message": "bad request"}})
    monkeypatch.setattr(gemini, "_clients", lambda: (_client(exc=rejected), second))
    monkeypatch.setattr(
        gemini, "get_settings", lambda: SimpleNamespace(gemini_model="gemini-3.5-flash")
    )

    with pytest.raises(gemini.GeminiCallError) as caught:
        await gemini.generate_traced("hi")

    assert caught.value.error is rejected
    assert caught.value.attempts == (
        gemini.KeyAttempt(key_index=1, outcome="FAILED", status_code=400),
    )
    second.aio.models.generate_content.assert_not_awaited()


@pytest.mark.asyncio
async def test_traced_call_without_keys_is_not_configured(monkeypatch):
    monkeypatch.setattr(gemini, "_clients", lambda: ())
    with pytest.raises(gemini.GeminiNotConfigured):
        await gemini.generate_traced("hi")
