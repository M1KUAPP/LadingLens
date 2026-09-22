import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ExpectedShipment, ReconciliationResult } from '../../domain/contracts'
import { saveBlob } from '../../lib/download'
import { EXPECTED_SHIPMENTS_CSV } from './fixtures/prepared'
import { ReconciliationView } from './ReconciliationView'
import { createPreparedReconciliationService, type ReconciliationService } from './seam'
import type { ReceivedCase } from './types'

vi.mock('../../lib/download', () => ({ saveBlob: vi.fn() }))

function readyService(overrides?: Partial<ReconciliationService>): ReconciliationService {
  return { ...createPreparedReconciliationService(), ...overrides }
}

function emptyService(): ReconciliationService {
  return readyService({ getExpectedShipments: async () => [] })
}

function failingService(): ReconciliationService {
  return readyService({
    getExpectedShipments: async () => {
      throw new Error('prepared store unavailable')
    }
  })
}

function pendingService(): ReconciliationService {
  const never = <T,>() => new Promise<T>(() => {})
  return readyService({
    getExpectedShipments: never<ExpectedShipment[]>,
    getReceivedCases: never<ReceivedCase[]>,
    getReconciliationResults: never<ReconciliationResult[]>
  })
}

function renderView(props: Parameters<typeof ReconciliationView>[0]) {
  return render(
    <MemoryRouter>
      <ReconciliationView {...props} />
    </MemoryRouter>
  )
}

async function runFirst(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Run reconciliation' }))
  return screen.findByRole('region', { name: 'Reconciliation outcomes' })
}

describe('ReconciliationView', () => {
  it('shows an honest loading state before data arrives', () => {
    renderView({ service: pendingService() })
    expect(screen.getByRole('status', { name: /loading reconciliation/i })).toBeInTheDocument()
  })

  it('shows an honest error state when the service fails', async () => {
    renderView({ service: failingService() })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be loaded/i)
    expect(alert).toHaveTextContent('prepared store unavailable')
  })

  it('opens on the inputs with nothing reconciled yet', async () => {
    renderView({ service: readyService() })
    expect(await screen.findByRole('region', { name: 'Reconciliation inputs' })).toBeInTheDocument()
    expect(screen.getByText('Not reconciled yet')).toBeInTheDocument()
    expect(screen.getByText(/match the 220 expected shipments to the 220 received BL cases/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Reconciliation outcomes' })).toBeNull()
    expect(screen.queryByRole('region', { name: /Missing case/ })).toBeNull()
  })

  it('runs reconciliation into the outcomes, the missing case and the run id', async () => {
    const user = userEvent.setup()
    renderView({ service: readyService() })
    await runFirst(user)
    expect(screen.queryByText('Not reconciled yet')).toBeNull()
    expect(screen.getByRole('region', { name: 'Missing case SHP-5RFR-37631' })).toBeInTheDocument()
    expect(screen.getAllByText('001').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Rerun reconciliation' })).toBeInTheDocument()
  })

  it('says so when the ledger is empty, and invents no match', async () => {
    renderView({ service: emptyService() })
    expect(await screen.findByText('The ledger has no expected shipments.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Missing case/ })).toBeNull()
    expect(document.querySelectorAll('[data-status="match"]')).toHaveLength(0)
  })

  it('imports the prepared CSV back onto the inputs, then numbers each run', async () => {
    const user = userEvent.setup()
    renderView({ service: readyService() })
    await runFirst(user)

    await user.click(screen.getByRole('button', { name: 'Load prepared CSV' }))
    expect(await screen.findByText(/220 rows imported/)).toBeInTheDocument()
    // A new ledger makes the last run stale, so the outcomes wait for a run.
    expect(screen.getByText('Not reconciled yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }))
    await waitFor(() => expect(screen.getAllByText('002').length).toBeGreaterThan(0))
  })

  it('downloads the prepared CSV under its file name', async () => {
    const user = userEvent.setup()
    renderView({ service: readyService() })
    await screen.findByRole('region', { name: 'Reconciliation inputs' })

    await user.click(screen.getByRole('button', { name: 'Download prepared CSV' }))
    expect(saveBlob).toHaveBeenCalledTimes(1)
    const [blob, fileName] = vi.mocked(saveBlob).mock.calls[0]
    expect(fileName).toBe('expected_shipments.csv')
    expect(blob.type).toBe('text/csv')
    expect(await blob.text()).toBe(EXPECTED_SHIPMENTS_CSV)
  })

  it('escalates a missing case through the injectable callback', async () => {
    const user = userEvent.setup()
    const onEscalate = vi.fn()
    renderView({ service: readyService(), onEscalateMissingCase: onEscalate })
    await runFirst(user)
    const card = screen.getByRole('region', { name: 'Missing case SHP-5RFR-37631' })
    await user.click(within(card).getByRole('button', { name: 'Escalate missing case' }))
    expect(onEscalate).toHaveBeenCalledTimes(1)
    expect(onEscalate.mock.calls[0]?.[0]).toMatchObject({ outcome: 'MISSING_CASE', shipment_id: 'SHP-5RFR-37631' })
    expect(await within(card).findByRole('status')).toHaveTextContent(/escalation requested/i)
  })

  it('renders at most one primary action, before and after a run', async () => {
    const user = userEvent.setup()
    const { container } = renderView({ service: readyService() })
    await screen.findByRole('region', { name: 'Reconciliation inputs' })
    expect(container.querySelectorAll('.button--primary')).toHaveLength(1)
    await runFirst(user)
    expect(container.querySelectorAll('.button--primary')).toHaveLength(1)
  })

  it('avoids em and en dashes in visible copy', async () => {
    const user = userEvent.setup()
    const { container } = renderView({ service: readyService() })
    await screen.findByRole('region', { name: 'Reconciliation inputs' })
    expect(container.textContent).not.toMatch(/[–—]/)
    await runFirst(user)
    expect(container.textContent).not.toMatch(/[–—]/)
  })
})
