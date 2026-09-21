import { apiJson } from '../../lib/api'
import type { ControlGraph, GraphHighlight } from '../control-graph/types'
import type { GraphChatAnswer, GraphChatTurn, GraphCorpus } from './types'

// The canvas is only ever drawn from the overview scope; the full corpus is
// an unreadable hairball and the API keeps it for grounding, not display.
export function getGraphCorpus(signal?: AbortSignal): Promise<GraphCorpus> {
  return apiJson<GraphCorpus>('/api/graph/corpus?scope=overview', { signal })
}

export type PostGraphChatInput = {
  question: string
  history: GraphChatTurn[]
  signal?: AbortSignal
}

export function postGraphChat({ question, history, signal }: PostGraphChatInput): Promise<GraphChatAnswer> {
  return apiJson<GraphChatAnswer>('/api/graph/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
    signal
  })
}

export function corpusToControlGraph(corpus: Pick<GraphCorpus, 'nodes' | 'edges'>): ControlGraph {
  return {
    nodes: corpus.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      identifier: node.identifier,
      label: node.label,
      state: node.state,
      ...(node.detail != null ? { detail: node.detail } : {})
    })),
    edges: corpus.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      ...(edge.label != null ? { label: edge.label } : {}),
      ...(edge.state != null ? { state: edge.state } : {})
    }))
  }
}

// The wire highlight carries snake_case keys; null focus means none.
export function answerToHighlight(answer: GraphChatAnswer): GraphHighlight | null {
  const { node_ids, edge_ids, focus_node_id } = answer.highlight
  if (node_ids.length === 0 && edge_ids.length === 0) return null
  return {
    nodeIds: node_ids,
    edgeIds: edge_ids,
    ...(focus_node_id != null ? { focusNodeId: focus_node_id } : {})
  }
}

export type GraphChatApiClient = {
  getGraphCorpus: typeof getGraphCorpus
  postGraphChat: typeof postGraphChat
}

export const defaultGraphChatApi: GraphChatApiClient = {
  getGraphCorpus,
  postGraphChat
}
