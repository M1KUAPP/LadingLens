import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StatusPill } from '../../../components/ui/Domain'
import { subjectLabel } from '../../../data/inbox-labels'
import type { ReconciliationExceptionActionInput, ReviewQueueItem } from '../types'
import { custodyKind, custodyLabel, isHeld, itemIdentifier, ownerLabel, reasonLabel } from './item-labels'
import { ReconciliationActionPanel } from './ReconciliationActionPanel'
import './review-queue-detail.css'

type ReviewQueueDetailProps = {
  item: ReviewQueueItem
  detailId: string
  onExceptionAction: (input: ReconciliationExceptionActionInput) => Promise<void>
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rq-meta">
      <dt className="rq-meta-label">{label}</dt>
      <dd className="rq-meta-value">{children}</dd>
    </div>
  )
}

export function ReviewQueueDetail({ item, detailId, onExceptionAction }: ReviewQueueDetailProps) {
  const id = itemIdentifier(item)
  return (
    <section
      className="rq-detail"
      id={detailId}
      aria-label={`Queue item ${id}`}
      data-status={isHeld(item) ? 'held' : undefined}
    >
      <div className="rq-detail-head">
        <h2 className="rq-detail-title type-data-md">{id}</h2>
        <StatusPill status={custodyKind(item)}>{custodyLabel(item)}</StatusPill>
      </div>

      <div className="rq-detail-body">
        <dl className="rq-detail-meta">
          <Meta label="Kind">{item.kind === 'case' ? 'Held case' : 'Reconciliation exception'}</Meta>
          <Meta label={item.kind === 'case' ? 'Review reason' : 'Outcome'}>{reasonLabel(item)}</Meta>
          {item.kind === 'reconciliation_exception' && <Meta label="Subject">{subjectLabel(item.subject_key)}</Meta>}
          {item.kind === 'reconciliation_exception' && item.shipment_id && (
            <Meta label="Expected shipment">{item.shipment_id}</Meta>
          )}
          {item.kind === 'reconciliation_exception' && item.case_ids.length > 0 && (
            <Meta label="Linked cases">{item.case_ids.join(', ')}</Meta>
          )}
          {item.kind === 'case' && (
            <Meta label="Source email">
              <Link className="rq-detail-link" to={`/emails/${encodeURIComponent(item.email_id)}`}>
                {item.email_id}
              </Link>
            </Meta>
          )}
          <Meta label="Assigned owner">{ownerLabel(item)}</Meta>
          <Meta label="Queued">{item.created_at}</Meta>
        </dl>

        {item.kind === 'case' && <p className="rq-detail-evidence">{item.evidence_summary}</p>}

        <div className="rq-history">
          <h3 className="rq-history-title">History</h3>
          {item.history.length > 0 ? (
            <ul className="rq-history-list">
              {item.history.map((entry) => (
                <li key={entry.id} className="rq-history-entry">
                  <div className="rq-history-meta">
                    <span>{entry.actor}</span>
                    <span>{entry.timestamp}</span>
                  </div>
                  <div>
                    <strong>{entry.action}</strong>
                    {entry.note ? `: ${entry.note}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rq-history-empty">No actions recorded yet.</p>
          )}
        </div>
      </div>

      {item.kind === 'reconciliation_exception' && (
        <ReconciliationActionPanel item={item} onAction={onExceptionAction} />
      )}
    </section>
  )
}
