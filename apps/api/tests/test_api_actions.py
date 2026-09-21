"""Review actions on seed cases and exceptions, recorded copy-on-write.

A guest's first action on a seed record copies it into that guest's own
workspace; the shared seed catalog and every other guest keep the seed.
"""

from __future__ import annotations

import asyncio
from collections import Counter
from collections.abc import AsyncIterator
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import func, select

from app.api.deps import Services
from app.config import get_settings
from app.contracts import ReviewReason, Status
from app.guest import SESSION_HEADER, GuestSessions
from app.main import app
from app.materialize import SeedMaterializer, guest_case_id, guest_reconciliation_id
from app.models import (
    AuditEventRecord,
    CaseRecord,
    EmailAttachment,
    EmailReceipt,
    FieldVerdictRecord,
    ReconciliationResultRecord,
)
from app.persistence import PersistenceService
from app.seed_catalog import SeedCatalog, load_seed_catalog
from app.storage import InMemoryPrivateObjectStore

HELD_CASE_ACTIONS = "/api/cases/seed-case:email_516/review-actions"
SYN_042 = uuid5(NAMESPACE_URL, "ladinglens:seed-v1:shipment:SYN-042")
SYN_042_ACTIONS = f"/api/reconciliation/{SYN_042}/actions"
APPROVE = {
    "action": "APPROVE",
    "actor_id": "reviewer-1",
    "rationale": "Weight confirmed with the shipper",
    "corrected_fields": None,
}
ASSIGN = {
    "action": "ASSIGN",
    "actor_id": "lead-1",
    "rationale": "Chase the missing booking",
    "assigned_owner_id": "ops-1",
}


@pytest.fixture
def services(postgres_session_factory) -> Services:
    object_store = InMemoryPrivateObjectStore()
    persistence = PersistenceService(postgres_session_factory, object_store)
    return Services(
        settings=get_settings(),
        session_factory=postgres_session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=GuestSessions(postgres_session_factory, persistence),
    )


@pytest_asyncio.fixture
async def client(services: Services) -> AsyncIterator[httpx.AsyncClient]:
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client
    app.state.services = previous_services


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def catalog() -> SeedCatalog:
    return await load_seed_catalog(get_settings())


async def _guest(client: httpx.AsyncClient) -> dict[str, str]:
    created = await client.post("/api/session")
    return {SESSION_HEADER: created.json()["session_token"]}


async def _workspace_id(services: Services, headers: dict[str, str]) -> UUID:
    context = await services.guests.resolve(headers[SESSION_HEADER])
    assert context is not None
    return context.workspace_id


async def _held_review(
    client: httpx.AsyncClient, headers: dict[str, str]
) -> dict[str, object]:
    response = await client.get("/api/emails/email_516", headers=headers)
    return response.json()["held_review"]


async def _inbox_disposition(
    client: httpx.AsyncClient, headers: dict[str, str], email_id: str
) -> str:
    response = await client.get("/api/emails", headers=headers)
    rows = {row["email_id"]: row for row in response.json()["emails"]}
    return rows[email_id]["disposition"]


async def _reconciliation_row(
    client: httpx.AsyncClient, headers: dict[str, str], reconciliation_id: UUID
) -> dict[str, object]:
    response = await client.get("/api/reconciliation", headers=headers)
    rows = {row["reconciliation_id"]: row for row in response.json()["results"]}
    return rows[str(reconciliation_id)]


async def _audit_events(services: Services, workspace_id: UUID) -> Counter[str]:
    async with services.session_factory() as session:
        return Counter(
            await session.scalars(
                select(AuditEventRecord.event_type).where(
                    AuditEventRecord.workspace_id == workspace_id
                )
            )
        )


async def _copied_rows(services: Services, workspace_id: UUID) -> tuple[int, int]:
    """The email receipts and cases a copy-on-write left in a workspace."""
    async with services.session_factory() as session:
        receipts = await session.scalar(
            select(func.count())
            .select_from(EmailReceipt)
            .where(EmailReceipt.workspace_id == workspace_id)
        )
        cases = await session.scalar(
            select(func.count())
            .select_from(CaseRecord)
            .where(CaseRecord.workspace_id == workspace_id)
        )
    return receipts, cases


