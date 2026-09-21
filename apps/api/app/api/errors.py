from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response


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
    app.add_middleware(NoStoreMiddleware)
