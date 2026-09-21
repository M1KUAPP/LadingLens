import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ReviewPage } from './ReviewPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/review']}>
      <ReviewPage />
    </MemoryRouter>
  )
}

describe('ReviewPage', () => {
  it('opens on the review queue with no tabs', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Review queue' })).toBeInTheDocument()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('leaves the reconciliation ledger to its own page', async () => {
    renderPage()
    await screen.findByRole('table')
    expect(screen.queryByRole('region', { name: 'Reconciliation outcomes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Missing case SYN-042' })).not.toBeInTheDocument()
  })
})
