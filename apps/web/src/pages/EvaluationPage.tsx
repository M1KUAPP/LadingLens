import type { ReactNode } from 'react'
import { StatusPill } from '../components/ui/Domain'
import { PageHead } from '../components/ui/PageHead'
import {
  CATEGORIES,
  CASE_STATUSES,
  RECONCILIATION_OUTCOMES,
  REVIEW_REASONS,
  summarizeInbox
} from '../data/inbox-integrity'
import {
  CATEGORY_LABEL,
  RECONCILIATION_KIND,
  RECONCILIATION_LABEL,
  REVIEW_REASON_LABEL,
  STATUS_KIND,
  STATUS_LABEL
} from '../data/inbox-labels'
import { fixtureInboxSource } from '../data/inbox-source'
import { useInboxDataset } from '../data/use-inbox-dataset'
import type { InboxDataset, InboxSource } from '../data/inbox-types'
import './evaluation-page.css'

function EvalPanel({
  panel,
  title,
  children
}: {
  panel: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="eval-panel" data-panel={panel}>
      <h2 className="type-heading-sm">{title}</h2>
      {children}
    </section>
  )
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="eval-count-row">
      <span className="eval-count-label">{label}</span>
      <span className="type-data-md">{value}</span>
    </li>
  )
}

function CoveragePanel({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  const total = summary.received
  const classified = summary.accountedFor
  const percent = total === 0 ? 0 : (classified / total) * 100
  return (
    <EvalPanel panel="coverage" title="Classification coverage">
      <p className="eval-figure">
        <span className="eval-figure-value">{percent.toFixed(1)}%</span>
        <span className="eval-figure-note type-data-sm">
          {classified} of {total}
        </span>
      </p>
      <ul className="eval-count-list">
        {CATEGORIES.map((category) => (
          <CountRow
            key={category}
            label={CATEGORY_LABEL[category]}
            value={summary.byCategory[category]}
          />
        ))}
      </ul>
    </EvalPanel>
  )
}

function ComparisonPanel({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  return (
    <EvalPanel panel="comparison" title="Comparison outcomes">
      <p className="eval-figure">
        <span className="eval-figure-value">{summary.comparisonRows}</span>
        <span className="eval-figure-note">BL comparisons processed</span>
      </p>
      <ul className="eval-count-list">
        {CASE_STATUSES.map((status) => (
          <li className="eval-count-row" key={status}>
            <StatusPill status={STATUS_KIND[status]}>
              {STATUS_LABEL[status]}
            </StatusPill>
            <span className="type-data-md">
              {summary.comparisonByStatus[status]}
            </span>
          </li>
        ))}
      </ul>
    </EvalPanel>
  )
}

function StatusPanel({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  return (
    <EvalPanel panel="status" title="Processed status">
      <ul className="eval-count-list">
        {CASE_STATUSES.map((status) => {
          const count = dataset.rows.filter(
            (row) => row.outcome.status === status
          ).length
          return (
            <li className="eval-count-row" key={status}>
              <StatusPill status={STATUS_KIND[status]}>
                {STATUS_LABEL[status]}
              </StatusPill>
              <span className="type-data-md">{count}</span>
            </li>
          )
        })}
      </ul>
      <h3 className="eval-subhead type-data-xs">Held for review</h3>
      <ul className="eval-count-list">
        {REVIEW_REASONS.map((reason) => (
          <CountRow
            key={reason}
            label={REVIEW_REASON_LABEL[reason]}
            value={summary.heldReasons[reason] ?? 0}
          />
        ))}
      </ul>
    </EvalPanel>
  )
}

function ReconciliationPanel({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  return (
    <EvalPanel panel="reconciliation" title="Reconciliation outcomes">
      <p className="eval-figure">
        <span className="eval-figure-value">{dataset.reconciliation.length}</span>
        <span className="eval-figure-note">Prepared shipments checked</span>
      </p>
      <ul className="eval-count-list">
        {RECONCILIATION_OUTCOMES.map((outcome) => (
          <li className="eval-count-row" key={outcome}>
            <StatusPill status={RECONCILIATION_KIND[outcome]}>
              {RECONCILIATION_LABEL[outcome]}
            </StatusPill>
            <span className="type-data-md">
              {summary.reconciliationByOutcome[outcome]}
            </span>
          </li>
        ))}
      </ul>
      <ul className="eval-shipment-list">
        {dataset.reconciliation.map((entry) => (
          <li className="eval-shipment-row" key={entry.shipment_id}>
            <span className="type-data-sm">{entry.shipment_id}</span>
            <span className="eval-shipment-outcome">
              {RECONCILIATION_LABEL[entry.outcome]}
            </span>
          </li>
        ))}
      </ul>
    </EvalPanel>
  )
}

function LatencyPanel() {
  return (
    <EvalPanel panel="latency" title="Awaiting fresh Gemini 3.5 Flash benchmark">
      <p className="eval-latency-note">
        The benchmark run is still open. When it lands, this panel will report
        per-case processing time and end-to-end inbox throughput measured against
        the prepared dataset.
      </p>
    </EvalPanel>
  )
}

function EvaluationLoading() {
  return (
    <div className="eval-loading" role="status" aria-label="Loading evaluation">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="eval-skeleton-panel" key={index}>
          <span className="eval-skeleton-bar eval-skeleton-bar--title" />
          <span className="eval-skeleton-bar eval-skeleton-bar--figure" />
          <span className="eval-skeleton-bar" />
          <span className="eval-skeleton-bar" />
        </div>
      ))}
      <span className="eval-skeleton-note">
        Loading prepared evaluation data.
      </span>
    </div>
  )
}

function EvaluationError({ problems }: { problems: string[] }) {
  return (
    <div className="eval-error" role="alert">
      <h2 className="type-heading-sm">
        The prepared evaluation data could not be verified
      </h2>
      <p>No evaluation metrics are shown until the prepared data verifies.</p>
      <ul className="eval-error-list">
        {problems.map((problem) => (
          <li className="type-data-sm" key={problem}>
            {problem}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EvaluationPage({
  source = fixtureInboxSource
}: {
  source?: InboxSource
}) {
  const state = useInboxDataset(source)
  return (
    <div className="page">
      <PageHead
        title="Evaluation"
        tag="Prepared data"
        hintLabel="Where this evaluation data comes from"
        hint={
          <span>
            Demonstration baseline metrics evaluated against the prepared correspondence and intake dataset.
          </span>
        }
      />
      {state.status === 'loading' ? <EvaluationLoading /> : null}
      {state.status === 'error' ? (
        <EvaluationError problems={state.problems} />
      ) : null}
      {state.status === 'ready' ? (
        <div className="eval-grid">
          <CoveragePanel dataset={state.dataset} />
          <ComparisonPanel dataset={state.dataset} />
          <StatusPanel dataset={state.dataset} />
          <ReconciliationPanel dataset={state.dataset} />
          <LatencyPanel />
        </div>
      ) : null}
    </div>
  )
}
