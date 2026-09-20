#!/usr/bin/env python3
"""Fail-closed public deployment smoke checks for Averis."""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from hashlib import sha256
from time import perf_counter
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, build_opener

EXPECTED_EMAIL_IDS = tuple(f"email_{index:03d}" for index in range(1, 521))
EXPECTED_ARTIFACT_KEYS = {
    "category",
    "status",
    "review_reason",
    "defect_fields",
    "has_defect",
}
ALLOWED_CATEGORIES = {
    "BL_COMPARISON",
    "SI_REQUEST",
    "INVOICE_QUERY",
    "GENERAL",
    "SPAM",
}
ALLOWED_STATUSES = {"OK", "MISMATCH", "NEEDS_REVIEW"}
ALLOWED_REVIEW_REASONS = {
    "wrong_doc_type",
    "missing_attachment",
    "unreadable",
    "missing_value",
}
DEFECT_FIELD_ORDER = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)


@dataclass(frozen=True)
class HttpResult:
    status: int
    content_type: str
    body: bytes
    elapsed_ms: float | None = None
    final_url: str | None = None


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    detail: str
    elapsed_ms: float | None = None
    response_sha256: str | None = None


Fetcher = Callable[[str], HttpResult]
_OPENER = build_opener()


def fetch_url(url: str, timeout: float = 15.0) -> HttpResult:
    request = Request(
        url,
        headers={
            "Accept": "application/json,text/html;q=0.9,*/*;q=0.1",
            "User-Agent": "averis-deployment-smoke/1",
        },
    )
    started = perf_counter()
    try:
        with _OPENER.open(request, timeout=timeout) as response:
            return HttpResult(
                status=response.status,
                content_type=response.headers.get_content_type(),
                body=response.read(),
                elapsed_ms=round((perf_counter() - started) * 1000, 3),
                final_url=response.geturl(),
            )
    except HTTPError as error:
        return HttpResult(
            status=error.code,
            content_type=error.headers.get_content_type(),
            body=error.read(),
            elapsed_ms=round((perf_counter() - started) * 1000, 3),
            final_url=error.geturl(),
        )
    except URLError as error:
        raise RuntimeError(
            f"request failed ({error.reason.__class__.__name__})"
        ) from error


def _safe_base_url(url: str) -> str:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("base URL must be a credential-free HTTPS origin")
    return url.rstrip("/") + "/"


