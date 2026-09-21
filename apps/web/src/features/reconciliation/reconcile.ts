import type { ExpectedShipment, ReconciliationResult, SourceFreshness } from '../../domain/contracts'
import { stableHash } from './csv'

// Prepared case ledger: the cases a deterministic rerun can link to known
// expected shipments. Shipments absent from this map produce MISSING_CASE.
const PREPARED_CASE_LINKS: Record<string, { outcome: 'CASE_PRESENT' | 'DOCUMENT_MISSING'; case_ids: string[] }> = {
  'SHP-CASE-001': { outcome: 'CASE_PRESENT', case_ids: ['case_email_001'] },
  'SHP-DOC-507': { outcome: 'DOCUMENT_MISSING', case_ids: ['case_email_507'] }
}

// Stale shipments still carry the case they were received with.
const PREPARED_STALE_CASE_LINKS: Record<string, string[]> = {
  'SHP-STALE-013': ['case_email_013']
}

// Received cases that claim a booking no expected shipment carries. These are
// preserved as UNMATCHED_CASE and never gain a fabricated shipment id.
const PREPARED_UNMATCHED_CASES = [
  { case_id: 'case_email_004' }, { case_id: 'case_email_005' }, { case_id: 'case_email_025' }, { case_id: 'case_email_031' },
  { case_id: 'case_email_032' }, { case_id: 'case_email_034' }, { case_id: 'case_email_040' }, { case_id: 'case_email_043' },
  { case_id: 'case_email_044' }, { case_id: 'case_email_046' }, { case_id: 'case_email_051' }, { case_id: 'case_email_052' },
  { case_id: 'case_email_055' }, { case_id: 'case_email_056' }, { case_id: 'case_email_058' }, { case_id: 'case_email_059' },
  { case_id: 'case_email_064' }, { case_id: 'case_email_065' }, { case_id: 'case_email_068' }, { case_id: 'case_email_071' },
  { case_id: 'case_email_082' }, { case_id: 'case_email_090' }, { case_id: 'case_email_091' }, { case_id: 'case_email_096' },
  { case_id: 'case_email_097' }, { case_id: 'case_email_107' }, { case_id: 'case_email_111' }, { case_id: 'case_email_113' },
  { case_id: 'case_email_118' }, { case_id: 'case_email_119' }, { case_id: 'case_email_121' }, { case_id: 'case_email_128' },
  { case_id: 'case_email_129' }, { case_id: 'case_email_132' }, { case_id: 'case_email_133' }, { case_id: 'case_email_143' },
  { case_id: 'case_email_144' }, { case_id: 'case_email_145' }, { case_id: 'case_email_146' }, { case_id: 'case_email_160' },
  { case_id: 'case_email_167' }, { case_id: 'case_email_171' }, { case_id: 'case_email_174' }, { case_id: 'case_email_175' },
  { case_id: 'case_email_178' }, { case_id: 'case_email_182' }, { case_id: 'case_email_197' }, { case_id: 'case_email_198' },
  { case_id: 'case_email_208' }, { case_id: 'case_email_225' }, { case_id: 'case_email_227' }, { case_id: 'case_email_235' },
  { case_id: 'case_email_239' }, { case_id: 'case_email_243' }, { case_id: 'case_email_249' }, { case_id: 'case_email_256' },
  { case_id: 'case_email_270' }, { case_id: 'case_email_273' }, { case_id: 'case_email_275' }, { case_id: 'case_email_291' },
  { case_id: 'case_email_296' }, { case_id: 'case_email_300' }, { case_id: 'case_email_302' }, { case_id: 'case_email_307' },
  { case_id: 'case_email_312' }, { case_id: 'case_email_313' }, { case_id: 'case_email_324' }, { case_id: 'case_email_334' },
  { case_id: 'case_email_335' }, { case_id: 'case_email_342' }, { case_id: 'case_email_348' }, { case_id: 'case_email_349' },
  { case_id: 'case_email_351' }, { case_id: 'case_email_354' }, { case_id: 'case_email_361' }, { case_id: 'case_email_364' },
  { case_id: 'case_email_367' }, { case_id: 'case_email_377' }, { case_id: 'case_email_378' }, { case_id: 'case_email_379' },
  { case_id: 'case_email_383' }, { case_id: 'case_email_391' }, { case_id: 'case_email_398' }, { case_id: 'case_email_405' },
  { case_id: 'case_email_407' }, { case_id: 'case_email_408' }, { case_id: 'case_email_409' }, { case_id: 'case_email_410' },
  { case_id: 'case_email_411' }, { case_id: 'case_email_416' }, { case_id: 'case_email_426' }, { case_id: 'case_email_428' },
  { case_id: 'case_email_434' }, { case_id: 'case_email_435' }, { case_id: 'case_email_453' }, { case_id: 'case_email_462' },
  { case_id: 'case_email_468' }, { case_id: 'case_email_474' }, { case_id: 'case_email_479' }, { case_id: 'case_email_481' },
  { case_id: 'case_email_483' }, { case_id: 'case_email_491' }, { case_id: 'case_email_494' }, { case_id: 'case_email_496' },
  { case_id: 'case_email_498' }, { case_id: 'case_email_499' }, { case_id: 'case_email_501' }, { case_id: 'case_email_502' },
  { case_id: 'case_email_503' }, { case_id: 'case_email_504' }, { case_id: 'case_email_505' }, { case_id: 'case_email_506' },
  { case_id: 'case_email_508' }, { case_id: 'case_email_509' }, { case_id: 'case_email_510' }, { case_id: 'case_email_511' },
  { case_id: 'case_email_512' }, { case_id: 'case_email_513' }, { case_id: 'case_email_514' }, { case_id: 'case_email_515' },
  { case_id: 'case_email_516' }, { case_id: 'case_email_517' }, { case_id: 'case_email_518' }, { case_id: 'case_email_519' },
  { case_id: 'case_email_520' }
]

