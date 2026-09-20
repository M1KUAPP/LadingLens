import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


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
