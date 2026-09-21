import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparedControlGraph } from './fixtures'

type MockElement = {
  id: () => string
  isNode: () => boolean
  isEdge: () => boolean
  selected: () => boolean
  nonempty: () => boolean
  data: (key: string) => unknown
  renderedPosition: () => { x: number; y: number }
  renderedBoundingBox: () => { x1: number; y1: number; x2: number; y2: number }
  addClass: ReturnType<typeof vi.fn>
  removeClass: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>
    elementList: MockElement[]
    elements: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    style: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
    batch: ReturnType<typeof vi.fn>
    getElementById: ReturnType<typeof vi.fn>
    animate: ReturnType<typeof vi.fn>
    fit: ReturnType<typeof vi.fn>
    zoom: ReturnType<typeof vi.fn>
    center: ReturnType<typeof vi.fn>
    layout: ReturnType<typeof vi.fn>
    width: ReturnType<typeof vi.fn>
    height: ReturnType<typeof vi.fn>
  }>,
  throwOnInit: false
}))

vi.mock('cytoscape', () => ({
  default: (options: Record<string, unknown>) => {
    if (mocks.throwOnInit) throw new Error('canvas renderer unavailable')
    const defs = options.elements as Array<{ data: Record<string, unknown> }>
    const elements: MockElement[] = defs.map((def) => ({
      id: () => def.data.id as string,
      isNode: () => def.data.source === undefined,
      isEdge: () => def.data.source !== undefined,
      selected: () => false,
      nonempty: () => true,
      data: (key: string) => def.data[key],
      renderedPosition: () => ({ x: 10, y: 10 }),
      renderedBoundingBox: () => ({ x1: 0, y1: 0, x2: 20, y2: 20 }),
      addClass: vi.fn(),
      removeClass: vi.fn()
    }))
    const byId = new Map(elements.map((el) => [el.id(), el]))
    const instance = {
      options,
      elementList: elements,
      destroy: vi.fn(),
      style: vi.fn(),
      on: vi.fn(),
      batch: vi.fn((fn: () => void) => fn()),
      elements: vi.fn(() => elements),
      getElementById: vi.fn(
        (id: string): MockElement | { nonempty: () => boolean } => byId.get(id) ?? { nonempty: () => false }
      ),
      animate: vi.fn(),
      fit: vi.fn(),
      zoom: vi.fn(() => 1),
      center: vi.fn(),
      layout: vi.fn(() => ({ run: vi.fn() })),
      width: vi.fn(() => 800),
      height: vi.fn(() => 600)
    }
    mocks.instances.push(instance)
    return instance
  }
}))

import CytoscapeCanvas from './CytoscapeCanvas'
import type { GraphCanvasApi } from './CytoscapeCanvas'

const TOKEN_MAP: Record<string, string> = {
  '--surface-canvas': 'rgb(9, 9, 9)',
  '--surface-raised': 'rgb(10, 10, 10)',
  '--border-default': 'rgb(11, 11, 11)',
  '--text-primary': 'rgb(12, 12, 12)',
  '--text-tertiary': 'rgb(13, 13, 13)',
  '--state-match-solid': 'rgb(20, 20, 20)',
  '--state-mismatch-solid': 'rgb(21, 21, 21)',
  '--state-held-solid': 'rgb(22, 22, 22)',
  '--state-neutral-text': 'rgb(23, 23, 23)',
  '--font-data': 'Test Mono',
  '--duration-slow': '320ms'
}

function stubTokens() {
  return vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        getPropertyValue: (name: string) => TOKEN_MAP[name] ?? ''
      }) as CSSStyleDeclaration
  )
}

function lastCy() {
  return mocks.instances[mocks.instances.length - 1]
}

function cyElements() {
  return (lastCy().options.elements as Array<{ data: Record<string, unknown> }>).map((def) => def.data)
}

function styleEntry(selector: string) {
  const style = lastCy().options.style as Array<{
    selector: string
    css: Record<string, unknown>
  }>
  return style.find((entry) => entry.selector === selector)
}

function mockElement(id: string) {
  return lastCy().elementList.find((el) => el.id() === id)
}

beforeEach(() => {
  vi.restoreAllMocks()
  mocks.instances.length = 0
  mocks.throwOnInit = false
})

