import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Controls'
import { Scrollbar, StatusPill } from '../../../components/ui/Domain'
import { caseLabel } from '../../../data/inbox-labels'
import { useRowLink } from '../../../lib/use-row-link'
import { PhraseList } from '../../reconciliation/components/PhraseList'
import type { ReconciliationExceptionQueueItem, ReviewQueueItem } from '../types'
import { custodyKind, custodyLabel, isHeld, itemIdentifier, itemName, KIND_LABEL, reasonLabel } from './item-labels'
import './review-queue-table.css'

type ReviewQueueTableProps = {
  items: ReviewQueueItem[]
  selectedId: string | null
  detailId: string
  density?: 'comfortable' | 'compact'
  onToggle: (item: ReviewQueueItem) => void
  /** Closes the card under the table, as the pagination bar does. */
  footer?: ReactNode
}

/** What an exception's row names beside its subject: the emails it
 * concerns, or the side that is missing. */
function counterpart(item: ReconciliationExceptionQueueItem) {
  if (item.outcome === 'MISSING_CASE') return 'No case received'
  if (item.outcome === 'UNMATCHED_CASE') return 'No expected shipment'
  if (item.outcome === 'DUPLICATE_OR_AMBIGUOUS') {
    return (
      <>
        {'Candidates: '}
        <PhraseList items={item.candidate_shipment_ids} separator="," />
      </>
    )
  }
  return item.case_ids.map((caseId) => {
    const emailId = caseLabel(caseId)
    return (
      <Link key={caseId} className="rq-item-email type-data-sm" to={`/emails/${encodeURIComponent(emailId)}`}>
        {emailId}
      </Link>
    )
  })
}

function ItemCell({ item }: { item: ReviewQueueItem }) {
  return (
    <td data-label="Item">
      <span className="rq-item">
        <span className="rq-item-head">
          {item.kind === 'case' ? (
            <Link className="rq-item-link" to={`/emails/${encodeURIComponent(item.email_id)}`}>
              {item.email_id}
            </Link>
          ) : (
            <span className="rq-item-id type-data-sm">{itemIdentifier(item)}</span>
          )}
          <span className="rq-kind" data-kind={item.kind}>
            {KIND_LABEL[item.kind]}
          </span>
        </span>
        <span className="rq-item-subject">{item.kind === 'case' ? item.evidence_summary : counterpart(item)}</span>
      </span>
    </td>
  )
}

export function ReviewQueueTable({
  items,
  selectedId,
  detailId,
  density = 'comfortable',
  onToggle,
  footer
}: ReviewQueueTableProps) {
  const openRow = useRowLink()
  return (
    <div className="rq-table-card">
      <div className="rq-table-scroll">
        <Scrollbar label="Review queue items">
          <table className="rq-table" data-density={density}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Reason or outcome</th>
                <th scope="col">Custody</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const selected = item.item_id === selectedId
                return (
                  <tr
                    key={item.item_id}
                    data-status={isHeld(item) ? 'held' : undefined}
                    data-selected={selected ? 'true' : undefined}
                    // A held case opens its email from anywhere on the row; an
                    // exception has no email to open.
                    onClick={item.kind === 'case' ? openRow(`/emails/${encodeURIComponent(item.email_id)}`) : undefined}
                  >
                    <ItemCell item={item} />
                    <td data-label="Reason or outcome">
                      <span className="rq-reason">{reasonLabel(item)}</span>
                    </td>
                    <td data-label="Custody">
                      <StatusPill status={custodyKind(item)}>{custodyLabel(item)}</StatusPill>
                    </td>
                    <td data-label="Actions">
                      <Button
                        variant="ghost"
                        aria-expanded={selected}
                        aria-controls={selected ? detailId : undefined}
                        aria-label={`Inspect ${itemName(item)}`}
                        onClick={() => onToggle(item)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Scrollbar>
      </div>
      {footer}
    </div>
  )
}
