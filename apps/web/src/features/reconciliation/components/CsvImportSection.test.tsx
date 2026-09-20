import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CsvImportResult } from '../types'
import { EXPECTED_SHIPMENTS_CSV } from '../fixtures/prepared'
import { CsvImportSection } from './CsvImportSection'

function renderSection(overrides?: Partial<Parameters<typeof CsvImportSection>[0]>) {
  const props = {
    importResult: null as CsvImportResult | null,
    runId: 'run_prepared_001',
    busy: false,
    onImportCsv: vi.fn(),
    onLoadPrepared: vi.fn(),
    onRerun: vi.fn(),
    ...overrides
  }
  const utils = render(<CsvImportSection {...props} />)
  return { props, ...utils }
}

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).toBeInTheDocument()
  return input!
}

describe('CsvImportSection', () => {
  it('exposes the shared drop zone and no other native file input', () => {
    const { container } = renderSection()
    expect(screen.getByRole('button', { name: 'Import expected shipments CSV' })).toBeInTheDocument()
    const inputs = container.querySelectorAll('input[type="file"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.closest('.drop-zone')).toBeInTheDocument()
  })

  it('rejects a non-CSV file inline without calling the importer', () => {
    const { props, container } = renderSection()
    const file = new File(['not a csv'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(fileInput(container), { target: { files: [file] } })
    expect(screen.getByText(/not an accepted format/i)).toBeInTheDocument()
    expect(props.onImportCsv).not.toHaveBeenCalled()
  })

  it('imports a dropped CSV through the seam callback', async () => {
    const { props, container } = renderSection()
    const file = new File([EXPECTED_SHIPMENTS_CSV], 'expected_shipments.csv', {
      type: 'text/csv'
    })
    fireEvent.change(fileInput(container), { target: { files: [file] } })
    await waitFor(() => expect(props.onImportCsv).toHaveBeenCalledWith(EXPECTED_SHIPMENTS_CSV))
  })

  it('loads the prepared synthetic CSV through its own control', async () => {
    const user = userEvent.setup()
    const { props } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Load prepared CSV' }))
    expect(props.onLoadPrepared).toHaveBeenCalledTimes(1)
  })

  it('reports the valid row count after a clean import', () => {
    renderSection({ importResult: { importedCount: 9, errors: [] } })
    expect(screen.getByRole('status')).toHaveTextContent('9 rows imported')
  })

  it('lists tokenized validation errors inline', () => {
    const { container } = renderSection({
      importResult: {
        importedCount: 0,
        errors: [
          {
            row: 2,
            column: 'source_freshness',
            message: 'source_freshness must be CURRENT or STALE'
          },
          { row: 4, message: 'Expected 7 columns, found 5' }
        ]
      }
    })
    const alert = screen.getByRole('alert')
    const list = alert.closest('ul') ?? alert.querySelector('ul') ?? alert
    expect(list).toHaveClass('csv-import-errors')
    expect(within(alert as HTMLElement).getByText(/Row 2/)).toBeInTheDocument()
    expect(alert.textContent).toContain('source_freshness must be CURRENT or STALE')
    expect(alert.textContent).toContain('Expected 7 columns, found 5')
    expect(container.querySelector('.csv-import-errors')).toBeInTheDocument()
  })

  it('reruns reconciliation and shows the latest run id', async () => {
    const user = userEvent.setup()
    const { props } = renderSection({ runId: 'run_prepared_002' })
    expect(screen.getByText('run_prepared_002')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rerun reconciliation' }))
    expect(props.onRerun).toHaveBeenCalledTimes(1)
  })

  it('keeps rerun as the only primary action', () => {
    const { container } = renderSection()
    expect(container.querySelectorAll('.button--primary')).toHaveLength(1)
  })

  it('disables actions while an import or rerun is in flight', () => {
    renderSection({ busy: true })
    expect(screen.getByRole('button', { name: 'Rerun reconciliation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Load prepared CSV' })).toBeDisabled()
  })

  it('surfaces a failed action honestly', () => {
    renderSection({ actionError: 'Rerun failed: prepared store unavailable' })
    expect(screen.getByRole('alert')).toHaveTextContent('prepared store unavailable')
  })
})
