import type {
  ReconciliationExceptionActionType,
  ReviewAssignmentState,
  ReviewHistoryEntry
} from '../../domain/contracts'
import { createPreparedEmailDetailService, type EmailDetailService } from '../email-detail/seam'
import type { CaseReviewActionInput, EmailDetailRecord } from '../email-detail/types'
import { PREPARED_REVIEW_QUEUE_ITEMS } from './fixtures/review_queue'
import type { ReconciliationExceptionActionInput, ReconciliationExceptionQueueItem, ReviewQueueItem } from './types'

export interface ReviewQueueService {
  getQueueItems(): Promise<ReviewQueueItem[]>
  submitCaseReviewAction(input: CaseReviewActionInput): Promise<EmailDetailRecord>
  submitReconciliationAction(input: ReconciliationExceptionActionInput): Promise<ReconciliationExceptionQueueItem>
  reset(): Promise<void>
}

const ACTION_TO_STATE: Record<ReconciliationExceptionActionType, ReviewAssignmentState> = {
  ASSIGN: 'ASSIGNED',
  ACKNOWLEDGE: 'ACKNOWLEDGED',
  ESCALATE: 'ESCALATED',
  RESOLVE: 'RESOLVED'
}

export function createPreparedReviewQueueService(options?: {
  emailDetailService?: EmailDetailService
  now?: () => string
}): ReviewQueueService {
  const emailDetail = options?.emailDetailService ?? createPreparedEmailDetailService()
  const now = options?.now ?? (() => new Date().toISOString())
  let items: ReviewQueueItem[] = []

  const seed = () => {
    items = structuredClone(PREPARED_REVIEW_QUEUE_ITEMS)
  }
  seed()

  return {
    async getQueueItems(): Promise<ReviewQueueItem[]> {
      return structuredClone(items)
    },

    async submitCaseReviewAction(input: CaseReviewActionInput): Promise<EmailDetailRecord> {
      const item = items.find((i) => i.kind === 'case' && i.case_id === input.case_id)
      if (!item) {
        throw new Error(`Case ${input.case_id} is not in the review queue`)
      }
      const record = await emailDetail.submitReviewAction(input)
      items = items.filter((i) => i !== item)
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
      if (input.action === 'ASSIGN' && (!input.assigned_owner_id || input.assigned_owner_id.trim() === '')) {
        throw new Error('assigned_owner_id is required for ASSIGN')
      }

      const item = items.find(
        (i): i is ReconciliationExceptionQueueItem =>
          i.kind === 'reconciliation_exception' && i.reconciliation_id === input.reconciliation_id
      )
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
      if (input.action === 'ASSIGN' && input.assigned_owner_id) {
        item.assigned_owner = input.assigned_owner_id
      }
      return structuredClone(item)
    },

    async reset(): Promise<void> {
      seed()
      await emailDetail.reset()
    }
  }
}

export const defaultReviewQueueService = createPreparedReviewQueueService()
