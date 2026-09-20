import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[3] / "scripts" / "verify_gcp_controls.py"
SPEC = importlib.util.spec_from_file_location("verify_gcp_controls", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
controls = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = controls
SPEC.loader.exec_module(controls)

RUNTIME_EMAIL = "averis-runtime@example.iam.gserviceaccount.com"
RUNTIME_MEMBER = f"serviceAccount:{RUNTIME_EMAIL}"
CONDITION = {
    "title": "averis-private-object-prefixes",
    "expression": (
        "resource.name.startsWith('projects/_/buckets/private/objects/"
        "source-objects/') || resource.name.startsWith('projects/_/buckets/"
        "private/objects/submission-artifacts/')"
    ),
}


def _secret_policies() -> dict[str, dict]:
    return {
        secret: {
            "bindings": [
                {
                    "role": "roles/secretmanager.secretAccessor",
                    "members": [RUNTIME_MEMBER],
                }
            ]
        }
        for secret in controls.APPROVED_SECRETS
    }


def _validate(**overrides) -> None:
    arguments = {
        "bucket": "private",
        "runtime_service_account": RUNTIME_EMAIL,
        "bucket_document": {
            "iamConfiguration": {
                "publicAccessPrevention": "enforced",
                "uniformBucketLevelAccess": {"enabled": True},
            }
        },
        "bucket_policy": {
            "bindings": [
                {
                    "role": "roles/storage.objectCreator",
                    "members": [RUNTIME_MEMBER],
                    "condition": CONDITION,
                },
                {
                    "role": "roles/storage.objectViewer",
                    "members": [RUNTIME_MEMBER],
                    "condition": CONDITION,
                },
            ]
        },
        "project_policy": {"bindings": []},
        "secret_policies": _secret_policies(),
        "canary_exists": True,
    }
    arguments.update(overrides)
    controls.validate_controls(**arguments)


def test_accepts_exact_private_least_privilege_controls() -> None:
    _validate()


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        (
            {
                "bucket_document": {
                    "iamConfiguration": {
                        "publicAccessPrevention": "inherited",
                        "uniformBucketLevelAccess": {"enabled": True},
                    }
                }
            },
            "public access prevention",
        ),
        (
            {
                "bucket_policy": {
                    "bindings": [
                        {"role": "roles/storage.objectViewer", "members": ["allUsers"]}
                    ]
                }
            },
            "public principal",
        ),
        (
            {
                "project_policy": {
                    "bindings": [
                        {
                            "role": "roles/secretmanager.secretAccessor",
                            "members": [RUNTIME_MEMBER],
                        }
                    ]
                }
            },
            "project-level secret",
        ),
        ({"canary_exists": False}, "canary"),
    ],
)
def test_rejects_unsafe_effective_controls(overrides: dict, message: str) -> None:
    with pytest.raises(controls.ControlError, match=message):
        _validate(**overrides)


def test_rejects_extra_runtime_secret_or_object_admin() -> None:
    secret_policies = _secret_policies()
    secret_policies["averis-openai-api-key"] = {
        "bindings": [
            {
                "role": "roles/secretmanager.secretAccessor",
                "members": [RUNTIME_MEMBER],
            }
        ]
    }
    with pytest.raises(controls.ControlError, match="allowlist"):
        _validate(secret_policies=secret_policies)

    with pytest.raises(controls.ControlError, match="object-admin"):
        _validate(
            bucket_policy={
                "bindings": [
                    {
                        "role": "roles/storage.objectAdmin",
                        "members": [RUNTIME_MEMBER],
                    }
                ]
            }
        )


def test_canary_key_must_name_a_specific_private_canary() -> None:
    for value in ("", "private-canary/", "source-objects/a", "private-canary/../x"):
        with pytest.raises(controls.ControlError, match="canary"):
            controls._safe_canary_key(value)
