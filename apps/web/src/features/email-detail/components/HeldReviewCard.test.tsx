import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HeldReviewCard } from './HeldReviewCard'
import type { CaseReviewDetails } from '../types'

describe('HeldReviewCard', () => {
  const sampleReview: CaseReviewDetails = {
    case_id: 'case_ambig_01',
    email_id: 'email_ambiguous',
    status: 'NEEDS_REVIEW',
    review_reason: undefined,
    probability: 0.68,
    assigned_owner: 'Marcus Vance',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_ambiguous',
      sender: 'docs@pacificshipping.com',
      subject: 'SI and Draft BL for OC 5RSG-0089',
      received_at: '2026-09-18T14:32:00Z',
      message_hash: '3f7b2c91...'
    },
    evidence_summary:
      'Consignee naming differs between legal entity and trading name',
    history: [
      {
        id: 'hist_1',
        timestamp: '2026-09-18T14:32:05Z',
        actor: 'System',
        action: 'CREATED',
        note: 'Escalated from semantic equivalence evaluation'
      }
    ]
  }

  it('renders in state/held tokens with the pause-bars glyph, reason, and probability', () => {
    render(<HeldReviewCard review={sampleReview} onAction={vi.fn()} />)
    const card = screen.getByRole('region', { name: 'Review custody' })
    expect(card).toHaveAttribute('data-status', 'held')
    expect(screen.getByLabelText('Held')).toBeInTheDocument()
    expect(screen.getByText(/Probability: 0\.68/)).toBeInTheDocument()
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument()
    expect(screen.getByText(sampleReview.evidence_summary)).toBeInTheDocument()
  })

  it('has exactly one primary button reserved for sign-off', () => {
    render(<HeldReviewCard review={sampleReview} onAction={vi.fn()} />)
    const primaryButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.classList.contains('button--primary'))
    expect(primaryButtons).toHaveLength(1)
    expect(primaryButtons[0]).toHaveTextContent('Approve sign-off')
  })

  it('submits approve action through callback', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    render(<HeldReviewCard review={sampleReview} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: 'Approve sign-off' }))
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPROVE'
      })
    )
  })

  it('allows entering correction rationale and submitting correct action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    render(<HeldReviewCard review={sampleReview} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: 'Correct values' }))
    const rationaleInput = screen.getByLabelText('Review rationale')
    await user.type(rationaleInput, 'BL amended to match SI exactly')
    await user.click(screen.getByRole('button', { name: 'Submit correction' }))
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CORRECT',
        rationale: expect.stringContaining('BL amended')
      })
    )
  })
})
