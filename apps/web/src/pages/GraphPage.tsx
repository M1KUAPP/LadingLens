import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import { PageHead } from '../components/ui/PageHead'
import { ControlGraphView } from '../features/control-graph/ControlGraphView'
import { preparedControlGraph } from '../features/control-graph/fixtures'

export function GraphPage() {
  return (
    <div className="page">
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
      <ControlGraphView graph={preparedControlGraph} />
    </div>
  )
}
