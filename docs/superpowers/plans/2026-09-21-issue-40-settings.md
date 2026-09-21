# Issue 40 Settings and Reset All Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/settings` view in the app shell whose always-visible Reset All
control, after an explicit plain-language confirmation, resets the caller's
server workspace to the seed baseline and clears every piece of demo browser
state, then shows the clean seeded workspace without a manual reload.

**Architecture:** `src/lib/api.ts` is the one browser client for the product
API: it holds the server-minted session token per tab, adds it to every
request, re-mints once on `session_required`, and can abort every in-flight
request. `src/lib/demo-reset.ts` orders the reset: abort in-flight requests,
call `POST /api/reset`, then (only on success) re-seed the prepared
in-memory services, clear demo storage keys, restore the default theme, and
bump a reset key that remounts every route. `SettingsPage` owns the UI: the
panel, the in-house `ConfirmDialog`, and honest progress, success, and
failure states.

**Tech Stack:** React 19, react-router-dom 7, Vite, Vitest with jsdom and
Testing Library, in-house components only.

**Spec:** GitHub issue #40; `docs/DESIGN.md` sections "App Layout",
"Components", "States", "Dark Mode", "Accessibility"; research
`docs/research/build/reset-all-ux.md`.

## Global Constraints

- In-house components only (`src/components/ui/*`); no UI library.
- UX: low cognitive load, concise domain language, no internal jargon in
  normal UI; secondary captions only as the `Tooltip` "i" icon beside a
  heading; critical warnings and the Reset All action permanently visible
  (never inside a tooltip or menu).
- Button variants (DESIGN.md): Primary commits the irreversible action and
  appears once per screen; Secondary opens a flow; Ghost withdraws.
- API contract (implemented server-side by issue #30):
  - `POST /api/session` → `201 {"session_token": string, "generation":
    number, "seed_version": string}`.
  - Every other call sends header `X-LadingLens-Session: <session_token>`.
  - `401 {"error": {"code": "session_required", "message": string}}` means
    the token is missing or unknown: mint a new one and retry once.
  - `POST /api/reset` → `200 {"generation": number, "seed_version": string,
    "reset_at": string}`; failures return `{"error": {"code", "message"}}`
    with a 4xx/5xx status.
- Storage keys: session token `ladinglens-api-session` (sessionStorage);
  guest marker `ladinglens-guest-session` (sessionStorage, kept by reset);
  theme `ladinglens-theme` (localStorage, cleared by reset); last judge run
  `ladinglens-judge-last-run` (sessionStorage, cleared by reset; used by
  issue #39).
- A failed server reset changes nothing in the browser and says so.
- Commands from `apps/web`: `bun run test`, `bun run lint`, `bun run build`.

---

### Task 1: Product API client with a server-minted session

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/lib/api.test.ts`

**Interfaces:**
- Produces: `API_SESSION_KEY = 'ladinglens-api-session'`;
  `class ApiError extends Error { status: number; code: string }`;
  `readApiSessionToken(): string | null`;
  `apiFetch(path: string, init?: RequestInit): Promise<Response>` (adds the
  session header, mints on demand, retries once on `session_required`,
  registers an `AbortController` per call, throws `ApiError` for non-2xx);
  `apiJson<T>(path: string, init?: RequestInit): Promise<T>`;
  `abortInFlight(): void` (aborts every registered request).

- [ ] **Step 1: Write the failing tests** in `apps/web/src/lib/api.test.ts`

```ts
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
})
```

- [ ] **Step 2: Run to verify failure** — `bun run test src/lib/api.test.ts`
  → FAIL (cannot resolve `./api`).

- [ ] **Step 3: Create `apps/web/src/lib/api.ts`**

```ts
export const API_SESSION_KEY = 'ladinglens-api-session'
const SESSION_HEADER = 'X-LadingLens-Session'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
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
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } }
    code = body.error?.code ?? code
    message = body.error?.message ?? message
  } catch {
    // Keep the generic message when the body is not the error envelope.
  }
  return new ApiError(response.status, code, message)
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

