# AlaskanTuna Guest Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver issue #35's guest-only two-pane auth screen and demo
navigation guard so judges enter the operator app through one `Sign in as
Guest` action without waiting for the issue #30 API.

**Architecture:** A frontend-only `guest-session` seam owns opaque session
metadata in `sessionStorage` and accepts no credentials and makes no network
call. A React Router layout-route guard sends operator visits without a
session to `/auth`; a focused `AuthPage` creates the session and navigates to
`/inbox`; a `JudgePage` wrapper initializes a session independently so
`/judge` stays public and shell-free.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Vitest, Testing
Library, user-event, CSS custom properties.

**Spec:** GitHub issue #35 (and dependency contract in issue #30),
`docs/DESIGN.md` (tokens, Field, Button, dark mode, accessibility),
`docs/PRODUCT.md` (public, no-account, synthetic demo).

## Global Constraints

- `Sign in as Guest` is the only working CTA on `/auth`.
- Email and password use the in-house `Field`; they are uncontrolled, carry
  no `name`, use `autocomplete="off"`, sit outside any `form`, never enter
  React state, and are never submitted, stored, logged, or sent to an API.
- The guest-session seam accepts no credentials and makes no network
  request; it persists only in `sessionStorage` and stays replaceable by
  issue #30.
- `/judge` remains public and shell-free and initializes a guest session
  independently, without redirecting to `/auth`.
- Do not invent read-only case, evidence, or artifact routes.
- Existing tokens, type roles, radius, focus ring, and the `Field`/`Button`
  control system only; no new dependency and no hardcoded hex.
- No decorative motion, gradients, or fake product UI; no visible em dash
  (U+2014) or en dash (U+2013).
- The synthetic-data note stays permanently visible; no copy claims real
  accounts, security, or authentication.
- Normal interface copy uses shipping language, never implementation
  jargon.
- Use test-first red, green, refactor cycles for behavior.

---

### Task 1: Add the guest-session seam

**Files:**

- Create: `apps/web/src/lib/guest-session.ts`
- Create: `apps/web/src/lib/guest-session.test.ts`
- Modify: `apps/web/src/test/setup.ts`

**Interfaces:**

- Produces: `type GuestSession = { readonly id: string; readonly issuedAt: string }`,
  `readGuestSession(): GuestSession | null`,
  `createGuestSession(): GuestSession`, and
  `ensureGuestSession(): GuestSession`. `createGuestSession` is the stub
  seam issue #30 replaces with its API-backed creation.

- [ ] **Step 1: Write the failing seam tests**

```ts
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
```

- [ ] **Step 2: Run the tests and observe the missing-module failure**

Run: `bun run test src/lib/guest-session.test.ts`

Expected: FAIL because `./guest-session` does not exist.

- [ ] **Step 3: Clear sessionStorage between tests**

Add `sessionStorage.clear()` to the `afterEach` in
`apps/web/src/test/setup.ts` so sessions cannot leak between tests.

- [ ] **Step 4: Write the minimal seam**

```ts
export type GuestSession = {
  readonly id: string
  readonly issuedAt: string
}

const STORAGE_KEY = 'ladinglens-guest-session'

export function readGuestSession(): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as GuestSession).id === 'string' &&
      typeof (parsed as GuestSession).issuedAt === 'string'
    ) {
      return parsed as GuestSession
    }
    return null
  } catch {
    return null
  }
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
  }
  return session
}

export function ensureGuestSession(): GuestSession {
  return readGuestSession() ?? createGuestSession()
}
```

- [ ] **Step 5: Run the tests and verify green**

Run: `bun run test src/lib/guest-session.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/guest-session.ts \
  apps/web/src/lib/guest-session.test.ts apps/web/src/test/setup.ts
git commit -m "feat(web): add guest session seam"
```

### Task 2: Extend Field with autocomplete and email input

**Files:**

- Modify: `apps/web/src/components/ui/types.ts`
- Modify: `apps/web/src/components/ui/Controls.tsx`
- Modify: `apps/web/src/components/ui/Controls.test.tsx`

**Interfaces:**

- Produces: `FieldProps.autoComplete?: string` forwarded to the underlying
  `input`, and `'email'` added to `FieldKind`.

