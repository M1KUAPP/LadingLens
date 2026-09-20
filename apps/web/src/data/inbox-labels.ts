import type { StatusKind } from '../components/ui/types'
import type {
  CaseStatus,
  Category,
  ReconciliationOutcome,
  ReviewReason
} from './inbox-types'

export const CATEGORY_LABEL: Record<Category, string> = {
  BL_COMPARISON: 'BL comparison',
  SI_REQUEST: 'SI request',
  INVOICE_QUERY: 'Invoice query',
  GENERAL: 'General',
  SPAM: 'Spam'
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  OK: 'OK',
  MISMATCH: 'Mismatch',
  NEEDS_REVIEW: 'Needs review'
}

export const STATUS_KIND: Record<CaseStatus, StatusKind> = {
  OK: 'match',
  MISMATCH: 'mismatch',
  NEEDS_REVIEW: 'held'
}

export const REVIEW_REASON_LABEL: Record<ReviewReason, string> = {
  wrong_doc_type: 'Wrong document type',
  missing_attachment: 'Missing attachment',
  unreadable: 'Unreadable file',
  missing_value: 'Missing value'
}

export const RECONCILIATION_LABEL: Record<ReconciliationOutcome, string> = {
  CASE_PRESENT: 'Case present',
  DOCUMENT_MISSING: 'Document missing',
  MISSING_CASE: 'Missing case',
  UNMATCHED_CASE: 'Unmatched case',
  DUPLICATE_OR_AMBIGUOUS: 'Duplicate or ambiguous',
  SOURCE_STALE: 'Source stale'
}

export const RECONCILIATION_KIND: Record<ReconciliationOutcome, StatusKind> = {
  CASE_PRESENT: 'match',
  DOCUMENT_MISSING: 'mismatch',
  MISSING_CASE: 'mismatch',
  UNMATCHED_CASE: 'held',
  DUPLICATE_OR_AMBIGUOUS: 'held',
  SOURCE_STALE: 'held'
}
