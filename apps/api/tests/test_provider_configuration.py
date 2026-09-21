import asyncio
from pathlib import Path

import pytest
from pydantic import ValidationError

from app import seed_catalog
from app.config import Settings
from app.seed_catalog import load_seed_catalog

API_DIR = Path(__file__).resolve().parents[1]


def test_approved_model_defaults(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_CHAT_MODEL", raising=False)
    monkeypatch.delenv("JEV_MODEL", raising=False)
    settings = Settings(_env_file=None)

    assert settings.gemini_model == "gemini-3.5-flash"
    assert settings.gemini_chat_model == "gemini-3.5-flash-lite"
    assert settings.jev_model == "jev-1.13.0"


def test_unapproved_model_or_data_policy_is_rejected(monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)

    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash")
    monkeypatch.setenv("GEMINI_CHAT_MODEL", "gemini-3.5-flash")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)

    monkeypatch.setenv("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite")
    monkeypatch.setenv("DATA_POLICY", "real-documents")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_have_no_alternative_provider_fields() -> None:
    field_names = " ".join(Settings.model_fields).lower()

    assert "openai" not in field_names
    assert "qwen" not in field_names


def test_env_example_uses_only_approved_models() -> None:
    env_example = (API_DIR / ".env.example").read_text(encoding="utf-8")
    env_example_lower = env_example.lower()
    env_lines = env_example.splitlines()

    assert "GEMINI_MODEL=gemini-3.5-flash" in env_lines
    assert "GEMINI_CHAT_MODEL=gemini-3.5-flash-lite" in env_lines
    assert "JEV_MODEL=jev-1.13.0" in env_lines
    assert "DATA_POLICY=synthetic-only" in env_lines
    assert "openai" not in env_example_lower
    assert "qwen" not in env_example_lower


def test_runtime_python_has_no_alternative_provider_references() -> None:
    for path in (API_DIR / "app").rglob("*.py"):
        source = path.read_text(encoding="utf-8").lower()
        assert "openai" not in source, path
        assert "qwen" not in source, path


def test_a_copied_env_example_does_not_blank_the_bundle_dir(tmp_path: Path) -> None:
    """`cp .env.example .env` must leave every unset field at its default."""
    env_example = (API_DIR / ".env.example").read_text(encoding="utf-8")
    env_file = tmp_path / ".env"
    env_file.write_text(env_example, encoding="utf-8")

    settings = Settings(_env_file=env_file)

    assert settings.bundle_dir == Settings(_env_file=None).bundle_dir
    assert settings.gemini_api_key is None
    assert settings.web_dist is None
    assert settings.database_url is None
    assert settings.data_policy == "synthetic-only"


async def test_a_blank_bundle_dir_still_lets_the_seed_catalog_build(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("BUNDLE_DIR=\n", encoding="utf-8")
    settings = Settings(_env_file=env_file)

    monkeypatch.setattr(seed_catalog, "_catalog", None)
    # A fresh lock: an asyncio.Lock binds to the loop it is first contended on.
    monkeypatch.setattr(seed_catalog, "_catalog_lock", asyncio.Lock())

    catalog = await load_seed_catalog(settings)

    assert len(catalog.emails) > 0