def _history(row: dict[str, object]) -> list[tuple[str, str, str]]:
    return [(item["actor"], item["action"], item["note"]) for item in row["history"]]


def _seed_result(catalog: SeedCatalog, outcome: str):
    """One seed result per outcome; UNMATCHED_CASE is email_004's."""
    return next(
        result.root
        for result in catalog.reconciliation.results
        if result.root.outcome == outcome
        and (
            outcome != "UNMATCHED_CASE"
            or result.root.subject_key == "case:seed-case:email_004"
        )
    )


# --- case actions -------------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_approving_a_held_seed_case_changes_only_this_guests_view(
    client: httpx.AsyncClient,
) -> None:
    guest, other = await _guest(client), await _guest(client)

    response = await client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert (body["email_id"], body["source"], body["is_prepared"]) == (
        "email_516",
        "prepared",
        True,
    )
    held = body["held_review"]
    assert (held["case_id"], held["disposition"]) == (
        "seed-case:email_516",
        "APPROVED",
    )
    assert _history(held) == [
        ("reviewer-1", "APPROVE", "Weight confirmed with the shipper")
    ]
    assert await _held_review(client, guest) == held
    assert await _inbox_disposition(client, guest, "email_516") == "APPROVED"

    other_held = await _held_review(client, other)
    assert (other_held["disposition"], other_held["history"]) == ("IN_REVIEW", [])
    assert await _inbox_disposition(client, other, "email_516") == "IN_REVIEW"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_second_action_on_a_settled_case_is_a_conflict(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)
    first = await client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest)

    second = await client.post(
        HELD_CASE_ACTIONS, json={**APPROVE, "action": "REJECT"}, headers=guest
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "already_settled"
    assert [item[1] for item in _history(await _held_review(client, guest))] == [
        "APPROVE"
    ]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_reset_returns_the_guest_to_the_seed_and_the_approve_replays(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)
    approved = await client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest)

    reset = await client.post("/api/reset", headers=guest)
    after_reset = await _held_review(client, guest)
    replay = await client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest)

    assert approved.status_code == 200
    assert reset.status_code == 200
    assert (after_reset["disposition"], after_reset["history"]) == ("IN_REVIEW", [])
    assert replay.status_code == 200
    assert replay.json()["held_review"]["disposition"] == "APPROVED"
    assert len(replay.json()["held_review"]["history"]) == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_concurrent_first_actions_copy_one_case_and_accept_one_action(
    client: httpx.AsyncClient, services: Services
) -> None:
    guest = await _guest(client)

    responses = await asyncio.gather(
        client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest),
        client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest),
    )

    assert sorted(response.status_code for response in responses) == [200, 409]
    conflict = next(response for response in responses if response.status_code == 409)
    assert conflict.json()["error"]["code"] == "already_settled"
    workspace_id = await _workspace_id(services, guest)
    async with services.session_factory() as session:
        case_ids = list(
            await session.scalars(
                select(CaseRecord.case_id).where(
                    CaseRecord.workspace_id == workspace_id
                )
            )
        )
    assert case_ids == [guest_case_id(workspace_id, "email_516")]
    assert await _audit_events(services, workspace_id) == Counter(
        {"EMAIL_RECEIVED": 1, "CASE_RECORDED": 1, "REVIEW_APPROVE": 1}
    )


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "case_id", ["seed-case:email_999", "email_516", "seed-case:", "case:email_516"]
)
async def test_an_unknown_case_is_a_404(
    client: httpx.AsyncClient, case_id: str
) -> None:
    guest = await _guest(client)

    response = await client.post(
        f"/api/cases/{case_id}/review-actions", json=APPROVE, headers=guest
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "case_not_found"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_case_that_is_not_held_is_not_in_review(
    client: httpx.AsyncClient, services: Services
) -> None:
    guest = await _guest(client)

    response = await client.post(
        "/api/cases/seed-case:email_001/review-actions", json=APPROVE, headers=guest
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "not_in_review"
    assert await _audit_events(services, await _workspace_id(services, guest)) == {}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("body", "details"),
    [
        ({**APPROVE, "actor_id": "   "}, None),
        ({**APPROVE, "rationale": ""}, None),
        (
            {**APPROVE, "action": "CORRECT"},
            ["CORRECT requires corrected_fields"],
        ),
        (
            {**APPROVE, "action": "CORRECT", "corrected_fields": {"vessel": "EVER"}},
            ["corrected_fields keys must be compared fields"],
        ),
        (
            {**APPROVE, "action": "CORRECT", "corrected_fields": {"shipper": ["x"]}},
            ["corrected_fields values must be str, int, or float"],
        ),
        (
            {**APPROVE, "corrected_fields": {"gross_weight_kg": 21577}},
            ["APPROVE cannot carry corrected_fields"],
        ),
    ],
)
async def test_an_invalid_case_action_is_rejected_and_changes_nothing(
    client: httpx.AsyncClient,
    services: Services,
    body: dict[str, object],
    details: list[str] | None,
) -> None:
    guest = await _guest(client)

    response = await client.post(HELD_CASE_ACTIONS, json=body, headers=guest)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_review_action"
    assert error.get("details") == details
    # The seed case was not copied: no audit, receipt, or case rows.
    workspace_id = await _workspace_id(services, guest)
    assert await _audit_events(services, workspace_id) == {}
    assert await _copied_rows(services, workspace_id) == (0, 0)
    held = await _held_review(client, guest)
    assert (held["disposition"], held["history"]) == ("IN_REVIEW", [])


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_an_action_without_a_named_reviewer_writes_nothing(
    client: httpx.AsyncClient, services: Services
) -> None:
    guest = await _guest(client)

    case = await client.post(
        HELD_CASE_ACTIONS, json={**APPROVE, "actor_id": " "}, headers=guest
    )
    exception = await client.post(
        SYN_042_ACTIONS, json={**ASSIGN, "rationale": " "}, headers=guest
    )

    assert (case.status_code, exception.status_code) == (422, 422)
    assert await _audit_events(services, await _workspace_id(services, guest)) == {}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_correction_is_recorded_with_its_corrected_fields(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)

    response = await client.post(
        HELD_CASE_ACTIONS,
        json={
            **APPROVE,
            "action": "CORRECT",
            "corrected_fields": {"gross_weight_kg": 21577, "shipper": "APRIL"},
        },
        headers=guest,
    )

    assert response.status_code == 200
    assert response.json()["held_review"]["disposition"] == "CORRECTED"


# --- exception actions --------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_assign_then_resolve_syn_042_changes_only_this_guests_view(
    client: httpx.AsyncClient,
) -> None:
    guest, other = await _guest(client), await _guest(client)

    assigned = await client.post(SYN_042_ACTIONS, json=ASSIGN, headers=guest)
    resolved = await client.post(
        SYN_042_ACTIONS,
        json={
            "action": "RESOLVE",
            "actor_id": "ops-1",
            "rationale": "Booking cancelled by the shipper",
            "assigned_owner_id": None,
        },
        headers=guest,
    )
    after_resolve = await client.post(
        SYN_042_ACTIONS, json={**ASSIGN, "action": "ESCALATE"}, headers=guest
    )

    assert assigned.status_code == 200
    assert assigned.json()["assignment"] == {
        "assigned_owner_id": "ops-1",
        "state": "ASSIGNED",
    }
    assert resolved.status_code == 200
    row = resolved.json()
    assert (row["reconciliation_id"], row["subject_key"], row["outcome"]) == (
        str(SYN_042),
        "shipment:SYN-042",
        "MISSING_CASE",
    )
    assert row["assignment"] == {"assigned_owner_id": "ops-1", "state": "RESOLVED"}
    assert _history(row) == [
        ("lead-1", "ASSIGN", "Chase the missing booking"),
        ("ops-1", "RESOLVE", "Booking cancelled by the shipper"),
    ]
    assert await _reconciliation_row(client, guest, SYN_042) == row
    assert after_resolve.status_code == 409
    assert after_resolve.json()["error"]["code"] == "already_resolved"

    other_row = await _reconciliation_row(client, other, SYN_042)
    assert (other_row["assignment"], other_row["history"]) == (None, [])


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_an_unknown_reconciliation_result_is_a_404(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)

    response = await client.post(
        f"/api/reconciliation/{uuid4()}/actions", json=ASSIGN, headers=guest
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "reconciliation_not_found"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    "body",
    [
        {**ASSIGN, "assigned_owner_id": None},
        {**ASSIGN, "assigned_owner_id": "  "},
        {**ASSIGN, "actor_id": ""},
    ],
)
async def test_an_invalid_exception_action_is_rejected_and_changes_nothing(
    client: httpx.AsyncClient, body: dict[str, object]
) -> None:
    guest = await _guest(client)

    response = await client.post(SYN_042_ACTIONS, json=body, headers=guest)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_review_action"
    row = await _reconciliation_row(client, guest, SYN_042)
    assert (row["assignment"], row["history"]) == (None, [])


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("path", [HELD_CASE_ACTIONS, SYN_042_ACTIONS])
async def test_actions_require_a_guest_session(
    client: httpx.AsyncClient, path: str
) -> None:
    response = await client.post(path, json=APPROVE)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "session_required"


