import { useEffect, useState } from 'react'
import { Tooltip } from '../../../components/ui/Overlays'
import { RECONCILIATION_LABEL, STATUS_LABEL } from '../../../data/inbox-labels'
import type { ReconciliationOutcome, Status } from '../../../domain/contracts'
import type { GateSummary as GateSummaryData } from '../types'

type GateSummaryProps = {
  getGateSummary: () => Promise<GateSummaryData>
}

const SOURCE_LABEL: Record<GateSummaryData['source'], string> = {
  prepared: 'Prepared baseline',
  recorded: 'Recorded run'
}

function statusLabel(status: string): string {
  return STATUS_LABEL[status as Status] ?? status
}

function reconciliationLabel(outcome: string): string {
  return RECONCILIATION_LABEL[outcome as ReconciliationOutcome] ?? outcome
}

export function GateSummary({ getGateSummary }: GateSummaryProps) {
  const [summary, setSummary] = useState<GateSummaryData | null>(null)

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

  if (!summary) return null

  return (
    <section className="gate-summary" aria-label="Gate summary">
      <div className="gate-summary-head">
        <h2 className="gate-summary-heading">Demo dataset summary</h2>
        <Tooltip label="About the demo dataset summary">
          <span>
            Gate 1 confirms every synthetic email was accounted for. Gate 2 shows how shipments reconciled against
            the expected records.
          </span>
        </Tooltip>
      </div>
      <p className="gate-summary-source">{SOURCE_LABEL[summary.source]}</p>
      <p className="gate-summary-gate1">{`${summary.gate1.accounted} of ${summary.gate1.received} emails accounted for`}</p>
      <ul className="gate-summary-comparison" aria-label="Comparison counts">
        {Object.entries(summary.comparison).map(([status, count]) => (
          <li key={status}>{`${statusLabel(status)} (${count})`}</li>
        ))}
      </ul>
      <ul className="gate-summary-gate2" aria-label="Gate 2 outcome counts">
        {Object.entries(summary.gate2.outcomes).map(([outcome, count]) => (
          <li key={outcome}>{`${reconciliationLabel(outcome)} (${count})`}</li>
        ))}
      </ul>
    </section>
  )
}
