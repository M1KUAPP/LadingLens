import { describe, expect, it } from 'vitest'
import { preparedControlGraph } from './fixtures'

const REQUIRED_EMAILS = ['email_013', 'email_507', 'email_511']

// Every shipment that went wrong anchors the seed's overview.
const REQUIRED_SHIPMENTS = [
  'SHP-5AKR-00230',
  'SHP-5RFR-36541',
  'SHP-5RFR-37631',
  'SHP-I978820812-1',
  'SHP-I978820812-2'
]

const REQUIRED_KINDS = ['email', 'shipment', 'party', 'port', 'document', 'mismatch', 'exception']

const VALID_STATES = ['match', 'mismatch', 'held', 'neutral']

describe('preparedControlGraph fixture', () => {
  it('uses unique node identifiers', () => {
    const ids = preparedControlGraph.nodes.map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses unique edge identifiers', () => {
    const ids = preparedControlGraph.edges.map((edge) => edge.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves every edge endpoint to a declared node', () => {
    const ids = new Set(preparedControlGraph.nodes.map((node) => node.id))
    for (const edge of preparedControlGraph.edges) {
      expect(ids.has(edge.source), `edge ${edge.id} source`).toBe(true)
      expect(ids.has(edge.target), `edge ${edge.id} target`).toBe(true)
    }
  })

  it('covers every required node kind', () => {
    const kinds = new Set(preparedControlGraph.nodes.map((node) => node.kind))
    for (const kind of REQUIRED_KINDS) {
      expect(kinds.has(kind as never), `node kind ${kind}`).toBe(true)
    }
  })

  it('includes the named email cases', () => {
    for (const emailId of REQUIRED_EMAILS) {
      const node = preparedControlGraph.nodes.find((node) => node.kind === 'email' && node.identifier === emailId)
      expect(node, emailId).toBeDefined()
    }
  })

  it('includes every shipment that went wrong', () => {
    for (const shipmentId of REQUIRED_SHIPMENTS) {
      const node = preparedControlGraph.nodes.find((node) => node.kind === 'shipment' && node.identifier === shipmentId)
      expect(node, shipmentId).toBeDefined()
    }
  })

  it('marks the overdue SI request as MISSING_CASE with no case edge', () => {
    const missing = preparedControlGraph.nodes.find(
      (node) => node.kind === 'exception' && node.identifier === 'shp_5rfr_37631_missing_case'
    )
    expect(missing).toBeDefined()
    const flags = preparedControlGraph.edges.some(
      (edge) => edge.source === missing!.id && edge.kind === 'flags' && edge.target === 'shipment:SHP-5RFR-37631'
    )
    expect(flags).toBe(true)
    const reconciles = preparedControlGraph.edges.some(
      (edge) =>
        edge.kind === 'reconciles' &&
        (edge.source === 'shipment:SHP-5RFR-37631' || edge.target === 'shipment:SHP-5RFR-37631')
    )
    expect(reconciles).toBe(false)
  })

  it('assigns only LadingLens state classifications to nodes', () => {
    for (const node of preparedControlGraph.nodes) {
      expect(VALID_STATES, `node ${node.id} state ${node.state}`).toContain(node.state)
    }
  })

  it("flags the split booking's two candidate shipments under one ambiguous exception", () => {
    const flagged = preparedControlGraph.edges
      .filter((edge) => edge.source === 'exception:email_009_ambiguous_match' && edge.kind === 'flags')
      .map((edge) => edge.target)
    expect(flagged).toEqual(['shipment:SHP-I978820812-1', 'shipment:SHP-I978820812-2'])
  })

  it('flags every field mismatch against both of its documents', () => {
    const mismatches = preparedControlGraph.nodes.filter((node) => node.kind === 'mismatch')
    expect(mismatches.length).toBeGreaterThan(0)
    for (const mismatch of mismatches) {
      const flagged = preparedControlGraph.edges
        .filter((edge) => edge.source === mismatch.id && edge.kind === 'flags')
        .map((edge) => edge.target)
      expect(
        flagged.some((target) => target.endsWith('_SI.txt')),
        mismatch.id
      ).toBe(true)
      expect(
        flagged.some((target) => target.endsWith('_BL.txt')),
        mismatch.id
      ).toBe(true)
    }
  })
})
