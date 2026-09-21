from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import GuestDep, MaterializerDep, SeedCatalogDep
from app.api.errors import ApiProblem
from app.api.views import email_detail_view, gate_summary, inbox_row
from app.seed_catalog import SEED_VERSION

router = APIRouter(prefix="/api", tags=["inbox"])


@router.get("/summary")
async def read_summary(guest: GuestDep, catalog: SeedCatalogDep) -> dict[str, object]:
    return gate_summary(catalog)


@router.get("/emails")
async def list_emails(
    guest: GuestDep, catalog: SeedCatalogDep, materializer: MaterializerDep
) -> dict[str, object]:
    overlays = await materializer.case_overlays(guest)
    emails = [
        inbox_row(email, overlays.get(email.email_id))
        for email in catalog.emails.values()
    ]
    return {
        "seed_version": SEED_VERSION,
        "source": catalog.decision_source,
        "received_count": len(emails),
        "emails": emails,
    }


@router.get("/emails/{email_id}")
async def read_email(
    email_id: str,
    guest: GuestDep,
    catalog: SeedCatalogDep,
    materializer: MaterializerDep,
) -> dict[str, object]:
    seed_email = catalog.emails.get(email_id)
    if seed_email is None:
        raise ApiProblem(404, "email_not_found", "No email exists with that ID.")
    overlays = await materializer.case_overlays(guest)
    return email_detail_view(seed_email, overlays.get(email_id))
