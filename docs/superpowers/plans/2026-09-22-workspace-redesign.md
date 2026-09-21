# Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every post-auth workspace page on Geist tokens and the
admincn shell, fold `/judge` into a workspace Upload page, and give the live
check a wireframe-faithful waiting screen.

**Architecture:** A `data-surface="workspace"` attribute on `<html>` scopes a
token layer and a primitives skin, so public pages and the unmerged landing
branch are untouched. Feature stylesheets keep their token names and get new
layouts; the judge feature moves under `/upload` with a new waiting screen
driven by a tested, pure progress model.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Vite 8, plain CSS with
custom properties, Hugeicons, Fontsource Geist, Vitest and Testing Library,
Playwright for screenshots.

**Spec:**
[workspace redesign design](/docs/superpowers/specs/2026-09-22-workspace-redesign-design.md)

## Global Constraints

- Work in `apps/web`. Run `bun run test`, `bunx tsc -b` and `bun run lint`
  from there before every commit.
- Never edit `src/styles/tokens.css`, `docs/DESIGN.md`, the landing or the
  sign-in page: the unmerged landing branch owns them.
- Feature CSS uses tokens only: no hex, `rgb()` or `hsl()` literals outside
  `src/styles/`. Transitions use `var(--duration-*)`. Every `:focus-visible`
  uses `box-shadow: var(--focus-ring)`.
- No em or en dashes in any visible copy.
- Keep every accessible name the tests and users rely on unless a task says
  otherwise.
- One commit per task, conventional format, `feat(web):`, `fix(web):`,
  `test(web):`, `docs:` or `chore:` scopes.

---

### Task 1: Workspace scope, Geist fonts and tokens

**Files:**

- Modify: `apps/web/package.json`, `apps/web/bun.lock`
- Create: `apps/web/src/styles/workspace/tokens.css`
- Create: `apps/web/src/layout/useWorkspaceSurface.ts`
- Modify: `apps/web/src/main.tsx` (import after `base.css`)
- Modify: `apps/web/src/layout/AppShell.tsx` (call the hook)
- Test: `apps/web/src/layout/useWorkspaceSurface.test.tsx`

**Interfaces:**

- Produces: `useWorkspaceSurface(): void`, which sets
  `document.documentElement.dataset.surface = 'workspace'` in a layout effect
  and deletes it on unmount. Produces the `--accent`, `--surface-active` and
  `--radius-xl` tokens used by later tasks.

- [ ] **Step 1: Install the fonts**

Run: `bun add @fontsource-variable/geist @fontsource-variable/geist-mono`

- [ ] **Step 2: Write the failing test**

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceSurface } from './useWorkspaceSurface'

function Probe() {
  useWorkspaceSurface()
  return null
}

