"""Write the prepared expected-shipment ledger from the synthetic bundle.

The ledger stands in for a booking system's list of shipments that expect a
BL check. Every seed BL comparison case gives one shipment, keyed by the
numbers its documents and email name:

- a case whose email asks for its draft BL -> DRAFT_BL_EXPECTED;
- any other BL comparison -> BL_CHECK_REQUIRED.

A case with no readable number (a scan under a subject that names none) has
no shipment, so it reconciles as an unmatched case. Three prepared scenarios
cover the remaining outcomes, each with the bundle's own numbers:

- email_013's shipment is stale in the booking system;
- email_009's booking is split across two shipments held by two desks, so
  its case is ambiguous and goes to the exception queue;
- email_007 is an SI request whose draft BL came due with no case.

The same file is written to the bundle's fixtures, where the seed reads it,
and to the web app, which offers it for download and import.

Run from apps/api: uv run python scripts/build_expected_shipments.py
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
import re
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = API_ROOT.parents[1]
sys.path.insert(0, str(API_ROOT))

from app.reconciliation import CSV_COLUMNS, CaseSnapshot
from app.seed_catalog import (
    DECISIONS_PATH,
    EXPECTED_SHIPMENTS_CSV,
    SeedCatalog,
    SeedDecisions,
)

BUNDLE_DIR = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
WEB_LEDGER = (
    REPOSITORY_ROOT
    / "apps"
    / "web"
    / "src"
    / "features"
    / "reconciliation"
    / "fixtures"
    / "expected_shipments.csv"
)
SOURCE_SYSTEM = "SYNTHETIC_HACKATHON_FIXTURE"
OWNER = "docs-desk"
SPLIT_OWNERS = (OWNER, "docs-desk-2")
REQUIRED_DOCUMENTS = '["SI","DRAFT_BL"]'
# The booking system's export the day before the inbox was read, and the
# end of that day for every check it expects.
UPDATED_AT = "2026-09-19T00:00:00Z"
CUTOFF_AT = "2026-09-20T00:00:00Z"
STALE_UPDATED_AT = "2026-09-10T00:00:00Z"

STALE_EMAIL = "email_013"
SPLIT_EMAIL = "email_009"
MISSING_CASE_EMAIL = "email_007"
# "REQUEST SI _ <OC> _ <port> _ <consignee> _ <BL>"
_SI_REQUEST_SUBJECT = re.compile(
    r"REQUEST SI _ (?P<order_number>\d[A-Z]{3}-\d{5}) _ .+ _ "
    r"(?P<bl_number>[A-Z0-9]+)\s*$"
)


def _row(
    shipment_id: str,
    *,
    booking_reference: str | None,
    identifiers: dict[str, str],
    lifecycle: str,
    owner: str = OWNER,
    updated_at: str = UPDATED_AT,
    freshness: str = "CURRENT",
) -> dict[str, str]:
    return {
        "source_system": SOURCE_SYSTEM,
        "shipment_id": shipment_id,
        "booking_reference": booking_reference or "",
        "external_identifiers": json.dumps(identifiers, separators=(",", ":")),
        "lifecycle": lifecycle,
        "required_documents": REQUIRED_DOCUMENTS,
        "cutoff_at": CUTOFF_AT,
        "owner": owner,
        "source_updated_at": updated_at,
        "source_freshness": freshness,
    }


def _case_row(case: CaseSnapshot, *, awaiting: bool) -> dict[str, str]:
    booking = case.identifiers.get("booking_reference")
    others = {
        name: case.identifiers[name]
        for name in ("order_number", "bl_number")
        if name in case.identifiers
    }
    key = others.get("order_number") or booking or others["bl_number"]
    stale = case.case_id == f"seed-case:{STALE_EMAIL}"
    return _row(
        f"SHP-{key}",
        booking_reference=booking,
        identifiers=others,
        lifecycle="DRAFT_BL_EXPECTED" if awaiting else "BL_CHECK_REQUIRED",
        updated_at=STALE_UPDATED_AT if stale else UPDATED_AT,
        freshness="STALE" if stale else "CURRENT",
    )


def _missing_case_row() -> dict[str, str]:
    record = json.loads(
        (BUNDLE_DIR / "inbox" / f"{MISSING_CASE_EMAIL}.json").read_text(
            encoding="utf-8"
        )
    )
    match = _SI_REQUEST_SUBJECT.search(record["subject"])
    if match is None:
        raise ValueError(f"{MISSING_CASE_EMAIL} no longer names its OC and BL")
    return _row(
        f"SHP-{match['order_number']}",
        booking_reference=None,
        identifiers=match.groupdict(),
        lifecycle="DRAFT_BL_EXPECTED",
    )


async def build_rows() -> list[dict[str, str]]:
    decisions = SeedDecisions.model_validate_json(DECISIONS_PATH.read_bytes())
    catalog = await SeedCatalog.build(BUNDLE_DIR, decisions, demo_owner_id=OWNER)
    rows: list[dict[str, str]] = []
    for case in catalog.reconciliation.cases:
        if not case.identifiers:
            continue
        email_id = case.case_id.removeprefix("seed-case:")
        if email_id == SPLIT_EMAIL:
            booking = case.identifiers["booking_reference"]
            rows.extend(
                _row(
                    f"SHP-{booking}-{part}",
                    booking_reference=booking,
                    identifiers={},
                    lifecycle="BL_CHECK_REQUIRED",
                    owner=owner,
                )
                for part, owner in enumerate(SPLIT_OWNERS, start=1)
            )
            continue
        # A draft-BL request closes with neither verdicts nor diagnostics.
        seed_case = catalog.emails[email_id].case
        awaiting = not seed_case.field_verdicts and not seed_case.structural_diagnostics
        rows.append(_case_row(case, awaiting=awaiting))
    rows.append(_missing_case_row())
    return rows


def render_ledger() -> str:
    rows = asyncio.run(build_rows())
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def main() -> None:
    ledger = render_ledger()
    for path in (BUNDLE_DIR / EXPECTED_SHIPMENTS_CSV, WEB_LEDGER):
        path.write_text(ledger, encoding="utf-8")


if __name__ == "__main__":
    main()
