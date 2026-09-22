import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderAt } from '../../../test/render'
import { PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECEIVED_CASES } from '../../reconciliation/fixtures/prepared'
import { reconcileShipments } from '../../reconciliation/reconcile'
import { exceptionItem, PREPARED_CASE_ITEMS } from '../fixtures/review_queue'
import type { ReconciliationExceptionQueueItem, ReviewQueueItem } from '../types'
import { ReviewQueueTable } from './ReviewQueueTable'

const exceptionItems: ReconciliationExceptionQueueItem[] = reconcileShipments(
  PREPARED_EXPECTED_SHIPMENTS,
  PREPARED_RECEIVED_CASES,
  'run_prepared_001',
  '2026-09-21T00:00:00Z'
).flatMap((result) => exceptionItem(result) ?? [])
const ITEMS: ReviewQueueItem[] = [...PREPARED_CASE_ITEMS, ...exceptionItems]

function renderTable({
  items = ITEMS,
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

function rowOf(name: string) {
  return screen.getByRole('button', { name: `Inspect ${name}` }).closest('tr')!
}

describe('ReviewQueueTable', () => {
  it('renders held cases and reconciliation exceptions in one semantic table', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(ITEMS.length + 1)
    expect(screen.getAllByText('Case')).toHaveLength(20)
    expect(screen.getAllByText('Exception')).toHaveLength(17)
  })

  it('has no owner column', () => {
    renderTable()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Item',
      'Reason or outcome',
      'Custody',
      'Actions'
    ])
  })

  it('leads a held case with its email and says why it is held', () => {
    renderTable()
    const row = rowOf('Case email_507')
    expect(within(row).getByRole('link', { name: 'email_507' })).toHaveAttribute('href', '/emails/email_507')
    expect(within(row).getByText('No draft Bill of Lading was attached')).toBeInTheDocument()
    expect(row.textContent).not.toContain('seed-case:')
  })

  it('leads an exception with its shipment and names the other side, or that it is missing', () => {
    renderTable()
    const documentMissing = rowOf('Exception SHP-5AKR-00230')
    expect(within(documentMissing).getByRole('link', { name: 'email_507' })).toHaveAttribute(
      'href',
      '/emails/email_507'
    )
    expect(within(rowOf('Exception SHP-5RFR-37631')).getByText('No case received')).toBeInTheDocument()
    expect(within(rowOf('Exception email_512')).getByText('No expected shipment')).toBeInTheDocument()
    expect(rowOf('Exception email_009')).toHaveTextContent('Candidates: SHP-I978820812-1, SHP-I978820812-2')
    expect(document.body.textContent).not.toMatch(/rec_/)
  })

  it('marks every open row held, with the pause glyph, never cleared', () => {
    renderTable()
    const heldRows = document.querySelectorAll('tr[data-status="held"]')
    expect(heldRows).toHaveLength(ITEMS.length)
    expect(screen.getAllByRole('img', { name: 'Held' })).toHaveLength(ITEMS.length)
    expect(screen.queryByRole('img', { name: 'Match' })).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument()
    expect(screen.getAllByText('Open')).toHaveLength(17)
  })

  it('shows the outcomes and the case review reasons in the same words', () => {
    renderTable()
    expect(screen.getByText('Missing case')).toBeInTheDocument()
    expect(screen.getAllByText('Document missing')).toHaveLength(12)
    expect(screen.getByText('Source stale')).toBeInTheDocument()
    expect(screen.getAllByText('Unmatched case')).toHaveLength(2)
    expect(screen.getByText('Duplicate or ambiguous')).toBeInTheDocument()
    for (const reason of ['Wrong doc type', 'Missing attachment', 'Unreadable', 'Missing value']) {
      expect(screen.getAllByText(reason)).toHaveLength(5)
    }
    expect(screen.queryByText('missing_attachment')).not.toBeInTheDocument()
  })

  it('discloses a row through an Inspect control wired to the detail region', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderTable({ onToggle, selectedId: 'rq_rec_shp_5rfr_37631' })

    const inspect = screen.getByRole('button', { name: 'Inspect Exception SHP-5RFR-37631' })
    expect(inspect).toHaveAttribute('aria-expanded', 'true')
    expect(inspect).toHaveAttribute('aria-controls', 'review-queue-detail')
    expect(inspect.closest('tr')).toHaveAttribute('data-selected', 'true')

    const other = screen.getByRole('button', { name: 'Inspect Case email_507' })
    expect(other).toHaveAttribute('aria-expanded', 'false')
    await user.click(other)
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'rq_seed-case:email_507' }))
  })

  it('shows resolved exceptions as settled instead of held', () => {
    const resolved: ReconciliationExceptionQueueItem = {
      ...exceptionItems.find((i) => i.reconciliation_id === 'rec_shp_5rfr_37631')!,
      assignment_state: 'RESOLVED'
    }
    renderTable({ items: [resolved] })
    const row = rowOf('Exception SHP-5RFR-37631')
    expect(row).not.toHaveAttribute('data-status', 'held')
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })
})
