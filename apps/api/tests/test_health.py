import logging
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import main as main_module
from app import seed_catalog
from app.config import get_settings
from app.main import SPAStaticFiles, app


@pytest.fixture(autouse=True)
def _clean_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    for field in (
        "database_url",
        "gemini_api_key",
        "gemini_api_key_2",
        "typesafe_api_key",
    ):
        monkeypatch.setattr(settings, field, None)
    monkeypatch.setattr(settings, "app_version", "dev")


@pytest.fixture(autouse=True)
def _clean_seed_catalog_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Readiness must report this test's own seed state, not another test's."""
    monkeypatch.setattr(seed_catalog, "_catalog", None)
    monkeypatch.setattr(seed_catalog, "_catalog_failed", False)


def test_health_ok() -> None:
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "dev"}


def test_ready_without_database_url() -> None:
    response = TestClient(app).get("/api/health/ready")
    assert response.status_code == 503
    assert response.json()["keys"] == {
        "gemini": False,
        "gemini_2": False,
        "typesafe": False,
    }
    assert response.json()["data_policy"] == "synthetic-only"
    assert response.json()["seed"] == "building"


def test_ready_with_reachable_database(monkeypatch: pytest.MonkeyPatch) -> None:
    class Connection:
        async def execute(self, _statement) -> None:
            return None

    class ConnectionContext:
        async def __aenter__(self) -> Connection:
            return Connection()

        async def __aexit__(self, *_args) -> None:
            return None

    class Engine:
        def connect(self) -> ConnectionContext:
            return ConnectionContext()

    settings = get_settings()
    monkeypatch.setattr(settings, "database_url", "postgresql://configured")
    monkeypatch.setattr(settings, "gemini_api_key", "configured")
    monkeypatch.setattr(settings, "typesafe_api_key", "configured")
    monkeypatch.setattr(main_module, "get_engine", lambda: Engine())
    monkeypatch.setattr(seed_catalog, "_catalog", object())

    response = TestClient(app).get("/api/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "keys": {"gemini": True, "gemini_2": False, "typesafe": True},
        "data_policy": "synthetic-only",
        "seed": "ready",
    }


def test_ready_reports_database_failure_without_exception_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class BrokenConnectionContext:
        async def __aenter__(self):
            raise OSError("sentinel-secret database detail")

        async def __aexit__(self, *_args) -> None:
            return None

    class Engine:
        def connect(self) -> BrokenConnectionContext:
            return BrokenConnectionContext()

    settings = get_settings()
    monkeypatch.setattr(settings, "database_url", "postgresql://configured")
    monkeypatch.setattr(main_module, "get_engine", lambda: Engine())

    response = TestClient(app).get("/api/health/ready")

    assert response.status_code == 503
    assert response.json()["reason"] == "database unreachable (OSError)"
    assert response.json()["seed"] == "building"
    assert "sentinel-secret" not in response.text


def test_ready_reports_a_failed_seed_build_without_crashing_the_app(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seed_catalog, "_catalog_failed", True)

    response = TestClient(app).get("/api/health/ready")

    assert response.json()["seed"] == "error"


def test_spa_fallback_never_masks_unknown_api_routes() -> None:
    web_fixture = Path(__file__).parent / "fixtures" / "web-dist"
    test_app = FastAPI()
    test_app.mount("/", SPAStaticFiles(directory=web_fixture, html=True), name="web")
    client = TestClient(test_app)

    judge = client.get("/judge")
    assert judge.status_code == 200
    assert "Averis" in judge.text

    missing_api = client.get("/api/does-not-exist")
    assert missing_api.status_code == 404
    assert missing_api.headers["content-type"].startswith("application/json")

    encoded_api = client.get("/api%2Fdoes-not-exist")
    assert encoded_api.status_code == 404
    assert encoded_api.headers["content-type"].startswith("application/json")

    nested_encoded_api = client.get("/api%252Fdoes-not-exist")
    assert nested_encoded_api.status_code == 404
    assert nested_encoded_api.headers["content-type"].startswith("application/json")


async def test_lifespan_warms_the_seed_catalog(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []

    async def fake_load(settings):
        calls.append(settings)
        return object()

    monkeypatch.setattr(main_module, "load_seed_catalog", fake_load)

    async with main_module.lifespan(app):
        pass

    assert calls == [get_settings()]


async def test_lifespan_survives_a_failed_seed_build(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_load(settings):
        raise RuntimeError("synthetic bundle is corrupt")

    monkeypatch.setattr(main_module, "load_seed_catalog", fake_load)

    async with main_module.lifespan(app):
        pass


async def test_a_failed_seed_build_is_logged_with_its_error_type(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    async def fake_load(settings):
        raise RuntimeError("synthetic bundle is corrupt")

    monkeypatch.setattr(main_module, "load_seed_catalog", fake_load)

    with caplog.at_level(logging.ERROR, logger="app.main"):
        async with main_module.lifespan(app):
            pass

    [record] = [item for item in caplog.records if item.name == "app.main"]
    assert "RuntimeError" in record.getMessage()
    assert "synthetic bundle is corrupt" not in record.getMessage()


async def test_lifespan_closes_the_typesafe_client_on_shutdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    closed = []

    class _FakeTypesafeClient:
        async def aclose(self) -> None:
            closed.append(True)

    async def fake_load(settings):
        return object()

    monkeypatch.setattr(main_module, "load_seed_catalog", fake_load)
    previous_services = getattr(app.state, "services", None)
    app.state.services = SimpleNamespace(typesafe_client=_FakeTypesafeClient())
    try:
        async with main_module.lifespan(app):
            pass
    finally:
        app.state.services = previous_services

    assert closed == [True]
