import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixtureInboxSource } from '../data/inbox-source'
import type { InboxDataset, InboxSource } from '../data/inbox-types'
import { InboxBoard, InboxPage } from './InboxPage'

const pendingSource: InboxSource = { load: () => new Promise(() => {}) }
const brokenSource: InboxSource = {
  load: () =>
    Promise.resolve({
      kind: 'error',
      problems: ['email_520 is missing from the prepared fixture.']
    })
}

function renderInbox(source: InboxSource = fixtureInboxSource) {
  return render(
    <MemoryRouter>
      <InboxPage source={source} />
    </MemoryRouter>
  )
}

describe('InboxPage states', () => {
  it('shows a neutral loading shell without any verdict pill', () => {
    renderInbox(pendingSource)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('[data-status]')).toBeNull()
    expect(document.querySelector('.inbox-accounting')).toBeNull()
  })

  it('renders the accounting summary and artifact link only when complete', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent('520 received / 520 accounted for / 0 lost')
    const cells = document.querySelectorAll('.inbox-accounting .inbox-metric')
    expect(Array.from(cells, (cell) => cell.textContent)).toEqual(['520 received', '520 accounted for', '0 lost'])
    const link = screen.getByRole('link', {
      name: /Download sample submission template/
    })
    expect(link).toHaveAttribute('download', 'sample_submission.json')
    expect(link.getAttribute('href')).toContain('sample-submission.json')
    expect(screen.getByText('Prepared data')).toBeInTheDocument()
  })

  it('hides the summary and artifact link on an integrity error', async () => {
    renderInbox(brokenSource)
    await screen.findByRole('alert')
    expect(screen.getByText('email_520 is missing from the prepared fixture.')).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toBeNull()
    expect(screen.queryByRole('link', { name: /Download sample submission template/ })).not.toBeInTheDocument()
  })
})

