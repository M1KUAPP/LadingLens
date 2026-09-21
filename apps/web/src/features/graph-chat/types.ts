import type { GraphEdgeKind, GraphNodeKind } from '../control-graph/types'
import type { StatusKind } from '../../components/ui/types'

// Wire shapes mirror the backend's snake_case payload; corpusToControlGraph
// in graph-chat-api.ts maps them onto the camelCase canvas types.

export type GraphCorpusNode = {
  id: string
  kind: GraphNodeKind
  identifier: string
  label: string
  state: StatusKind
  detail?: string | null
}

export type GraphCorpusEdge = {
  id: string
  source: string
  target: string
  kind: GraphEdgeKind
  label?: string | null
  state?: StatusKind
}

export type GraphCorpus = {
  source: string
  version: string
  scope: 'overview' | 'full'
  node_count: number
  edge_count: number
  nodes: GraphCorpusNode[]
  edges: GraphCorpusEdge[]
}

export type GraphChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

// A citation points at a node or an edge; kind is a node kind for node
// citations and an edge kind for edge citations.
export type GraphChatCitation = {
  ref: number
  node_id: string | null
  edge_id: string | null
  label: string
  kind: GraphNodeKind | GraphEdgeKind
  state: StatusKind
}

export type GraphChatAnswer = {
  answer: string
  grounded: boolean
  citations: GraphChatCitation[]
  highlight: {
    node_ids: string[]
    edge_ids: string[]
    focus_node_id: string | null
  }
  subgraph: {
    nodes: GraphCorpusNode[]
    edges: GraphCorpusEdge[]
  }
  followups: string[]
  provider: {
    model: string
    decision_source: string
    attempts: number
  }
}

// Starter questions are written against the prepared corpus so a first tap
// lands on an answerable question rather than a refusal.
export const STARTER_QUESTIONS = [
  'Which emails have a consignee mismatch?',
  'Which shipments are missing a case?',
  'Which emails are held for review?',
  'Which documents could not be read?'
] as const
