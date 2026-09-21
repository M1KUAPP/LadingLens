import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { GraphChatPanel } from './GraphChatPanel'
import { STARTER_QUESTIONS } from './types'
import type { GraphChatApiClient } from './graph-chat-api'
import type { GraphChatAnswer, GraphCorpus } from './types'

const NODE = {
  id: 'email:email_001',
  kind: 'email' as const,
  identifier: 'email_001',
  label: 'TO CONFIRM DOCS',
  state: 'mismatch' as const,
  detail: 'Consignee mismatch'
}

const ANSWER: GraphChatAnswer = {
  answer: 'email_001 carries a consignee mismatch [1].',
  grounded: true,
  citations: [
    { ref: 1, node_id: 'email:email_001', edge_id: null, label: 'email_001', kind: 'email', state: 'mismatch' }
  ],
  highlight: { node_ids: ['email:email_001'], edge_ids: [], focus_node_id: 'email:email_001' },
  subgraph: { nodes: [NODE], edges: [] },
  followups: ['Which emails are held?', 'Which shipments lack a case?', 'Which ports appear?', 'Which documents are held?'],
  provider: { model: 'gemini-3.5-flash-lite', decision_source: 'live', attempts: 1 }
}

function makeApi(overrides: Partial<GraphChatApiClient> = {}): GraphChatApiClient {
  return {
    getGraphCorpus: vi.fn(async () => ({}) as GraphCorpus),
    postGraphChat: vi.fn(async () => ANSWER),
    ...overrides
  }
}

function renderPanel(api: GraphChatApiClient, props: Record<string, unknown> = {}) {
  return render(<GraphChatPanel api={api} corpus={{ source: 'prepared', version: 'seed-v1' }} {...props} />)
}

