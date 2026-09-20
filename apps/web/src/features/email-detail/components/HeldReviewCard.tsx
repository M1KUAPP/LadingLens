import { useState } from 'react'
import { Button, Field } from '../../../components/ui/Controls'
import { VerdictHoldGlyph } from '../../../components/ui/Icons'
import { Tooltip } from '../../../components/ui/Overlays'
import type { CaseReviewActionInput, CaseReviewDetails } from '../types'
import './held-review-card.css'

type HeldReviewCardProps = {
  review: CaseReviewDetails
  onAction: (action: CaseReviewActionInput) => Promise<void>
}

export function HeldReviewCard({ review, onAction }: HeldReviewCardProps) {
  const [showCorrection, setShowCorrection] = useState(false)
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reasonLabel = review.review_reason
    ? review.review_reason.replace(/_/g, ' ')
    : review.probability !== undefined
      ? 'Semantic ambiguity'
      : 'Discrepancy review'

  async function handleApprove() {
    setSubmitting(true)
    try {
      await onAction({
        case_id: review.case_id,
        action: 'APPROVE',
        rationale: 'Operator sign-off confirmed',
        actor_id: 'current_operator'
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCorrection() {
    if (!rationale.trim()) return
    setSubmitting(true)
    try {
      await onAction({
        case_id: review.case_id,
        action: 'CORRECT',
        rationale: rationale.trim(),
        actor_id: 'current_operator'
      })
      setShowCorrection(false)
      setRationale('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    setSubmitting(true)
    try {
      await onAction({
        case_id: review.case_id,
        action: 'REJECT',
        rationale: 'Rejected during operator review',
        actor_id: 'current_operator'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="held-review-card"
      role="region"
      aria-label="Review custody"
      data-status="held"
    >
      <div className="held-review-header">
        <div className="held-review-title-group">
          <VerdictHoldGlyph aria-label="Held" />
          <h2 className="held-review-title">Review custody</h2>
          <Tooltip label="About review custody">
            <span>
              Case held in human review custody. Operational sign-off is
              reserved for the named owner.
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="held-review-grid">
        <div className="held-review-item">
          <span className="held-review-item-label">Review reason</span>
          <span className="held-review-item-value">{reasonLabel}</span>
        </div>

        {review.probability !== undefined && (
          <div className="held-review-item">
            <span className="held-review-item-label">Match probability</span>
            <span className="held-review-item-value">
              Probability: {review.probability.toFixed(2)}
            </span>
          </div>
        )}

        <div className="held-review-item">
          <span className="held-review-item-label">Assigned owner</span>
          <span className="held-review-item-value">{review.assigned_owner}</span>
        </div>

        <div className="held-review-item">
          <span className="held-review-item-label">Disposition</span>
          <span className="held-review-item-value">{review.disposition}</span>
        </div>
      </div>

      <div className="held-review-item">
        <span className="held-review-item-label">Immutable source record</span>
        <span className="held-review-item-value">
          {review.immutable_source.email_id} (From: {review.immutable_source.sender})
        </span>
      </div>

      <div className="held-review-evidence-box">
        <span className="held-review-evidence-label">Evidence summary</span>
        <span className="held-review-evidence-text">
          {review.evidence_summary}
        </span>
      </div>

      <div className="held-review-history">
        <span className="held-review-history-title">Review history</span>
        <ul className="held-review-history-list">
          {review.history.map((entry) => (
            <li key={entry.id} className="held-review-history-entry">
              <div className="held-review-history-meta">
                <span>{entry.actor}</span>
                <span>{entry.timestamp}</span>
              </div>
              <div>
                <strong>{entry.action}</strong>
                {entry.note ? `: ${entry.note}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showCorrection && (
        <div className="held-review-correction-panel">
          <Field
            label="Review rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="State correction details or justification"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              disabled={submitting || !rationale.trim()}
              onClick={handleCorrection}
            >
              Submit correction
            </Button>
            <Button
              variant="ghost"
              disabled={submitting}
              onClick={() => setShowCorrection(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="held-review-actions">
        <Button
          variant="primary"
          disabled={submitting}
          onClick={handleApprove}
        >
          Approve sign-off
        </Button>
        <Button
          variant="secondary"
          disabled={submitting}
          onClick={() => setShowCorrection(!showCorrection)}
        >
          Correct values
        </Button>
        <Button
          variant="ghost"
          disabled={submitting}
          onClick={handleReject}
        >
          Reject with reason
        </Button>
      </div>
    </section>
  )
}
