import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RECONCILIATION_KIND, RECONCILIATION_LABEL } from '../../../data/inbox-labels'
import type { ReconciliationOutcome } from '../../../domain/contracts'
import { PAGE_SIZE } from '../../../lib/paging'
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
    expect(rows).toHaveLength(PAGE_SIZE)
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
    await user.click(screen.getByRole('combobox', { name: /^Outcome / }))
    await user.click(await screen.findByRole('option', { name: 'MISSING_CASE' }))
    const rows = outcomeRows()
    expect(rows.length).toBe(1)
    for (const row of rows) {
      expect(row).toHaveAttribute('data-outcome', 'MISSING_CASE')
    }

    await user.click(screen.getByRole('combobox', { name: /^Outcome / }))
    await user.click(await screen.findByRole('option', { name: 'All outcomes' }))
    expect(outcomeRows()).toHaveLength(PAGE_SIZE)
  })

  it('pages through the outcomes and returns to the first page when the filter changes', async () => {
    const user = userEvent.setup()
    const total = PREPARED_RECONCILIATION_RESULTS.length
    const unmatched = PREPARED_RECONCILIATION_RESULTS.filter((r) => r.outcome === 'UNMATCHED_CASE').length
    renderTable()
    expect(screen.getByText(`1-50 of ${total}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(`101-${total} of ${total}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    await user.click(screen.getByRole('combobox', { name: /^Outcome / }))
    await user.click(await screen.findByRole('option', { name: 'UNMATCHED_CASE' }))
    expect(screen.getByText(`1-50 of ${unmatched}`)).toBeInTheDocument()
  })

  it('shows an honest empty state when the filter has no results', async () => {
    const user = userEvent.setup()
    renderTable(PREPARED_RECONCILIATION_RESULTS.filter((r) => r.outcome === 'CASE_PRESENT'))
    await user.click(screen.getByRole('combobox', { name: /^Outcome / }))
    await user.click(await screen.findByRole('option', { name: 'SOURCE_STALE' }))
    expect(screen.getByText('No results match the current filters.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('searches by shipment or case ID, within the outcome filter, from the first page', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'SYN-042')
    expect(outcomeRows()).toHaveLength(1)
    expect(outcomeRows()[0]).toHaveAttribute('data-outcome', 'MISSING_CASE')
    expect(screen.getByText('1-1 of 1')).toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Search by ID' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'case_email_009')
    expect(outcomeRows()).toHaveLength(1)
    expect(outcomeRows()[0]).toHaveAttribute('data-outcome', 'DUPLICATE_OR_AMBIGUOUS')

    await user.click(screen.getByRole('combobox', { name: /^Outcome / }))
    await user.click(await screen.findByRole('option', { name: 'UNMATCHED_CASE' }))
    expect(screen.getByText('No results match the current filters.')).toBeInTheDocument()
  })

  it('filters by freshness and switches row density', async () => {
    const user = userEvent.setup()
    const stale = PREPARED_RECONCILIATION_RESULTS.filter((r) => r.source_freshness === 'STALE').length
    renderTable()
    expect(screen.getByRole('table')).toHaveAttribute('data-density', 'comfortable')

    await user.click(screen.getByRole('combobox', { name: /^Freshness / }))
    await user.click(await screen.findByRole('option', { name: 'Stale' }))
    expect(outcomeRows()).toHaveLength(stale)
    for (const row of outcomeRows()) expect(row).toHaveTextContent('Stale')

    await user.click(screen.getByRole('combobox', { name: /^Density / }))
    await user.click(await screen.findByRole('option', { name: 'Compact' }))
    expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact')
  })

  it('sorts by subject in both directions, starting from the run order', async () => {
    const user = userEvent.setup()
    const firstSubject = () => within(outcomeRows()[0]).getAllByRole('cell')[1].textContent
    renderTable()
    expect(firstSubject()).toBe('Shipment SHP-CASE-001')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(await screen.findByRole('option', { name: 'Subject ascending' }))
    expect(firstSubject()).toBe('Ambiguous match')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(await screen.findByRole('option', { name: 'Subject descending' }))
    expect(firstSubject()).toBe('Shipment SYN-042')
  })

  it('displays the current run id as its numeric suffix', () => {
    renderTable()
    expect(screen.getByText('001')).toBeInTheDocument()
    expect(screen.queryByText(/run_prepared/)).toBeNull()
  })

  it('keeps unmatched and missing sides honest', () => {
    renderTable()
    const rows = outcomeRows()

    const unmatched = rows.find((row) => row.getAttribute('data-outcome') === 'UNMATCHED_CASE')!
    expect(unmatched.textContent).toContain('case_email_004')
    expect(unmatched.textContent).not.toMatch(/SYN-\d/)
    expect(within(unmatched).getByText('No expected shipment')).toBeInTheDocument()

    const missing = rows.filter((row) => row.getAttribute('data-outcome') === 'MISSING_CASE')
    expect(missing.length).toBe(1)
    for (const row of missing) {
      expect(row.textContent).toContain('SYN-042')
      expect(within(row).getByText('No linked case')).toBeInTheDocument()
    }

    const ambiguous = rows.find((row) => row.getAttribute('data-outcome') === 'DUPLICATE_OR_AMBIGUOUS')!
    expect(ambiguous.textContent).toContain('SHP-AMB-009-A')
    expect(ambiguous.textContent).toContain('SHP-AMB-009-B')
    expect(ambiguous.textContent).toContain('case_email_009')
    expect(ambiguous.textContent).toContain('Candidates')
  })

  it('shows an empty state when no results exist', () => {
    renderTable([])
    expect(screen.getByText(/No reconciliation results/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
