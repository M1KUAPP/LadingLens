from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException
from starlette.types import Scope

from app.config import get_settings
from app.db import get_engine
from app.observability import install_observability

API_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="Averis")
install_observability(app)


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
                "data_policy": settings.data_policy,
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
            },
        )
    return JSONResponse(
        {
            "status": "ok",
            "keys": keys,
            "data_policy": settings.data_policy,
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
