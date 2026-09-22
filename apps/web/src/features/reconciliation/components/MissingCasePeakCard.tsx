import { Button } from '../../../components/ui/Controls'
import { StatusPill } from '../../../components/ui/Domain'
import { VerdictHoldGlyph } from '../../../components/ui/Icons'
import {
  lifecycleLabel,
  RECONCILIATION_KIND,
  RECONCILIATION_LABEL,
  requiredDocumentsLabel
} from '../../../data/inbox-labels'
import type { ExpectedShipment, MissingCaseReconciliation } from '../../../domain/contracts'
import './missing-case-peak-card.css'

type MissingCasePeakCardProps = {
  result: MissingCaseReconciliation
  shipment?: ExpectedShipment
  escalated?: boolean
  onEscalate: (result: MissingCaseReconciliation) => void
}

function Fact({ label, value, data }: { label: string; value: string; data?: boolean }) {
  return (
    <div className="missing-case-peak-fact">
      <dt>{label}</dt>
      <dd className={data ? 'type-data-sm' : undefined}>{value}</dd>
    </div>
  )
}

export function MissingCasePeakCard({ result, shipment, escalated = false, onEscalate }: MissingCasePeakCardProps) {
  return (
    <section className="missing-case-peak" data-status="held" aria-label={`Missing case ${result.shipment_id}`}>
      <div className="missing-case-peak-head">
        <span className="missing-case-peak-glyph">
          <VerdictHoldGlyph aria-label="Held" />
        </span>
        <h2 className="missing-case-peak-title">Missing case</h2>
        <StatusPill status={RECONCILIATION_KIND.MISSING_CASE}>{RECONCILIATION_LABEL.MISSING_CASE}</StatusPill>
      </div>

      <div className="missing-case-peak-sides">
        <div className="missing-case-peak-side" role="group" aria-label="Expected shipment">
          <h3 className="missing-case-peak-side-title">Expected shipment</h3>
          <dl className="missing-case-peak-facts">
            <Fact label="Shipment" value={result.shipment_id} data />
            {shipment ? (
              <>
                <Fact label="Booking reference" value={shipment.booking_reference ?? 'None'} data />
                <Fact label="Order number" value={shipment.external_identifiers.order_number ?? 'None'} data />
                <Fact label="BL number" value={shipment.external_identifiers.bl_number ?? 'None'} data />
                <Fact label="Lifecycle" value={lifecycleLabel(shipment.lifecycle)} data />
                <Fact label="Required documents" value={requiredDocumentsLabel(shipment.required_documents)} data />
                <Fact label="Cutoff" value={shipment.cutoff_at ?? 'None'} data />
              </>
            ) : (
              <Fact label="Ledger" value="Shipment details are not in the loaded ledger" />
            )}
          </dl>
        </div>

        <div className="missing-case-peak-side" role="group" aria-label="Received case">
          <h3 className="missing-case-peak-side-title">Received case</h3>
          <div className="missing-case-peak-slot">
            <p className="missing-case-peak-empty">No case has been received for this shipment.</p>
            <p className="missing-case-peak-note">
              LadingLens does not invent a case to fill the gap. The booking stays open until a person escalates it.
            </p>
          </div>
        </div>
      </div>

      <div className="missing-case-peak-actions">
        {escalated ? (
          <p className="missing-case-peak-status" role="status">
            Escalation requested. The exception waits in the review queue.
          </p>
        ) : null}
        <Button variant="secondary" disabled={escalated} onClick={() => onEscalate(result)}>
          Escalate missing case
        </Button>
      </div>
    </section>
  )
}
