import { ApiError, apiJson } from '../../lib/api'
import type { EmailDetailService } from './seam'
import type {
  AttachmentParseState,
  AttachmentPreflightItem,
  CaseReviewActionInput,
  CaseReviewDetails,
  Category,
  ComparedField,
  DocxLocation,
  DocumentType,
  EmailDetailRecord,
  ExtractedValue,
  FieldVerdictRecord,
  Location,
  Provenance,
  ReviewHistoryEntry,
  ReviewReason,
  Status
} from './types'

// A payload that fails validation throws this so a drifted API contract fails
// visibly instead of being masked by the fixture fallback.
export class EmailDetailContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailDetailContractError'
  }
}

function fail(path: string, expected: string): never {
  throw new EmailDetailContractError(
    `email detail payload: ${path} must be ${expected}`
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function reqString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'a string')
  return value
}

function optString(value: unknown, path: string): string | undefined {
  if (value == null) return undefined
  return reqString(value, path)
}

function reqNumber(value: unknown, path: string): number {
  if (typeof value !== 'number') fail(path, 'a number')
  return value
}

function optNumber(value: unknown, path: string): number | undefined {
  if (value == null) return undefined
  return reqNumber(value, path)
}

function reqBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'a boolean')
  return value
}

function reqArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'an array')
  return value
}

function reqObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) fail(path, 'an object')
  return value
}

function oneOf<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  path: string
): T {
  if (typeof value !== 'string' || !allowed.has(value as T)) {
    fail(path, `one of ${[...allowed].join(', ')}`)
  }
  return value as T
}

function optOneOf<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  path: string
): T | undefined {
  if (value == null) return undefined
  return oneOf(value, allowed, path)
}

const CATEGORIES = new Set<Category>([
  'BL_COMPARISON',
  'SI_REQUEST',
  'INVOICE_QUERY',
  'GENERAL',
  'SPAM'
])
const STATUSES = new Set<Status>(['OK', 'MISMATCH', 'NEEDS_REVIEW'])
const REVIEW_REASONS = new Set<ReviewReason>([
  'wrong_doc_type',
  'missing_attachment',
  'unreadable',
  'missing_value'
])
const COMPARED_FIELDS = new Set<ComparedField>([
  'shipper',
  'consignee',
  'notify_party',
  'port_of_loading',
  'port_of_discharge',
  'container_count',
  'gross_weight_kg'
])
const DOCUMENT_TYPES = new Set<DocumentType>([
  'SI',
  'DRAFT_BL',
  'COMMERCIAL_INVOICE',
  'UNKNOWN'
])
const PARSE_STATES = new Set<AttachmentParseState>([
  'PARSED',
  'MISSING',
  'UNREADABLE',
  'REJECTED'
])
const VERDICTS = new Set<FieldVerdictRecord['verdict']>([
  'MATCH',
  'MISMATCH',
  'REVIEW'
])
const UNREADABLE_FORMATS = new Set<UnreadableFormat>([
  'txt',
  'pdf',
  'docx',
  'xlsx',
  'unknown'
])
const SCAN_REGIONS = new Set<ScannedRegion>([
  'header',
  'party',
  'routing',
  'cargo',
  'footer'
])

type UnreadableFormat = 'txt' | 'pdf' | 'docx' | 'xlsx' | 'unknown'
type ScannedRegion = 'header' | 'party' | 'routing' | 'cargo' | 'footer'

function mapLocation(value: unknown, path: string): Location {
  const location = reqObject(value, path)
  const kind = reqString(location.kind, `${path}.kind`)
  switch (kind) {
    case 'txt':
      return {
        kind,
        line: reqNumber(location.line, `${path}.line`),
        start_col: reqNumber(location.start_col, `${path}.start_col`),
        end_col: reqNumber(location.end_col, `${path}.end_col`)
      }
    case 'digital_pdf':
      return {
        kind,
        page: reqNumber(location.page, `${path}.page`),
        bbox: mapBbox(location.bbox, `${path}.bbox`),
        approximate: false
      }
    case 'scanned_pdf':
      return {
        kind,
        page: reqNumber(location.page, `${path}.page`),
        approximate: mapApproximate(location.approximate, `${path}.approximate`),
        region: oneOf(location.region, SCAN_REGIONS, `${path}.region`)
      }
    case 'docx_table':
      return {
        kind,
        table_index: reqNumber(location.table_index, `${path}.table_index`),
        row_index: reqNumber(location.row_index, `${path}.row_index`),
        col_index: reqNumber(location.col_index, `${path}.col_index`)
      }
    case 'docx_paragraph':
      return {
        kind,
        paragraph_index: reqNumber(
          location.paragraph_index,
          `${path}.paragraph_index`
        )
      }
    case 'xlsx':
      return {
        kind,
        sheet: reqString(location.sheet, `${path}.sheet`),
        cell: reqString(location.cell, `${path}.cell`)
      }
    default:
      return fail(`${path}.kind`, 'a known location kind')
  }
}

