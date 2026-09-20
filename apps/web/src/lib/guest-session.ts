export type GuestSession = {
  readonly id: string
  readonly issuedAt: string
}

const STORAGE_KEY = 'ladinglens-guest-session'

let fallbackSession: GuestSession | null = null

export function readGuestSession(): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as GuestSession).id === 'string' &&
        typeof (parsed as GuestSession).issuedAt === 'string'
      ) {
        return parsed as GuestSession
      }
    }
  } catch {
    // Storage is unavailable; the in-memory session still identifies this tab.
  }
  return fallbackSession
}

export function createGuestSession(): GuestSession {
  const session: GuestSession = {
    id: `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    issuedAt: new Date().toISOString()
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // The returned session still identifies this tab when storage is unavailable.
    fallbackSession = session
  }
  return session
}

export function ensureGuestSession(): GuestSession {
  return readGuestSession() ?? createGuestSession()
}

export function clearGuestSession(): void {
  fallbackSession = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage is unavailable; nothing persisted to remove.
  }
}
