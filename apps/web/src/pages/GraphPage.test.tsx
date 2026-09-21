import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ControlGraph } from '../features/control-graph/types'
import type { GraphChatApiClient } from '../features/graph-chat/graph-chat-api'
import type { GraphChatAnswer, GraphCorpus } from '../features/graph-chat/types'
import { STARTER_QUESTIONS } from '../features/graph-chat/types'

const canvasProps = vi.hoisted(() => ({
  latest: null as null | { graph: ControlGraph }
}))

vi.mock('../features/control-graph/CytoscapeCanvas', async () => {
  const React = await import('react')
  return {
    default: (props: { graph: ControlGraph }) => {
      canvasProps.latest = props
      return React.createElement('div', { 'data-testid': 'cytoscape-canvas' })
    }
  }
})

import { GraphPage } from './GraphPage'

const LIVE_CORPUS: GraphCorpus = {
  source: 'prepared',
  version: 'seed-v1',
  scope: 'overview',
  node_count: 1,
  edge_count: 0,
  nodes: [
    {
      id: 'email:live_001',
      kind: 'email',
      identifier: 'live_001',
      label: 'Live corpus email',
      state: 'match'
    }
  ],
  edges: []
}

const ANSWER: GraphChatAnswer = {
  answer: 'sub_001 is the node named [1].',
  grounded: true,
  citations: [
    { ref: 1, node_id: 'email:sub_001', edge_id: null, label: 'sub_001', kind: 'email', state: 'match' }
  ],
  highlight: { node_ids: ['email:sub_001'], edge_ids: [], focus_node_id: 'email:sub_001' },
  subgraph: {
    nodes: [
      {
        id: 'email:sub_001',
        kind: 'email',
        identifier: 'sub_001',
        label: 'Answer subgraph email',
        state: 'match'
      }
    ],
    edges: []
  },
  followups: ['Next one?', 'Another?', 'Third?', 'Fourth?'],
  provider: { model: 'test-model', decision_source: 'live', attempts: 1 }
}

function makeApi(overrides: Partial<GraphChatApiClient> = {}): GraphChatApiClient {
  return {
    getGraphCorpus: vi.fn(async () => LIVE_CORPUS),
    postGraphChat: vi.fn(async () => ANSWER),
    ...overrides
  }
}

describe('GraphPage', () => {
  it('renders the control graph view with its heading', async () => {
    render(<GraphPage api={makeApi()} />)
    expect(screen.getByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument()
  })

  it('renders the assistant dock beside the graph', async () => {
    render(<GraphPage api={makeApi()} />)
    await screen.findByTestId('cytoscape-canvas')
    expect(screen.getByRole('complementary', { name: /assistant/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /assistant/i })).toBeInTheDocument()
  })

  it('keeps the graph behind a disclosure the user can toggle', async () => {
    render(<GraphPage api={makeApi()} />)
    const disclosure = screen.getByRole('button', { name: /graph$/i })
    expect(disclosure).toHaveAttribute('aria-expanded')
  })

  it('draws the live overview corpus once it arrives', async () => {
    render(<GraphPage api={makeApi()} />)
    await screen.findByTestId('cytoscape-canvas')
    await waitFor(() =>
      expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001')
    )
    expect(screen.getByText('Prepared data')).toBeInTheDocument()
  })

  it('falls back to the prepared fixture when the corpus fetch fails', async () => {
    const api = makeApi({ getGraphCorpus: vi.fn(async () => Promise.reject(new Error('offline')) as never) })
    render(<GraphPage api={api} />)
    await screen.findByTestId('cytoscape-canvas')
    await screen.findByText('Prepared fixture')
    // The fixture ships with the app, so the canvas is never empty.
    expect(canvasProps.latest?.graph.nodes.length).toBeGreaterThan(0)
  })

  it('draws the answer subgraph and returns to the overview via Show overview', async () => {
    render(<GraphPage api={makeApi()} />)
    await screen.findByTestId('cytoscape-canvas')
    await waitFor(() =>
      expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001')
    )

    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await waitFor(() =>
      expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toEqual(['email:sub_001'])
    )

    const back = screen.getByRole('button', { name: /show overview/i })
    await userEvent.click(back)
    await waitFor(() =>
      expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001')
    )
  })
})
