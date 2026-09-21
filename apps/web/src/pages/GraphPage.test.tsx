import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../features/control-graph/CytoscapeCanvas', async () => {
  const React = await import('react')
  return {
    default: () => React.createElement('div', { 'data-testid': 'cytoscape-canvas' })
  }
})

import { GraphPage } from './GraphPage'

describe('GraphPage', () => {
  it('renders the control graph view with its heading', async () => {
    render(<GraphPage />)
    expect(screen.getByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument()
  })

  it('renders the assistant dock beside the graph', async () => {
    render(<GraphPage />)
    await screen.findByTestId('cytoscape-canvas')
    expect(screen.getByRole('complementary', { name: /assistant/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /assistant/i })).toBeInTheDocument()
  })

  it('keeps the graph behind a disclosure the user can toggle', async () => {
    render(<GraphPage />)
    const disclosure = screen.getByRole('button', { name: /graph$/i })
    expect(disclosure).toHaveAttribute('aria-expanded')
  })
})