describe('InboxPage controls', () => {
  it('pages from email_001 through email_520 with a visible range', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    expect(screen.queryByRole('link', { name: 'email_520' })).not.toBeInTheDocument()
    expect(screen.getByText('1-50 of 520')).toBeInTheDocument()
    for (let page = 1; page < 11; page += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }))
    }
    expect(await screen.findByRole('link', { name: 'email_520' })).toBeInTheDocument()
    expect(screen.getByText('501-520 of 520')).toBeInTheDocument()
  })

  it('bounds the four columns and labels each cell for the stacked layout', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    const cols = document.querySelectorAll('.inbox-table colgroup col')
    expect(cols).toHaveLength(4)
    const labels = ['ID', 'Subject', 'Category', 'Status']
    const cells = document.querySelectorAll('.inbox-table tbody tr:first-child td')
    expect(cells).toHaveLength(4)
    cells.forEach((cell, index) => {
      expect(cell).toHaveAttribute('data-label', labels[index])
    })
  })

  it('narrows the row set by ID search', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'email_512')
    expect(await screen.findByRole('link', { name: 'email_512' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'email_001' })).not.toBeInTheDocument()
  })

  it('filters by status and marks held rows on the held channel', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'NEEDS_REVIEW' }))
    expect(await screen.findByRole('link', { name: 'email_507' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /email_\d{3}/ })).toHaveLength(17)
    expect(document.querySelectorAll('.category-badge[data-channel="held"]')).toHaveLength(17)
    const table = document.querySelector('.inbox-table') as HTMLElement
    expect(within(table).getAllByText('NEEDS_REVIEW')).toHaveLength(17)
    expect(within(table).getAllByText('missing_attachment')).toHaveLength(5)
  })

  it('keeps routed rows on the neutral badge channel', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    const badges = document.querySelectorAll('.category-badge[data-channel="routed"]')
    expect(badges.length).toBeGreaterThan(0)
    expect(document.querySelector('[data-channel="held"]')).toBeNull()
  })

  it('sorts the row set by ID in both directions', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID descending' }))
    expect(await screen.findByRole('link', { name: 'email_520' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'email_001' })).not.toBeInTheDocument()
  })

  it('switches row density', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Density/ }))
    await user.click(screen.getByRole('option', { name: 'Compact' }))
    expect(document.querySelector('.inbox-table')).toHaveAttribute('data-density', 'compact')
  })

  it('shows an honest empty state when filters match nothing', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'zzz')
    expect(await screen.findByText('No emails match the current filters.')).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent('520 received / 520 accounted for / 0 lost')
  })

  it('visibly moves back with one Previous click after total pages shrink', async () => {
    const user = userEvent.setup()
    const fullRows = Array.from({ length: 520 }, (_, index) => ({
      email_id: `email_${String(index + 1).padStart(3, '0')}`,
      sender: 'user@example.com',
      subject: `Test subject ${index + 1}`,
      attachments: [],
      outcome: { category: 'GENERAL' as const, status: 'OK' as const, review_reason: null }
    }))
    const fullDataset: InboxDataset = {
      source: 'prepared-fixture',
      receivedCount: 520,
      rows: fullRows,
      artifact: {},
      artifactUrl: '/sample-submission.json',
      reconciliation: []
    }
    const smallDataset: InboxDataset = {
      source: 'prepared-fixture',
      receivedCount: 60,
      rows: fullRows.slice(0, 60),
      artifact: {},
      artifactUrl: '/sample-submission.json',
      reconciliation: []
    }

    const { rerender } = render(
      <MemoryRouter>
        <InboxBoard dataset={fullDataset} />
      </MemoryRouter>
    )

    for (let i = 1; i < 11; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }))
    }
    expect(screen.getByText('501-520 of 520')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <InboxBoard dataset={smallDataset} />
      </MemoryRouter>
    )
    expect(screen.getByText('51-60 of 60')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('1-50 of 60')).toBeInTheDocument()
  })

  it('sorts numerically using localeCompare rather than slicing an assumed prefix', async () => {
    const customSource: InboxSource = {
      load: () =>
        Promise.resolve({
          kind: 'ready',
          dataset: {
            source: 'prepared-fixture',
            receivedCount: 3,
            rows: [
              {
                email_id: 'custom_id_10',
                sender: 'user@example.com',
                subject: 'Subject 10',
                attachments: [],
                outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
              },
              {
                email_id: 'custom_id_2',
                sender: 'user@example.com',
                subject: 'Subject 2',
                attachments: [],
                outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
              },
              {
                email_id: 'custom_id_1',
                sender: 'user@example.com',
                subject: 'Subject 1',
                attachments: [],
                outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
              }
            ],
            artifact: {},
            artifactUrl: '/sample-submission.json',
            reconciliation: []
          }
        })
    }

    render(
      <MemoryRouter>
        <InboxPage source={customSource} />
      </MemoryRouter>
    )
    await screen.findByRole('link', { name: 'custom_id_1' })
    const rows = document.querySelectorAll('.inbox-table tbody tr')
    expect(rows[0]).toHaveTextContent('custom_id_1')
    expect(rows[1]).toHaveTextContent('custom_id_2')
    expect(rows[2]).toHaveTextContent('custom_id_10')
  })

  it('URL-encodes the email ID link segment', async () => {
    const specialSource: InboxSource = {
      load: () =>
        Promise.resolve({
          kind: 'ready',
          dataset: {
            source: 'prepared-fixture',
            receivedCount: 1,
            rows: [
              {
                email_id: 'case/special#1',
                sender: 'user@example.com',
                subject: 'Subject with special chars',
                attachments: [],
                outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
              }
            ],
            artifact: {},
            artifactUrl: '/sample-submission.json',
            reconciliation: []
          }
        })
    }

    render(
      <MemoryRouter>
        <InboxPage source={specialSource} />
      </MemoryRouter>
    )
    const link = await screen.findByRole('link', { name: 'case/special#1' })
    expect(link).toHaveAttribute('href', '/emails/case%2Fspecial%231')
  })
})

describe('inbox page css contract', () => {
  const css = readFileSync(join(process.cwd(), 'src/pages/inbox-page.css'), 'utf8')
  const tsx = readFileSync(join(process.cwd(), 'src/pages/InboxPage.tsx'), 'utf8')

  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).not.toMatch(/\bhsla?\(/)
  })

  it('routes motion through the duration tokens and rings focus with the focus token', () => {
    const motion = css.match(/(transition|animation)[^;{}]*;/g) ?? []
    expect(motion.length).toBeGreaterThan(0)
    for (const rule of motion) expect(rule).toMatch(/var\(--duration-/)
    const focusBlocks = css.match(/[^{}]*:focus-visible\s*\{[^}]*\}/g) ?? []
    expect(focusBlocks.length).toBeGreaterThan(0)
    for (const block of focusBlocks) expect(block).toMatch(/box-shadow:\s*var\(--focus-ring\)/)
  })

  it('keeps errors off the verdict palette', () => {
    const errorBlocks = css.match(/[^{}]*error[^{}]*\{[^}]*\}/g) ?? []
    expect(errorBlocks.length).toBeGreaterThan(0)
    for (const block of errorBlocks) expect(block).not.toMatch(/--state-/)
  })

  it('restacks the table below the app breakpoint', () => {
    expect(css).toMatch(/@media \(max-width: 959px\)/)
    expect(css).toMatch(/attr\(data-label\)/)
  })

  it('keeps visible copy free of em and en dashes', () => {
    expect(tsx).not.toMatch(/[—–]/)
  })
})
