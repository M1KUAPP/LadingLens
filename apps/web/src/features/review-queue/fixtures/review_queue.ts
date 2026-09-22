import type { ReconciliationResult } from '../../../domain/contracts'
import { formatRunId } from '../../reconciliation/reconcile'
import type { CaseQueueItem, ReconciliationExceptionQueueItem } from '../types'
import heldText from './held_cases.json?raw'

type HeldCase = {
  case_id: string
  email_id: string
  review_reason: string
  evidence_summary: string
  received_at: string
}

/** The seed's cases held for a person, written by apps/api/scripts/build_web_fixtures.py. */
export const PREPARED_CASE_ITEMS: CaseQueueItem[] = (JSON.parse(heldText) as HeldCase[]).map((held) => ({
  kind: 'case',
  item_id: `rq_${held.case_id}`,
  target: { target_type: 'CASE', case_id: held.case_id },
  case_id: held.case_id,
  email_id: held.email_id,
  status: 'NEEDS_REVIEW',
  reason: held.review_reason,
  evidence_summary: held.evidence_summary,
  created_at: held.received_at,
  history: []
}))

/** A run's result as a queue item; a clear match needs no one. */
export function exceptionItem(result: ReconciliationResult): ReconciliationExceptionQueueItem | null {
  if (result.outcome === 'CASE_PRESENT') return null
  const itemId = `rq_${result.reconciliation_id}`
  const sides =
    result.outcome === 'DUPLICATE_OR_AMBIGUOUS'
      ? { candidate_shipment_ids: [...result.candidate_shipment_ids], case_ids: [...result.candidate_case_ids] }
      : { shipment_id: result.shipment_id, candidate_shipment_ids: [], case_ids: [...result.case_ids] }
  return {
    kind: 'reconciliation_exception',
    item_id: itemId,
    target: { target_type: 'RECONCILIATION_EXCEPTION', reconciliation_id: result.reconciliation_id },
    reconciliation_id: result.reconciliation_id,
    outcome: result.outcome,
    subject_key: result.subject_key,
    ...sides,
    assignment_state: 'ASSIGNED',
    created_at: result.created_at,
    history: [
      {
        id: `hist_${itemId}_1`,
        timestamp: result.created_at,
        actor: 'System',
        action: 'OPENED',
        note: `Reconciliation run ${formatRunId(result.reconciliation_run_id)}`
      }
    ]
  }
}
