import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { CaseStatus, InboxRow } from '../data/inbox-types'
import { InboxBay } from './InboxBay'

function row(id: string, status: CaseStatus): InboxRow {
  return {
    email_id: id,
    sender: 'ops@shipper.example',
    subject: `Docs for ${id}`,
    attachments: [],
    outcome: { category: 'BL_COMPARISON', status, review_reason: status === 'NEEDS_REVIEW' ? 'unreadable' : null }
  }
}

const ROWS = [row('email_2', 'OK'), row('email_1', 'MISMATCH'), row('email_10', 'NEEDS_REVIEW'), row('email_3', 'OK')]

function renderBay(matching: string[] = ROWS.map((entry) => entry.email_id)) {
  return render(
    <MemoryRouter>
      <InboxBay rows={ROWS} matching={new Set(matching)} />
    </MemoryRouter>
  )
}

describe('InboxBay', () => {
  it('draws one tile per email in ID order, coloured by outcome', () => {
    const { container } = renderBay()
    const tiles = [...container.querySelectorAll('.inbox-bay-tile')]
    expect(tiles.map((tile) => tile.getAttribute('title'))).toEqual([
      'email_1 MISMATCH',
      'email_2 OK',
      'email_3 OK',
      'email_10 NEEDS_REVIEW'
    ])
    expect(tiles.map((tile) => tile.getAttribute('data-outcome'))).toEqual(['MISMATCH', 'OK', 'OK', 'NEEDS_REVIEW'])
    expect(container.querySelector('.inbox-bay-tile[data-dim]')).toBeNull()
  })

  it('summarises the bay for assistive technology', () => {
    renderBay()
    expect(screen.getByRole('img', { name: '4 emails: 2 OK, 1 MISMATCH, 1 NEEDS_REVIEW' })).toBeInTheDocument()
  })

  it('dims the emails the table filters out and says how many match', () => {
    const { container } = renderBay(['email_10'])
    expect(container.querySelectorAll('.inbox-bay-tile[data-dim]')).toHaveLength(3)
    expect(
      screen.getByRole('img', { name: '4 emails: 2 OK, 1 MISMATCH, 1 NEEDS_REVIEW; 1 matches the filters' })
    ).toBeInTheDocument()
  })

  it('hands the held emails to the review queue', () => {
    renderBay()
    expect(
      screen.getByRole('link', { name: '1 email is waiting for a person. Open the review queue' })
    ).toHaveAttribute('href', '/review')
  })

  it('counts each outcome in its legend', () => {
    renderBay()
    const legend = screen.getByRole('list', { name: 'Outcomes' })
    expect(legend).toHaveTextContent('2 OK')
    expect(legend).toHaveTextContent('1 MISMATCH')
    expect(legend).toHaveTextContent('1 NEEDS_REVIEW')
  })
})
