import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

import { FloatingAssistant } from '../features/graph-chat/FloatingAssistant'
import { GraphAssistantProvider } from '../features/graph-chat/GraphAssistantProvider'
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
  citations: [{ ref: 1, node_id: 'email:sub_001', edge_id: null, label: 'sub_001', kind: 'email', state: 'match' }],
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

// The page as the workspace mounts it: under the shared assistant state, with
// the floating assistant beside the routes.
function renderGraph(api: GraphChatApiClient = makeApi(), entry = '/graph') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <GraphAssistantProvider api={api}>
        <Routes>
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/inbox" element={<p>Inbox page</p>} />
        </Routes>
        <FloatingAssistant />
      </GraphAssistantProvider>
    </MemoryRouter>
  )
}

async function ask(question: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Assistant' }))
  await userEvent.click(screen.getByRole('button', { name: question }))
}

describe('GraphPage', () => {
  it('renders the control graph view with its heading', async () => {
    renderGraph()
    expect(screen.getByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    expect(await screen.findByTestId('cytoscape-canvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument()
  })

  it('gives the canvas the page, with the assistant floating outside it', async () => {
    renderGraph()
    const pane = screen.getByRole('region', { name: 'Graph canvas' })
    await within(pane).findByTestId('cytoscape-canvas')
    expect(within(pane).queryByRole('heading', { name: 'Assistant' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Assistant' })).not.toContainElement(pane)
    expect(screen.queryByRole('button', { name: /(show|hide) graph/i })).not.toBeInTheDocument()
  })

  it('draws the live overview corpus once it arrives', async () => {
    renderGraph()
    await screen.findByTestId('cytoscape-canvas')
    await waitFor(() => expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001'))
    expect(screen.getByText('Prepared data')).toBeInTheDocument()
  })

  it('falls back to the prepared fixture when the corpus fetch fails', async () => {
    const api = makeApi({ getGraphCorpus: vi.fn(async () => Promise.reject(new Error('offline')) as never) })
    renderGraph(api)
    await screen.findByTestId('cytoscape-canvas')
    await screen.findByText('Prepared fixture')
    // The fixture ships with the app, so the canvas is never empty.
    expect(canvasProps.latest?.graph.nodes.length).toBeGreaterThan(0)
  })

  it('fetches the corpus once for the canvas and the assistant together', async () => {
    const api = makeApi()
    renderGraph(api)
    await screen.findByText('Prepared data')
    await userEvent.click(screen.getByRole('button', { name: 'Assistant' }))
    expect(api.getGraphCorpus).toHaveBeenCalledTimes(1)
  })

  it('draws the answer subgraph and returns to the overview via Show overview', async () => {
    renderGraph()
    await screen.findByTestId('cytoscape-canvas')
    await waitFor(() => expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001'))

    await ask(STARTER_QUESTIONS[0])
    await waitFor(() => expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toEqual(['email:sub_001']))

    const back = screen.getByRole('button', { name: /show overview/i })
    await userEvent.click(back)
    await waitFor(() => expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toContain('email:live_001'))
  })

  it('opens the graph on an answer asked elsewhere when a citation is pressed', async () => {
    renderGraph(makeApi(), '/inbox')
    await ask(STARTER_QUESTIONS[0])
    await userEvent.click(await screen.findByRole('button', { name: /sub_001 \(match\)/ }))

    expect(await screen.findByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    await waitFor(() => expect(canvasProps.latest?.graph.nodes.map((node) => node.id)).toEqual(['email:sub_001']))
  })
})
