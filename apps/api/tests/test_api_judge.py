"""Live judge runs over a freshly uploaded synthetic SI/draft-BL pair.

The pair is written here, not copied from the bundle. Providers are fakes
injected through deps.build_judge, the seam build_services uses: a role
decider that reads each document's title, an equivalence judge that answers
or fails on demand, and a Gemini stand-in whose values are never in the text.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import func, select
from upload_fixtures import archive_with_an_undecodable_name, expanding_workbook

from app import judge as judge_module
from app.api.deps import Services, build_judge
from app.config import get_settings
from app.contracts import Category, ComparedField
from app.extraction import GeminiExtractor
from app.formats import MAX_EXPANDED_BYTES
from app.gemini import KeyAttempt
from app.guest import SESSION_HEADER, GuestSessions
from app.jev import (
    JEV_MODEL,
    DocumentRole,
    JevEquivalence,
    JevFailureCode,
    JevProviderFailure,
    JevRoleDecision,
)
from app.main import app
from app.models import (
    AuditEventRecord,
    CaseRecord,
    ClassificationAttempt,
    EmailReceipt,
    JudgeRunRecord,
)
from app.persistence import PersistenceService, _payload_hash
from app.storage import InMemoryPrivateObjectStore

SI_NAME = "SYN_SI_harbourlight.txt"
BL_NAME = "SYN_BL_harbourlight.txt"
SI_TEXT = """SHIPPING INSTRUCTION
========================================

Shipper: HARBOURLIGHT PULP TRADING PTE LTD
  12 MARINA VIEW, #20-01; SINGAPORE 018961
Consignee: NORTHWIND PAPER CO., LTD
  88 HAEUNDAE-RO; BUSAN, SOUTH KOREA
Notify Party: KESTREL LOGISTICS LTD
Port of Loading: SINGAPORE (SGSIN)
Port of Discharge: BUSAN, KOREA (KRPUS)
No. of Containers: 2 x 40'HC
Gross Weight (KG): 18,240 KG
"""
BL_TEXT = """BILL OF LADING (DRAFT)
========================================

SHIPPER: HARBOURLIGHT PULP TRADING PTE LTD
  12 MARINA VIEW, #20-01; SINGAPORE 018961
CONSIGNEE: NORTHWIND PAPER COMPANY LIMITED
  88 HAEUNDAE-RO; BUSAN, SOUTH KOREA
Notify: KESTREL LOGISTICS LTD
Port of Loading (POL): SINGAPORE (SGSIN)
POD: BUSAN, KOREA (KRPUS)
Container Count: 2 x 40'HC
Gross Wt (kgs): 18,420 KG
"""
PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
# A few kilobytes that unpack past the cap: a sheet of one repeated row.
BOMB = expanding_workbook(MAX_EXPANDED_BYTES + 1)
MISMATCHED_WEIGHT = {
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "review_reason": None,
    "defect_fields": ["gross_weight_kg"],
    "has_defect": True,
}
SESSION_RESET = {
    "code": "session_reset",
    "message": "Your demo was reset while this check ran. Upload the pair again.",
}

_TITLE_ROLES = {
    "SHIPPING INSTRUCTION": DocumentRole.SI,
    "BILL OF LADING (DRAFT)": DocumentRole.DRAFT_BL,
}


class _TitleRoles:
    """Decides each document's role from its title line, as a reader would."""

    async def decide(self, documents, *, correlation_id=None):
        decisions = []
        for document in documents:
            role = _TITLE_ROLES.get(document.text.splitlines()[0], DocumentRole.OTHER)
            probabilities = {item.value: 0.05 for item in DocumentRole}
            probabilities[role.value] = 0.9
            decisions.append(
                JevRoleDecision(
                    document_id=document.document_id,
                    role=role,
                    probabilities=probabilities,
                    confidence=0.9,
                    returned_model=JEV_MODEL,
                    provider_request_id="role-req",
                    correlation_id=correlation_id or "role-corr",
                )
            )
        return decisions


