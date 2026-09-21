import { useEffect, useId, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Button } from '../../components/ui/Controls'
import { ChevronDownGlyph } from '../../components/ui/Icons'
import type { StatusKind } from '../../components/ui/types'
import type { ControlGraph, GraphHighlight, GraphNodeKind } from './types'
import { scatterPositions } from './layout'

// The handle ControlGraphView's floating tool cluster calls into. Zoom is a
// viewport operation, so it stays a method call rather than a prop.
export type GraphCanvasApi = {
  fit(): void
  zoomIn(): void
  zoomOut(): void
  reset(): void
}

const STATE_TOKEN: Record<StatusKind, string> = {
  match: '--state-match-solid',
  mismatch: '--state-mismatch-solid',
  held: '--state-held-solid',
  neutral: '--state-neutral-text'
}

const STATE_GLYPH: Record<StatusKind, string> = {
  match: '✓',
  mismatch: '✕',
  held: '‖',
  neutral: '–'
}

const STATE_NAME: Record<StatusKind, string> = {
  match: 'Match',
  mismatch: 'Mismatch',
  held: 'Held',
  neutral: 'Not compared'
}

const KIND_SHAPE: Record<GraphNodeKind, cytoscape.Css.NodeShape> = {
  email: 'ellipse',
  shipment: 'round-rectangle',
  party: 'hexagon',
  port: 'diamond',
  document: 'rectangle',
  mismatch: 'triangle',
  exception: 'octagon'
}

const KIND_NAME: Record<GraphNodeKind, string> = {
  email: 'Email',
  shipment: 'Shipment',
  party: 'Party',
  port: 'Port',
  document: 'Document',
  mismatch: 'Mismatch',
  exception: 'Exception'
}

const FIT_PADDING = 32
const ZOOM_STEP = 1.3
const FOCUS_ZOOM = 1.25

// The corpus is a set of per-email cases plus shared parties and ports, so
// ranked layouts collapse: one breadth-first level holds ~40 nodes and
// draws as a single horizontal line. `scatterPositions` deals each case a
// block of cells on a jittered field instead — see layout.ts. Positions are
// precomputed and handed to `preset`; `randomize` is not a preset option
// but the flag keeps the deterministic contract explicit for whichever
// layout lives here.
function layoutOptions(graph: ControlGraph): cytoscape.LayoutOptions {
  return {
    name: 'preset',
    positions: scatterPositions(graph),
    padding: FIT_PADDING,
    animate: false,
    randomize: false
  } as cytoscape.LayoutOptions
}

function readToken(name: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? undefined : value
}

function buildStylesheet(): cytoscape.StylesheetJson {
  const text = readToken('--text-primary')
  const labelBack = readToken('--surface-canvas')
  const surface = readToken('--surface-raised')
  const border = readToken('--border-default')
  // Cytoscape's style parser rejects quoted family names.
  const font = readToken('--font-data')?.replace(/['"]/g, '')
  const stateColor = (state: StatusKind) => readToken(STATE_TOKEN[state])

  const nodeStyle: Record<string, string | number> = {
    label: 'data(label)',
    'text-valign': 'bottom',
    'text-margin-y': 6,
    'font-size': 12,
    'text-wrap': 'ellipsis',
    // The scatter layout pitches nodes ~115px apart, so the cap has to sit
    // under that or long identifiers collide; the full label is one hover
    // or the table away.
    'text-max-width': '100px',
    'border-width': 2,
    // Degree drives size so hubs read as hubs; the floor keeps an isolated
    // node large enough to click.
    width: 'mapData(degree, 0, 6, 30, 56)',
    height: 'mapData(degree, 0, 6, 30, 56)'
  }
  if (font) nodeStyle['font-family'] = font
  if (text) nodeStyle['color'] = text
  if (surface) nodeStyle['background-color'] = surface
  if (border) nodeStyle['border-color'] = border

  const edgeLabelStyle: Record<string, string | number> = {
    label: 'data(label)',
    'font-size': 9,
    'text-rotation': 'autorotate',
    'text-background-opacity': 0.92,
    'text-background-padding': '2px',
    'text-background-shape': 'round-rectangle'
  }
  if (labelBack) edgeLabelStyle['text-background-color'] = labelBack
  if (text) edgeLabelStyle['color'] = text
  if (font) edgeLabelStyle['font-family'] = font

  const stylesheet: cytoscape.StylesheetJson = [
    { selector: 'node', css: nodeStyle },
    {
      selector: 'edge',
      css: {
        width: 1.5,
        'line-color': border,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': border,
        'curve-style': 'bezier',
        'font-size': 9,
        ...(text ? { color: text } : {}),
        ...(font ? { 'font-family': font } : {})
      }
    },
    // Edge labels are noise at this density: they surface on hover, on
    // selection, and while the edge is part of an active highlight.
    { selector: 'edge.edge-labeled, edge.hl-on, edge:selected', css: edgeLabelStyle },
    { selector: '.hl-dim', css: { opacity: 0.12 } },
    { selector: 'edge.hl-on', css: { width: 3 } }
  ]

  for (const state of ['match', 'mismatch', 'held', 'neutral'] as const) {
    const color = stateColor(state)
    stylesheet.push({
      selector: `node[state = "${state}"]`,
      css: color ? { 'border-color': color } : {}
    })
    stylesheet.push({
      selector: `edge[state = "${state}"]`,
      css: color ? { 'line-color': color, 'target-arrow-color': color } : {}
    })
    // The highlight ring restates the node's verdict colour; the verdict is
    // already carried by the glyph and the border, so this is a third cue,
    // not the only one.
    stylesheet.push({
      selector: `node.hl-on[state = "${state}"]`,
      css: color
        ? {
            'border-width': 3,
            'border-color': color,
            'overlay-color': color,
            'overlay-opacity': 0.18,
            'overlay-padding': 6
          }
        : { 'border-width': 3 }
    })
  }

  for (const [kind, shape] of Object.entries(KIND_SHAPE)) {
    stylesheet.push({
      selector: `node[kind = "${kind}"]`,
      css: { shape }
    })
  }

  return stylesheet
}

function toElements(graph: ControlGraph) {
  const degree = new Map<string, number>()
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  return [
    ...graph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: `${STATE_GLYPH[node.state]} ${node.identifier ?? node.label}`,
        fullLabel: node.detail ? `${node.label} · ${node.detail}` : node.label,
        kind: node.kind,
        state: node.state,
        degree: degree.get(node.id) ?? 0
      }
    })),
    ...graph.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.kind,
        state: edge.state
      }
    }))
  ]
}

