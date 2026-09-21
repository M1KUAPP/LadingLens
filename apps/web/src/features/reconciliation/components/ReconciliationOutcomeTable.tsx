import { useState } from 'react'
import { Scrollbar, StatusPill } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import { Select } from '../../../components/ui/Select'
import {
  FRESHNESS_LABEL,
  matchBasisLabel,
  RECONCILIATION_KIND,
  RECONCILIATION_LABEL,
  subjectLabel
} from '../../../data/inbox-labels'
import type { ReconciliationOutcome, ReconciliationResult } from '../../../domain/contracts'
import { formatRunId } from '../reconcile'
import './reconciliation-outcome-table.css'

type ReconciliationOutcomeTableProps = {
  results: ReconciliationResult[]
  runId?: string
}

const OUTCOME_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All outcomes' },
  ...(
    [
      'CASE_PRESENT',
      'DOCUMENT_MISSING',
      'MISSING_CASE',
      'UNMATCHED_CASE',
      'DUPLICATE_OR_AMBIGUOUS',
      'SOURCE_STALE'
    ] as ReconciliationOutcome[]
  ).map((outcome) => ({
    value: outcome,
    label: RECONCILIATION_LABEL[outcome]
  }))
]

function shipmentSide(result: ReconciliationResult): string {
  if (result.outcome === 'UNMATCHED_CASE') return 'No expected shipment'
  if (result.outcome === 'DUPLICATE_OR_AMBIGUOUS') return `Candidates: ${result.candidate_shipment_ids.join(', ')}`
  return result.shipment_id
}

function caseSide(result: ReconciliationResult): string {
  if (result.outcome === 'DUPLICATE_OR_AMBIGUOUS') return `Candidates: ${result.candidate_case_ids.join(', ')}`
  return result.case_ids.length > 0 ? result.case_ids.join(', ') : 'No linked case'
}

export function ReconciliationOutcomeTable({ results, runId }: ReconciliationOutcomeTableProps) {
  const [filter, setFilter] = useState('ALL')
  const visible = filter === 'ALL' ? results : results.filter((result) => result.outcome === filter)

  return (
    <section className="recon-outcomes" aria-label="Reconciliation outcomes">
      <div className="recon-outcomes-head">
        <h2 className="recon-outcomes-title">Reconciliation outcomes</h2>
        {runId ? (
          <span className="recon-outcomes-run">
            Run <span className="type-data-sm">{formatRunId(runId)}</span>
          </span>
        ) : null}
        <Tooltip label="About reconciliation outcomes">
          <span>
            Each row is one deterministic outcome for the current run. Only Case present is a clear match; every other
            outcome stays an exception until a person resolves it.
          </span>
        </Tooltip>
      </div>

      <div className="recon-outcomes-filter">
        <Select label="Filter by outcome" value={filter} options={OUTCOME_OPTIONS} onChange={setFilter} />
      </div>

      {results.length === 0 ? (
        <p className="recon-outcomes-empty">No reconciliation results.</p>
      ) : visible.length === 0 ? (
        <p className="recon-outcomes-empty">No results for this outcome.</p>
      ) : (
        <Scrollbar label="Reconciliation results" orientation="horizontal">
          <table className="recon-outcomes-table">
            <caption>Reconciliation results for the current run</caption>
            <thead>
              <tr>
                <th scope="col">Outcome</th>
                <th scope="col">Subject</th>
                <th scope="col">Shipment</th>
                <th scope="col">Cases</th>
                <th scope="col">Match basis</th>
                <th scope="col">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((result) => (
                <tr key={result.reconciliation_id} data-outcome={result.outcome}>
                  <td>
                    <StatusPill status={RECONCILIATION_KIND[result.outcome]}>
                      {RECONCILIATION_LABEL[result.outcome]}
                    </StatusPill>
                  </td>
                  <td className="type-data-sm">{subjectLabel(result.subject_key)}</td>
                  <td className="type-data-sm">{shipmentSide(result)}</td>
                  <td className="type-data-sm">{caseSide(result)}</td>
                  <td className="type-data-sm">
                    {result.match_basis.length > 0 ? result.match_basis.map(matchBasisLabel).join('; ') : 'None'}
                  </td>
                  <td className="type-data-sm">{FRESHNESS_LABEL[result.source_freshness]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scrollbar>
      )}
    </section>
  )
}
