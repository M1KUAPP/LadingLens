"""The seed baseline: the real deterministic pipeline over the synthetic bundle.

Prepared decisions stand in for provider answers. Expected values here are
read by hand from the bundle files, never computed by the code under test.
"""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import pytest
import pytest_asyncio

from app import seed_catalog
from app.config import Settings
from app.contracts import Category, ComparedField, ReviewReason, Status
from app.jev import DocumentRole
from app.seed_catalog import (
    DECISIONS_PATH,
    SeedCatalog,
    SeedDecisions,
    load_seed_catalog,
)
from app.submission import SubmissionArtifact, validate_submission_artifact

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BUNDLE_DIR = REPOSITORY_ROOT / "data" / "sdoc-hackathon-bundle"
ATTACHMENTS = BUNDLE_DIR / "attachments"
OWNER = "docs-demo"
PREPARED_REASON = (
    "Prepared baseline: the texts differ after normalization and were not judged by Jev"
)


def _decisions(**changes: object) -> SeedDecisions:
    committed = SeedDecisions.model_validate_json(DECISIONS_PATH.read_bytes())
    return SeedDecisions.model_validate(committed.model_dump() | changes)


def _hash(file_name: str) -> str:
    return sha256((ATTACHMENTS / file_name).read_bytes()).hexdigest()


async def _build(decisions: SeedDecisions) -> SeedCatalog:
    return await SeedCatalog.build(BUNDLE_DIR, decisions, demo_owner_id=OWNER)


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def catalog() -> SeedCatalog:
    return await _build(_decisions())


def test_catalog_holds_every_bundle_email_with_its_prepared_category(
    catalog: SeedCatalog,
) -> None:
    assert list(catalog.emails) == [f"email_{n:03d}" for n in range(1, 521)]
    assert {email.case.category for email in catalog.emails.values()} == set(Category)
    assert catalog.emails["email_002"].case.category is Category.INVOICE_QUERY
    assert catalog.emails["email_001"].case.case_id == "seed-case:email_001"
    assert catalog.decision_source == "prepared"
    assert {email.case.decision_source for email in catalog.emails.values()} == {
        "prepared"
    }


def test_non_comparison_email_is_ok_without_an_owner_or_verdicts(
    catalog: SeedCatalog,
) -> None:
    case = catalog.emails["email_002"].case

    assert case.evaluator_output.model_dump(mode="json") == {
        "category": "INVOICE_QUERY",
        "status": "OK",
        "review_reason": None,
        "defect_fields": [],
        "has_defect": False,
    }
    assert case.field_verdicts == ()
    assert case.structural_diagnostics == ()
    assert case.assigned_owner_id is None
    assert case.disposition == "AUTO_COMPLETED"


def test_seed_attachments_keep_bundle_identity_and_serve_bundle_bytes(
    catalog: SeedCatalog,
) -> None:
    email = catalog.emails["email_001"]
    si_bytes = (ATTACHMENTS / "email_001_SI.txt").read_bytes()

    assert email.sender == "aziztz@safqa.co.ke"
    assert email.received_at == datetime(2026, 9, 20, tzinfo=UTC)
    assert [item.attachment_id for item in email.attachments] == [
        "email_001-1",
        "email_001-2",
    ]
    si = catalog.attachments["email_001-1"]
    assert si == email.attachments[0]
    assert (si.email_id, si.ordinal, si.file_name, si.bundle_path) == (
        "email_001",
        1,
        "email_001_SI.txt",
        "attachments/email_001_SI.txt",
    )
    assert (si.content_hash, si.byte_size, si.detected_format) == (
        sha256(si_bytes).hexdigest(),
        len(si_bytes),
        "txt",
    )
    assert catalog.read_attachment("email_001-1") == si_bytes
    with pytest.raises(KeyError):
        catalog.read_attachment("email_001-3")


