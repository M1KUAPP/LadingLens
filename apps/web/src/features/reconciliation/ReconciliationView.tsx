import { useEffect, useState } from 'react'
import type { ExpectedShipment, MissingCaseReconciliation, ReconciliationResult } from '../../domain/contracts'
import { CsvImportSection } from './components/CsvImportSection'
import { ExpectedShipmentTable } from './components/ExpectedShipmentTable'
import { MissingCasePeakCard } from './components/MissingCasePeakCard'
import { ReconciliationOutcomeTable } from './components/ReconciliationOutcomeTable'
import { EXPECTED_SHIPMENTS_CSV, PREPARED_DATASET_LABEL } from './fixtures/prepared'
import { defaultReconciliationService, type ReconciliationService } from './seam'
import type { CsvImportResult } from './types'
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
    Promise.all([service.getExpectedShipments(), service.getReconciliationResults()])
      .then(([shipments, results]) => {
        if (!mounted) return
        setState({ status: 'ready', shipments, results })
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
        const shipments = await service.getExpectedShipments()
        setState({ status: 'ready', shipments, results: state.results })
      }
    } catch (error) {
      setActionError(`Import failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRerun() {
    if (state.status !== 'ready' || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const results = await service.rerunReconciliation()
      setState({ ...state, results })
    } catch (error) {
      setActionError(`Rerun failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
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

          <ExpectedShipmentTable
            shipments={ready.shipments}
            sourceName={CSV_SOURCE_NAME}
            sourceLabel={PREPARED_DATASET_LABEL}
          />

          <CsvImportSection
            importResult={importResult}
            actionError={actionError}
            runId={runId}
            busy={busy}
            onImportCsv={handleImportCsv}
            onLoadPrepared={() => void handleImportCsv(EXPECTED_SHIPMENTS_CSV)}
            onRerun={() => void handleRerun()}
          />
        </>
      ) : null}
    </div>
  )
}
