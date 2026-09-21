"""Write the prepared seed decisions to app/seed/decisions-v1.json.

Nothing here calls a provider or reads an organiser answer key. Every
decision is prepared, and the file says so:

- categories are the team's prepared offline classification in
  apps/web/src/data/inbox-fixture.json;
- a document's role comes from a header rule over the first HEADER_LINES
  non-blank lines of its parsed text, so a body that mentions another
  document type ("NOT A SHIPPING INSTRUCTION") does not count;
- the six scanned PDFs carry prepared human transcriptions of the seven
  compared fields;
- no equivalence probability is recorded.

Run from apps/api: uv run python scripts/build_seed_decisions.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = API_ROOT.parents[1]
sys.path.insert(0, str(API_ROOT))

from app.contracts import ComparedField
from app.extraction import GeminiDocument
from app.formats import parse_document, preflight
from app.jev import DocumentRole
from app.seed_catalog import DECISIONS_PATH, SEED_VERSION, SeedDecisions

BUNDLE_DIR = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
INBOX_FIXTURE = REPOSITORY_ROOT / "apps" / "web" / "src" / "data" / "inbox-fixture.json"
PREPARED_AT = "2026-09-21T00:00:00Z"
# Room for a letterhead row, the title, and its underline or reference line.
HEADER_LINES = 3
_SI_TITLE = re.compile(
    r"SHIPPING INSTRUCTION|BL INSTRUCTION|BILL OF LADING INSTRUCTION", re.IGNORECASE
)
_BL_TITLE = re.compile(r"BILL OF LADING", re.IGNORECASE)

# Each field's label as printed on the scans and its region, in field order.
_SCAN_LAYOUT = (
    (ComparedField.SHIPPER, "Shipper", "party"),
    (ComparedField.CONSIGNEE, "Consignee", "party"),
    (ComparedField.NOTIFY_PARTY, "Notify", "party"),
    (ComparedField.PORT_OF_LOADING, "Port of Loading", "routing"),
    (ComparedField.PORT_OF_DISCHARGE, "Port of Discharge", "routing"),
    (ComparedField.CONTAINER_COUNT, "Containers", "cargo"),
    (ComparedField.GROSS_WEIGHT_KG, "Gross Weight", "cargo"),
)
# Prepared human transcriptions: each SI and its draft BL print the same values.
_SCAN_VALUES = {
    "email_512": (
        "APRIL FAR EAST (M) SDN BHD",
        "AL GURG STATIONERY LLC",
        "AL GURG STATIONERY LLC",
        "NHAVA SHEVA, INDIA",
        "TUTICORIN, INDIA",
        "6 x 40'HC",
        "128,544 KG",
    ),
    "email_513": (
        "APRIL FINE PAPER TRADING",
        "KPP-ANTALIS (SINGAPORE) PTE. LTD.",
        "EAST BRIGHT FZ-LLC",
        "NHAVA SHEVA, INDIA",
        "VALPARAISO, CHILE",
        "10 x 40'HC",
        "237,750 KG",
    ),
    "email_514": (
        "ASIA PACIFIC PAPERBOARD TRADING PTE LTD",
        "EAST BRIGHT FZ-LLC",
        "EAST BRIGHT FZ-LLC",
        "NANTONG, CHINA",
        "GDANSK, POLAND",
        "1 x 20'FCL",
        "22,825 KG",
    ),
}
_SCAN_TITLES = {"SI": "SHIPPING INSTRUCTION", "BL": "BILL OF LADING (DRAFT)"}
_SCANS = {
    f"{email_id}_{kind}.pdf": (title, values)
    for email_id, values in _SCAN_VALUES.items()
    for kind, title in _SCAN_TITLES.items()
}
NOTES = [
    (
        "Prepared, not recorded: no provider was called and no organiser "
        "answer key was read."
    ),
    (
        "categories: the team's prepared offline classification, copied from "
        "apps/web/src/data/inbox-fixture.json."
    ),
    (
        f"roles: a header rule over the first {HEADER_LINES} non-blank lines of "
        "each attachment's parsed text, or of a scan's prepared transcription: "
        "SHIPPING INSTRUCTION, BL INSTRUCTION, or BILL OF LADING INSTRUCTION -> "
        "SI; else BILL OF LADING -> DRAFT_BL; else OTHER."
    ),
    (
        "scans: prepared human transcriptions of the seven compared fields of "
        "the six scanned PDFs (email_512 to email_514), not Gemini output."
    ),
    (
        "equivalence: none recorded; a textual difference that survives "
        "normalization is a prepared MISMATCH, never a Jev judgement."
    ),
]


def header_role(text: str) -> DocumentRole:
    lines = [line for line in text.splitlines() if line.strip()]
    header = "\n".join(lines[:HEADER_LINES])
    if _SI_TITLE.search(header):
        return DocumentRole.SI
    if _BL_TITLE.search(header):
        return DocumentRole.DRAFT_BL
    return DocumentRole.OTHER


def scan_document(title: str, values: tuple[str, ...]) -> GeminiDocument:
    lines = [title]
    fields: dict[str, dict[str, object]] = {}
    for (field, label, region), value in zip(_SCAN_LAYOUT, values, strict=True):
        lines.append(f"{label}: {value}")
        fields[field.value] = {"value": value, "page": 1, "region": region}
    return GeminiDocument.model_validate(
        {"document_title": title, "transcription": "\n".join(lines), "fields": fields}
    )


def build_decisions() -> SeedDecisions:
    fixture = json.loads(INBOX_FIXTURE.read_text(encoding="utf-8"))
    roles: dict[str, DocumentRole] = {}
    scans: dict[str, GeminiDocument] = {}
    for record_path in sorted((BUNDLE_DIR / "inbox").glob("email_*.json")):
        record = json.loads(record_path.read_text(encoding="utf-8"))
        for relative_path in record["attachments"]:
            path = BUNDLE_DIR / relative_path
            data = path.read_bytes()
            check = preflight(data, file_name=path.name)
            if check.status != "OK":
                continue  # unreadable or unsupported: no role is ever asked
            if check.scanned:
                document = scan_document(*_SCANS[path.name])
                scans[check.content_hash] = document
                text = document.transcription
            else:
                text = parse_document(
                    data, check, attachment_id=path.name, file_name=path.name
                ).text
            roles[check.content_hash] = header_role(text)
    return SeedDecisions(
        seed_version=SEED_VERSION,
        decision_source="prepared",
        recorded_at=PREPARED_AT,
        categories={
            email["email_id"]: email["outcome"]["category"]
            for email in fixture["emails"]
        },
        roles=roles,
        equivalence={},
        scans=scans,
        notes=NOTES,
    )


def render_decisions() -> str:
    payload = build_decisions().model_dump(mode="json")
    return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    DECISIONS_PATH.write_text(render_decisions(), encoding="utf-8")


if __name__ == "__main__":
    main()
