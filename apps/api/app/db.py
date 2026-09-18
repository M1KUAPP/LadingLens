from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _to_asyncpg_dsn(url: str) -> tuple[str, dict]:
    """Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN.

    asyncpg rejects libpq-style sslmode params, so sslmode is translated
    into the ssl connect argument instead.
    """
    parts = urlsplit(url)
    connect_args: dict = {}
    query = []
    for key, value in parse_qsl(parts.query):
        if key == "sslmode":
            if value != "disable":
                connect_args["ssl"] = True
        else:
            query.append((key, value))
    dsn = urlunsplit(
        ("postgresql+asyncpg", parts.netloc, parts.path, urlencode(query), "")
    )
    return dsn, connect_args


def get_engine() -> AsyncEngine:
    global _engine, _session_factory
    if _engine is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set")
        dsn, connect_args = _to_asyncpg_dsn(settings.database_url)
        _engine = create_async_engine(
            dsn,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=3,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    get_engine()
    assert _session_factory is not None
    async with _session_factory() as session:
        yield session
