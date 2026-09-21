import { useEffect, useState } from 'react'
import { useId } from 'react'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import { Button } from '../components/ui/Controls'
import { ChevronDownGlyph } from '../components/ui/Icons'
import { PageHead } from '../components/ui/PageHead'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { preparedControlGraph } from '../features/control-graph/fixtures'
import type { ControlGraph, GraphHighlight } from '../features/control-graph/types'
import { corpusToControlGraph, defaultGraphChatApi } from '../features/graph-chat/graph-chat-api'
import type { GraphChatApiClient } from '../features/graph-chat/graph-chat-api'
import { GraphChatPanel } from '../features/graph-chat/GraphChatPanel'
import './graph-page.css'

function corpusTag(corpus: { source: string } | null | undefined): string {
  // undefined means the fetch is still in flight and null means it failed;
  // in both cases the fixture is what is on the canvas right now.
  if (corpus == null) return 'Prepared fixture'
  return corpus.source === 'recorded' ? 'Recorded data' : 'Prepared data'
}

export function GraphPage({ api = defaultGraphChatApi }: { api?: GraphChatApiClient }) {
  // Highlight and pending live here because the dock seam owns the queries:
  // the assistant panel sets them, the canvas consumes them. The overview is
  // the fixture until the corpus endpoint answers, so the canvas is never
  // empty just because the API was unreachable.
  const [overview, setOverview] = useState<ControlGraph>(preparedControlGraph)
  const [corpus, setCorpus] = useState<{ source: string; version: string } | null | undefined>(undefined)
  const [answerGraph, setAnswerGraph] = useState<ControlGraph | null>(null)
  const [highlight, setHighlight] = useState<GraphHighlight | null>(null)
  const [pending, setPending] = useState(false)
  // Below the sm breakpoint the graph starts behind the disclosure so the
  // dock gets the full height; wider viewports always show it.
  const [graphOpen, setGraphOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 640px)').matches
  )
  const graphRegionId = useId()

  useEffect(() => {
    let cancelled = false
    api
      .getGraphCorpus()
      .then((result) => {
        if (cancelled) return
        setOverview(corpusToControlGraph(result))
        setCorpus({ source: result.source, version: result.version })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCorpus(null)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const graph = answerGraph ?? overview

  function showOverview() {
    setAnswerGraph(null)
    setHighlight(null)
  }

  return (
    <div className="graph-page">
      <PageHead
        card
        icon={Flowchart01Icon}
        title="Control graph"
        supporting="How emails, shipments, parties, ports, and documents connect."
        tag={corpusTag(corpus)}
        hintLabel="Where this graph comes from"
        hint={
          <span>
            The canvas and the assistant are grounded in the corpus endpoint. When it is unreachable the bundled
            prepared fixture is drawn instead, and the tag says so.
          </span>
        }
      />
      <div className="graph-page-body">
        <aside className="graph-dock" aria-label="Assistant">
          <GraphChatPanel
            corpus={corpus}
            onHighlight={setHighlight}
            onPending={setPending}
            onGraph={setAnswerGraph}
            api={api}
          />
        </aside>
        <section className="graph-pane" aria-label="Graph canvas">
          <Button
            variant="ghost"
            className="graph-pane-toggle"
            aria-expanded={graphOpen}
            aria-controls={graphRegionId}
            onClick={() => setGraphOpen((open) => !open)}
          >
            {graphOpen ? 'Hide graph' : 'Show graph'}
            <ChevronDownGlyph size={14} />
          </Button>
          <div className="graph-pane-region" id={graphRegionId} data-collapsed={graphOpen ? undefined : true}>
            {answerGraph ? (
              <Button variant="ghost" className="graph-pane-overview" onClick={showOverview}>
                Show overview
              </Button>
            ) : null}
            <ControlGraphView graph={graph} highlight={highlight} pending={pending} />
          </div>
        </section>
      </div>
    </div>
  )
}
