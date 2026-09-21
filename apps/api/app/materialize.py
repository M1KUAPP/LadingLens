"""Copy-on-write: a guest's first action on a seed record copies it first.

The shared seed catalog is never written. Before a guest's first review
action on a seed case or reconciliation exception, that record is copied into
the guest's own workspace through the ordinary audited persistence methods,
under IDs derived from the workspace: each guest acts on its own copy, and a
reset (a new workspace) starts again from the seed. A copy keeps the seed's
decision source in its model version and is never presented as live output.
"""

from __future__ import annotations

import json
from hashlib import sha256
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.contracts import ReconciliationResult, compute_subject_key
from app.guest import GuestContext
from app.ingestion import BundleEmail, canonical_message_bytes
from app.normalization import NORMALIZATION_VERSION
from app.persistence import (
    AttachmentInput,
    AuditContext,
    CaseInput,
    CaseReviewStatus,
    PersistenceService,
    ReceiptInput,
    ReconciliationExceptionState,
)
from app.reconciliation import expected_shipment_to_input
from app.seed_catalog import (
    SEED_DECISIONS_MODEL,
    SEED_VERSION,
    SeedCatalog,
    SeedEmail,
)

SEED_CASE_PREFIX = "seed-case:"


def guest_case_id(workspace_id: UUID, email_id: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"{workspace_id}:case:{email_id}")


def guest_reconciliation_id(workspace_id: UUID, seed_id: UUID) -> UUID:
    return uuid5(NAMESPACE_URL, f"{workspace_id}:reconciliation:{seed_id}")


def seed_email_for_case(catalog: SeedCatalog, case_id: str) -> SeedEmail | None:
    """The seed email behind a seed case ID (``seed-case:{email_id}``)."""
    email = catalog.emails.get(case_id.removeprefix(SEED_CASE_PREFIX))
    return email if email is not None and email.case.case_id == case_id else None


def _message_bytes(email: SeedEmail) -> bytes:
    """The canonical bundle message the seed's message hash was taken from."""
    return canonical_message_bytes(
        BundleEmail(
            email_id=email.email_id,
            sender=email.sender,
            subject=email.subject,
            body=email.body_text,
            attachments=[item.bundle_path for item in email.attachments],
        )
    )


