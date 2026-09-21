import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ReconciliationPage } from './ReconciliationPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reconciliation']}>
      <Routes>
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/review" element={<p>Review queue page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ReconciliationPage', () => {
  it('opens on the missing case, the outcomes and the ledger', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Reconciliation' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Missing case SYN-042' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Reconciliation outcomes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Expected shipments' })).toBeInTheDocument()
  })

  it('takes an escalated missing case to the review queue', async () => {
    const user = userEvent.setup()
    renderPage()
    const card = await screen.findByRole('region', { name: 'Missing case SYN-042' })
    await user.click(within(card).getByRole('button', { name: 'Escalate missing case' }))
    expect(screen.getByText('Review queue page')).toBeInTheDocument()
  })
})