describe('GraphChatPanel', () => {
  it('announces what the answers are grounded in from the corpus source', () => {
    renderPanel(makeApi())
    expect(screen.getByText(/prepared/i)).toBeInTheDocument()
    expect(screen.getByText(/seed-v1/i)).toBeInTheDocument()
  })

  it('shows four starter questions before the first message', () => {
    renderPanel(makeApi())
    const chips = screen.getAllByRole('button', { name: /\?$/ })
    expect(chips).toHaveLength(4)
    expect(chips.map((chip) => chip.textContent)).toEqual([...STARTER_QUESTIONS])
  })

  it('sends a starter chip as the question when clicked', async () => {
    const api = makeApi()
    renderPanel(api)
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await waitFor(() => expect(api.postGraphChat).toHaveBeenCalled())
    expect(api.postGraphChat).toHaveBeenCalledWith(
      expect.objectContaining({ question: STARTER_QUESTIONS[0] })
    )
  })

  it('reports the answer, maps the highlight, and swaps the drawn graph to the subgraph', async () => {
    const api = makeApi()
    const onHighlight = vi.fn()
    const onPending = vi.fn()
    const onGraph = vi.fn()
    renderPanel(api, { onHighlight, onPending, onGraph })

    await userEvent.type(screen.getByLabelText(/ask about this graph/i), 'Which emails mismatch?')
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))

    await screen.findByText(/^email_001 carries/)
    expect(onPending.mock.calls.map((call) => call[0])).toEqual([true, false])
    expect(onHighlight).toHaveBeenLastCalledWith({
      nodeIds: ['email:email_001'],
      edgeIds: [],
      focusNodeId: 'email:email_001'
    })
    expect(onGraph).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: [expect.objectContaining({ id: 'email:email_001' })] })
    )
  })

  it('replaces the starter chips with the followups from the answer', async () => {
    renderPanel(makeApi())
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await screen.findByText(/^email_001 carries/)
    for (const followup of ANSWER.followups) {
      expect(screen.getByRole('button', { name: followup })).toBeInTheDocument()
    }
    for (const starter of STARTER_QUESTIONS) {
      expect(screen.queryByRole('button', { name: starter })).not.toBeInTheDocument()
    }
  })

  it('renders only the followups that came back when fewer than four arrive', async () => {
    const api = makeApi({ postGraphChat: vi.fn(async () => ({ ...ANSWER, followups: ['Only one?'] })) })
    renderPanel(api)
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await screen.findByText(/^email_001 carries/)
    const chips = screen.getAllByRole('button', { name: /\?$/ })
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveTextContent('Only one?')
  })

  it('disables the chips while a request is in flight instead of hiding them', async () => {
    let release: (answer: GraphChatAnswer) => void = () => {}
    const api = makeApi({ postGraphChat: vi.fn(() => new Promise<GraphChatAnswer>((res) => (release = res))) })
    renderPanel(api)
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    for (const chip of screen.getAllByRole('button', { name: /\?$/ })) {
      expect(chip).toBeDisabled()
    }
    release(ANSWER)
    await screen.findByText(/^email_001 carries/)
  })

  it('renders a refusal as a held decision, not an error, and clears the highlight', async () => {
    const refusal: GraphChatAnswer = {
      ...ANSWER,
      answer: 'The control graph cannot answer that question.',
      grounded: false,
      citations: [],
      highlight: { node_ids: [], edge_ids: [], focus_node_id: null },
      subgraph: { nodes: [], edges: [] }
    }
    const api = makeApi({ postGraphChat: vi.fn(async () => refusal) })
    const onHighlight = vi.fn()
    const onGraph = vi.fn()
    renderPanel(api, { onHighlight, onGraph })

    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    const refusalEl = await screen.findByText(/cannot answer that question/i)
    expect(refusalEl.closest('[data-grounded]')).toHaveAttribute('data-grounded', 'false')
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(onHighlight).toHaveBeenLastCalledWith(null)
    expect(onGraph).not.toHaveBeenCalled()
  })

  it('shows the provider failure message with a manual retry that resends the same question', async () => {
    const api = makeApi()
    api.postGraphChat = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'chat_busy', 'Other questions are being answered. Try again in a minute.'))
      .mockResolvedValueOnce(ANSWER)
    const onHighlight = vi.fn()
    renderPanel(api, { onHighlight })

    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await screen.findByText(/try again in a minute/i)
    expect(onHighlight).toHaveBeenLastCalledWith(null)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    await screen.findByText(/^email_001 carries/)
    expect(api.postGraphChat).toHaveBeenCalledTimes(2)
    expect(api.postGraphChat).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: STARTER_QUESTIONS[0] })
    )
  })

  it('clears the conversation and returns the graph to the overview', async () => {
    const onGraph = vi.fn()
    const onHighlight = vi.fn()
    renderPanel(makeApi(), { onGraph, onHighlight })
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await screen.findByText(/^email_001 carries/)

    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onGraph).toHaveBeenLastCalledWith(null)
    expect(onHighlight).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/^email_001 carries/)).not.toBeInTheDocument()
    for (const starter of STARTER_QUESTIONS) {
      expect(screen.getByRole('button', { name: starter })).toBeInTheDocument()
    }
  })

  it('sends on Enter and keeps the draft on Shift+Enter', async () => {
    const api = makeApi()
    renderPanel(api)
    const input = screen.getByLabelText(/ask about this graph/i)
    await userEvent.type(input, 'first line{Shift>}{Enter}{/Shift}second line')
    expect(api.postGraphChat).not.toHaveBeenCalled()
    await userEvent.type(input, '{Enter}')
    await waitFor(() => expect(api.postGraphChat).toHaveBeenCalled())
    expect(api.postGraphChat).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'first line\nsecond line' })
    )
  })

  it('focuses one node while a citation chip is hovered and restores the answer highlight on leave', async () => {
    const onHighlight = vi.fn()
    renderPanel(makeApi(), { onHighlight })
    await userEvent.click(screen.getByRole('button', { name: STARTER_QUESTIONS[0] }))
    await screen.findByText(/^email_001 carries/)

    const chip = screen.getByRole('button', { name: /email_001/i })
    await userEvent.hover(chip)
    expect(onHighlight).toHaveBeenLastCalledWith({ nodeIds: ['email:email_001'], edgeIds: [] })
    await userEvent.unhover(chip)
    expect(onHighlight).toHaveBeenLastCalledWith({
      nodeIds: ['email:email_001'],
      edgeIds: [],
      focusNodeId: 'email:email_001'
    })
  })

  it('marks the message log as a live region', () => {
    renderPanel(makeApi())
    const log = screen.getByRole('log')
    expect(log).toHaveAttribute('aria-live', 'polite')
  })
})
