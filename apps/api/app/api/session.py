from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import GuestDep, ServicesDep
from app.api.errors import ApiProblem
from app.guest import SEED_VERSION, SESSION_HEADER

router = APIRouter(prefix="/api", tags=["session"])


@router.post("/session", status_code=201)
async def create_session(services: ServicesDep) -> dict[str, object]:
    token, context = await services.guests.create()
    return {
        "session_token": token,
        "generation": context.generation,
        "seed_version": SEED_VERSION,
    }


@router.get("/session")
async def read_session(guest: GuestDep) -> dict[str, object]:
    return {"generation": guest.generation, "seed_version": SEED_VERSION}


@router.post("/reset")
async def reset_session(
    request: Request, guest: GuestDep, services: ServicesDep
) -> dict[str, object]:
    # `guest` enforces the 401 via require_guest; reset() re-derives the key
    # from the raw token, which is never stored, so we read it from the header.
    token = request.headers.get(SESSION_HEADER)
    assert token is not None
    try:
        context = await services.guests.reset(
            token, request_id=request.state.request_id
        )
    except SQLAlchemyError as exc:
        raise ApiProblem(
            503,
            "reset_unavailable",
            "The demo database is unavailable. Nothing was changed.",
        ) from exc
    return {
        "generation": context.generation,
        "seed_version": SEED_VERSION,
        "reset_at": datetime.now(UTC).isoformat(),
    }
