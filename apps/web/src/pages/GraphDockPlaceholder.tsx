import { Button } from '../components/ui/Controls'
import type { GraphHighlight } from '../features/control-graph/types'

// Seam for the assistant workstream: GraphPage owns the highlight and pending
// state and hands the setters to whatever dock sits here. The next worker
// replaces this component with the real chat panel and keeps the same props;
// they are unused for now because the placeholder drives nothing.
export type GraphDockPlaceholderProps = {
  onHighlight?: (highlight: GraphHighlight | null) => void
  onPending?: (pending: boolean) => void
}

export function GraphDockPlaceholder(_props: GraphDockPlaceholderProps) {
  return (
    <div className="graph-dock-panel">
      <div className="graph-dock-head">
        <h2 className="graph-dock-title">Assistant</h2>
        <span className="graph-dock-badge">Preview</span>
      </div>
      <p className="graph-dock-empty">
        Ask about this graph once the assistant ships. Answers will highlight the nodes and edges they reference.
      </p>
      <div className="graph-dock-input-row">
        <input
          className="graph-dock-input"
          type="text"
          placeholder="Ask about this graph…"
          aria-label="Ask about this graph"
          disabled
        />
        <Button variant="primary" disabled>
          Send
        </Button>
      </div>
    </div>
  )
}
