import { useEffect, useId, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { StatusKind } from '../../components/ui/types'
import type { ControlGraph, GraphNodeKind } from './types'

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

const KIND_SHAPE: Record<GraphNodeKind, cytoscape.Css.NodeShape> = {
  email: 'ellipse',
  shipment: 'round-rectangle',
  party: 'hexagon',
  port: 'diamond',
  document: 'rectangle',
  mismatch: 'triangle',
  exception: 'octagon'
}

function readToken(name: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? undefined : value
}

function buildStylesheet(): cytoscape.StylesheetJson {
  const text = readToken('--text-primary')
  const surface = readToken('--surface-raised')
  const border = readToken('--border-default')
  const font = readToken('--font-data')
  const stateColor = (state: StatusKind) => readToken(STATE_TOKEN[state])

  const nodeStyle: Record<string, string | number> = {
    label: 'data(label)',
    'text-valign': 'bottom',
    'text-margin-y': 4,
    'font-size': 10,
    'text-wrap': 'wrap',
    'text-max-width': '110px',
    'border-width': 2
  }
  if (font) nodeStyle['font-family'] = font
  if (text) nodeStyle['color'] = text
  if (surface) nodeStyle['background-color'] = surface
  if (border) nodeStyle['border-color'] = border

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
        label: 'data(label)',
        'font-size': 8,
        'text-rotation': 'autorotate',
        ...(text ? { color: text } : {}),
        ...(font ? { 'font-family': font } : {})
      }
    }
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
  return [
    ...graph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: `${STATE_GLYPH[node.state]} ${node.identifier ?? node.label}`,
        kind: node.kind,
        state: node.state
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
  onUnavailable?: (reason: string) => void
}

export default function CytoscapeCanvas({ graph, onUnavailable }: CytoscapeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const descriptionId = useId()

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === 'undefined') return

    let cy: cytoscape.Core
    try {
      cy = cytoscape({
        container,
        elements: toElements(graph),
        style: buildStylesheet(),
        layout: {
          name: 'cose',
          randomize: false,
          animate: false
        },
        boxSelectionEnabled: false
      })
    } catch {
      onUnavailable?.('The graph renderer could not start')
      return
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
      observer?.disconnect()
      cy.destroy()
    }
  }, [graph, onUnavailable])

  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length

  return (
    <div className="graph-canvas-wrap">
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`Control graph with ${nodeCount} nodes and ${edgeCount} relationships`}
        aria-describedby={descriptionId}
      />
      <p id={descriptionId} className="graph-canvas-description">
        Interactive canvas of the control graph: {nodeCount} nodes and {edgeCount} relationships. Switch to the table
        view for a keyboard-readable list of every node and relationship.
      </p>
    </div>
  )
}
