import { useState } from 'react'
import { Button } from '../../../components/ui/Controls'
import { DropZone } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import { formatRunId } from '../reconcile'
import type { CsvImportResult } from '../types'
import './csv-import-section.css'

const MAX_CSV_BYTES = 256_000

type CsvImportSectionProps = {
  importResult: CsvImportResult | null
  actionError?: string | null
  runId?: string
  busy?: boolean
  onImportCsv: (csvText: string) => void
  onLoadPrepared: () => void
  onRerun: () => void
}

export function CsvImportSection({
  importResult,
  actionError,
  runId,
  busy = false,
  onImportCsv,
  onLoadPrepared,
  onRerun
}: CsvImportSectionProps) {
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

  return (
    <section className="csv-import" aria-label="CSV import">
      <div className="csv-import-head">
        <h2 className="csv-import-title">CSV import</h2>
        <Tooltip label="About the CSV import">
          <span>
            Drop a CSV with the expected-shipment columns, or load the prepared CSV. Every row is checked before the
            ledger is replaced.
          </span>
        </Tooltip>
      </div>

      <div className="csv-import-body">
        <DropZone
          label="Import expected shipments CSV"
          formats={['csv']}
          maxBytes={MAX_CSV_BYTES}
          onFiles={handleFiles}
        />

        {importResult && importResult.errors.length === 0 ? (
          <p className="csv-import-success" role="status">
            {importResult.importedCount} {importResult.importedCount === 1 ? 'row' : 'rows'} imported.
          </p>
        ) : null}

        {importResult && importResult.errors.length > 0 ? (
          <ul className="csv-import-errors" role="alert">
            {importResult.errors.map((error) => (
              <li key={`${error.row}-${error.column ?? ''}-${error.message}`}>
                Row {error.row}
                {error.column ? ` (${error.column})` : ''}: {error.message}
              </li>
            ))}
          </ul>
        ) : null}

        {readError ? (
          <p className="csv-import-action-error" role="alert">
            {readError}
          </p>
        ) : null}
        {actionError ? (
          <p className="csv-import-action-error" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="csv-import-actions">
        {runId ? (
          <span className="csv-import-run">
            Latest run <span className="type-data-sm">{formatRunId(runId)}</span>
          </span>
        ) : null}
        <div className="csv-import-buttons">
          <Button variant="secondary" disabled={busy} onClick={onLoadPrepared}>
            Load prepared CSV
          </Button>
          <Button variant="primary" disabled={busy} onClick={onRerun}>
            Rerun reconciliation
          </Button>
        </div>
      </div>
    </section>
  )
}
