import type { ReconciliationResult } from '../../../domain/contracts'
import { PREPARED_FIXTURES } from '../../email-detail/fixtures'
import { PREPARED_RECONCILIATION_RESULTS } from '../../reconciliation/fixtures/prepared'
import type { ReconciliationExceptionOutcome, ReviewQueueItem } from '../types'

const EXCEPTION_OWNERS: Record<string, string> = {
  rec_shp_doc_507: 'Hafiz Tan',
  rec_syn_042: 'Aisyah Razak',
  rec_shp_stale_013: 'Elena Rostova',
  rec_booking_i978820812: 'Marcus Vance'
}

const UNASSIGNED_EXCEPTION_OWNER = 'Aisyah Razak'

function exceptionItem(result: ReconciliationResult): ReviewQueueItem | null {
  if (result.outcome === 'CASE_PRESENT') return null
  const owner = EXCEPTION_OWNERS[result.reconciliation_id] ?? UNASSIGNED_EXCEPTION_OWNER
  const itemId = `rq_${result.reconciliation_id}`
  const caseIds =
    'case_ids' in result && result.case_ids
      ? [...result.case_ids]
      : 'candidate_case_ids' in result
        ? [...result.candidate_case_ids]
        : []
  return {
    kind: 'reconciliation_exception',
    item_id: itemId,
    target: {
      target_type: 'RECONCILIATION_EXCEPTION',
      reconciliation_id: result.reconciliation_id
    },
    reconciliation_id: result.reconciliation_id,
    outcome: result.outcome as ReconciliationExceptionOutcome,
    subject_key: result.subject_key,
    shipment_id: 'shipment_id' in result ? result.shipment_id : undefined,
    case_ids: caseIds,
    assigned_owner: owner,
    assignment_state: 'ASSIGNED',
    created_at: result.created_at,
    history: [
      {
        id: `hist_${itemId}_1`,
        timestamp: result.created_at,
        actor: 'System',
        action: 'ASSIGNED',
        note: `Assigned to ${owner}`
      }
    ]
  }
}

export const PREPARED_REVIEW_QUEUE_ITEMS: ReviewQueueItem[] = [
  ...Object.values(PREPARED_FIXTURES).flatMap((record): ReviewQueueItem[] => {
    const held = record.held_review
    if (record.status !== 'NEEDS_REVIEW' || !held) return []
    return [
      {
        kind: 'case',
        item_id: `rq_${held.case_id}`,
        target: { target_type: 'CASE', case_id: held.case_id },
        case_id: held.case_id,
        email_id: record.email_id,
        status: 'NEEDS_REVIEW',
        reason: held.review_reason ?? 'semantic_ambiguity',
        evidence_summary: held.evidence_summary,
        assigned_owner: held.assigned_owner,
        created_at: held.history[0]?.timestamp ?? held.immutable_source.received_at,
        history: structuredClone(held.history)
      }
    ]
  }),
  ...PREPARED_RECONCILIATION_RESULTS.flatMap((result): ReviewQueueItem[] => {
    const item = exceptionItem(result)
    return item ? [item] : []
  })
]