def test_txt_pair_gets_seven_verdicts_anchored_in_both_files(
    catalog: SeedCatalog,
) -> None:
    case = catalog.emails["email_001"].case

    assert case.evaluator_output.status is Status.OK
    assert [verdict.field for verdict in case.field_verdicts] == list(ComparedField)
    assert {verdict.interactive_state for verdict in case.field_verdicts} == {"MATCH"}
    for verdict in case.field_verdicts:
        assert verdict.si.provenance.root.format == "txt"
        assert verdict.si.provenance.root.attachment_id == "email_001-1"
        assert verdict.draft_bl.provenance.root.format == "txt"
        assert verdict.draft_bl.provenance.root.attachment_id == "email_001-2"
    shipper = case.field_verdicts[0].si.provenance.root.location
    assert (shipper.line, shipper.start_col, shipper.end_col) == (4, 18, 44)
    assert case.analyses_roles == {"email_001-1": "SI", "email_001-2": "DRAFT_BL"}
    assert case.assigned_owner_id == OWNER
    assert case.disposition == "AUTO_COMPLETED"


def test_catalog_maps_are_frozen_against_mutation(catalog: SeedCatalog) -> None:
    with pytest.raises(TypeError):
        catalog.emails["email_001"] = catalog.emails["email_001"]
    with pytest.raises(TypeError):
        catalog.attachments["email_001-1"] = catalog.attachments["email_001-1"]
    with pytest.raises(TypeError):
        catalog.emails["email_001"].case.analyses_roles["email_001-1"] = "SI"


@pytest.mark.parametrize(
    ("email_id", "reason"),
    [
        ("email_507", ReviewReason.MISSING_ATTACHMENT),
        ("email_511", ReviewReason.UNREADABLE),
        ("email_501", ReviewReason.WRONG_DOC_TYPE),
        ("email_516", ReviewReason.MISSING_VALUE),
    ],
)
def test_structural_failures_are_held_for_review(
    catalog: SeedCatalog, email_id: str, reason: ReviewReason
) -> None:
    case = catalog.emails[email_id].case

    assert case.evaluator_output.status is Status.NEEDS_REVIEW
    assert case.evaluator_output.review_reason is reason
    assert reason in {diagnostic.reason for diagnostic in case.structural_diagnostics}
    assert case.field_verdicts == ()
    assert case.assigned_owner_id == OWNER
    assert case.disposition == "IN_REVIEW"


def test_unreadable_attachment_gets_no_role(catalog: SeedCatalog) -> None:
    case = catalog.emails["email_511"].case

    assert case.analyses_roles == {"email_511-1": "SI", "email_511-2": None}


def test_wrong_document_is_a_prepared_role_decision(catalog: SeedCatalog) -> None:
    case = catalog.emails["email_501"].case
    wrong = next(
        diagnostic
        for diagnostic in case.structural_diagnostics
        if diagnostic.reason is ReviewReason.WRONG_DOC_TYPE
    )

    # The commercial invoice says "NOT A SHIPPING INSTRUCTION" in its body.
    assert case.analyses_roles == {"email_501-1": "SI", "email_501-2": "OTHER"}
    assert (wrong.attachment_id, wrong.document_role) == ("email_501-2", "OTHER")
    assert wrong.provider_request_id == "prepared"


def test_scanned_pair_uses_prepared_transcriptions_with_scan_anchors(
    catalog: SeedCatalog,
) -> None:
    case = catalog.emails["email_512"].case
    shipper, weight = case.field_verdicts[0], case.field_verdicts[-1]

    assert case.evaluator_output.status is Status.OK
    assert shipper.si.raw_value == "APRIL FAR EAST (M) SDN BHD"
    assert shipper.si.provenance.root.format == "scanned_pdf"
    assert shipper.si.provenance.root.location.model_dump() == {
        "kind": "scanned_pdf",
        "page": 1,
        "approximate": True,
        "region": "party",
    }
    assert weight.draft_bl.provenance.root.format == "scanned_pdf"
    assert weight.draft_bl.provenance.root.location.region == "cargo"
    assert weight.si.normalized_value == 128544
    assert case.analyses_roles == {"email_512-1": "SI", "email_512-2": "DRAFT_BL"}


