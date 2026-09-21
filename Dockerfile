# syntax=docker/dockerfile:1

FROM oven/bun:1 AS web
WORKDIR /src
COPY apps/web/package.json apps/web/bun.lock ./
RUN bun install --frozen-lockfile
COPY apps/web/ ./
RUN bun run build

FROM python:3.12-slim AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.11.26 /uv /uvx /usr/local/bin/
WORKDIR /app/api
COPY apps/api/pyproject.toml apps/api/uv.lock apps/api/.python-version ./
RUN uv sync --frozen --no-dev
COPY apps/api/alembic.ini ./alembic.ini
COPY apps/api/migrations ./migrations
COPY apps/api/app ./app
COPY --from=web /src/dist /app/web/dist

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    WEB_DIST=/app/web/dist \
    PATH=/app/api/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1

RUN useradd --system --uid 1001 --home-dir /app appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log"]
