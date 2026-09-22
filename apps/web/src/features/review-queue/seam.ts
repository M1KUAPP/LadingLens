import type { ReviewAssignmentState, ReviewHistoryEntry } from '../../domain/contracts'
import { readSessionState, removeSessionState, writeSessionState } from '../../lib/session-state'
import { createPreparedEmailDetailService, type EmailDetailService } from '../email-detail/seam'
import type { CaseReviewActionInput, EmailDetailRecord } from '../email-detail/types'
import { defaultReconciliationService, type ReconciliationService } from '../reconciliation/seam'
import { exceptionItem, PREPARED_CASE_ITEMS } from './fixtures/review_queue'
import type {
  CaseQueueItem,
  ReconciliationExceptionAction,
  ReconciliationExceptionActionInput,
  ReconciliationExceptionQueueItem,
  ReviewQueueItem
} from './types'

export interface ReviewQueueService {
  getQueueItems(): Promise<ReviewQueueItem[]>
  submitCaseReviewAction(input: CaseReviewActionInput): Promise<EmailDetailRecord>
  submitReconciliationAction(input: ReconciliationExceptionActionInput): Promise<ReconciliationExceptionQueueItem>
  reset(): Promise<void>
}

const ACTION_TO_STATE: Record<ReconciliationExceptionAction, ReviewAssignmentState> = {
  ACKNOWLEDGE: 'ACKNOWLEDGED',
  ESCALATE: 'ESCALATED',
  RESOLVE: 'RESOLVED'
}

/** Where the app's queue keeps a person's exception actions for the guest session. */
export const EXCEPTION_ACTIONS_STORAGE_KEY = 'ladinglens-exception-actions'

type ExceptionAction = {
  reconciliation_id: string
  action: ReconciliationExceptionAction
  actor: string
  note: string
  timestamp: string
}

// The exceptions are derived from the run again on a page load; only the
// actions people took on them are kept, with the run they were taken on.
type StoredExceptionActions = { run: string; actions: ExceptionAction[] }

function isExceptionAction(value: unknown): value is ExceptionAction {
  if (typeof value !== 'object' || value === null) return false
  const { reconciliation_id, action, actor, note, timestamp } = value as Record<string, unknown>
  return (
    typeof reconciliation_id === 'string' &&
    typeof action === 'string' &&
    Object.hasOwn(ACTION_TO_STATE, action) &&
    typeof actor === 'string' &&
    typeof note === 'string' &&
    typeof timestamp === 'string'
  )
}

function isStoredExceptionActions(value: unknown): value is StoredExceptionActions {
  if (typeof value !== 'object' || value === null) return false
  const { run, actions } = value as Record<string, unknown>
  return typeof run === 'string' && Array.isArray(actions) && actions.every(isExceptionAction)
}

export function createPreparedReviewQueueService(options?: {
  emailDetailService?: EmailDetailService
  reconciliationService?: ReconciliationService
  now?: () => string
  /** Keeps exception actions in sessionStorage under this key, so a page load keeps them until reset. */
  storageKey?: string
}): ReviewQueueService {
  const emailDetail = options?.emailDetailService ?? createPreparedEmailDetailService()
  const reconciliation = options?.reconciliationService ?? defaultReconciliationService
  const now = options?.now ?? (() => new Date().toISOString())
  const storageKey = options?.storageKey
  let cases: CaseQueueItem[] = []
  let exceptions: ReconciliationExceptionQueueItem[] = []
  let actions: ExceptionAction[] = []
  let run: string | undefined
  // Actions an earlier page load stored, replayed once their run is seen again.
  let stored: StoredExceptionActions | null = null

  const seed = () => {
    cases = structuredClone(PREPARED_CASE_ITEMS)
    exceptions = []
    actions = []
    run = undefined
  }
  seed()
  if (storageKey) {
    const value = readSessionState(storageKey)
    if (isStoredExceptionActions(value)) stored = value
  }

  function save() {
    if (!storageKey) return
    if (run === undefined) removeSessionState(storageKey)
    else writeSessionState(storageKey, { run, actions } satisfies StoredExceptionActions)
  }

  function record(item: ReconciliationExceptionQueueItem, action: ExceptionAction) {
    const entry: ReviewHistoryEntry = {
      id: `hist_${item.item_id}_${item.history.length + 1}`,
      timestamp: action.timestamp,
      actor: action.actor,
      action: action.action,
      note: action.note
    }
    item.history = [...item.history, entry]
    item.assignment_state = ACTION_TO_STATE[action.action]
    actions.push(action)
  }

  // Exceptions come from the latest reconciliation run: none before a run,
  // and a new run replaces the last one's. A run is its id and the time it
  // ran, since run ids start again at 001 after a reset.
  async function syncExceptions() {
    const results = await reconciliation.getReconciliationResults()
    const latest = results[0] ? `${results[0].reconciliation_run_id}@${results[0].created_at}` : undefined
    if (latest === run) return
    run = latest
    exceptions = results.flatMap((result) => exceptionItem(result) ?? [])
    actions = []
    if (stored && stored.run === latest) {
      for (const action of stored.actions) {
        const item = exceptions.find((i) => i.reconciliation_id === action.reconciliation_id)
        if (item && item.assignment_state !== 'RESOLVED') record(item, action)
      }
    }
    stored = null
    save()
  }

  return {
    async getQueueItems(): Promise<ReviewQueueItem[]> {
      await syncExceptions()
      return structuredClone([...cases, ...exceptions])
    },

    async submitCaseReviewAction(input: CaseReviewActionInput): Promise<EmailDetailRecord> {
      const item = cases.find((i) => i.case_id === input.case_id)
      if (!item) {
        throw new Error(`Case ${input.case_id} is not in the review queue`)
      }
      const record = await emailDetail.submitReviewAction(input)
      cases = cases.filter((i) => i !== item)
      return record
    },

    async submitReconciliationAction(
      input: ReconciliationExceptionActionInput
    ): Promise<ReconciliationExceptionQueueItem> {
      if (!input.actor_id || input.actor_id.trim() === '') {
        throw new Error('actor_id is required')
      }
      if (!input.rationale || input.rationale.trim() === '') {
        throw new Error('rationale is required')
      }

      await syncExceptions()
      const item = exceptions.find((i) => i.reconciliation_id === input.reconciliation_id)
      if (!item) {
        throw new Error(`Unknown reconciliation exception: ${input.reconciliation_id}`)
      }
      if (item.assignment_state === 'RESOLVED') {
        throw new Error(`Reconciliation exception ${input.reconciliation_id} is already resolved`)
      }

      record(item, {
        reconciliation_id: item.reconciliation_id,
        action: input.action,
        actor: input.actor_id,
        note: input.rationale,
        timestamp: now()
      })
      save()
      return structuredClone(item)
    },

    async reset(): Promise<void> {
      seed()
      stored = null
      if (storageKey) removeSessionState(storageKey)
      await emailDetail.reset()
    }
  }
}

export const defaultReviewQueueService = createPreparedReviewQueueService({
  storageKey: EXCEPTION_ACTIONS_STORAGE_KEY
})
