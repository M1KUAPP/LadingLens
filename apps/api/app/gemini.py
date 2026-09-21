import asyncio
import random
import time
from collections.abc import Awaitable, Callable
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
    *,
    attempts: list[KeyAttempt] | None = None,
    model: str | None = None,
) -> tuple[types.GenerateContentResponse, tuple[KeyAttempt, ...]]:
    """Call Gemini; only a 429 moves the same request to the second key.

    Pass a caller-owned `attempts` list to observe each KeyAttempt as it
    happens, so a cancellation (e.g. a caller-side timeout) that cuts this
    call off mid-flight still leaves the already-completed attempts visible
    to the caller. `model` overrides the pinned extraction model for callers
    with their own pin (the chat path uses `Settings.gemini_chat_model`).
    """
    clients = _clients()
    if not clients:
        raise GeminiNotConfigured("GEMINI_API_KEY is not set")
    model = model or get_settings().gemini_model
    if attempts is None:
        attempts = []
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


# The chat path is the one caller allowed to retry a transient failure: an
# interactive answer that freezes while it silently retries reads worse than
# an honest error, so the retries are bounded in count and in wall-clock.
_RETRYABLE_STATUS = frozenset({429, 503})


async def generate_with_backoff(
    contents: types.ContentListUnion,
    config: types.GenerateContentConfigOrDict | None = None,
    *,
    model: str | None = None,
    max_retries: int = 2,
    base_seconds: float = 0.4,
    budget_seconds: float = 10.0,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    monotonic: Callable[[], float] = time.monotonic,
    uniform: Callable[[float, float], float] = random.uniform,
) -> tuple[types.GenerateContentResponse, tuple[KeyAttempt, ...]]:
    """`generate_traced` plus bounded retries on 429/503 for the chat path.

    At most `max_retries` retries with full jitter — each wait is a uniform
    draw in ``[0, base_seconds * 2**n]`` — and a hard wall-clock budget across
    all attempts. Running out of either raises the last error unchanged.
    """
    deadline = monotonic() + budget_seconds
    attempts: list[KeyAttempt] = []
    for retry in range(max_retries + 1):
        try:
            response, _ = await generate_traced(
                contents, config, attempts=attempts, model=model
            )
        except GeminiCallError as error:
            retryable = (
                isinstance(error.error, errors.APIError)
                and error.error.code in _RETRYABLE_STATUS
            )
            if not retryable or retry == max_retries:
                raise
            delay = uniform(0.0, base_seconds * 2**retry)
            if monotonic() + delay > deadline:
                raise
            await sleep(delay)
            continue
        return response, tuple(attempts)
    raise AssertionError("unreachable")
