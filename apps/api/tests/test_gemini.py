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
    assert await gemini.generate("hi", model="m") == "ok"
    second.aio.models.generate_content.assert_awaited_once()


@pytest.mark.asyncio
async def test_raises_when_every_key_is_rate_limited(monkeypatch):
    monkeypatch.setattr(
        gemini,
        "_clients",
        lambda: (_client(exc=_rate_limited()), _client(exc=_rate_limited())),
    )
    with pytest.raises(errors.ClientError):
        await gemini.generate("hi", model="m")


@pytest.mark.asyncio
async def test_no_keys_configured(monkeypatch):
    monkeypatch.setattr(gemini, "_clients", lambda: ())
    with pytest.raises(RuntimeError):
        await gemini.generate("hi", model="m")
