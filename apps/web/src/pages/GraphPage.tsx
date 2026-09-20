import { Tooltip } from '../components/ui/Overlays'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { preparedControlGraph } from '../features/control-graph/fixtures'
import './graph-page.css'

export function GraphPage() {
  return (
    <div className="graph-page">
      <header className="graph-page-head">
        <h1 className="type-heading-lg">Control graph</h1>
        <span className="graph-page-tag">Prepared fixture</span>
        <Tooltip label="Where this graph comes from">
          Prepared demonstration graph of emails, shipments, parties, ports, documents, and mismatches. Live data
          replaces it when the service connection is ready.
        </Tooltip>
      </header>
      <ControlGraphView graph={preparedControlGraph} />
    </div>
  )
}
