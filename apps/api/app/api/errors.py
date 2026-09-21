from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import (
    http_exception_handler as _default_http_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

_HTTP_ERROR_CODES = {404: "not_found", 405: "method_not_allowed"}


class ApiProblem(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: list | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


async def _api_problem_handler(_request: Request, exc: ApiProblem) -> JSONResponse:
    error: dict[str, object] = {"code": exc.code, "message": exc.message}
    if exc.details is not None:
        error["details"] = exc.details
    return JSONResponse(status_code=exc.status, content={"error": error})


async def _validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "invalid_request",
                "message": "The request could not be validated.",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


async def _http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> Response:
    if not request.url.path.startswith("/api"):
        return await _default_http_exception_handler(request, exc)
    message = exc.detail if isinstance(exc.detail, str) else "An error occurred."
    code = _HTTP_ERROR_CODES.get(exc.status_code, "http_error")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": message}},
        headers=exc.headers,
    )


class NoStoreMiddleware(BaseHTTPMiddleware):
    """Adds Cache-Control: no-store to every /api/* response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response


def install_api_errors(app: FastAPI) -> None:
    app.add_exception_handler(ApiProblem, _api_problem_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_middleware(NoStoreMiddleware)
