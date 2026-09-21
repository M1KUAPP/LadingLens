import { Component, lazy, Suspense, useCallback, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import FitToScreenIcon from '@hugeicons/core-free-icons/FitToScreenIcon'
import RotateCcwIcon from '@hugeicons/core-free-icons/RotateCcwIcon'
import ZoomInIcon from '@hugeicons/core-free-icons/ZoomInIcon'
import ZoomOutIcon from '@hugeicons/core-free-icons/ZoomOutIcon'
import { Button } from '../../components/ui/Controls'
import { AccessibleGraphTable } from './AccessibleGraphTable'
import type { ControlGraph, GraphHighlight } from './types'
import type { GraphCanvasApi } from './CytoscapeCanvas'
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

type ControlGraphViewProps = {
  graph: ControlGraph
  highlight?: GraphHighlight | null
  pending?: boolean
}

export function ControlGraphView({ graph, highlight = null, pending = false }: ControlGraphViewProps) {
  const [mode, setMode] = useState<ViewMode>('graph')
  const [canvasFailed, setCanvasFailed] = useState(false)
  // The canvas reports its control surface once mounted; the floating tools
  // call through it so the zoom state stays inside Cytoscape.
  const canvasApi = useRef<GraphCanvasApi | null>(null)
  const onUnavailable = useCallback(() => setCanvasFailed(true), [])
  const onInstance = useCallback((api: GraphCanvasApi | null) => {
    canvasApi.current = api
  }, [])

  const empty = graph.nodes.length === 0 && graph.edges.length === 0
  const showCanvas = !empty && mode === 'graph' && !canvasFailed

  function selectMode(next: ViewMode) {
    if (next === 'graph') setCanvasFailed(false)
    setMode(next)
  }

  return (
    <div className="control-graph">
      <div className="control-graph-stage">
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
              <LazyCytoscapeCanvas
                graph={graph}
                highlight={highlight}
                pending={pending}
                onUnavailable={onUnavailable}
                onInstance={onInstance}
              />
            </CanvasBoundary>
          </Suspense>
        ) : (
          <AccessibleGraphTable graph={graph} />
        )}

        {/* Floating tool cluster over the stage: canvas tools first, then the
            canvas-or-table toggle. The toggle stays mounted in table and
            fallback states so there is always a way back to the canvas. */}
        <div className="control-graph-controls" role="group" aria-label="Graph view">
          {showCanvas ? (
            <>
              <Button
                variant="ghost"
                className="control-graph-tool"
                aria-label="Fit graph to view"
                onClick={() => canvasApi.current?.fit()}
              >
                <HugeiconsIcon icon={FitToScreenIcon} size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                className="control-graph-tool"
                aria-label="Zoom in"
                onClick={() => canvasApi.current?.zoomIn()}
              >
                <HugeiconsIcon icon={ZoomInIcon} size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                className="control-graph-tool"
                aria-label="Zoom out"
                onClick={() => canvasApi.current?.zoomOut()}
              >
                <HugeiconsIcon icon={ZoomOutIcon} size={18} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                className="control-graph-tool"
                aria-label="Reset graph layout"
                onClick={() => canvasApi.current?.reset()}
              >
                <HugeiconsIcon icon={RotateCcwIcon} size={18} aria-hidden="true" />
              </Button>
              <span className="control-graph-controls-sep" aria-hidden="true" />
            </>
          ) : null}
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
      </div>
    </div>
  )
}
