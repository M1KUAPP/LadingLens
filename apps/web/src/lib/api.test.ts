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

  it('retries with the current token instead of re-minting when another request already re-minted (sequential 401s)', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'stale')

    let sessionCallCount = 0
    let resolveASession: (response: Response) => void = () => {}
    const aSessionPromise = new Promise<Response>((resolve) => { resolveASession = resolve })

    let aFirst401Issued = false
    let resolveBFirst401: (response: Response) => void = () => {}
    const bFirst401Promise = new Promise<Response>((resolve) => { resolveBFirst401 = resolve })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/session') {
        sessionCallCount += 1
        if (sessionCallCount === 1) return aSessionPromise
        // Only reached by a wrongly-triggered second mint; give it its own
        // fresh response so that regression fails the assertions below
        // instead of crashing on a reused response body.
        return json(201, { session_token: 'tok-B', generation: 1, seed_version: 'seed-v1' })
      }
      const token = new Headers(init?.headers).get('X-LadingLens-Session')
      if (token === 'stale') {
        if (!aFirst401Issued) {
          aFirst401Issued = true
          return json(401, { error: { code: 'session_required', message: 'Start a new session.' } })
        }
        // B's 401: held open so it lands only after A's re-mint settles.
        return bFirst401Promise
      }
      return json(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const aDone = apiJson('/api/emails')
    const bDone = apiJson('/api/emails')

    // Let A run through issuing its re-mint request, and B through issuing
    // its (held-open) first request, before either one resolves.
    await new Promise((resolve) => setTimeout(resolve, 0))

    resolveASession(json(201, { session_token: 'tok-A', generation: 1, seed_version: 'seed-v1' }))
    await expect(aDone).resolves.toEqual({ ok: true })

    // B's error body finishes reading only now, after A's mint resolved.
    resolveBFirst401(json(401, { error: { code: 'session_required', message: 'Start a new session.' } }))
    await expect(bDone).resolves.toEqual({ ok: true })

    expect(sessionCallCount).toBe(1)
    expect(sessionStorage.getItem(API_SESSION_KEY)).toBe('tok-A')
  })

  it('turns an error body into an ApiError with code and status', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async () => json(503, { error: { code: 'reset_unavailable', message: 'Try again.' } })))

    const error = await apiFetch('/api/reset', { method: 'POST' }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 503, code: 'reset_unavailable', message: 'Try again.' })
  })

  it('carries the structured details array from the error envelope onto ApiError', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async () => json(422, {
      error: {
        code: 'upload_rejected',
        message: 'One or more files could not be used.',
        details: [{ slot: 'si_file', reason: 'unsupported_format' }]
      }
    })))

    const error = await apiFetch('/api/judge/runs', { method: 'POST' }).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'upload_rejected',
      details: [{ slot: 'si_file', reason: 'unsupported_format' }]
    })
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