def test_unjudged_textual_difference_is_a_labelled_prepared_mismatch(
    catalog: SeedCatalog,
) -> None:
    case = catalog.emails[catalog.fallback_email_id].case
    verdicts = {verdict.field: verdict for verdict in case.field_verdicts}

    assert catalog.fallback_email_id == "email_004"
    assert case.evaluator_output.status is Status.MISMATCH
    assert case.evaluator_output.defect_fields == [
        ComparedField.CONSIGNEE,
        ComparedField.NOTIFY_PARTY,
    ]
    consignee = verdicts[ComparedField.CONSIGNEE]
    assert consignee.si.raw_value == "EAST BRIGHT FZ-LLC"
    assert consignee.draft_bl.raw_value == "UAB NOVAKOPA"
    assert consignee.deterministic_result == "MISMATCH"
    assert consignee.semantic_probability is None
    assert consignee.interactive_state == "MISMATCH"
    assert consignee.reason == PREPARED_REASON
    assert verdicts[ComparedField.NOTIFY_PARTY].reason == PREPARED_REASON
    assert verdicts[ComparedField.SHIPPER].reason != PREPARED_REASON
    assert case.disposition == "AUTO_COMPLETED"


def test_submission_json_is_the_canonical_artifact_of_the_seed_outcomes(
    catalog: SeedCatalog,
) -> None:
    raw = catalog.submission_json

    validate_submission_artifact(
        SubmissionArtifact(
            canonical_bytes=raw, sha256=sha256(raw).hexdigest(), record_count=520
        )
    )
    records = json.loads(raw)
    assert records["email_004"] == {
        "category": "BL_COMPARISON",
        "status": "MISMATCH",
        "review_reason": None,
        "defect_fields": ["consignee", "notify_party"],
        "has_defect": True,
    }
    assert records["email_516"] == {
        "category": "BL_COMPARISON",
        "status": "NEEDS_REVIEW",
        "review_reason": "missing_value",
        "defect_fields": [],
        "has_defect": False,
    }
    assert all(
        records[email_id] == email.case.evaluator_output.model_dump(mode="json")
        for email_id, email in catalog.emails.items()
    )


@pytest.mark.parametrize(
    ("text", "name", "expected"),
    [
        # XLSX text lines carry a "[Sheet] COORD: value" cell for each cell.
        ("[S.I.] A14: BOOKING NO. | B14: X", "booking_reference", "X"),
        ("Booking Reference: X", "booking_reference", "X"),
        ("BOOKING NO. X", "booking_reference", "X"),
        # A label at the end of a line captures nothing: neither the next
        # line's text nor its own trailing punctuation.
        ("BOOKING NO.\nX", "booking_reference", None),
        ("BOOKING NO.:\nX", "booking_reference", None),
        ("[S.I.] C9: OC No. | D9: X", "order_number", "X"),
        ("OC No: X", "order_number", "X"),
        ("OC No.\nX", "order_number", None),
    ],
)
def test_identifier_regexes_capture_the_labelled_value(
    text: str, name: str, expected: str | None
) -> None:
    pattern = dict(seed_catalog._IDENTIFIERS)[name]

    match = pattern.search(text)

    assert (match[1] if match else None) == expected


