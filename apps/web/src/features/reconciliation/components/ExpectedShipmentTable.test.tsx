import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PREPARED_DATASET_LABEL, PREPARED_EXPECTED_SHIPMENTS } from '../fixtures/prepared'
import { ExpectedShipmentTable } from './ExpectedShipmentTable'

const SOURCE_NAME = 'expected_shipments.csv'

function renderTable(shipments = PREPARED_EXPECTED_SHIPMENTS) {
  return render(
    <ExpectedShipmentTable shipments={shipments} sourceName={SOURCE_NAME} sourceLabel={PREPARED_DATASET_LABEL} />
  )
}

describe('ExpectedShipmentTable', () => {
  it('labels the prepared CSV source clearly', () => {
    renderTable()
    const section = screen.getByRole('region', { name: 'Expected shipments' })
    expect(within(section).getByText(SOURCE_NAME)).toBeInTheDocument()
    expect(within(section).getByText('Prepared CSV')).toBeInTheDocument()
    expect(within(section).getByText(PREPARED_DATASET_LABEL)).toBeInTheDocument()
  })

  it('renders every CSV column for each prepared shipment', () => {
    renderTable()
    const region = screen.getByRole('region', {
      name: 'Expected shipment rows'
    })
    const table = within(region).getByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(headers).toEqual([
      'Shipment',
      'Booking reference',
      'Lifecycle',
      'Required documents',
      'Cutoff',
      'Owner',
      'Freshness'
    ])

    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(PREPARED_EXPECTED_SHIPMENTS.length + 1)

    const syn042 = rows.find((row) => within(row).queryByText('SYN-042'))
    expect(syn042).toBeDefined()
    const cells = within(syn042!)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells[0]).toBe('SYN-042')
    expect(cells[1]).toBe('SYN-BK-042')
    expect(cells[2]).toBe('Draft BL expected')
    expect(cells[3]).toBe('Shipping instruction; Draft bill of lading')
    expect(cells[4]).toBe('2026-09-21T12:00:00Z')
    expect(cells[5]).toBe('synthetic-exception-queue')
    expect(cells[6]).toBe('Current')
  })

  it('sets identifiers and data in tabular data styles', () => {
    renderTable()
    const idCell = screen.getByText('SYN-042')
    expect(idCell).toHaveClass('type-data-sm')
    const cutoffCell = screen.getByText('2026-09-21T12:00:00Z')
    expect(cutoffCell).toHaveClass('type-data-sm')
  })

  it('marks stale freshness as held and never renders a match verdict', () => {
    renderTable()
    const region = screen.getByRole('region', {
      name: 'Expected shipment rows'
    })
    const stalePill = within(region).getByText('Stale').closest('.status-pill')
    expect(stalePill).toHaveAttribute('data-status', 'held')
    const currentPills = within(region).getAllByText('Current')
    for (const pill of currentPills) {
      expect(pill.closest('.status-pill')).toHaveAttribute('data-status', 'neutral')
    }
    expect(region.querySelector('[data-status="match"]')).toBeNull()
  })

  it('scrolls the table inside the shared scrollbar instead of the page', () => {
    const { container } = renderTable()
    const viewport = container.querySelector('.scrollbar[data-orientation="horizontal"] .scrollbar-viewport')
    expect(viewport).toBeInTheDocument()
    expect(viewport?.querySelector('table')).toBeInTheDocument()
  })

  it('shows an honest empty state when no shipments are loaded', () => {
    renderTable([])
    expect(screen.getByText(/No expected shipments loaded/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
