export type Category = 'BL_COMPARISON' | 'SI_REQUEST' | 'INVOICE_QUERY' | 'GENERAL' | 'SPAM'

export type Status = 'OK' | 'MISMATCH' | 'NEEDS_REVIEW'

export type ReviewReason = 'wrong_doc_type' | 'missing_attachment' | 'unreadable' | 'missing_value'

export type ComparedField =
  | 'shipper'
  | 'consignee'
  | 'notify_party'
  | 'port_of_loading'
  | 'port_of_discharge'
  | 'container_count'
  | 'gross_weight_kg'

export type ReconciliationOutcome =
  'CASE_PRESENT' | 'DOCUMENT_MISSING' | 'MISSING_CASE' | 'UNMATCHED_CASE' | 'DUPLICATE_OR_AMBIGUOUS' | 'SOURCE_STALE'

export type RequiredDocument = 'SI' | 'DRAFT_BL'

export type SourceFreshness = 'CURRENT' | 'STALE'

export type ExpectedShipment = {
  shipment_id: string
  booking_reference?: string
  external_identifiers: Record<string, string>
  lifecycle: string
  required_documents: RequiredDocument[]
  cutoff_at?: string
  owner: string
  source_updated_at: string
  source_freshness: SourceFreshness
  source_hash: string
}

export type ReconciliationBase = {
  reconciliation_id: string
  reconciliation_run_id: string
  subject_key: string
  match_basis: string[]
  source_freshness: SourceFreshness
  reviewed_at?: string
  created_at: string
}

export type ShipmentBackedReconciliation = ReconciliationBase & {
  outcome: 'CASE_PRESENT' | 'DOCUMENT_MISSING' | 'SOURCE_STALE'
  shipment_id: string
  case_ids: string[]
}

export type MissingCaseReconciliation = ReconciliationBase & {
  outcome: 'MISSING_CASE'
  shipment_id: string
  case_ids: []
}

export type UnmatchedCaseReconciliation = ReconciliationBase & {
  outcome: 'UNMATCHED_CASE'
  shipment_id?: never
  case_ids: [string, ...string[]]
}

export type AmbiguousReconciliation = ReconciliationBase & {
  outcome: 'DUPLICATE_OR_AMBIGUOUS'
  shipment_id?: never
  case_ids?: never
  candidate_shipment_ids: [string, ...string[]]
  candidate_case_ids: [string, ...string[]]
}

export type ReconciliationResult =
  ShipmentBackedReconciliation | MissingCaseReconciliation | UnmatchedCaseReconciliation | AmbiguousReconciliation

export type CaseReviewTarget = {
  target_type: 'CASE'
  case_id: string
}

export type ReconciliationExceptionReviewTarget = {
  target_type: 'RECONCILIATION_EXCEPTION'
  reconciliation_id: string
}

export type ReviewTarget = CaseReviewTarget | ReconciliationExceptionReviewTarget

export type ReviewAssignmentState = 'ASSIGNED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED'

export type ReviewAssignment = {
  review_assignment_id: string
  target: ReviewTarget
  assigned_owner_id: string
  state: ReviewAssignmentState
  created_at: string
}

export type CaseReviewAction = {
  review_action_id: string
  target: CaseReviewTarget
  actor_id: string
  action: 'APPROVE' | 'CORRECT' | 'REJECT'
  rationale: string
  corrected_fields: Partial<Record<ComparedField, string | number>> | undefined
  created_at: string
}

export type ReconciliationExceptionActionType = 'ASSIGN' | 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE'

export type ReconciliationExceptionReviewAction = {
  review_action_id: string
  target: ReconciliationExceptionReviewTarget
  actor_id: string
  action: ReconciliationExceptionActionType
  rationale: string
  assigned_owner_id: string | undefined
  created_at: string
}

export type ReviewAction = CaseReviewAction | ReconciliationExceptionReviewAction

export type ReviewHistoryEntry = {
  id: string
  timestamp: string
  actor: string
  action: string
  note?: string
}

export function reconciliationResultProblems(result: ReconciliationResult): string[] {
  const problems: string[] = []
  if (!result.reconciliation_id) problems.push('reconciliation_id is required')
  if (!result.reconciliation_run_id) problems.push('reconciliation_run_id is required')
  if (!result.subject_key) problems.push('subject_key is required')

  switch (result.outcome) {
    case 'CASE_PRESENT':
      if (!result.shipment_id) problems.push('CASE_PRESENT requires a shipment id')
      if (result.case_ids.length === 0) problems.push('CASE_PRESENT requires at least one case id')
      if (result.source_freshness !== 'CURRENT') problems.push('CASE_PRESENT cannot come from a stale source')
      break
    case 'DOCUMENT_MISSING':
      if (!result.shipment_id) problems.push('DOCUMENT_MISSING requires a shipment id')
      if (result.case_ids.length === 0) problems.push('DOCUMENT_MISSING requires at least one case id')
      break
    case 'SOURCE_STALE':
      if (!result.shipment_id) problems.push('SOURCE_STALE requires a shipment id')
      if (result.source_freshness !== 'STALE') problems.push('SOURCE_STALE requires a stale source')
      break
    case 'MISSING_CASE':
      if (!result.shipment_id) problems.push('MISSING_CASE requires a shipment id')
      if (result.case_ids.length !== 0) problems.push('MISSING_CASE must have an empty case side')
      break
    case 'UNMATCHED_CASE':
      if (result.shipment_id !== undefined) problems.push('UNMATCHED_CASE must not carry a shipment id')
      if (result.case_ids.length === 0) problems.push('UNMATCHED_CASE requires at least one case id')
      break
    case 'DUPLICATE_OR_AMBIGUOUS':
      if (result.shipment_id !== undefined) problems.push('DUPLICATE_OR_AMBIGUOUS must not carry a shipment id')
      if (result.case_ids !== undefined) problems.push('DUPLICATE_OR_AMBIGUOUS must not carry direct case ids')
      if (result.candidate_shipment_ids.length === 0)
        problems.push('DUPLICATE_OR_AMBIGUOUS requires candidate shipment ids')
      if (result.candidate_case_ids.length === 0) problems.push('DUPLICATE_OR_AMBIGUOUS requires candidate case ids')
      break
  }
  return problems
}
