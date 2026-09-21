import type { StatusKind } from '../components/ui/types'
import type { RequiredDocument, SourceFreshness } from '../domain/contracts'
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

export const FRESHNESS_LABEL: Record<SourceFreshness, string> = {
  CURRENT: 'Current',
  STALE: 'Stale'
}

export const FRESHNESS_KIND: Record<SourceFreshness, StatusKind> = {
  CURRENT: 'neutral',
  STALE: 'held'
}

export const REQUIRED_DOCUMENT_LABEL: Record<RequiredDocument, string> = {
  SI: 'Shipping instruction',
  DRAFT_BL: 'Draft bill of lading'
}

export const LIFECYCLE_LABEL: Record<string, string> = {
  BL_CHECK_REQUIRED: 'BL check required',
  DRAFT_BL_EXPECTED: 'Draft BL expected'
}

export const DISPOSITION_LABEL: Record<string, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  RESOLVED: 'Resolved',
  CORRECTED: 'Corrected',
  AUTO_COMPLETED: 'Auto completed',
  REJECTED: 'Rejected'
}

function humanize(code: string): string {
  const words = code.split('_').join(' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function lifecycleLabel(value: string): string {
  return LIFECYCLE_LABEL[value] ?? humanize(value)
}

export function dispositionLabel(value: string): string {
  return DISPOSITION_LABEL[value] ?? humanize(value)
}

export function requiredDocumentsLabel(documents: RequiredDocument[]): string {
  return documents.map((doc) => REQUIRED_DOCUMENT_LABEL[doc] ?? doc).join('; ')
}

export function subjectLabel(subjectKey: string): string {
  const separator = subjectKey.indexOf(':')
  if (separator === -1) return subjectKey
  const kind = subjectKey.slice(0, separator)
  const value = subjectKey.slice(separator + 1)
  switch (kind) {
    case 'shipment':
      return `Shipment ${value}`
    case 'case':
      return `Case ${value}`
    case 'ambiguous':
      return 'Ambiguous match'
    default:
      return subjectKey
  }
}

export function matchBasisLabel(basis: string): string {
  const separator = basis.indexOf(':')
  if (separator === -1) return humanize(basis)
  const field = basis.slice(0, separator)
  const value = basis.slice(separator + 1)
  switch (field) {
    case 'booking_reference':
      return `Booking ${value}`
    case 'shipment_id':
      return `Shipment ${value}`
    case 'source_freshness':
      return value === 'STALE' ? 'Stale source' : 'Current source'
    case 'booking_reference_claim':
      return `Claimed booking ${value}`
    default:
      return `${humanize(field)} ${value}`
  }
}
