import type { Category, ComparedField, ReviewHistoryEntry, ReviewReason, Status } from '../../domain/contracts'

export type { Category, ComparedField, ReviewHistoryEntry, ReviewReason, Status }

export type DocumentType = 'SI' | 'DRAFT_BL' | 'COMMERCIAL_INVOICE' | 'UNKNOWN'

export type AttachmentParseState = 'PARSED' | 'MISSING' | 'UNREADABLE' | 'REJECTED'

export type TxtLocation = {
  kind: 'txt'
  line: number
  start_col: number
  end_col: number
}

export type DigitalPdfLocation = {
  kind: 'digital_pdf'
  page: number
  bbox: [number, number, number, number]
  approximate: false
}

export type ScannedPdfLocation = {
  kind: 'scanned_pdf'
  page: number
  approximate: true
  region: 'header' | 'party' | 'routing' | 'cargo' | 'footer'
}

export type DocxTableLocation = {
  kind: 'docx_table'
  table_index: number
  row_index: number
  col_index: number
}

export type DocxParagraphLocation = {
  kind: 'docx_paragraph'
  paragraph_index: number
}

export type DocxLocation = DocxTableLocation | DocxParagraphLocation

export type XlsxLocation = {
  kind: 'xlsx'
  sheet: string
  cell: string
}

export type Location = TxtLocation | DigitalPdfLocation | ScannedPdfLocation | DocxLocation | XlsxLocation

export type TxtProvenance = {
  attachment_id: string
  file_name: string
  format: 'txt'
  location: TxtLocation
}

export type DigitalPdfProvenance = {
  attachment_id: string
  file_name: string
  format: 'digital_pdf'
  location: DigitalPdfLocation
}

export type ScannedPdfProvenance = {
  attachment_id: string
  file_name: string
  format: 'scanned_pdf'
  location: ScannedPdfLocation
}

export type DocxProvenance = {
  attachment_id: string
  file_name: string
  format: 'docx'
  location: DocxLocation
}

export type XlsxProvenance = {
  attachment_id: string
  file_name: string
  format: 'xlsx'
  location: XlsxLocation
}

export type UnreadableProvenance = {
  attachment_id: string
  file_name: string
  format: 'txt' | 'pdf' | 'docx' | 'xlsx' | 'unknown'
  parse_error: string
  location?: never
}

export type Provenance =
  TxtProvenance | DigitalPdfProvenance | ScannedPdfProvenance | DocxProvenance | XlsxProvenance | UnreadableProvenance

export type ExtractedValue = {
  field: ComparedField
  raw_value?: string
  normalized_value?: string | number
  confidence?: number
  provenance: Provenance
}

export type FieldVerdictRecord = {
  field: ComparedField
  si: ExtractedValue
  draft_bl: ExtractedValue
  verdict: 'MATCH' | 'MISMATCH' | 'REVIEW'
  semantic_probability?: number
  reason?: string
}

export type AttachmentPreflightItem = {
  attachment_id: string
  file_name: string
  detected_format: string
  document_type: DocumentType
  parse_state: AttachmentParseState
  byte_size?: number
  error?: string
}

export type ImmutableEmailSource = {
  email_id: string
  sender: string
  subject: string
  received_at: string
  message_hash: string
}

export type CaseReviewDetails = {
  case_id: string
  email_id: string
  status: Status
  review_reason?: ReviewReason
  probability?: number
  assigned_owner: string
  disposition: string
  immutable_source: ImmutableEmailSource
  evidence_summary: string
  history: ReviewHistoryEntry[]
}

export type RetainedEvidence = {
  label: string
  text: string
  location_description?: string
}

export type EmailDetailRecord = {
  email_id: string
  is_prepared: true
  category: Category
  status: Status
  review_reason?: ReviewReason
  attachments: AttachmentPreflightItem[]
  field_verdicts: FieldVerdictRecord[]
  held_review?: CaseReviewDetails
  retained_evidence?: RetainedEvidence
}

export type CaseReviewActionInput = {
  case_id: string
  action: 'APPROVE' | 'CORRECT' | 'REJECT'
  rationale: string
  actor_id: string
  corrected_fields?: Partial<Record<ComparedField, string | number>>
}
