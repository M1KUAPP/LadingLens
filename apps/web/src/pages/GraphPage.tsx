import { useId, useState } from 'react'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import { Button } from '../components/ui/Controls'
import { ChevronDownGlyph } from '../components/ui/Icons'
import { PageHead } from '../components/ui/PageHead'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { preparedControlGraph } from '../features/control-graph/fixtures'
import type { GraphHighlight } from '../features/control-graph/types'
import { GraphDockPlaceholder } from './GraphDockPlaceholder'
import './graph-page.css'

export function GraphPage() {
  // Highlight and pending live here because the dock seam owns the queries:
  // the assistant panel sets them, the canvas consumes them.
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

  return (
    <div className="graph-page">
      <PageHead
        card
        icon={Flowchart01Icon}
        title="Control graph"
        supporting="How emails, shipments, parties, ports, and documents connect."
        tag="Prepared data"
        hintLabel="Where this graph comes from"
        hint={
          <span>
            Prepared demonstration graph of emails, shipments, parties, ports, documents, and mismatches. Live data
            replaces it when the service connection is ready.
          </span>
        }
      />
      <div className="graph-page-body">
        <aside className="graph-dock" aria-label="Assistant">
          {/* Dock seam: the assistant workstream replaces this one element. */}
          <GraphDockPlaceholder onHighlight={setHighlight} onPending={setPending} />
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
            <ControlGraphView graph={preparedControlGraph} highlight={highlight} pending={pending} />
          </div>
        </section>
      </div>
    </div>
  )
}