describe('CytoscapeCanvas', () => {
  it('exposes an accessible label and description', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const canvas = screen.getByRole('img', { name: /control graph/i })
    expect(canvas).toBeInTheDocument()
    expect(canvas.getAttribute('aria-describedby')).toBeTruthy()
    const description = document.getElementById(canvas.getAttribute('aria-describedby')!)
    expect(description?.textContent).toMatch(/nodes/i)
    expect(description?.textContent).toMatch(/relationships|edges/i)
  })

  it('passes every node and edge to the renderer', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    expect(mocks.instances).toHaveLength(1)
    expect(cyElements()).toHaveLength(preparedControlGraph.nodes.length + preparedControlGraph.edges.length)
  })

  it('configures a deterministic, non-animated layout', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const layout = lastCy().options.layout as Record<string, unknown>
    expect(layout.randomize).toBe(false)
    expect(layout.animate).toBe(false)
  })

  it('labels nodes by identifier with the verdict glyph, never the full subject', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const email = cyElements().find((data) => data.id === 'email:email_001')
    expect(String(email?.label)).toContain('email_001')
    expect(String(email?.label)).not.toContain('TO CONFIRM')
    expect(String(email?.label).trim()).not.toBe('email_001')
  })

  it('keeps the full node label available for the hover tooltip', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const email = cyElements().find((data) => data.id === 'email:email_001')
    expect(String(email?.fullLabel)).toContain('TO CONFIRM')
  })

  it('scales node size from its degree', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const email = cyElements().find((data) => data.id === 'email:email_001')
    expect(typeof email?.degree).toBe('number')
    expect(email?.degree as number).toBeGreaterThan(0)
    const nodeStyle = styleEntry('node')
    expect(String(nodeStyle?.css.width)).toContain('degree')
  })

  it('keeps edge labels off by default and reveals them on a labelled class', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const edgeStyle = styleEntry('edge')
    expect(edgeStyle?.css.label).toBeUndefined()
    const reveal = styleEntry('edge.edge-labeled, edge.hl-on, edge:selected')
    expect(reveal?.css.label).toBe('data(label)')
  })

  it('marks hovered edges with the labelled class', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const cy = lastCy()
    const onMouseoverEdge = cy.on.mock.calls.find((call) => call[0] === 'mouseover' && call[1] === 'edge')
    expect(onMouseoverEdge).toBeTruthy()
    const edge = mockElement('edge:recon:SYN-001')
    onMouseoverEdge![2]({ target: edge })
    expect(edge?.addClass).toHaveBeenCalledWith('edge-labeled')
  })

  it('exposes the canvas control api through onInstance', () => {
    let api: GraphCanvasApi | null = null
    render(<CytoscapeCanvas graph={preparedControlGraph} onInstance={(next) => (api = next)} />)
    const cy = lastCy()
    expect(api).not.toBeNull()
    api!.fit()
    expect(cy.fit).toHaveBeenCalled()
    api!.zoomIn()
    expect(cy.zoom).toHaveBeenCalled()
    api!.reset()
    expect(cy.layout).toHaveBeenCalled()
  })

  it('dims every element outside the highlight without rebuilding the graph', () => {
    const highlight = {
      nodeIds: ['email:email_001'],
      edgeIds: ['edge:recon:SYN-001']
    }
    const { rerender } = render(<CytoscapeCanvas graph={preparedControlGraph} highlight={highlight} />)
    expect(mockElement('email:email_001')?.addClass).toHaveBeenCalledWith('hl-on')
    expect(mockElement('edge:recon:SYN-001')?.addClass).toHaveBeenCalledWith('hl-on')
    expect(mockElement('port:MYPKG')?.addClass).toHaveBeenCalledWith('hl-dim')

    rerender(<CytoscapeCanvas graph={preparedControlGraph} highlight={{ nodeIds: ['port:MYPKG'], edgeIds: [] }} />)
    expect(mocks.instances).toHaveLength(1)
    expect(mockElement('email:email_001')?.removeClass).toHaveBeenCalledWith('hl-dim hl-on')
  })

  it('announces the highlight to assistive tech', () => {
    render(
      <CytoscapeCanvas
        graph={preparedControlGraph}
        highlight={{ nodeIds: ['email:email_001'], edgeIds: ['edge:recon:SYN-001'] }}
      />
    )
    expect(screen.getByRole('status').textContent).toMatch(/1 node/i)
    expect(screen.getByRole('status').textContent).toMatch(/1 relationship/i)
  })

  it('dims the canvas while a query is pending', () => {
    const { container } = render(<CytoscapeCanvas graph={preparedControlGraph} pending />)
    expect(container.querySelector('.graph-canvas-wrap')).toHaveAttribute('data-pending', 'true')
  })

  it('animates to the focus node at a readable zoom', () => {
    render(
      <CytoscapeCanvas
        graph={preparedControlGraph}
        highlight={{ nodeIds: [], edgeIds: [], focusNodeId: 'email:email_001' }}
      />
    )
    const cy = lastCy()
    expect(cy.animate).toHaveBeenCalledWith(expect.objectContaining({ center: expect.anything() }), expect.anything())
  })

  it('derives node styling from design tokens, never hardcoded hex', () => {
    stubTokens()
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const style = JSON.stringify(lastCy().options.style)
    expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(style).toContain('rgb(21, 21, 21)')
    expect(style).toContain('rgb(22, 22, 22)')
  })

  it('re-reads tokens when the theme changes', async () => {
    stubTokens()
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const cy = lastCy()
    expect(cy.style).not.toHaveBeenCalled()
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() => expect(cy.style).toHaveBeenCalled())
  })

  it('destroys the renderer on unmount', () => {
    const { unmount } = render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const cy = lastCy()
    unmount()
    expect(cy.destroy).toHaveBeenCalledTimes(1)
  })

  it('reports when the renderer cannot initialise', () => {
    mocks.throwOnInit = true
    const onUnavailable = vi.fn()
    render(<CytoscapeCanvas graph={preparedControlGraph} onUnavailable={onUnavailable} />)
    expect(onUnavailable).toHaveBeenCalledWith(expect.any(String))
  })
})