describe('useWorkspaceSurface', () => {
  it('marks the document as the workspace surface while mounted', () => {
    const { unmount } = render(<Probe />)
    expect(document.documentElement.dataset.surface).toBe('workspace')
    unmount()
    expect(document.documentElement.dataset.surface).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bunx vitest run src/layout/useWorkspaceSurface.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the hook**

```ts
import { useLayoutEffect } from 'react'

// Workspace tokens and primitive skins key off this attribute, so portaled
// overlays under <html> share them and public pages never see them.
export function useWorkspaceSurface() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'workspace'
    return () => {
      delete root.dataset.surface
    }
  }, [])
}
```

- [ ] **Step 5: Write `workspace/tokens.css`**

`@font-face` blocks for `Geist Variable` (100 to 900) and
`Geist Mono Variable` (100 to 900) from the Fontsource latin
`wght-normal.woff2` files, then `:root[data-surface='workspace']` with every
light value from the spec's token tables, then
`:root[data-surface='workspace'][data-theme='dark']` with the dark values, and
the same dark block under
`@media (prefers-color-scheme: dark) { :root[data-surface='workspace']:not([data-theme]) { … } }`.
Radii: `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 12px`,
`--radius-xl: 16px`. Focus: `--focus-ring: 0 0 0 2px var(--surface-raised),
0 0 0 4px var(--border-focus)`.

- [ ] **Step 6: Wire it and run the suite**

Import `./styles/workspace/tokens.css` in `main.tsx` after `base.css`, call
`useWorkspaceSurface()` first thing in `AppShell`. Run: `bun run test`.
Expected: all pass.

- [ ] **Step 7: Commit** `feat(web): scope Geist tokens and fonts to the workspace`

### Task 2: Primitive skins

**Files:**

- Create: `apps/web/src/styles/workspace/primitives.css`
- Modify: `apps/web/src/main.tsx`

Every selector starts with `:root[data-surface='workspace']` and mirrors the
base selector's states so it wins on specificity. Values from the spec's
Shared primitives section: button 36px, `0 14px`, 6px radius; primary
`--brand-primary` fill with `--text-inverse`; secondary raised surface with a
`--border-default` edge; field shell 36px with `--border-strong`; status pill
22px; drop zone dashed `--border-strong` on `--surface-sunken`, indigo edge
and `color-mix(in srgb, var(--accent) 8%, transparent)` fill when
`[data-active]`; tooltip and menu on `--surface-raised` with
`--elevation-lg` and 6px or 12px radius; scrollbar thumb on
`--border-strong`.

- [ ] **Step 1:** Write the file.
- [ ] **Step 2:** `bun run test` passes; screenshot `/inbox` in both themes.
- [ ] **Step 3: Commit** `feat(web): skin the shared primitives for the workspace`

### Task 3: The admincn shell

**Files:**

- Create: `apps/web/src/layout/sidebar-state.ts`
- Rewrite: `apps/web/src/layout/AppShell.tsx`, `apps/web/src/layout/app-shell.css`
- Rewrite: `apps/web/src/layout/app-shell-css.test.ts`
- Create: `apps/web/src/layout/AppShell.test.tsx`
- Modify: `apps/web/src/routing/routes.test.tsx` (nav and header cases)

**Interfaces:**

- Produces: `type SidebarMode = 'expanded' | 'collapsed'`,
  `readSidebarMode(): SidebarMode`, `storeSidebarMode(mode): void`
  (localStorage key `ladinglens-sidebar`, try/catch on both).
- `AppShell({ title, children })`: the `variant` prop goes in Task 5.
- DOM contract: `.app-shell[data-sidebar]`, `aside.app-sidebar#app-sidebar`,
  `nav[aria-label="Product views"]` with `.app-nav-group` sections,
  `header.app-bar > .app-bar-card`, the toggle button
  `aria-label="Collapse sidebar"` / `"Expand sidebar"` with
  `aria-controls="app-sidebar"` and `aria-expanded`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('collapses the sidebar from the header and remembers it', async () => {
  createGuestSession()
  renderAt('/inbox', <App />)
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  expect(document.querySelector('.app-shell')).toHaveAttribute('data-sidebar', 'collapsed')
  expect(localStorage.getItem('ladinglens-sidebar')).toBe('collapsed')
  expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
})

it('toggles the sidebar with Ctrl+B', () => {
  createGuestSession()
  renderAt('/inbox', <App />)
  fireEvent.keyDown(document, { key: 'b', ctrlKey: true })
  expect(document.querySelector('.app-shell')).toHaveAttribute('data-sidebar', 'collapsed')
})
```

- [ ] **Step 2:** Run them, expect FAIL.
- [ ] **Step 3:** Implement the shell per the spec's Shell section; keep the
      drawer, skip link, breadcrumbs and theme toggle behaviour; drop the
      "Open live demo" link and its test.
- [ ] **Step 4:** Rewrite the CSS contract test: the collapsed rail keys off
      `.app-shell[data-sidebar='collapsed']`, widths come from
      `--sidebar-width` and `--sidebar-collapsed`, the 959px breakpoint hides the
      sidebar, and labels are clipped, not `display: none`.
- [ ] **Step 5:** `bun run test` passes.
- [ ] **Step 6: Commit** `feat(web): rebuild the workspace shell on the admincn sidebar`

### Task 4: Page header

**Files:**

- Rewrite: `apps/web/src/components/ui/PageHead.tsx`, `page-frame.css`
- Modify: every `PageHead` call site (drop `card`)
- Modify: `apps/web/src/routing/routes.test.tsx` (`.page-head`,
  `.page-head-supporting`)

**Interfaces:** `PageHead({ title, icon?, supporting?, tag?, hint?,
hintLabel?, aside?, level? })`; renders `header.page-head`.

- [ ] **Step 1:** Update the route test to expect `.page-head` and
      `.page-head-supporting`; run it, expect FAIL.
- [ ] **Step 2:** Implement per the spec's Page header section.
- [ ] **Step 3:** `bun run test` passes.
- [ ] **Step 4: Commit** `feat(web): replace the hero card with the Geist page header`

### Task 5: Upload page and the `/judge` entry

**Files:**

- Create: `apps/web/src/pages/UploadPage.tsx`
- Modify: `apps/web/src/routing/routes.tsx`, `apps/web/src/layout/AppShell.tsx`
- Modify: `apps/web/src/features/judge/JudgeView.tsx` (the page head moves out)
- Modify: `apps/web/src/routing/routes.test.tsx`

**Interfaces:**

- `UploadPage({ api?: JudgeApiClient })` renders `PageHead` (title
  "Upload", icon `CloudUploadIcon`, tag "Live pipeline") and `JudgeView`.
- `JudgeEntry()` runs `useState(() => ensureGuestSession())` and returns
  `<Navigate to="/upload" replace />`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('opens the upload page from /judge without a sign-in', () => {
  renderAt('/judge', <App />)
  expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument()
  expect(readGuestSession()).not.toBeNull()
  expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('aria-current', 'page')
})

it('lists the views in nav order with settings separate', () => {
  createGuestSession()
  renderAt('/inbox', <App />)
  const nav = screen.getByRole('navigation', { name: 'Product views' })
  expect(
    within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
  ).toEqual(['Upload', 'Batch ingest', 'Inbox', 'Email detail', 'Review queue', 'Control graph', 'Evaluation'])
})
```

- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement; remove the `public` variant and `JudgePage`.
- [ ] **Step 4:** `bun run test` passes.
- [ ] **Step 5: Commit** `feat(web): fold the judge flow into the workspace upload page`

### Task 6: Waiting-screen progress model

**Files:**

- Create: `apps/web/src/features/judge/waiting-progress.ts`
- Test: `apps/web/src/features/judge/waiting-progress.test.ts`

**Interfaces:**

```ts
export const BAY_COLUMNS = 11
export const BAY_ROWS = 10
export type CheckStage = 'receive' | 'read' | 'compare'
export type StageState = 'waiting' | 'active' | 'done'
export const CHECK_STAGES: readonly { key: CheckStage; title: string; detail: string; from: number }[]
export function estimateProgress(elapsedMs: number): number
export function stageStates(progress: number, finished: boolean): Record<CheckStage, StageState>
export function tileRanks(columns: number, rows: number): number[]
export function tileFill(rank: number, progress: number, fillable: number): number
```

- [ ] **Step 1: Write the failing tests**

```ts
it('never reaches the ceiling before the run returns', () => {
  expect(estimateProgress(0)).toBe(0)
  expect(estimateProgress(25_000)).toBeGreaterThan(0.8)
  expect(estimateProgress(600_000)).toBeLessThan(0.95)
})

it('walks the stages at 8% and 72%', () => {
  expect(stageStates(0.05, false)).toEqual({ receive: 'active', read: 'waiting', compare: 'waiting' })
  expect(stageStates(0.4, false)).toEqual({ receive: 'done', read: 'active', compare: 'waiting' })
  expect(stageStates(0.8, false)).toEqual({ receive: 'done', read: 'done', compare: 'active' })
  expect(stageStates(0.8, true)).toEqual({ receive: 'done', read: 'done', compare: 'done' })
})

it('sweeps diagonally out from the counter tile', () => {
  const ranks = tileRanks(11, 10)
  expect(ranks).toHaveLength(110)
  expect(ranks[0]).toBe(-1)
  expect(ranks[1]).toBe(0)
  expect(ranks[11]).toBe(1)
  expect(new Set(ranks.filter((rank) => rank >= 0)).size).toBe(109)
})

it('fills one tile at a time', () => {
  expect(tileFill(0, 0, 109)).toBe(0)
  expect(tileFill(0, 0.5 / 109, 109)).toBeCloseTo(0.5)
  expect(tileFill(3, 1, 109)).toBe(1)
})
```

- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Implement: `0.95 * (1 - Math.exp(-elapsedMs / 12_000))`;
      ranks sort tiles 1..n by `row + column`, then `row`; fill is
      `clamp(progress * fillable - rank, 0, 1)`.
- [ ] **Step 4:** Run, expect PASS.
- [ ] **Step 5: Commit** `feat(web): add the waiting-screen progress model`

### Task 7: Waiting screen in the live check

**Files:**

- Create: `apps/web/src/features/judge/components/CheckWaiting.tsx`,
  `check-waiting.css`, `CheckWaiting.test.tsx`
- Modify: `apps/web/src/features/judge/JudgeView.tsx`, `JudgeView.test.tsx`

**Interfaces:**

- `CheckWaiting({ files: { si: File; draftBl: File }, startedAt: number,
verdict: 'running' | 'match' | 'held' | 'mismatch' | 'failed' })`.
- `JudgeView({ api?, settleMs? })`, `settleMs` defaulting to 900, forced to 0
  under `prefers-reduced-motion`; tests pass `settleMs={0}`.

- [ ] **Step 1:** Write failing component tests: 110 tiles, the first shows
      `0%`, `role="progressbar"` with an estimated `aria-valuetext`, the status
      region names the headline and the active stage, elapsed seconds tick under
      fake timers, and no `.status-pill` renders while running.
- [ ] **Step 2:** Rewrite the JudgeView checking test around the waiting
      screen; run both, expect FAIL.
- [ ] **Step 3:** Implement per the spec's Waiting screen section. In
      JudgeView, keep `UploadPanel` mounted with `hidden` while checking, store
      the submitted files, and hold a `settling` phase for `settleMs` after the
      response.
- [ ] **Step 4:** `bun run test` passes.
- [ ] **Step 5: Commit** `feat(web): show the bay waiting screen during a live check`

### Task 8: Upload page layout and judge panels

**Files:** `judge.css`, `upload-panel.css`, `UploadPanel.tsx` (slot icons
and the footer bar), `GateSummary.tsx`, `DemoArtifacts.tsx`,
`FailurePanel.tsx`, `PreparedFallbackPanel.tsx`, `SourceExcerpt.tsx` markup
only where layout needs a wrapper.

- [ ] **Step 1:** Restyle per the spec's Upload page section.
- [ ] **Step 2:** `bun run test` passes; screenshots of idle, checking,
      result and failure in both themes.
- [ ] **Step 3: Commit** `feat(web): lay out the upload page around the document pair`

### Tasks 9 to 15: Page restyles

One task and one commit per page, each following the spec's Page restyles
section, each ending with `bun run test` and light and dark screenshots at
1440px and 390px:

9.  Batch ingest, plus `BatchBayMap` with a test that it renders one tile per
    item and dims the others under a state filter.
    `feat(web): restyle batch ingest with the batch bay map`
10. Inbox. `feat(web): restyle the inbox on the metric strip and table card`
11. Email detail. `feat(web): restyle the email detail view`
12. Review. `feat(web): restyle the review queue and reconciliation`
13. Control graph. `feat(web): restyle the control graph and assistant dock`
14. Evaluation. `feat(web): restyle the evaluation tables`
15. Settings. `feat(web): restyle settings as Geist settings cards`

### Task 16: Docs and graph

- [ ] Update `docs/design/post-auth-structure.md` for the new route map,
      shell and upload flow; note `/judge` as the public entry in the README.
- [ ] Run `graphify update .` from the repository root.
- [ ] **Commit** `docs: describe the redesigned workspace` and
      `chore(graphify): refresh the knowledge graph`

### Task 17: Verification

- [ ] `bun run test`, `bun run build` and `bun run lint` pass.
- [ ] Every page screenshotted in both themes at 1440px and 390px, including
      the waiting screen and the verdict wash.
- [ ] The taste pre-flight items that apply to product UI hold: no dashes in
      copy, one accent, one radius system, contrast, reduced motion.
