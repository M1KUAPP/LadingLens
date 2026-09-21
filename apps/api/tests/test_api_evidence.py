"""GET /api/evidence/{id} and the judge artifact downloads.

Expected bytes are read by hand from the bundle files, never recomputed by
the code under test.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
import pytest_asyncio

from app.api.deps import Services
from app.config import get_settings
from app.guest import SESSION_HEADER, GuestSessions
from app.main import app
from app.persistence import PersistenceService
from app.seed_catalog import SeedCatalog, load_seed_catalog
from app.storage import InMemoryPrivateObjectStore

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_DIR = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
ATTACHMENTS = BUNDLE_DIR / "attachments"


@pytest_asyncio.fixture
async def client(postgres_session_factory) -> AsyncIterator[httpx.AsyncClient]:
    object_store = InMemoryPrivateObjectStore()
    persistence = PersistenceService(postgres_session_factory, object_store)
    services = Services(
        settings=get_settings(),
        session_factory=postgres_session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=GuestSessions(postgres_session_factory, persistence),
    )
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client
    app.state.services = previous_services


async def _guest_headers(client: httpx.AsyncClient) -> dict[str, str]:
    created = await client.post("/api/session")
    token = created.json()["session_token"]
    return {SESSION_HEADER: token}


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def catalog() -> SeedCatalog:
    return await load_seed_catalog(get_settings())


# --- GET /api/evidence/{attachment_id} --------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_evidence_bytes_match_the_bundle_file_with_inline_headers(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/evidence/email_001-1", headers=headers)

    assert response.status_code == 200
    assert response.content == (ATTACHMENTS / "email_001_SI.txt").read_bytes()
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert (
        response.headers["content-disposition"] == 'inline; filename="email_001_SI.txt"'
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("attachment_id", "file_name", "media_type"),
    [
        (
            "email_005-1",
            "email_005_SI.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
        (
            "email_055-2",
            "email_055_BL.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        ("email_059-1", "email_059_SI.pdf", "application/pdf"),
    ],
)
async def test_evidence_media_type_matches_the_detected_format(
    client: httpx.AsyncClient, attachment_id: str, file_name: str, media_type: str
) -> None:
    headers = await _guest_headers(client)

    response = await client.get(f"/api/evidence/{attachment_id}", headers=headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == media_type
    assert response.content == (ATTACHMENTS / file_name).read_bytes()


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_unknown_attachment_id_is_a_404(client: httpx.AsyncClient) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/evidence/email_999-nonexistent", headers=headers)

    assert response.status_code == 404
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "attachment_not_found"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_path_traversal_attachment_id_is_a_404(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/evidence/..%2Fconfig", headers=headers)

    assert response.status_code == 404
    assert response.headers["cache-control"] == "no-store"


# --- Every download requires a session --------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "path",
    [
        "/api/evidence/email_001-1",
        "/api/artifacts/submission.json",
        "/api/artifacts/expected-shipments.csv",
    ],
)
async def test_downloads_require_a_guest_session(
    client: httpx.AsyncClient, path: str
) -> None:
    response = await client.get(path)

    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "session_required"


# --- GET /api/artifacts/submission.json -------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_submission_artifact_has_520_records_of_five_fields_each(
    client: httpx.AsyncClient, catalog: SeedCatalog
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/artifacts/submission.json", headers=headers)

    assert response.status_code == 200
    assert response.content == catalog.submission_json
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-ladinglens-source"] == "prepared"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="ladinglens-submission-seed-v1.json"'
    )
    body = json.loads(response.content)
    assert len(body) == 520
    assert all(len(fields) == 5 for fields in body.values())


# --- GET /api/artifacts/expected-shipments.csv ------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_expected_shipments_csv_starts_with_the_header_row(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get(
        "/api/artifacts/expected-shipments.csv", headers=headers
    )

    assert response.status_code == 200
    csv_bytes = (
        BUNDLE_DIR / "fixtures" / "SYNTHETIC_expected_shipments.csv"
    ).read_bytes()
    assert response.content == csv_bytes
    assert response.content.splitlines()[0] == (
        b"source_system,shipment_id,booking_reference,external_identifiers,"
        b"lifecycle,required_documents,cutoff_at,owner,source_updated_at,"
        b"source_freshness"
    )
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="SYNTHETIC_expected_shipments.csv"'
    )
