import type { Category, ComparedField, ReconciliationOutcome, ReviewReason, Status } from '../domain/contracts'

export type { Category, ComparedField, ReconciliationOutcome, ReviewReason }

export type CaseStatus = Status

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
  unmatchedCaseCount?: number
}

export type InboxLoadResult = { kind: 'ready'; dataset: InboxDataset } | { kind: 'error'; problems: string[] }

export interface InboxSource {
  load(): Promise<InboxLoadResult>
}
