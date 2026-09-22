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

const LEGACY_HEADER = 'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness'

function findByShipment(results: ReconciliationResult[], shipmentId: string): ReconciliationResult | undefined {
  return results.find((r) => 'shipment_id' in r && r.shipment_id === shipmentId)
}

async function firstRun() {
  const service = createPreparedReconciliationService()
  return service.runReconciliation()
}

describe('prepared reconciliation service', () => {
  it('seeds the ledger from the committed CSV', async () => {
    const service = createPreparedReconciliationService()
    const shipments = await service.getExpectedShipments()
    expect(shipments).toHaveLength(220)
    expect(shipments[0]?.shipment_id).toBe('SHP-5RSG-00133')
    // email_007's SI request names a shipment whose draft BL is overdue.
    const overdue = shipments.find((s) => s.shipment_id === 'SHP-5RFR-37631')
    expect(overdue?.booking_reference).toBeUndefined()
    expect(overdue?.external_identifiers).toEqual({ order_number: '5RFR-37631', bl_number: 'SIJ1051834' })
    expect(overdue?.lifecycle).toBe('DRAFT_BL_EXPECTED')
    expect(overdue?.source_freshness).toBe('CURRENT')
    expect(shipments.find((s) => s.shipment_id === 'SHP-5RFR-36541')?.source_freshness).toBe('STALE')
    const split = shipments.filter((s) => s.booking_reference === 'I978820812')
    expect(split.map((s) => [s.shipment_id, s.owner])).toEqual([
      ['SHP-I978820812-1', 'docs-desk'],
      ['SHP-I978820812-2', 'docs-desk-2']
    ])
  })

  it("serves the seed's received BL cases", async () => {
    const service = createPreparedReconciliationService()
    const cases = await service.getReceivedCases()
    expect(cases).toHaveLength(220)
    expect(cases[0]).toEqual({
      case_id: 'seed-case:email_001',
      email_id: 'email_001',
      identifiers: { booking_reference: 'MSDUL0942518196', order_number: '5RSG-00133', bl_number: 'MEDUUD104332' },
      documents: ['SI', 'DRAFT_BL']
    })
    // A draft-BL request carries no documents yet.
    expect(cases.find((c) => c.email_id === 'email_003')?.documents).toEqual([])
  })

  it('opens with nothing reconciled', async () => {
    const service = createPreparedReconciliationService()
    expect(await service.getReconciliationResults()).toEqual([])
  })

  it('covers all six outcomes and every result passes the contract validator', async () => {
    const results = await firstRun()
    const seen = new Set(results.map((r) => r.outcome))
    for (const outcome of OUTCOMES) {
      expect(seen.has(outcome)).toBe(true)
    }
    for (const result of results) {
      expect(reconciliationResultProblems(result)).toEqual([])
    }
  })

  it("derives the API seed's outcome counts for the prepared ledger", async () => {
    const results = await firstRun()
    expect(results).toHaveLength(221)
    const counts = new Map<string, number>()
    for (const result of results) {
      counts.set(result.outcome, (counts.get(result.outcome) ?? 0) + 1)
    }
    expect(Object.fromEntries(counts)).toEqual({
      CASE_PRESENT: 204,
      DOCUMENT_MISSING: 12,
      DUPLICATE_OR_AMBIGUOUS: 1,
      SOURCE_STALE: 1,
      MISSING_CASE: 1,
      UNMATCHED_CASE: 2
    })
  })

  it('mirrors the backend match basis field names', async () => {
    const results = await firstRun()
    const everyNumber = ['bl_number', 'booking_reference', 'order_number']
    expect(findByShipment(results, 'SHP-5RSG-00133')?.match_basis).toEqual(everyNumber)
    const stale = findByShipment(results, 'SHP-5RFR-36541')
    expect(stale?.outcome).toBe('SOURCE_STALE')
    expect(stale?.match_basis).toEqual(everyNumber)
    expect(stale && 'case_ids' in stale ? stale.case_ids : []).toEqual(['seed-case:email_013'])
    expect(results.find((r) => r.outcome === 'DUPLICATE_OR_AMBIGUOUS')?.match_basis).toEqual(['booking_reference'])
    expect(findByShipment(results, 'SHP-5RFR-37631')?.match_basis).toEqual([])
    expect(results.find((r) => r.outcome === 'UNMATCHED_CASE')?.match_basis).toEqual([])
  })

  it('keeps a draft-BL request present while its draft BL is still expected', async () => {
    const results = await firstRun()
    const request = findByShipment(results, 'SHP-5AAT-03056')
    expect(request?.outcome).toBe('CASE_PRESENT')
    expect(request && 'case_ids' in request ? request.case_ids : []).toEqual(['seed-case:email_003'])
    expect(findByShipment(results, 'SHP-5AKR-00230')?.outcome).toBe('DOCUMENT_MISSING')
  })

  it('exhibits the overdue SI request as MISSING_CASE with an empty case side', async () => {
    const results = await firstRun()
    const missing = findByShipment(results, 'SHP-5RFR-37631') as MissingCaseReconciliation
    expect(missing.outcome).toBe('MISSING_CASE')
    expect(missing.case_ids).toEqual([])
    expect(missing.subject_key).toBe('shipment:SHP-5RFR-37631')
  })

  it('never invents a shipment id for UNMATCHED_CASE', async () => {
    const results = await firstRun()
    const unmatched = results.filter((r): r is UnmatchedCaseReconciliation => r.outcome === 'UNMATCHED_CASE')
    expect(unmatched.map((r) => r.case_ids)).toEqual([['seed-case:email_512'], ['seed-case:email_514']])
    for (const r of unmatched) {
      expect('shipment_id' in r).toBe(false)
    }
  })

  it('keeps DUPLICATE_OR_AMBIGUOUS on candidate sets with no direct ids', async () => {
    const results = await firstRun()
    const ambiguous = results.find((r): r is AmbiguousReconciliation => r.outcome === 'DUPLICATE_OR_AMBIGUOUS')
    expect(ambiguous?.candidate_shipment_ids).toEqual(['SHP-I978820812-1', 'SHP-I978820812-2'])
    expect(ambiguous?.candidate_case_ids).toEqual(['seed-case:email_009'])
    expect('shipment_id' in ambiguous!).toBe(false)
    expect('case_ids' in ambiguous!).toBe(false)
  })

  it('treats only CASE_PRESENT as clearable', async () => {
    const results = await firstRun()
    for (const result of results) {
      const clearable =
        result.outcome === 'CASE_PRESENT' &&
        result.source_freshness === 'CURRENT' &&
        'case_ids' in result &&
        result.case_ids.length > 0
      expect(clearable).toBe(result.outcome === 'CASE_PRESENT')
    }
  })

  it('imports a valid CSV atomically, serves the new ledger and clears the latest run', async () => {
    const service = createPreparedReconciliationService()
    await service.runReconciliation()
    const csv = [
      LEGACY_HEADER,
      'SYN-500,SYN-BK-500,BL_CHECK_REQUIRED,SI;DRAFT_BL,2026-09-23T08:00:00Z,Hafiz Tan,CURRENT'
    ].join('\n')
    const result = await service.importShipmentsCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.importedCount).toBe(1)
    expect((await service.getExpectedShipments()).map((s) => s.shipment_id)).toEqual(['SYN-500'])
    expect(await service.getReconciliationResults()).toEqual([])
  })

  it('round-trips the committed CSV fixture without errors', async () => {
    const service = createPreparedReconciliationService()
    const result = await service.importShipmentsCsv(expectedShipmentsCsv)
    expect(result.errors).toEqual([])
    expect(result.importedCount).toBe(220)
  })

  it.each([
    ['missing column', 'shipment_id,booking_reference,lifecycle\nSYN-1,B,BL_CHECK_REQUIRED'],
    ['bad freshness', `${LEGACY_HEADER}\nSYN-1,B,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,FRESH`],
    ['empty shipment id', `${LEGACY_HEADER}\n,B,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,CURRENT`],
    [
      'unknown required document',
      `${LEGACY_HEADER}\nSYN-1,B,BL_CHECK_REQUIRED,SI;INVOICE,2026-09-23T08:00:00Z,Owner,CURRENT`
    ],
    ['unparseable cutoff', `${LEGACY_HEADER}\nSYN-1,B,BL_CHECK_REQUIRED,SI,soon,Owner,CURRENT`],
    [
      'duplicate shipment id',
      `${LEGACY_HEADER}\nSYN-1,B1,BL_CHECK_REQUIRED,SI,2026-09-23T08:00:00Z,Owner,CURRENT\nSYN-1,B2,BL_CHECK_REQUIRED,SI,2026-09-23T09:00:00Z,Owner,CURRENT`
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

  it('produces a fresh run id on every run', async () => {
    const service = createPreparedReconciliationService()
    const first = await service.runReconciliation()
    const second = await service.runReconciliation()
    expect(first[0]?.reconciliation_run_id).toBe('run_prepared_001')
    expect(second[0]?.reconciliation_run_id).toBe('run_prepared_002')
    expect(first.every((r) => r.reconciliation_run_id === 'run_prepared_001')).toBe(true)
  })

  it('a run reflects the imported ledger deterministically', async () => {
    const service = createPreparedReconciliationService()
    await service.importShipmentsCsv(
      [
        LEGACY_HEADER,
        'SYN-700,SYN-BK-700,DRAFT_BL_EXPECTED,SI;DRAFT_BL,2026-09-25T08:00:00Z,Elisa Tukiman,CURRENT'
      ].join('\n')
    )
    const results = await service.runReconciliation()
    const syn700 = findByShipment(results, 'SYN-700') as MissingCaseReconciliation
    expect(syn700.outcome).toBe('MISSING_CASE')
    expect(syn700.case_ids).toEqual([])
    // No shipment in this ledger names a received case, so every case is unmatched.
    expect(results.filter((r) => r.outcome === 'UNMATCHED_CASE')).toHaveLength(220)
    expect(results.some((r) => r.outcome === 'DUPLICATE_OR_AMBIGUOUS')).toBe(false)
  })

  it('reset restores the prepared ledger with nothing reconciled', async () => {
    const service = createPreparedReconciliationService()
    await service.importShipmentsCsv(
      `${LEGACY_HEADER}\nSYN-900,SYN-BK-900,BL_CHECK_REQUIRED,SI,2026-09-26T08:00:00Z,Owner,CURRENT`
    )
    await service.runReconciliation()
    await service.reset()
    const ids = (await service.getExpectedShipments()).map((s) => s.shipment_id)
    expect(ids).toContain('SHP-5RFR-37631')
    expect(ids).not.toContain('SYN-900')
    expect(await service.getReconciliationResults()).toEqual([])
    const next = await service.runReconciliation()
    expect(next[0]?.reconciliation_run_id).toBe('run_prepared_001')
  })

  it('returns clones so callers cannot mutate the store', async () => {
    const service = createPreparedReconciliationService()
    const shipments = await service.getExpectedShipments()
    shipments[0]!.shipment_id = 'SYN-HACKED'
    shipments.pop()
    const cases = await service.getReceivedCases()
    cases.pop()
    const again = await service.getExpectedShipments()
    expect(again[0]?.shipment_id).toBe('SHP-5RSG-00133')
    expect(again).toHaveLength(220)
    expect(await service.getReceivedCases()).toHaveLength(220)
  })
})

describe('a reconciliation kept for the guest session', () => {
  const KEY = 'test-reconciliation'
  const RAN_AT = '2026-09-22T05:00:00Z'

  // Each call is the service a new page load builds, on the same sessionStorage.
  function pageLoad(now?: () => string) {
    return createPreparedReconciliationService({ now, storageKey: KEY })
  }

  it('keeps the latest run across a page load, and counts on from it', async () => {
    const before = pageLoad(() => RAN_AT)
    await before.runReconciliation()
    const results = await before.runReconciliation()

    const after = pageLoad()
    expect(await after.getReconciliationResults()).toEqual(results)
    expect(await after.getExpectedShipments()).toEqual(await before.getExpectedShipments())
    expect((await after.runReconciliation())[0]?.reconciliation_run_id).toBe('run_prepared_003')
  })

  it('keeps an imported ledger, with the run it cleared still cleared', async () => {
    const before = pageLoad()
    await before.runReconciliation()
    await before.importShipmentsCsv(
      `${LEGACY_HEADER}\nSYN-900,SYN-BK-900,BL_CHECK_REQUIRED,SI,2026-09-26T08:00:00Z,Owner,CURRENT`
    )

    const after = pageLoad()
    expect(await after.getExpectedShipments()).toEqual(await before.getExpectedShipments())
    expect(await after.getReconciliationResults()).toEqual([])
  })

  it('forgets the run on reset', async () => {
    const before = pageLoad()
    await before.runReconciliation()
    await before.reset()
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(await pageLoad().getReconciliationResults()).toEqual([])
  })

  it.each([
    ['unreadable', '{'],
    ['in another shape', JSON.stringify({ runs: 'one' })],
    [
      'on a ledger that no longer parses',
      JSON.stringify({ ledger: { csvText: 'a,b\n1,2', importedAt: RAN_AT }, runs: 1, ranAt: RAN_AT })
    ]
  ])('opens unreconciled on the prepared ledger when the stored run is %s', async (_label, value) => {
    sessionStorage.setItem(KEY, value)
    const service = pageLoad()
    expect(await service.getReconciliationResults()).toEqual([])
    expect(await service.getExpectedShipments()).toHaveLength(220)
  })

  it('stores nothing without a storage key', async () => {
    await createPreparedReconciliationService().runReconciliation()
    expect(sessionStorage.length).toBe(0)
  })
})
