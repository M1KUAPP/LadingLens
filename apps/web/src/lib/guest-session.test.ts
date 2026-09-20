import { describe, expect, it, vi } from 'vitest'
import {
  clearGuestSession,
  createGuestSession,
  ensureGuestSession,
  readGuestSession
} from './guest-session'

describe('guest session seam', () => {
  it('reports no session before one is created', () => {
    expect(readGuestSession()).toBeNull()
  })

  it('persists an opaque session in sessionStorage only', () => {
    const session = createGuestSession()
    expect(session.id).toBeTruthy()
    expect(session.issuedAt).toBeTruthy()
    expect(readGuestSession()).toEqual(session)
    expect(localStorage.length).toBe(0)
  })

  it('reuses the same session across calls', () => {
    const first = ensureGuestSession()
    expect(ensureGuestSession()).toEqual(first)
  })

  it('treats malformed stored data as no session', () => {
    sessionStorage.setItem('ladinglens-guest-session', '{not json')
    expect(readGuestSession()).toBeNull()
  })

  it('keeps the session readable when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    const session = ensureGuestSession()
    expect(readGuestSession()).toEqual(session)
  })

  it('clears the session from storage and memory', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    ensureGuestSession()
    vi.restoreAllMocks()
    sessionStorage.setItem(
      'ladinglens-guest-session',
      JSON.stringify({ id: 'persisted', issuedAt: 'earlier' })
    )
    clearGuestSession()
    expect(readGuestSession()).toBeNull()
  })

  it('creates sessions without any network call', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    createGuestSession()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
