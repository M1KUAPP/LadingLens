import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException
from starlette.types import Scope

from app.api.actions import router as actions_router
from app.api.errors import install_api_errors
from app.api.evidence import router as evidence_router
from app.api.inbox import router as inbox_router
from app.api.judge_routes import router as judge_router
from app.api.reconciliation_routes import router as reconciliation_router
from app.api.session import router as session_router
from app.config import get_settings
from app.db import get_engine
from app.observability import install_observability
from app.seed_catalog import load_seed_catalog, seed_status

API_DIR = Path(__file__).resolve().parent.parent
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Warm the shared seed catalog and close the live provider client.

    A broken synthetic bundle must not take down the live judge path: its
    failure is recorded for `/api/health/ready` (`seed_status`) instead of
    stopping startup.
    """
    try:
        await load_seed_catalog(get_settings())
    except Exception:  # noqa: BLE001 - a broken seed must not stop startup
        logger.error("Seed catalog failed to build; live routes still start")
    yield
    services = getattr(app.state, "services", None)
    if services is not None and services.typesafe_client is not None:
        await services.typesafe_client.aclose()


app = FastAPI(title="Averis", lifespan=lifespan)
install_observability(app)
install_api_errors(app)
app.include_router(session_router)
app.include_router(inbox_router)
app.include_router(reconciliation_router)
app.include_router(evidence_router)
app.include_router(actions_router)
app.include_router(judge_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": get_settings().app_version}


@app.get("/api/health/ready")
async def ready() -> JSONResponse:
    settings = get_settings()
    keys = {
        "gemini": bool(settings.gemini_api_key),
        "gemini_2": bool(settings.gemini_api_key_2),
        "typesafe": bool(settings.typesafe_api_key),
    }
    seed = seed_status()
    if not settings.database_url:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "reason": "DATABASE_URL is not set",
                "keys": keys,
                "data_policy": settings.data_policy,
                "seed": seed,
            },
        )
    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError, RuntimeError) as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "reason": f"database unreachable ({exc.__class__.__name__})",
                "keys": keys,
                "data_policy": settings.data_policy,
                "seed": seed,
            },
        )
    return JSONResponse(
        {
            "status": "ok",
            "keys": keys,
            "data_policy": settings.data_policy,
            "seed": seed,
        }
    )


class SPAStaticFiles(StaticFiles):
    """Static files with fallback to index.html for client-side routes."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            raw_path = scope.get("raw_path", b"")
            requested_path = (
                raw_path.decode("ascii", errors="ignore").split("?", 1)[0]
                if isinstance(raw_path, bytes)
                else f"/{path.lstrip('/')}"
            )
            while True:
                decoded_path = unquote(requested_path)
                if decoded_path == requested_path:
                    break
                requested_path = decoded_path
            method = scope.get("method", "GET")
            if (
                exc.status_code == 404
                and method in {"GET", "HEAD"}
                and not requested_path.startswith("/api/")
                and requested_path != "/api"
            ):
                return await super().get_response("index.html", scope)
            raise


settings = get_settings()
web_dist = (
    Path(settings.web_dist) if settings.web_dist else API_DIR.parent / "web" / "dist"
)
if web_dist.is_dir():
    app.mount("/", SPAStaticFiles(directory=web_dist, html=True), name="web")