class _Equivalence:
    """Judges every question the same party, or fails as told.

    ``during`` runs while the provider call is in flight, before it answers.
    """

    def __init__(self) -> None:
        self.failure: JevFailureCode | None = None
        self.crash = False
        self.during: Callable[[], Awaitable[None]] | None = None

    async def judge(self, questions, *, correlation_id=None):
        if self.during is not None:
            await self.during()
        if self.crash:
            # Document text only at run time: no source line of a frame holds it.
            raise RuntimeError(f"equivalence judge crashed on {questions[0].si_value}")
        if self.failure is not None:
            raise JevProviderFailure(
                code=self.failure,
                retryable=True,
                email_ids=tuple(question.field.value for question in questions),
                correlation_id=correlation_id or "equiv-corr",
                message="Jev request timed out",
            )
        return [
            JevEquivalence(
                field=question.field,
                probability=0.97,
                returned_model=JEV_MODEL,
                provider_request_id="equiv-req",
                correlation_id=correlation_id or "equiv-corr",
            )
            for question in questions
        ]


@dataclass(frozen=True)
class _GeminiResponse:
    text: str
    model_version: str = "gemini-3.5-flash"


async def _gemini_reads_values_not_in_the_text(contents, config=None, *, attempts=None):
    fields = {
        field.value: {"value": "NOT IN THIS DOCUMENT", "page": None, "region": None}
        for field in ComparedField
    }
    document = {"document_title": "", "transcription": "", "fields": fields}
    ok = (KeyAttempt(key_index=1, outcome="SUCCEEDED", status_code=None),)
    return _GeminiResponse(json.dumps(document)), ok


@pytest.fixture
def equivalence() -> _Equivalence:
    return _Equivalence()


