import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparedControlGraph } from './fixtures'

const mocks = vi.hoisted(() => ({
  mode: 'render' as 'render' | 'throw' | 'unavailable',
  lastProps: null as Record<string, unknown> | null
}))

vi.mock('./CytoscapeCanvas', async () => {
  const React = await import('react')
  function CanvasStub(props: { onUnavailable?: (reason: string) => void }) {
    React.useEffect(() => {
      mocks.lastProps = props as Record<string, unknown>
      if (mocks.mode === 'unavailable') {
        props.onUnavailable?.('renderer unavailable')
      }
    }, [props])
    if (mocks.mode === 'throw') {
      throw new Error('canvas crashed')
    }
    return React.createElement('div', { 'data-testid': 'cytoscape-canvas' })
  }
  return { default: CanvasStub }
})

import { ControlGraphView } from './ControlGraphView'
import type { GraphCanvasApi } from './CytoscapeCanvas'

beforeEach(() => {
  mocks.mode = 'render'
  mocks.lastProps = null
})

describe('ControlGraphView', () => {
  it('loads the lazy graph canvas by default', async () => {
    render(<ControlGraphView graph={preparedControlGraph} />)
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /graph nodes/i })).not.toBeInTheDocument()
  })

  it('toggles between canvas and table view', async () => {
    const user = userEvent.setup()
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByTestId('cytoscape-canvas')

    await user.click(screen.getByRole('button', { name: /table view/i }))
    expect(screen.getByRole('table', { name: /graph nodes/i })).toBeInTheDocument()
    expect(screen.queryByTestId('cytoscape-canvas')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /graph canvas/i }))
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
  })

  it('marks the active toggle with aria-pressed', async () => {
    const user = userEvent.setup()
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByTestId('cytoscape-canvas')
    const canvasToggle = screen.getByRole('button', { name: /graph canvas/i })
    const tableToggle = screen.getByRole('button', { name: /table view/i })
    expect(canvasToggle).toHaveAttribute('aria-pressed', 'true')
    expect(tableToggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(tableToggle)
    expect(canvasToggle).toHaveAttribute('aria-pressed', 'false')
    expect(tableToggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the canvas tools in table view but keeps the toggle', async () => {
    const user = userEvent.setup()
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByTestId('cytoscape-canvas')
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /table view/i }))
    expect(screen.queryByRole('button', { name: /zoom in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /graph canvas/i })).toBeInTheDocument()
  })

  it('wires the canvas tools to the api the canvas reports', async () => {
    const user = userEvent.setup()
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByTestId('cytoscape-canvas')

    const api = { fit: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), reset: vi.fn() }
    const onInstance = mocks.lastProps?.onInstance as (api: GraphCanvasApi | null) => void
    act(() => onInstance(api))

    await user.click(screen.getByRole('button', { name: /fit/i }))
    expect(api.fit).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(api.zoomIn).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /zoom out/i }))
    expect(api.zoomOut).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /reset/i }))
    expect(api.reset).toHaveBeenCalled()
  })

  it('passes highlight and pending through to the canvas', async () => {
    const highlight = { nodeIds: ['email:email_001'], edgeIds: [] }
    render(<ControlGraphView graph={preparedControlGraph} highlight={highlight} pending />)
    await screen.findByTestId('cytoscape-canvas')
    expect(mocks.lastProps?.highlight).toEqual(highlight)
    expect(mocks.lastProps?.pending).toBe(true)
  })

  it('falls back to the table when the canvas throws', async () => {
    mocks.mode = 'throw'
    render(<ControlGraphView graph={preparedControlGraph} />)
    expect(await screen.findByRole('table', { name: /graph nodes/i })).toBeInTheDocument()
    expect(screen.queryByTestId('cytoscape-canvas')).not.toBeInTheDocument()
  })

  it('falls back to the table when the renderer reports unavailable', async () => {
    mocks.mode = 'unavailable'
    render(<ControlGraphView graph={preparedControlGraph} />)
    expect(await screen.findByRole('table', { name: /graph nodes/i })).toBeInTheDocument()
  })

  it('lets the user retry the canvas after a failure', async () => {
    const user = userEvent.setup()
    mocks.mode = 'throw'
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByRole('table', { name: /graph nodes/i })

    mocks.mode = 'render'
    await user.click(screen.getByRole('button', { name: /graph canvas/i }))
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
  })

  it('renders an empty state instead of a blank canvas', async () => {
    render(<ControlGraphView graph={{ nodes: [], edges: [] }} />)
    expect(await screen.findByText(/no graph/i)).toBeInTheDocument()
    expect(screen.queryByTestId('cytoscape-canvas')).not.toBeInTheDocument()
  })

  it('keeps the toggle reachable in the fallback state', async () => {
    mocks.mode = 'throw'
    render(<ControlGraphView graph={preparedControlGraph} />)
    await screen.findByRole('table', { name: /graph nodes/i })
    expect(screen.getByRole('button', { name: /graph canvas/i })).toBeInTheDocument()
  })
})
