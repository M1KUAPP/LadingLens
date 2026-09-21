import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Controls'
import { Scrollbar } from '../../components/ui/Domain'
import type { ControlGraph, GraphHighlight } from '../control-graph/types'
import { answerToHighlight, corpusToControlGraph, defaultGraphChatApi } from './graph-chat-api'
import type { GraphChatApiClient } from './graph-chat-api'
import { ChatMessage } from './components/ChatMessage'
import type { ChatEntry } from './components/ChatMessage'
import { ChatComposer } from './components/ChatComposer'
import { SuggestionChips } from './components/SuggestionChips'
import type { GraphChatAnswer, GraphChatCitation, GraphChatTurn } from './types'
import { STARTER_QUESTIONS } from './types'
import './graph-chat.css'

// The backend rejects a longer history or turn, so the client stays inside
// those bounds rather than shipping a 422.
const MAX_HISTORY_TURNS = 6
const MAX_TURN_CHARS = 2000

export type GraphChatPanelProps = {
  /** Corpus provenance for the header pill: undefined while loading, null
      when the corpus fetch failed and the page is showing the fixture. */
  corpus?: { source: string; version: string } | null
  onHighlight?: (highlight: GraphHighlight | null) => void
  onPending?: (pending: boolean) => void
  /** `null` hands the canvas back to the corpus overview. */
  onGraph?: (graph: ControlGraph | null) => void
  /** Called after a citation click has focused its node, to bring the canvas into view. */
  onCitationOpen?: () => void
  /** A control set at the end of the header, after Clear. */
  headerAction?: ReactNode
  api?: GraphChatApiClient
}

function groundingLabel(corpus: GraphChatPanelProps['corpus']): string {
  if (corpus === undefined) return 'Connecting'
  if (corpus === null) return 'Local fixture'
  return `${corpus.source} · ${corpus.version}`
}

function toHistory(entries: ChatEntry[]): GraphChatTurn[] {
  return entries
    .flatMap((entry): GraphChatTurn[] => {
      if (entry.kind === 'user') return [{ role: 'user', content: entry.text }]
      if (entry.kind === 'answer') return [{ role: 'assistant', content: entry.answer.answer }]
      return []
    })
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ ...turn, content: turn.content.slice(0, MAX_TURN_CHARS) }))
}

// The region one citation stands for: the node itself, or the cited edge with
// both endpoints so the ring lands on the relationship it names.
function citationHighlight(citation: GraphChatCitation, subgraph: GraphChatAnswer['subgraph']): GraphHighlight {
  if (citation.node_id !== null) {
    return { nodeIds: [citation.node_id], edgeIds: [] }
  }
  const edge = subgraph.edges.find((candidate) => candidate.id === citation.edge_id)
  return edge
    ? { nodeIds: [edge.source, edge.target], edgeIds: [edge.id] }
    : { nodeIds: [], edgeIds: citation.edge_id ? [citation.edge_id] : [] }
}