@pytest.fixture
def services(postgres_session_factory, equivalence: _Equivalence) -> Services:
    object_store = InMemoryPrivateObjectStore()
    persistence = PersistenceService(postgres_session_factory, object_store)
    settings = get_settings()
    return Services(
        settings=settings,
        session_factory=postgres_session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=GuestSessions(postgres_session_factory, persistence),
        judge=build_judge(
            settings,
            persistence,
            roles=_TitleRoles(),
            equivalence=equivalence,
            gemini=GeminiExtractor(generate=_gemini_reads_values_not_in_the_text),
        ),
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


async def _guest(client: httpx.AsyncClient) -> dict[str, str]:
    created = await client.post("/api/session")
    return {SESSION_HEADER: created.json()["session_token"]}


def _pair(
    si: bytes | None = SI_TEXT.encode(),
    bl: bytes | None = BL_TEXT.encode(),
    *,
    si_name: str = SI_NAME,
) -> dict[str, tuple[str, bytes, str]]:
    files = {}
    if si is not None:
        files["si_file"] = (si_name, si, "text/plain")
    if bl is not None:
        files["draft_bl_file"] = (BL_NAME, bl, "text/plain")
    return files


async def _upload(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    files: dict[str, tuple[str, bytes, str]] | None = None,
    *,
    confirmed: str | None = "true",
) -> httpx.Response:
    data = {} if confirmed is None else {"synthetic_confirmed": confirmed}
    return await client.post(
        "/api/judge/runs",
        files=_pair() if files is None else files,
        data=data,
        headers=headers,
    )


async def _written_rows(services: Services, headers: dict[str, str]) -> dict[str, int]:
    context = await services.guests.resolve(headers[SESSION_HEADER])
    assert context is not None
    counts = {}
    async with services.session_factory() as session:
        for name, model in (
            ("emails", EmailReceipt),
            ("audit_events", AuditEventRecord),
            ("judge_runs", JudgeRunRecord),
        ):
            counts[name] = await session.scalar(
                select(func.count())
                .select_from(model)
                .where(model.workspace_id == context.workspace_id)
            )
    return counts


def _anchored_text(text: str, provenance: dict) -> str:
    location = provenance["location"]
    line = text.split("\n")[location["line"] - 1]
    return line[location["start_col"] : location["end_col"]]


# --- a live run ---------------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_fresh_txt_pair_is_compared_live_with_anchored_evidence(
    client: httpx.AsyncClient,
) -> None:
    guest, other = await _guest(client), await _guest(client)

    response = await _upload(client, guest)

    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    run = response.json()
    assert (run["source"], run["state"], run["attempt"], run["failure"]) == (
        "live",
        "SUCCEEDED",
        1,
        None,
    )
    assert run["outcome"] == MISMATCHED_WEIGHT
    assert run["diagnostics"] == []
    assert run["latency_ms"] >= 0
    assert datetime.fromisoformat(run["completed_at"]) >= datetime.fromisoformat(
        run["created_at"]
    )

    si_doc, bl_doc = run["documents"]
    assert {key: si_doc[key] for key in si_doc if key != "document_id"} == {
        "slot": "si_file",
        "file_name": SI_NAME,
        "detected_format": "txt",
        "byte_size": len(SI_TEXT.encode()),
        "role": "SI",
        "evidence_url": f"/api/judge/runs/{run['run_id']}/documents/"
        f"{si_doc['document_id']}",
    }
    assert (bl_doc["slot"], bl_doc["file_name"], bl_doc["role"]) == (
        "draft_bl_file",
        BL_NAME,
        "DRAFT_BL",
    )

    verdicts = run["field_verdicts"]
    assert [item["field"] for item in verdicts] == [
        field.value for field in ComparedField
    ]
    assert {item["field"]: item["verdict"] for item in verdicts} == {
        field.value: "MISMATCH" if field is ComparedField.GROSS_WEIGHT_KG else "MATCH"
        for field in ComparedField
    }
    consignee = verdicts[1]
    assert consignee["semantic_probability"] == 0.97
    for item in verdicts:
        for side, document, text in (
            ("si", si_doc, SI_TEXT),
            ("draft_bl", bl_doc, BL_TEXT),
        ):
            provenance = item[side]["provenance"]
            assert provenance["format"] == "txt"
            assert provenance["attachment_id"] == document["document_id"]
            assert provenance["file_name"] == document["file_name"]
            assert _anchored_text(text, provenance) == item[side]["raw_value"]

    evidence = await client.get(si_doc["evidence_url"], headers=guest)
    assert evidence.status_code == 200
    assert evidence.content == SI_TEXT.encode()
    assert evidence.headers["content-type"] == "text/plain; charset=utf-8"
    assert evidence.headers["x-content-type-options"] == "nosniff"
    assert evidence.headers["content-disposition"] == f'inline; filename="{SI_NAME}"'
    assert evidence.headers["cache-control"] == "no-store"
    assert (await client.get(bl_doc["evidence_url"], headers=guest)).content == (
        BL_TEXT.encode()
    )

    foreign = await client.get(si_doc["evidence_url"], headers=other)
    assert foreign.status_code == 404
    assert foreign.json()["error"]["code"] == "run_not_found"
    assert (
        await client.get(f"/api/judge/runs/{run['run_id']}", headers=other)
    ).status_code == 404

    assert (
        await client.get(f"/api/judge/runs/{run['run_id']}", headers=guest)
    ).json() == run
    assert (await client.get("/api/judge/runs", headers=guest)).json() == {
        "runs": [run]
    }
    assert (await client.get("/api/judge/runs", headers=other)).json() == {"runs": []}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_provider_timeout_fails_the_run_and_a_retry_completes_it(
    client: httpx.AsyncClient, services: Services, equivalence: _Equivalence
) -> None:
    guest = await _guest(client)
    equivalence.failure = JevFailureCode.TIMEOUT

    failed = await _upload(client, guest)

    assert failed.status_code == 201
    run = failed.json()
    assert (run["state"], run["attempt"], run["outcome"]) == ("FAILED", 1, None)
    assert run["failure"] == {
        "code": "timeout",
        "retryable": True,
        "message": "The AI provider did not answer in time.",
    }
    assert (run["field_verdicts"], run["diagnostics"]) == ([], [])
    assert [document["role"] for document in run["documents"]] == ["SI", "DRAFT_BL"]

    equivalence.failure = None
    retried = await client.post(f"/api/judge/runs/{run['run_id']}/retry", headers=guest)

    assert retried.status_code == 200
    completed = retried.json()
    assert (completed["run_id"], completed["state"], completed["attempt"]) == (
        run["run_id"],
        "SUCCEEDED",
        2,
    )
    assert (completed["failure"], completed["outcome"]) == (None, MISMATCHED_WEIGHT)
    assert len(completed["field_verdicts"]) == 7
    assert completed["documents"] == run["documents"]

    again = await client.post(f"/api/judge/runs/{run['run_id']}/retry", headers=guest)
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "already_succeeded"
    assert (await _written_rows(services, guest))["judge_runs"] == 1


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_every_attempt_of_a_run_is_audited_append_only(
    client: httpx.AsyncClient, services: Services, equivalence: _Equivalence
) -> None:
    guest = await _guest(client)
    equivalence.failure = JevFailureCode.TIMEOUT
    failed = (await _upload(client, guest)).json()
    equivalence.failure = None
    retry_path = f"/api/judge/runs/{failed['run_id']}/retry"
    completed = (await client.post(retry_path, headers=guest)).json()

    async with services.session_factory() as session:
        events = list(
            await session.scalars(
                select(AuditEventRecord)
                .where(
                    AuditEventRecord.entity_type == "JUDGE_RUN",
                    AuditEventRecord.entity_id == failed["run_id"],
                )
                .order_by(AuditEventRecord.occurred_at)
            )
        )

    # The retry overwrote the failure on the run; its audit keeps it.
    assert [event.event_type for event in events] == [
        "JUDGE_RUN_RECORDED",
        "JUDGE_RUN_RETRIED",
    ]
    assert [event.payload_hash for event in events] == [
        _payload_hash(
            {
                "judge_run_id": failed["run_id"],
                "state": "FAILED",
                "attempt": 1,
                "failure_code": "timeout",
                "retryable": True,
                "latency_ms": failed["latency_ms"],
            }
        ),
        _payload_hash(
            {
                "judge_run_id": failed["run_id"],
                "state": "SUCCEEDED",
                "attempt": 2,
                "failure_code": None,
                "retryable": None,
                "latency_ms": completed["latency_ms"],
            }
        ),
    ]
    # The message and both uploaded files.
    assert [len(event.source_hashes) for event in events] == [3, 3]


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_retry_completes_a_run_whose_case_an_earlier_retry_compared(
    client: httpx.AsyncClient,
    equivalence: _Equivalence,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    guest = await _guest(client)
    equivalence.failure = JevFailureCode.TIMEOUT
    run = (await _upload(client, guest)).json()
    equivalence.failure = None
    record_retry = PersistenceService.record_judge_retry
    recorded = 0

    async def _stops_once_the_comparison_committed(self, **kwargs):
        nonlocal recorded
        recorded += 1
        if recorded == 1:
            raise RuntimeError("the instance stopped")
        return await record_retry(self, **kwargs)

    monkeypatch.setattr(
        PersistenceService, "record_judge_retry", _stops_once_the_comparison_committed
    )
    retry_path = f"/api/judge/runs/{run['run_id']}/retry"

    stopped = await client.post(retry_path, headers=guest)
    still_failed = await client.get(f"/api/judge/runs/{run['run_id']}", headers=guest)
    recovered = await client.post(retry_path, headers=guest)

    assert stopped.status_code == 500
    assert still_failed.json()["state"] == "FAILED"
    assert recovered.status_code == 200
    completed = recovered.json()
    assert (completed["state"], completed["attempt"], completed["failure"]) == (
        "SUCCEEDED",
        2,
        None,
    )
    assert completed["outcome"] == MISMATCHED_WEIGHT
    assert len(completed["field_verdicts"]) == 7


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_document_gemini_cannot_ground_completes_the_run_as_needs_review(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)
    # Without its Notify line the draft BL is ambiguous, so Gemini reads it.
    unnotified = BL_TEXT.replace("Notify: KESTREL LOGISTICS LTD\n", "").encode()

    response = await _upload(client, guest, _pair(bl=unnotified))

    assert response.status_code == 201
    run = response.json()
    assert (run["state"], run["failure"], run["field_verdicts"]) == (
        "SUCCEEDED",
        None,
        [],
    )
    assert run["outcome"] == {
        "category": "BL_COMPARISON",
        "status": "NEEDS_REVIEW",
        "review_reason": "unreadable",
        "defect_fields": [],
        "has_defect": False,
    }
    [diagnostic] = run["diagnostics"]
    assert set(diagnostic) == {"reason", "detail", "document_role"}
    assert (diagnostic["reason"], diagnostic["document_role"]) == (
        "unreadable",
        "DRAFT_BL",
    )
    assert diagnostic["detail"].startswith("This attachment could not be read reliably")


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_an_unexpected_error_surfaces_in_the_envelope_and_records_no_run(
    client: httpx.AsyncClient,
    services: Services,
    equivalence: _Equivalence,
    caplog: pytest.LogCaptureFixture,
) -> None:
    guest = await _guest(client)
    equivalence.crash = True
    caplog.set_level(logging.ERROR, logger="app.judge")

    response = await _upload(client, guest)

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "check_error",
            "message": "The check could not be completed. Try again.",
        }
    }
    assert (await _written_rows(services, guest))["judge_runs"] == 0
    [logged] = [
        record.getMessage() for record in caplog.records if record.name == "app.judge"
    ]
    # The type and where it was raised, never its message: that holds the SI.
    assert "RuntimeError" in logged
    assert "in run_case" in logged and "in judge" in logged
    assert "NORTHWIND PAPER CO., LTD" not in logged


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_the_category_is_audited_as_declared_by_the_uploader(
    client: httpx.AsyncClient, services: Services
) -> None:
    run = (await _upload(client, await _guest(client))).json()

    async with services.session_factory() as session:
        judge_run = await session.get(JudgeRunRecord, UUID(run["run_id"]))
        assert judge_run is not None
        case = await session.get(CaseRecord, judge_run.case_id)
        attempt = await session.scalar(
            select(ClassificationAttempt).where(
                ClassificationAttempt.case_id == judge_run.case_id
            )
        )
        classified = await session.scalar(
            select(AuditEventRecord).where(
                AuditEventRecord.entity_id == str(judge_run.case_id),
                AuditEventRecord.event_type == "CASE_CLASSIFICATION_SUCCEEDED",
            )
        )

    assert case is not None and case.category_probabilities == {
        category.value: 1.0 if category is Category.BL_COMPARISON else 0.0
        for category in Category
    }
    assert attempt is not None
    assert (
        attempt.outcome,
        attempt.requested_model,
        attempt.returned_model,
        attempt.prompt_version,
        attempt.provider_request_id,
    ) == ("SUCCEEDED", "judge-declared", "judge-declared", "judge-upload-v1", None)
    assert classified is not None
    assert (classified.model_version, classified.prompt_version) == (
        "judge-declared",
        "judge-upload-v1",
    )


