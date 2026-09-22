// JSON state kept for the guest session, like lib/guest-session.ts keeps the
// session itself. sessionStorage throws when site data is blocked (e.g. Safari
// or Firefox with storage disabled): a blocked read behaves as "nothing
// stored", and a blocked write or remove leaves the state in memory only.

export function readSessionState(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeSessionState(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is blocked or full; the state lasts as long as this page, and
    // an older stored value must not come back in its place.
    removeSessionState(key)
  }
}

export function removeSessionState(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Storage is unavailable; nothing persisted to remove.
  }
}