# --- the seed stays untouched --------------------------------------------------


def _seed_snapshot(catalog: SeedCatalog) -> tuple[str, str, bytes]:
    return repr(catalog.emails), repr(catalog.reconciliation), catalog.submission_json


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_actions_never_modify_the_shared_seed_catalog(
    client: httpx.AsyncClient, catalog: SeedCatalog
) -> None:
    before = _seed_snapshot(catalog)
    guest = await _guest(client)

    approved = await client.post(HELD_CASE_ACTIONS, json=APPROVE, headers=guest)
    assigned = await client.post(SYN_042_ACTIONS, json=ASSIGN, headers=guest)

    assert (approved.status_code, assigned.status_code) == (200, 200)
    assert _seed_snapshot(catalog) == before
    assert catalog.emails["email_516"].case.disposition == "IN_REVIEW"


# --- SeedMaterializer ---------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_materialized_seed_case_is_an_exact_classified_copy(
    services: Services, catalog: SeedCatalog
) -> None:
    _, context = await services.guests.create()
    materializer = SeedMaterializer(services.persistence, catalog)
    seed = catalog.emails["email_516"]

    case_id = await materializer.ensure_case(context, "email_516", request_id="r-1")
    again = await materializer.ensure_case(context, "email_516", request_id="r-2")

    status = await services.persistence.get_case_review_status(
        workspace_id=context.workspace_id, case_id=case_id
    )
    async with services.session_factory() as session:
        record = await session.get(CaseRecord, case_id)
        assert record is not None
        receipt = await session.get(EmailReceipt, record.email_id)
        attachments = await session.scalar(
            select(func.count())
            .select_from(EmailAttachment)
            .where(EmailAttachment.email_id == record.email_id)
        )
    assert again == case_id == guest_case_id(context.workspace_id, "email_516")
    assert (
        status.classification_state,
        status.status,
        status.review_reason,
        status.assigned_owner_id,
        status.disposition,
    ) == (
        "CLASSIFIED",
        Status.NEEDS_REVIEW,
        ReviewReason.MISSING_VALUE,
        seed.case.assigned_owner_id,
        "IN_REVIEW",
    )
    assert record.evaluator_output == seed.case.evaluator_output.model_dump(mode="json")
    assert record.structural_diagnostics == [
        item.model_dump(mode="json") for item in seed.case.structural_diagnostics
    ]
    # The copy keeps the seed's decision source; it is not a live model's.
    assert record.model_version == "seed-decisions:prepared"
    assert receipt is not None
    assert (receipt.message_hash, receipt.sender, receipt.subject) == (
        seed.message_hash,
        seed.sender,
        seed.subject,
    )
    assert attachments == len(seed.attachments)


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_materialized_compared_case_keeps_every_seed_verdict(
    services: Services, catalog: SeedCatalog
) -> None:
    _, context = await services.guests.create()
    materializer = SeedMaterializer(services.persistence, catalog)
    seed = catalog.emails["email_004"].case

    case_id = await materializer.ensure_case(context, "email_004", request_id="r-1")

    async with services.session_factory() as session:
        rows = list(
            await session.scalars(
                select(FieldVerdictRecord).where(FieldVerdictRecord.case_id == case_id)
            )
        )
    assert {
        row.field: (
            row.si_value,
            row.draft_bl_value,
            row.deterministic_result,
            row.semantic_probability,
            row.interactive_state,
            row.batch_result,
            row.reason,
        )
        for row in rows
    } == {
        verdict.field: (
            verdict.si.model_dump(mode="json"),
            verdict.draft_bl.model_dump(mode="json"),
            verdict.deterministic_result,
            verdict.semantic_probability,
            verdict.interactive_state,
            verdict.batch_result,
            verdict.reason,
        )
        for verdict in seed.field_verdicts
    }
    assert len(rows) == 7


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("outcome", "assignment"),
    [
        ("CASE_PRESENT", None),
        ("DOCUMENT_MISSING", None),
        ("MISSING_CASE", None),
        ("UNMATCHED_CASE", None),
        ("SOURCE_STALE", ("docs-apac", "ASSIGNED")),
        ("DUPLICATE_OR_AMBIGUOUS", (get_settings().demo_owner_id, "ASSIGNED")),
    ],
)
async def test_every_seed_outcome_materializes_against_guest_case_copies(
    services: Services,
    catalog: SeedCatalog,
    outcome: str,
    assignment: tuple[str, str] | None,
) -> None:
    _, context = await services.guests.create()
    materializer = SeedMaterializer(services.persistence, catalog)
    seed = _seed_result(catalog, outcome)

    reconciliation_id = await materializer.ensure_exception(
        context, seed.reconciliation_id, request_id="r-1"
    )
    again = await materializer.ensure_exception(
        context, seed.reconciliation_id, request_id="r-2"
    )

    states = await services.persistence.get_reconciliation_exception_states(
        workspace_id=context.workspace_id
    )
    async with services.session_factory() as session:
        record = await session.get(ReconciliationResultRecord, reconciliation_id)
    assert again == reconciliation_id
    assert reconciliation_id == guest_reconciliation_id(
        context.workspace_id, seed.reconciliation_id
    )
    assert list(states) == [reconciliation_id]
    state = states[reconciliation_id]
    assert (None if state is None else (state.assigned_owner_id, state.state)) == (
        assignment
    )
    assert record is not None
    assert (record.outcome, record.shipment_id) == (
        seed.outcome,
        getattr(seed, "shipment_id", None),
    )
    seed_cases = [
        *getattr(seed, "case_ids", ()),
        *getattr(seed, "candidate_case_ids", ()),
    ]
    assert [*(record.case_ids or ()), *(record.candidate_case_ids or ())] == [
        str(guest_case_id(context.workspace_id, item.removeprefix("seed-case:")))
        for item in seed_cases
    ]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_concurrent_materialization_writes_one_copy(
    services: Services, catalog: SeedCatalog, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, context = await services.guests.create()
    materializer = SeedMaterializer(services.persistence, catalog)
    stale = _seed_result(catalog, "SOURCE_STALE")
    attempts: Counter[str] = Counter()
    for name in ("persist_case", "persist_reconciliation_run"):
        method = getattr(services.persistence, name)

        async def counted(*, _method=method, _name=name, **kwargs):
            attempts[_name] += 1
            return await _method(**kwargs)

        monkeypatch.setattr(services.persistence, name, counted)

    case_ids = await asyncio.gather(
        *(
            materializer.ensure_case(context, "email_516", request_id=f"r-{n}")
            for n in range(2)
        )
    )
    case_attempts = attempts["persist_case"]
    exception_ids = await asyncio.gather(
        *(
            materializer.ensure_exception(
                context, stale.reconciliation_id, request_id=f"r-{n}"
            )
            for n in range(2)
        )
    )

    assert len(set(case_ids)) == len(set(exception_ids)) == 1
    # Both calls tried to insert; the loser's IntegrityError re-read the copy.
    assert case_attempts == 2
    assert attempts["persist_reconciliation_run"] == 2
    assert await _audit_events(services, context.workspace_id) == Counter(
        {
            "EMAIL_RECEIVED": 2,
            "CASE_RECORDED": 2,
            "EXPECTED_SHIPMENT_IMPORTED": 6,
            "RECONCILIATION_RUN_CREATED": 1,
            "RECONCILIATION_RECORDED": 1,
            "REVIEW_ASSIGNED": 1,
        }
    )
