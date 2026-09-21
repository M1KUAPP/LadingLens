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
    """A defensively quoted header value; never built from a raw path.

    Only printable ASCII is kept: a header goes out as Latin-1, and an
    uploaded file's name can hold any character.
    """
    safe_name = "".join(
        character if " " <= character <= "~" else "_"
        for character in file_name.translate(_UNSAFE_FILENAME_CHARS)
    )
    return f'{disposition}; filename="{safe_name}"'


def _file_response_headers(
    disposition: str, file_name: str, *, extra: dict[str, str] | None = None
) -> dict[str, str]:
    """Headers shared by every file download: nosniff plus Content-Disposition."""
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": _content_disposition(disposition, file_name),
    }
    if extra:
        headers.update(extra)
    return headers


def inline_file_response(
    data: bytes, *, file_name: str, detected_format: str
) -> Response:
    """Evidence bytes shown in the browser, typed by their detected format."""
    return Response(
        content=data,
        media_type=_MEDIA_TYPES.get(detected_format, "application/octet-stream"),
        headers=_file_response_headers("inline", file_name),
    )


@router.get("/evidence/{attachment_id}")
async def read_evidence(
    attachment_id: str, guest: GuestDep, catalog: SeedCatalogDep
) -> Response:
    attachment = catalog.attachments.get(attachment_id)
    if attachment is None:
        raise ApiProblem(
            404, "attachment_not_found", "No attachment exists with that ID."
        )
    return inline_file_response(
        catalog.read_attachment(attachment_id),
        file_name=attachment.file_name,
        detected_format=attachment.detected_format,
    )


@router.get("/artifacts/submission.json")
async def read_submission_artifact(
    guest: GuestDep, catalog: SeedCatalogDep
) -> Response:
    return Response(
        content=catalog.submission_json,
        media_type="application/json",
        headers=_file_response_headers(
            "attachment",
            "ladinglens-submission-seed-v1.json",
            extra={"X-LadingLens-Source": catalog.decision_source},
        ),
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
        headers=_file_response_headers(
            "attachment", "SYNTHETIC_expected_shipments.csv"
        ),
    )
