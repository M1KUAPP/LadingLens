import { Link } from 'react-router-dom'
import { STATUS_LABEL } from '../data/inbox-labels'
import type { CaseStatus, InboxRow } from '../data/inbox-types'
import './inbox-bay.css'

const OUTCOMES: CaseStatus[] = ['OK', 'MISMATCH', 'NEEDS_REVIEW']

function byEmailId(a: InboxRow, b: InboxRow) {
  return a.email_id.localeCompare(b.email_id, undefined, { numeric: true })
}

// The inbox as a bay plan, the same motif as the upload page's waiting
// screen: one tile per email in ID order, filled by its outcome in the
// status pills' colours. Emails the table's filters leave out are dimmed, so
// the bay shows where the current rows sit in the whole intake. It is one
// image to assistive technology; the per-email detail stays in the table.
export function InboxBay({ rows, matching }: { rows: InboxRow[]; matching: ReadonlySet<string> }) {
  const ordered = [...rows].sort(byEmailId)
  const counts = Object.fromEntries(
    OUTCOMES.map((status) => [status, rows.filter((row) => row.outcome.status === status).length])
  ) as Record<CaseStatus, number>
  const narrowed = matching.size < rows.length
  const held = counts.NEEDS_REVIEW
  const summary = OUTCOMES.map((status) => `${counts[status]} ${STATUS_LABEL[status]}`).join(', ')
  const label =
    `${rows.length} ${rows.length === 1 ? 'email' : 'emails'}: ${summary}` +
    (narrowed ? `; ${matching.size} ${matching.size === 1 ? 'matches' : 'match'} the filters` : '')

  return (
    <section className="inbox-bay" aria-label="Intake bay">
      <div className="inbox-bay-head">
        <ul className="inbox-bay-legend" aria-label="Outcomes">
          {OUTCOMES.map((status) => (
            <li key={status} data-outcome={status}>
              <span className="inbox-bay-swatch" aria-hidden="true" />
              <span className="inbox-bay-count">{counts[status]}</span> {STATUS_LABEL[status]}
            </li>
          ))}
        </ul>
        {held > 0 ? (
          <Link className="inbox-bay-handoff" to="/review">
            {held} {held === 1 ? 'email is' : 'emails are'} waiting for a person. Open the review queue
          </Link>
        ) : null}
      </div>
      <div className="inbox-bay-grid" role="img" aria-label={label}>
        {ordered.map((row, index) => (
          <span
            key={`${row.email_id}-${index}`}
            className="inbox-bay-tile"
            data-outcome={row.outcome.status}
            data-dim={(narrowed && !matching.has(row.email_id)) || undefined}
            title={`${row.email_id} ${STATUS_LABEL[row.outcome.status]}`}
          />
        ))}
      </div>
    </section>
  )
}
