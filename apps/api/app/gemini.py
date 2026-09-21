from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import httpx
from google import genai
from google.genai import errors, types

from app.config import get_settings


@dataclass(frozen=True, slots=True)
class KeyAttempt:
    """One Gemini call on one configured key, kept for the audit trail."""

    key_index: int
    outcome: Literal["SUCCEEDED", "RATE_LIMITED", "FAILED"]
    status_code: int | None


class GeminiNotConfigured(RuntimeError):
    pass


class GeminiCallError(Exception):
    """A failed Gemini call with every key attempt that preceded it."""

    def __init__(self, error: Exception, attempts: tuple[KeyAttempt, ...]) -> None:
        super().__init__(str(error))
        self.error = error
        self.attempts = attempts


@lru_cache
def _clients() -> tuple[genai.Client, ...]:
    settings = get_settings()
    keys = [k for k in (settings.gemini_api_key, settings.gemini_api_key_2) if k]
    return tuple(genai.Client(api_key=k) for k in keys)


async def generate_traced(
    contents: types.ContentListUnion,
    config: types.GenerateContentConfigOrDict | None = None,
) -> tuple[types.GenerateContentResponse, tuple[KeyAttempt, ...]]:
    """Call Gemini; only a 429 moves the same request to the second key."""
    clients = _clients()
    if not clients:
        raise GeminiNotConfigured("GEMINI_API_KEY is not set")
    model = get_settings().gemini_model
    attempts: list[KeyAttempt] = []
    for index, client in enumerate(clients, start=1):
        try:
            response = await client.aio.models.generate_content(
                model=model, contents=contents, config=config
            )
        except errors.APIError as exc:
            rate_limited = exc.code == 429
            attempts.append(
                KeyAttempt(
                    key_index=index,
                    outcome="RATE_LIMITED" if rate_limited else "FAILED",
                    status_code=exc.code,
                )
            )
            if rate_limited and index < len(clients):
                continue
            raise GeminiCallError(exc, tuple(attempts)) from exc
        except httpx.HTTPError as exc:
            attempts.append(
                KeyAttempt(key_index=index, outcome="FAILED", status_code=None)
            )
            raise GeminiCallError(exc, tuple(attempts)) from exc
        attempts.append(
            KeyAttempt(key_index=index, outcome="SUCCEEDED", status_code=None)
        )
        return response, tuple(attempts)
    raise AssertionError("unreachable")


async def generate(
    contents: types.ContentListUnion,
    config: types.GenerateContentConfigOrDict | None = None,
) -> types.GenerateContentResponse:
    """Call Gemini, retrying once on the second key if the first is rate-limited."""
    try:
        response, _ = await generate_traced(contents, config)
    except GeminiCallError as exc:
        raise exc.error from None
    return response
