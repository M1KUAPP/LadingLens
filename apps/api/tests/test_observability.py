import json
import logging
from io import StringIO
from pathlib import Path
from uuid import UUID

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.observability import (
    EVENT_LOGGER,
    bind_request_context,
    emit_event,
    install_observability,
)

API_DIR = Path(__file__).resolve().parents[1]


def _event_records(caplog: pytest.LogCaptureFixture) -> list[dict[str, object]]:
    return [
        json.loads(record.message)
        for record in caplog.records
        if record.name == "averis.events"
    ]


def test_event_logger_is_enabled_for_cloud_run_stdout() -> None:
    assert EVENT_LOGGER.isEnabledFor(logging.INFO)
    assert any(
        getattr(handler, "_averis_json", False) for handler in EVENT_LOGGER.handlers
    )


def test_alembic_configuration_keeps_event_logger_enabled() -> None:
    config = Config(str(API_DIR / "alembic.ini"), output_buffer=StringIO())
    was_disabled = EVENT_LOGGER.disabled
    EVENT_LOGGER.disabled = False

    try:
        command.upgrade(config, "head", sql=True)
        assert EVENT_LOGGER.isEnabledFor(logging.INFO)
    finally:
        EVENT_LOGGER.disabled = was_disabled


def test_emit_event_has_required_domain_fields(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="averis.events")

    emit_event(
        "case_terminal",
        request_id="request-1",
        case_ids=("case-1",),
        source_hashes=("a" * 64,),
        route_choice="LIVE",
        model_version="gemini-3.5-flash",
        rule_version="gate-2-v1",
        latency_ms=12.5,
        retries=1,
        terminal_state="SUCCEEDED",
    )

    [event] = _event_records(caplog)
    assert event == {
        "case_ids": ["case-1"],
        "event": "case_terminal",
        "latency_ms": 12.5,
        "model_version": "gemini-3.5-flash",
        "request_id": "request-1",
        "retries": 1,
        "route_choice": "LIVE",
        "rule_version": "gate-2-v1",
        "source_hashes": ["a" * 64],
        "terminal_state": "SUCCEEDED",
    }


def test_emit_event_rejects_secret_fields_and_values() -> None:
    with pytest.raises(ValueError, match="allowlisted"):
        emit_event("unsafe", api_key="sentinel-secret")

    with pytest.raises(ValueError, match="safe log value"):
        emit_event("unsafe", request_id="Bearer sentinel-secret")

    with pytest.raises(ValueError, match="SHA-256"):
        emit_event("unsafe", source_hashes=("not-a-hash",))


def test_http_middleware_correlates_and_logs_route_template(
    caplog: pytest.LogCaptureFixture,
) -> None:
    test_app = FastAPI()
    install_observability(test_app)

    @test_app.get("/cases/{case_id}")
    async def read_case(case_id: str, request: Request) -> dict[str, str]:
        bind_request_context(
            request,
            case_ids=(case_id,),
            source_hashes=("b" * 64,),
            route_choice="CACHE",
            retries=2,
        )
        return {"case_id": case_id}

    caplog.set_level(logging.INFO, logger="averis.events")
    response = TestClient(test_app).get(
        "/cases/case-7?token=sentinel-secret",
        headers={"X-Request-ID": "opaque-sentinel-secret-value"},
    )

    assert response.status_code == 200
    response_request_id = response.headers["X-Request-ID"]
    assert str(UUID(response_request_id)) == response_request_id
    assert response_request_id != "opaque-sentinel-secret-value"
    [event] = _event_records(caplog)
    assert event["request_id"] == response_request_id
    assert event["route"] == "/cases/{case_id}"
    assert event["route_choice"] == "CACHE"
    assert event["case_ids"] == ["case-7"]
    assert event["source_hashes"] == ["b" * 64]
    assert event["retries"] == 2
    assert event["terminal_state"] == "SUCCEEDED"
    assert event["status_code"] == 200
    assert isinstance(event["latency_ms"], float)
    assert "sentinel-secret" not in json.dumps(event)


def test_unhandled_error_returns_the_safe_server_request_id(
    caplog: pytest.LogCaptureFixture,
) -> None:
    test_app = FastAPI()
    install_observability(test_app)

    @test_app.get("/explode")
    async def explode() -> None:
        raise RuntimeError("sentinel-secret exception detail")

    caplog.set_level(logging.INFO, logger="averis.events")
    response = TestClient(test_app, raise_server_exceptions=False).get("/explode")

    assert response.status_code == 500
    request_id = response.headers["X-Request-ID"]
    assert str(UUID(request_id)) == request_id
    assert response.json() == {"status": "error", "request_id": request_id}
    [event] = _event_records(caplog)
    assert event["request_id"] == request_id
    assert event["terminal_state"] == "FAILED"
    assert "sentinel-secret" not in json.dumps(event)