type CytoscapeCanvasProps = {
  graph: ControlGraph
  highlight?: GraphHighlight | null
  pending?: boolean
  onUnavailable?: (reason: string) => void
  onInstance?: (api: GraphCanvasApi | null) => void
}

export default function CytoscapeCanvas({
  graph,
  highlight = null,
  pending = false,
  onUnavailable,
  onInstance
}: CytoscapeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const descriptionId = useId()
  const legendId = useId()
  const [legendOpen, setLegendOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 960px)').matches
  )

  // Callbacks live behind refs so a parent re-render (a new highlight or a
  // pending flip) never tears down the canvas instance.
  const onUnavailableRef = useRef(onUnavailable)
  const onInstanceRef = useRef(onInstance)
  useEffect(() => {
    onUnavailableRef.current = onUnavailable
    onInstanceRef.current = onInstance
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === 'undefined') return

    let cy: cytoscape.Core
    try {
      cy = cytoscape({
        container,
        elements: toElements(graph),
        style: buildStylesheet(),
        layout: layoutOptions(graph),
        boxSelectionEnabled: false
      })
    } catch {
      onUnavailableRef.current?.('The graph renderer could not start')
      return
    }
    cyRef.current = cy

    const zoomBy = (factor: number) => {
      cy.zoom({
        level: cy.zoom() * factor,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
      })
    }
    onInstanceRef.current?.({
      fit: () => cy.fit(undefined, FIT_PADDING),
      zoomIn: () => zoomBy(ZOOM_STEP),
      zoomOut: () => zoomBy(1 / ZOOM_STEP),
      // Reset re-runs the deterministic layout so dragged nodes come home,
      // then refits the viewport.
      reset: () => {
        cy.layout(layoutOptions(graph)).run()
        cy.fit(undefined, FIT_PADDING)
      }
    })

    cy.on('mouseover', 'edge', (event) => event.target.addClass('edge-labeled'))
    cy.on('mouseout', 'edge', (event) => event.target.removeClass('edge-labeled'))

    // The node's canvas label is only its identifier; the full subject or
    // party name surfaces on hover so it stays out of the graph otherwise.
    const tip = tipRef.current
    if (tip) {
      cy.on('mouseover', 'node', (event) => {
        const node = event.target
        const bounds = node.renderedBoundingBox({ includeLabels: false })
        tip.textContent = node.data('fullLabel')
        tip.style.left = `${node.renderedPosition().x}px`
        tip.style.top = `${bounds.y1}px`
        tip.hidden = false
      })
      const hideTip = () => {
        tip.hidden = true
      }
      cy.on('mouseout', 'node', hideTip)
      cy.on('pan zoom', hideTip)
    }

    // The graph pane can start hidden behind the narrow-viewport disclosure,
    // so the container may be 0x0 at mount. Refit once it gains real size;
    // Cytoscape's own observer handles the canvas bitmap.
    let hadSize = container.clientWidth > 0 && container.clientHeight > 0
    let resizeObserver: ResizeObserver | undefined
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        const hasSize = container.clientWidth > 0 && container.clientHeight > 0
        if (hasSize && !hadSize) {
          cy.resize()
          cy.fit(undefined, FIT_PADDING)
        }
        hadSize = hasSize
      })
      resizeObserver.observe(container)
    }

    let observer: MutationObserver | undefined
    if (typeof MutationObserver === 'function') {
      observer = new MutationObserver(() => {
        cy.style(buildStylesheet())
      })
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
    }

    return () => {
      resizeObserver?.disconnect()
      observer?.disconnect()
      onInstanceRef.current?.(null)
      cyRef.current = null
      cy.destroy()
    }
  }, [graph])

  // Highlight and pending are style states on the live instance, never a
  // reason to re-run the layout — nodes must not jump on every query.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const ids = highlight
      ? new Set([...highlight.nodeIds, ...highlight.edgeIds, ...(highlight.focusNodeId ? [highlight.focusNodeId] : [])])
      : null
    cy.batch(() => {
      cy.elements().forEach((element) => {
        element.removeClass('hl-dim hl-on')
        if (ids) element.addClass(ids.has(element.id()) ? 'hl-on' : 'hl-dim')
      })
    })
    if (highlight?.focusNodeId) {
      const node = cy.getElementById(highlight.focusNodeId)
      if (node.nonempty()) {
        const zoom = Math.max(cy.zoom(), FOCUS_ZOOM)
        // --duration-slow collapses to 0ms under prefers-reduced-motion, so
        // the same animate call lands instantly when motion is off.
        const duration = Number.parseInt(readToken('--duration-slow') ?? '0', 10) || 0
        cy.animate({ center: { eles: node }, zoom }, { duration })
      }
    }
  }, [graph, highlight])

  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length

  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const edgeIds = new Set(graph.edges.map((edge) => edge.id))
  const hitNodes = highlight ? highlight.nodeIds.filter((id) => nodeIds.has(id)).length : 0
  const hitEdges = highlight ? highlight.edgeIds.filter((id) => edgeIds.has(id)).length : 0
  const statusText = pending
    ? 'Searching the graph…'
    : highlight
      ? `${hitNodes} ${hitNodes === 1 ? 'node' : 'nodes'} and ${hitEdges} ${hitEdges === 1 ? 'relationship' : 'relationships'} highlighted`
      : ''

  return (
    <div className="graph-canvas-wrap" data-pending={pending || undefined}>
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`Control graph with ${nodeCount} nodes and ${edgeCount} relationships`}
        aria-describedby={descriptionId}
      />
      <div ref={tipRef} className="graph-node-tip" role="tooltip" hidden />
      {pending ? <div className="graph-canvas-scan" aria-hidden="true" /> : null}
      <p className="graph-canvas-status" role="status">
        {statusText}
      </p>
      <div className="graph-legend">
        <Button
          variant="ghost"
          className="graph-legend-toggle"
          aria-expanded={legendOpen}
          aria-controls={legendId}
          onClick={() => setLegendOpen((open) => !open)}
        >
          Legend
          <ChevronDownGlyph size={14} />
        </Button>
        <div className="graph-legend-panel" id={legendId} hidden={!legendOpen}>
          <div className="graph-legend-group">
            <p className="graph-legend-caption">Node kind</p>
            <ul className="graph-legend-list">
              {(Object.keys(KIND_SHAPE) as GraphNodeKind[]).map((kind) => (
                <li className="graph-legend-item" key={kind}>
                  <span className="graph-legend-shape" data-kind={kind} aria-hidden="true" />
                  {KIND_NAME[kind]}
                </li>
              ))}
            </ul>
          </div>
          <div className="graph-legend-group">
            <p className="graph-legend-caption">Verdict</p>
            <ul className="graph-legend-list">
              {(Object.keys(STATE_NAME) as StatusKind[]).map((state) => (
                <li className="graph-legend-item" key={state}>
                  <span className="graph-legend-state" data-state={state} aria-hidden="true" />
                  {STATE_NAME[state]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p id={descriptionId} className="graph-canvas-description">
        Interactive canvas of the control graph: {nodeCount} nodes and {edgeCount} relationships. Node labels show
        identifiers only; hover a node for its full name or an edge for its relationship, or switch to the table view
        for a keyboard-readable list of every node and relationship.
      </p>
    </div>
  )
}
