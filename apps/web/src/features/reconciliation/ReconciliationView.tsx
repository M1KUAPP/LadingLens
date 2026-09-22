import { useEffect, useState } from 'react'
import type { ExpectedShipment, MissingCaseReconciliation, ReconciliationResult } from '../../domain/contracts'
import { saveBlob } from '../../lib/download'
import { MissingCasePeakCard } from './components/MissingCasePeakCard'
import { ReconciliationInputs } from './components/ReconciliationInputs'
import { ReconciliationOutcomeTable } from './components/ReconciliationOutcomeTable'
import { EXPECTED_SHIPMENTS_CSV } from './fixtures/prepared'
import { defaultReconciliationService, type ReconciliationService } from './seam'
import type { CsvImportResult, ReceivedCase } from './types'
import './reconciliation.css'

type ReconciliationViewProps = {
  service?: ReconciliationService
  onEscalateMissingCase?: (result: MissingCaseReconciliation) => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      shipments: ExpectedShipment[]
      cases: ReceivedCase[]
      results: ReconciliationResult[]
    }

const CSV_SOURCE_NAME = 'expected_shipments.csv'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function ReconciliationView({
  service = defaultReconciliationService,
  onEscalateMissingCase
}: ReconciliationViewProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [escalatedIds, setEscalatedIds] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([service.getExpectedShipments(), service.getReceivedCases(), service.getReconciliationResults()])
      .then(([shipments, cases, results]) => {
        if (!mounted) return
        setState({ status: 'ready', shipments, cases, results })
      })
      .catch((error: unknown) => {
        if (mounted) setState({ status: 'error', message: errorMessage(error) })
      })
    return () => {
      mounted = false
    }
  }, [service])

  async function handleImportCsv(csvText: string) {
    if (state.status !== 'ready' || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const result = await service.importShipmentsCsv(csvText)
      setImportResult(result)
      if (result.errors.length === 0) {
        // A new ledger clears the latest run, so the page is back on its inputs.
        const [shipments, results] = await Promise.all([
          service.getExpectedShipments(),
          service.getReconciliationResults()
        ])
        setState({ ...state, shipments, results })
      }
    } catch (error) {
      setActionError(`Import failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRun() {
    if (state.status !== 'ready' || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const results = await service.runReconciliation()
      setState({ ...state, results })
    } catch (error) {
      setActionError(`Reconciliation failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  function handleDownloadPrepared() {
    saveBlob(new Blob([EXPECTED_SHIPMENTS_CSV], { type: 'text/csv' }), CSV_SOURCE_NAME)
  }

  function handleEscalate(result: MissingCaseReconciliation) {
    setEscalatedIds((prev) => new Set(prev).add(result.reconciliation_id))
    onEscalateMissingCase?.(result)
  }

  const ready = state.status === 'ready' ? state : null
  const runId = ready?.results[0]?.reconciliation_run_id
  const missingCases = ready
    ? ready.results.filter((result): result is MissingCaseReconciliation => result.outcome === 'MISSING_CASE')
    : []

  return (
    <div className="recon-view">
      {state.status === 'loading' ? (
        <div className="recon-loading" role="status" aria-label="Loading reconciliation">
          <span className="recon-skeleton-bar recon-skeleton-bar--wide" />
          <span className="recon-skeleton-bar" />
          <span className="recon-skeleton-bar" />
          <span className="recon-loading-note">Loading prepared reconciliation data.</span>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="recon-error" role="alert">
          <h2 className="recon-error-title">The prepared reconciliation data could not be loaded</h2>
          <p>{state.message}</p>
          <p>No reconciliation figures are shown until the data loads.</p>
        </div>
      ) : null}

      {ready ? (
        <>
          <ReconciliationInputs
            shipments={ready.shipments}
            cases={ready.cases}
            importResult={importResult}
            actionError={actionError}
            runId={runId}
            busy={busy}
            onRun={() => void handleRun()}
            onImportCsv={handleImportCsv}
            onDownloadPrepared={handleDownloadPrepared}
            onLoadPrepared={() => void handleImportCsv(EXPECTED_SHIPMENTS_CSV)}
          />

          {ready.results.length === 0 ? (
            <div className="recon-pending" role="status">
              <p className="recon-pending-title">Not reconciled yet</p>
              <p className="recon-pending-body">
                Run reconciliation to match the {ready.shipments.length} expected shipments to the {ready.cases.length}{' '}
                received BL cases.
              </p>
            </div>
          ) : (
            <>
              {missingCases.map((result) => (
                <MissingCasePeakCard
                  key={result.reconciliation_id}
                  result={result}
                  shipment={ready.shipments.find((s) => s.shipment_id === result.shipment_id)}
                  escalated={escalatedIds.has(result.reconciliation_id)}
                  onEscalate={handleEscalate}
                />
              ))}

              <ReconciliationOutcomeTable results={ready.results} runId={runId} />
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
