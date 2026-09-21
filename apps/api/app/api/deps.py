from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.errors import ApiProblem
from app.config import Settings, get_settings
from app.db import get_session_factory
from app.guest import SESSION_HEADER, GuestContext, GuestSessions
from app.persistence import PersistenceService
from app.storage import (
    GcsPrivateObjectStore,
    InMemoryPrivateObjectStore,
    PrivateObjectStore,
)


@dataclass(slots=True)
class Services:
    settings: Settings
    session_factory: async_sessionmaker[AsyncSession]
    persistence: PersistenceService
    object_store: PrivateObjectStore
    guests: GuestSessions
    seed: object | None = None
    judge: object | None = None
    reviews: object | None = None


def build_services(settings: Settings) -> Services:
    session_factory = get_session_factory()
    object_store: PrivateObjectStore = (
        GcsPrivateObjectStore(settings.gcs_bucket)
        if settings.gcs_bucket
        else InMemoryPrivateObjectStore()
    )
    persistence = PersistenceService(session_factory, object_store)
    guests = GuestSessions(session_factory, persistence)
    return Services(
        settings=settings,
        session_factory=session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=guests,
    )


def get_services(request: Request) -> Services:
    services = getattr(request.app.state, "services", None)
    if services is None:
        services = build_services(get_settings())
        request.app.state.services = services
    return services


ServicesDep = Annotated[Services, Depends(get_services)]


async def require_guest(request: Request, services: ServicesDep) -> GuestContext:
    token = request.headers.get(SESSION_HEADER)
    context = await services.guests.resolve(token)
    if context is None:
        raise ApiProblem(
            401,
            "session_required",
            "A guest session is required. Call POST /api/session first.",
        )
    return context


GuestDep = Annotated[GuestContext, Depends(require_guest)]
