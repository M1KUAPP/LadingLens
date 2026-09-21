import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ControlTrace } from './ControlTrace'
import type { ControlGraph, GraphEdge, GraphHighlight, GraphNode } from './types'

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

// Two cases sharing a port, one with a consignee mismatch, and a shipment the
// ledger expects that no email reached.
const GRAPH: ControlGraph = {
  nodes: [
    node('email:e1', 'email', 'First subject', 'mismatch'),
    node('document:e1_si', 'document', 'Shipping instruction'),
    node('document:e1_bl', 'document', 'Draft bill of lading'),
    node('party:acme', 'party', 'ACME'),
    node('party:acme_ltd', 'party', 'ACME LTD'),
    node('port:mersin', 'port', 'MERSIN'),
    node('mismatch:e1_consignee', 'mismatch', 'Consignee mismatch', 'mismatch'),
    node('email:e2', 'email', 'Second subject', 'match'),
    node('document:e2_si', 'document', 'Shipping instruction'),
    node('shipment:SYN-001', 'shipment', 'SYN-BK-001', 'match'),
    node('shipment:SYN-042', 'shipment', 'SYN-BK-042', 'mismatch'),
    node('exception:syn_042_missing', 'exception', 'Missing case', 'mismatch')
  ],
  edges: [
    edge('a1', 'email:e1', 'document:e1_si', 'attachment'),
    edge('a2', 'email:e1', 'document:e1_bl', 'attachment'),
    edge('f1', 'document:e1_si', 'party:acme', 'party_role', 'Consignee', 'mismatch'),
    edge('f2', 'document:e1_bl', 'party:acme_ltd', 'party_role', 'Consignee', 'mismatch'),
    edge('f3', 'document:e1_si', 'port:mersin', 'routing', 'Port of loading', 'match'),
    edge('m1', 'mismatch:e1_consignee', 'document:e1_si', 'flags'),
    edge('a3', 'email:e2', 'document:e2_si', 'attachment'),
    edge('f5', 'document:e2_si', 'port:mersin', 'routing', 'Port of loading', 'match'),
    edge('r1', 'email:e2', 'shipment:SYN-001', 'reconciles', 'Case present', 'match'),
    edge('x1', 'exception:syn_042_missing', 'shipment:SYN-042', 'flags')
  ]
}

function renderTrace(props: Partial<Parameters<typeof ControlTrace>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ControlTrace graph={GRAPH} {...props} />
    </MemoryRouter>
  )
}

function rows() {
  return within(screen.getByRole('table', { name: 'Control trace' }))
    .getAllByRole('row')
    .slice(1)
}

describe('ControlTrace', () => {
  it('reads one chain per case, worst first, then the shipments no email reached', () => {
    renderTrace()
    const [first, second, third] = rows()
    expect(within(first).getByRole('link', { name: 'e1' })).toHaveAttribute('href', '/emails/e1')
    expect(within(second).getByRole('link', { name: 'e2' })).toBeInTheDocument()
    expect(within(third).getByText('No email case')).toBeInTheDocument()
    expect(within(third).getByText('Missing case')).toBeInTheDocument()
  })

  it('restates every stage verdict with a glyph and its name', () => {
    renderTrace()
    const [first] = rows()
    const markers = within(first)
      .getAllByRole('img')
      .map((glyph) => glyph.getAttribute('aria-label'))
    // Case, documents, checked fields and flags break; no shipment is linked.
    expect(markers.slice(0, 2)).toEqual(['Mismatch', 'Match'])
    expect(markers).toContain('Not compared')
  })

  it('shows both sides of a field only where they differ', () => {
    renderTrace()
    const [first] = rows()
    expect(within(first).getByRole('button', { name: 'ACME' })).toBeInTheDocument()
    expect(within(first).getByRole('button', { name: 'ACME LTD' })).toBeInTheDocument()
    expect(within(first).getAllByText('SI')).not.toHaveLength(0)
    expect(within(first).getAllByRole('button', { name: 'MERSIN' })).toHaveLength(1)
  })

  it('filters the chains by verdict, with counts', async () => {
    const user = userEvent.setup()
    renderTrace()
    const filters = screen.getByRole('group', { name: 'Show cases' })
    expect(within(filters).getByRole('button', { name: /All\s*3/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(filters).getByRole('button', { name: /Match\s*1/ }))
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByRole('link', { name: 'e2' })).toBeInTheDocument()
  })

  it('traces a shared value: its cases stay, the rest step back', async () => {
    const user = userEvent.setup()
    renderTrace()
    const [first] = rows()
    await user.click(within(first).getByRole('button', { name: 'MERSIN' }))
    expect(screen.getByRole('status')).toHaveTextContent('Tracing MERSIN, named in 2 cases.')
    const [one, two, three] = rows()
    expect(one).toHaveAttribute('data-lit', 'true')
    expect(two).toHaveAttribute('data-lit', 'true')
    expect(three).toHaveAttribute('data-lit', 'false')
    for (const chip of screen.getAllByRole('button', { name: 'MERSIN' }))
      expect(chip).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Stop tracing' }))
    expect(rows()[2]).not.toHaveAttribute('data-lit')
  })

  it('lights what the assistant highlighted and scrolls its focus into view', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const highlight: GraphHighlight = { nodeIds: ['shipment:SYN-001'], edgeIds: [], focusNodeId: 'shipment:SYN-001' }
    renderTrace({ highlight })
    const [first, second] = rows()
    expect(first).toHaveAttribute('data-lit', 'false')
    expect(second).toHaveAttribute('data-lit', 'true')
    expect(within(second).getByRole('button', { name: 'SYN-001' })).toHaveAttribute('data-lit', 'true')
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('narrows to the cases an answer drew', () => {
    const answer: ControlGraph = { nodes: [GRAPH.nodes[6], GRAPH.nodes[1]], edges: [] }
    renderTrace({ answer })
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByRole('link', { name: 'e1' })).toBeInTheDocument()
  })

  it('marks the trace busy while the assistant works', () => {
    renderTrace({ pending: true })
    expect(screen.getByRole('table', { name: 'Control trace' }).closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true'
    )
  })

  it('says so when there is nothing to trace', () => {
    renderTrace({ graph: { nodes: [], edges: [] } })
    expect(screen.getByText('Nothing to trace in this graph yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
