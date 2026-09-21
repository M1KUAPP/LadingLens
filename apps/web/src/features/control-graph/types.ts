import type { StatusKind } from '../../components/ui/types'

export type GraphNodeKind = 'email' | 'shipment' | 'party' | 'port' | 'document' | 'mismatch' | 'exception'

export type GraphEdgeKind = 'attachment' | 'party_role' | 'routing' | 'reconciles' | 'flags'

export type GraphNode = {
  id: string
  kind: GraphNodeKind
  label: string
  identifier?: string
  state: StatusKind
  detail?: string
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  kind: GraphEdgeKind
  label?: string
  state?: StatusKind
}

export type ControlGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphHighlight = {
  nodeIds: string[]
  edgeIds: string[]
  focusNodeId?: string
}