- [ ] **Step 1: Write the failing Field tests**

Append to the `Field` describe in `Controls.test.tsx`:

```tsx
it('forwards autocomplete to the underlying input', () => {
  render(<Field label="Email" autoComplete="off" />)
  expect(screen.getByLabelText('Email')).toHaveAttribute(
    'autocomplete',
    'off'
  )
})

it('renders an email input for email fields', () => {
  render(<Field label="Email" type="email" />)
  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
})
```

- [ ] **Step 2: Run the tests and observe the failures**

Run: `bun run test src/components/ui/Controls.test.tsx`

Expected: FAIL: `autoComplete` is not a `FieldProps` member and `'email'`
is not a `FieldKind`.

- [ ] **Step 3: Pass autoComplete through and add the email kind**

In `types.ts` change `FieldKind` to
`'text' | 'search' | 'password' | 'email' | 'select' | 'date'`.

In `Controls.tsx` add `autoComplete?: string` to `FieldProps`, accept it in
`Field`, forward it through `FieldControl` to `TextFieldControl`, and set
`autoComplete={autoComplete}` on the `input`.

- [ ] **Step 4: Run the tests and verify green**

Run: `bun run test src/components/ui/Controls.test.tsx`

Expected: PASS, all Field tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/types.ts \
  apps/web/src/components/ui/Controls.tsx \
  apps/web/src/components/ui/Controls.test.tsx
git commit -m "feat(web): add autocomplete and email input to Field"
```

### Task 3: Build the two-pane AuthPage

**Files:**

- Create: `apps/web/src/pages/AuthPage.tsx`
- Create: `apps/web/src/pages/auth-page.css`
- Create: `apps/web/src/pages/AuthPage.test.tsx`
- Modify: `apps/web/src/routing/routes.tsx`

**Interfaces:**

- Consumes: `ensureGuestSession()` from Task 1; `Field` `autoComplete` and
  `type="email"` from Task 2; `Button`; `readTheme()` from `lib/theme`.
- Produces: `AuthPage` rendered at `/auth` (route wired in this task so the
  page test can exercise the real route).

- [ ] **Step 1: Write the failing auth page tests**

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'

function storedValues(): string {
  const values: string[] = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    values.push(sessionStorage.getItem(sessionStorage.key(i)!) ?? '')
  }
  return values.join('\n')
}

describe('auth page', () => {
  it('renders both panes with the demo notice and a single guest action', () => {
    renderAt('/auth', <App />)
    expect(
      screen.getByRole('region', { name: 'About this demo' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(
      screen.getByText(/synthetic data only/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not submitted or stored/i)
    ).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Sign in as Guest')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('keeps the credential fields presentational', () => {
    renderAt('/auth', <App />)
    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    expect(email.closest('form')).toBeNull()
    expect(password.closest('form')).toBeNull()
    expect(email).not.toHaveAttribute('name')
    expect(password).not.toHaveAttribute('name')
    expect(email).toHaveAttribute('autocomplete', 'off')
    expect(password).toHaveAttribute('autocomplete', 'off')
  })

  it('enters the inbox as a guest without storing typed credentials', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAt('/auth', <App />)
    await user.type(screen.getByLabelText('Email'), 'operator@averis.example')
    await user.type(screen.getByLabelText('Password'), 'tr1al-passw0rd')
    await user.click(
      screen.getByRole('button', { name: 'Sign in as Guest' })
    )
    expect(
      screen.getByRole('heading', { name: 'Inbox' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Product views' })
    ).toBeInTheDocument()
    expect(readGuestSession()).not.toBeNull()
    const stored = storedValues()
    expect(stored).not.toContain('operator@averis.example')
    expect(stored).not.toContain('tr1al-passw0rd')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests and observe the missing-module failure**

Run: `bun run test src/pages/AuthPage.test.tsx`

Expected: FAIL because `AuthPage` does not exist and `/auth` still renders
the placeholder.

- [ ] **Step 3: Implement AuthPage**

```tsx
import { useNavigate } from 'react-router-dom'
import { Button, Field } from '../components/ui/Controls'
import { ensureGuestSession } from '../lib/guest-session'
import { readTheme } from '../lib/theme'
import './auth-page.css'