def test_reconciliation_matches_si_identifiers_to_the_expected_shipments(
    catalog: SeedCatalog,
) -> None:
    reconciliation = catalog.reconciliation
    results = {
        result.root.subject_key: result.root for result in reconciliation.results
    }

    assert reconciliation.run_id == uuid5(
        NAMESPACE_URL, "ladinglens:seed-v1:reconciliation"
    )
    assert reconciliation.reconciled_at == datetime(2026, 9, 21, tzinfo=UTC)
    assert [shipment.shipment_id for shipment in reconciliation.shipments] == [
        "SHP-CASE-001",
        "SHP-DOC-507",
        "SYN-042",
        "SHP-STALE-013",
        "SHP-AMB-009-A",
        "SHP-AMB-009-B",
    ]
    missing = results["shipment:SYN-042"]
    assert (missing.outcome, missing.shipment_id, missing.case_ids) == (
        "MISSING_CASE",
        "SYN-042",
        [],
    )
    assert missing.reconciliation_id == uuid5(
        NAMESPACE_URL, "ladinglens:seed-v1:shipment:SYN-042"
    )
    linked = {
        key: (results[key].outcome, results[key].case_ids, results[key].match_basis)
        for key in (
            "shipment:SHP-CASE-001",
            "shipment:SHP-DOC-507",
            "shipment:SHP-STALE-013",
        )
    }
    assert linked == {
        "shipment:SHP-CASE-001": (
            "CASE_PRESENT",
            ["seed-case:email_001"],
            ["booking_reference", "order_number"],
        ),
        "shipment:SHP-DOC-507": (
            "DOCUMENT_MISSING",
            ["seed-case:email_507"],
            ["booking_reference", "order_number"],
        ),
        "shipment:SHP-STALE-013": (
            "SOURCE_STALE",
            ["seed-case:email_013"],
            ["booking_reference", "order_number"],
        ),
    }
    ambiguous = [
        (result.candidate_shipment_ids, result.candidate_case_ids, result.match_basis)
        for result in results.values()
        if result.outcome == "DUPLICATE_OR_AMBIGUOUS"
    ]
    assert ambiguous == [
        (
            ["SHP-AMB-009-A", "SHP-AMB-009-B"],
            ["seed-case:email_009"],
            ["booking_reference"],
        )
    ]
    assert results["case:seed-case:email_004"].outcome == "UNMATCHED_CASE"
    assert {result.root.reconciliation_run_id for result in reconciliation.results} == {
        reconciliation.run_id
    }


async def test_two_builds_produce_identical_artifacts_and_ids(
    catalog: SeedCatalog,
) -> None:
    again = await _build(_decisions())

    assert again.submission_json == catalog.submission_json
    assert [
        result.root.reconciliation_id for result in again.reconciliation.results
    ] == [result.root.reconciliation_id for result in catalog.reconciliation.results]


async def test_recorded_equivalence_probability_is_banded_like_a_jev_answer() -> None:
    recorded = await _build(
        _decisions(
            decision_source="recorded",
            equivalence={"email_004": {"consignee": 0.5, "notify_party": 0.1}},
        )
    )
    case = recorded.emails["email_004"].case
    verdicts = {verdict.field: verdict for verdict in case.field_verdicts}

    consignee = verdicts[ComparedField.CONSIGNEE]
    assert (
        consignee.deterministic_result,
        consignee.semantic_probability,
        consignee.interactive_state,
        consignee.batch_result,
    ) == ("NOT_APPLICABLE", 0.5, "REVIEW", "MISMATCH")
    notify = verdicts[ComparedField.NOTIFY_PARTY]
    assert (notify.semantic_probability, notify.interactive_state) == (
        0.1,
        "MISMATCH",
    )
    assert PREPARED_REASON not in {verdict.reason for verdict in case.field_verdicts}
    assert case.disposition == "IN_REVIEW"
    assert case.decision_source == recorded.decision_source == "recorded"


async def test_decisions_missing_a_category_are_rejected() -> None:
    categories = {
        email_id: category
        for email_id, category in _decisions().categories.items()
        if email_id != "email_002"
    }

    with pytest.raises(ValueError, match="email_002"):
        await _build(_decisions(categories=categories))


async def test_scan_without_a_prepared_transcription_fails_the_build() -> None:
    scans = {
        content_hash: document
        for content_hash, document in _decisions().scans.items()
        if content_hash != _hash("email_512_SI.pdf")
    }

    with pytest.raises(ValueError, match="email_512-1"):
        await _build(_decisions(scans=scans))


async def test_attachment_without_a_role_decision_fails_the_build() -> None:
    roles = {
        content_hash: role
        for content_hash, role in _decisions().roles.items()
        if content_hash != _hash("email_001_BL.txt")
    }

    with pytest.raises(ValueError, match="email_001-2"):
        await _build(_decisions(roles=roles))


async def test_prepared_judge_example_must_be_a_comparison_email() -> None:
    categories = _decisions().categories | {"email_004": Category.GENERAL}

    with pytest.raises(ValueError, match="email_004"):
        await _build(_decisions(categories=categories))


async def test_decisions_seed_version_mismatch_is_rejected() -> None:
    with pytest.raises(ValueError) as excinfo:
        await _build(_decisions(seed_version="seed-v0"))

    assert "seed-v0" in str(excinfo.value)
    assert seed_catalog.SEED_VERSION in str(excinfo.value)


