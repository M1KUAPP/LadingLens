import type {
  Category,
  CaseStatus,
  ComparedField,
  EvaluatorRecord,
  InboxDataset,
  InboxOutcome,
  InboxRow,
  ReconciliationEntry,
  ReconciliationOutcome,
  ReviewReason
} from './inbox-types'

export const EXPECTED_EMAIL_COUNT = 520

export const CATEGORIES = ['BL_COMPARISON', 'SI_REQUEST', 'INVOICE_QUERY', 'GENERAL', 'SPAM'] as const

export const CASE_STATUSES = ['OK', 'MISMATCH', 'NEEDS_REVIEW'] as const

export const REVIEW_REASONS = ['wrong_doc_type', 'missing_attachment', 'unreadable', 'missing_value'] as const

export const COMPARED_FIELDS = [
  'shipper',
  'consignee',
  'notify_party',
  'port_of_loading',
  'port_of_discharge',
  'container_count',
  'gross_weight_kg'
] as const

export const RECONCILIATION_OUTCOMES = [
  'CASE_PRESENT',
  'DOCUMENT_MISSING',
  'MISSING_CASE',
  'UNMATCHED_CASE',
  'DUPLICATE_OR_AMBIGUOUS',
  'SOURCE_STALE'
] as const

const EVALUATOR_KEYS = ['category', 'status', 'review_reason', 'has_defect', 'defect_fields'] as const

