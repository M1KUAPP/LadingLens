import type { ExpectedShipment, ReconciliationResult, SourceFreshness } from '../../domain/contracts'
import { stableHash } from './csv'
import type { ReceivedCase } from './types'

// An unlinked shipment in these lifecycles expected a case: a missing case.
const MISSING_CASE_LIFECYCLES = new Set(['DRAFT_BL_EXPECTED', 'BL_CHECK_REQUIRED'])

// Run ids like run_prepared_001 are internal; the UI shows the numeric suffix.
export function formatRunId(runId: string): string {
  return runId.match(/(\d+)$/)?.[1] ?? runId
}

function recordId(slug: string): string {
  return `rec_${slug.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

function normalized(entries: [string, string][]): Map<string, string> {
  return new Map(entries.map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()]))
}

function shipmentIdentifiers(shipment: ExpectedShipment): Map<string, string> {
  const entries = Object.entries(shipment.external_identifiers)
  if (shipment.booking_reference) entries.push(['booking_reference', shipment.booking_reference])
  return normalized(entries)
}

function sharedNamespaces(shipment: Map<string, string>, received: Map<string, string>): string[] {
  return [...shipment.keys()].filter((key) => received.get(key) === shipment.get(key)).sort()
}

/**
 * Links shipments and cases that share any identifier, as the API's
 * reconcile_shipments does, without choosing a winner in a conflict: a group
 * that is not one shipment and one case is ambiguous.
 */
export function reconcileShipments(
  shipments: ExpectedShipment[],
  cases: ReceivedCase[],
  runId: string,
  createdAt: string
): ReconciliationResult[] {
  const shipmentKeys = shipments.map(shipmentIdentifiers)
  const caseKeys = cases.map((item) => normalized(Object.entries(item.identifiers)))
  const shipmentEdges = shipments.map(() => new Set<number>())
  const caseEdges = cases.map(() => new Set<number>())
  const basis = new Map<string, string[]>()
  shipmentKeys.forEach((keys, s) => {
    caseKeys.forEach((received, c) => {
      const namespaces = sharedNamespaces(keys, received)
      if (namespaces.length === 0) return
      shipmentEdges[s].add(c)
      caseEdges[c].add(s)
      basis.set(`${s}:${c}`, namespaces)
    })
  })

  const base = { reconciliation_run_id: runId, created_at: createdAt }
  const results: ReconciliationResult[] = []
  const visited = new Set<number>()
  shipments.forEach((_, start) => {
    if (visited.has(start) || shipmentEdges[start].size === 0) return
    // The connected group of shipments and cases that claim each other.
    const groupShipments = new Set([start])
    const groupCases = new Set<number>()
    const queue: ['shipment' | 'case', number][] = [['shipment', start]]
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [kind, index] = next
      const neighbours = kind === 'shipment' ? shipmentEdges[index] : caseEdges[index]
      const seen = kind === 'shipment' ? groupCases : groupShipments
      for (const neighbour of neighbours) {
        if (seen.has(neighbour)) continue
        seen.add(neighbour)
        queue.push([kind === 'shipment' ? 'case' : 'shipment', neighbour])
      }
    }
    groupShipments.forEach((index) => visited.add(index))
    const matchBasis = [
      ...new Set(
        [...groupShipments].flatMap((s) =>
          [...shipmentEdges[s]].filter((c) => groupCases.has(c)).flatMap((c) => basis.get(`${s}:${c}`) ?? [])
        )
      )
    ].sort()

    if (groupShipments.size !== 1 || groupCases.size !== 1) {
      const candidateShipments = [...groupShipments].map((s) => shipments[s].shipment_id).sort()
      const candidateCases = [...groupCases].map((c) => cases[c].case_id).sort()
      const freshness: SourceFreshness = [...groupShipments].some((s) => shipments[s].source_freshness === 'STALE')
        ? 'STALE'
        : 'CURRENT'
      results.push({
        ...base,
        reconciliation_id: recordId(`ambiguous ${candidateShipments.join(' ')}`),
        subject_key: `ambiguous:${stableHash(JSON.stringify({ shipments: candidateShipments, cases: candidateCases }))}`,
        match_basis: matchBasis,
        source_freshness: freshness,
        outcome: 'DUPLICATE_OR_AMBIGUOUS',
        candidate_shipment_ids: candidateShipments as [string, ...string[]],
        candidate_case_ids: candidateCases as [string, ...string[]]
      })
      return
    }

    const shipment = shipments[start]
    const received = cases[[...groupCases][0]]
    // Still expecting its draft BL, a shipment needs no documents yet; they
    // are required once its BL check is due.
    const present =
      shipment.lifecycle === 'DRAFT_BL_EXPECTED' ||
      shipment.required_documents.every((document) => received.documents.includes(document))
    results.push({
      ...base,
      reconciliation_id: recordId(shipment.shipment_id),
      subject_key: `shipment:${shipment.shipment_id}`,
      match_basis: matchBasis,
      source_freshness: shipment.source_freshness,
      outcome: shipment.source_freshness === 'STALE' ? 'SOURCE_STALE' : present ? 'CASE_PRESENT' : 'DOCUMENT_MISSING',
      shipment_id: shipment.shipment_id,
      case_ids: [received.case_id]
    })
  })

  shipments.forEach((shipment, s) => {
    if (shipmentEdges[s].size > 0) return
    if (shipment.source_freshness !== 'CURRENT' || !MISSING_CASE_LIFECYCLES.has(shipment.lifecycle)) return
    results.push({
      ...base,
      reconciliation_id: recordId(shipment.shipment_id),
      subject_key: `shipment:${shipment.shipment_id}`,
      match_basis: [],
      source_freshness: 'CURRENT',
      outcome: 'MISSING_CASE',
      shipment_id: shipment.shipment_id,
      case_ids: []
    })
  })

  cases.forEach((received, c) => {
    if (caseEdges[c].size > 0) return
    results.push({
      ...base,
      reconciliation_id: recordId(received.case_id),
      subject_key: `case:${received.case_id}`,
      match_basis: [],
      source_freshness: 'CURRENT',
      outcome: 'UNMATCHED_CASE',
      case_ids: [received.case_id]
    })
  })

  return results
}
