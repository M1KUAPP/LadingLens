import { describe, expect, it } from 'vitest'
import { preparedControlGraph } from './fixtures'

const REQUIRED_EMAILS = ['email_001', 'email_507', 'email_511', 'email_516', 'email_ambiguous']

const REQUIRED_SHIPMENTS = ['SYN-001', 'SYN-007', 'SYN-013', 'SYN-021', 'SYN-033', 'SYN-042']

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

  it('includes the named email cases, including the verified ambiguous item', () => {
    for (const emailId of REQUIRED_EMAILS) {
      const node = preparedControlGraph.nodes.find((node) => node.kind === 'email' && node.identifier === emailId)
      expect(node, emailId).toBeDefined()
    }
  })

  it('includes all six synthetic shipments', () => {
    for (const shipmentId of REQUIRED_SHIPMENTS) {
      const node = preparedControlGraph.nodes.find((node) => node.kind === 'shipment' && node.identifier === shipmentId)
      expect(node, shipmentId).toBeDefined()
    }
  })

  it('marks SYN-042 as MISSING_CASE with no case edge', () => {
    const missing = preparedControlGraph.nodes.find(
      (node) => node.kind === 'exception' && node.detail?.includes('MISSING_CASE')
    )
    expect(missing).toBeDefined()
    const flags = preparedControlGraph.edges.some(
      (edge) =>
        edge.source === missing!.id &&
        edge.kind === 'flags' &&
        preparedControlGraph.nodes.some((node) => node.id === edge.target && node.identifier === 'SYN-042')
    )
    expect(flags).toBe(true)
    const reconciles = preparedControlGraph.edges.some(
      (edge) => edge.kind === 'reconciles' && (edge.source === 'shipment:SYN-042' || edge.target === 'shipment:SYN-042')
    )
    expect(reconciles).toBe(false)
  })

  it('assigns only LadingLens state classifications to nodes', () => {
    for (const node of preparedControlGraph.nodes) {
      expect(VALID_STATES, `node ${node.id} state ${node.state}`).toContain(node.state)
    }
  })

  it('keeps the verified ambiguous item in held review state', () => {
    const ambiguous = preparedControlGraph.nodes.find((node) => node.identifier === 'email_ambiguous')
    expect(ambiguous?.state).toBe('held')
  })

  it('flags the email_001 consignee mismatch against both documents', () => {
    const mismatch = preparedControlGraph.nodes.find((node) => node.kind === 'mismatch')
    expect(mismatch).toBeDefined()
    const flagged = preparedControlGraph.edges
      .filter((edge) => edge.source === mismatch!.id && edge.kind === 'flags')
      .map((edge) => edge.target)
    expect(flagged).toContain('document:email_001_SI.txt')
    expect(flagged).toContain('document:email_001_BL.txt')
  })
})
