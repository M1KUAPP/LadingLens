from pathlib import Path

from app.config import Settings

API_DIR = Path(__file__).resolve().parents[1]


def test_approved_model_defaults(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("JEV_MODEL", raising=False)
    settings = Settings(_env_file=None)

    assert settings.gemini_model == "gemini-3.5-flash"
    assert settings.jev_model == "jev-1.13.0"


def test_settings_have_no_alternative_provider_fields() -> None:
    field_names = " ".join(Settings.model_fields).lower()

    assert "openai" not in field_names
    assert "qwen" not in field_names


def test_env_example_uses_only_approved_models() -> None:
    env_example = (API_DIR / ".env.example").read_text(encoding="utf-8")
    env_example_lower = env_example.lower()
    env_lines = env_example.splitlines()

    assert "GEMINI_MODEL=gemini-3.5-flash" in env_lines
    assert "JEV_MODEL=jev-1.13.0" in env_lines
    assert "openai" not in env_example_lower
    assert "qwen" not in env_example_lower


def test_runtime_python_has_no_alternative_provider_references() -> None:
    for path in (API_DIR / "app").rglob("*.py"):
        source = path.read_text(encoding="utf-8").lower()
        assert "openai" not in source, path
        assert "qwen" not in source, path
