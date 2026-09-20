from functools import lru_cache

from google import genai
from google.genai import errors, types

from app.config import get_settings


@lru_cache
def _clients() -> tuple[genai.Client, ...]:
    settings = get_settings()
    keys = [k for k in (settings.gemini_api_key, settings.gemini_api_key_2) if k]
    return tuple(genai.Client(api_key=k) for k in keys)


async def generate(
    contents: types.ContentListUnion,
    config: types.GenerateContentConfigOrDict | None = None,
) -> types.GenerateContentResponse:
    """Call Gemini, retrying once on the second key if the first is rate-limited."""
    clients = _clients()
    if not clients:
        raise RuntimeError("GEMINI_API_KEY is not set")
    model = get_settings().gemini_model
    for i, client in enumerate(clients):
        try:
            return await client.aio.models.generate_content(
                model=model, contents=contents, config=config
            )
        except errors.ClientError as exc:
            if exc.code != 429 or i == len(clients) - 1:
                raise
    raise AssertionError("unreachable")
