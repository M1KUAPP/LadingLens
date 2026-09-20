import type { StatusKind } from '../../../components/ui/types'
import { RECONCILIATION_LABEL, REVIEW_REASON_LABEL } from '../../../data/inbox-labels'
import type { ReviewAssignmentState, ReviewQueueItem } from '../types'

export const ASSIGNMENT_STATE_LABEL: Record<ReviewAssignmentState, string> = {
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved'
}

export const KIND_LABEL: Record<ReviewQueueItem['kind'], string> = {
  case: 'Case',
  reconciliation_exception: 'Exception'
}

const KNOWN_REASON_LABELS: Record<string, string> = REVIEW_REASON_LABEL

function humanize(code: string): string {
  const words = code.split('_').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function isHeld(item: ReviewQueueItem): boolean {
  return item.kind === 'case' || item.assignment_state !== 'RESOLVED'
}

export function custodyKind(item: ReviewQueueItem): StatusKind {
  return isHeld(item) ? 'held' : 'match'
}

export function custodyLabel(item: ReviewQueueItem): string {
  if (item.kind === 'case') return 'Needs review'
  return ASSIGNMENT_STATE_LABEL[item.assignment_state]
}

export function reasonLabel(item: ReviewQueueItem): string {
  if (item.kind === 'case') {
    return KNOWN_REASON_LABELS[item.reason] ?? humanize(item.reason)
  }
  return RECONCILIATION_LABEL[item.outcome]
}

export function itemIdentifier(item: ReviewQueueItem): string {
  return item.kind === 'case' ? item.case_id : item.reconciliation_id
}
