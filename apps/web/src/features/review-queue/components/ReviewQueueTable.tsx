import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Controls'
import { Scrollbar, StatusPill } from '../../../components/ui/Domain'
import type { ReviewQueueItem } from '../types'
import { subjectLabel } from '../../../data/inbox-labels'
import { custodyKind, custodyLabel, isHeld, itemIdentifier, KIND_LABEL, reasonLabel } from './item-labels'
import './review-queue-table.css'

type ReviewQueueTableProps = {
  items: ReviewQueueItem[]
  selectedId: string | null
  detailId: string
  onToggle: (item: ReviewQueueItem) => void
}

function ItemCell({ item }: { item: ReviewQueueItem }) {
  return (
    <td data-label="Item">
      <span className="rq-item">
        <span className="rq-kind" data-kind={item.kind}>
          {KIND_LABEL[item.kind]}
        </span>
        <span className="rq-item-id type-data-sm">{itemIdentifier(item)}</span>
        {item.kind === 'case' ? (
          <Link className="rq-item-link type-data-xs" to={`/emails/${encodeURIComponent(item.email_id)}`}>
            {item.email_id}
          </Link>
        ) : (
          <span className="rq-item-subject type-data-xs">{subjectLabel(item.subject_key)}</span>
        )}
      </span>
    </td>
  )
}

export function ReviewQueueTable({ items, selectedId, detailId, onToggle }: ReviewQueueTableProps) {
  return (
    <div className="rq-table-scroll">
      <Scrollbar label="Review queue items">
        <table className="rq-table">
          <thead>
            <tr>
              <th scope="col" className="type-data-xs">
                Item
              </th>
              <th scope="col" className="type-data-xs">
                Reason or outcome
              </th>
              <th scope="col" className="type-data-xs">
                Custody
              </th>
              <th scope="col" className="type-data-xs">
                Assigned owner
              </th>
              <th scope="col" className="type-data-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const id = itemIdentifier(item)
              const selected = item.item_id === selectedId
              return (
                <tr
                  key={item.item_id}
                  data-status={isHeld(item) ? 'held' : undefined}
                  data-selected={selected ? 'true' : undefined}
                >
                  <ItemCell item={item} />
                  <td data-label="Reason or outcome">
                    <span className="rq-reason">{reasonLabel(item)}</span>
                  </td>
                  <td data-label="Custody">
                    <StatusPill status={custodyKind(item)}>{custodyLabel(item)}</StatusPill>
                  </td>
                  <td data-label="Assigned owner">
                    <span className="rq-owner">{item.assigned_owner}</span>
                  </td>
                  <td data-label="Actions">
                    <Button
                      variant="ghost"
                      aria-expanded={selected}
                      aria-controls={selected ? detailId : undefined}
                      aria-label={`Inspect ${id}`}
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
  )
}
