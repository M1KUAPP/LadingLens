import { describe, expect, it } from 'vitest'
import type { CaseStatus } from '../data/inbox-types'
import type {
  AmbiguousReconciliation,
  MissingCaseReconciliation,
  ReconciliationBase,
  ReconciliationResult,
  ReviewAction,
  ReviewTarget,
  ShipmentBackedReconciliation,
  Status,
  UnmatchedCaseReconciliation
} from './contracts'
import { reconciliationResultProblems } from './contracts'

const base = {
  reconciliation_id: 'rec_test_1',
  reconciliation_run_id: 'run_prepared_001',
  subject_key: 'shipment:SYN-001',
  match_basis: ['booking_reference:SYN-BK-001'],
  source_freshness: 'CURRENT',
  created_at: '2026-09-19T09:00:00Z'
} satisfies ReconciliationBase

describe('canonical contracts', () => {
  it('keeps CaseStatus source-compatible with Status', () => {
    const status: Status = 'NEEDS_REVIEW'
    const caseStatus: CaseStatus = status
    expect(caseStatus).toBe('NEEDS_REVIEW')
  })

  it('exposes review target and action unions for both target kinds', () => {
    const caseTarget: ReviewTarget = { target_type: 'CASE', case_id: 'case_email_507' }
    const exceptionTarget: ReviewTarget = {
      target_type: 'RECONCILIATION_EXCEPTION',
      reconciliation_id: 'rec_syn_042'
    }
    const caseAction: ReviewAction = {
      review_action_id: 'ra_1',
      target: caseTarget,
      actor_id: 'operator_42',
      action: 'APPROVE',
      rationale: 'Verified with shipper',
      corrected_fields: undefined,
      created_at: '2026-09-19T10:00:00Z'
    }
    const exceptionAction: ReviewAction = {
      review_action_id: 'ra_2',
      target: exceptionTarget,
      actor_id: 'operator_42',
      action: 'ESCALATE',
      rationale: 'Cutoff approaching with no case',
      assigned_owner_id: undefined,
      created_at: '2026-09-19T10:05:00Z'
    }
    expect(caseAction.target.target_type).toBe('CASE')
    expect(exceptionAction.target.target_type).toBe('RECONCILIATION_EXCEPTION')
  })
})

describe('reconciliationResultProblems', () => {
  it('accepts a CASE_PRESENT result backed by a current shipment and cases', () => {
    const result: ShipmentBackedReconciliation = {
      ...base,
      outcome: 'CASE_PRESENT',
      shipment_id: 'SYN-001',
      case_ids: ['case_email_001']
    }
    expect(reconciliationResultProblems(result)).toEqual([])
  })

  it('accepts DOCUMENT_MISSING and SOURCE_STALE shipment-backed results', () => {
    const missing: ReconciliationResult = {
      ...base,
      outcome: 'DOCUMENT_MISSING',
      shipment_id: 'SYN-021',
      case_ids: ['case_email_507']
    }
    const stale: ReconciliationResult = {
      ...base,
      outcome: 'SOURCE_STALE',
      shipment_id: 'SYN-088',
      case_ids: [],
      source_freshness: 'STALE'
    }
    expect(reconciliationResultProblems(missing)).toEqual([])
    expect(reconciliationResultProblems(stale)).toEqual([])
  })

  it('accepts MISSING_CASE with a shipment and an empty case side', () => {
    const result: MissingCaseReconciliation = {
      ...base,
      outcome: 'MISSING_CASE',
      shipment_id: 'SYN-042',
      subject_key: 'shipment:SYN-042',
      case_ids: []
    }
    expect(reconciliationResultProblems(result)).toEqual([])
  })

  it('accepts UNMATCHED_CASE with case ids and no shipment id', () => {
    const result: UnmatchedCaseReconciliation = {
      ...base,
      outcome: 'UNMATCHED_CASE',
      subject_key: 'case:case_email_013',
      case_ids: ['case_email_013']
    }
    expect(reconciliationResultProblems(result)).toEqual([])
    expect('shipment_id' in result).toBe(false)
  })

  it('accepts DUPLICATE_OR_AMBIGUOUS with both candidate sets and no direct ids', () => {
    const result: AmbiguousReconciliation = {
      ...base,
      outcome: 'DUPLICATE_OR_AMBIGUOUS',
      subject_key: 'ambiguous:syn-bk-099',
      candidate_shipment_ids: ['SYN-099A', 'SYN-099B'],
      candidate_case_ids: ['case_ambiguous_01']
    }
    expect(reconciliationResultProblems(result)).toEqual([])
  })

  it('rejects MISSING_CASE that carries any case id', () => {
    // @ts-expect-error MISSING_CASE requires an empty case_ids tuple
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'MISSING_CASE',
      shipment_id: 'SYN-042',
      case_ids: ['case_email_999']
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })

  it('rejects UNMATCHED_CASE that carries a shipment id', () => {
    // @ts-expect-error UNMATCHED_CASE must never invent a shipment id
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'UNMATCHED_CASE',
      shipment_id: 'SYN-033',
      case_ids: ['case_email_013']
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })

  it('rejects UNMATCHED_CASE with an empty case side', () => {
    // @ts-expect-error UNMATCHED_CASE requires at least one case id
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'UNMATCHED_CASE',
      case_ids: []
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })

  it('rejects DUPLICATE_OR_AMBIGUOUS that omits a candidate set', () => {
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'DUPLICATE_OR_AMBIGUOUS',
      candidate_shipment_ids: ['SYN-099A', 'SYN-099B'],
      // @ts-expect-error DUPLICATE_OR_AMBIGUOUS requires candidate case ids
      candidate_case_ids: []
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })

  it('rejects a stale shipment reported as CASE_PRESENT', () => {
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'CASE_PRESENT',
      shipment_id: 'SYN-088',
      case_ids: ['case_email_001'],
      source_freshness: 'STALE'
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })

  it('rejects CASE_PRESENT with no linked case', () => {
    const invalid: ReconciliationResult = {
      ...base,
      outcome: 'CASE_PRESENT',
      shipment_id: 'SYN-001',
      case_ids: []
    }
    expect(reconciliationResultProblems(invalid)).not.toEqual([])
  })
})
