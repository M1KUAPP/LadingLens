import { useId, useState } from 'react'
import { Button, Field } from '../../../components/ui/Controls'
import { StatusPill } from '../../../components/ui/Domain'
import type {
  ReconciliationExceptionAction,
  ReconciliationExceptionActionInput,
  ReconciliationExceptionQueueItem
} from '../types'
import './reconciliation-action-panel.css'

type ReconciliationActionPanelProps = {
  item: ReconciliationExceptionQueueItem
  onAction: (input: ReconciliationExceptionActionInput) => Promise<void>
}

const ACTIONS: ReconciliationExceptionAction[] = ['ACKNOWLEDGE', 'ESCALATE', 'RESOLVE']

const ACTION_LABEL: Record<ReconciliationExceptionAction, string> = {
  ACKNOWLEDGE: 'Acknowledge',
  ESCALATE: 'Escalate',
  RESOLVE: 'Resolve'
}

const SUBMIT_LABEL: Record<ReconciliationExceptionAction, string> = {
  ACKNOWLEDGE: 'Submit acknowledgment',
  ESCALATE: 'Submit escalation',
  RESOLVE: 'Submit resolution'
}

export function ReconciliationActionPanel({ item, onAction }: ReconciliationActionPanelProps) {
  const formId = useId()
  const [openAction, setOpenAction] = useState<ReconciliationExceptionAction | null>(null)
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (item.assignment_state === 'RESOLVED') {
    return (
      <div className="rq-action-settled" role="status">
        <StatusPill status="match">Resolved</StatusPill>
        <span className="rq-action-settled-note">Exception settled. No further actions are available.</span>
      </div>
    )
  }

  function disclose(action: ReconciliationExceptionAction) {
    setOpenAction((current) => (current === action ? null : action))
    setError(undefined)
    setSubmitError(null)
  }

  function closeForm() {
    setOpenAction(null)
    setRationale('')
    setError(undefined)
    setSubmitError(null)
  }

  async function submit() {
    if (!openAction) return
    const note = rationale.trim()
    if (!note) {
      setError('Rationale is required')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onAction({
        reconciliation_id: item.reconciliation_id,
        actor_id: 'current_operator',
        action: openAction,
        rationale: note
      })
      closeForm()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Action was rejected')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rq-action-panel">
      <div className="rq-action-triggers" role="group" aria-label="Exception actions">
        {ACTIONS.map((action) => (
          <Button
            key={action}
            variant="secondary"
            aria-expanded={openAction === action}
            aria-controls={openAction === action ? formId : undefined}
            disabled={submitting}
            onClick={() => disclose(action)}
          >
            {ACTION_LABEL[action]}
          </Button>
        ))}
      </div>

      {openAction && (
        <div className="rq-action-form" id={formId}>
          <Field
            label="Rationale"
            value={rationale}
            onChange={(event) => {
              setRationale(event.target.value)
              setError(undefined)
            }}
            placeholder="State the reason for this action"
            error={error}
            required
          />
          {submitError && (
            <p className="rq-action-error" role="alert">
              {submitError}
            </p>
          )}
          <div className="rq-action-form-buttons">
            <Button variant="primary" disabled={submitting} onClick={submit}>
              {SUBMIT_LABEL[openAction]}
            </Button>
            <Button variant="ghost" disabled={submitting} onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
