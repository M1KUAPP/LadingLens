import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Field } from '../../../components/ui/Controls'
import { Scrollbar, StatusPill } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import { Pagination } from '../../../components/ui/Pagination'
import { Select } from '../../../components/ui/Select'
import {
  FRESHNESS_LABEL,
  matchBasisLabel,
  RECONCILIATION_KIND,
  RECONCILIATION_LABEL,
  subjectLabel
} from '../../../data/inbox-labels'
import type { ReconciliationOutcome, ReconciliationResult, SourceFreshness } from '../../../domain/contracts'
import { pageOf } from '../../../lib/paging'
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

const FRESHNESS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Current and stale' },
  ...(['CURRENT', 'STALE'] as SourceFreshness[]).map((freshness) => ({
    value: freshness,
    label: FRESHNESS_LABEL[freshness]
  }))
]

type SortOrder = 'run' | 'asc' | 'desc'
type Density = 'comfortable' | 'compact'

const SORT_OPTIONS = [
  { value: 'run', label: 'Run order' },
  { value: 'asc', label: 'Subject ascending' },
  { value: 'desc', label: 'Subject descending' }
]

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' }
]

/** The IDs a row shows: its subject, its shipment or candidates, and its cases. */
function resultIds(result: ReconciliationResult): string[] {
  const subject = subjectLabel(result.subject_key)
  if (result.outcome === 'DUPLICATE_OR_AMBIGUOUS') {
    return [subject, ...result.candidate_shipment_ids, ...result.candidate_case_ids]
  }
  if (result.outcome === 'UNMATCHED_CASE') return [subject, ...result.case_ids]
  return [subject, result.shipment_id, ...result.case_ids]
}

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
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [freshness, setFreshness] = useState('ALL')
  const [order, setOrder] = useState<SortOrder>('run')
  const [density, setDensity] = useState<Density>('comfortable')
  const [page, setPage] = useState(1)
  const term = query.trim().toLowerCase()
  const matching = results.filter((result) => {
    if (filter !== 'ALL' && result.outcome !== filter) return false
    if (freshness !== 'ALL' && result.source_freshness !== freshness) return false
    return !term || resultIds(result).some((id) => id.toLowerCase().includes(term))
  })
  const visible =
    order === 'run'
      ? matching
      : matching.sort((a, b) => {
          const cmp = subjectLabel(a.subject_key).localeCompare(subjectLabel(b.subject_key), undefined, {
            numeric: true
          })
          return order === 'asc' ? cmp : -cmp
        })
  const { page: current, rows: pageRows } = pageOf(visible, page)

  const applyQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }
  const applyFilter = (value: string) => {
    setFilter(value)
    setPage(1)
  }
  const applyFreshness = (value: string) => {
    setFreshness(value)
    setPage(1)
  }
  const applyOrder = (value: string) => {
    setOrder(value as SortOrder)
    setPage(1)
  }

  return (
    <div className="recon-outcomes-block">
      <div className="recon-outcomes-controls">
        <div className="recon-outcomes-search">
          <Field
            type="search"
            label="Search by ID"
            value={query}
            placeholder="SYN-042"
            onChange={(event: ChangeEvent<HTMLInputElement>) => applyQuery(event.target.value)}
          />
        </div>
        <div className="recon-outcomes-filter">
          <Select label="Outcome" value={filter} options={OUTCOME_OPTIONS} onChange={applyFilter} />
        </div>
        <Select label="Freshness" value={freshness} options={FRESHNESS_OPTIONS} onChange={applyFreshness} />
        <div className="recon-outcomes-view">
          <Select label="Sort" value={order} options={SORT_OPTIONS} onChange={applyOrder} />
          <Select
            label="Density"
            value={density}
            options={DENSITY_OPTIONS}
            onChange={(value) => setDensity(value as Density)}
          />
        </div>
      </div>

      <section className="recon-outcomes" aria-label="Reconciliation outcomes">
        <div className="recon-outcomes-bar">
          <div className="recon-outcomes-head">
            <h2 className="recon-outcomes-title">Reconciliation outcomes</h2>
            {runId ? (
              <span className="recon-outcomes-run">
                Run <span className="type-data-sm">{formatRunId(runId)}</span>
              </span>
            ) : null}
            <Tooltip label="About reconciliation outcomes">
              <span>
                Each row is one deterministic outcome for the current run. Only Case present is a clear match; every
                other outcome stays an exception until a person resolves it.
              </span>
            </Tooltip>
          </div>
        </div>

        {results.length === 0 ? (
          <p className="recon-outcomes-empty">No reconciliation results.</p>
        ) : visible.length === 0 ? (
          <p className="recon-outcomes-empty">No results match the current filters.</p>
        ) : (
          <>
            <Scrollbar label="Reconciliation results" orientation="horizontal">
              <table className="recon-outcomes-table" data-density={density}>
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
                  {pageRows.map((result) => (
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
            <Pagination
              label="Reconciliation outcome pages"
              page={current}
              total={visible.length}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  )
}
