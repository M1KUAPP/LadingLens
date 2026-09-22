import { describe, expect, it } from 'vitest'
import { preparedControlGraph } from './fixtures'
import { caseNodeIds, mergeGraphs, scopeTrace, shipmentNodeIds, traceGraph, worstState } from './trace'
import type { ControlGraph, GraphEdge, GraphNode } from './types'

function node(id: string, kind: GraphNode['kind'], label: string, state: GraphNode['state'] = 'neutral'): GraphNode {
  return { id, kind, label, identifier: id.split(':')[1], state }
}

function edge(
  id: string,
  source: string,
  target: string,
  kind: GraphEdge['kind'],
  label?: string,
  state?: GraphEdge['state']
): GraphEdge {
  return { id, source, target, kind, label, state }
}

// One case with a consignee mismatch, sharing its port with a second case,
// and a shipment the ledger expects that no email ever reached.
const GRAPH: ControlGraph = {
  nodes: [
    node('email:e1', 'email', 'First', 'mismatch'),
    node('document:e1_si', 'document', 'Shipping instruction'),
    node('document:e1_bl', 'document', 'Draft bill of lading'),
    node('party:acme', 'party', 'ACME'),
    node('party:acme_ltd', 'party', 'ACME LTD'),
    node('port:mersin', 'port', 'MERSIN'),
    node('mismatch:e1_consignee', 'mismatch', 'Consignee mismatch', 'mismatch'),
    node('email:e2', 'email', 'Second', 'match'),
    node('document:e2_si', 'document', 'Shipping instruction'),
    node('shipment:SYN-001', 'shipment', 'SYN-BK-001', 'match'),
    node('shipment:SYN-042', 'shipment', 'SYN-BK-042', 'mismatch'),
    node('exception:syn_042_missing', 'exception', 'Missing case', 'mismatch'),
    node('party:stray', 'party', 'Stray party')
  ],
  edges: [
    edge('a1', 'email:e1', 'document:e1_si', 'attachment'),
    edge('a2', 'email:e1', 'document:e1_bl', 'attachment'),
    edge('f1', 'document:e1_si', 'party:acme', 'party_role', 'Consignee', 'mismatch'),
    edge('f2', 'document:e1_bl', 'party:acme_ltd', 'party_role', 'Consignee', 'mismatch'),
    edge('f3', 'document:e1_si', 'port:mersin', 'routing', 'Port of loading', 'match'),
    edge('f4', 'document:e1_bl', 'port:mersin', 'routing', 'Port of loading', 'match'),
    edge('m1', 'mismatch:e1_consignee', 'document:e1_si', 'flags'),
    edge('m2', 'mismatch:e1_consignee', 'document:e1_bl', 'flags'),
    edge('m3', 'mismatch:e1_consignee', 'party:acme_ltd', 'flags', 'Consignee mismatch', 'mismatch'),
    edge('a3', 'email:e2', 'document:e2_si', 'attachment'),
    edge('f5', 'document:e2_si', 'port:mersin', 'routing', 'Port of loading', 'match'),
    edge('r1', 'email:e2', 'shipment:SYN-001', 'reconciles', 'Case present', 'match'),
    edge('x1', 'exception:syn_042_missing', 'shipment:SYN-042', 'flags')
  ]
}

describe('traceGraph', () => {
  it('reads one chain per case, worst first', () => {
    const trace = traceGraph(GRAPH)
    expect(trace.cases.map((entry) => entry.email?.identifier)).toEqual(['e1', 'e2'])
    const [first] = trace.cases
    expect(first.documents.map((doc) => doc.label)).toEqual(['Shipping instruction', 'Draft bill of lading'])
    expect(first.flags.map((flag) => flag.label)).toEqual(['Consignee mismatch'])
  })

  it('pairs each field across the two documents, in comparison order', () => {
    const [first] = traceGraph(GRAPH).cases
    expect(first.fields.map((field) => field.label)).toEqual(['Consignee', 'Port of loading'])
    const [consignee, loading] = first.fields
    expect(consignee).toMatchObject({ state: 'mismatch', si: { label: 'ACME' }, bl: { label: 'ACME LTD' } })
    expect(loading.si?.id).toBe(loading.bl?.id)
    expect(loading.state).toBe('match')
  })

  it('lists a shared value in every case that names it', () => {
    const trace = traceGraph(GRAPH)
    const withMersin = trace.cases.filter((entry) => caseNodeIds(entry).includes('port:mersin'))
    expect(withMersin).toHaveLength(2)
  })

  it('carries the reconciliation outcome to the case, and keeps unreached shipments on their own', () => {
    const trace = traceGraph(GRAPH)
    const second = trace.cases.find((entry) => entry.email?.id === 'email:e2')
    expect(second?.shipments).toMatchObject([
      { shipment: { id: 'shipment:SYN-001' }, outcome: 'Case present', state: 'match' }
    ])
    expect(trace.shipments).toMatchObject([
      { shipment: { id: 'shipment:SYN-042' }, flags: [{ id: 'exception:syn_042_missing' }] }
    ])
  })

  it('keeps nothing out of sight: an orphan value is listed loose', () => {
    expect(traceGraph(GRAPH).loose.map((entry) => entry.id)).toEqual(['party:stray'])
  })

  it('places every node of the prepared graph', () => {
    const trace = traceGraph(preparedControlGraph)
    const shown = new Set([
      ...trace.cases.flatMap(caseNodeIds),
      ...trace.shipments.flatMap(shipmentNodeIds),
      ...trace.loose.map((entry) => entry.id)
    ])
    for (const entry of preparedControlGraph.nodes) expect(shown).toContain(entry.id)
    // Every email leads its own case; the overview also carries documents
    // whose email fell outside its budget, which trace as cases of their own.
    for (const email of preparedControlGraph.nodes.filter((entry) => entry.kind === 'email')) {
      expect(trace.cases.filter((item) => item.email?.id === email.id)).toHaveLength(1)
    }
  })
})

describe('scopeTrace', () => {
  it('keeps the cases an answer drew, without letting a shared value pull others in', () => {
    const trace = traceGraph(GRAPH)
    const answer = [GRAPH.nodes[6], GRAPH.nodes[1], GRAPH.nodes[2], GRAPH.nodes[5]]
    const scoped = scopeTrace(trace, answer)
    expect(scoped.cases.map((entry) => entry.email?.identifier)).toEqual(['e1'])
    expect(scoped.shipments).toEqual([])
    expect(scoped.loose).toEqual([])
  })

  it('lists what the answer drew that no kept row shows', () => {
    const scoped = scopeTrace(traceGraph(GRAPH), [GRAPH.nodes[12]])
    expect(scoped.cases).toEqual([])
    expect(scoped.loose.map((entry) => entry.id)).toEqual(['party:stray'])
  })
})

describe('mergeGraphs and worstState', () => {
  it('merges two graphs without duplicating shared ids', () => {
    const merged = mergeGraphs(GRAPH, { nodes: [GRAPH.nodes[0], node('email:e3', 'email', 'Third')], edges: [] })
    expect(merged.nodes.filter((entry) => entry.id === 'email:e1')).toHaveLength(1)
    expect(merged.nodes.map((entry) => entry.id)).toContain('email:e3')
  })

  it('ranks mismatch over held over not compared over match', () => {
    expect(worstState(['match', 'held', 'neutral'])).toBe('held')
    expect(worstState(['match', 'mismatch'])).toBe('mismatch')
    expect(worstState([], 'match')).toBe('match')
  })
})
