import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MissingCaseReconciliation } from '../../../domain/contracts'
import { PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECEIVED_CASES } from '../fixtures/prepared'
import { reconcileShipments } from '../reconcile'
import { MissingCasePeakCard } from './MissingCasePeakCard'

const OVERDUE_RESULT = reconcileShipments(
  PREPARED_EXPECTED_SHIPMENTS,
  PREPARED_RECEIVED_CASES,
  'run_prepared_001',
  '2026-09-21T00:00:00Z'
).find((r): r is MissingCaseReconciliation => r.outcome === 'MISSING_CASE')!
const OVERDUE_SHIPMENT = PREPARED_EXPECTED_SHIPMENTS.find((s) => s.shipment_id === 'SHP-5RFR-37631')!
const REGION = 'Missing case SHP-5RFR-37631'

function renderCard(overrides?: Partial<Parameters<typeof MissingCasePeakCard>[0]>) {
  const onEscalate = overrides?.onEscalate ?? vi.fn()
  const utils = render(
    <MissingCasePeakCard result={OVERDUE_RESULT} shipment={OVERDUE_SHIPMENT} onEscalate={onEscalate} {...overrides} />
  )
  return { onEscalate, ...utils }
}

describe('MissingCasePeakCard', () => {
  it('shows the expected shipment and the empty received case together', () => {
    renderCard()
    const card = screen.getByRole('region', { name: REGION })

    const expected = within(card).getByRole('group', {
      name: 'Expected shipment'
    })
    expect(within(expected).getByText('SHP-5RFR-37631')).toBeInTheDocument()
    // The SI request names the order and BL numbers, not a booking.
    expect(within(expected).getByText('5RFR-37631')).toBeInTheDocument()
    expect(within(expected).getByText('SIJ1051834')).toBeInTheDocument()
    expect(within(expected).getByText('Draft BL expected')).toBeInTheDocument()
    expect(within(expected).getByText('docs-desk')).toBeInTheDocument()

    const receivedCase = within(card).getByRole('group', { name: 'Received case' })
    expect(within(receivedCase).getByText(/No case has been received/i)).toBeInTheDocument()
    expect(receivedCase.textContent).not.toMatch(/case_\w+/)
  })

  it('reads as held custody with a hold glyph, never a match', () => {
    const { container } = renderCard()
    const card = screen.getByRole('region', { name: REGION })
    expect(card).toHaveAttribute('data-status', 'held')
    expect(container.querySelector('.missing-case-peak-rail')).toBeNull()
    expect(within(card).getByLabelText('Held')).toBeInTheDocument()
    expect(card.querySelector('[data-status="match"]')).toBeNull()
  })

  it('states honestly that no case is invented', () => {
    renderCard()
    const card = screen.getByRole('region', { name: REGION })
    expect(card.textContent).toMatch(/does not invent|no case is fabricated/i)
  })

  it('escalates the missing case through the callback', async () => {
    const user = userEvent.setup()
    const { onEscalate } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Escalate missing case' }))
    expect(onEscalate).toHaveBeenCalledTimes(1)
    expect(onEscalate).toHaveBeenCalledWith(OVERDUE_RESULT)
  })

  it('marks an escalated card as requested without inventing a case', () => {
    renderCard({ escalated: true })
    const card = screen.getByRole('region', { name: REGION })
    expect(within(card).getByRole('status')).toHaveTextContent(/escalation requested/i)
    expect(within(card).getByRole('button', { name: 'Escalate missing case' })).toBeDisabled()
  })
})
