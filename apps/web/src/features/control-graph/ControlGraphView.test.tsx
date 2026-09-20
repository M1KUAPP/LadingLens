import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparedControlGraph } from './fixtures'

const mocks = vi.hoisted(() => ({
  mode: 'render' as 'render' | 'throw' | 'unavailable'
}))

vi.mock('./CytoscapeCanvas', async () => {
  const React = await import('react')
  function CanvasStub(props: { onUnavailable?: (reason: string) => void }) {
    React.useEffect(() => {
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

beforeEach(() => {
  mocks.mode = 'render'
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
