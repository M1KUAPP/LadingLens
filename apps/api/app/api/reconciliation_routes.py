from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import GuestDep, SeedCatalogDep
from app.api.views import reconciliation_row

router = APIRouter(prefix="/api", tags=["reconciliation"])


@router.get("/reconciliation")
async def read_reconciliation(
    guest: GuestDep, catalog: SeedCatalogDep
) -> dict[str, object]:
    reconciliation = catalog.reconciliation
    return {
        "shipments": [
            shipment.model_dump(mode="json") for shipment in reconciliation.shipments
        ],
        "results": [
            reconciliation_row(result, None) for result in reconciliation.results
        ],
    }
