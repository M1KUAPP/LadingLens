import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, API_SESSION_KEY } from '../../lib/api'
import { answerToHighlight, corpusToControlGraph, getGraphCorpus, postGraphChat } from './graph-chat-api'
import type { GraphChatAnswer, GraphCorpus } from './types'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const CORPUS: GraphCorpus = {
  source: 'prepared',
  version: 'seed-v1',
  scope: 'overview',
  node_count: 2,
  edge_count: 1,
  nodes: [
    {
      id: 'email:email_001',
      kind: 'email',
      identifier: 'email_001',
      label: 'TO CONFIRM DOCS',
      state: 'mismatch',
      detail: 'Consignee mismatch'
    },
    {
      id: 'document:email_001_SI.txt',
      kind: 'document',
      identifier: 'email_001_SI.txt',
      label: 'Shipping instruction',
      state: 'neutral',
      detail: null
    }
  ],
  edges: [
    {
      id: 'edge:email_001-1',
      source: 'email:email_001',
      target: 'document:email_001_SI.txt',
      kind: 'attachment',
      label: 'Attachment',
      state: 'neutral'
    }
  ]
}

const ANSWER: GraphChatAnswer = {
  answer: 'email_001 carries a consignee mismatch [1].',
  grounded: true,
  citations: [
    {
      ref: 1,
      node_id: 'email:email_001',
      edge_id: null,
      label: 'email_001',
      kind: 'email',
      state: 'mismatch'
    }
  ],
  highlight: {
    node_ids: ['email:email_001'],
    edge_ids: ['edge:email_001-1'],
    focus_node_id: 'email:email_001'
  },
  subgraph: { nodes: CORPUS.nodes, edges: CORPUS.edges },
  followups: [
    'Which emails are held?',
    'Which shipments lack a case?',
    'Which ports appear?',
    'Which documents are held?'
  ],
  provider: { model: 'gemini-3.5-flash-lite', decision_source: 'live', attempts: 1 }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getGraphCorpus', () => {
  it('requests the overview scope, never the full corpus', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe('/api/graph/corpus?scope=overview')
        return json(200, CORPUS)
      })
    )

    await expect(getGraphCorpus()).resolves.toEqual(CORPUS)
  })
})

describe('postGraphChat', () => {
  it('posts the question and history as JSON', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    let capturedInit: RequestInit | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('/api/graph/chat')
        capturedInit = init
        return json(200, ANSWER)
      })
    )

    const history = [
      { role: 'user' as const, content: 'Earlier question' },
      { role: 'assistant' as const, content: 'Earlier answer' }
    ]
    await expect(postGraphChat({ question: 'Which emails mismatch?', history })).resolves.toEqual(ANSWER)

    expect(capturedInit?.method).toBe('POST')
    expect(new Headers(capturedInit?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(capturedInit?.body))).toEqual({ question: 'Which emails mismatch?', history })
  })

  it('propagates a 503 chat_busy envelope as an ApiError', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(503, {
          error: { code: 'chat_busy', message: 'Other questions are being answered. Try again in a minute.' }
        })
      )
    )

    const error = await postGraphChat({ question: 'q', history: [] }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 503, code: 'chat_busy' })
  })
})

describe('corpusToControlGraph', () => {
  it('maps the wire corpus onto the canvas ControlGraph shape', () => {
    const graph = corpusToControlGraph(CORPUS)
    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    expect(graph.nodes[0]).toMatchObject({
      id: 'email:email_001',
      kind: 'email',
      identifier: 'email_001',
      label: 'TO CONFIRM DOCS',
      state: 'mismatch',
      detail: 'Consignee mismatch'
    })
    // Null detail on the wire becomes an absent prop, matching the fixture shape.
    expect('detail' in graph.nodes[1]).toBe(false)
    expect(graph.edges[0]).toMatchObject({
      id: 'edge:email_001-1',
      source: 'email:email_001',
      target: 'document:email_001_SI.txt',
      kind: 'attachment',
      label: 'Attachment',
      state: 'neutral'
    })
  })
})

describe('answerToHighlight', () => {
  it('maps snake_case wire highlight onto the camelCase GraphHighlight', () => {
    expect(answerToHighlight(ANSWER)).toEqual({
      nodeIds: ['email:email_001'],
      edgeIds: ['edge:email_001-1'],
      focusNodeId: 'email:email_001'
    })
  })

  it('returns null when the answer highlights nothing', () => {
    const refusal: GraphChatAnswer = {
      ...ANSWER,
      grounded: false,
      citations: [],
      highlight: { node_ids: [], edge_ids: [], focus_node_id: null },
      subgraph: { nodes: [], edges: [] }
    }
    expect(answerToHighlight(refusal)).toBeNull()
  })
})