# --- upload policy --------------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("files", "rejections"),
    [
        (_pair(si=PNG), [{"slot": "si_file", "reason": "unsupported_format"}]),
        (
            _pair(si=b"A" * (6 * 1024 * 1024)),
            [{"slot": "si_file", "reason": "too_large"}],
        ),
        (_pair(si=BOMB), [{"slot": "si_file", "reason": "too_large"}]),
        (
            _pair(bl=b"PK not a local header " + BOMB),
            [{"slot": "draft_bl_file", "reason": "too_large"}],
        ),
        (
            _pair(si=archive_with_an_undecodable_name()),
            [{"slot": "si_file", "reason": "unsupported_format"}],
        ),
        (_pair(bl=b""), [{"slot": "draft_bl_file", "reason": "empty"}]),
        (_pair(bl=None), [{"slot": "draft_bl_file", "reason": "missing"}]),
        (
            _pair(si=None, bl=PNG),
            [
                {"slot": "si_file", "reason": "missing"},
                {"slot": "draft_bl_file", "reason": "unsupported_format"},
            ],
        ),
    ],
    ids=[
        "png",
        "six-megabytes",
        "expands-past-the-cap",
        "prefixed-archive-expands-past-the-cap",
        "undecodable-archive",
        "empty",
        "missing",
        "both",
    ],
)
async def test_a_rejected_upload_writes_nothing(
    client: httpx.AsyncClient,
    services: Services,
    files: dict[str, tuple[str, bytes, str]],
    rejections: list[dict[str, str]],
) -> None:
    guest = await _guest(client)

    response = await _upload(client, guest, files)

    assert response.status_code == 422
    error = response.json()["error"]
    assert (error["code"], error["details"]) == ("upload_rejected", rejections)
    assert await _written_rows(services, guest) == {
        "emails": 0,
        "audit_events": 0,
        "judge_runs": 0,
    }


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize("confirmed", [None, "false", "yes"])
async def test_an_unconfirmed_upload_is_synthetic_only_and_writes_nothing(
    client: httpx.AsyncClient, services: Services, confirmed: str | None
) -> None:
    guest = await _guest(client)

    response = await _upload(client, guest, confirmed=confirmed)

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "synthetic_only",
            "message": "Confirm that both files contain synthetic data only.",
        }
    }
    assert (await _written_rows(services, guest))["emails"] == 0


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_the_policy_states_the_upload_rules(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/judge/policy", headers=await _guest(client))

    assert response.status_code == 200
    assert response.json() == {
        "accepted_formats": ["txt", "pdf", "docx", "xlsx"],
        "max_file_bytes": 5 * 1024 * 1024,
        "data_policy": "synthetic-only",
        "confirmation_required": True,
    }


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/judge/policy"),
        ("POST", "/api/judge/runs"),
        ("GET", "/api/judge/runs"),
        ("GET", "/api/judge/fallback"),
    ],
)
async def test_judge_routes_require_a_guest_session(
    client: httpx.AsyncClient, method: str, path: str
) -> None:
    response = await client.request(method, path)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "session_required"


