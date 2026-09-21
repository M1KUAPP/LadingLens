#!/usr/bin/env python3
"""Verify effective GCP secret and object-storage controls for Averis."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections.abc import Mapping, Sequence
from typing import Any

APPROVED_SECRETS = {
    "averis-database-url",
    "averis-gemini-api-key",
    "averis-gemini-api-key-2",
    "averis-typesafe-api-key",
}
PRIVATE_PREFIXES = ("source-objects/", "submission-artifacts/")
PRIVATE_PREFIX_CONDITION_TITLE = "averis-private-object-prefixes"
APPROVED_STORAGE_ROLES = {
    "roles/storage.objectCreator",
    "roles/storage.objectViewer",
}
PUBLIC_MEMBERS = {"allUsers", "allAuthenticatedUsers"}


class ControlError(RuntimeError):
    pass


def _bindings(policy: Mapping[str, Any]) -> Sequence[Mapping[str, Any]]:
    value = policy.get("bindings", [])
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ControlError("IAM policy bindings have an invalid shape")
    return value


def _members(binding: Mapping[str, Any]) -> set[str]:
    value = binding.get("members", [])
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ControlError("IAM policy members have an invalid shape")
    return set(value)


def validate_controls(
    *,
    bucket: str,
    runtime_service_account: str,
    bucket_document: Mapping[str, Any],
    bucket_policy: Mapping[str, Any],
    project_policy: Mapping[str, Any],
    secret_policies: Mapping[str, Mapping[str, Any]],
    canary_exists: bool,
) -> None:
    runtime_member = f"serviceAccount:{runtime_service_account}"
    iam_config = bucket_document.get("iamConfiguration")
    if not isinstance(iam_config, dict):
        raise ControlError("bucket IAM configuration is missing")
    uniform = iam_config.get("uniformBucketLevelAccess")
    if not isinstance(uniform, dict) or uniform.get("enabled") is not True:
        raise ControlError("uniform bucket-level access is not enabled")
    if iam_config.get("publicAccessPrevention") != "enforced":
        raise ControlError("public access prevention is not enforced")

    bucket_bindings = _bindings(bucket_policy)
    if any(_members(binding) & PUBLIC_MEMBERS for binding in bucket_bindings):
        raise ControlError("bucket policy contains a public principal")

    runtime_bindings = [
        binding for binding in bucket_bindings if runtime_member in _members(binding)
    ]
    unexpected_roles = {
        str(binding.get("role"))
        for binding in runtime_bindings
        if binding.get("role") not in APPROVED_STORAGE_ROLES
    }
    if unexpected_roles:
        raise ControlError(
            "runtime has an unapproved storage role (including object-admin): "
            + ", ".join(sorted(unexpected_roles))
        )
    expected_expression = " || ".join(
        "resource.name.startsWith("
        f"'projects/_/buckets/{bucket}/objects/{prefix}')"
        for prefix in PRIVATE_PREFIXES
    )
    for required_role in APPROVED_STORAGE_ROLES:
        candidates = [
            binding
            for binding in runtime_bindings
            if binding.get("role") == required_role
        ]
        if len(candidates) != 1:
            raise ControlError(
                f"runtime must have one conditioned {required_role} grant"
            )
        condition = candidates[0].get("condition")
        expression = (
            condition.get("expression", "") if isinstance(condition, dict) else ""
        )
        title = condition.get("title", "") if isinstance(condition, dict) else ""
        if (
            title != PRIVATE_PREFIX_CONDITION_TITLE
            or re.sub(r"\s+", " ", expression).strip() != expected_expression
        ):
            raise ControlError(f"{required_role} is not limited to private prefixes")

    project_bindings = _bindings(project_policy)
    project_roles = {
        str(binding.get("role"))
        for binding in project_bindings
        if runtime_member in _members(binding)
    }
    if project_roles:
        raise ControlError(
            "runtime still has project-level IAM access "
            "(including project-level secret or storage access): "
            + ", ".join(sorted(project_roles))
        )

    runtime_secret_bindings = [
        (secret, binding)
        for secret, policy in secret_policies.items()
        for binding in _bindings(policy)
        if runtime_member in _members(binding)
    ]
    unexpected_secret_roles = {
        str(binding.get("role"))
        for _, binding in runtime_secret_bindings
        if binding.get("role") != "roles/secretmanager.secretAccessor"
    }
    if unexpected_secret_roles:
        raise ControlError(
            "runtime has an unapproved secret role: "
            + ", ".join(sorted(unexpected_secret_roles))
        )

    accessible_secrets = {
        secret
        for secret, binding in runtime_secret_bindings
        if binding.get("role") == "roles/secretmanager.secretAccessor"
    }
    if accessible_secrets != APPROVED_SECRETS:
        raise ControlError(
            "runtime secret access does not match the approved allowlist"
        )
    if not canary_exists:
        raise ControlError("known private canary object does not exist")


def _gcloud_json(*arguments: str) -> Any:
    completed = subprocess.run(
        ["gcloud", *arguments, "--format=json"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return json.loads(completed.stdout)


def _safe_name(value: str, label: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._@-]{0,253}", value) is None:
        raise ControlError(f"{label} has an invalid value")
    return value


def _safe_canary_key(value: str) -> str:
    if (
        re.fullmatch(r"private-canary/[A-Za-z0-9][A-Za-z0-9._/-]{0,500}", value) is None
        or ".." in value.split("/")
        or value.endswith("/")
    ):
        raise ControlError("canary key must name an object under private-canary/")
    return value


def verify_remote_controls(
    *, project: str, bucket: str, runtime_service_account: str, canary_key: str
) -> None:
    project = _safe_name(project, "project")
    bucket = _safe_name(bucket, "bucket")
    runtime_service_account = _safe_name(
        runtime_service_account, "runtime service account"
    )
    canary_key = _safe_canary_key(canary_key)

    bucket_document = _gcloud_json("storage", "buckets", "describe", f"gs://{bucket}")
    bucket_policy = _gcloud_json(
        "storage", "buckets", "get-iam-policy", f"gs://{bucket}"
    )
    project_policy = _gcloud_json("projects", "get-iam-policy", project)
    secrets = _gcloud_json("secrets", "list", "--project", project)
    if not isinstance(secrets, list):
        raise ControlError("secret listing has an invalid shape")

    secret_policies: dict[str, Mapping[str, Any]] = {}
    for secret_document in secrets:
        if not isinstance(secret_document, dict):
            raise ControlError("secret listing has an invalid item")
        resource_name = secret_document.get("name")
        if not isinstance(resource_name, str) or "/secrets/" not in resource_name:
            raise ControlError("secret listing has no resource name")
        secret_name = resource_name.rsplit("/", 1)[-1]
        policy = _gcloud_json(
            "secrets", "get-iam-policy", secret_name, "--project", project
        )
        if not isinstance(policy, dict):
            raise ControlError("secret IAM policy has an invalid shape")
        secret_policies[secret_name] = policy

    try:
        _gcloud_json("storage", "objects", "describe", f"gs://{bucket}/{canary_key}")
        canary_exists = True
    except subprocess.CalledProcessError:
        canary_exists = False

    if not all(
        isinstance(document, dict)
        for document in (bucket_document, bucket_policy, project_policy)
    ):
        raise ControlError("GCP control-plane response has an invalid shape")
    validate_controls(
        bucket=bucket,
        runtime_service_account=runtime_service_account,
        bucket_document=bucket_document,
        bucket_policy=bucket_policy,
        project_policy=project_policy,
        secret_policies=secret_policies,
        canary_exists=canary_exists,
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--runtime-service-account", required=True)
    parser.add_argument("--canary-key", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    try:
        verify_remote_controls(
            project=arguments.project,
            bucket=arguments.bucket,
            runtime_service_account=arguments.runtime_service_account,
            canary_key=arguments.canary_key,
        )
    except (ControlError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}, sort_keys=True))
        return 1
    print(
        json.dumps(
            {
                "status": "passed",
                "checks": [
                    "approved_secret_allowlist",
                    "private_bucket_controls",
                    "least_privilege_runtime_storage",
                    "known_private_canary_exists",
                ],
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
