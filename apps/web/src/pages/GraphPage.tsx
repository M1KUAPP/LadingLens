import { useEffect } from 'react'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import { Button } from '../components/ui/Controls'
import { PageHead } from '../components/ui/PageHead'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { useGraphAssistant } from '../features/graph-chat/assistant-context'
import './graph-page.css'

function corpusTag(corpus: { source: string } | null | undefined): string {
  // undefined means the fetch is still in flight and null means it failed;
  // in both cases the fixture is what is on the canvas right now.
  if (corpus == null) return 'Prepared fixture'
  return corpus.source === 'recorded' ? 'Recorded data' : 'Prepared data'
}

export function GraphPage() {
  // The floating assistant owns the questions; the canvas draws what it
  // answered: the answer's subgraph, its highlight, and the pending scan.
  const { corpus, overview, answerGraph, highlight, pending, loadCorpus, setAnswerGraph, setHighlight } =
    useGraphAssistant()

  useEffect(() => {
    loadCorpus()
  }, [loadCorpus])

  function showOverview() {
    setAnswerGraph(null)
    setHighlight(null)
  }

  return (
    <div className="graph-page">
      <PageHead
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
      <section className="graph-pane" aria-label="Graph canvas">
        {answerGraph ? (
          <Button variant="secondary" className="graph-pane-overview" onClick={showOverview}>
            Show overview
          </Button>
        ) : null}
        <ControlGraphView graph={answerGraph ?? overview} highlight={highlight} pending={pending} />
      </section>
    </div>
  )
}
