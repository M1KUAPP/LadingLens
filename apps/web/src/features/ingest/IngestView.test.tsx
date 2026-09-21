import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createIngestSource, type IngestSource } from './seam'
import { IngestView } from './IngestView'
import type { IngestBatch, IngestItem } from './types'

function item(partial: Partial<IngestItem> & Pick<IngestItem, 'id'>): IngestItem {
  return {
    sender: 'ops@shipper.example',
    subject: `Docs for ${partial.id}`,
    documents: 2,
    expectedDocuments: 2,
    state: 'processed',
    category: 'BL_COMPARISON',
    outcome: 'OK',
    reviewReason: null,
    confidence: null,
    failure: null,
    ...partial
  }
}

function batch(partial: Partial<IngestBatch> & Pick<IngestBatch, 'id' | 'items'>): IngestBatch {
  return { name: partial.id, note: null, ...partial }
}

function sourceWith(batches: IngestBatch[]): IngestSource {
  return {
    loadBatches: async () => batches,
    stageBundle: createIngestSource().stageBundle
  }
}

function renderView(source: IngestSource) {
  return render(
    <MemoryRouter>
      <IngestView source={source} />
    </MemoryRouter>
  )
}

describe('IngestView', () => {
  it('shows a loading status until batches arrive', () => {
    renderView({ loadBatches: () => new Promise(() => {}), stageBundle: createIngestSource().stageBundle })
    expect(screen.getByRole('status')).toHaveTextContent(/loading batches/i)
  })

  it('surfaces a load failure instead of a table', async () => {
    renderView({
      loadBatches: async () => {
        throw new Error('The prepared data could not be read.')
      },
      stageBundle: createIngestSource().stageBundle
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('The prepared data could not be read.')
  })

  it('shows a designed empty state when there are no batches', async () => {
    renderView(sourceWith([]))
    expect(await screen.findByText(/no batches yet/i)).toBeInTheDocument()
  })

  it('lists each batch as a selectable card with its size', async () => {
    renderView(sourceWith([batch({ id: 'b1', name: 'Prepared mail bundle', items: [item({ id: 'e1' })] })]))
    const card = await screen.findByRole('button', { name: /prepared mail bundle/i })
    expect(card).toHaveTextContent('1 email')
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports progress as a labelled count, not a bare percentage', async () => {
    const items = [
      item({ id: 'e1' }),
      item({ id: 'e2' }),
      item({ id: 'e3', state: 'held', outcome: 'NEEDS_REVIEW', reviewReason: 'unreadable' })
    ]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const bar = await screen.findByRole('progressbar', { name: /emails processed/i })
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '3')
    const text = document.querySelector('.batch-progress-text')
    expect(text).toHaveTextContent('2 of 3 processed')
    expect(text).toHaveTextContent('1 held for review')
  })

  it('groups a large batch into state tiles, not one tile per email', async () => {
    const items = Array.from({ length: 200 }, (_, index) => item({ id: `e${index}` }))
    const { container } = renderView(sourceWith([batch({ id: 'b1', items })]))
    await screen.findByRole('table')
    expect(container.querySelectorAll('.ingest-tile').length).toBeLessThanOrEqual(6)
    const tiles = within(screen.getByRole('group', { name: 'Show items by state' }))
    expect(tiles.getByRole('button', { name: /all items/i })).toHaveTextContent('200')
    expect(tiles.getByRole('button', { name: /processed/i })).toHaveTextContent('200')
    expect(tiles.getByRole('button', { name: /held for review/i })).toHaveTextContent('0')
    expect(tiles.getByRole('button', { name: /^failed/i })).toHaveTextContent('0')
    expect(tiles.getByRole('button', { name: /waiting/i })).toHaveTextContent('0')
  })

  it('labels each tile share as a share of the batch', async () => {
    const items = [item({ id: 'e1' }), item({ id: 'e2', state: 'held', reviewReason: 'unreadable' })]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const tiles = await screen.findByRole('group', { name: 'Show items by state' })
    const heldTile = within(tiles).getByRole('button', { name: /held for review/i })
    expect(heldTile).toHaveTextContent('50% of this batch')
  })

  it('drills a tile down to its item rows', async () => {
    const items = [
      item({ id: 'e1' }),
      item({ id: 'e2', state: 'held', outcome: 'NEEDS_REVIEW', reviewReason: 'missing_attachment' })
    ]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const tiles = await screen.findByRole('group', { name: 'Show items by state' })
    fireEvent.click(within(tiles).getByRole('button', { name: /held for review/i }))
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(2)
    expect(within(table).getByText('e2')).toBeInTheDocument()
    expect(within(table).queryByText('e1')).not.toBeInTheDocument()
    expect(within(table).getByText('missing_attachment')).toBeInTheDocument()
  })

  it('makes the review-queue handoff permanently visible while items are held', async () => {
    const items = [item({ id: 'e1', state: 'held', outcome: 'NEEDS_REVIEW', reviewReason: 'unreadable' })]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const link = await screen.findByRole('link', { name: /open the review queue/i })
    expect(link).toHaveAttribute('href', '/review')
  })

  it('gives each held row its own review-queue link', async () => {
    const items = [item({ id: 'e1', state: 'held', outcome: 'NEEDS_REVIEW', reviewReason: 'wrong_doc_type' })]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const tiles = await screen.findByRole('group', { name: 'Show items by state' })
    fireEvent.click(within(tiles).getByRole('button', { name: /held for review/i }))
    const links = screen.getAllByRole('link', { name: /review queue/i })
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links.every((link) => link.getAttribute('href') === '/review')).toBe(true)
  })

  it('shows a designed empty state for a state with no items', async () => {
    renderView(sourceWith([batch({ id: 'b1', items: [item({ id: 'e1' })] })]))
    const tiles = await screen.findByRole('group', { name: 'Show items by state' })
    fireEvent.click(within(tiles).getByRole('button', { name: /^failed/i }))
    expect(screen.getByText(/no failed items in this batch/i)).toBeInTheDocument()
  })

  it('shows failed rows with their failure text', async () => {
    const items = [item({ id: 'e1', state: 'failed', failure: 'The mailbox connection dropped.' })]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const tiles = await screen.findByRole('group', { name: 'Show items by state' })
    fireEvent.click(within(tiles).getByRole('button', { name: /^failed/i }))
    const table = screen.getByRole('table')
    expect(within(table).getByText('Failed')).toBeInTheDocument()
    expect(within(table).getByText('The mailbox connection dropped.')).toBeInTheDocument()
  })

  it('marks a row with no recorded probability as No score', async () => {
    renderView(sourceWith([batch({ id: 'b1', items: [item({ id: 'e1' })] })]))
    expect(await screen.findByText('No score')).toBeInTheDocument()
  })

  it('renders the probability gauge when a record carries one', async () => {
    const items = [item({ id: 'e1', state: 'held', outcome: 'NEEDS_REVIEW', confidence: 0.68 })]
    const { container } = renderView(sourceWith([batch({ id: 'b1', items })]))
    expect(await screen.findByRole('meter')).toHaveAttribute('aria-valuenow', '68')
    const gauge = container.querySelector('.confidence-gauge')
    expect(gauge).not.toBeNull()
    expect(within(gauge as HTMLElement).getByText('68%')).toBeInTheDocument()
    expect(within(gauge as HTMLElement).getByText('Needs a person')).toBeInTheDocument()
  })

  it('prints exact contract enum values in the table', async () => {
    const items = [
      item({ id: 'e1', state: 'held', outcome: 'NEEDS_REVIEW', reviewReason: 'missing_attachment' }),
      item({ id: 'e2', outcome: 'MISMATCH' }),
      item({ id: 'e3', outcome: 'NEEDS_REVIEW' })
    ]
    renderView(sourceWith([batch({ id: 'b1', items })]))
    await screen.findByRole('table')
    expect(screen.getByText('missing_attachment')).toBeInTheDocument()
    expect(screen.getByText('MISMATCH')).toBeInTheDocument()
    expect(screen.getByText('NEEDS_REVIEW')).toBeInTheDocument()
  })

  it('paginates long batches instead of rendering every row', async () => {
    const items = Array.from({ length: 120 }, (_, index) => item({ id: `e${index}` }))
    renderView(sourceWith([batch({ id: 'b1', items })]))
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(51)
    expect(screen.getByText(/1-50 of 120/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/51-100 of 120/)).toBeInTheDocument()
  })

  it('switches the panel when another batch card is selected', async () => {
    const batches = [
      batch({ id: 'b1', name: 'First bundle', items: [item({ id: 'e1' })] }),
      batch({ id: 'b2', name: 'Second bundle', items: [item({ id: 'x1', state: 'queued', outcome: null, category: null })] })
    ]
    renderView(sourceWith(batches))
    fireEvent.click(await screen.findByRole('button', { name: /second bundle/i }))
    expect(screen.getByRole('heading', { name: 'Second bundle' })).toBeInTheDocument()
    expect(screen.getByText('x1')).toBeInTheDocument()
    expect(screen.queryByText('e1')).not.toBeInTheDocument()
  })

  it('stages an uploaded bundle as a new batch of waiting items', async () => {
    const { container } = renderView(sourceWith([batch({ id: 'b1', name: 'Prepared mail bundle', items: [item({ id: 'e1' })] })]))
    await screen.findByRole('table')
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    const file = new File(
      [JSON.stringify({ emails: [{ email_id: 'u1', from: 'a@b.example', subject: 'SI docs', attachments: ['si.txt'] }] })],
      'bundle.json',
      { type: 'application/json' }
    )
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })
    const staged = await screen.findByText(/1 email found/i)
    expect(staged).toHaveTextContent('bundle.json')
    fireEvent.click(screen.getByRole('button', { name: /add batch/i }))
    const card = await screen.findByRole('button', { name: /bundle\.json/i })
    expect(card).toHaveAttribute('aria-pressed', 'true')
    const waitingTile = container.querySelector('.ingest-tile[data-state="queued"]')
    expect(waitingTile).not.toBeNull()
    expect(waitingTile).toHaveTextContent('1')
    expect(screen.getByText('u1')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Waiting')).toBeInTheDocument()
  })

  it('reports an unreadable bundle without adding a batch', async () => {
    const { container } = renderView(sourceWith([batch({ id: 'b1', items: [item({ id: 'e1' })] })]))
    await screen.findByRole('table')
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    const file = new File(['plain text'], 'notes.json', { type: 'application/json' })
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/not readable JSON/)
    expect(screen.queryByRole('button', { name: /notes\.json/i })).not.toBeInTheDocument()
  })

  it('keeps the upload as the only primary action', async () => {
    renderView(sourceWith([batch({ id: 'b1', items: [item({ id: 'e1' })] })]))
    await screen.findByRole('table')
    const primary = document.querySelectorAll('.button--primary, [data-variant="primary"]')
    expect(primary.length).toBeLessThanOrEqual(1)
  })
})
