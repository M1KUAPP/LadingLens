import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CsvImportResult } from '../types'
import { EXPECTED_SHIPMENTS_CSV, PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECEIVED_CASES } from '../fixtures/prepared'
import { ReconciliationInputs } from './ReconciliationInputs'

function renderInputs(overrides?: Partial<Parameters<typeof ReconciliationInputs>[0]>) {
  const props = {
    shipments: PREPARED_EXPECTED_SHIPMENTS,
    cases: PREPARED_RECEIVED_CASES,
    importResult: null as CsvImportResult | null,
    busy: false,
    onRun: vi.fn(),
    onImportCsv: vi.fn(),
    onDownloadPrepared: vi.fn(),
    onLoadPrepared: vi.fn(),
    ...overrides
  }
  const utils = render(
    <MemoryRouter>
      <ReconciliationInputs {...props} />
    </MemoryRouter>
  )
  return { props, ...utils }
}

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).toBeInTheDocument()
  return input!
}

function tableRows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
}

describe('ReconciliationInputs', () => {
  it('opens on the expected-shipment ledger, with both inputs counted', () => {
    renderInputs()
    const ledger = screen.getByRole('button', { name: /^Expected shipments/ })
    expect(ledger).toHaveAttribute('aria-pressed', 'true')
    expect(ledger).toHaveTextContent('220')
    expect(screen.getByRole('button', { name: /^Received BL cases/ })).toHaveTextContent('220')
    expect(screen.getByText('1-50 of 220')).toBeInTheDocument()
    const first = within(tableRows()[0])
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(first).toEqual([
      'SHP-5RSG-00133',
      'MSDUL0942518196',
      '5RSG-00133',
      'MEDUUD104332',
      'BL check required',
      'Current'
    ])
  })

  it('switches to the received BL cases, each linking to its email', async () => {
    const user = userEvent.setup()
    renderInputs()
    await user.click(screen.getByRole('button', { name: /^Received BL cases/ }))
    expect(screen.getByRole('button', { name: /^Received BL cases/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'email_001' })).toHaveAttribute('href', '/emails/email_001')
    expect(within(tableRows()[0]).getByText('SI, Draft BL')).toBeInTheDocument()
  })

  it('searches the shown input by any number it names', async () => {
    const user = userEvent.setup()
    renderInputs()
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'SIJ1051834')
    expect(tableRows()).toHaveLength(1)
    // The overdue SI request's shipment names no booking.
    expect(within(tableRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('None')

    await user.clear(screen.getByRole('searchbox', { name: 'Search by ID' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'nothing-like-this')
    expect(screen.getByText('No rows match the search.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('offers Run reconciliation before a run, and Rerun with the run id after one', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderInputs()
    expect(screen.queryByText(/Latest run/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }))
    expect(props.onRun).toHaveBeenCalledTimes(1)
    unmount()

    renderInputs({ runId: 'run_prepared_002' })
    expect(screen.getByText('002')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rerun reconciliation' })).toBeInTheDocument()
  })

  it('keeps the run as the only primary action', () => {
    const { container } = renderInputs()
    expect(container.querySelectorAll('.button--primary')).toHaveLength(1)
  })

  it('exposes the shared drop zone and no other native file input', () => {
    const { container } = renderInputs()
    expect(screen.getByRole('button', { name: 'Import expected shipments CSV' })).toBeInTheDocument()
    const inputs = container.querySelectorAll('input[type="file"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.closest('.drop-zone')).toBeInTheDocument()
  })

  it('rejects a non-CSV file inline without calling the importer', () => {
    const { props, container } = renderInputs()
    const file = new File(['not a csv'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(fileInput(container), { target: { files: [file] } })
    expect(screen.getByText(/not an accepted format/i)).toBeInTheDocument()
    expect(props.onImportCsv).not.toHaveBeenCalled()
  })

  it('imports a dropped CSV through the seam callback', async () => {
    const { props, container } = renderInputs()
    const file = new File([EXPECTED_SHIPMENTS_CSV], 'expected_shipments.csv', { type: 'text/csv' })
    fireEvent.change(fileInput(container), { target: { files: [file] } })
    await waitFor(() => expect(props.onImportCsv).toHaveBeenCalledWith(EXPECTED_SHIPMENTS_CSV))
  })

  it('loads the prepared CSV through its own control', async () => {
    const user = userEvent.setup()
    const { props } = renderInputs()
    await user.click(screen.getByRole('button', { name: 'Load prepared CSV' }))
    expect(props.onLoadPrepared).toHaveBeenCalledTimes(1)
  })

  it('reports the valid row count after a clean import', () => {
    renderInputs({ importResult: { importedCount: 9, errors: [] } })
    expect(screen.getByRole('status')).toHaveTextContent('9 rows imported')
  })

  it('lists tokenized validation errors inline', () => {
    const { container } = renderInputs({
      importResult: {
        importedCount: 0,
        errors: [
          { row: 2, column: 'source_freshness', message: 'source_freshness must be CURRENT or STALE' },
          { row: 4, message: 'Expected 10 columns, found 5' }
        ]
      }
    })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('recon-inputs-errors')
    expect(within(alert).getByText(/Row 2/)).toBeInTheDocument()
    expect(alert.textContent).toContain('source_freshness must be CURRENT or STALE')
    expect(alert.textContent).toContain('Expected 10 columns, found 5')
    expect(container.querySelector('.recon-inputs-errors')).toBeInTheDocument()
  })

  it('disables the run and the prepared load while an action is in flight', () => {
    renderInputs({ busy: true })
    expect(screen.getByRole('button', { name: 'Run reconciliation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Load prepared CSV' })).toBeDisabled()
  })

  it('offers the prepared CSV as a download, even while a run is in flight', async () => {
    const user = userEvent.setup()
    const { props } = renderInputs({ busy: true })
    const download = screen.getByRole('button', { name: 'Download prepared CSV' })
    expect(download).toBeEnabled()
    await user.click(download)
    expect(props.onDownloadPrepared).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed action honestly', () => {
    renderInputs({ actionError: 'Reconciliation failed: prepared store unavailable' })
    expect(screen.getByRole('alert')).toHaveTextContent('prepared store unavailable')
  })
})
