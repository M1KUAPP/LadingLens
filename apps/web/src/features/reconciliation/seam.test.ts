import { describe, expect, it } from 'vitest'
import { reconciliationResultProblems } from '../../domain/contracts'
import type {
  AmbiguousReconciliation,
  MissingCaseReconciliation,
  ReconciliationResult,
  UnmatchedCaseReconciliation
} from '../../domain/contracts'
import expectedShipmentsCsv from './fixtures/expected_shipments.csv?raw'
import { createPreparedReconciliationService } from './seam'

const OUTCOMES = [
  'CASE_PRESENT',
  'DOCUMENT_MISSING',
  'MISSING_CASE',
  'UNMATCHED_CASE',
  'DUPLICATE_OR_AMBIGUOUS',
  'SOURCE_STALE'
] as const

function findByShipment(results: ReconciliationResult[], shipmentId: string): ReconciliationResult | undefined {
  return results.find((r) => 'shipment_id' in r && r.shipment_id === shipmentId)
}

describe('prepared reconciliation service', () => {
  it('seeds expected shipments from the committed synthetic CSV', async () => {
    const service = createPreparedReconciliationService()
    const shipments = await service.getExpectedShipments()
    const ids = shipments.map((s) => s.shipment_id)
    expect(ids).toEqual([
      'SYN-001',
      'SYN-007',
      'SYN-013',
      'SYN-021',
      'SYN-033',
      'SYN-042',
      'SYN-088',
      'SYN-099A',
      'SYN-099B'
    ])
    const syn042 = shipments.find((s) => s.shipment_id === 'SYN-042')
    expect(syn042?.booking_reference).toBe('SYN-BK-042')
    expect(syn042?.lifecycle).toBe('DRAFT_BL_EXPECTED')
    expect(syn042?.owner).toBe('Aisyah Razak')
    expect(syn042?.source_freshness).toBe('CURRENT')
    expect(shipments.find((s) => s.shipment_id === 'SYN-088')?.source_freshness).toBe('STALE')
    const pair = shipments.filter((s) => s.booking_reference === 'SYN-BK-099')
    expect(pair.map((s) => s.shipment_id).sort()).toEqual(['SYN-099A', 'SYN-099B'])
  })

  it('covers all six outcomes and every seeded result passes the contract validator', async () => {
    const service = createPreparedReconciliationService()
    const results = await service.getReconciliationResults()
    const seen = new Set(results.map((r) => r.outcome))
    for (const outcome of OUTCOMES) {
      expect(seen.has(outcome)).toBe(true)
    }
    for (const result of results) {
      expect(reconciliationResultProblems(result)).toEqual([])
    }
  })

  it('exhibits SYN-042 as MISSING_CASE with an empty case side', async () => {
    const service = createPreparedReconciliationService()
    const results = await service.getReconciliationResults()
    const syn042 = findByShipment(results, 'SYN-042') as MissingCaseReconciliation
    expect(syn042.outcome).toBe('MISSING_CASE')
    expect(syn042.shipment_id).toBe('SYN-042')
    expect(syn042.case_ids).toEqual([])
    expect(syn042.subject_key).toBe('shipment:SYN-042')
  })

  it('never invents a shipment id for UNMATCHED_CASE', async () => {
    const service = createPreparedReconciliationService()
    const results = await service.getReconciliationResults()
    const unmatched = results.filter((r): r is UnmatchedCaseReconciliation => r.outcome === 'UNMATCHED_CASE')
    expect(unmatched.length).toBeGreaterThan(0)
    for (const r of unmatched) {
      expect('shipment_id' in r).toBe(false)
      expect(r.case_ids.length).toBeGreaterThan(0)
    }
  })

  it('keeps DUPLICATE_OR_AMBIGUOUS on candidate sets with no direct ids', async () => {
    const service = createPreparedReconciliationService()
    const results = await service.getReconciliationResults()
    const ambiguous = results.find((r): r is AmbiguousReconciliation => r.outcome === 'DUPLICATE_OR_AMBIGUOUS')
    expect(ambiguous).toBeDefined()
    expect(ambiguous?.candidate_shipment_ids).toEqual(['SYN-099A', 'SYN-099B'])
    expect(ambiguous?.candidate_case_ids).toContain('case_ambiguous_01')
    expect('shipment_id' in ambiguous!).toBe(false)
    expect('case_ids' in ambiguous!).toBe(false)
  })

  it('treats only CASE_PRESENT as clearable', async () => {
    const service = createPreparedReconciliationService()
    const results = await service.getReconciliationResults()
    for (const result of results) {
      const clearable =
        result.outcome === 'CASE_PRESENT' &&
        result.source_freshness === 'CURRENT' &&
        'case_ids' in result &&
        result.case_ids.length > 0
      expect(clearable).toBe(result.outcome === 'CASE_PRESENT')
    }
  })

  it('imports a valid CSV atomically and serves the new ledger', async () => {
    const service = createPreparedReconciliationService()
    const csv = [
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness',
      'SYN-500,SYN-BK-500,BL_CHECK_REQUIRED,SI;DRAFT_BL,2026-09-23T08:00:00Z,Hafiz Tan,CURRENT'
    ].join('\n')
    const result = await service.importShipmentsCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.importedCount).toBe(1)
    const shipments = await service.getExpectedShipments()
    expect(shipments.map((s) => s.shipment_id)).toEqual(['SYN-500'])
  })

  it('round-trips the committed CSV fixture without errors', async () => {
    const service = createPreparedReconciliationService()
    const result = await service.importShipmentsCsv(expectedShipmentsCsv)
    expect(result.errors).toEqual([])
    expect(result.importedCount).toBe(9)
  })

  it.each([
    ['missing column', 'shipment_id,booking_reference,lifecycle\nSYN-1,B,BL_CHECK_REQUIRED'],
    [
      'bad freshness',
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\nSYN-1,B,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,FRESH'
    ],
    [
      'empty shipment id',
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\n,B,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,CURRENT'
    ],
    [
      'unknown required document',
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\nSYN-1,B,BL_CHECK_REQUIRED,SI;INVOICE,2026-09-23T08:00:00Z,Owner,CURRENT'
    ],
    [
      'unparseable cutoff',
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\nSYN-1,B,BL_CHECK_REQUIRED,SI,soon,Owner,CURRENT'
    ],
    [
      'duplicate shipment id',
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\nSYN-1,B1,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,CURRENT\nSYN-1,B2,BL_CHECK_REQUIRED,SI,2026-09-23T09:00:00Z,Owner,CURRENT'
    ]
  ])('rejects malformed CSV with structured errors: %s', async (_label, csv) => {
    const service = createPreparedReconciliationService()
    const before = await service.getExpectedShipments()
    const result = await service.importShipmentsCsv(csv)
    expect(result.importedCount).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
    for (const error of result.errors) {
      expect(error.row).toBeGreaterThan(0)
      expect(error.message.length).toBeGreaterThan(0)
    }
    expect(await service.getExpectedShipments()).toEqual(before)
  })

  it('rejects a CSV with the wrong header', async () => {
    const service = createPreparedReconciliationService()
    const result = await service.importShipmentsCsv('a,b,c\n1,2,3')
    expect(result.importedCount).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('produces a fresh run id on every rerun', async () => {
    const service = createPreparedReconciliationService()
    const seeded = await service.getReconciliationResults()
    const first = await service.rerunReconciliation()
    const second = await service.rerunReconciliation()
    const runIds = new Set([
      seeded[0]?.reconciliation_run_id,
      first[0]?.reconciliation_run_id,
      second[0]?.reconciliation_run_id
    ])
    expect(runIds.size).toBe(3)
    expect(first.every((r) => r.reconciliation_run_id === first[0]?.reconciliation_run_id)).toBe(true)
  })

  it('rerun reflects the imported ledger deterministically', async () => {
    const service = createPreparedReconciliationService()
    const csv = [
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness',
      'SYN-700,SYN-BK-700,DRAFT_BL_EXPECTED,SI;DRAFT_BL,2026-09-25T08:00:00Z,Elisa Tukiman,CURRENT'
    ].join('\n')
    await service.importShipmentsCsv(csv)
    const results = await service.rerunReconciliation()
    const syn700 = findByShipment(results, 'SYN-700') as MissingCaseReconciliation
    expect(syn700.outcome).toBe('MISSING_CASE')
    expect(syn700.case_ids).toEqual([])
    expect(findByShipment(results, 'SYN-042')).toBeUndefined()
    expect(results.some((r) => r.outcome === 'DUPLICATE_OR_AMBIGUOUS')).toBe(false)
  })

  it('reset restores the seeded baseline after import and rerun', async () => {
    const service = createPreparedReconciliationService()
    await service.importShipmentsCsv(
      'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness\nSYN-900,SYN-BK-900,BL_CHECK_REQUIRED,SI,2026-09-26T08:00:00Z,Owner,CURRENT'
    )
    await service.rerunReconciliation()
    await service.reset()
    const shipments = await service.getExpectedShipments()
    const results = await service.getReconciliationResults()
    expect(shipments.map((s) => s.shipment_id)).toContain('SYN-042')
    expect(shipments.map((s) => s.shipment_id)).not.toContain('SYN-900')
    expect(results[0]?.reconciliation_run_id).toBe('run_prepared_001')
    const rerun = await service.rerunReconciliation()
    expect(rerun[0]?.reconciliation_run_id).toBe('run_prepared_002')
  })

  it('returns clones so callers cannot mutate the store', async () => {
    const service = createPreparedReconciliationService()
    const shipments = await service.getExpectedShipments()
    shipments[0]!.shipment_id = 'SYN-HACKED'
    shipments.pop()
    const again = await service.getExpectedShipments()
    expect(again[0]?.shipment_id).toBe('SYN-001')
    expect(again).toHaveLength(9)
  })
})
