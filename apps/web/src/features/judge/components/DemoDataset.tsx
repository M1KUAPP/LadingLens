import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Controls'
import { Tooltip } from '../../../components/ui/Overlays'
import { RECONCILIATION_LABEL, STATUS_LABEL } from '../../../data/inbox-labels'
import type { ReconciliationOutcome, Status } from '../../../domain/contracts'
import type { GateSummary } from '../types'

type DemoDatasetProps = {
  getGateSummary: () => Promise<GateSummary>
  downloadArtifact: (path: string, fileName: string) => Promise<void>
}

const SOURCE_LABEL: Record<GateSummary['source'], string> = {
  prepared: 'Prepared baseline',
  recorded: 'Recorded run'
}

const DOWNLOAD_ERROR_MESSAGE = 'The download did not start. Try again.'

function statusLabel(status: string): string {
  return STATUS_LABEL[status as Status] ?? status
}

function reconciliationLabel(outcome: string): string {
  return RECONCILIATION_LABEL[outcome as ReconciliationOutcome] ?? outcome
}

// The demo dataset in one card: its gate counts once they load, then its
// submission to download.
export function DemoDataset({ getGateSummary, downloadArtifact }: DemoDatasetProps) {
  const [summary, setSummary] = useState<GateSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getGateSummary()
      .then((loaded) => {
        if (mounted) setSummary(loaded)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [getGateSummary])

  async function handleDownload() {
    setError(null)
    setPending(true)
    try {
      await downloadArtifact('/api/artifacts/submission.json', 'submission.json')
    } catch {
      setError(DOWNLOAD_ERROR_MESSAGE)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="demo-dataset" aria-label="Demo dataset">
      <div className="demo-dataset-head">
        <h2 className="demo-dataset-heading">Demo dataset</h2>
        <Tooltip label="About the demo dataset">
          <span>
            Gate 1 confirms every synthetic email was accounted for. Gate 2 shows how shipments reconciled against the
            expected records. The download is the dataset's submission.
          </span>
        </Tooltip>
      </div>
      {summary ? (
        <>
          <p className="demo-dataset-source">{SOURCE_LABEL[summary.source]}</p>
          <p className="demo-dataset-gate1">{`${summary.gate1.accounted} of ${summary.gate1.received} email${summary.gate1.received === 1 ? '' : 's'} accounted for`}</p>
          <ul className="demo-dataset-counts" aria-label="Comparison counts">
            {Object.entries(summary.comparison).map(([status, count]) => (
              <li key={status}>{`${statusLabel(status)} (${count})`}</li>
            ))}
          </ul>
          <ul className="demo-dataset-counts" aria-label="Gate 2 outcome counts">
            {Object.entries(summary.gate2.outcomes).map(([outcome, count]) => (
              <li key={outcome}>{`${reconciliationLabel(outcome)} (${count})`}</li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="demo-dataset-downloads">
        <Button variant="secondary" disabled={pending} onClick={() => void handleDownload()}>
          Download submission JSON
        </Button>
      </div>
      {error && (
        <p role="alert" className="demo-dataset-error">
          {error}
        </p>
      )}
    </section>
  )
}
