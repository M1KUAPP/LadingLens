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


def _responses(private_status: int = 403):
    return {
        "https://averis.test/api/health": smoke.HttpResult(
            200, "application/json", b'{"status":"ok","version":"abc123"}'
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
        fetch=responses.__getitem__,
        attempts=1,
        retry_delay=0,
    )

    assert [result.name for result in results] == [
        "health",
        "readiness",
        "root_spa",
        "spa_fallback",
        "public_judge",
        "artifact_download",
        "private_object_denial",
    ]


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
            fetch=responses.__getitem__,
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
            fetch=responses.__getitem__,
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
            fetch=responses.__getitem__,
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
            fetch=responses.__getitem__,
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
            fetch=responses.__getitem__,
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


def _session_responses(
    anonymous_artifact_status: int = 401,
    session_body: bytes = b'{"session_token":"tok-1","generation":1}',
    session_status: int = 201,
    session_content_type: str = "application/json",
):
    responses = _responses()
    responses["https://averis.test/api/session"] = smoke.HttpResult(
        session_status, session_content_type, session_body
    )
    responses["https://averis.test/api/artifacts/latest"] = smoke.HttpResult(
        anonymous_artifact_status, "application/json", b'{"error":"denied"}'
    )
    return responses


def _authorized(responses):
    def fetch_authorized(url: str, session_token: str) -> smoke.HttpResult:
        assert session_token == "tok-1"
        if url == "https://averis.test/api/artifacts/latest":
            return smoke.HttpResult(200, "application/json", _artifact())
        return responses[url]

    return fetch_authorized


def test_smoke_mints_a_guest_session_and_downloads_the_artifact_with_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    responses = _session_responses()
    monkeypatch.setattr(
        smoke, "fetch_url", lambda url, timeout=15.0, **kwargs: responses[url]
    )

    results = smoke.run_checks(
        base_url="https://averis.test",
        artifact_path="/api/artifacts/latest",
        private_object_url=(
            "https://storage.googleapis.com/private-bucket/private-canary/known"
        ),
        fetch=responses.__getitem__,
        mint_session=lambda: smoke.mint_guest_session("https://averis.test/"),
        fetch_authorized=_authorized(responses),
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
        "artifact_requires_session",
        "artifact_download",
        "private_object_denial",
    ]


def test_smoke_rejects_an_artifact_reachable_without_a_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    responses = _session_responses(anonymous_artifact_status=200)
    monkeypatch.setattr(
        smoke, "fetch_url", lambda url, timeout=15.0, **kwargs: responses[url]
    )

    with pytest.raises(AssertionError, match="not denied without a guest session"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=responses.__getitem__,
            mint_session=lambda: smoke.mint_guest_session("https://averis.test/"),
            fetch_authorized=_authorized(responses),
            attempts=1,
            retry_delay=0,
        )


@pytest.mark.parametrize(
    ("body", "status", "content_type", "match"),
    [
        (b'{"session_token":""}', 200, "application/json", "no session token"),
        (b'{"generation":1}', 200, "application/json", "no session token"),
        (b"not json", 200, "application/json", "invalid JSON"),
        (b"[]", 200, "application/json", "no session token"),
        (b'{"session_token":"tok-1"}', 503, "application/json", "HTTP 503"),
        (b"<html></html>", 200, "text/html", "did not return JSON"),
    ],
)
def test_smoke_fails_closed_on_a_bad_session_mint(
    monkeypatch: pytest.MonkeyPatch,
    body: bytes,
    status: int,
    content_type: str,
    match: str,
) -> None:
    responses = _session_responses(
        session_body=body, session_status=status, session_content_type=content_type
    )
    monkeypatch.setattr(
        smoke, "fetch_url", lambda url, timeout=15.0, **kwargs: responses[url]
    )

    with pytest.raises(AssertionError, match=match):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=responses.__getitem__,
            mint_session=lambda: smoke.mint_guest_session("https://averis.test/"),
            fetch_authorized=_authorized(responses),
            attempts=1,
            retry_delay=0,
        )


def test_smoke_requires_session_minter_and_authorized_fetcher_together() -> None:
    responses = _responses()

    with pytest.raises(ValueError, match="supplied together"):
        smoke.run_checks(
            base_url="https://averis.test",
            artifact_path="/api/artifacts/latest",
            private_object_url=(
                "https://storage.googleapis.com/private-bucket/private-canary/known"
            ),
            fetch=responses.__getitem__,
            mint_session=lambda: ("tok-1", responses["https://averis.test/api/health"]),
            attempts=1,
            retry_delay=0,
        )
