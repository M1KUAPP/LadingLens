import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { GraphChatApiClient } from '../features/graph-chat/graph-chat-api'
import type { GraphChatAnswer, GraphCorpus } from '../features/graph-chat/types'
import { STARTER_QUESTIONS } from '../features/graph-chat/types'
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

function traceRows() {
  return within(screen.getByRole('table', { name: 'Control trace' }))
    .getAllByRole('row')
    .slice(1)
}

describe('GraphPage', () => {
  it('reads the graph as one control trace, with no canvas or table toggle', async () => {
    renderGraph()
    expect(screen.getByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Control trace' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /graph canvas|table view/i })).not.toBeInTheDocument()
  })

  it('keeps the assistant floating outside the trace', async () => {
    renderGraph()
    const trace = screen.getByRole('region', { name: 'Control trace' })
    expect(within(trace).queryByRole('heading', { name: 'Assistant' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Assistant' })).not.toContainElement(trace)
  })

  it('reads the live overview corpus once it arrives', async () => {
    renderGraph()
    expect(await screen.findByRole('link', { name: 'live_001' })).toBeInTheDocument()
    expect(screen.getByText('Prepared data')).toBeInTheDocument()
  })

  it('falls back to the prepared fixture when the corpus fetch fails', async () => {
    const api = makeApi({ getGraphCorpus: vi.fn(async () => Promise.reject(new Error('offline')) as never) })
    renderGraph(api)
    await screen.findByText('Prepared fixture')
    // The fixture ships with the app, so the trace is never empty.
    expect(screen.getByRole('link', { name: 'email_001' })).toBeInTheDocument()
  })

  it('fetches the corpus once for the trace and the assistant together', async () => {
    const api = makeApi()
    renderGraph(api)
    await screen.findByText('Prepared data')
    await userEvent.click(screen.getByRole('button', { name: 'Assistant' }))
    expect(api.getGraphCorpus).toHaveBeenCalledTimes(1)
  })

  it('narrows to the answer and returns to the overview via Show overview', async () => {
    renderGraph()
    await screen.findByRole('link', { name: 'live_001' })

    await ask(STARTER_QUESTIONS[0])
    expect(await screen.findByRole('link', { name: 'sub_001' })).toBeInTheDocument()
    expect(traceRows()).toHaveLength(1)
    expect(screen.getByText("Showing the cases in the assistant's answer.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show overview/i }))
    expect(await screen.findByRole('link', { name: 'live_001' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'sub_001' })).not.toBeInTheDocument()
  })

  it('opens the graph on an answer asked elsewhere when a citation is pressed', async () => {
    renderGraph(makeApi(), '/inbox')
    await ask(STARTER_QUESTIONS[0])
    await userEvent.click(await screen.findByRole('button', { name: /sub_001 \(match\)/ }))

    expect(await screen.findByRole('heading', { name: /control graph/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'sub_001' })).toBeInTheDocument()
  })
})
