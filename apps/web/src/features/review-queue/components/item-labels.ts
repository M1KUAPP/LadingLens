import type { StatusKind } from '../../../components/ui/types'
import { caseLabel } from '../../../data/inbox-labels'
import type { ReviewAssignmentState, ReviewQueueItem } from '../types'

/** Custody without owners: an exception opens and a person moves it on. */
export const ASSIGNMENT_STATE_LABEL: Record<ReviewAssignmentState, string> = {
  ASSIGNED: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved'
}

export const KIND_LABEL: Record<ReviewQueueItem['kind'], string> = {
  case: 'Case',
  reconciliation_exception: 'Exception'
}

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

/** What the row is about: a held case's email, an exception's shipment, or
 * the case an exception cannot place. */
export function itemIdentifier(item: ReviewQueueItem): string {
  if (item.kind === 'case') return item.email_id
  return item.shipment_id ?? caseLabel(item.case_ids[0] ?? item.reconciliation_id)
}

/** The identifier with its kind, since an email can be both a held case and an
 * exception: "Case email_512", "Exception email_512". */
export function itemName(item: ReviewQueueItem): string {
  return `${KIND_LABEL[item.kind]} ${itemIdentifier(item)}`
}
