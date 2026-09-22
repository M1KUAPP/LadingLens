import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultReconciliationService } from '../features/reconciliation/seam'
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
  // The page runs on the shared prepared service; each test starts unreconciled.
  beforeEach(() => defaultReconciliationService.reset())

  it('opens on the inputs, with the outcomes waiting for a run', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Reconciliation' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Reconciliation inputs' })).toBeInTheDocument()
    expect(screen.getByText('Not reconciled yet')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Reconciliation outcomes' })).toBeNull()
  })

  it('takes an escalated missing case to the review queue', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Run reconciliation' }))
    const card = await screen.findByRole('region', { name: 'Missing case SHP-5RFR-37631' })
    await user.click(within(card).getByRole('button', { name: 'Escalate missing case' }))
    expect(screen.getByText('Review queue page')).toBeInTheDocument()
  })
})
