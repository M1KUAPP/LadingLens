import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderAt } from '../../../test/render'
import { PREPARED_REVIEW_QUEUE_ITEMS } from '../fixtures/review_queue'
import type { ReconciliationExceptionQueueItem, ReviewQueueItem } from '../types'
import { ownerLabel } from './item-labels'
import { ReviewQueueTable } from './ReviewQueueTable'

const caseItems = PREPARED_REVIEW_QUEUE_ITEMS.filter((item) => item.kind === 'case')
const exceptionItems = PREPARED_REVIEW_QUEUE_ITEMS.filter(
  (item) => item.kind === 'reconciliation_exception'
) as ReconciliationExceptionQueueItem[]

function renderTable({
  items = PREPARED_REVIEW_QUEUE_ITEMS,
  selectedId = null,
  onToggle = vi.fn()
}: {
  items?: ReviewQueueItem[]
  selectedId?: string | null
  onToggle?: (item: ReviewQueueItem) => void
} = {}) {
  return renderAt(
    '/review',
    <ReviewQueueTable items={items} selectedId={selectedId} detailId="review-queue-detail" onToggle={onToggle} />
  )
}

describe('ReviewQueueTable', () => {
  it('renders case and reconciliation exception targets in one semantic table', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(PREPARED_REVIEW_QUEUE_ITEMS.length + 1)
    expect(screen.getByText('seed-case:email_507')).toBeInTheDocument()
    expect(screen.getByText('rec_syn_042')).toBeInTheDocument()
    expect(screen.getAllByText('Case').length).toBe(caseItems.length)
    expect(screen.getAllByText('Exception').length).toBe(exceptionItems.length)
  })

  it('keeps a permanent assigned owner column for every target kind', () => {
    renderTable()
    expect(screen.getByRole('columnheader', { name: 'Assigned owner' })).toBeInTheDocument()
    const rendered = document.body.textContent ?? ''
    for (const item of PREPARED_REVIEW_QUEUE_ITEMS) {
      expect(rendered).toContain(ownerLabel(item))
    }
  })

  it('shows the demo account as unassigned, never as an owner', () => {
    renderTable()
    expect(screen.queryByText('docs-demo')).not.toBeInTheDocument()
    expect(screen.getAllByText('Unassigned').length).toBe(
      PREPARED_REVIEW_QUEUE_ITEMS.filter((item) => item.assigned_owner === 'docs-demo').length
    )
  })

  it('marks every held row held, with the pause glyph, never cleared', () => {
    renderTable()
    const heldRows = document.querySelectorAll('tr[data-status="held"]')
    expect(heldRows).toHaveLength(PREPARED_REVIEW_QUEUE_ITEMS.length)
    expect(screen.getAllByRole('img', { name: 'Held' })).toHaveLength(PREPARED_REVIEW_QUEUE_ITEMS.length)
    // Nothing in the prepared queue is settled, so no row may look cleared.
    expect(screen.queryByRole('img', { name: 'Match' })).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
  })

  it('deep-links each prepared case item to its real email detail route', () => {
    renderTable()
    for (const item of caseItems) {
      if (item.kind !== 'case') continue
      const link = screen.getByRole('link', { name: item.email_id })
      expect(link).toHaveAttribute('href', `/emails/${encodeURIComponent(item.email_id)}`)
    }
  })

  it('shows the outcome and subject context for exception rows', () => {
    renderTable()
    expect(screen.getAllByText('Missing case').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Document missing')).toBeInTheDocument()
    expect(screen.getByText('Source stale')).toBeInTheDocument()
    expect(screen.getAllByText('Unmatched case').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Duplicate or ambiguous')).toBeInTheDocument()
    expect(screen.getByText('Shipment SYN-042')).toBeInTheDocument()
  })

  it('renders case review reasons in the same words as the outcomes', () => {
    renderTable()
    expect(screen.getByText('Missing attachment')).toBeInTheDocument()
    expect(screen.getByText('Unreadable')).toBeInTheDocument()
    expect(screen.getByText('Missing value')).toBeInTheDocument()
    expect(screen.getByText('Semantic ambiguity')).toBeInTheDocument()
    expect(screen.queryByText('missing_attachment')).not.toBeInTheDocument()
  })

  it('discloses a row through an Inspect control wired to the detail region', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderTable({ onToggle, selectedId: 'rq_rec_syn_042' })

    const inspect = screen.getByRole('button', {
      name: 'Inspect rec_syn_042'
    })
    expect(inspect).toHaveAttribute('aria-expanded', 'true')
    expect(inspect).toHaveAttribute('aria-controls', 'review-queue-detail')
    const row = inspect.closest('tr')
    expect(row).toHaveAttribute('data-selected', 'true')

    const other = screen.getByRole('button', { name: 'Inspect seed-case:email_507' })
    expect(other).toHaveAttribute('aria-expanded', 'false')
    await user.click(other)
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'rq_seed-case:email_507' }))
  })

  it('shows resolved exceptions as settled instead of held', () => {
    const resolved: ReconciliationExceptionQueueItem = {
      ...exceptionItems.find((i) => i.reconciliation_id === 'rec_syn_042')!,
      assignment_state: 'RESOLVED'
    }
    renderTable({ items: [resolved] })
    const row = screen.getByRole('button', { name: 'Inspect rec_syn_042' }).closest('tr')
    expect(row).not.toHaveAttribute('data-status', 'held')
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })
})