async function send(path: string, init: RequestInit, token: string): Promise<Response> {
  const controller = new AbortController()
  inFlight.add(controller)
  const outer = init.signal
  const onOuterAbort = () => controller.abort(outer?.reason)
  outer?.addEventListener('abort', onOuterAbort)
  try {
    const headers = new Headers(init.headers)
    headers.set(SESSION_HEADER, token)
    return await fetch(path, { ...init, headers, signal: controller.signal })
  } finally {
    outer?.removeEventListener('abort', onOuterAbort)
    inFlight.delete(controller)
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = readApiSessionToken() ?? (await mintToken())
  let response = await send(path, init, token)
  if (response.status === 401) {
    const error = await errorFrom(response.clone())
    if (error.code === 'session_required') {
      storeToken(null)
      token = await mintToken()
      response = await send(path, init, token)
    }
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  return (await response.json()) as T
}

export function abortInFlight(): void {
  for (const controller of inFlight) controller.abort()
  inFlight.clear()
}
```

Clear the module's memory token between tests: add
`export function forgetApiSession(): void { storeToken(null) }` and call it
from `src/test/setup.ts` `afterEach` (next to `clearGuestSession()`).

- [ ] **Step 4: Run tests** — `bun run test src/lib/api.test.ts` → PASS.

- [ ] **Step 5: Lint, full test run, commit**

```bash
bun run lint && bun run test
git add src/lib/api.ts src/lib/api.test.ts src/test/setup.ts
git commit -m "feat(web): add product API client with server-minted session"
```

---

### Task 2: Reset orchestration and remount key

**Files:**
- Modify: `apps/web/src/features/email-detail/seam.ts` (add `reset()`)
- Modify: `apps/web/src/features/review-queue/seam.ts` (reset its email
  detail service too)
- Create: `apps/web/src/lib/demo-reset.ts` (no React) and
  `apps/web/src/lib/reset-context.tsx` (the React provider)
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/lib/demo-reset.test.ts`,
  `apps/web/src/features/review-queue/seam.test.ts` (one added case)

**Interfaces:**
- Consumes: `apiJson`, `abortInFlight`, `ApiError` (Task 1);
  `defaultEmailDetailService`, `defaultReviewQueueService`,
  `defaultReconciliationService`; `applyTheme`, `readTheme` (`lib/theme`).
- Produces: `EmailDetailService.reset(): Promise<void>`;
  `DEMO_LOCAL_KEYS = ['ladinglens-theme']`,
  `DEMO_SESSION_KEYS = ['ladinglens-judge-last-run']`;
  `type ResetOutcome = { ok: true; generation: number; resetAt: string } |
  { ok: false; message: string }`; `resetDemo(): Promise<ResetOutcome>`;
  `ResetKeyProvider` and `useDemoReset(): { resetKey: number; reset: () =>
  Promise<ResetOutcome>; lastReset: ResetOutcome | null }`.

`resetDemo` order: `abortInFlight()`; `await apiJson('/api/reset', { method:
'POST' })`; on any error return `{ ok: false, message }` (an `ApiError`
message, or "The reset could not reach the server. Nothing was changed.")
without touching browser state; on success reset the three prepared
services, remove `DEMO_LOCAL_KEYS` from localStorage and `DEMO_SESSION_KEYS`
from sessionStorage, then `applyTheme(readTheme())` (which now falls back to
the system preference), and return `{ ok: true, generation, resetAt }`. The
guest marker and the API session token are kept: the server reset starts a
new generation for the same session.

`ResetKeyProvider` holds `resetKey` state; its `reset()` calls `resetDemo()`
and, on success, increments `resetKey`. In `App.tsx`, wrap the routes:
`<ResetKeyProvider><ThemeSeed /><ScrollToTop /><KeyedRoutes /></ResetKeyProvider>`
where `KeyedRoutes` renders `<AppRoutes key={resetKey} />`, so every route
remounts with fresh component state (filters, selection, pagination).

- [ ] **Step 1: Write failing tests** in `apps/web/src/lib/demo-reset.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY } from './api'
import { resetDemo } from './demo-reset'
import { defaultReviewQueueService } from '../features/review-queue/seam'
import { defaultReconciliationService } from '../features/reconciliation/seam'
import { defaultEmailDetailService } from '../features/email-detail/seam'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('resetDemo', () => {
  it('resets the server first, then clears demo browser state', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    sessionStorage.setItem('ladinglens-guest-session', '{"id":"guest-1","issuedAt":"x"}')
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-1')
    localStorage.setItem('ladinglens-theme', 'dark')
    const spies = [
      vi.spyOn(defaultReviewQueueService, 'reset'),
      vi.spyOn(defaultReconciliationService, 'reset'),
      vi.spyOn(defaultEmailDetailService, 'reset')
    ]
    const fetchMock = vi.fn(async () => json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await resetDemo()

    expect(outcome).toEqual({ ok: true, generation: 2, resetAt: '2026-09-21T08:00:00Z' })
    expect(fetchMock).toHaveBeenCalledWith('/api/reset', expect.objectContaining({ method: 'POST' }))
    expect(localStorage.getItem('ladinglens-theme')).not.toBe('dark')
    expect(sessionStorage.getItem('ladinglens-judge-last-run')).toBeNull()
    expect(sessionStorage.getItem('ladinglens-guest-session')).not.toBeNull()
    expect(sessionStorage.getItem(API_SESSION_KEY)).toBe('tok')
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce())
  })

  it('reports a failed server reset honestly and changes nothing', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    localStorage.setItem('ladinglens-theme', 'dark')
    const spy = vi.spyOn(defaultReviewQueueService, 'reset')
    vi.stubGlobal('fetch', vi.fn(async () => json(503, { error: { code: 'reset_unavailable', message: 'The demo database is unavailable.' } })))

    const outcome = await resetDemo()

    expect(outcome).toEqual({ ok: false, message: 'The demo database is unavailable.' })
    expect(localStorage.getItem('ladinglens-theme')).toBe('dark')
    expect(spy).not.toHaveBeenCalled()
  })

  it('reports an unreachable server honestly', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    await expect(resetDemo()).resolves.toEqual({
      ok: false,
      message: 'The reset could not reach the server. Nothing was changed.'
    })
  })
})
```

Add to `apps/web/src/features/review-queue/seam.test.ts` a case proving that
after a case action and `reset()`, the same case action succeeds again
(replay after reset).

- [ ] **Step 2: Run to verify failure** —
  `bun run test src/lib/demo-reset.test.ts src/features/review-queue/seam.test.ts`.

- [ ] **Step 3: Implement**

`features/email-detail/seam.ts`: add `reset(): Promise<void>` to the
`EmailDetailService` interface and implement it in
`createPreparedEmailDetailService` by re-cloning `initialData` into the
store (factor the seeding loop into a local `seed()` called at creation and
by `reset`). Any other `EmailDetailService` implementations in tests must
add a `reset` stub.

`features/review-queue/seam.ts`: `reset()` re-seeds items and awaits
`emailDetail.reset()`.

`lib/demo-reset.ts`:

```ts
import { ApiError, abortInFlight, apiJson } from './api'
import { applyTheme, readTheme } from './theme'
import { defaultEmailDetailService } from '../features/email-detail/seam'
import { defaultReconciliationService } from '../features/reconciliation/seam'
import { defaultReviewQueueService } from '../features/review-queue/seam'

export const DEMO_LOCAL_KEYS = ['ladinglens-theme'] as const
export const DEMO_SESSION_KEYS = ['ladinglens-judge-last-run'] as const

export type ResetOutcome =
  | { ok: true; generation: number; resetAt: string }
  | { ok: false; message: string }

type ResetResponse = { generation: number; seed_version: string; reset_at: string }

function removeKeys(storage: () => Storage, keys: readonly string[]): void {
  try {
    const target = storage()
    keys.forEach((key) => target.removeItem(key))
  } catch {
    // Unavailable storage holds nothing to clear.
  }
}

export async function resetDemo(): Promise<ResetOutcome> {
  abortInFlight()
  let body: ResetResponse
  try {
    body = await apiJson<ResetResponse>('/api/reset', { method: 'POST' })
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'The reset could not reach the server. Nothing was changed.'
    }
  }
  await Promise.all([
    defaultEmailDetailService.reset(),
    defaultReviewQueueService.reset(),
    defaultReconciliationService.reset()
  ])
  removeKeys(() => localStorage, DEMO_LOCAL_KEYS)
  removeKeys(() => sessionStorage, DEMO_SESSION_KEYS)
  applyTheme(readTheme())
  return { ok: true, generation: body.generation, resetAt: body.reset_at }
}
```

`lib/reset-context.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { resetDemo, type ResetOutcome } from './demo-reset'

type DemoReset = {
  resetKey: number
  reset: () => Promise<ResetOutcome>
  lastReset: ResetOutcome | null
}

const ResetContext = createContext<DemoReset | null>(null)

export function ResetKeyProvider({ children }: { children: ReactNode }) {
  const [resetKey, setResetKey] = useState(0)
  const [lastReset, setLastReset] = useState<ResetOutcome | null>(null)
  const reset = useCallback(async () => {
    const outcome = await resetDemo()
    // Record the outcome before the remount so the new page can show it.
    setLastReset(outcome)
    if (outcome.ok) setResetKey((key) => key + 1)
    return outcome
  }, [])
  const value = useMemo(() => ({ resetKey, reset, lastReset }), [resetKey, reset, lastReset])
  return <ResetContext.Provider value={value}>{children}</ResetContext.Provider>
}

export function useDemoReset(): DemoReset {
  const value = useContext(ResetContext)
  if (value === null) throw new Error('useDemoReset needs ResetKeyProvider')
  return value
}
```

Remounting the routes unmounts `SettingsPage`, so the page reads the last
outcome from `lastReset`, which lives in the provider above the remount.

`App.tsx`: wrap as described in the task intro.

- [ ] **Step 4: Run tests** — the two files above plus `bun run test`.

- [ ] **Step 5: Lint, build, commit**

```bash
bun run lint && bun run test && bun run build
git add src/lib/demo-reset.ts src/lib/demo-reset.test.ts src/lib/reset-context.tsx src/App.tsx \
  src/features/email-detail/seam.ts src/features/review-queue/seam.ts src/features/review-queue/seam.test.ts
git commit -m "feat(web): reset demo state after a confirmed server reset"
```

---

### Task 3: In-house confirmation dialog

**Files:**
- Modify: `apps/web/src/components/ui/Overlays.tsx`,
  `apps/web/src/components/ui/overlays.css`
- Test: `apps/web/src/components/ui/Overlays.test.tsx`

**Interfaces:**
- Produces: `ConfirmDialog({ open, title, children, confirmLabel,
  cancelLabel = 'Cancel', busy = false, onConfirm, onCancel })` — a native
  `<dialog>` with `role="alertdialog"`, `aria-modal="true"`,
  `aria-labelledby` (title) and `aria-describedby` (body); opened with
  `showModal()` when available (jsdom lacks it: fall back to setting the
  `open` attribute); initial focus on the Cancel button; Escape (`cancel`
  event) calls `onCancel`; the confirm button is `Button variant="primary"`,
  cancel is `variant="ghost"`; while `busy`, both buttons are disabled. The
  component has no built-in copy besides the default cancel label: callers
  pass `confirmLabel` (for example "Resetting…" while busy).

- [ ] **Step 1: Write failing tests** (append to `Overlays.test.tsx`)

```tsx
describe('ConfirmDialog', () => {
  it('opens as a modal alert dialog with focus on the least destructive action', () => {
    render(
      <ConfirmDialog open title="Reset all demo data?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
        <p>Your uploads will be removed.</p>
      </ConfirmDialog>
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Reset all demo data?' })
    expect(dialog).toHaveAccessibleDescription('Your uploads will be removed.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('cancels on Escape and on Cancel, confirms on the primary action', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={onConfirm} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('renders nothing while closed and disables actions while busy', () => {
    const { rerender } = render(
      <ConfirmDialog open={false} title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
        <p>Body</p>
      </ConfirmDialog>
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    rerender(
      <ConfirmDialog open busy title="Reset?" confirmLabel="Resetting…" onConfirm={() => {}} onCancel={() => {}}>
        <p>Body</p>
      </ConfirmDialog>
    )
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
```

(Import `fireEvent`, `userEvent`, `vi` as the file needs.)

- [ ] **Step 2: Run to verify failure**, **Step 3: implement** following the
  existing Overlays component style (tokens from `src/styles/tokens.css`,
  surfaces and elevation per DESIGN.md "Components" and "Dark Mode"; a
  `::backdrop` using the overlay token; honour reduced motion), **Step 4:
  run tests**, **Step 5: commit**

```bash
bun run lint && bun run test
git add src/components/ui/Overlays.tsx src/components/ui/overlays.css src/components/ui/Overlays.test.tsx
git commit -m "feat(web): add in-house confirmation dialog"
```

---

### Task 4: The /settings view with Reset All

**Files:**
- Create: `apps/web/src/pages/SettingsPage.tsx`,
  `apps/web/src/pages/settings-page.css`
- Modify: `apps/web/src/routing/routes.tsx` (replace the Settings
  placeholder), `apps/web/src/lib/reset-context.tsx` if `lastReset` is not
  yet exposed
- Test: `apps/web/src/pages/SettingsPage.test.tsx`,
  `apps/web/src/routing/routes.test.tsx` (settings case keeps passing)

**Interfaces:**
- Consumes: `useDemoReset()` (`resetKey`, `reset`, `lastReset`),
  `ConfirmDialog`, `Button`, `Tooltip`.
- Produces: `SettingsPage()` rendered at `/settings` inside `AppShell` with
  title "Settings".

Page content (exact copy):

- `h1` "Settings" with a `Tooltip` labelled "About settings": "Settings
  apply to this browser tab and your guest workspace only."
- Section `h2` "Demo data" with a `Tooltip` labelled "About demo data":
  "Other guests keep their own workspaces; a reset never touches theirs."
- Always-visible paragraph: "Reset All restores the original demo data so
  you can run the demonstration again from the start."
- Always-visible list under "Reset All will:" — "Remove your uploads and
  judge runs", "Undo your review decisions and reconciliation actions",
  "Restore the original inbox, shipment ledger, and assignments", "Return
  theme, filters, and selections to their defaults".
- `Button variant="secondary"` "Reset All" (opens the dialog).
- `ConfirmDialog` title "Reset all demo data?", body "This restores the
  original demo data for your guest workspace. It cannot be undone.",
  confirm label "Reset all" (while busy: "Resetting…"), cancel "Cancel".
- A `role="status"` region: while resetting "Resetting your workspace…";
  after success "Demo data reset. You are on a clean workspace." (from
  `lastReset`, with the reset time formatted with
  `toLocaleTimeString()`); a `role="alert"` region on failure showing the
  outcome message followed by " Your data was not changed." and keeping the
  Reset All button enabled for retry.

- [ ] **Step 1: Write failing tests** in `SettingsPage.test.tsx`: renders the
  heading, the always-visible explanation and the Reset All button without
  opening anything; Cancel closes the dialog without calling `fetch`;
  confirming calls `POST /api/reset` once, shows the success status, and
  (render the whole `App` at `/settings` with a guest session) after
  success the theme stored as `dark` beforehand is cleared; a 503 shows the
  alert with the server message and "Your data was not changed." and the
  theme stays `dark`. Stub `fetch` with `vi.stubGlobal`, seed
  `sessionStorage` with `ladinglens-api-session`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** `SettingsPage` and route it: in `routes.tsx`,
  replace the `/settings` `ShellPage` placeholder with
  `<AppShell title="Settings"><SettingsPage /></AppShell>`; remove the
  now-unused `ShellPage` helper only if nothing else uses it.
- [ ] **Step 4: Run** `bun run test` and `bun run build`.
- [ ] **Step 5: Commit**

```bash
bun run lint && bun run test && bun run build
git add src/pages/SettingsPage.tsx src/pages/settings-page.css src/pages/SettingsPage.test.tsx src/routing/routes.tsx src/lib/reset-context.tsx
git commit -m "feat(web): build /settings with guest-scoped Reset All"
```