export function AuthPage() {
  const navigate = useNavigate()
  const lockupSrc =
    readTheme() === 'dark'
      ? '/brand/lockup-dark.svg'
      : '/brand/lockup-colour.svg'

  const enterAsGuest = () => {
    ensureGuestSession()
    navigate('/inbox')
  }

  return (
    <main className="auth">
      <section className="auth-intro" aria-label="About this demo">
        <img
          className="auth-lockup"
          src={lockupSrc}
          alt="LadingLens"
          width={172}
          height={32}
        />
        <div className="auth-intro-body">
          <p className="auth-eyebrow">Operator demonstration</p>
          <p className="auth-headline">
            Every shipping document, checked against its evidence.
          </p>
          <p className="auth-copy">
            Walk the inbox, comparison, review, and reconciliation views for
            a synthetic shipping operation.
          </p>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-panel-inner">
          <div className="auth-panel-head">
            <h1 className="auth-heading" id="auth-heading">
              Sign in
            </h1>
            <p className="auth-subhead">
              Guest access is the only entry for this demo.
            </p>
          </div>
          <div className="auth-fields">
            <Field
              label="Email"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
            />
            <Field label="Password" type="password" autoComplete="off" />
          </div>
          <p className="auth-note">
            This demo runs on synthetic data only. Email and password are
            not submitted or stored.
          </p>
          <Button className="auth-submit" onClick={enterAsGuest}>
            Sign in as Guest
          </Button>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Write the two-pane stylesheet**

`auth-page.css` uses only token values, collapses to a strict single column
below 768px, and adds no motion:

```css
.auth {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  background: var(--surface-canvas);
}

.auth-intro {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-10);
  padding: var(--spacing-10) var(--spacing-9);
  background: var(--surface-raised);
  border-right: 1px solid var(--border-default);
}

.auth-lockup {
  display: block;
  width: 172px;
  height: 32px;
}

.auth-intro-body {
  margin-top: auto;
  max-width: 26rem;
}

.auth-eyebrow {
  margin: 0 0 var(--spacing-3);
  font: var(--type-label-sm);
  letter-spacing: var(--type-label-sm-tracking);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.auth-headline {
  margin: 0;
  font: var(--type-display-md);
  letter-spacing: var(--type-display-md-tracking);
  color: var(--text-primary);
}

.auth-copy {
  margin: var(--spacing-4) 0 0;
  color: var(--text-secondary);
}

.auth-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-9) var(--spacing-7);
}

.auth-panel-inner {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  width: 100%;
  max-width: 22rem;
}

.auth-panel-head {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.auth-heading {
  margin: 0;
  font: var(--type-heading-lg);
  letter-spacing: var(--type-heading-lg-tracking);
}

.auth-subhead {
  margin: 0;
  color: var(--text-secondary);
}

.auth-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.auth-note {
  margin: 0;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--state-neutral-fill);
  font: var(--type-body-sm);
  letter-spacing: var(--type-body-sm-tracking);
  color: var(--text-secondary);
}

.auth-submit {
  width: 100%;
}

@media (max-width: 767px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .auth-intro {
    gap: var(--spacing-6);
    padding: var(--spacing-7) var(--spacing-5);
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }

  .auth-intro-body {
    margin-top: 0;
  }

  .auth-panel {
    align-items: flex-start;
    padding: var(--spacing-8) var(--spacing-5) var(--spacing-10);
  }
}
```

- [ ] **Step 5: Wire the route**

In `routes.tsx`, replace the `/auth` `PublicPage` element with
`<AuthPage />` and import it.

- [ ] **Step 6: Run the tests and verify green**

Run: `bun run test src/pages/AuthPage.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/AuthPage.tsx apps/web/src/pages/auth-page.css \
  apps/web/src/pages/AuthPage.test.tsx apps/web/src/routing/routes.tsx
git commit -m "feat(web): add guest-only two-pane auth screen"
```

### Task 4: Add the demo navigation guard and judge session init

**Files:**

- Modify: `apps/web/src/routing/routes.tsx`
- Modify: `apps/web/src/routing/routes.test.tsx`

**Interfaces:**

- Consumes: `readGuestSession()` and `ensureGuestSession()` from Task 1.
- Produces: `OperatorGuard` layout route wrapping the six operator routes
  (`/inbox`, `/emails/:emailId`, `/review`, `/graph`, `/evaluation`,
  `/settings`) and `JudgePage` initializing a session for direct `/judge`
  visits.

- [ ] **Step 1: Write the failing guard tests and update stale tests**

In `routes.test.tsx` seed a session before each guarded-route render by
calling `createGuestSession()` (imported from `../lib/guest-session`),
replace the stale `/auth` placeholder test with a shell-free assertion, and
add:

```tsx
it('redirects operator routes to auth without a guest session', () => {
  renderAt('/inbox', <App />)
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  expect(
    screen.queryByRole('navigation', { name: 'Product views' })
  ).not.toBeInTheDocument()
})

it('initializes a guest session for direct judge visits', () => {
  renderAt('/judge', <App />)
  expect(
    screen.getByRole('heading', { name: 'Judge workspace' })
  ).toBeInTheDocument()
  expect(readGuestSession()).not.toBeNull()
})
```

- [ ] **Step 2: Run the tests and observe the failures**

Run: `bun run test src/routing/routes.test.tsx`

Expected: FAIL: `/inbox` renders the shell instead of redirecting and
`/judge` leaves `readGuestSession()` null.

- [ ] **Step 3: Implement the guard and judge init**

In `routes.tsx` add `Navigate`, `Outlet`, and `useEffect` imports plus the
guest-session imports, then:

```tsx
function OperatorGuard() {
  return readGuestSession() ? <Outlet /> : <Navigate to="/auth" replace />
}

function JudgePage() {
  useEffect(() => {
    ensureGuestSession()
  }, [])
  return (
    <PublicPage title="Judge workspace">
      <p className="placeholder-copy">
        Issue #39 builds the public flow where a judge submits a fresh
        synthetic pair and inspects a live result.
      </p>
    </PublicPage>
  )
}
```

Wrap the six operator `Route` elements in
`<Route element={<OperatorGuard />}> ... </Route>` and point `/judge` at
`<JudgePage />`.

- [ ] **Step 4: Run the tests and verify green**

Run: `bun run test src/routing/routes.test.tsx`

Expected: PASS, all route tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routing/routes.tsx apps/web/src/routing/routes.test.tsx
git commit -m "feat(web): guard operator routes behind a guest session"
```

### Task 5: Run the full verification and self-review pass

**Files:**

- Modify only files required by verified failures from this task.

**Interfaces:**

- Consumes: all prior task outputs.
- Produces: verified issue #35 implementation on `feat/alaskantuna-auth`.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
bun run test
bun run lint
bun run build
```

Expected: all exit 0 in `apps/web`.

- [ ] **Step 2: Scan visible copy for dashes and hex**

Check the new page and stylesheet for U+2013, U+2014, and hardcoded hex:

```bash
rg -n $'–|—|#[0-9a-fA-F]{3,8}' apps/web/src/pages/AuthPage.tsx \
  apps/web/src/pages/auth-page.css
```

Expected: no matches.

- [ ] **Step 3: Self-review issue #35 line by line**

Walk every acceptance checkbox and architecture constraint against the
diff; note any gap in the final report.

- [ ] **Step 4: Commit any verified fixes**

```bash
git add apps/web
git commit -m "fix(web): resolve auth verification findings"
```

## Final integration checklist

- [ ] `/auth` renders two panes with no topbar, navigation, or footer, and
  collapses to one column below 768px.
- [ ] Email and password are uncontrolled `Field`s with labels, no `name`,
  `autocomplete="off"`, outside any form, never stored or sent.
- [ ] `Sign in as Guest` is the only working CTA and lands on `/inbox`.
- [ ] Operator routes redirect to `/auth` without a session; `/judge`
  initializes one independently and stays shell-free.
- [ ] Copy states synthetic data only; nothing claims real accounts,
  security, or authentication; no visible em/en dash.
- [ ] Tests, lint, and build are green; the seam is ready for issue #30.