// Booking references with a known ambiguous candidate case.
const PREPARED_AMBIGUOUS_CASES: Record<string, string[]> = {
  I978820812: ['case_email_009']
}

// Match basis mirrors the backend's field-name lists, not fabricated claims.
const MATCHED_FIELDS = ['booking_reference', 'order_number']

// Run ids like run_prepared_001 are internal; the UI shows the numeric suffix.
export function formatRunId(runId: string): string {
  return runId.match(/(\d+)$/)?.[1] ?? runId
}

function recordId(slug: string): string {
  return `rec_${slug.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

export function deriveReconciliationResults(
  shipments: ExpectedShipment[],
  runId: string,
  createdAt: string
): ReconciliationResult[] {
  const byBooking = new Map<string, ExpectedShipment[]>()
  for (const shipment of shipments) {
    if (!shipment.booking_reference) continue
    const group = byBooking.get(shipment.booking_reference) ?? []
    group.push(shipment)
    byBooking.set(shipment.booking_reference, group)
  }

  const results: ReconciliationResult[] = []
  const ambiguousBookings = new Set<string>()

  for (const shipment of shipments) {
    const booking = shipment.booking_reference
    const group = booking ? byBooking.get(booking) : undefined
    const ambiguousCaseIds = booking ? PREPARED_AMBIGUOUS_CASES[booking] : undefined

    if (booking && group && group.length > 1 && ambiguousCaseIds) {
      if (ambiguousBookings.has(booking)) continue
      ambiguousBookings.add(booking)
      const candidateShipments = group.map((s) => s.shipment_id)
      const freshness: SourceFreshness = group.every((s) => s.source_freshness === 'CURRENT') ? 'CURRENT' : 'STALE'
      results.push({
        reconciliation_id: recordId(`booking_${booking}`),
        reconciliation_run_id: runId,
        subject_key: `ambiguous:${stableHash(
          JSON.stringify({ shipments: candidateShipments, cases: ambiguousCaseIds })
        )}`,
        match_basis: ['booking_reference'],
        source_freshness: freshness,
        created_at: createdAt,
        outcome: 'DUPLICATE_OR_AMBIGUOUS',
        candidate_shipment_ids: candidateShipments as [string, ...string[]],
        candidate_case_ids: [...ambiguousCaseIds] as [string, ...string[]]
      })
      continue
    }

    if (shipment.source_freshness === 'STALE') {
      results.push({
        reconciliation_id: recordId(shipment.shipment_id),
        reconciliation_run_id: runId,
        subject_key: `shipment:${shipment.shipment_id}`,
        match_basis: MATCHED_FIELDS,
        source_freshness: 'STALE',
        created_at: createdAt,
        outcome: 'SOURCE_STALE',
        shipment_id: shipment.shipment_id,
        case_ids: [...(PREPARED_STALE_CASE_LINKS[shipment.shipment_id] ?? [])]
      })
      continue
    }

    const link = PREPARED_CASE_LINKS[shipment.shipment_id]
    if (link) {
      results.push({
        reconciliation_id: recordId(shipment.shipment_id),
        reconciliation_run_id: runId,
        subject_key: `shipment:${shipment.shipment_id}`,
        match_basis: MATCHED_FIELDS,
        source_freshness: shipment.source_freshness,
        created_at: createdAt,
        outcome: link.outcome,
        shipment_id: shipment.shipment_id,
        case_ids: [...link.case_ids]
      })
      continue
    }

    results.push({
      reconciliation_id: recordId(shipment.shipment_id),
      reconciliation_run_id: runId,
      subject_key: `shipment:${shipment.shipment_id}`,
      match_basis: [],
      source_freshness: shipment.source_freshness,
      created_at: createdAt,
      outcome: 'MISSING_CASE',
      shipment_id: shipment.shipment_id,
      case_ids: []
    })
  }

  for (const unmatched of PREPARED_UNMATCHED_CASES) {
    results.push({
      reconciliation_id: recordId(unmatched.case_id),
      reconciliation_run_id: runId,
      subject_key: `case:${unmatched.case_id}`,
      match_basis: [],
      source_freshness: 'CURRENT',
      created_at: createdAt,
      outcome: 'UNMATCHED_CASE',
      case_ids: [unmatched.case_id]
    })
  }

  return results
}