function mapBbox(
  value: unknown,
  path: string
): [number, number, number, number] {
  const bbox = reqArray(value, path)
  if (bbox.length !== 4) fail(path, 'four numbers')
  return bbox.map((item) => reqNumber(item, path)) as [
    number,
    number,
    number,
    number
  ]
}

function mapApproximate(value: unknown, path: string): true {
  if (value !== true) fail(path, 'true')
  return value
}

function mapDocxLocation(location: Location, path: string): DocxLocation {
  if (location.kind !== 'docx_table' && location.kind !== 'docx_paragraph') {
    fail(path, 'a docx_table or docx_paragraph location')
  }
  return location
}

function mapProvenance(value: unknown, path: string): Provenance {
  const provenance = reqObject(value, path)
  const attachment_id = reqString(
    provenance.attachment_id,
    `${path}.attachment_id`
  )
  const file_name = reqString(provenance.file_name, `${path}.file_name`)

  // Same discriminator the API uses: parse_error marks an unreadable
  // attachment whatever the recorded format is (e.g. 'pdf', not
  // 'digital_pdf').
  if ('parse_error' in provenance) {
    return {
      attachment_id,
      file_name,
      format: oneOf(provenance.format, UNREADABLE_FORMATS, `${path}.format`),
      parse_error: reqString(provenance.parse_error, `${path}.parse_error`)
    }
  }

  const format = reqString(provenance.format, `${path}.format`)
  const location = mapLocation(provenance.location, `${path}.location`)
  switch (format) {
    case 'txt':
      if (location.kind !== 'txt') fail(`${path}.location.kind`, 'txt')
      return { attachment_id, file_name, format, location }
    case 'digital_pdf':
      if (location.kind !== 'digital_pdf')
        fail(`${path}.location.kind`, 'digital_pdf')
      return { attachment_id, file_name, format, location }
    case 'scanned_pdf':
      if (location.kind !== 'scanned_pdf')
        fail(`${path}.location.kind`, 'scanned_pdf')
      return { attachment_id, file_name, format, location }
    case 'docx':
      return {
        attachment_id,
        file_name,
        format,
        location: mapDocxLocation(location, `${path}.location`)
      }
    case 'xlsx':
      if (location.kind !== 'xlsx') fail(`${path}.location.kind`, 'xlsx')
      return { attachment_id, file_name, format, location }
    default:
      return fail(`${path}.format`, 'a known provenance format')
  }
}

function mapExtractedValue(value: unknown, path: string): ExtractedValue {
  const extracted = reqObject(value, path)
  const normalized = extracted.normalized_value
  if (
    normalized != null &&
    typeof normalized !== 'string' &&
    typeof normalized !== 'number'
  ) {
    fail(`${path}.normalized_value`, 'a string or number')
  }
  return {
    field: oneOf(extracted.field, COMPARED_FIELDS, `${path}.field`),
    raw_value: optString(extracted.raw_value, `${path}.raw_value`),
    normalized_value: normalized ?? undefined,
    confidence: optNumber(extracted.confidence, `${path}.confidence`),
    provenance: mapProvenance(extracted.provenance, `${path}.provenance`)
  }
}

function mapFieldVerdict(value: unknown, path: string): FieldVerdictRecord {
  const verdict = reqObject(value, path)
  return {
    field: oneOf(verdict.field, COMPARED_FIELDS, `${path}.field`),
    si: mapExtractedValue(verdict.si, `${path}.si`),
    draft_bl: mapExtractedValue(verdict.draft_bl, `${path}.draft_bl`),
    verdict: oneOf(verdict.verdict, VERDICTS, `${path}.verdict`),
    semantic_probability: optNumber(
      verdict.semantic_probability,
      `${path}.semantic_probability`
    ),
    reason: optString(verdict.reason, `${path}.reason`)
  }
}

function mapAttachment(value: unknown, path: string): AttachmentPreflightItem {
  const attachment = reqObject(value, path)
  return {
    attachment_id: reqString(
      attachment.attachment_id,
      `${path}.attachment_id`
    ),
    file_name: reqString(attachment.file_name, `${path}.file_name`),
    detected_format: reqString(
      attachment.detected_format,
      `${path}.detected_format`
    ),
    document_type: oneOf(
      attachment.document_type,
      DOCUMENT_TYPES,
      `${path}.document_type`
    ),
    parse_state: oneOf(
      attachment.parse_state,
      PARSE_STATES,
      `${path}.parse_state`
    ),
    byte_size: optNumber(attachment.byte_size, `${path}.byte_size`),
    error: optString(attachment.error, `${path}.error`)
  }
}

function mapHistoryEntry(value: unknown, path: string): ReviewHistoryEntry {
  const entry = reqObject(value, path)
  return {
    id: reqString(entry.id, `${path}.id`),
    timestamp: reqString(entry.timestamp, `${path}.timestamp`),
    actor: reqString(entry.actor, `${path}.actor`),
    action: reqString(entry.action, `${path}.action`),
    note: optString(entry.note, `${path}.note`)
  }
}

