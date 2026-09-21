import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "smoke_deployment.py"
SPEC = importlib.util.spec_from_file_location("smoke_deployment", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
smoke = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = smoke
SPEC.loader.exec_module(smoke)


def _artifact() -> bytes:
    record = {
        "category": "GENERAL",
        "status": "OK",
        "review_reason": None,
        "defect_fields": [],
        "has_defect": False,
    }
    return json.dumps(
        {f"email_{index:03d}": record for index in range(1, 521)}
    ).encode()


def _responses(private_status: int = 403, session_status: int = 201):
    return {
        "https://averis.test/api/health": smoke.HttpResult(
            200, "application/json", b'{"status":"ok","version":"abc123"}'
        ),
        "https://averis.test/api/session": smoke.HttpResult(
            session_status,
            "application/json",
            b'{"session_token":"smoke-session","generation":1,'
            b'"seed_version":"seed-v1"}',
        ),
        "https://averis.test/api/health/ready": smoke.HttpResult(
            200,
            "application/json",
            b'{"status":"ok","data_policy":"synthetic-only",'
            b'"keys":{"gemini":true,"gemini_2":false,"typesafe":true}}',
        ),
        "https://averis.test/": smoke.HttpResult(
            200, "text/html", b'<html><div id="root"></div></html>'
        ),
        "https://averis.test/smoke-client-route": smoke.HttpResult(
            200, "text/html", b'<html><div id="root"></div></html>'
        ),
        "https://averis.test/judge": smoke.HttpResult(
            200, "text/html", b'<html><div id="root"></div></html>'
        ),
        "https://averis.test/api/artifacts/latest": smoke.HttpResult(
            200, "application/json", _artifact()
        ),
        "https://storage.googleapis.com/private-bucket/private-canary/known": (
            smoke.HttpResult(private_status, "application/xml", b"denied")
        ),
    }


def test_smoke_checks_every_public_and_private_surface() -> None:
    responses = _responses()

    results = smoke.run_checks(
        base_url="https://averis.test",
        artifact_path="/api/artifacts/latest",
        private_object_url=(
            "https://storage.googleapis.com/private-bucket/private-canary/known"
        ),
        fetch=lambda url, **_: responses[url],
        attempts=1,
        retry_delay=0,
    )

    assert [result.name for result in results] == [
        "health",
        "readiness",
        "root_spa",
        "spa_fallback",
        "public_judge",
        "guest_session",
        "artifact_download",
        "private_object_denial",
    ]


def test_smoke_mints_a_guest_session_for_the_artifact() -> None:
    responses = _responses()
    seen: dict[str, dict] = {}

    def fetch(url: str, **kwargs):
        seen[url] = kwargs
        return responses[url]

    smoke.run_checks(
        base_url="https://averis.test",
        artifact_path="/api/artifacts/latest",
        private_object_url=(
            "https://storage.googleapis.com/private-bucket/private-canary/known"
        ),
        fetch=fetch,
        attempts=1,
        retry_delay=0,
    )

    assert seen["https://averis.test/api/session"]["method"] == "POST"
    assert seen["https://averis.test/api/artifacts/latest"]["headers"] == {
        "X-LadingLens-Session": "smoke-session"
    }


def test_smoke_rejects_a_failed_guest_session() -> None:
    responses = _responses(session_status=503)

    with pytest.raises(AssertionError, match="guest session"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


@pytest.mark.parametrize("private_status", [200, 404])
def test_smoke_rejects_public_or_unknown_private_object(private_status: int) -> None:
    responses = _responses(private_status)

    with pytest.raises(AssertionError, match="not denied anonymously"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


def test_smoke_rejects_html_masquerading_as_artifact_api() -> None:
    responses = _responses()
    responses["https://averis.test/api/artifacts/latest"] = smoke.HttpResult(
        200, "text/html", b'<html><div id="root"></div></html>'
    )

    with pytest.raises(AssertionError, match="did not return JSON"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


def test_smoke_rejects_invalid_artifact_values() -> None:
    responses = _responses()
    artifact = json.loads(_artifact())
    artifact["email_001"]["status"] = "TOTALLY_FINE"
    responses["https://averis.test/api/artifacts/latest"] = smoke.HttpResult(
        200, "application/json", json.dumps(artifact).encode()
    )

    with pytest.raises(AssertionError, match="invalid enum"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


def test_smoke_rejects_unapproved_provider_health_key() -> None:
    responses = _responses()
    responses["https://averis.test/api/health/ready"] = smoke.HttpResult(
        200,
        "application/json",
        b'{"status":"ok","data_policy":"synthetic-only",'
        b'"keys":{"gemini":true,"gemini_2":false,"typesafe":true,'
        b'"openai":true}}',
    )

    with pytest.raises(AssertionError, match="approved provider keys"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


def test_smoke_rejects_judge_redirect_to_auth() -> None:
    responses = _responses()
    responses["https://averis.test/judge"] = smoke.HttpResult(
        200,
        "text/html",
        b'<html><div id="root"></div></html>',
        final_url="https://averis.test/auth",
    )

    with pytest.raises(AssertionError, match="redirected"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=lambda url, **_: responses[url],
            attempts=1,
            retry_delay=0,
        )


def test_smoke_rejects_signed_or_credentialed_urls() -> None:
    with pytest.raises(ValueError, match="credential-free"):
        smoke.run_checks(
            base_url="https://user:secret@averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            attempts=1,
            retry_delay=0,
        )

    with pytest.raises(ValueError, match="/api/"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/assets/sample-submission.json",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            attempts=1,
            retry_delay=0,
        )

    with pytest.raises(ValueError, match="unsigned"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
                "?X-Goog-Signature=secret"
            ),
            attempts=1,
            retry_delay=0,
        )

    with pytest.raises(ValueError, match="canary"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url="https://storage.googleapis.com/private-bucket/",
            attempts=1,
            retry_delay=0,
        )

    with pytest.raises(ValueError, match="canary"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com:444/private-bucket/private-canary/known"
            ),
            attempts=1,
            retry_delay=0,
        )
