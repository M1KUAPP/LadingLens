import { useEffect } from 'react'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import { Button } from '../components/ui/Controls'
import { PageHead } from '../components/ui/PageHead'
import { ControlTrace } from '../features/control-graph/ControlTrace'
import { useGraphAssistant } from '../features/graph-chat/assistant-context'
import './graph-page.css'

function corpusTag(corpus: { source: string } | null | undefined): string {
  // undefined means the fetch is still in flight and null means it failed;
  // in both cases the fixture is what the trace reads right now.
  if (corpus == null) return 'Prepared fixture'
  return corpus.source === 'recorded' ? 'Recorded data' : 'Prepared data'
}

export function GraphPage() {
  // The floating assistant owns the questions; the trace narrows to what it
  // answered and lights what it cited.
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
    <div className="page graph-page">
      <PageHead
        icon={Flowchart01Icon}
        title="Control graph"
        supporting="Each case traced from its email to its shipment, and where the chain broke."
        tag={corpusTag(corpus)}
        hintLabel="Where this graph comes from"
        hint={
          <span>
            The trace and the assistant are grounded in the corpus endpoint. When it is unreachable the bundled prepared
            fixture is read instead, and the tag says so. Press a party, a port or a shipment to trace every case it
            connects.
          </span>
        }
      />
      {answerGraph ? (
        <div className="graph-answer" role="status">
          <span>Showing the cases in the assistant's answer.</span>
          <Button variant="secondary" onClick={showOverview}>
            Show overview
          </Button>
        </div>
      ) : null}
      <section aria-label="Control trace">
        <ControlTrace graph={overview} answer={answerGraph} highlight={highlight} pending={pending} />
      </section>
    </div>
  )
}
