import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ExpectedShipment, ReconciliationResult } from '../../domain/contracts'
import { ReconciliationView } from './ReconciliationView'
import { createPreparedReconciliationService, type ReconciliationService } from './seam'

function readyService(overrides?: Partial<ReconciliationService>): ReconciliationService {
  return { ...createPreparedReconciliationService(), ...overrides }
}

function emptyService(): ReconciliationService {
  return readyService({
    getExpectedShipments: async () => [],
    getReconciliationResults: async () => []
  })
}

function failingService(): ReconciliationService {
  return readyService({
    getExpectedShipments: async () => {
      throw new Error('prepared store unavailable')
    },
    getReconciliationResults: async () => []
  })
}

function pendingService(): ReconciliationService {
  const never = <T,>() => new Promise<T>(() => {})
  return readyService({
    getExpectedShipments: never<ExpectedShipment[]>,
    getReconciliationResults: never<ReconciliationResult[]>
  })
}

describe('ReconciliationView', () => {
  it('shows an honest loading state before data arrives', () => {
    render(<ReconciliationView service={pendingService()} />)
    expect(screen.getByRole('status', { name: /loading reconciliation/i })).toBeInTheDocument()
  })

  it('shows an honest error state when the service fails', async () => {
    render(<ReconciliationView service={failingService()} />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be loaded/i)
    expect(alert).toHaveTextContent('prepared store unavailable')
  })

  it('renders shipments, all six outcomes, the peak card, and the run id', async () => {
    render(<ReconciliationView service={readyService()} />)
    await screen.findByRole('region', { name: 'Expected shipments' })
    expect(screen.getByRole('region', { name: 'Reconciliation outcomes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'CSV import' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Missing case SYN-042' })).toBeInTheDocument()
    expect(screen.getAllByText('001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SYN-042').length).toBeGreaterThan(0)
  })

  it('shows honest empty states when the ledger is empty', async () => {
    render(<ReconciliationView service={emptyService()} />)
    expect(await screen.findByText(/No expected shipments loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/No reconciliation results/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Missing case/ })).toBeNull()
    expect(document.querySelectorAll('[data-status="match"]')).toHaveLength(0)
  })

  it('imports the prepared CSV and refreshes the run id on rerun', async () => {
    const user = userEvent.setup()
    render(<ReconciliationView service={readyService()} />)
    await screen.findByRole('region', { name: 'CSV import' })

    await user.click(screen.getByRole('button', { name: 'Load prepared CSV' }))
    expect(await screen.findByText(/6 rows imported/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rerun reconciliation' }))
    await waitFor(() => expect(screen.getAllByText('002').length).toBeGreaterThan(0))
  })

  it('escalates a missing case through the injectable callback', async () => {
    const user = userEvent.setup()
    const onEscalate = vi.fn()
    render(<ReconciliationView service={readyService()} onEscalateMissingCase={onEscalate} />)
    const card = await screen.findByRole('region', {
      name: 'Missing case SYN-042'
    })
    await user.click(within(card).getByRole('button', { name: 'Escalate missing case' }))
    expect(onEscalate).toHaveBeenCalledTimes(1)
    expect(onEscalate.mock.calls[0]?.[0]).toMatchObject({
      outcome: 'MISSING_CASE',
      shipment_id: 'SYN-042'
    })
    expect(await within(card).findByRole('status')).toHaveTextContent(/escalation requested/i)
  })

  it('renders at most one primary action', async () => {
    const { container } = render(<ReconciliationView service={readyService()} />)
    await screen.findByRole('region', { name: 'CSV import' })
    expect(container.querySelectorAll('.button--primary')).toHaveLength(1)
  })

  it('avoids em and en dashes in visible copy', async () => {
    const { container } = render(<ReconciliationView service={readyService()} />)
    await screen.findByRole('region', { name: 'CSV import' })
    expect(container.textContent).not.toMatch(/[–—]/)
  })
})