async def test_load_seed_catalog_builds_once_per_process(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    built = []
    sentinel = object()

    async def fake_build(bundle_dir, decisions, *, demo_owner_id):
        built.append((bundle_dir, decisions.decision_source, demo_owner_id))
        await asyncio.sleep(0)
        return sentinel

    monkeypatch.setattr(seed_catalog, "_catalog", None)
    # A fresh lock: an asyncio.Lock binds to the loop it is first contended on.
    monkeypatch.setattr(seed_catalog, "_catalog_lock", asyncio.Lock())
    monkeypatch.setattr(SeedCatalog, "build", fake_build)
    settings = Settings(bundle_dir="/seed-bundle", demo_owner_id="owner-x")

    first, second = await asyncio.gather(
        load_seed_catalog(settings), load_seed_catalog(settings)
    )

    assert first is second is sentinel
    assert built == [(Path("/seed-bundle"), "prepared", "owner-x")]


class _ExplodingLock:
    """A lock stub that fails the test if the fast path ever awaits it."""

    async def __aenter__(self) -> None:
        raise AssertionError("load_seed_catalog awaited the lock on the fast path")

    async def __aexit__(self, *exc_info: object) -> None:
        return None


async def test_load_seed_catalog_skips_the_lock_once_built(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sentinel = object()
    monkeypatch.setattr(seed_catalog, "_catalog", sentinel)
    monkeypatch.setattr(seed_catalog, "_catalog_lock", _ExplodingLock())
    settings = Settings(bundle_dir="/seed-bundle", demo_owner_id="owner-x")

    assert await load_seed_catalog(settings) is sentinel


def test_seed_status_is_building_before_a_catalog_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seed_catalog, "_catalog", None)
    monkeypatch.setattr(seed_catalog, "_catalog_failed", False)

    assert seed_catalog.seed_status() == "building"


def test_seed_status_is_ready_once_the_catalog_is_built(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seed_catalog, "_catalog", object())
    monkeypatch.setattr(seed_catalog, "_catalog_failed", False)

    assert seed_catalog.seed_status() == "ready"


def test_seed_status_is_error_after_a_failed_build(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(seed_catalog, "_catalog", None)
    monkeypatch.setattr(seed_catalog, "_catalog_failed", True)

    assert seed_catalog.seed_status() == "error"


async def test_load_seed_catalog_records_a_failed_attempt_for_seed_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def failing_build(bundle_dir, decisions, *, demo_owner_id):
        raise ValueError("bundle is corrupt")

    monkeypatch.setattr(seed_catalog, "_catalog", None)
    monkeypatch.setattr(seed_catalog, "_catalog_lock", asyncio.Lock())
    monkeypatch.setattr(seed_catalog, "_catalog_failed", False)
    monkeypatch.setattr(SeedCatalog, "build", failing_build)
    settings = Settings(bundle_dir="/seed-bundle", demo_owner_id="owner-x")

    with pytest.raises(ValueError, match="bundle is corrupt"):
        await load_seed_catalog(settings)

    assert seed_catalog.seed_status() == "error"


def test_committed_decisions_are_exactly_what_the_generator_writes() -> None:
    from scripts.build_seed_decisions import render_decisions

    assert render_decisions() == DECISIONS_PATH.read_text(encoding="utf-8")


def test_prepared_roles_follow_each_document_header() -> None:
    roles = _decisions().roles

    # The body of this commercial invoice says "NOT A SHIPPING INSTRUCTION".
    assert roles[_hash("email_501_BL.txt")] is DocumentRole.OTHER
    # The XLSX title "BL INSTRUCTION" sits in A3, under a letterhead row.
    assert roles[_hash("email_005_SI.xlsx")] is DocumentRole.SI
    assert roles[_hash("email_005_BL.xlsx")] is DocumentRole.DRAFT_BL
    assert roles[_hash("email_059_SI.pdf")] is DocumentRole.SI
    assert roles[_hash("email_055_BL.docx")] is DocumentRole.DRAFT_BL
    # A scan's role is read from its prepared transcription.
    assert roles[_hash("email_512_BL.pdf")] is DocumentRole.DRAFT_BL
