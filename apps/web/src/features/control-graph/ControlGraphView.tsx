import { Component, lazy, Suspense, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '../../components/ui/Controls'
import { AccessibleGraphTable } from './AccessibleGraphTable'
import type { ControlGraph } from './types'
import './control-graph.css'

const LazyCytoscapeCanvas = lazy(() => import('./CytoscapeCanvas'))

type CanvasBoundaryProps = {
  onFailure: () => void
  children: ReactNode
}

class CanvasBoundary extends Component<CanvasBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFailure()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

type ViewMode = 'graph' | 'table'

export function ControlGraphView({ graph }: { graph: ControlGraph }) {
  const [mode, setMode] = useState<ViewMode>('graph')
  const [canvasFailed, setCanvasFailed] = useState(false)

  const empty = graph.nodes.length === 0 && graph.edges.length === 0
  const showCanvas = !empty && mode === 'graph' && !canvasFailed

  function selectMode(next: ViewMode) {
    if (next === 'graph') setCanvasFailed(false)
    setMode(next)
  }

  return (
    <div className="control-graph">
      <div className="control-graph-toggle" role="group" aria-label="Graph view">
        <Button
          variant={mode === 'graph' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'graph'}
          onClick={() => selectMode('graph')}
        >
          Graph canvas
        </Button>
        <Button
          variant={mode === 'table' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'table'}
          onClick={() => selectMode('table')}
        >
          Table view
        </Button>
      </div>

      {mode === 'graph' && canvasFailed && !empty ? (
        <p className="control-graph-fallback-note" role="status">
          The graph canvas is unavailable, so every node and relationship is listed below.
        </p>
      ) : null}

      {empty ? (
        <AccessibleGraphTable graph={graph} />
      ) : showCanvas ? (
        <Suspense
          fallback={
            <p className="control-graph-loading" role="status">
              Loading graph canvas…
            </p>
          }
        >
          <CanvasBoundary onFailure={() => setCanvasFailed(true)}>
            <LazyCytoscapeCanvas graph={graph} onUnavailable={() => setCanvasFailed(true)} />
          </CanvasBoundary>
        </Suspense>
      ) : (
        <AccessibleGraphTable graph={graph} />
      )}
    </div>
  )
}