class SeedMaterializer:
    def __init__(self, persistence: PersistenceService, catalog: SeedCatalog) -> None:
        self._persistence = persistence
        self._catalog = catalog
        self._results = {
            result.root.reconciliation_id: result
            for result in catalog.reconciliation.results
        }
        self._model_version = f"{SEED_DECISIONS_MODEL}:{catalog.decision_source}"

    async def ensure_case(
        self, ctx: GuestContext, email_id: str, *, request_id: str
    ) -> UUID:
        """Copy one seed case into the guest workspace once; its ID there."""
        case_id = guest_case_id(ctx.workspace_id, email_id)
        if await self._has_case(ctx, case_id):
            return case_id
        email = self._catalog.emails[email_id]
        audit = self._audit(request_id)
        receipt = await self._persistence.persist_receipt(
            workspace_id=ctx.workspace_id,
            idempotency_key=f"{SEED_VERSION}:{email_id}",
            receipt=ReceiptInput(
                source_message_id=email_id,
                received_at=email.received_at,
                sender=email.sender,
                subject=email.subject,
                body_text=email.body_text,
                message_bytes=_message_bytes(email),
                attachments=tuple(
                    AttachmentInput(
                        file_name=item.file_name,
                        data=self._catalog.read_attachment(item.attachment_id),
                        declared_media_type=None,
                        detected_format=item.detected_format,
                    )
                    for item in email.attachments
                ),
            ),
            audit=audit,
        )
        try:
            await self._persistence.persist_case(
                workspace_id=ctx.workspace_id,
                case=CaseInput(
                    case_id=case_id,
                    email_id=receipt.email_id,
                    evaluator_output=email.case.evaluator_output,
                    field_verdicts=email.case.field_verdicts,
                    structural_diagnostics=email.case.structural_diagnostics,
                    assigned_owner_id=email.case.assigned_owner_id,
                    model_version=self._model_version,
                    prompt_version=SEED_VERSION,
                    normalization_version=NORMALIZATION_VERSION,
                    rule_version=audit.rule_version,
                ),
                audit=audit,
            )
        except IntegrityError:
            # A concurrent request copied the case first.
            if not await self._has_case(ctx, case_id):
                raise
        return case_id

    async def ensure_exception(
        self, ctx: GuestContext, seed_reconciliation_id: UUID, *, request_id: str
    ) -> UUID:
        """Copy one seed reconciliation result into the guest workspace once.

        A run may reference only cases persisted in its workspace, so just
        this result is copied, as a one-result run, after the seed shipments
        and guest copies of the cases it references.
        """
        reconciliation_id = guest_reconciliation_id(
            ctx.workspace_id, seed_reconciliation_id
        )
        if await self._has_exception(ctx, reconciliation_id):
            return reconciliation_id
        seed = self._results[seed_reconciliation_id].root
        shipments = self._catalog.reconciliation.shipments
        audit = self._audit(request_id)
        await self._persistence.import_expected_shipments(
            workspace_id=ctx.workspace_id,
            shipments=tuple(expected_shipment_to_input(item) for item in shipments),
            audit=audit,
        )
        fields = seed.model_dump(mode="json")
        for key in ("case_ids", "candidate_case_ids"):
            if fields.get(key) is not None:
                fields[key] = [
                    str(
                        await self.ensure_case(
                            ctx,
                            seed_case_id.removeprefix(SEED_CASE_PREFIX),
                            request_id=request_id,
                        )
                    )
                    for seed_case_id in fields[key]
                ]
        run_id = uuid5(ctx.workspace_id, f"seed-exception:{seed_reconciliation_id}")
        fields.update(
            reconciliation_id=str(reconciliation_id),
            reconciliation_run_id=str(run_id),
            # The subject key of a case-keyed outcome names the guest case IDs.
            subject_key=compute_subject_key(
                seed.outcome,
                shipment_id=fields.get("shipment_id"),
                case_ids=fields.get("case_ids"),
                candidate_shipment_ids=fields.get("candidate_shipment_ids"),
                candidate_case_ids=fields.get("candidate_case_ids"),
            ),
        )
        # The same ledger manifest hash execute_gate_two records for a run.
        source_hash = sha256(
            json.dumps(
                sorted(item.source_hash for item in shipments), separators=(",", ":")
            ).encode("utf-8")
        ).hexdigest()
        settings = get_settings()
        shipment_id = fields.get("shipment_id")
        owners = {item.shipment_id: item.owner for item in shipments}
        try:
            await self._persistence.persist_reconciliation_run(
                workspace_id=ctx.workspace_id,
                reconciliation_run_id=run_id,
                source_hash=source_hash,
                rule_version=settings.rule_version,
                results=(ReconciliationResult.model_validate(fields),),
                exception_queue_owner=(
                    owners[shipment_id] if shipment_id else settings.demo_owner_id
                ),
                audit=audit,
            )
        except IntegrityError:
            # A concurrent request copied the result first.
            if not await self._has_exception(ctx, reconciliation_id):
                raise
        return reconciliation_id

    async def case_overlays(self, ctx: GuestContext) -> dict[str, CaseReviewStatus]:
        """This guest's copies of seed cases, keyed by seed email ID."""
        statuses = await self._persistence.get_case_review_statuses(
            workspace_id=ctx.workspace_id
        )
        email_ids = {
            guest_case_id(ctx.workspace_id, email_id): email_id
            for email_id in self._catalog.emails
        }
        return {
            email_ids[case_id]: status
            for case_id, status in statuses.items()
            if case_id in email_ids
        }

    async def exception_overlays(
        self, ctx: GuestContext
    ) -> dict[UUID, ReconciliationExceptionState]:
        """This guest's reviewed seed exceptions, keyed by seed result ID."""
        states = await self._persistence.get_reconciliation_exception_states(
            workspace_id=ctx.workspace_id
        )
        seed_ids = {
            guest_reconciliation_id(ctx.workspace_id, seed_id): seed_id
            for seed_id in self._results
        }
        return {
            seed_ids[reconciliation_id]: state
            for reconciliation_id, state in states.items()
            if reconciliation_id in seed_ids and state is not None
        }

    async def _has_case(self, ctx: GuestContext, case_id: UUID) -> bool:
        statuses = await self._persistence.get_case_review_statuses(
            workspace_id=ctx.workspace_id
        )
        return case_id in statuses

    async def _has_exception(self, ctx: GuestContext, reconciliation_id: UUID) -> bool:
        states = await self._persistence.get_reconciliation_exception_states(
            workspace_id=ctx.workspace_id
        )
        return reconciliation_id in states

    def _audit(self, request_id: str) -> AuditContext:
        return AuditContext(
            request_id=request_id,
            rule_version=get_settings().rule_version,
            model_version=self._model_version,
            prompt_version=SEED_VERSION,
        )