export function GraphChatPanel({
  corpus,
  onHighlight,
  onPending,
  onGraph,
  onCitationOpen,
  headerAction,
  api = defaultGraphChatApi
}: GraphChatPanelProps) {
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [pending, setPending] = useState(false)
  const [chips, setChips] = useState<readonly string[]>(STARTER_QUESTIONS)
  const idRef = useRef(0)
  // inFlight is synchronous so a fast second Enter cannot double-send before
  // React has re-rendered the disabled states.
  const inFlightRef = useRef(false)
  // The full highlight of the latest grounded answer, kept so a citation chip
  // can dim everything but its own node on hover and restore on leave.
  const activeHighlightRef = useRef<GraphHighlight | null>(null)
  const logWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = logWrapRef.current?.querySelector<HTMLElement>('.scrollbar-viewport')
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [entries, pending])

  const finish = useCallback(() => {
    inFlightRef.current = false
    setPending(false)
    onPending?.(false)
  }, [onPending])

  const run = useCallback(
    async (question: string, history: GraphChatTurn[]) => {
      try {
        const answer = await api.postGraphChat({ question, history })
        finish()
        setEntries((prev) => [...prev, { kind: 'answer', id: ++idRef.current, answer }])
        setChips(answer.followups)
        if (answer.grounded) {
          if (answer.subgraph.nodes.length > 0) {
            onGraph?.(corpusToControlGraph(answer.subgraph))
          }
          const highlight = answerToHighlight(answer)
          activeHighlightRef.current = highlight
          onHighlight?.(highlight)
        } else {
          // A refusal is a decision, not an error: no retry, no highlight.
          activeHighlightRef.current = null
          onHighlight?.(null)
        }
      } catch (error) {
        finish()
        // An abort means the operator navigated away; nothing to show.
        if (error instanceof DOMException && error.name === 'AbortError') return
        activeHighlightRef.current = null
        onHighlight?.(null)
        const message = error instanceof Error ? error.message : 'The question could not be answered.'
        setEntries((prev) => [...prev, { kind: 'failure', id: ++idRef.current, message, question }])
      }
    },
    [api, finish, onGraph, onHighlight]
  )

  const send = useCallback(
    (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || inFlightRef.current) return
      inFlightRef.current = true
      setPending(true)
      onPending?.(true)
      onHighlight?.(null)
      const history = toHistory(entries)
      setEntries((prev) => [...prev, { kind: 'user', id: ++idRef.current, text: trimmed }])
      void run(trimmed, history)
    },
    [entries, onHighlight, onPending, run]
  )

  const retry = useCallback(
    (entry: Extract<ChatEntry, { kind: 'failure' }>) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      setPending(true)
      onPending?.(true)
      onHighlight?.(null)
      // The failed question is already a user turn; retry resends it without
      // adding a duplicate.
      setEntries((prev) => prev.filter((candidate) => candidate !== entry))
      void run(entry.question, toHistory(entries))
    },
    [entries, onHighlight, onPending, run]
  )

  const clear = useCallback(() => {
    setEntries([])
    setChips(STARTER_QUESTIONS)
    activeHighlightRef.current = null
    onHighlight?.(null)
    onGraph?.(null)
  }, [onGraph, onHighlight])

  const handleCitationEnter = useCallback(
    (citation: GraphChatCitation, subgraph: GraphChatAnswer['subgraph']) => {
      onHighlight?.(citationHighlight(citation, subgraph))
    },
    [onHighlight]
  )
  const handleCitationLeave = useCallback(() => {
    onHighlight?.(activeHighlightRef.current)
  }, [onHighlight])
  const handleCitationClick = useCallback(
    (citation: GraphChatCitation, subgraph: GraphChatAnswer['subgraph']) => {
      const nodeId = citation.node_id ?? subgraph.edges.find((edge) => edge.id === citation.edge_id)?.source
      if (!nodeId) return
      const base = activeHighlightRef.current ?? { nodeIds: [], edgeIds: [] }
      onHighlight?.({ ...base, focusNodeId: nodeId })
      onCitationOpen?.()
    },
    [onHighlight, onCitationOpen]
  )

  return (
    <div className="graph-dock-panel graph-chat-panel">
      <div className="graph-dock-head">
        <h2 className="graph-dock-title">Assistant</h2>
        <div className="graph-chat-head-side">
          <span className="graph-dock-badge">{groundingLabel(corpus)}</span>
          <Button
            variant="ghost"
            className="graph-chat-clear"
            disabled={pending || entries.length === 0}
            onClick={clear}
          >
            Clear
          </Button>
          {headerAction}
        </div>
      </div>
      <div className="graph-chat-log-wrap" ref={logWrapRef}>
        <Scrollbar label="Conversation">
          <ul className="graph-chat-log" role="log" aria-live="polite" aria-label="Conversation">
            {entries.length === 0 && !pending ? (
              <li className="graph-chat-empty">
                Ask about the emails, shipments, parties, ports, and documents in the control graph. Answers cite the
                nodes they used and draw the matching region on the graph.
              </li>
            ) : null}
            {entries.map((entry) => (
              <li key={entry.id} className="graph-chat-entry" data-role={entry.kind === 'user' ? 'user' : 'assistant'}>
                <ChatMessage
                  entry={entry}
                  onCitationEnter={handleCitationEnter}
                  onCitationLeave={handleCitationLeave}
                  onCitationClick={handleCitationClick}
                  onRetry={retry}
                />
              </li>
            ))}
            {pending ? (
              <li className="graph-chat-pending" role="status">
                <span className="graph-chat-pending-bar" aria-hidden="true" />
                Searching the graph…
              </li>
            ) : null}
          </ul>
        </Scrollbar>
      </div>
      <SuggestionChips questions={chips} disabled={pending} onPick={send} />
      <ChatComposer pending={pending} onSend={send} />
    </div>
  )
}
