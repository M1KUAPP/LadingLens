from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import main as main_module
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

    response = TestClient(app).get("/api/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "keys": {"gemini": True, "gemini_2": False, "typesafe": True},
        "data_policy": "synthetic-only",
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
    assert "sentinel-secret" not in response.text


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
