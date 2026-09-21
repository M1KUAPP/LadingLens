import type { StatusKind } from '../../components/ui/types'
import type { ControlGraph, GraphNode } from './types'

/**
 * The control trace: the control graph read as one chain per case. A case is
 * what one email brought in: the email, its documents, and the flags raised
 * on them. The values those documents name (parties and ports) and the
 * shipments the email reconciles to are shared between cases; they are the
 * graph's cross-links, so the trace lists them in every case they touch.
 */

/** The fields a document names, in the order the comparison reads them. */
const FIELD_ORDER = ['Shipper', 'Consignee', 'Notify party', 'Port of loading', 'Port of discharge']

/** Worst first: the order a reader should meet the chains in. */
const SEVERITY: Record<StatusKind, number> = { mismatch: 0, held: 1, neutral: 2, match: 3 }

export type TraceField = {
  label: string
  state: StatusKind
  si: GraphNode | null
  bl: GraphNode | null
}

/** A shipment as one case reaches it, with the reconciliation's outcome. */
export type TraceShipmentLink = {
  shipment: GraphNode
  outcome: string
  state: StatusKind
  flags: GraphNode[]
}

export type TraceCase = {
  key: string
  /** Missing when the email is outside this slice of the graph. */
  email: GraphNode | null
  documents: GraphNode[]
  fields: TraceField[]
  flags: GraphNode[]
  shipments: TraceShipmentLink[]
  state: StatusKind
}

/** A shipment no case in view reconciles to, such as a missing case. */
export type TraceShipment = {
  shipment: GraphNode
  flags: GraphNode[]
}

export type Trace = {
  cases: TraceCase[]
  shipments: TraceShipment[]
  /** Nodes that belong to no case or shipment in view. */
  loose: GraphNode[]
}

export function worstState(states: StatusKind[], none: StatusKind = 'neutral'): StatusKind {
  if (states.length === 0) return none
  return states.reduce((worst, state) => (SEVERITY[state] < SEVERITY[worst] ? state : worst))
}

export function isFlag(node: GraphNode): boolean {
  return node.kind === 'mismatch' || node.kind === 'exception'
}

function isDraftBl(document: GraphNode): boolean {
  return /draft|bill of lading|\bBL\b/i.test(document.label)
}

function byIdentifier(a: GraphNode, b: GraphNode): number {
  return (a.identifier ?? a.id).localeCompare(b.identifier ?? b.id, undefined, { numeric: true })
}

