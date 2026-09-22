import type { ReviewAssignmentState, ReviewHistoryEntry } from '../../domain/contracts'
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

export function createPreparedReviewQueueService(options?: {
  emailDetailService?: EmailDetailService
  reconciliationService?: ReconciliationService
  now?: () => string
}): ReviewQueueService {
  const emailDetail = options?.emailDetailService ?? createPreparedEmailDetailService()
  const reconciliation = options?.reconciliationService ?? defaultReconciliationService
  const now = options?.now ?? (() => new Date().toISOString())
  let cases: CaseQueueItem[] = []
  let exceptions: ReconciliationExceptionQueueItem[] = []
  let runId: string | undefined

  const seed = () => {
    cases = structuredClone(PREPARED_CASE_ITEMS)
    exceptions = []
    runId = undefined
  }
  seed()

  // Exceptions come from the latest reconciliation run: none before a run,
  // and a new run replaces the last one's.
  async function syncExceptions() {
    const results = await reconciliation.getReconciliationResults()
    const latest = results[0]?.reconciliation_run_id
    if (latest === runId) return
    runId = latest
    exceptions = results.flatMap((result) => exceptionItem(result) ?? [])
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

      const entry: ReviewHistoryEntry = {
        id: `hist_${item.item_id}_${item.history.length + 1}`,
        timestamp: now(),
        actor: input.actor_id,
        action: input.action,
        note: input.rationale
      }
      item.history = [...item.history, entry]
      item.assignment_state = ACTION_TO_STATE[input.action]
      return structuredClone(item)
    },

    async reset(): Promise<void> {
      seed()
      await emailDetail.reset()
    }
  }
}

export const defaultReviewQueueService = createPreparedReviewQueueService()
