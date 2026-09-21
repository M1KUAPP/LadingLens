import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MissingCaseReconciliation } from '../../../domain/contracts'
import { PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECONCILIATION_RESULTS } from '../fixtures/prepared'
import { MissingCasePeakCard } from './MissingCasePeakCard'

const SYN_042_RESULT = PREPARED_RECONCILIATION_RESULTS.find(
  (r): r is MissingCaseReconciliation => r.outcome === 'MISSING_CASE' && r.shipment_id === 'SYN-042'
)!
const SYN_042_SHIPMENT = PREPARED_EXPECTED_SHIPMENTS.find((s) => s.shipment_id === 'SYN-042')!

function renderCard(overrides?: Partial<Parameters<typeof MissingCasePeakCard>[0]>) {
  const onEscalate = overrides?.onEscalate ?? vi.fn()
  const utils = render(
    <MissingCasePeakCard result={SYN_042_RESULT} shipment={SYN_042_SHIPMENT} onEscalate={onEscalate} {...overrides} />
  )
  return { onEscalate, ...utils }
}

describe('MissingCasePeakCard', () => {
  it('shows the expected shipment and the empty received case together', () => {
    renderCard()
    const card = screen.getByRole('region', { name: 'Missing case SYN-042' })

    const expected = within(card).getByRole('group', {
      name: 'Expected shipment'
    })
    expect(within(expected).getByText('SYN-042')).toBeInTheDocument()
    expect(within(expected).getByText('SYN-BK-042')).toBeInTheDocument()
    expect(within(expected).getByText('Draft BL expected')).toBeInTheDocument()
    expect(within(expected).getByText('Aisyah Razak')).toBeInTheDocument()

    const receivedCase = within(card).getByRole('group', { name: 'Received case' })
    expect(within(receivedCase).getByText(/No case has been received/i)).toBeInTheDocument()
    expect(receivedCase.textContent).not.toMatch(/case_\w+/)
  })

  it('reads as held custody with a rail and hold glyph, never a match', () => {
    const { container } = renderCard()
    const card = screen.getByRole('region', { name: 'Missing case SYN-042' })
    expect(card).toHaveAttribute('data-status', 'held')
    expect(container.querySelector('.missing-case-peak-rail')).toBeInTheDocument()
    expect(within(card).getByLabelText('Held')).toBeInTheDocument()
    expect(card.querySelector('[data-status="match"]')).toBeNull()
  })

  it('states honestly that no case is invented', () => {
    renderCard()
    const card = screen.getByRole('region', { name: 'Missing case SYN-042' })
    expect(card.textContent).toMatch(/does not invent|no case is fabricated/i)
  })

  it('escalates the missing case through the callback', async () => {
    const user = userEvent.setup()
    const { onEscalate } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Escalate missing case' }))
    expect(onEscalate).toHaveBeenCalledTimes(1)
    expect(onEscalate).toHaveBeenCalledWith(SYN_042_RESULT)
  })

  it('marks an escalated card as requested without inventing a case', () => {
    renderCard({ escalated: true })
    const card = screen.getByRole('region', { name: 'Missing case SYN-042' })
    expect(within(card).getByRole('status')).toHaveTextContent(/escalation requested/i)
    expect(within(card).getByRole('button', { name: 'Escalate missing case' })).toBeDisabled()
  })
})
