from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException
from starlette.types import Scope

from app.config import get_settings
from app.db import get_engine

API_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="Averis")


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
    if not settings.database_url:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "reason": "DATABASE_URL is not set",
                "keys": keys,
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
            },
        )
    return JSONResponse({"status": "ok", "keys": keys})


class SPAStaticFiles(StaticFiles):
    """Static files with fallback to index.html for client-side routes."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


settings = get_settings()
web_dist = (
    Path(settings.web_dist) if settings.web_dist else API_DIR.parent / "web" / "dist"
)
if web_dist.is_dir():
    app.mount("/", SPAStaticFiles(directory=web_dist, html=True), name="web")
