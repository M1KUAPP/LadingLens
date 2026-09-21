from __future__ import annotations

import secrets
from dataclasses import dataclass
from hashlib import sha256
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import get_settings
from app.models import GuestSession, Workspace
from app.persistence import AuditContext, PersistenceService

SESSION_HEADER = "X-LadingLens-Session"


@dataclass(frozen=True, slots=True)
class GuestContext:
    guest_session_id: UUID
    session_key: str
    workspace_id: UUID
    generation: int


class GuestSessions:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        persistence: PersistenceService,
    ) -> None:
        self._session_factory = session_factory
        self._persistence = persistence

    async def create(self) -> tuple[str, GuestContext]:
        token = secrets.token_urlsafe(32)
        key = sha256(token.encode()).hexdigest()
        guest_session_id = uuid4()
        workspace_id = uuid4()
        async with self._session_factory() as session, session.begin():
            session.add(
                GuestSession(
                    guest_session_id=guest_session_id,
                    session_key=key,
                    current_generation=1,
                )
            )
            session.add(
                Workspace(
                    workspace_id=workspace_id,
                    guest_session_id=guest_session_id,
                    generation=1,
                    is_shared_seed=False,
                    seed_workspace_id=None,
                )
            )
        context = GuestContext(
            guest_session_id=guest_session_id,
            session_key=key,
            workspace_id=workspace_id,
            generation=1,
        )
        return token, context

    async def resolve(self, token: str | None) -> GuestContext | None:
        if not token:
            return None
        key = sha256(token.encode()).hexdigest()
        async with self._session_factory() as session:
            guest_session = await session.scalar(
                select(GuestSession).where(GuestSession.session_key == key)
            )
            if guest_session is None:
                return None
            workspace = await session.scalar(
                select(Workspace).where(
                    Workspace.guest_session_id == guest_session.guest_session_id,
                    Workspace.generation == guest_session.current_generation,
                    Workspace.is_shared_seed.is_(False),
                )
            )
        if workspace is None:
            return None
        return GuestContext(
            guest_session_id=guest_session.guest_session_id,
            session_key=key,
            workspace_id=workspace.workspace_id,
            generation=guest_session.current_generation,
        )

    async def reset(self, token: str, *, request_id: str) -> GuestContext:
        key = sha256(token.encode()).hexdigest()
        settings = get_settings()
        workspace = await self._persistence.reset_guest_namespace(
            session_key=key,
            audit=AuditContext(
                request_id=request_id,
                rule_version=settings.rule_version,
                actor_kind="REVIEWER",
                actor_id="guest",
            ),
        )
        async with self._session_factory() as session:
            guest_session_id = await session.scalar(
                select(GuestSession.guest_session_id).where(
                    GuestSession.session_key == key
                )
            )
        assert guest_session_id is not None
        return GuestContext(
            guest_session_id=guest_session_id,
            session_key=key,
            workspace_id=workspace.workspace_id,
            generation=workspace.generation,
        )
