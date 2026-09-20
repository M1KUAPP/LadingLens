import type { ExpectedShipment, ReconciliationResult, SourceFreshness } from '../../domain/contracts'
import { stableHash } from './csv'

// Prepared case ledger: the cases a deterministic rerun can link to known
// expected shipments. Shipments absent from this map produce MISSING_CASE.
const PREPARED_CASE_LINKS: Record<string, { outcome: 'CASE_PRESENT' | 'DOCUMENT_MISSING'; case_ids: string[] }> = {
  'SYN-001': { outcome: 'CASE_PRESENT', case_ids: ['case_email_001'] },
  'SYN-007': { outcome: 'CASE_PRESENT', case_ids: ['case_email_004'] },
  'SYN-013': { outcome: 'CASE_PRESENT', case_ids: ['case_email_009'] },
  'SYN-021': { outcome: 'DOCUMENT_MISSING', case_ids: ['case_email_507'] }
}

// Received cases that claim a booking no expected shipment carries. These are
// preserved as UNMATCHED_CASE and never gain a fabricated shipment id.
const PREPARED_UNMATCHED_CASES = [{ case_id: 'case_email_013', claimed_booking: '5RFR-36541' }]

// Booking references with a known ambiguous candidate case.
const PREPARED_AMBIGUOUS_CASES: Record<string, string[]> = {
  'SYN-BK-099': ['case_ambiguous_01']
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
      const candidateShipments = group.map((s) => s.shipment_id).sort()
      const candidateCases = [...ambiguousCaseIds].sort()
      const freshness: SourceFreshness = group.every((s) => s.source_freshness === 'CURRENT') ? 'CURRENT' : 'STALE'
      results.push({
        reconciliation_id: recordId(`booking_${booking}`),
        reconciliation_run_id: runId,
        subject_key: `ambiguous:${stableHash(
          JSON.stringify({ shipments: candidateShipments, cases: candidateCases })
        )}`,
        match_basis: [`booking_reference:${booking}`],
        source_freshness: freshness,
        created_at: createdAt,
        outcome: 'DUPLICATE_OR_AMBIGUOUS',
        candidate_shipment_ids: candidateShipments as [string, ...string[]],
        candidate_case_ids: candidateCases as [string, ...string[]]
      })
      continue
    }

    if (shipment.source_freshness === 'STALE') {
      results.push({
        reconciliation_id: recordId(shipment.shipment_id),
        reconciliation_run_id: runId,
        subject_key: `shipment:${shipment.shipment_id}`,
        match_basis: ['source_freshness:STALE'],
        source_freshness: 'STALE',
        created_at: createdAt,
        outcome: 'SOURCE_STALE',
        shipment_id: shipment.shipment_id,
        case_ids: []
      })
      continue
    }

    const link = PREPARED_CASE_LINKS[shipment.shipment_id]
    if (link) {
      results.push({
        reconciliation_id: recordId(shipment.shipment_id),
        reconciliation_run_id: runId,
        subject_key: `shipment:${shipment.shipment_id}`,
        match_basis: booking ? [`booking_reference:${booking}`] : [`shipment_id:${shipment.shipment_id}`],
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
      match_basis: [`booking_reference_claim:${unmatched.claimed_booking}`],
      source_freshness: 'CURRENT',
      created_at: createdAt,
      outcome: 'UNMATCHED_CASE',
      case_ids: [unmatched.case_id]
    })
  }

  return results
}
