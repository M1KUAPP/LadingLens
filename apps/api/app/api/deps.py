from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from typesafe_sdk import AsyncTypeSafeClient

from app.api.errors import ApiProblem
from app.config import Settings, get_settings
from app.db import get_session_factory
from app.extraction import GeminiExtractor, RoleDecider
from app.guest import SESSION_HEADER, GuestContext, GuestSessions
from app.jev import (
    JevDocumentRoleClient,
    JevEquivalenceClient,
    JevFailureCode,
    JevProviderFailure,
)
from app.judge import JudgeService
from app.materialize import SeedMaterializer
from app.persistence import PersistenceService
from app.pipeline import ComparisonPipeline, EquivalenceJudge
from app.seed_catalog import SeedCatalog, load_seed_catalog
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
    judge: JudgeService | None = None
    reviews: object | None = None
    typesafe_client: AsyncTypeSafeClient | None = None


class _JevNotWired:
    """Jev before its provider client is wired: every check fails closed."""

    async def decide(self, documents, *, correlation_id=None):
        raise self._failure(correlation_id)

    async def judge(self, questions, *, correlation_id=None):
        raise self._failure(correlation_id)

    @staticmethod
    def _failure(correlation_id: str | None) -> JevProviderFailure:
        return JevProviderFailure(
            code=JevFailureCode.UNCONFIGURED,
            retryable=False,
            email_ids=(),
            correlation_id=correlation_id or "jev-not-wired",
            message="Jev is not configured",
        )


def build_judge(
    settings: Settings,
    persistence: PersistenceService,
    *,
    roles: RoleDecider,
    equivalence: EquivalenceJudge,
    gemini: GeminiExtractor,
) -> JudgeService:
    """The judge service over the comparison pipeline and these providers."""
    pipeline = ComparisonPipeline(
        persistence,
        roles=roles,
        gemini=gemini,
        equivalence=equivalence,
        gemini_model=settings.gemini_model,
    )
    return JudgeService(persistence, pipeline, settings=settings)


def build_services(settings: Settings) -> Services:
    session_factory = get_session_factory()
    object_store: PrivateObjectStore = (
        GcsPrivateObjectStore(settings.gcs_bucket)
        if settings.gcs_bucket
        else InMemoryPrivateObjectStore()
    )
    persistence = PersistenceService(session_factory, object_store)
    guests = GuestSessions(session_factory, persistence)

    roles: RoleDecider
    equivalence: EquivalenceJudge
    typesafe_client: AsyncTypeSafeClient | None = None
    if settings.typesafe_api_key:
        # One client backs both wrappers; app.main's lifespan closes it.
        typesafe_client = AsyncTypeSafeClient(api_key=settings.typesafe_api_key)
        roles = JevDocumentRoleClient(typesafe_client)
        equivalence = JevEquivalenceClient(typesafe_client)
    else:
        jev_not_wired = _JevNotWired()
        roles = jev_not_wired
        equivalence = jev_not_wired

    return Services(
        settings=settings,
        session_factory=session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=guests,
        typesafe_client=typesafe_client,
        judge=build_judge(
            settings,
            persistence,
            roles=roles,
            equivalence=equivalence,
            gemini=GeminiExtractor(),
        ),
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


async def get_seed_catalog(services: ServicesDep) -> SeedCatalog:
    return await load_seed_catalog(services.settings)


SeedCatalogDep = Annotated[SeedCatalog, Depends(get_seed_catalog)]


def get_materializer(
    services: ServicesDep, catalog: SeedCatalogDep
) -> SeedMaterializer:
    return SeedMaterializer(services.persistence, catalog, settings=services.settings)


MaterializerDep = Annotated[SeedMaterializer, Depends(get_materializer)]


def get_judge(services: ServicesDep) -> JudgeService:
    if services.judge is None:
        raise RuntimeError("no judge service: build the services with build_services")
    return services.judge


JudgeDep = Annotated[JudgeService, Depends(get_judge)]
