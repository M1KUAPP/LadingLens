import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { preparedControlGraph } from '../control-graph/fixtures'
import type { ControlGraph, GraphHighlight } from '../control-graph/types'
import { GraphAssistantContext, type CorpusMeta } from './assistant-context'
import { corpusToControlGraph, defaultGraphChatApi, type GraphChatApiClient } from './graph-chat-api'

/**
 * The assistant outlives any one page. The floating panel and the /graph
 * canvas both read this state, so an answer asked on the inbox is still drawn
 * when the graph opens. The overview is the fixture until the corpus endpoint
 * answers, so the canvas is never empty just because the API was unreachable.
 */
export function GraphAssistantProvider({
  api = defaultGraphChatApi,
  children
}: {
  api?: GraphChatApiClient
  children: ReactNode
}) {
  const [corpus, setCorpus] = useState<CorpusMeta | null | undefined>(undefined)
  const [overview, setOverview] = useState<ControlGraph>(preparedControlGraph)
  const [answerGraph, setAnswerGraph] = useState<ControlGraph | null>(null)
  const [highlight, setHighlight] = useState<GraphHighlight | null>(null)
  const [pending, setPending] = useState(false)
  const requested = useRef(false)

  const loadCorpus = useCallback(() => {
    if (requested.current) return
    requested.current = true
    api
      .getGraphCorpus()
      .then((result) => {
        setOverview(corpusToControlGraph(result))
        setCorpus({ source: result.source, version: result.version })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCorpus(null)
      })
  }, [api])

  const assistant = useMemo(
    () => ({
      api,
      corpus,
      overview,
      answerGraph,
      highlight,
      pending,
      loadCorpus,
      setAnswerGraph,
      setHighlight,
      setPending
    }),
    [api, corpus, overview, answerGraph, highlight, pending, loadCorpus]
  )

  return <GraphAssistantContext.Provider value={assistant}>{children}</GraphAssistantContext.Provider>
}
