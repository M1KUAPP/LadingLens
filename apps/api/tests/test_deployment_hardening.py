from pathlib import Path

from app.db import _to_asyncpg_dsn

REPO_ROOT = Path(__file__).resolve().parents[3]


def _read(relative: str) -> str:
    return (REPO_ROOT / relative).read_text(encoding="utf-8")


def test_deploy_uses_only_approved_runtime_provider_secrets() -> None:
    workflow = _read(".github/workflows/deploy.yml")
    lowered = workflow.lower()

    assert "openai" not in lowered
    assert "qwen" not in lowered
    assert "GEMINI_API_KEY:averis-gemini-api-key" in workflow
    assert "GEMINI_API_KEY_2:averis-gemini-api-key-2" in workflow
    assert "TYPESAFE_API_KEY:averis-typesafe-api-key" in workflow
    assert "GEMINI_MODEL=gemini-3.5-flash" in workflow
    assert "DATA_POLICY=synthetic-only" in workflow


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


def test_deployer_can_read_project_iam_for_fail_closed_verification() -> None:
    setup = _read("infra/gcp-setup.sh")

    assert "roles/browser" in setup


def test_gcp_setup_reconciles_wif_to_the_canonical_repository() -> None:
    setup = _read("infra/gcp-setup.sh")

    assert "REPO=Averis-T010NG/LadingLens" in setup
    assert "REPO_ID=1375741136" in setup
    assert "providers update-oidc" in setup
    assert "attribute.repository_id=assertion.repository_id" in setup
    assert "assertion.repository_id=='$REPO_ID'" in setup
    assert "attribute.repository_id/$REPO_ID" in setup


def test_deploy_fails_closed_on_remote_storage_and_iam_controls() -> None:
    workflow = _read(".github/workflows/deploy.yml")

    assert "Verify storage and IAM controls" in workflow
    assert "scripts/verify_gcp_controls.py" in workflow
    assert '--canary-key "${{ vars.SMOKE_PRIVATE_OBJECT_KEY }}"' in workflow


def test_ci_runs_postgresql_tests_instead_of_skipping_them() -> None:
    workflow = _read(".github/workflows/ci.yml")

    assert "postgres:16" in workflow
    assert "TEST_DATABASE_URL" in workflow


def test_ci_runs_web_tests_before_building() -> None:
    workflow = _read(".github/workflows/ci.yml")

    assert "bun run test" in workflow
    assert workflow.index("bun run test") < workflow.index("bun run build")


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