function mapHeldReview(
  value: unknown,
  path: string
): CaseReviewDetails | undefined {
  if (value == null) return undefined
  const review = reqObject(value, path)
  const source = reqObject(
    review.immutable_source,
    `${path}.immutable_source`
  )
  return {
    case_id: reqString(review.case_id, `${path}.case_id`),
    email_id: reqString(review.email_id, `${path}.email_id`),
    status: oneOf(review.status, STATUSES, `${path}.status`),
    review_reason: optOneOf(
      review.review_reason,
      REVIEW_REASONS,
      `${path}.review_reason`
    ),
    probability: optNumber(review.probability, `${path}.probability`),
    assigned_owner: reqString(
      review.assigned_owner,
      `${path}.assigned_owner`
    ),
    disposition: reqString(review.disposition, `${path}.disposition`),
    immutable_source: {
      email_id: reqString(source.email_id, `${path}.immutable_source.email_id`),
      sender: reqString(source.sender, `${path}.immutable_source.sender`),
      subject: reqString(source.subject, `${path}.immutable_source.subject`),
      received_at: reqString(
        source.received_at,
        `${path}.immutable_source.received_at`
      ),
      message_hash: reqString(
        source.message_hash,
        `${path}.immutable_source.message_hash`
      )
    },
    evidence_summary: reqString(
      review.evidence_summary,
      `${path}.evidence_summary`
    ),
    history: reqArray(review.history, `${path}.history`).map((entry, index) =>
      mapHistoryEntry(entry, `${path}.history[${index}]`)
    )
  }
}

// The wire shape is app/api/views.py::email_detail_view. Fields the record
// type does not declare (sender, subject, received_at) are ignored; every
// declared field is checked so a drifted payload fails here, not in the UI.
export function mapEmailDetailView(payload: unknown): EmailDetailRecord {
  const view = reqObject(payload, 'email_detail_view')
  return {
    email_id: reqString(view.email_id, 'email_id'),
    is_prepared: reqBoolean(view.is_prepared, 'is_prepared'),
    source: optString(view.source, 'source'),
    category: oneOf(view.category, CATEGORIES, 'category'),
    status: oneOf(view.status, STATUSES, 'status'),
    review_reason: optOneOf(
      view.review_reason,
      REVIEW_REASONS,
      'review_reason'
    ),
    attachments: reqArray(view.attachments, 'attachments').map(
      (item, index) => mapAttachment(item, `attachments[${index}]`)
    ),
    field_verdicts: reqArray(view.field_verdicts, 'field_verdicts').map(
      (item, index) => mapFieldVerdict(item, `field_verdicts[${index}]`)
    ),
    held_review: mapHeldReview(view.held_review, 'held_review')
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// Only availability failures fall back to the fixture. Contract drift,
// aborts, and the API's own rejections (409 already settled, 422 invalid
// input) propagate — quietly substituting fixture state for those would lie
// about what the server did.
function fallsBackOnAction(error: unknown): boolean {
  if (isAbortError(error) || error instanceof EmailDetailContractError) {
    return false
  }
  return !(error instanceof ApiError) || error.status === 404
}

export function createApiEmailDetailService(
  fallback?: EmailDetailService
): EmailDetailService {
  return {
    async getEmailDetail(emailId: string): Promise<EmailDetailRecord | null> {
      try {
        return mapEmailDetailView(
          await apiJson<unknown>(`/api/emails/${encodeURIComponent(emailId)}`)
        )
      } catch (error) {
        // Contract drift and aborts must surface, not swap to fixture data.
        if (error instanceof EmailDetailContractError || isAbortError(error)) {
          throw error
        }
        // An ApiError 404 means the API never seeded this id; any other
        // thrown error means the API is unavailable. Either way the prepared
        // fixture covers the gap so the demo survives offline.
        if (!fallback) {
          if (error instanceof ApiError && error.status === 404) return null
          throw error
        }
        return fallback.getEmailDetail(emailId)
      }
    },

    async submitReviewAction(
      input: CaseReviewActionInput
    ): Promise<EmailDetailRecord> {
      try {
        return mapEmailDetailView(
          await apiJson<unknown>(
            `/api/cases/${encodeURIComponent(input.case_id)}/review-actions`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: input.action,
                actor_id: input.actor_id,
                rationale: input.rationale,
                corrected_fields: input.corrected_fields
              })
            }
          )
        )
      } catch (error) {
        if (fallback && fallsBackOnAction(error)) {
          return fallback.submitReviewAction(input)
        }
        throw error
      }
    },

    async reset(): Promise<void> {
      // lib/demo-reset.ts already posts /api/reset before calling service
      // resets; posting again would retire the just-reset guest workspace.
      // With a fallback, its in-memory store is the only state this seam
      // owns. Standalone, the API endpoint is the reset for this seam.
      if (fallback) {
        await fallback.reset()
        return
      }
      await apiJson('/api/reset', { method: 'POST' })
    }
  }
}