export function traceGraph(graph: ControlGraph): Trace {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const kindOf = (id: string) => byId.get(id)?.kind

  // A flag on a shipment belongs to the shipment, never to the cases the
  // reconciliation also names, or it would stitch those cases together.
  const shipmentFlags = new Map<string, GraphNode[]>()
  for (const edge of graph.edges) {
    const flag = byId.get(edge.source)
    if (edge.kind !== 'flags' || !flag || kindOf(edge.target) !== 'shipment') continue
    shipmentFlags.set(edge.target, [...(shipmentFlags.get(edge.target) ?? []), flag])
  }
  const ownedByShipment = new Set([...shipmentFlags.values()].flat().map((flag) => flag.id))

  const isPrivate = (node: GraphNode) =>
    node.kind === 'email' || node.kind === 'document' || (isFlag(node) && !ownedByShipment.has(node.id))

  // Union-find over the case-private nodes: every email, document and case
  // flag joined through an edge lands in the same case.
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root) as string
    parent.set(id, root)
    return root
  }
  for (const node of graph.nodes) if (isPrivate(node)) parent.set(node.id, node.id)
  for (const edge of graph.edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) parent.set(find(edge.source), find(edge.target))
  }

  const members = new Map<string, GraphNode[]>()
  for (const node of graph.nodes) {
    if (!parent.has(node.id)) continue
    const root = find(node.id)
    members.set(root, [...(members.get(root) ?? []), node])
  }

  const placed = new Set<string>()
  const reached = new Set<string>()

  const cases: TraceCase[] = [...members.values()].map((nodes) => {
    const ids = new Set(nodes.map((node) => node.id))
    const email = nodes.find((node) => node.kind === 'email') ?? null
    const documents = nodes
      .filter((node) => node.kind === 'document')
      .sort((a, b) => Number(isDraftBl(a)) - Number(isDraftBl(b)) || byIdentifier(a, b))
    const flags = nodes.filter(isFlag).sort(byIdentifier)

    const fields = new Map<string, TraceField>()
    // A field is what a document names; a flag also points at the value it
    // flags, but that edge is the flag, not a field.
    for (const edge of graph.edges) {
      if (edge.kind !== 'party_role' && edge.kind !== 'routing') continue
      const document = byId.get(edge.source)
      const value = byId.get(edge.target)
      if (document?.kind !== 'document' || !value || !ids.has(document.id)) continue
      const label = edge.label ?? value.kind
      const field = fields.get(label) ?? { label, state: 'neutral' as StatusKind, si: null, bl: null }
      if (isDraftBl(document)) field.bl = value
      else field.si = value
      field.state = worstState([field.state, edge.state ?? value.state].filter((state) => state !== 'neutral'))
      fields.set(label, field)
      placed.add(value.id)
    }

    const shipments: TraceShipmentLink[] = graph.edges
      .filter((edge) => edge.kind === 'reconciles' && email && edge.source === email.id)
      .flatMap((edge) => {
        const shipment = byId.get(edge.target)
        if (!shipment) return []
        reached.add(shipment.id)
        const linkFlags = shipmentFlags.get(shipment.id) ?? []
        return [
          { shipment, outcome: edge.label ?? shipment.label, state: edge.state ?? shipment.state, flags: linkFlags }
        ]
      })

    for (const node of nodes) placed.add(node.id)
    const state = email?.state ?? worstState([...documents, ...flags].map((node) => node.state))
    return {
      key: email?.id ?? nodes[0].id,
      email,
      documents,
      fields: [...fields.values()].sort(
        (a, b) =>
          (FIELD_ORDER.indexOf(a.label) + 1 || FIELD_ORDER.length + 1) -
          (FIELD_ORDER.indexOf(b.label) + 1 || FIELD_ORDER.length + 1)
      ),
      flags,
      shipments,
      state
    }
  })

  cases.sort(
    (a, b) =>
      SEVERITY[a.state] - SEVERITY[b.state] ||
      (a.email ? 0 : 1) - (b.email ? 0 : 1) ||
      a.key.localeCompare(b.key, undefined, { numeric: true })
  )

  const shipments: TraceShipment[] = graph.nodes
    .filter((node) => node.kind === 'shipment' && !reached.has(node.id))
    .sort((a, b) => SEVERITY[a.state] - SEVERITY[b.state] || byIdentifier(a, b))
    .map((shipment) => ({ shipment, flags: shipmentFlags.get(shipment.id) ?? [] }))

  for (const node of graph.nodes) if (node.kind === 'shipment') placed.add(node.id)
  for (const flag of ownedByShipment) placed.add(flag)

  return { cases, shipments, loose: graph.nodes.filter((node) => !placed.has(node.id)) }
}

/** Every node id a case row shows. */
export function caseNodeIds(entry: TraceCase): string[] {
  return [
    ...(entry.email ? [entry.email.id] : []),
    ...entry.documents.map((node) => node.id),
    ...entry.fields.flatMap((field) => [field.si?.id, field.bl?.id].filter((id): id is string => Boolean(id))),
    ...entry.flags.map((node) => node.id),
    ...entry.shipments.flatMap((link) => [link.shipment.id, ...link.flags.map((flag) => flag.id)])
  ]
}

/** Every node id a shipment row shows. */
export function shipmentNodeIds(entry: TraceShipment): string[] {
  return [entry.shipment.id, ...entry.flags.map((node) => node.id)]
}

/** The two graphs as one, first wins on a shared id. */
export function mergeGraphs(a: ControlGraph, b: ControlGraph): ControlGraph {
  const nodeIds = new Set(a.nodes.map((node) => node.id))
  const edgeIds = new Set(a.edges.map((edge) => edge.id))
  return {
    nodes: [...a.nodes, ...b.nodes.filter((node) => !nodeIds.has(node.id))],
    edges: [...a.edges, ...b.edges.filter((edge) => !edgeIds.has(edge.id))]
  }
}

/**
 * The part of the trace an answer is about: the cases whose own nodes (the
 * email, its documents, its flags) the answer drew, and the shipments it
 * drew. Shared values do not pull a case in on their own, or a common port
 * would bring back half the graph. Whatever the answer drew that no kept row
 * shows is listed loose, so nothing it cited goes missing.
 */
export function scopeTrace(trace: Trace, answer: GraphNode[]): Trace {
  const ids = new Set(answer.map((node) => node.id))
  const own = (entry: TraceCase) =>
    [entry.email, ...entry.documents, ...entry.flags].some((node) => node && ids.has(node.id))
  const cases = trace.cases.filter(own)
  const shipments = trace.shipments.filter((entry) => ids.has(entry.shipment.id))
  const shown = new Set([...cases.flatMap(caseNodeIds), ...shipments.flatMap(shipmentNodeIds)])
  return { cases, shipments, loose: answer.filter((node) => !shown.has(node.id)) }
}
