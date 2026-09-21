import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IngestItem, IngestItemState } from '../types'
import { BatchBayMap } from './BatchBayMap'

function item(id: string, state: IngestItemState): IngestItem {
  return {
    id,
    sender: 'ops@example.test',
    subject: 'Subject',
    documents: 0,
    expectedDocuments: null,
    state,
    category: null,
    outcome: null,
    reviewReason: null,
    confidence: null,
    failure: null
  }
}

const ITEMS = [item('e1', 'processed'), item('e2', 'processed'), item('e3', 'held'), item('e4', 'queued')]

describe('BatchBayMap', () => {
  it('draws one tile per email and summarises the batch for assistive technology', () => {
    const { container } = render(<BatchBayMap items={ITEMS} focus="all" />)
    const bay = screen.getByRole('img', {
      name: '4 emails: 2 processed, 1 held for review, 0 failed, 1 waiting'
    })
    expect(bay).toBeInTheDocument()
    const tiles = container.querySelectorAll('.batch-bay-tile')
    expect(tiles).toHaveLength(4)
    expect([...tiles].map((tile) => tile.getAttribute('data-state'))).toEqual([
      'processed',
      'processed',
      'held',
      'queued'
    ])
    expect(container.querySelector('.batch-bay-tile[data-dim]')).toBeNull()
  })

  it('dims every tile outside the chosen state', () => {
    const { container } = render(<BatchBayMap items={ITEMS} focus="held" />)
    expect(container.querySelectorAll('.batch-bay-tile[data-dim]')).toHaveLength(3)
    expect(container.querySelector('.batch-bay-tile[data-state="held"]')).not.toHaveAttribute('data-dim')
  })

  it('names each tile by its email id on hover', () => {
    const { container } = render(<BatchBayMap items={ITEMS} focus="all" />)
    expect(container.querySelector('.batch-bay-tile')).toHaveAttribute('title', 'e1')
  })
})
