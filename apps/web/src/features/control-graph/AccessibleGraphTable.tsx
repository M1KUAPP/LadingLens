import { Scrollbar, StatusPill } from '../../components/ui/Domain'
import type { StatusKind } from '../../components/ui/types'
import type { ControlGraph, GraphEdgeKind, GraphNode, GraphNodeKind } from './types'

const KIND_LABEL: Record<GraphNodeKind, string> = {
  email: 'Email',
  shipment: 'Shipment',
  party: 'Party',
  port: 'Port',
  document: 'Document',
  mismatch: 'Mismatch',
  exception: 'Exception'
}

const EDGE_KIND_LABEL: Record<GraphEdgeKind, string> = {
  attachment: 'Attachment',
  party_role: 'Party role',
  routing: 'Routing',
  reconciles: 'Reconciles',
  flags: 'Flag'
}

const STATE_LABEL: Record<StatusKind, string> = {
  match: 'Match',
  mismatch: 'Mismatch',
  held: 'Held',
  neutral: 'Not compared'
}

function nodeKey(node: GraphNode | undefined, fallback: string) {
  return node ? (node.identifier ?? node.label) : fallback
}

export function AccessibleGraphTable({ graph }: { graph: ControlGraph }) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))

  if (graph.nodes.length === 0 && graph.edges.length === 0) {
    return <p className="graph-table-empty">No graph nodes or relationships.</p>
  }

  return (
    <div className="graph-table">
      <Scrollbar label="Graph nodes">
        <table className="graph-table-nodes">
          <caption>Graph nodes</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Type</th>
              <th scope="col">Name</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {graph.nodes.map((node) => (
              <tr key={node.id}>
                <td className="type-data-sm">{nodeKey(node, node.id)}</td>
                <td>{KIND_LABEL[node.kind]}</td>
                <td>
                  {node.label}
                  {node.detail ? <span className="graph-table-detail">{node.detail}</span> : null}
                </td>
                <td>
                  <StatusPill status={node.state}>{STATE_LABEL[node.state]}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scrollbar>
      <Scrollbar label="Graph relationships">
        <table className="graph-table-edges">
          <caption>Graph relationships</caption>
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">Relationship</th>
              <th scope="col">To</th>
            </tr>
          </thead>
          <tbody>
            {graph.edges.map((edge) => (
              <tr key={edge.id} data-state={edge.state}>
                <td className="type-data-sm">{nodeKey(byId.get(edge.source), edge.source)}</td>
                <td>{edge.label ?? EDGE_KIND_LABEL[edge.kind]}</td>
                <td className="type-data-sm">{nodeKey(byId.get(edge.target), edge.target)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scrollbar>
    </div>
  )
}
