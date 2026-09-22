"""Write the web app's prepared fixtures from the seed baseline.

The pages that read checked-in data show exactly what the seed computes:

- apps/web/src/data/inbox-fixture.json: every email with its category,
  status and review reason, and each expected shipment's reconciliation
  outcome;
- apps/web/src/data/sample-submission.json: the seed's submission artifact,
  byte for byte;
- apps/web/src/features/reconciliation/fixtures/received_cases.json: the BL
  cases reconciliation reads, with the numbers each names and the documents
  it carries;
- apps/web/src/features/review-queue/fixtures/held_cases.json: the cases
  held for a person, with the reason each is held;
- apps/web/src/features/control-graph/fixtures/prepared.json: the control
  graph's overview, which the graph page draws while the API is away.

Run from apps/api after build_seed_decisions.py and
build_expected_shipments.py: uv run python scripts/build_web_fixtures.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = API_ROOT.parents[1]
sys.path.insert(0, str(API_ROOT))

from app.api.views import _held_review_evidence
from app.contracts import ReconciliationOutcome, Status
from app.graph_chat import build_corpus, corpus_overview
from app.materialize import SEED_CASE_PREFIX
from app.seed_catalog import DECISIONS_PATH, SeedCatalog, SeedDecisions

BUNDLE_DIR = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
WEB_SRC = REPOSITORY_ROOT / "apps" / "web" / "src"
INBOX_FIXTURE = WEB_SRC / "data" / "inbox-fixture.json"
SAMPLE_SUBMISSION = WEB_SRC / "data" / "sample-submission.json"
RECEIVED_CASES = (
    WEB_SRC / "features" / "reconciliation" / "fixtures" / "received_cases.json"
)
HELD_CASES = WEB_SRC / "features" / "review-queue" / "fixtures" / "held_cases.json"
CONTROL_GRAPH = WEB_SRC / "features" / "control-graph" / "fixtures" / "prepared.json"


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=1) + "\n"


def _shipment_entries(catalog: SeedCatalog) -> list[dict[str, object]]:
    """Each expected shipment's outcome, with the email it matched."""
    reconciliation = catalog.reconciliation
    outcome: dict[str, tuple[str, str | None]] = {}
    for result in reconciliation.results:
        root = result.root
        cases = [
            *getattr(root, "case_ids", ()),
            *getattr(root, "candidate_case_ids", ()),
        ]
        email_id = cases[0].removeprefix(SEED_CASE_PREFIX) if cases else None
        for shipment_id in (
            getattr(root, "shipment_id", None),
            *getattr(root, "candidate_shipment_ids", ()),
        ):
            if shipment_id is not None:
                outcome[shipment_id] = (root.outcome, email_id)
    return [
        {
            "shipment_id": shipment.shipment_id,
            "booking_reference": shipment.booking_reference or "",
            "lifecycle": shipment.lifecycle.value,
            "outcome": outcome[shipment.shipment_id][0],
            "linked_email_id": outcome[shipment.shipment_id][1],
        }
        for shipment in reconciliation.shipments
    ]


def render_fixtures(catalog: SeedCatalog) -> dict[Path, str]:
    submission = json.loads(catalog.submission_json)
    emails = [catalog.emails[email_id] for email_id in sorted(catalog.emails)]
    unmatched = sum(
        result.root.outcome == ReconciliationOutcome.UNMATCHED_CASE
        for result in catalog.reconciliation.results
    )
    inbox = {
        "received_count": len(emails),
        "unmatched_case_count": unmatched,
        "emails": [
            {
                "email_id": email.email_id,
                "sender": email.sender,
                "subject": email.subject or "",
                "attachments": [item.bundle_path for item in email.attachments],
                "outcome": {
                    key: submission[email.email_id][key]
                    for key in ("category", "status", "review_reason")
                },
            }
            for email in emails
        ],
        "reconciliation": _shipment_entries(catalog),
    }
    cases = [
        {
            "case_id": case.case_id,
            "email_id": case.case_id.removeprefix(SEED_CASE_PREFIX),
            "identifiers": case.identifiers,
            "documents": [kind.value for kind in case.documents],
        }
        for case in catalog.reconciliation.cases
    ]
    held = [
        {
            "case_id": email.case.case_id,
            "email_id": email.email_id,
            "review_reason": email.case.evaluator_output.review_reason.value,
            "evidence_summary": _held_review_evidence(email.case)[0],
            "received_at": email.received_at.isoformat(),
        }
        for email in emails
        if email.case.evaluator_output.status is Status.NEEDS_REVIEW
    ]
    overview = corpus_overview(build_corpus(catalog))
    graph = {
        "nodes": [node.model_dump(exclude_none=True) for node in overview.nodes],
        "edges": [edge.model_dump(exclude_none=True) for edge in overview.edges],
    }
    return {
        INBOX_FIXTURE: _json(inbox),
        SAMPLE_SUBMISSION: catalog.submission_json.decode("utf-8"),
        RECEIVED_CASES: _json(cases),
        HELD_CASES: _json(held),
        CONTROL_GRAPH: _json(graph),
    }


async def build_catalog() -> SeedCatalog:
    decisions = SeedDecisions.model_validate_json(DECISIONS_PATH.read_bytes())
    return await SeedCatalog.build(BUNDLE_DIR, decisions, demo_owner_id="docs-demo")


def main() -> None:
    for path, text in render_fixtures(asyncio.run(build_catalog())).items():
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
