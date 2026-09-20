import asyncio
import os
import pathlib
import uuid
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def _async_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def pytest_collection_modifyitems(
    config: pytest.Config, items: list[pytest.Item]
) -> None:
    if os.environ.get("TEST_DATABASE_URL"):
        return

    skip_postgres = pytest.mark.skip(
        reason="TEST_DATABASE_URL is not set; PostgreSQL integration test skipped"
    )
    for item in items:
        if "postgres" in item.keywords:
            item.add_marker(skip_postgres)


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def postgres_engine() -> AsyncIterator[AsyncEngine]:
    database_url = os.environ.get("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is not set")

    database_url = _async_database_url(database_url)
    schema = f"test_{uuid.uuid4().hex}"
    admin_engine = create_async_engine(database_url)
    try:
        async with admin_engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA "{schema}"'))

        engine = create_async_engine(
            database_url,
            connect_args={"server_settings": {"search_path": schema}},
        )
        try:
            config = Config(str(pathlib.Path(__file__).parents[1] / "alembic.ini"))
            with pytest.MonkeyPatch.context() as monkeypatch:
                monkeypatch.setenv("DATABASE_URL", database_url)
                monkeypatch.setenv("ALEMBIC_SCHEMA", schema)
                await asyncio.to_thread(command.upgrade, config, "head")
            yield engine
        finally:
            await engine.dispose()
    finally:
        async with admin_engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        await admin_engine.dispose()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def postgres_session_factory(
    postgres_engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(postgres_engine, expire_on_commit=False)


@pytest_asyncio.fixture(loop_scope="session")
async def postgres_session(
    postgres_session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with postgres_session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()
