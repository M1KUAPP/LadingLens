import { countStates } from '../seam'
import type { IngestItem, IngestItemState } from '../types'
import './batch-bay-map.css'

// The batch as a bay plan: one tile per email, filled by where it ended, the
// same motif as the upload page's waiting screen. It is a picture of the
// state tiles above it, so it is one image to assistive technology and the
// per-email detail stays in the table below.
export function BatchBayMap({ items, focus }: { items: IngestItem[]; focus: IngestItemState | 'all' }) {
  const counts = countStates(items)
  const label =
    `${counts.total} ${counts.total === 1 ? 'email' : 'emails'}: ${counts.processed} processed, ` +
    `${counts.held} held for review, ${counts.failed} failed, ${counts.queued} waiting`

  return (
    <div className="batch-bay" role="img" aria-label={label}>
      {items.map((entry, index) => (
        <span
          key={`${entry.id}-${index}`}
          className="batch-bay-tile"
          data-state={entry.state}
          data-dim={(focus !== 'all' && entry.state !== focus) || undefined}
          title={entry.id}
        />
      ))}
    </div>
  )
}
