import { describe, expect, it, vi } from 'vitest'
import {
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

  it('creates sessions without any network call', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    createGuestSession()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
