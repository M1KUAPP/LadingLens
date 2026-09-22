"""GET /api/summary, /api/emails, /api/emails/{id}, and /api/reconciliation.

Expected seed values are read by hand from the bundle and decisions files (see
test_seed_catalog.py), never recomputed by the code under test.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import replace
from datetime import UTC, datetime
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio

from app.api.deps import Services
from app.api.views import (
    email_detail_view,
    gate_summary,
    inbox_row,
    reconciliation_row,
)
from app.config import get_settings
from app.contracts import ReviewReason, Status
from app.guest import SESSION_HEADER, GuestSessions
from app.main import app
from app.persistence import (
    CaseReviewActionRecord,
    CaseReviewStatus,
    PersistenceService,
    ReconciliationExceptionState,
)
from app.seed_catalog import SEED_VERSION, SeedCatalog, load_seed_catalog
from app.storage import InMemoryPrivateObjectStore
from app.submission import StructuralDiagnostic


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


# --- HTTP reads, with a guest session ---------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "path",
    ["/api/summary", "/api/emails", "/api/emails/email_001", "/api/reconciliation"],
)
async def test_reads_require_a_guest_session(
    client: httpx.AsyncClient, path: str
) -> None:
    response = await client.get(path)

    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "session_required"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_unknown_email_id_is_a_404(client: httpx.AsyncClient) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/emails/email_does_not_exist", headers=headers)

    assert response.status_code == 404
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "email_not_found"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_inbox_lists_all_520_seed_emails_labelled_prepared(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/emails", headers=headers)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["seed_version"] == SEED_VERSION
    assert body["source"] == "prepared"
    assert body["received_count"] == 520
    assert len(body["emails"]) == 520
    assert {row["source"] for row in body["emails"]} == {"prepared"}
    assert body["emails"][0]["email_id"] == "email_001"
    assert body["emails"][0]["attachments"] == [
        "email_001_SI.txt",
        "email_001_BL.txt",
    ]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_email_detail_for_a_fully_matched_case_has_no_held_review(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/emails/email_001", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "prepared"
    assert body["is_prepared"] is True
    assert body["category"] == "BL_COMPARISON"
    assert body["status"] == "OK"
    assert body["held_review"] is None
    assert [fv["field"] for fv in body["field_verdicts"]] == [
        "shipper",
        "consignee",
        "notify_party",
        "port_of_loading",
        "port_of_discharge",
        "container_count",
        "gross_weight_kg",
    ]
    assert {fv["verdict"] for fv in body["field_verdicts"]} == {"MATCH"}
    attachments = {item["attachment_id"]: item for item in body["attachments"]}
    assert attachments["email_001-1"]["document_type"] == "SI"
    assert attachments["email_001-1"]["parse_state"] == "PARSED"
    assert attachments["email_001-1"]["error"] is None
    assert attachments["email_001-2"]["document_type"] == "DRAFT_BL"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_email_detail_holds_an_unreadable_attachment_for_review(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/emails/email_511", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "NEEDS_REVIEW"
    assert body["review_reason"] == "unreadable"
    held = body["held_review"]
    assert held is not None
    assert held["case_id"] == "seed-case:email_511"
    assert held["disposition"] == "IN_REVIEW"
    assert held["probability"] is None
    assert held["history"] == []
    assert held["immutable_source"]["email_id"] == "email_511"
    attachments = {item["attachment_id"]: item for item in body["attachments"]}
    assert attachments["email_511-1"]["parse_state"] == "PARSED"
    assert attachments["email_511-2"]["parse_state"] == "UNREADABLE"
    assert attachments["email_511-2"]["document_type"] == "UNKNOWN"
    assert attachments["email_511-2"]["error"]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_wrong_type_attachment_is_readable_but_unknown_type(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/emails/email_501", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["review_reason"] == "wrong_doc_type"
    attachments = {item["attachment_id"]: item for item in body["attachments"]}
    assert attachments["email_501-2"]["document_type"] == "UNKNOWN"
    assert attachments["email_501-2"]["parse_state"] == "PARSED"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_summary_counts_add_up_to_520(client: httpx.AsyncClient) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["seed_version"] == SEED_VERSION
    assert body["source"] == "prepared"
    assert body["gate1"]["received"] == 520
    assert body["gate1"]["accounted"] == 520
    assert sum(body["gate1"]["by_category"].values()) == 520
    assert sum(body["comparison"].values()) == 520
    assert body["gate2"]["shipments"] == 220
    assert sum(body["gate2"]["outcomes"].values()) == 221


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_reconciliation_lists_the_ledger_with_one_missing_case(
    client: httpx.AsyncClient,
) -> None:
    headers = await _guest_headers(client)

    response = await client.get("/api/reconciliation", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body["shipments"]) == 220
    assert body["shipments"][0]["shipment_id"] == "SHP-5RSG-00133"
    assert len(body["results"]) == 221
    by_subject = {row["subject_key"]: row for row in body["results"]}
    missing = by_subject["shipment:SHP-5RFR-37631"]
    assert missing["outcome"] == "MISSING_CASE"
    assert missing["shipment_id"] == "SHP-5RFR-37631"


# --- pure mapper unit tests (app/api/views.py) ------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_parse_state_rejects_an_unsupported_attachment_format(
    catalog: SeedCatalog,
) -> None:
    seed_email = catalog.emails["email_001"]
    unsupported = replace(seed_email.attachments[0], detected_format="unknown")
    synthetic = replace(
        seed_email, attachments=(unsupported, *seed_email.attachments[1:])
    )

    detail = email_detail_view(synthetic, None)

    rejected = detail["attachments"][0]
    assert rejected["parse_state"] == "REJECTED"
    assert rejected["error"]


@pytest.mark.asyncio(loop_scope="session")
async def test_held_review_probability_is_the_lowest_review_field(
    catalog: SeedCatalog,
) -> None:
    seed_email = catalog.emails["email_001"]
    lower = seed_email.case.field_verdicts[0].model_copy(
        update={
            "interactive_state": "REVIEW",
            "semantic_probability": 0.5,
            "reason": "lower reason",
        }
    )
    higher = seed_email.case.field_verdicts[1].model_copy(
        update={
            "interactive_state": "REVIEW",
            "semantic_probability": 0.7,
            "reason": "higher reason",
        }
    )
    synthetic_case = replace(
        seed_email.case,
        field_verdicts=(lower, higher, *seed_email.case.field_verdicts[2:]),
        disposition="IN_REVIEW",
    )
    synthetic_email = replace(seed_email, case=synthetic_case)

    detail = email_detail_view(synthetic_email, None)

    held = detail["held_review"]
    assert held is not None
    assert held["probability"] == 0.5
    assert held["evidence_summary"] == "lower reason"


@pytest.mark.asyncio(loop_scope="session")
async def test_held_review_evidence_matches_the_case_review_reason(
    catalog: SeedCatalog,
) -> None:
    # email_511 is IN_REVIEW with review_reason unreadable in the seed.
    seed_email = catalog.emails["email_511"]
    missing_attachment = StructuralDiagnostic(
        reason=ReviewReason.MISSING_ATTACHMENT,
        detail="a missing attachment detail",
    )
    unreadable = StructuralDiagnostic(
        reason=ReviewReason.UNREADABLE,
        detail="an unreadable attachment detail",
    )
    synthetic_case = replace(
        seed_email.case, structural_diagnostics=(missing_attachment, unreadable)
    )
    synthetic_email = replace(seed_email, case=synthetic_case)

    detail = email_detail_view(synthetic_email, None)

    held = detail["held_review"]
    assert held is not None
    assert held["evidence_summary"] == "an unreadable attachment detail"


@pytest.mark.asyncio(loop_scope="session")
async def test_overlay_disposition_and_actions_win_over_the_seed(
    catalog: SeedCatalog,
) -> None:
    # email_511 is genuinely IN_REVIEW in the seed (an unreadable attachment);
    # the overlay simulates a reviewer who has since approved it.
    seed_email = catalog.emails["email_511"]
    action = CaseReviewActionRecord(
        review_action_id=uuid4(),
        actor_id="reviewer-1",
        action="APPROVE",
        rationale="Looks correct",
        corrected_fields=None,
        created_at=datetime(2026, 9, 21, tzinfo=UTC),
    )
    overlay = CaseReviewStatus(
        case_id=uuid4(),
        classification_state="CLASSIFIED",
        status=Status.OK,
        review_reason=None,
        assigned_owner_id="reviewer-1",
        review_fields=(),
        disposition="APPROVED",
        actions=(action,),
    )

    detail = email_detail_view(seed_email, overlay)
    row = inbox_row(seed_email, overlay)

    assert row["disposition"] == "APPROVED"
    held = detail["held_review"]
    assert held is not None
    assert held["disposition"] == "APPROVED"
    assert held["history"] == [
        {
            "id": str(action.review_action_id),
            "timestamp": "2026-09-21T00:00:00+00:00",
            "actor": "reviewer-1",
            "action": "APPROVE",
            "note": "Looks correct",
        }
    ]


@pytest.mark.asyncio(loop_scope="session")
async def test_reconciliation_row_normalizes_every_outcome_shape(
    catalog: SeedCatalog,
) -> None:
    by_outcome = {
        result.root.outcome: result for result in catalog.reconciliation.results
    }
    by_subject_key = {
        result.root.subject_key: result for result in catalog.reconciliation.results
    }

    present = reconciliation_row(by_subject_key["shipment:SHP-5RSG-00133"], None)
    assert present["shipment_id"] == "SHP-5RSG-00133"
    assert present["case_ids"] == ["seed-case:email_001"]
    assert present["candidate_shipment_ids"] == []
    assert present["assignment"] is None

    ambiguous = reconciliation_row(by_outcome["DUPLICATE_OR_AMBIGUOUS"], None)
    assert ambiguous["shipment_id"] is None
    assert ambiguous["case_ids"] == []
    assert ambiguous["candidate_shipment_ids"] == [
        "SHP-I978820812-1",
        "SHP-I978820812-2",
    ]
    assert ambiguous["candidate_case_ids"] == ["seed-case:email_009"]

    unmatched = reconciliation_row(by_subject_key["case:seed-case:email_512"], None)
    assert unmatched["outcome"] == "UNMATCHED_CASE"
    assert unmatched["shipment_id"] is None
    assert unmatched["case_ids"] == ["seed-case:email_512"]

    overlay = ReconciliationExceptionState(
        reconciliation_id=uuid4(),
        assigned_owner_id="owner-1",
        state="ASSIGNED",
        review_assignment_ids=(uuid4(),),
        review_action_ids=(),
    )
    assigned = reconciliation_row(by_outcome["MISSING_CASE"], overlay)
    assert assigned["assignment"] == {
        "assigned_owner_id": "owner-1",
        "state": "ASSIGNED",
    }


@pytest.mark.asyncio(loop_scope="session")
async def test_gate_summary_breaks_down_every_category_and_status(
    catalog: SeedCatalog,
) -> None:
    summary = gate_summary(catalog)

    assert summary["seed_version"] == SEED_VERSION
    assert summary["source"] == "prepared"
    assert set(summary["gate1"]["by_category"]) == {
        "BL_COMPARISON",
        "SI_REQUEST",
        "INVOICE_QUERY",
        "GENERAL",
        "SPAM",
    }
    assert summary["gate1"]["by_category"] == {
        "BL_COMPARISON": 220,
        "SI_REQUEST": 125,
        "INVOICE_QUERY": 75,
        "GENERAL": 60,
        "SPAM": 40,
    }
    assert summary["comparison"] == {"OK": 454, "MISMATCH": 46, "NEEDS_REVIEW": 20}
    assert summary["gate2"]["outcomes"] == {
        "CASE_PRESENT": 204,
        "DOCUMENT_MISSING": 12,
        "MISSING_CASE": 1,
        "UNMATCHED_CASE": 2,
        "SOURCE_STALE": 1,
        "DUPLICATE_OR_AMBIGUOUS": 1,
    }
