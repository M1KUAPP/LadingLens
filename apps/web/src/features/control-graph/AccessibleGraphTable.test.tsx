import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccessibleGraphTable } from './AccessibleGraphTable'
import { preparedControlGraph } from './fixtures'

describe('AccessibleGraphTable', () => {
  it('lists every fixture node in a semantic table', () => {
    render(<AccessibleGraphTable graph={preparedControlGraph} />)
    const nodesTable = screen.getByRole('table', { name: /graph nodes/i })
    for (const node of preparedControlGraph.nodes) {
      const key = node.identifier ?? node.label
      expect(within(nodesTable).getAllByText(key).length, `node ${node.id}`).toBeGreaterThan(0)
    }
    const bodyRows = within(nodesTable).getAllByRole('row').length - 1
    expect(bodyRows).toBe(preparedControlGraph.nodes.length)
  })

  it('lists every fixture edge with readable endpoints', () => {
    render(<AccessibleGraphTable graph={preparedControlGraph} />)
    const edgesTable = screen.getByRole('table', {
      name: /graph relationships/i
    })
    const bodyRows = within(edgesTable).getAllByRole('row').length - 1
    expect(bodyRows).toBe(preparedControlGraph.edges.length)
  })

  it('shows the SYN-042 missing-case relationship', () => {
    render(<AccessibleGraphTable graph={preparedControlGraph} />)
    const edgesTable = screen.getByRole('table', {
      name: /graph relationships/i
    })
    const row = within(edgesTable)
      .getAllByRole('row')
      .find((tr) => within(tr).queryByText('SYN-042') !== null)
    expect(row).toBeDefined()
    expect(within(row!).getByText(/missing case/i)).toBeInTheDocument()
  })

  it('renders identifiers in data typography', () => {
    render(<AccessibleGraphTable graph={preparedControlGraph} />)
    const identifierCell = screen.getAllByText('email_001')[0]
    expect(identifierCell.className).toMatch(/type-data-/)
    const shipmentCell = screen.getAllByText('SYN-042')[0]
    expect(shipmentCell.className).toMatch(/type-data-/)
  })

  it('wraps dense tables in the custom scrollbar region', () => {
    render(<AccessibleGraphTable graph={preparedControlGraph} />)
    expect(screen.getByRole('region', { name: /graph nodes/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /graph relationships/i })).toBeInTheDocument()
  })

  it('renders an explicit empty state instead of a blank table', () => {
    render(<AccessibleGraphTable graph={{ nodes: [], edges: [] }} />)
    expect(screen.getByText(/no graph/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
