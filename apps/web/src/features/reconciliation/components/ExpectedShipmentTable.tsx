import { Scrollbar, StatusPill } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import { FRESHNESS_KIND, FRESHNESS_LABEL, lifecycleLabel, requiredDocumentLabels } from '../../../data/inbox-labels'
import type { ExpectedShipment } from '../../../domain/contracts'
import { PhraseList } from './PhraseList'
import './expected-shipment-table.css'

type ExpectedShipmentTableProps = {
  shipments: ExpectedShipment[]
  sourceName: string
  sourceLabel: string
}

export function ExpectedShipmentTable({ shipments, sourceName, sourceLabel }: ExpectedShipmentTableProps) {
  return (
    <section className="expected-shipments" aria-label="Expected shipments">
      <div className="expected-shipments-head">
        <h2 className="expected-shipments-title">Expected shipments</h2>
        <Tooltip label="About the expected shipment source">
          <span>Rows are loaded from prepared CSV data. The ledger is demonstration data, not live bookings.</span>
        </Tooltip>
      </div>
      <p className="expected-shipments-source">
        <span className="expected-shipments-source-tag">Prepared CSV</span>
        <span className="type-data-sm">{sourceName}</span>
        <span className="expected-shipments-source-label">{sourceLabel}</span>
      </p>

      {shipments.length === 0 ? (
        <p className="expected-shipments-empty">No expected shipments loaded.</p>
      ) : (
        <Scrollbar label="Expected shipment rows" orientation="horizontal">
          <table className="expected-shipments-table">
            <caption>Expected shipment ledger</caption>
            <thead>
              <tr>
                <th scope="col">Shipment</th>
                <th scope="col">Booking reference</th>
                <th scope="col">Lifecycle</th>
                <th scope="col">Required documents</th>
                <th scope="col">Cutoff</th>
                <th scope="col">Owner</th>
                <th scope="col">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.shipment_id}>
                  <td className="type-data-sm">{shipment.shipment_id}</td>
                  <td className="type-data-sm">{shipment.booking_reference ?? 'None'}</td>
                  <td className="type-data-sm">{lifecycleLabel(shipment.lifecycle)}</td>
                  <td className="type-data-sm">
                    <PhraseList items={requiredDocumentLabels(shipment.required_documents)} separator=";" />
                  </td>
                  <td className="type-data-sm">{shipment.cutoff_at ?? 'None'}</td>
                  <td>{shipment.owner}</td>
                  <td>
                    <StatusPill status={FRESHNESS_KIND[shipment.source_freshness]}>
                      {FRESHNESS_LABEL[shipment.source_freshness]}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scrollbar>
      )}
    </section>
  )
}