export function expectedEmailIds(): string[] {
  return Array.from({ length: EXPECTED_EMAIL_COUNT }, (_, index) => `email_${String(index + 1).padStart(3, '0')}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOutcome(value: unknown): value is InboxOutcome {
  if (!isRecord(value)) return false
  const keys = Object.keys(value).sort().join(',')
  return (
    keys === 'category,review_reason,status' &&
    CATEGORIES.includes(value.category as Category) &&
    CASE_STATUSES.includes(value.status as CaseStatus) &&
    (value.review_reason === null || REVIEW_REASONS.includes(value.review_reason as ReviewReason))
  )
}

function isInboxRow(value: unknown): value is InboxRow {
  return (
    isRecord(value) &&
    typeof value.email_id === 'string' &&
    typeof value.sender === 'string' &&
    typeof value.subject === 'string' &&
    isStringList(value.attachments) &&
    isOutcome(value.outcome)
  )
}

function isReconciliationEntry(value: unknown): value is ReconciliationEntry {
  return (
    isRecord(value) &&
    typeof value.shipment_id === 'string' &&
    typeof value.booking_reference === 'string' &&
    typeof value.lifecycle === 'string' &&
    RECONCILIATION_OUTCOMES.includes(value.outcome as ReconciliationOutcome) &&
    (value.linked_email_id === null || typeof value.linked_email_id === 'string')
  )
}

export type FixtureRowsResult =
  | {
      ok: true
      receivedCount: number
      rows: InboxRow[]
      reconciliation: ReconciliationEntry[]
      unmatchedCaseCount?: number
    }
  | { ok: false; problems: string[] }

export function validateInboxFixture(raw: unknown): FixtureRowsResult {
  if (!isRecord(raw) || !Array.isArray(raw.emails) || !Array.isArray(raw.reconciliation)) {
    return {
      ok: false,
      problems: ['The prepared fixture does not have the expected shape.']
    }
  }
  const receivedCount =
    typeof raw.received_count === 'number'
      ? raw.received_count
      : typeof raw.receivedCount === 'number'
        ? raw.receivedCount
        : EXPECTED_EMAIL_COUNT
  const unmatchedCaseCount =
    typeof raw.unmatched_case_count === 'number' ? raw.unmatched_case_count : undefined
  const problems: string[] = []
  if (raw.unmatched_case_count !== undefined && (unmatchedCaseCount === undefined || unmatchedCaseCount < 0)) {
    problems.push('The prepared fixture unmatched_case_count must be a non-negative number.')
  }
  const seen = new Set<string>()
  const rows: InboxRow[] = []
  for (const entry of raw.emails) {
    if (!isInboxRow(entry)) {
      problems.push('A prepared inbox row does not match the fixture shape.')
      continue
    }
    if (seen.has(entry.email_id)) {
      problems.push(`${entry.email_id} appears twice in the prepared fixture.`)
    }
    seen.add(entry.email_id)
    rows.push(entry)
  }
  const expected = expectedEmailIds()
  const expectedIds = new Set(expected)
  for (const id of expected.filter((id) => !seen.has(id))) {
    problems.push(`${id} is missing from the prepared fixture.`)
  }
  for (const id of [...seen].filter((id) => !expectedIds.has(id))) {
    problems.push(`${id} is outside the expected email_001 to email_520 range.`)
  }
  const reconciliation: ReconciliationEntry[] = []
  for (const entry of raw.reconciliation) {
    if (isReconciliationEntry(entry)) {
      reconciliation.push(entry)
    } else {
      problems.push('A prepared reconciliation row does not match the shape.')
    }
  }
  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, receivedCount, rows, reconciliation, unmatchedCaseCount }
}

function isEvaluatorRecord(value: unknown): value is EvaluatorRecord {
  if (!isRecord(value)) return false
  const keys = Object.keys(value).sort().join(',')
  if (keys !== [...EVALUATOR_KEYS].sort().join(',')) return false
  const { category, status, review_reason, has_defect, defect_fields } = value
  return (
    CATEGORIES.includes(category as Category) &&
    CASE_STATUSES.includes(status as CaseStatus) &&
    (review_reason === null || REVIEW_REASONS.includes(review_reason as ReviewReason)) &&
    typeof has_defect === 'boolean' &&
    Array.isArray(defect_fields) &&
    defect_fields.every((field) => COMPARED_FIELDS.includes(field as ComparedField)) &&
    has_defect === defect_fields.length > 0
  )
}

export type ArtifactResult = { ok: true; artifact: Record<string, EvaluatorRecord> } | { ok: false; problems: string[] }

export function validateEvaluatorArtifact(raw: unknown): ArtifactResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      problems: ['The submission artifact is not keyed by email ID.']
    }
  }
  const problems: string[] = []
  const expected = expectedEmailIds()
  const expectedIds = new Set(expected)
  const keys = Object.keys(raw)
  const keyIds = new Set(keys)
  for (const id of expected.filter((id) => !keyIds.has(id))) {
    problems.push(`${id} is missing from the submission artifact.`)
  }
  for (const id of keys.filter((id) => !expectedIds.has(id))) {
    problems.push(`${id} is outside the expected email_001 to email_520 range.`)
  }
  const artifact: Record<string, EvaluatorRecord> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isEvaluatorRecord(value)) {
      problems.push(`${id} does not match the five-key evaluator shape.`)
      continue
    }
    artifact[id] = value
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, artifact }
}

export type InboxSummary = {
  received: number
  accountedFor: number
  lost: number
  byCategory: Record<Category, number>
  comparisonRows: number
  comparisonByStatus: Record<CaseStatus, number>
  heldReasons: Partial<Record<ReviewReason, number>>
  reconciliationByOutcome: Record<ReconciliationOutcome, number>
}

export function summarizeInbox(dataset: InboxDataset): InboxSummary {
  const byCategory = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<Category, number>
  const comparisonByStatus = Object.fromEntries(CASE_STATUSES.map((status) => [status, 0])) as Record<
    CaseStatus,
    number
  >
  const heldReasons: Partial<Record<ReviewReason, number>> = {}
  let accountedFor = 0
  let comparisonRows = 0
  for (const row of dataset.rows) {
    accountedFor += 1
    byCategory[row.outcome.category] += 1
    if (row.outcome.review_reason) {
      const reason = row.outcome.review_reason
      heldReasons[reason] = (heldReasons[reason] ?? 0) + 1
    }
    if (row.outcome.category === 'BL_COMPARISON') {
      comparisonRows += 1
      comparisonByStatus[row.outcome.status] += 1
    }
  }
  const reconciliationByOutcome = Object.fromEntries(RECONCILIATION_OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    ReconciliationOutcome,
    number
  >
  for (const entry of dataset.reconciliation) {
    reconciliationByOutcome[entry.outcome] += 1
  }
  if (dataset.unmatchedCaseCount !== undefined) {
    reconciliationByOutcome.UNMATCHED_CASE = dataset.unmatchedCaseCount
  }
  const received = dataset.receivedCount ?? dataset.rows.length
  return {
    received,
    accountedFor,
    lost: Math.max(0, received - accountedFor),
    byCategory,
    comparisonRows,
    comparisonByStatus,
    heldReasons,
    reconciliationByOutcome
  }
}
