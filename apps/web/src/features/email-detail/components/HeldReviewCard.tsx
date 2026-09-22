import { useState } from 'react'
import { Button, Field } from '../../../components/ui/Controls'
import { StatusPill } from '../../../components/ui/Domain'
import { VerdictHoldGlyph } from '../../../components/ui/Icons'
import { Tooltip } from '../../../components/ui/Overlays'
import type { StatusKind } from '../../../components/ui/types'
import { dispositionLabel } from '../../../data/inbox-labels'
import type { CaseReviewActionInput, CaseReviewDetails, ReviewReason } from '../types'
import './held-review-card.css'

type HeldReviewCardProps = {
  review: CaseReviewDetails
  onAction: (action: CaseReviewActionInput) => Promise<void>
}

const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
  wrong_doc_type: 'wrong_doc_type',
  missing_attachment: 'missing_attachment',
  unreadable: 'unreadable',
  missing_value: 'missing_value'
}

const ACTIONABLE_DISPOSITIONS = new Set(['OPEN', 'IN_REVIEW'])

const SETTLED_STATUS: Record<string, { kind: StatusKind; label: string }> = {
  APPROVED: { kind: 'match', label: 'Approved' },
  RESOLVED: { kind: 'match', label: 'Resolved' },
  CORRECTED: { kind: 'match', label: 'Corrected' },
  AUTO_COMPLETED: { kind: 'match', label: 'Auto completed' },
  REJECTED: { kind: 'neutral', label: 'Rejected' }
}

export function HeldReviewCard({ review, onAction }: HeldReviewCardProps) {
  const [openPanel, setOpenPanel] = useState<'correct' | 'reject' | null>(null)
  const [rationale, setRationale] = useState('')
  const [rejectionRationale, setRejectionRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const settled = !ACTIONABLE_DISPOSITIONS.has(review.disposition)
  const settledStatus = SETTLED_STATUS[review.disposition] ?? {
    kind: 'neutral' as StatusKind,
    label: review.disposition
  }

  const reasonLabel = review.review_reason
    ? REVIEW_REASON_LABELS[review.review_reason]
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
      setOpenPanel(null)
      setRationale('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    const note = rejectionRationale.trim()
    if (!note) return
    setSubmitting(true)
    try {
      await onAction({
        case_id: review.case_id,
        action: 'REJECT',
        rationale: note,
        actor_id: 'current_operator'
      })
      setOpenPanel(null)
      setRejectionRationale('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="held-review-card" aria-label="Review custody" data-status="held">
      <div className="held-review-header">
        <div className="held-review-title-group">
          <VerdictHoldGlyph aria-label="Held" />
          <h2 className="held-review-title">Review custody</h2>
          <Tooltip label="About review custody">
            <span>Case held in human review custody. Operational sign-off is reserved for the named owner.</span>
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
            <span className="held-review-item-value">Probability: {review.probability.toFixed(2)}</span>
          </div>
        )}

        <div className="held-review-item">
          <span className="held-review-item-label">Case status</span>
          <span className="held-review-item-value">{dispositionLabel(review.disposition)}</span>
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
        <span className="held-review-evidence-text">{review.evidence_summary}</span>
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

      {settled ? (
        <div className="held-review-settled" role="status">
          <StatusPill status={settledStatus.kind}>{settledStatus.label}</StatusPill>
          <span className="held-review-settled-note">Review settled. No further actions are available.</span>
        </div>
      ) : (
        <>
          {openPanel === 'correct' && (
            <div className="held-review-panel">
              <Field
                label="Review rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="State correction details or justification"
              />
              <div className="held-review-panel-actions">
                <Button variant="secondary" disabled={submitting || !rationale.trim()} onClick={handleCorrection}>
                  Submit correction
                </Button>
                <Button variant="ghost" disabled={submitting} onClick={() => setOpenPanel(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {openPanel === 'reject' && (
            <div className="held-review-panel">
              <Field
                label="Rejection rationale"
                value={rejectionRationale}
                onChange={(e) => setRejectionRationale(e.target.value)}
                placeholder="State the reason for rejecting this case"
              />
              <div className="held-review-panel-actions">
                <Button variant="secondary" disabled={submitting || !rejectionRationale.trim()} onClick={handleReject}>
                  Submit rejection
                </Button>
                <Button variant="ghost" disabled={submitting} onClick={() => setOpenPanel(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="held-review-actions">
            <Button variant="primary" disabled={submitting} onClick={handleApprove}>
              Approve sign-off
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setOpenPanel(openPanel === 'correct' ? null : 'correct')}
            >
              Correct values
            </Button>
            <Button
              variant="ghost"
              disabled={submitting}
              onClick={() => setOpenPanel(openPanel === 'reject' ? null : 'reject')}
            >
              Reject with reason
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
