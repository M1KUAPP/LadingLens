import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field } from '../../../components/ui/Controls'
import { DropZone, Scrollbar } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import { Pagination } from '../../../components/ui/Pagination'
import { FRESHNESS_LABEL, lifecycleLabel } from '../../../data/inbox-labels'
import type { ExpectedShipment, RequiredDocument } from '../../../domain/contracts'
import { pageOf } from '../../../lib/paging'
import { formatRunId } from '../reconcile'
import type { CsvImportResult, ReceivedCase } from '../types'
import './reconciliation-inputs.css'

const MAX_CSV_BYTES = 256_000

const DOCUMENT_LABEL: Record<RequiredDocument, string> = { SI: 'SI', DRAFT_BL: 'Draft BL' }

type InputView = 'shipments' | 'cases'

type ReconciliationInputsProps = {
  shipments: ExpectedShipment[]
  cases: ReceivedCase[]
  importResult: CsvImportResult | null
  actionError?: string | null
  runId?: string
  busy?: boolean
  onRun: () => void
  onImportCsv: (csvText: string) => void
  onDownloadPrepared: () => void
  onLoadPrepared: () => void
}

/** A row's booking, order and BL numbers, as the ledger or the case names them. */
function numbers(identifiers: Record<string, string>, booking?: string): (string | undefined)[] {
  return [booking ?? identifiers.booking_reference, identifiers.order_number, identifiers.bl_number]
}

function NumberCells({ values }: { values: (string | undefined)[] }) {
  return values.map((value, index) => (
    <td key={index} className="type-data-sm">
      {value ?? 'None'}
    </td>
  ))
}

