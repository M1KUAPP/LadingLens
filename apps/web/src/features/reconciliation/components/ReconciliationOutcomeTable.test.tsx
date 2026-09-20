import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RECONCILIATION_KIND, RECONCILIATION_LABEL } from '../../../data/inbox-labels'
import type { ReconciliationOutcome } from '../../../domain/contracts'
import { PREPARED_RECONCILIATION_RESULTS } from '../fixtures/prepared'
import { ReconciliationOutcomeTable } from './ReconciliationOutcomeTable'

const OUTCOMES: ReconciliationOutcome[] = [
  'CASE_PRESENT',
  'DOCUMENT_MISSING',
  'MISSING_CASE',
  'UNMATCHED_CASE',
  'DUPLICATE_OR_AMBIGUOUS',
  'SOURCE_STALE'
]

function renderTable(results = PREPARED_RECONCILIATION_RESULTS, runId = 'run_prepared_001') {
  return render(<ReconciliationOutcomeTable results={results} runId={runId} />)
}

function outcomeRows() {
  const region = screen.getByRole('region', { name: 'Reconciliation results' })
  const table = within(region).getByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

describe('ReconciliationOutcomeTable', () => {
  it('renders all six outcomes with their labels and status kinds', () => {
    renderTable()
    for (const outcome of OUTCOMES) {
      const pill = screen
        .getAllByText(RECONCILIATION_LABEL[outcome])
        .map((el) => el.closest('.status-pill'))
        .find(Boolean)
      expect(pill).toHaveAttribute('data-status', RECONCILIATION_KIND[outcome])
    }
  })

  it('never renders data-status="match" on a non-CASE_PRESENT item', () => {
    renderTable()
    const rows = outcomeRows()
    expect(rows.length).toBe(PREPARED_RECONCILIATION_RESULTS.length)
    for (const row of rows) {
      const outcome = row.getAttribute('data-outcome')
      const matchEls = row.querySelectorAll('[data-status="match"]')
      if (outcome === 'CASE_PRESENT') {
        expect(matchEls.length).toBeGreaterThan(0)
      } else {
        expect(matchEls.length).toBe(0)
      }
    }
    const matchPills = document.querySelectorAll('.status-pill[data-status="match"]')
    const expected = PREPARED_RECONCILIATION_RESULTS.filter((r) => r.outcome === 'CASE_PRESENT').length
    expect(matchPills.length).toBe(expected)
  })

  it('filters rows through the outcome select', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('combobox', { name: /Filter by outcome/i }))
    await user.click(await screen.findByRole('option', { name: 'Missing case' }))
    const rows = outcomeRows()
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row).toHaveAttribute('data-outcome', 'MISSING_CASE')
    }

    await user.click(screen.getByRole('combobox', { name: /Filter by outcome/i }))
    await user.click(await screen.findByRole('option', { name: 'All outcomes' }))
    expect(outcomeRows().length).toBe(PREPARED_RECONCILIATION_RESULTS.length)
  })

  it('shows an honest empty state when the filter has no results', async () => {
    const user = userEvent.setup()
    renderTable(PREPARED_RECONCILIATION_RESULTS.filter((r) => r.outcome === 'CASE_PRESENT'))
    await user.click(screen.getByRole('combobox', { name: /Filter by outcome/i }))
    await user.click(await screen.findByRole('option', { name: 'Source stale' }))
    expect(screen.getByText(/No results for this outcome/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('displays the current run id', () => {
    renderTable()
    expect(screen.getByText('run_prepared_001')).toBeInTheDocument()
  })

  it('keeps unmatched and missing sides honest', () => {
    renderTable()
    const rows = outcomeRows()

    const unmatched = rows.find((row) => row.getAttribute('data-outcome') === 'UNMATCHED_CASE')!
    expect(unmatched.textContent).toContain('case_email_013')
    expect(unmatched.textContent).not.toMatch(/SYN-\d/)
    expect(within(unmatched).getByText('No expected shipment')).toBeInTheDocument()

    const missing = rows.filter((row) => row.getAttribute('data-outcome') === 'MISSING_CASE')
    expect(missing.length).toBe(2)
    for (const row of missing) {
      expect(within(row).getByText('No linked case')).toBeInTheDocument()
    }

    const ambiguous = rows.find((row) => row.getAttribute('data-outcome') === 'DUPLICATE_OR_AMBIGUOUS')!
    expect(ambiguous.textContent).toContain('SYN-099A')
    expect(ambiguous.textContent).toContain('SYN-099B')
    expect(ambiguous.textContent).toContain('case_ambiguous_01')
    expect(ambiguous.textContent).toContain('Candidates')
  })

  it('shows an empty state when no results exist', () => {
    renderTable([])
    expect(screen.getByText(/No reconciliation results/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
