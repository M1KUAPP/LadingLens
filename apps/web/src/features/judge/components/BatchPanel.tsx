import { useState } from 'react'
import { Button, Checkbox } from '../../../components/ui/Controls'
import { StatusPill } from '../../../components/ui/Domain'
import { ClipTooltip } from '../../../components/ui/Overlays'
import { STATUS_KIND, STATUS_LABEL } from '../../../data/inbox-labels'
import type { Batch } from '../batch'
import type { BatchItem } from '../batch-run'
import type { JudgeRun } from '../types'
import './batch-panel.css'

type BatchPanelProps = {
  batch: Batch
  items: BatchItem[]
  running: boolean
  onStart: () => void
  onStop: () => void
  onClear: () => void
  onView: (run: JudgeRun) => void
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function ItemState({ item, onView }: { item: BatchItem; onView: (run: JudgeRun) => void }) {
  const { status, run, error, entry } = item
  if (status === 'blocked') return <span className="batch-note">{entry.problem}</span>
  if (status === 'ready') return <span className="batch-quiet">Ready</span>
  if (status === 'waiting') return <span className="batch-quiet">Waiting</span>
  if (status === 'checking') {
    return (
      <span className="batch-checking">
        <span className="batch-checking-dot" aria-hidden="true" />
        Checking
      </span>
    )
  }
  if (status === 'done' && run?.outcome) {
    return (
      <span className="batch-done">
        <StatusPill status={STATUS_KIND[run.outcome.status]}>{STATUS_LABEL[run.outcome.status]}</StatusPill>
        <Button
          variant="ghost"
          className="batch-view"
          aria-label={`View the result for ${entry.id}`}
          onClick={() => onView(run)}
        >
          View
        </Button>
      </span>
    )
  }
  return (
    <span className="batch-done">
      <span className="batch-error">{error ?? 'The check did not complete.'}</span>
      {run ? (
        <Button
          variant="ghost"
          className="batch-view"
          aria-label={`View the result for ${entry.id}`}
          onClick={() => onView(run)}
        >
          View
        </Button>
      ) : null}
    </span>
  )
}

/** The batch: every entry with what it holds, then its check as it runs. */
export function BatchPanel({ batch, items, running, onStart, onStop, onClear, onView }: BatchPanelProps) {
  const [confirmed, setConfirmed] = useState(false)
  const count = (...statuses: BatchItem['status'][]) => items.filter((item) => statuses.includes(item.status)).length
  const checkable = items.length - count('blocked')
  const queue = count('ready', 'failed')
  const finished = count('done', 'failed')
  const outcomes = items.flatMap((item) =>
    item.status === 'done' && item.run?.outcome ? [item.run.outcome.status] : []
  )
  const failed = count('failed')

  const progress = running
    ? `Checking ${Math.min(finished + 1, checkable)} of ${checkable}. Checks run one at a time.`
    : finished === 0
      ? `${plural(checkable, 'pair', 'pairs')} ready to check.`
      : [
          `${plural(outcomes.length, 'check', 'checks')} done`,
          `${outcomes.filter((status) => status === 'OK').length} match`,
          `${outcomes.filter((status) => status === 'MISMATCH').length} mismatch`,
          `${outcomes.filter((status) => status === 'NEEDS_REVIEW').length} held for review`,
          ...(failed ? [`${failed} failed`] : [])
        ].join(', ') + '.'

  const startLabel =
    count('ready') === 0 && failed > 0
      ? `Retry ${plural(failed, 'failed check', 'failed checks')}`
      : `Check ${plural(queue, 'pair', 'pairs')}`

  return (
    <section className="batch-panel" aria-label="Batch">
      <div className="batch-panel-head">
        <div className="batch-panel-heading">
          <h2 className="batch-panel-title">Batch</h2>
          <p className="batch-panel-subtitle">
            {`${checkable} of ${plural(items.length, 'entry', 'entries')} in ${batch.sources.join(', ')} can be checked.`}
          </p>
        </div>
        <Button variant="ghost" onClick={onClear} disabled={running}>
          Clear batch
        </Button>
      </div>
      <p className="batch-panel-progress" role="status">
        {progress}
      </p>
      <ol className="batch-list">
        {items.map((item) => (
          <li key={item.entry.key} className="batch-item" data-status={item.status}>
            <span className="batch-item-main">
              <span className="batch-item-id">{item.entry.id}</span>
              <ClipTooltip content={item.entry.label}>
                <span className="batch-item-label" data-clip>
                  {item.entry.label}
                </span>
              </ClipTooltip>
              <span className="batch-item-files">{item.entry.names.join(', ') || 'No documents'}</span>
            </span>
            <span className="batch-item-state">
              <ItemState item={item} onView={onView} />
            </span>
          </li>
        ))}
      </ol>
      <div className="batch-panel-actions">
        <Checkbox
          label="These documents are synthetic (no real shipping data)"
          checked={confirmed}
          disabled={running}
          onCheckedChange={setConfirmed}
        />
        {running ? (
          <Button variant="secondary" onClick={onStop}>
            Stop after this check
          </Button>
        ) : (
          <Button variant="primary" disabled={!confirmed || queue === 0} onClick={onStart}>
            {startLabel}
          </Button>
        )}
      </div>
    </section>
  )
}
