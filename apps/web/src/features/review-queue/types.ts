import type {
  CaseReviewTarget,
  ReconciliationExceptionReviewTarget,
  ReconciliationExceptionActionType,
  ReconciliationOutcome,
  ReviewAssignmentState,
  ReviewHistoryEntry
} from '../../domain/contracts'

export type {
  CaseReviewTarget,
  ReconciliationExceptionReviewTarget,
  ReconciliationExceptionActionType,
  ReviewAssignment,
  ReviewAssignmentState,
  ReviewHistoryEntry,
  ReviewTarget
} from '../../domain/contracts'

export type ReconciliationExceptionOutcome = Exclude<ReconciliationOutcome, 'CASE_PRESENT'>

/** What a person can do with an exception here. The demo has no team, so
 * there is no one to assign it to. */
export type ReconciliationExceptionAction = Exclude<ReconciliationExceptionActionType, 'ASSIGN'>

export type CaseQueueItem = {
  kind: 'case'
  item_id: string
  target: CaseReviewTarget
  case_id: string
  email_id: string
  status: 'NEEDS_REVIEW'
  reason: string
  evidence_summary: string
  created_at: string
  history: ReviewHistoryEntry[]
}

export type ReconciliationExceptionQueueItem = {
  kind: 'reconciliation_exception'
  item_id: string
  target: ReconciliationExceptionReviewTarget
  reconciliation_id: string
  outcome: ReconciliationExceptionOutcome
  subject_key: string
  shipment_id?: string
  candidate_shipment_ids: string[]
  case_ids: string[]
  assignment_state: ReviewAssignmentState
  created_at: string
  history: ReviewHistoryEntry[]
}

export type ReviewQueueItem = CaseQueueItem | ReconciliationExceptionQueueItem

export type ReconciliationExceptionActionInput = {
  reconciliation_id: string
  actor_id: string
  action: ReconciliationExceptionAction
  rationale: string
}