export function ReconciliationInputs({
  shipments,
  cases,
  importResult,
  actionError,
  runId,
  busy = false,
  onRun,
  onImportCsv,
  onDownloadPrepared,
  onLoadPrepared
}: ReconciliationInputsProps) {
  const [view, setView] = useState<InputView>('shipments')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [readError, setReadError] = useState<string | null>(null)

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    try {
      onImportCsv(await file.text())
    } catch {
      setReadError(`${file.name} could not be read`)
    }
  }

  function show(next: InputView) {
    setView(next)
    setPage(1)
  }

  const term = query.trim().toLowerCase()
  const found = (ids: (string | undefined)[]) => !term || ids.some((id) => id?.toLowerCase().includes(term))
  const shipmentRows = shipments.filter((shipment) =>
    found([shipment.shipment_id, ...numbers(shipment.external_identifiers, shipment.booking_reference)])
  )
  const caseRows = cases.filter((item) => found([item.email_id, ...numbers(item.identifiers)]))
  const total = view === 'shipments' ? shipmentRows.length : caseRows.length
  const { page: current, rows: shipmentPage } = pageOf(shipmentRows, page)
  const { rows: casePage } = pageOf(caseRows, page)
  const switches: { value: InputView; label: string; count: number }[] = [
    { value: 'shipments', label: 'Expected shipments', count: shipments.length },
    { value: 'cases', label: 'Received BL cases', count: cases.length }
  ]

  return (
    <section className="recon-inputs" aria-label="Reconciliation inputs">
      <div className="recon-inputs-head">
        <h2 className="recon-inputs-title">Inputs</h2>
        <Tooltip label="About the inputs">
          <span>
            Reconciliation matches the expected-shipment ledger against the BL cases that arrived, on the booking, order
            and BL numbers both name. Drop a CSV with the ledger columns to replace the ledger; every row is checked
            first.
          </span>
        </Tooltip>
      </div>

      <div className="recon-inputs-toolbar">
        <div className="recon-inputs-switch" role="group" aria-label="Input">
          {switches.map(({ value, label, count }) => (
            <Button
              key={value}
              variant={view === value ? 'secondary' : 'ghost'}
              className="recon-inputs-switch-button"
              aria-pressed={view === value}
              onClick={() => show(value)}
            >
              {label}
              <span className="recon-inputs-count">{count}</span>
            </Button>
          ))}
        </div>
        <div className="recon-inputs-search">
          <Field
            type="search"
            label="Search by ID"
            value={query}
            placeholder={view === 'shipments' ? 'SHP-5RFR-37631' : 'email_507'}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {total === 0 ? (
        <p className="recon-inputs-empty">
          {(view === 'shipments' ? shipments : cases).length > 0
            ? 'No rows match the search.'
            : view === 'shipments'
              ? 'The ledger has no expected shipments.'
              : 'No BL cases have been received.'}
        </p>
      ) : (
        <>
          <Scrollbar label={view === 'shipments' ? 'Expected shipments' : 'Received BL cases'} orientation="horizontal">
            {view === 'shipments' ? (
              <table className="recon-inputs-table">
                <caption>Expected shipments in the loaded ledger</caption>
                <thead>
                  <tr>
                    <th scope="col">Shipment</th>
                    <th scope="col">Booking</th>
                    <th scope="col">Order</th>
                    <th scope="col">BL</th>
                    <th scope="col">Stage</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentPage.map((shipment) => (
                    <tr key={shipment.shipment_id}>
                      <td className="type-data-sm">{shipment.shipment_id}</td>
                      <NumberCells values={numbers(shipment.external_identifiers, shipment.booking_reference)} />
                      <td>{lifecycleLabel(shipment.lifecycle)}</td>
                      <td>{FRESHNESS_LABEL[shipment.source_freshness]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="recon-inputs-table">
                <caption>BL cases received in the inbox</caption>
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Booking</th>
                    <th scope="col">Order</th>
                    <th scope="col">BL</th>
                    <th scope="col">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {casePage.map((item) => (
                    <tr key={item.case_id}>
                      <td className="type-data-sm">
                        <Link className="recon-inputs-link" to={`/emails/${encodeURIComponent(item.email_id)}`}>
                          {item.email_id}
                        </Link>
                      </td>
                      <NumberCells values={numbers(item.identifiers)} />
                      <td>
                        {item.documents.length > 0
                          ? item.documents.map((document) => DOCUMENT_LABEL[document]).join(', ')
                          : 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Scrollbar>
          <Pagination
            label={view === 'shipments' ? 'Expected shipment pages' : 'Received case pages'}
            page={current}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <div className="recon-inputs-import">
        <DropZone
          label="Import expected shipments CSV"
          formats={['csv']}
          maxBytes={MAX_CSV_BYTES}
          onFiles={handleFiles}
        />

        {importResult && importResult.errors.length === 0 ? (
          <p className="recon-inputs-success" role="status">
            {importResult.importedCount} {importResult.importedCount === 1 ? 'row' : 'rows'} imported.
          </p>
        ) : null}

        {importResult && importResult.errors.length > 0 ? (
          <ul className="recon-inputs-errors" role="alert">
            {importResult.errors.map((error) => (
              <li key={`${error.row}-${error.column ?? ''}-${error.message}`}>
                Row {error.row}
                {error.column ? ` (${error.column})` : ''}: {error.message}
              </li>
            ))}
          </ul>
        ) : null}

        {readError ? (
          <p className="recon-inputs-action-error" role="alert">
            {readError}
          </p>
        ) : null}
        {actionError ? (
          <p className="recon-inputs-action-error" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="recon-inputs-actions">
        {runId ? (
          <span className="recon-inputs-run">
            Latest run <span className="type-data-sm">{formatRunId(runId)}</span>
          </span>
        ) : null}
        <div className="recon-inputs-buttons">
          <Button variant="secondary" onClick={onDownloadPrepared}>
            Download prepared CSV
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onLoadPrepared}>
            Load prepared CSV
          </Button>
          <Button variant="primary" disabled={busy} onClick={onRun}>
            {runId ? 'Rerun reconciliation' : 'Run reconciliation'}
          </Button>
        </div>
      </div>
    </section>
  )
}
