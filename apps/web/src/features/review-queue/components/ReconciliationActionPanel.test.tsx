import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PREPARED_REVIEW_QUEUE_ITEMS } from '../fixtures/review_queue'
import type { ReconciliationExceptionActionInput, ReconciliationExceptionQueueItem } from '../types'
import { ReconciliationActionPanel } from './ReconciliationActionPanel'

const exception = (id: string): ReconciliationExceptionQueueItem =>
  PREPARED_REVIEW_QUEUE_ITEMS.find(
    (item): item is ReconciliationExceptionQueueItem =>
      item.kind === 'reconciliation_exception' && item.reconciliation_id === id
  )!

function renderPanel({
  item = exception('rec_shp_5rfr_37631'),
  onAction = vi.fn().mockResolvedValue(undefined)
}: {
  item?: ReconciliationExceptionQueueItem
  onAction?: (input: ReconciliationExceptionActionInput) => Promise<void>
} = {}) {
  return { onAction, ...render(<ReconciliationActionPanel item={item} onAction={onAction} />) }
}

describe('ReconciliationActionPanel', () => {
  it('discloses an inline rationale form for each exception action', async () => {
    const user = userEvent.setup()
    renderPanel()
    for (const name of ['Assign', 'Acknowledge', 'Escalate', 'Resolve']) {
      await user.click(screen.getByRole('button', { name }))
      expect(screen.getByLabelText('Rationale')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByLabelText('Rationale')).not.toBeInTheDocument()
    }
  })

  it('submits ASSIGN with the named owner and rationale', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    renderPanel({ onAction })

    await user.click(screen.getByRole('button', { name: 'Assign' }))
    await user.type(screen.getByLabelText('New owner'), 'Elisa Tukiman')
    await user.type(screen.getByLabelText('Rationale'), 'Rerouting to the duty officer')
    await user.click(screen.getByRole('button', { name: 'Submit assignment' }))

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'current_operator',
      action: 'ASSIGN',
      rationale: 'Rerouting to the duty officer',
      assigned_owner_id: 'Elisa Tukiman'
    })
  })

  it.each([
    ['Acknowledge', 'Submit acknowledgment', 'ACKNOWLEDGE'],
    ['Escalate', 'Submit escalation', 'ESCALATE'],
    ['Resolve', 'Submit resolution', 'RESOLVE']
  ] as const)('submits %s without inventing identifiers', async (trigger, submit, action) => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    renderPanel({ onAction })

    await user.click(screen.getByRole('button', { name: trigger }))
    await user.type(screen.getByLabelText('Rationale'), 'Operator note')
    await user.click(screen.getByRole('button', { name: submit }))

    expect(onAction).toHaveBeenCalledTimes(1)
    const input = onAction.mock.calls[0]![0]
    expect(input).toEqual({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'current_operator',
      action,
      rationale: 'Operator note',
      assigned_owner_id: undefined
    })
    expect(input).not.toHaveProperty('case_id')
    expect(input).not.toHaveProperty('case_ids')
    expect(input).not.toHaveProperty('shipment_id')
    expect(input).not.toHaveProperty('email_id')
  })

  it('requires a nonblank rationale and shows validation inline', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    renderPanel({ onAction })

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }))
    const rationale = screen.getByLabelText('Rationale')
    await user.click(screen.getByRole('button', { name: 'Submit acknowledgment' }))

    expect(onAction).not.toHaveBeenCalled()
    expect(screen.getByText(/rationale is required/i)).toBeInTheDocument()
    expect(rationale).toHaveAttribute('aria-invalid', 'true')

    await user.type(rationale, '   ')
    await user.click(screen.getByRole('button', { name: 'Submit acknowledgment' }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('requires an owner for ASSIGN only', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    renderPanel({ onAction })

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }))
    expect(screen.queryByLabelText('New owner')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Assign' }))
    const owner = screen.getByLabelText('New owner')
    await user.type(screen.getByLabelText('Rationale'), 'Rerouting')
    await user.click(screen.getByRole('button', { name: 'Submit assignment' }))

    expect(onAction).not.toHaveBeenCalled()
    expect(screen.getByText(/owner is required/i)).toBeInTheDocument()
    expect(owner).toHaveAttribute('aria-invalid', 'true')

    await user.type(owner, 'Elisa Tukiman')
    await user.click(screen.getByRole('button', { name: 'Submit assignment' }))
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ assigned_owner_id: 'Elisa Tukiman' }))
  })

  it('surfaces seam rejections inline instead of silently failing', async () => {
    const user = userEvent.setup()
    const onAction = vi
      .fn()
      .mockRejectedValue(new Error('Reconciliation exception rec_shp_5rfr_37631 is already resolved'))
    renderPanel({ onAction })

    await user.click(screen.getByRole('button', { name: 'Resolve' }))
    await user.type(screen.getByLabelText('Rationale'), 'Looks done')
    await user.click(screen.getByRole('button', { name: 'Submit resolution' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already resolved/i)
  })

  it('clears the disclosed form after a successful action', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Escalate' }))
    await user.type(screen.getByLabelText('Rationale'), 'Needs a senior')
    await user.click(screen.getByRole('button', { name: 'Submit escalation' }))

    expect(screen.queryByLabelText('Rationale')).not.toBeInTheDocument()
  })

  it('shows a settled state and no action controls once resolved', () => {
    renderPanel({
      item: { ...exception('rec_shp_5rfr_37631'), assignment_state: 'RESOLVED' }
    })
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('keeps at most one primary action', async () => {
    const user = userEvent.setup()
    renderPanel()
    const primaries = () =>
      screen.getAllByRole('button').filter((button) => button.classList.contains('button--primary'))
    expect(primaries()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(primaries()).toHaveLength(1)
  })
})
