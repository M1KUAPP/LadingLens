from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import GuestDep, MaterializerDep, SeedCatalogDep
from app.api.errors import ApiProblem
from app.api.views import email_detail_view, gate_summary, inbox_row
from app.observability import bind_request_context
from app.seed_catalog import SEED_VERSION

router = APIRouter(prefix="/api", tags=["inbox"])


@router.get("/summary")
async def read_summary(
    request: Request, guest: GuestDep, catalog: SeedCatalogDep
) -> dict[str, object]:
    bind_request_context(request, route_choice=catalog.decision_source.upper())
    return gate_summary(catalog)


@router.get("/emails")
async def list_emails(
    request: Request,
    guest: GuestDep,
    catalog: SeedCatalogDep,
    materializer: MaterializerDep,
) -> dict[str, object]:
    bind_request_context(request, route_choice=catalog.decision_source.upper())
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
    request: Request,
    guest: GuestDep,
    catalog: SeedCatalogDep,
    materializer: MaterializerDep,
) -> dict[str, object]:
    seed_email = catalog.emails.get(email_id)
    if seed_email is None:
        raise ApiProblem(404, "email_not_found", "No email exists with that ID.")
    bind_request_context(
        request,
        case_ids=(seed_email.case.case_id,),
        source_hashes=(seed_email.message_hash,),
        route_choice=catalog.decision_source.upper(),
    )
    overlays = await materializer.case_overlays(guest)
    return email_detail_view(seed_email, overlays.get(email_id))
