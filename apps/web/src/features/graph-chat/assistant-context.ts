import { createContext, useContext } from 'react'
import type { ControlGraph, GraphHighlight } from '../control-graph/types'
import type { GraphChatApiClient } from './graph-chat-api'

export type CorpusMeta = { source: string; version: string }

/** What the floating assistant and the /graph canvas share. */
export type GraphAssistant = {
  api: GraphChatApiClient
  /** undefined until the corpus has answered, null when its fetch failed. */
  corpus: CorpusMeta | null | undefined
  /** The corpus overview, or the bundled fixture until it arrives. */
  overview: ControlGraph
  /** The latest grounded answer's subgraph, drawn in place of the overview. */
  answerGraph: ControlGraph | null
  highlight: GraphHighlight | null
  pending: boolean
  /** Fetches the corpus once, the first time anything asks for it. */
  loadCorpus: () => void
  setAnswerGraph: (graph: ControlGraph | null) => void
  setHighlight: (highlight: GraphHighlight | null) => void
  setPending: (pending: boolean) => void
}

export const GraphAssistantContext = createContext<GraphAssistant | null>(null)

export function useGraphAssistant(): GraphAssistant {
  const assistant = useContext(GraphAssistantContext)
  if (!assistant) throw new Error('useGraphAssistant needs a GraphAssistantProvider above it')
  return assistant
}
