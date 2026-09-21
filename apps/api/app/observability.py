from __future__ import annotations

import json
import logging
import sys
from collections.abc import Sequence
from re import fullmatch, search
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.config import get_settings

EVENT_LOGGER = logging.getLogger("averis.events")

_ALLOWED_FIELDS = {
    "case_ids",
    "latency_ms",
    "method",
    "model_version",
    "request_id",
    "retries",
    "route",
    "route_choice",
    "rule_version",
    "source_hashes",
    "status_code",
    "terminal_state",
}
_UNSAFE_VALUE = r"(?i)(bearer\s+|api[_-]?key\s*[=:]|password\s*[=:]|postgres(?:ql)?://)"


def configure_event_logging() -> None:
    """Install one plain stdout handler that survives Uvicorn's log config."""
    if not any(
        getattr(handler, "_averis_json", False) for handler in EVENT_LOGGER.handlers
    ):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("%(message)s"))
        handler._averis_json = True  # type: ignore[attr-defined]
        EVENT_LOGGER.addHandler(handler)
    EVENT_LOGGER.setLevel(logging.INFO)
    EVENT_LOGGER.propagate = True


configure_event_logging()


def _safe_text(value: str) -> bool:
    return len(value) <= 512 and search(_UNSAFE_VALUE, value) is None


def _validate_log_value(value: object) -> None:
    if value is None or isinstance(value, bool | int | float):
        return
    if isinstance(value, str):
        if not _safe_text(value):
            raise ValueError("event field is not a safe log value")
        return
    if isinstance(value, Sequence) and not isinstance(value, bytes | bytearray | str):
        for item in value:
            _validate_log_value(item)
        return
    raise ValueError("event field is not a safe log value")


def _validate_event_fields(fields: dict[str, object]) -> None:
    for name in ("case_ids", "source_hashes"):
        value = fields.get(name, ())
        if not isinstance(value, Sequence) or isinstance(
            value, bytes | bytearray | str
        ):
            raise TypeError(f"{name} must be a sequence")
    if any(
        not isinstance(value, str) or not value or len(value) > 255
        for value in fields.get("case_ids", ())
    ):
        raise ValueError("case_ids must contain non-empty identifiers")
    if any(
        not isinstance(value, str) or fullmatch(r"[0-9a-f]{64}", value) is None
        for value in fields.get("source_hashes", ())
    ):
        raise ValueError("source_hashes must contain lowercase SHA-256 digests")
    retries = fields.get("retries")
    if retries is not None and (
        isinstance(retries, bool) or not isinstance(retries, int) or retries < 0
    ):
        raise ValueError("retries must be a non-negative integer")
    latency = fields.get("latency_ms")
    if latency is not None and (
        isinstance(latency, bool) or not isinstance(latency, int | float) or latency < 0
    ):
        raise ValueError("latency_ms must be non-negative")
    status_code = fields.get("status_code")
    if status_code is not None and (
        isinstance(status_code, bool)
        or not isinstance(status_code, int)
        or not 100 <= status_code <= 599
    ):
        raise ValueError("status_code must be an HTTP status")


def emit_event(event: str, **fields: object) -> None:
    """Emit one allowlisted JSON event suitable for Cloud Logging stdout capture."""
    if fullmatch(r"[a-z][a-z0-9_.-]{0,63}", event) is None:
        raise ValueError("event name must be a safe lowercase identifier")
    unknown = set(fields) - _ALLOWED_FIELDS
    if unknown:
        raise ValueError(f"event fields are not allowlisted: {sorted(unknown)}")
    _validate_event_fields(fields)

    payload: dict[str, object] = {"event": event}
    for key, value in fields.items():
        _validate_log_value(value)
        payload[key] = list(value) if isinstance(value, tuple) else value
    EVENT_LOGGER.info(json.dumps(payload, sort_keys=True, separators=(",", ":")))


def _request_id() -> str:
    return str(uuid4())


async def _safe_unhandled_error(request: Request, _error: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", _request_id())
    return JSONResponse(
        status_code=500,
        content={"status": "error", "request_id": request_id},
        headers={"X-Request-ID": request_id},
    )


def bind_request_context(
    request: Request,
    *,
    case_ids: Sequence[str] = (),
    source_hashes: Sequence[str] = (),
    route_choice: str | None = None,
    retries: int = 0,
) -> None:
    """Attach safe domain identifiers for the terminal request event."""
    context = {
        "case_ids": tuple(case_ids),
        "source_hashes": tuple(source_hashes),
        "route_choice": route_choice,
        "retries": retries,
    }
    for value in context.values():
        _validate_log_value(value)
    request.state.observability = context


class StructuredRequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = _request_id()
        request.state.request_id = request_id
        started = perf_counter()
        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        finally:
            latency_ms = round((perf_counter() - started) * 1000, 3)
            status_code = response.status_code if response is not None else 500
            terminal_state = (
                "SUCCEEDED"
                if status_code < 400
                else "REJECTED"
                if status_code < 500
                else "FAILED"
            )
            route = getattr(request.scope.get("route"), "path", "UNMATCHED")
            context: dict[str, Any] = getattr(request.state, "observability", {})
            settings = get_settings()
            emit_event(
                "http_request",
                request_id=request_id,
                case_ids=context.get("case_ids", ()),
                source_hashes=context.get("source_hashes", ()),
                route_choice=context.get("route_choice") or "HTTP",
                route=route,
                method=request.method,
                model_version=f"{settings.gemini_model}|{settings.jev_model}",
                rule_version=settings.rule_version,
                latency_ms=latency_ms,
                retries=context.get("retries", 0),
                terminal_state=terminal_state,
                status_code=status_code,
            )
            if response is not None:
                response.headers["X-Request-ID"] = request_id


def install_observability(app: FastAPI) -> None:
    configure_event_logging()
    app.add_exception_handler(Exception, _safe_unhandled_error)
    app.add_middleware(StructuredRequestLoggingMiddleware)
