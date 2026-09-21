import type { StatusKind } from '../../../components/ui/types'
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

/** The demo's seeded owner (`demo_owner_id` in the API) is an account, not a
 * named person, so the queue shows its cases as unassigned. */
const DEMO_OWNER_ID = 'docs-demo'

function humanize(code: string): string {
  const words = code.toLowerCase().split('_').join(' ')
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

/** A held case's review reason and an exception's outcome, both in words. */
export function reasonLabel(item: ReviewQueueItem): string {
  return humanize(item.kind === 'case' ? item.reason : item.outcome)
}

export function ownerLabel(item: ReviewQueueItem): string {
  return item.assigned_owner === DEMO_OWNER_ID ? 'Unassigned' : item.assigned_owner
}

export function itemIdentifier(item: ReviewQueueItem): string {
  return item.kind === 'case' ? item.case_id : item.reconciliation_id
}
