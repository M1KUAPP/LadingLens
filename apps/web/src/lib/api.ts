export const API_SESSION_KEY = 'ladinglens-api-session'
const SESSION_HEADER = 'X-LadingLens-Session'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown[]

  constructor(status: number, code: string, message: string, details?: unknown[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let memoryToken: string | null = null
let minting: Promise<string> | null = null
const inFlight = new Set<AbortController>()

export function readApiSessionToken(): string | null {
  try {
    return sessionStorage.getItem(API_SESSION_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

function storeToken(token: string | null): void {
  memoryToken = token
  try {
    if (token === null) sessionStorage.removeItem(API_SESSION_KEY)
    else sessionStorage.setItem(API_SESSION_KEY, token)
  } catch {
    // The in-memory token still identifies this tab.
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  let code = 'http_error'
  let message = `The server answered ${response.status}.`
  let details: unknown[] | undefined
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown[] } }
    code = body.error?.code ?? code
    message = body.error?.message ?? message
    details = body.error?.details
  } catch {
    // Keep the generic message when the body is not the error envelope.
  }
  return new ApiError(response.status, code, message, details)
}

async function mintToken(): Promise<string> {
  minting ??= (async () => {
    try {
      const response = await fetch('/api/session', { method: 'POST' })
      if (!response.ok) throw await errorFrom(response)
      const body = (await response.json()) as { session_token: string }
      storeToken(body.session_token)
      return body.session_token
    } finally {
      minting = null
    }
  })()
  return minting
}

function send(path: string, init: RequestInit, token: string, controller: AbortController): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set(SESSION_HEADER, token)
  return fetch(path, { ...init, headers, signal: controller.signal })
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  inFlight.add(controller)
  const outer = init.signal
  const onOuterAbort = () => controller.abort(outer?.reason)
  if (outer?.aborted) controller.abort(outer.reason)
  else outer?.addEventListener('abort', onOuterAbort)
  try {
    let token = readApiSessionToken() ?? (await mintToken())
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    let response = await send(path, init, token, controller)
    if (response.status === 401) {
      const error = await errorFrom(response.clone())
      if (error.code === 'session_required') {
        // Another in-flight request may have already cleared and re-minted
        // by the time this one's error body finishes reading (the in-flight
        // mint dedupe above only covers mints that overlap in time). Only
        // clear and re-mint when the stored token is still the one this
        // request sent; otherwise retry with the current one instead of
        // minting a second, orphaning server session.
        const current = readApiSessionToken()
        if (current && current !== token) {
          token = current
        } else {
          storeToken(null)
          token = await mintToken()
        }
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        response = await send(path, init, token, controller)
      }
    }
    if (!response.ok) throw await errorFrom(response)
    return response
  } finally {
    outer?.removeEventListener('abort', onOuterAbort)
    inFlight.delete(controller)
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  return (await response.json()) as T
}

export function abortInFlight(): void {
  for (const controller of inFlight) controller.abort()
  inFlight.clear()
}

export function forgetApiSession(): void {
  storeToken(null)
}
