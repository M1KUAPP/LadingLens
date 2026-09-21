import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Controls'
import {
  VerdictCheckGlyph,
  VerdictCrossGlyph,
  VerdictDashGlyph,
  VerdictHoldGlyph
} from '../../../components/ui/Icons'
import type { StatusKind } from '../../../components/ui/types'
import type { GraphChatAnswer, GraphChatCitation } from '../types'

export type ChatEntry =
  | { kind: 'user'; id: number; text: string }
  | { kind: 'answer'; id: number; answer: GraphChatAnswer }
  | { kind: 'failure'; id: number; message: string; question: string }

type AnswerSubgraph = GraphChatAnswer['subgraph']

type CitationHandlers = {
  onCitationEnter?: (citation: GraphChatCitation, subgraph: AnswerSubgraph) => void
  onCitationLeave?: () => void
  onCitationClick?: (citation: GraphChatCitation, subgraph: AnswerSubgraph) => void
}

// Same verdict glyphs the rest of the UI uses (Domain.tsx's StatusGlyph);
// the chip's data-state supplies the matching state colour in CSS.
function CitationGlyph({ state }: { state: StatusKind }) {
  if (state === 'match') return <VerdictCheckGlyph size={12} />
  if (state === 'mismatch') return <VerdictCrossGlyph size={12} />
  if (state === 'held') return <VerdictHoldGlyph size={12} />
  return <VerdictDashGlyph size={12} />
}

function CitationChip({
  citation,
  subgraph,
  onEnter,
  onLeave,
  onClick
}: {
  citation: GraphChatCitation
  subgraph: AnswerSubgraph
  onEnter?: CitationHandlers['onCitationEnter']
  onLeave?: () => void
  onClick?: CitationHandlers['onCitationClick']
}) {
  return (
    <button
      type="button"
      className="graph-chat-cite"
      // The verdict solid is a border/glyph accent via --cite-state; the
      // glyph itself and the inline position carry the verdict alongside it.
      data-state={citation.state}
      aria-label={`${citation.label} (${citation.state}) — highlight on the graph; press to focus it`}
      onMouseEnter={() => onEnter?.(citation, subgraph)}
      onMouseLeave={() => onLeave?.()}
      onFocus={() => onEnter?.(citation, subgraph)}
      onBlur={() => onLeave?.()}
      onClick={() => onClick?.(citation, subgraph)}
    >
      <span className="graph-chat-cite-glyph">
        <CitationGlyph state={citation.state} />
      </span>
      {citation.label}
    </button>
  )
}

// The answer is plain text with [n] markers; each marker becomes a chip that
// steers the canvas. A marker with no matching citation renders literally —
// the backend validates markers, so this is only a belt-and-braces fallback.
function renderAnswerText(
  answer: GraphChatAnswer,
  handlers: CitationHandlers
): ReactNode[] {
  const byRef = new Map(answer.citations.map((citation) => [citation.ref, citation]))
  return answer.answer.split(/\[(\d+)\]/g).map((part, index) => {
    if (index % 2 === 0) return part
    const citation = byRef.get(Number(part))
    if (!citation) return `[${part}]`
    return (
      <CitationChip
        key={`${citation.ref}-${index}`}
        citation={citation}
        subgraph={answer.subgraph}
        onEnter={handlers.onCitationEnter}
        onLeave={handlers.onCitationLeave}
        onClick={handlers.onCitationClick}
      />
    )
  })
}

export function ChatMessage({
  entry,
  onCitationEnter,
  onCitationLeave,
  onCitationClick,
  onRetry
}: {
  entry: ChatEntry
  onRetry?: (entry: Extract<ChatEntry, { kind: 'failure' }>) => void
} & CitationHandlers) {
  if (entry.kind === 'user') {
    return <p className="graph-chat-user">{entry.text}</p>
  }

  if (entry.kind === 'failure') {
    return (
      <div className="graph-chat-failure">
        <p className="graph-chat-failure-text">{entry.message}</p>
        <Button variant="ghost" className="graph-chat-retry" onClick={() => onRetry?.(entry)}>
          Try again
        </Button>
      </div>
    )
  }

  const { answer } = entry
  return (
    <div className="graph-chat-answer" data-grounded={answer.grounded ? 'true' : 'false'}>
      {answer.grounded ? (
        <p className="graph-chat-answer-text">
          {renderAnswerText(answer, { onCitationEnter, onCitationLeave, onCitationClick })}
        </p>
      ) : (
        <p className="graph-chat-refusal">
          <VerdictHoldGlyph className="graph-chat-refusal-glyph" size={16} />
          <span>{answer.answer}</span>
        </p>
      )}
    </div>
  )
}
