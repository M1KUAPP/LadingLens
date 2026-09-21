"""GET /api/evidence/{id} and the judge artifact downloads.

Evidence bytes and their ids only ever come from the in-memory seed catalog:
an attachment id is looked up in ``SeedCatalog.attachments``, never joined
into a filesystem path, so an unknown or path-traversal id is just a missing
dict key and 404s like any other.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Response

from app.api.deps import GuestDep, SeedCatalogDep, ServicesDep
from app.api.errors import ApiProblem
from app.seed_catalog import EXPECTED_SHIPMENTS_CSV

router = APIRouter(prefix="/api", tags=["evidence"])

_MEDIA_TYPES = {
    "txt": "text/plain; charset=utf-8",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

_UNSAFE_FILENAME_CHARS = str.maketrans("", "", '"\\\r\n')


def _content_disposition(disposition: str, file_name: str) -> str:
    """A defensively quoted header value; never built from a raw path."""
    safe_name = file_name.translate(_UNSAFE_FILENAME_CHARS)
    return f'{disposition}; filename="{safe_name}"'


@router.get("/evidence/{attachment_id}")
async def read_evidence(
    attachment_id: str, guest: GuestDep, catalog: SeedCatalogDep
) -> Response:
    attachment = catalog.attachments.get(attachment_id)
    if attachment is None:
        raise ApiProblem(
            404, "attachment_not_found", "No attachment exists with that ID."
        )
    return Response(
        content=catalog.read_attachment(attachment_id),
        media_type=_MEDIA_TYPES[attachment.detected_format],
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": _content_disposition("inline", attachment.file_name),
        },
    )


@router.get("/artifacts/submission.json")
async def read_submission_artifact(
    guest: GuestDep, catalog: SeedCatalogDep
) -> Response:
    return Response(
        content=catalog.submission_json,
        media_type="application/json",
        headers={
            "Content-Disposition": _content_disposition(
                "attachment", "ladinglens-submission-seed-v1.json"
            ),
            "X-LadingLens-Source": catalog.decision_source,
        },
    )


@router.get("/artifacts/expected-shipments.csv")
async def read_expected_shipments_csv(
    guest: GuestDep, services: ServicesDep
) -> Response:
    csv_bytes = (
        Path(services.settings.bundle_dir) / EXPECTED_SHIPMENTS_CSV
    ).read_bytes()
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": _content_disposition(
                "attachment", "SYNTHETIC_expected_shipments.csv"
            ),
        },
    )