def _safe_private_url(url: str) -> str:
    parsed = urlparse(url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if (
        parsed.scheme != "https"
        or parsed.netloc != "storage.googleapis.com"
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or len(path_parts) < 3
        or path_parts[1] != "private-canary"
        or any(part in {".", ".."} for part in path_parts)
    ):
        raise ValueError(
            "private-object URL must name an unsigned GCS private canary object"
        )
    return url


def _json_object(result: HttpResult, name: str) -> dict[str, Any]:
    if result.status != 200:
        raise AssertionError(f"{name} returned HTTP {result.status}")
    if result.content_type != "application/json":
        raise AssertionError(f"{name} did not return JSON")
    try:
        payload = json.loads(result.body)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AssertionError(f"{name} returned invalid JSON") from error
    if not isinstance(payload, dict):
        raise TypeError(f"{name} JSON must be an object")
    return payload


def _assert_no_redirect(result: HttpResult, expected_url: str, name: str) -> None:
    if result.final_url is not None and result.final_url != expected_url:
        raise AssertionError(f"{name} redirected away from its public URL")


def _retry_json(
    fetch: Fetcher,
    url: str,
    name: str,
    *,
    attempts: int,
    retry_delay: float,
    sleep: Callable[[float], None],
) -> tuple[dict[str, Any], HttpResult]:
    last_error: AssertionError | RuntimeError | None = None
    for attempt in range(attempts):
        try:
            result = fetch(url)
            _assert_no_redirect(result, url, name)
            return _json_object(result, name), result
        except (AssertionError, RuntimeError) as error:
            last_error = error
            if attempt + 1 < attempts:
                sleep(retry_delay)
    assert last_error is not None
    raise last_error


def _check_spa(result: HttpResult, name: str) -> None:
    if result.status != 200:
        raise AssertionError(f"{name} returned HTTP {result.status}")
    if result.content_type != "text/html":
        raise AssertionError(f"{name} did not return HTML")
    if b'id="root"' not in result.body:
        raise AssertionError(f"{name} did not return the React entry point")


def _check_artifact(result: HttpResult) -> None:
    artifact = _json_object(result, "artifact download")
    if tuple(artifact) != EXPECTED_EMAIL_IDS:
        raise AssertionError(
            "artifact does not contain the exact ordered 520-email manifest"
        )
    for email_id, record in artifact.items():
        if not isinstance(record, dict) or set(record) != EXPECTED_ARTIFACT_KEYS:
            raise AssertionError(f"artifact record {email_id} has the wrong shape")
        _check_artifact_record(email_id, record)


def _check_artifact_record(email_id: str, record: dict[str, Any]) -> None:
    category = record["category"]
    status = record["status"]
    reason = record["review_reason"]
    defect_fields = record["defect_fields"]
    has_defect = record["has_defect"]
    if category not in ALLOWED_CATEGORIES or status not in ALLOWED_STATUSES:
        raise AssertionError(f"artifact record {email_id} has an invalid enum")
    if not isinstance(has_defect, bool) or not isinstance(defect_fields, list):
        raise TypeError(f"artifact record {email_id} has invalid value types")
    canonical_fields = [field for field in DEFECT_FIELD_ORDER if field in defect_fields]
    if defect_fields != canonical_fields:
        raise AssertionError(f"artifact record {email_id} has invalid defect fields")
    if category != "BL_COMPARISON" and status != "OK":
        raise AssertionError(f"artifact record {email_id} has invalid category state")
    if status == "OK" and not (
        reason is None and has_defect is False and defect_fields == []
    ):
        raise AssertionError(f"artifact record {email_id} has invalid OK state")
    if status == "MISMATCH" and not (
        reason is None and has_defect is True and len(defect_fields) > 0
    ):
        raise AssertionError(f"artifact record {email_id} has invalid mismatch state")
    if status == "NEEDS_REVIEW" and not (
        reason in ALLOWED_REVIEW_REASONS and has_defect is False and defect_fields == []
    ):
        raise AssertionError(f"artifact record {email_id} has invalid review state")


def _passed(name: str, detail: str, response: HttpResult) -> CheckResult:
    return CheckResult(
        name=name,
        status="passed",
        detail=detail,
        elapsed_ms=response.elapsed_ms,
        response_sha256=sha256(response.body).hexdigest(),
    )


def run_checks(
    *,
    base_url: str,
    artifact_path: str,
    private_object_url: str,
    fetch: Fetcher = fetch_url,
    attempts: int = 12,
    retry_delay: float = 5.0,
    sleep: Callable[[float], None] = time.sleep,
) -> list[CheckResult]:
    base_url = _safe_base_url(base_url)
    private_object_url = _safe_private_url(private_object_url)
    if (
        not artifact_path.startswith("/api/")
        or "?" in artifact_path
        or "#" in artifact_path
    ):
        raise ValueError(
            "artifact path must be an /api/ path without query or fragment"
        )
    if attempts < 1 or retry_delay < 0:
        raise ValueError("attempts must be positive and retry delay non-negative")

    results: list[CheckResult] = []

    health, health_response = _retry_json(
        fetch,
        urljoin(base_url, "api/health"),
        "health",
        attempts=attempts,
        retry_delay=retry_delay,
        sleep=sleep,
    )
    if health.get("status") != "ok" or not health.get("version"):
        raise AssertionError("health is not ok or has no deployed version")
    results.append(_passed("health", str(health["version"]), health_response))

    ready, ready_response = _retry_json(
        fetch,
        urljoin(base_url, "api/health/ready"),
        "readiness",
        attempts=attempts,
        retry_delay=retry_delay,
        sleep=sleep,
    )
    if ready.get("status") != "ok":
        raise AssertionError("readiness is not ok")
    if ready.get("data_policy") != "synthetic-only":
        raise AssertionError("deployed data policy is not synthetic-only")
    keys = ready.get("keys")
    if (
        not isinstance(keys, dict)
        or set(keys) != {"gemini", "gemini_2", "typesafe"}
        or not all(keys.get(name) is True for name in ("gemini", "typesafe"))
    ):
        raise AssertionError("approved provider keys are not ready")
    results.append(_passed("readiness", "database and policy ready", ready_response))

    root_response = fetch(base_url)
    _assert_no_redirect(root_response, base_url, "root SPA")
    _check_spa(root_response, "root SPA")
    results.append(_passed("root_spa", "/", root_response))

    spa_url = urljoin(base_url, "smoke-client-route")
    spa_response = fetch(spa_url)
    _assert_no_redirect(spa_response, spa_url, "SPA fallback")
    _check_spa(spa_response, "SPA fallback")
    results.append(_passed("spa_fallback", "/smoke-client-route", spa_response))

    judge_url = urljoin(base_url, "judge")
    judge_response = fetch(judge_url)
    _assert_no_redirect(judge_response, judge_url, "public judge route")
    _check_spa(judge_response, "public judge route")
    results.append(_passed("public_judge", "unauthenticated /judge", judge_response))

    artifact_url = urljoin(base_url, artifact_path.lstrip("/"))
    artifact_response = fetch(artifact_url)
    _assert_no_redirect(artifact_response, artifact_url, "artifact download")
    _check_artifact(artifact_response)
    results.append(_passed("artifact_download", artifact_path, artifact_response))

    private_result = fetch(private_object_url)
    _assert_no_redirect(private_result, private_object_url, "private object")
    if private_result.status not in {401, 403}:
        raise AssertionError(
            "known private object was not denied anonymously "
            f"(HTTP {private_result.status})"
        )
    results.append(
        _passed(
            "private_object_denial", f"HTTP {private_result.status}", private_result
        )
    )
    return results


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--artifact-path", required=True)
    parser.add_argument("--private-object-url", required=True)
    parser.add_argument("--attempts", type=int, default=12)
    parser.add_argument("--retry-delay", type=float, default=5.0)
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    try:
        results = run_checks(
            base_url=arguments.base_url,
            artifact_path=arguments.artifact_path,
            private_object_url=arguments.private_object_url,
            attempts=arguments.attempts,
            retry_delay=arguments.retry_delay,
        )
    except (AssertionError, RuntimeError, TypeError, ValueError) as error:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "checked_at": datetime.now(UTC).isoformat(),
                    "error": str(error),
                },
                sort_keys=True,
            )
        )
        return 1

    print(
        json.dumps(
            {
                "status": "passed",
                "checked_at": datetime.now(UTC).isoformat(),
                "checks": [asdict(result) for result in results],
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