# --- evidence file names ----------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_non_ascii_file_name_is_kept_and_served_with_an_ascii_header(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)

    run = (await _upload(client, guest, _pair(si_name="SI_合成.txt"))).json()
    si_doc = run["documents"][0]
    evidence = await client.get(si_doc["evidence_url"], headers=guest)

    assert si_doc["file_name"] == "SI_合成.txt"
    assert evidence.status_code == 200
    # An ASCII fallback, and the whole name as UTF-8 (RFC 6266 section 4.3).
    assert evidence.headers["content-disposition"] == (
        "inline; filename=\"SI___.txt\"; filename*=UTF-8''SI_%E5%90%88%E6%88%90.txt"
    )


# --- unknown runs, reset ------------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
@pytest.mark.parametrize(
    ("method", "path", "code"),
    [
        ("GET", "/api/judge/runs/not-a-run", "run_not_found"),
        (
            "GET",
            "/api/judge/runs/5b0c64b4-6b43-4f0a-9d2c-0d7a3f1c9e21",
            "run_not_found",
        ),
        (
            "POST",
            "/api/judge/runs/5b0c64b4-6b43-4f0a-9d2c-0d7a3f1c9e21/retry",
            "run_not_found",
        ),
    ],
)
async def test_an_unknown_run_is_not_found(
    client: httpx.AsyncClient, method: str, path: str, code: str
) -> None:
    response = await client.request(method, path, headers=await _guest(client))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == code


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_an_unknown_document_of_a_run_is_not_found(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)
    run = (await _upload(client, guest)).json()

    for document_id in ("not-a-document", "5b0c64b4-6b43-4f0a-9d2c-0d7a3f1c9e21"):
        response = await client.get(
            f"/api/judge/runs/{run['run_id']}/documents/{document_id}", headers=guest
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "document_not_found"


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_reset_empties_the_run_list_and_retires_the_old_run(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)
    run = (await _upload(client, guest)).json()

    reset = await client.post("/api/reset", headers=guest)

    assert reset.status_code == 200
    assert (await client.get("/api/judge/runs", headers=guest)).json() == {"runs": []}
    for path in (
        f"/api/judge/runs/{run['run_id']}",
        run["documents"][0]["evidence_url"],
    ):
        response = await client.get(path, headers=guest)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "run_not_found"
    retry = await client.post(f"/api/judge/runs/{run['run_id']}/retry", headers=guest)
    assert retry.status_code == 404


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_reset_while_the_check_runs_is_reported_as_session_reset(
    client: httpx.AsyncClient, services: Services, equivalence: _Equivalence
) -> None:
    guest = await _guest(client)

    async def _reset_now() -> None:
        await services.guests.reset(guest[SESSION_HEADER], request_id="mid-check-reset")

    equivalence.during = _reset_now

    response = await _upload(client, guest)

    assert response.status_code == 409
    assert response.json() == {"error": SESSION_RESET}
    assert (await client.get("/api/judge/runs", headers=guest)).json() == {"runs": []}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_reset_while_a_retry_runs_is_reported_as_session_reset(
    client: httpx.AsyncClient, services: Services, equivalence: _Equivalence
) -> None:
    guest = await _guest(client)
    equivalence.failure = JevFailureCode.TIMEOUT
    run = (await _upload(client, guest)).json()

    async def _reset_now() -> None:
        await services.guests.reset(guest[SESSION_HEADER], request_id="mid-retry-reset")

    equivalence.failure, equivalence.during = None, _reset_now
    response = await client.post(
        f"/api/judge/runs/{run['run_id']}/retry", headers=guest
    )

    assert response.status_code == 409
    assert response.json() == {"error": SESSION_RESET}


# --- concurrency -----------------------------------------------------------------

JUDGE_BUSY = {
    "code": "judge_busy",
    "message": "Other checks are running. Try again in a minute.",
}


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_a_second_check_is_rejected_while_the_first_holds_the_only_slot(
    postgres_session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With one slot, a check in flight makes a concurrent upload judge_busy.

    Built by hand, not through the `services`/`client` fixtures: the slot
    count is fixed when JudgeService is built, so it must be set before that.
    """
    monkeypatch.setattr(judge_module, "_SLOT_WAIT_SECONDS", 0.05)
    settings = get_settings()
    monkeypatch.setattr(settings, "max_concurrent_judge_checks", 1)
    object_store = InMemoryPrivateObjectStore()
    persistence = PersistenceService(postgres_session_factory, object_store)
    equivalence = _Equivalence()
    services = Services(
        settings=settings,
        session_factory=postgres_session_factory,
        persistence=persistence,
        object_store=object_store,
        guests=GuestSessions(postgres_session_factory, persistence),
        judge=build_judge(
            settings,
            persistence,
            roles=_TitleRoles(),
            equivalence=equivalence,
            gemini=GeminiExtractor(generate=_gemini_reads_values_not_in_the_text),
        ),
    )
    previous_services = getattr(app.state, "services", None)
    app.state.services = services
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            guest = await _guest(client)
            second_response: httpx.Response | None = None

            async def _upload_second_while_first_is_in_flight() -> None:
                nonlocal second_response
                second_response = await _upload(client, guest)

            equivalence.during = _upload_second_while_first_is_in_flight

            first_response = await _upload(client, guest)

            assert first_response.status_code == 201
            assert first_response.json()["state"] == "SUCCEEDED"
            assert second_response is not None
            assert second_response.status_code == 503
            assert second_response.json() == {"error": JUDGE_BUSY}
            assert (await _written_rows(services, guest))["judge_runs"] == 1

            equivalence.during = None
            third_response = await _upload(client, guest)
            assert third_response.status_code == 201
    finally:
        app.state.services = previous_services


# --- prepared fallback --------------------------------------------------------------


@pytest.mark.postgres
@pytest.mark.asyncio(loop_scope="session")
async def test_the_prepared_fallback_is_labelled_and_never_the_upload(
    client: httpx.AsyncClient,
) -> None:
    guest = await _guest(client)

    response = await client.get("/api/judge/fallback", headers=guest)

    assert response.status_code == 200
    fallback = response.json()
    assert (
        fallback["label"],
        fallback["source"],
        fallback["example_id"],
        fallback["note"],
    ) == (
        "PREPARED FALLBACK",
        "prepared",
        "email_004",
        "A prepared example, not your upload.",
    )
    assert set(fallback["outcome"]) == set(MISMATCHED_WEIGHT)
    assert len(fallback["field_verdicts"]) == 7
    si_doc, bl_doc = fallback["documents"]
    assert (si_doc["slot"], si_doc["role"], bl_doc["slot"], bl_doc["role"]) == (
        "si_file",
        "SI",
        "draft_bl_file",
        "DRAFT_BL",
    )
    assert si_doc["evidence_url"] == f"/api/evidence/{si_doc['document_id']}"
    for item in fallback["field_verdicts"]:
        assert item["si"]["provenance"]["attachment_id"] == si_doc["document_id"]
        assert item["draft_bl"]["provenance"]["attachment_id"] == bl_doc["document_id"]
    evidence = await client.get(si_doc["evidence_url"], headers=guest)
    assert evidence.status_code == 200
    assert len(evidence.content) == si_doc["byte_size"]
