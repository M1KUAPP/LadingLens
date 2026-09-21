import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ReviewPage } from './ReviewPage'

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location-search">{location.search}</span>
}

function renderPage(entry = '/review') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <ReviewPage />
    </MemoryRouter>
  )
}

function queueTab() {
  return screen.getByRole('tab', { name: /review queue/i })
}

function reconciliationTab() {
  return screen.getByRole('tab', { name: /reconciliation/i })
}

describe('ReviewPage', () => {
  it('defaults to the review queue tab when the search param is missing', async () => {
    renderPage('/review')
    expect(queueTab()).toHaveAttribute('aria-selected', 'true')
    expect(reconciliationTab()).toHaveAttribute('aria-selected', 'false')
    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Reconciliation outcomes' })).not.toBeInTheDocument()
  })

  it.each(['/review?tab=bogus', '/review?tab='])(
    'defaults to the review queue tab for invalid param %s',
    async (entry) => {
      renderPage(entry)
      expect(queueTab()).toHaveAttribute('aria-selected', 'true')
      expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    }
  )

  it('opens the reconciliation tab from a ?tab=reconciliation deep link', async () => {
    renderPage('/review?tab=reconciliation')
    expect(reconciliationTab()).toHaveAttribute('aria-selected', 'true')
    expect(queueTab()).toHaveAttribute('aria-selected', 'false')
    expect(await screen.findByRole('region', { name: 'Reconciliation outcomes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Missing case SYN-042' })).toBeInTheDocument()
  })

  it('switches tabs and syncs the search param', async () => {
    const user = userEvent.setup()
    renderPage('/review')
    await screen.findByRole('heading', { name: 'Review queue' })

    await user.click(reconciliationTab())
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=reconciliation')
    expect(await screen.findByRole('region', { name: 'Reconciliation outcomes' })).toBeInTheDocument()

    await user.click(queueTab())
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=queue')
    expect(queueTab()).toHaveAttribute('aria-selected', 'true')
  })

  it('shows live item counts in the tab labels', async () => {
    renderPage('/review')
    expect(await screen.findByRole('tab', { name: 'Review queue (133)' })).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Reconciliation (130)' })).toBeInTheDocument()
  })

  it('moves between tabs with arrow keys', async () => {
    const user = userEvent.setup()
    renderPage('/review')
    await screen.findByRole('heading', { name: 'Review queue' })

    queueTab().focus()
    await user.keyboard('{ArrowRight}')
    expect(reconciliationTab()).toHaveFocus()
    expect(reconciliationTab()).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(queueTab()).toHaveFocus()
    expect(queueTab()).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to the queue tab when the missing-case peak is escalated', async () => {
    const user = userEvent.setup()
    renderPage('/review?tab=reconciliation')
    const card = await screen.findByRole('region', {
      name: 'Missing case SYN-042'
    })
    await user.click(within(card).getByRole('button', { name: 'Escalate missing case' }))
    expect(queueTab()).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=queue')
    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
  })
})
