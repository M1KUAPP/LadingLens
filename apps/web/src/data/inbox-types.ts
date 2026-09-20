export type Category =
  | 'BL_COMPARISON'
  | 'SI_REQUEST'
  | 'INVOICE_QUERY'
  | 'GENERAL'
  | 'SPAM'

export type CaseStatus = 'OK' | 'MISMATCH' | 'NEEDS_REVIEW'

export type ReviewReason =
  | 'wrong_doc_type'
  | 'missing_attachment'
  | 'unreadable'
  | 'missing_value'

export type ComparedField =
  | 'shipper'
  | 'consignee'
  | 'notify_party'
  | 'port_of_loading'
  | 'port_of_discharge'
  | 'container_count'
  | 'gross_weight_kg'

export type ReconciliationOutcome =
  | 'CASE_PRESENT'
  | 'DOCUMENT_MISSING'
  | 'MISSING_CASE'
  | 'UNMATCHED_CASE'
  | 'DUPLICATE_OR_AMBIGUOUS'
  | 'SOURCE_STALE'

export type EvaluatorRecord = {
  category: Category
  status: CaseStatus
  review_reason: ReviewReason | null
  has_defect: boolean
  defect_fields: ComparedField[]
}

export type InboxOutcome = {
  category: Category
  status: CaseStatus
  review_reason: ReviewReason | null
}

export type InboxRow = {
  email_id: string
  sender: string
  subject: string
  attachments: string[]
  outcome: InboxOutcome
}

export type ReconciliationEntry = {
  shipment_id: string
  booking_reference: string
  lifecycle: string
  outcome: ReconciliationOutcome
  linked_email_id: string | null
}

export type InboxDataset = {
  source: 'prepared-fixture'
  receivedCount: number
  rows: InboxRow[]
  artifact: Record<string, EvaluatorRecord>
  artifactUrl: string
  reconciliation: ReconciliationEntry[]
}

export type InboxLoadResult =
  | { kind: 'ready'; dataset: InboxDataset }
  | { kind: 'error'; problems: string[] }

export interface InboxSource {
  load(): Promise<InboxLoadResult>
}
