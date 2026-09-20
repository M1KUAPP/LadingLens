import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixtureInboxSource } from '../data/inbox-source'
import type { InboxSource } from '../data/inbox-types'
import { InboxPage } from './InboxPage'

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
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent(
      '520 received / 520 accounted for / 0 lost'
    )
    const link = screen.getByRole('link', {
      name: /Download submission JSON/
    })
    expect(link).toHaveAttribute('download', 'sample_submission.json')
    expect(link.getAttribute('href')).toContain('sample-submission.json')
    expect(screen.getByText('Prepared fixture')).toBeInTheDocument()
  })

  it('hides the summary and artifact link on an integrity error', async () => {
    renderInbox(brokenSource)
    await screen.findByRole('alert')
    expect(
      screen.getByText('email_520 is missing from the prepared fixture.')
    ).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Download submission JSON/ })
    ).not.toBeInTheDocument()
  })
})

describe('InboxPage controls', () => {
  it('pages from email_001 through email_520 with a visible range', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    expect(
      screen.queryByRole('link', { name: 'email_520' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('1-50 of 520')).toBeInTheDocument()
    for (let page = 1; page < 11; page += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }))
    }
    expect(
      await screen.findByRole('link', { name: 'email_520' })
    ).toBeInTheDocument()
    expect(screen.getByText('501-520 of 520')).toBeInTheDocument()
  })

  it('narrows the row set by ID search', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Search by ID' }),
      'email_512'
    )
    expect(
      await screen.findByRole('link', { name: 'email_512' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'email_001' })
    ).not.toBeInTheDocument()
  })

  it('filters by status and marks held rows on the held channel', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Needs review' }))
    expect(
      await screen.findByRole('link', { name: 'email_507' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /email_\d{3}/ })).toHaveLength(8)
    expect(
      document.querySelectorAll('.category-badge[data-channel="held"]')
    ).toHaveLength(8)
    const table = document.querySelector('.inbox-table') as HTMLElement
    expect(within(table).getAllByText('Needs review')).toHaveLength(8)
    expect(within(table).getAllByText('Missing attachment')).toHaveLength(2)
  })

  it('keeps routed rows on the neutral badge channel', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    const badges = document.querySelectorAll(
      '.category-badge[data-channel="routed"]'
    )
    expect(badges.length).toBeGreaterThan(0)
    expect(document.querySelector('[data-channel="held"]')).toBeNull()
  })

  it('sorts the row set by ID in both directions', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID descending' }))
    expect(
      await screen.findByRole('link', { name: 'email_520' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'email_001' })
    ).not.toBeInTheDocument()
  })

  it('switches row density', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Density/ }))
    await user.click(screen.getByRole('option', { name: 'Compact' }))
    expect(document.querySelector('.inbox-table')).toHaveAttribute(
      'data-density',
      'compact'
    )
  })

  it('shows an honest empty state when filters match nothing', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Search by ID' }),
      'zzz'
    )
    expect(
      await screen.findByText('No emails match the current filters.')
    ).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent(
      '520 received / 520 accounted for / 0 lost'
    )
  })
})
