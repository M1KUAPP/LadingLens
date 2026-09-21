import type { Category, ComparedField, ReviewReason, Status } from '../../domain/contracts'
import type { FieldVerdictRecord } from '../email-detail/types'

export type JudgePolicy = {
  accepted_formats: string[]
  max_file_bytes: number
  data_policy: string
  confirmation_required: boolean
}

// The field a document arrived in: numbered when sent unlabelled, as the
// upload page sends them, since the check itself tells the SI from the BL.
export type JudgeDocumentSlot = 'file_1' | 'file_2' | 'si_file' | 'draft_bl_file'

export type JudgeDocumentRole = 'SI' | 'DRAFT_BL' | 'OTHER' | null

export type JudgeDocument = {
  document_id: string
  slot: JudgeDocumentSlot
  file_name: string
  detected_format: string
  byte_size: number
  role: JudgeDocumentRole
  evidence_url: string
}

export type JudgeOutcome = {
  category: Category
  status: Status
  review_reason: ReviewReason | null
  has_defect: boolean
  defect_fields: ComparedField[]
}

export type JudgeDiagnostic = {
  reason: string
  detail: string
  document_role: JudgeDocumentRole
}

export type JudgeFailure = {
  code: string
  retryable: boolean
  message: string
}

export type JudgeRun = {
  run_id: string
  source: 'live'
  state: 'SUCCEEDED' | 'FAILED'
  attempt: number
  created_at: string
  completed_at: string
  latency_ms: number
  documents: JudgeDocument[]
  outcome: JudgeOutcome | null
  field_verdicts: FieldVerdictRecord[]
  diagnostics: JudgeDiagnostic[]
  failure: JudgeFailure | null
}

export type PreparedFallback = {
  label: 'PREPARED FALLBACK'
  source: 'prepared'
  example_id: string
  note: string
  documents: JudgeDocument[]
  outcome: JudgeOutcome
  field_verdicts: FieldVerdictRecord[]
}

export type GateSummary = {
  seed_version: string
  source: 'prepared' | 'recorded'
  gate1: {
    received: number
    accounted: number
    by_category: Record<string, number>
  }
  comparison: Record<Status, number>
  gate2: {
    shipments: number
    outcomes: Record<string, number>
  }
}

export type UploadRejection = {
  slot: string
  reason: string
}
