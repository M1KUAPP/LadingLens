import { PageHead } from '../components/ui/PageHead'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { preparedControlGraph } from '../features/control-graph/fixtures'

export function GraphPage() {
  return (
    <div className="page">
      <PageHead
        title="Control graph"
        tag="Prepared data"
        hintLabel="Where this graph comes from"
        hint={
          <span>
            Prepared demonstration graph of emails, shipments, parties, ports, documents, and mismatches. Live data
            replaces it when the service connection is ready.
          </span>
        }
      />
      <ControlGraphView graph={preparedControlGraph} />
    </div>
  )
}
