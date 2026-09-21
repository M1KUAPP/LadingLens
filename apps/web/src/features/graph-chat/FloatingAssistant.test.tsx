import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FloatingAssistant } from './FloatingAssistant'
import { GraphAssistantProvider } from './GraphAssistantProvider'
import type { GraphChatApiClient } from './graph-chat-api'
import type { GraphChatAnswer, GraphCorpus } from './types'
import { STARTER_QUESTIONS } from './types'

const CORPUS: GraphCorpus = {
  source: 'prepared',
  version: 'seed-v1',
  scope: 'overview',
  node_count: 0,
  edge_count: 0,
  nodes: [],
  edges: []
}

const ANSWER: GraphChatAnswer = {
  answer: 'Two emails carry a consignee mismatch.',
  grounded: true,
  citations: [],
  highlight: { node_ids: [], edge_ids: [], focus_node_id: null },
  subgraph: { nodes: [], edges: [] },
  followups: ['Next one?'],
  provider: { model: 'test-model', decision_source: 'live', attempts: 1 }
}

function makeApi(): GraphChatApiClient {
  return {
    getGraphCorpus: vi.fn(async () => CORPUS),
    postGraphChat: vi.fn(async () => ANSWER)
  }
}

function renderAssistant(api = makeApi()) {
  render(
    <MemoryRouter initialEntries={['/inbox']}>
      <GraphAssistantProvider api={api}>
        <Routes>
          <Route path="/inbox" element={<Link to="/review">Go to review</Link>} />
          <Route path="/review" element={<p>Review page</p>} />
        </Routes>
        <FloatingAssistant />
      </GraphAssistantProvider>
    </MemoryRouter>
  )
  const aside = screen.getByRole('complementary', { name: 'Assistant' })
  return {
    api,
    launcher: within(aside).getByRole('button', { name: 'Assistant' }),
    panel: aside.querySelector('.floating-assistant-panel') as HTMLElement
  }
}

describe('FloatingAssistant', () => {
  it('starts folded into the pill, with the panel inert and hidden', () => {
    const { launcher, panel } = renderAssistant()
    expect(launcher).toHaveAttribute('aria-expanded', 'false')
    expect(launcher).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('inert')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('unfolds into the panel with focus in the composer, and folds back to the pill', async () => {
    const user = userEvent.setup()
    const { launcher, panel } = renderAssistant()

    await user.click(launcher)
    expect(launcher).toHaveAttribute('aria-expanded', 'true')
    expect(launcher).toHaveAttribute('inert')
    expect(panel).not.toHaveAttribute('inert')
    expect(screen.getByLabelText(/ask about the control graph/i)).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Fold assistant' }))
    expect(launcher).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
    expect(launcher).toHaveFocus()
  })

  it('folds on Escape from inside the panel', async () => {
    const user = userEvent.setup()
    const { launcher, panel } = renderAssistant()
    await user.click(launcher)
    await user.keyboard('{Escape}')
    expect(panel).toHaveAttribute('inert')
    expect(launcher).toHaveFocus()
  })

  it('leaves the corpus alone until the assistant first unfolds', async () => {
    const user = userEvent.setup()
    const { api, launcher } = renderAssistant()
    expect(api.getGraphCorpus).not.toHaveBeenCalled()
    await user.click(launcher)
    expect(api.getGraphCorpus).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('prepared · seed-v1')).toBeInTheDocument()
  })

  it('keeps the conversation through a fold and a page change', async () => {
    const user = userEvent.setup()
    const { launcher } = renderAssistant()
    await user.click(launcher)
    await user.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    expect(await screen.findByText('Two emails carry a consignee mismatch.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fold assistant' }))
    await user.click(screen.getByRole('link', { name: 'Go to review' }))
    expect(screen.getByText('Review page')).toBeInTheDocument()

    await user.click(launcher)
    expect(screen.getByText('Two emails carry a consignee mismatch.')).toBeInTheDocument()
  })
})
