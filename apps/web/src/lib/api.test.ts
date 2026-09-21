import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY, ApiError, abortInFlight, apiFetch, apiJson, readApiSessionToken } from './api'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('product API client', () => {
  it('mints a server session once and sends it on every call', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/session') return json(201, { session_token: 'tok-1', generation: 1, seed_version: 'seed-v1' })
      expect(new Headers(init?.headers).get('X-LadingLens-Session')).toBe('tok-1')
      return json(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiJson('/api/emails')
    await apiJson('/api/emails')

    expect(readApiSessionToken()).toBe('tok-1')
    expect(sessionStorage.getItem(API_SESSION_KEY)).toBe('tok-1')
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/session')).toHaveLength(1)
  })

  it('re-mints once when the server no longer knows the session', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'stale')
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/session') return json(201, { session_token: 'fresh', generation: 1, seed_version: 'seed-v1' })
      calls += 1
      const token = new Headers(init?.headers).get('X-LadingLens-Session')
      return token === 'stale'
        ? json(401, { error: { code: 'session_required', message: 'Start a new session.' } })
        : json(200, { ok: true })
    }))

    await expect(apiJson('/api/emails')).resolves.toEqual({ ok: true })
    expect(calls).toBe(2)
    expect(readApiSessionToken()).toBe('fresh')
  })

  it('turns an error body into an ApiError with code and status', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async () => json(503, { error: { code: 'reset_unavailable', message: 'Try again.' } })))

    const error = await apiFetch('/api/reset', { method: 'POST' }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 503, code: 'reset_unavailable', message: 'Try again.' })
  })

  it('aborts every in-flight request', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    ))

    const pending = apiFetch('/api/emails')
    abortInFlight()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('aborts a request that is still waiting on a session mint', async () => {
    let resolveSession: (response: Response) => void = () => {}
    const sessionPromise = new Promise<Response>((resolve) => {
      resolveSession = resolve
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/session') return sessionPromise
      return json(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = apiFetch('/api/emails')
    abortInFlight()
    resolveSession(json(201, { session_token: 'late', generation: 1, seed_version: 'seed-v1' }))

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/emails')).toHaveLength(0)
  })

  it('rejects immediately when the caller signal is already aborted', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    const fetchMock = vi.fn(async () => json(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    controller.abort()

    await expect(apiFetch('/api/emails', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mints only one session for concurrent first calls', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/session') return json(201, { session_token: 'shared', generation: 1, seed_version: 'seed-v1' })
      return json(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([apiJson('/api/emails'), apiJson('/api/emails'), apiJson('/api/emails')])

    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/session')).toHaveLength(1)
    expect(readApiSessionToken()).toBe('shared')
  })
})
