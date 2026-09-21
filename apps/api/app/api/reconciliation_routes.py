from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import GuestDep, MaterializerDep, SeedCatalogDep
from app.api.views import reconciliation_row

router = APIRouter(prefix="/api", tags=["reconciliation"])


@router.get("/reconciliation")
async def read_reconciliation(
    guest: GuestDep, catalog: SeedCatalogDep, materializer: MaterializerDep
) -> dict[str, object]:
    reconciliation = catalog.reconciliation
    overlays = await materializer.exception_overlays(guest)
    return {
        "shipments": [
            shipment.model_dump(mode="json") for shipment in reconciliation.shipments
        ],
        "results": [
            reconciliation_row(result, overlays.get(result.root.reconciliation_id))
            for result in reconciliation.results
        ],
    }
