from pathlib import Path

from app.db import _to_asyncpg_dsn

REPO_ROOT = Path(__file__).resolve().parents[3]


def _read(relative: str) -> str:
    return (REPO_ROOT / relative).read_text(encoding="utf-8")


def test_gcp_setup_uses_exact_secret_grants_and_rehardens_bucket() -> None:
    setup = _read("infra/gcp-setup.sh")

    assert "secrets add-iam-policy-binding" in setup
    assert (
        'g projects add-iam-policy-binding "$PROJECT_ID" \\\n'
        '  --member "serviceAccount:$RUNTIME_EMAIL" '
        "--role roles/secretmanager.secretAccessor" not in setup
    )
    for secret in (
        "averis-database-url",
        "averis-gemini-api-key",
        "averis-gemini-api-key-2",
        "averis-typesafe-api-key",
    ):
        assert f"  {secret}" in setup
    assert "storage buckets update" in setup
    assert "--public-access-prevention" in setup
    assert "--uniform-bucket-level-access" in setup
    assert "roles/storage.objectCreator" in setup
    assert "roles/storage.objectViewer" in setup
    assert "scripts/verify_gcp_controls.py" in setup


def test_runtime_image_contains_migration_assets() -> None:
    dockerfile = _read("Dockerfile")

    assert "COPY apps/api/alembic.ini" in dockerfile
    assert "COPY apps/api/migrations" in dockerfile
    assert "--no-access-log" in dockerfile


def test_neon_style_database_url_is_safe_for_runtime_and_migrations() -> None:
    dsn, connect_args = _to_asyncpg_dsn(
        "postgresql://user:pass@db.example/averis?sslmode=require&application_name=x"
    )
    migration_env = _read("apps/api/migrations/env.py")

    assert dsn == (
        "postgresql+asyncpg://user:pass@db.example/averis?application_name=x"
    )
    assert connect_args == {"ssl": True}
    assert "_to_asyncpg_dsn(url)" in migration_env
