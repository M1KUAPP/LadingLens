# AlaskanTuna UX Shell And Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver issue #34's reusable LadingLens frontend foundation and a
Perch-structured LadingLens landing page that later AlaskanTuna screens can
consume without reshaping.

**Architecture:** Keep the React and Vite client small: React Router owns the
route boundary, a token-first CSS layer owns visual decisions, and focused
in-house components own browser interaction contracts. The public landing
route is a shell-free, one-viewport film composition; authenticated product
routes share the application shell and render honest placeholders until their
own issues land.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Bun, React Router, Vitest,
Testing Library, CSS custom properties, bundled Fontsource WOFF2 assets.

**Spec:** `docs/DESIGN.md`, GitHub issue #34, and the user's Perch v2 landing
reference.

## Global Constraints

- Use `LadingLens` as the product name and `Averis` as the project/team name.
- Every `docs/DESIGN.md` colour, spacing, radius, elevation, motion, and focus
  token must be a CSS custom property; components may not hardcode hex values.
- Archivo and Martian Mono must ship as local bundled WOFF2 with
  `font-display: swap`; no runtime font CDN.
- The OS preference provides the first theme and the manual choice persists in
  local storage by stamping `data-theme` on the root element.
- The landing page copies Perch's layout grammar, not its palette, type, copy,
  icons, or travel-specific decoration.
- The hero video is optional until the user supplies it. The media contract is
  `/media/ladinglens-port-loop.webm`, `/media/ladinglens-port-loop.mp4`, and
  `/media/ladinglens-port-poster.webp`.
- Reduced-motion users receive only the poster and never fetch the hero video.
- Normal interface copy uses shipping language, never implementation jargon.
- Critical warnings and actions remain visible; secondary explanation belongs
  in the accessible Tooltip component.
- No visible em dash or en dash may ship.
- Use test-first red, green, refactor cycles for behavior.

---

### Task 1: Install the route, font, icon, and test foundations

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/bun.lock`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.app.json`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/render.tsx`

**Interfaces:**

- Produces: `bun run test`, jsdom, `renderAt(path, element)`, and the packages
  used by every later task.

- [ ] **Step 1: Add the dependencies**

Run:

```bash
bun add react-router-dom @hugeicons/react @hugeicons/core-free-icons \
  @fontsource-variable/archivo @fontsource-variable/martian-mono
bun add -d vitest jsdom @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Add the test command and environment**

Add `"test": "vitest run"` to scripts and this Vite test configuration:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  css: true
}
```

`setup.ts` must import `@testing-library/jest-dom/vitest` and clear local
storage after every test.

- [ ] **Step 3: Verify the harness**

Run: `bun run test`

Expected: exit 0 with no test files yet.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/bun.lock apps/web/vite.config.ts \
  apps/web/tsconfig.app.json apps/web/src/test
git commit -m "test(web): add frontend test harness"
```

### Task 2: Implement tokens, typography, and theme persistence

**Files:**

- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/base.css`
- Create: `apps/web/src/lib/theme.ts`
- Create: `apps/web/src/lib/theme.test.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/index.html`

**Interfaces:**

- Produces: `type Theme = 'light' | 'dark'`, `readTheme(): Theme`,
  `applyTheme(theme: Theme): void`, and `toggleTheme(theme: Theme): Theme`.

- [ ] **Step 1: Write the failing theme behavior tests**

```ts
it('uses the OS preference until a manual choice exists', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
  expect(readTheme()).toBe('dark')
})

it('persists and stamps a manual theme', () => {
  applyTheme('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('ladinglens-theme')).toBe('light')
})
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

Run: `bun run test src/lib/theme.test.ts`

Expected: FAIL because `theme.ts` does not exist.

- [ ] **Step 3: Implement the theme module and design tokens**

Implement the three exported theme functions. Define every table value from
`docs/DESIGN.md`, including the full light and dark semantic colour sets,
spacing `0-11`, radii, elevations, focus ring, four motion variables, and all
thirteen type roles. Import only the Latin Fontsource variable CSS entrypoints,
then expose Archivo and Martian Mono through `--font-ui` and `--font-data`.

- [ ] **Step 4: Seed the theme before React paints**

Set the document title to `LadingLens` and place a small inline theme seed in
`index.html` that reads only `ladinglens-theme` and `prefers-color-scheme`.
`main.tsx` imports `tokens.css` then `base.css`.

- [ ] **Step 5: Verify red became green**

Run: `bun run test src/lib/theme.test.ts && bun run build`

Expected: both commands exit 0 and the build emits local WOFF2 assets.

- [ ] **Step 6: Commit**

```bash
git add apps/web/index.html apps/web/src/main.tsx apps/web/src/styles \
  apps/web/src/lib/theme.ts apps/web/src/lib/theme.test.ts
git commit -m "feat(web): add LadingLens tokens and theme"
```

### Task 3: Build the in-house component contracts

**Files:**

- Create: `apps/web/src/components/ui/types.ts`
- Create: `apps/web/src/components/ui/Icons.tsx`
- Create: `apps/web/src/components/ui/Controls.tsx`
- Create: `apps/web/src/components/ui/Overlays.tsx`
- Create: `apps/web/src/components/ui/Domain.tsx`
- Create: `apps/web/src/components/ui/ui.css`
- Create: `apps/web/src/components/ui/ui.test.tsx`

**Interfaces:**

- Produces: `Button`, `Field`, `Checkbox`, `Menu`, `MenuItem`, `DatePicker`,
  `Tooltip`, `StatusPill`, `Scrollbar`, `DropZone`, `FieldRow`, and
  `ProvenanceAnchor`.
- `StatusKind` is `'match' | 'mismatch' | 'held' | 'neutral'`.
- `ProvenanceKind` is `'exact' | 'approximate' | 'none'`.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('opens explanatory tooltips from keyboard focus', async () => {
  const user = userEvent.setup()
  render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
  await user.tab()
  expect(screen.getByRole('tooltip')).toBeVisible()
})

it('carries a held status with text and the pause glyph', () => {
  render(<StatusPill status="held">Needs review</StatusPill>)
  expect(screen.getByText('Needs review')).toHaveAttribute('data-status', 'held')
  expect(screen.getByLabelText('Held')).toBeInTheDocument()
})

it('stacks field values without losing source labels', () => {
  render(<FieldRow label="Gross weight" left="1200" right="1250" status="mismatch" />)
  expect(screen.getByText('Shipping instruction')).toBeInTheDocument()
  expect(screen.getByText('Draft bill of lading')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and observe missing component failures**

Run: `bun run test src/components/ui/ui.test.tsx`

Expected: FAIL because the UI modules do not exist.

- [ ] **Step 3: Implement the controls**

Use visible custom shells with typed props. Menu supports ArrowUp, ArrowDown,
Enter, and Escape. DatePicker uses a semantic grid of buttons and supports
arrow keys, PageUp, PageDown, Enter, and Escape. Checkbox uses
`role="checkbox"`. DropZone owns a hidden file input but exposes a custom focus
target and inline rejection text. Tooltip opens on hover, focus, and touch.

- [ ] **Step 4: Implement the domain components**

Map status to all three required channels: token colour, in-house verdict
glyph, and the FieldRow left rail. `data/*` roles wrap identifiers and figures.
ProvenanceAnchor labels approximate evidence explicitly and disables the none
state without fabricating a location.

- [ ] **Step 5: Verify interactions and accessibility contracts**

Run: `bun run test src/components/ui/ui.test.tsx && bun run lint`

Expected: all tests pass and lint exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui
git commit -m "feat(web): add in-house UI components"
```

### Task 4: Implement the application shell and complete route map

**Files:**

- Create: `apps/web/src/routing/routes.tsx`
- Create: `apps/web/src/routing/routes.test.tsx`
- Create: `apps/web/src/layout/AppShell.tsx`
- Create: `apps/web/src/layout/app-shell.css`
- Create: `apps/web/src/pages/PlaceholderView.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**

- Produces routes `/`, `/auth`, `/inbox`, `/emails/:emailId`, `/review`,
  `/graph`, `/evaluation`, `/settings`, and `/judge`.
- `AppShell` accepts `{ title: string; children: ReactNode }`.

- [ ] **Step 1: Write failing route-boundary tests**

```tsx
it.each([
  ['/inbox', 'Inbox'],
  ['/emails/email_001', 'Email detail'],
  ['/review', 'Review queue'],
  ['/graph', 'Control graph'],
  ['/evaluation', 'Evaluation'],
  ['/settings', 'Settings']
])('renders the product shell at %s', (path, title) => {
  renderAt(path, <App />)
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
})

it('keeps the public judge route outside the operator guard', () => {
  renderAt('/judge', <App />)
  expect(screen.getByRole('heading', { name: 'Judge workspace' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and observe route failures**

Run: `bun run test src/routing/routes.test.tsx`

Expected: FAIL because the route table and shell are absent.

- [ ] **Step 3: Implement routes and the 12-column shell**

Use `BrowserRouter` in production and `MemoryRouter` only in tests. The app bar
shows the LadingLens lockup, current view, theme toggle, and no consequential
action. Desktop navigation occupies three grid columns, content nine; below
960px navigation becomes a single-line horizontal strip and content spans all
columns. Placeholder pages say what their owning issue will provide without
inventing product data.

- [ ] **Step 4: Verify routes and the build**

Run: `bun run test src/routing/routes.test.tsx && bun run build`

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/index.css apps/web/src/layout \
  apps/web/src/pages/PlaceholderView.tsx apps/web/src/routing
git commit -m "feat(web): add application shell and routes"
```

### Task 5: Adapt the Perch landing structure to LadingLens

**Files:**

- Create: `apps/web/src/components/HeroFilm.tsx`
- Create: `apps/web/src/components/hero-film.css`
- Create: `apps/web/src/pages/LandingPage.tsx`
- Create: `apps/web/src/pages/landing-page.css`
- Create: `apps/web/src/pages/LandingPage.test.tsx`
- Create: `apps/web/public/media/README.md`
- Copy: `docs/brand/mark-colour.svg` to `apps/web/public/brand/mark-colour.svg`
- Copy: `docs/brand/mark-dark.svg` to `apps/web/public/brand/mark-dark.svg`
- Copy: `docs/brand/lockup-colour.svg` to
  `apps/web/public/brand/lockup-colour.svg`
- Copy: `docs/brand/lockup-dark.svg` to
  `apps/web/public/brand/lockup-dark.svg`

**Interfaces:**

- Produces: `HeroFilm({ reducedMotion }: { reducedMotion: boolean })` and the
  public landing route at `/`.

- [ ] **Step 1: Write failing landing behavior tests**

```tsx
it('presents the two controls and the human authority boundary', () => {
  renderAt('/', <App />)
  expect(screen.getByRole('heading', { name: 'Account for every shipping document.' })).toBeInTheDocument()
  expect(screen.getByText('Gate 1')).toBeInTheDocument()
  expect(screen.getByText('Gate 2')).toBeInTheDocument()
  expect(screen.getByText('Human authority')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Open live demo' })).toHaveAttribute('href', '/judge')
})

it('does not render video for reduced-motion users', () => {
  render(<HeroFilm reducedMotion />)
  expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: '' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests and observe landing failures**

Run: `bun run test src/pages/LandingPage.test.tsx`

Expected: FAIL because the landing and film modules are absent.

- [ ] **Step 3: Implement the film-as-ground component**

Render WebM then MP4 sources with `muted`, `playsInline`, `loop`, and the named
poster. Add a visible play/pause control for WCAG 2.2.2. If reduced motion is
true, return the poster image before creating any video element. The CSS may
animate only opacity.

- [ ] **Step 4: Implement the one-viewport landing composition**

Preserve Perch's hierarchy: absolute film and directional token-derived veil;
single-line top row with brand, theme, pause, and `Open live demo`; centered
eyebrow and display line; three semantic `dl` facts pinned low on desktop; thin
bottom band. Use the exact headline `Account for every shipping document.`.
The facts are `Gate 1`, `Gate 2`, and `Human authority`. On mobile, stack the
facts compactly instead of deleting them. Use `min-height: 100dvh`, never
`h-screen`.

- [ ] **Step 5: Document the media handoff**

`public/media/README.md` names the three required filenames, the approved video
prompt, the `ffmpeg` WebM/MP4/poster commands, muted playback, and the rule that
raw generator downloads are not committed.

- [ ] **Step 6: Verify tests, responsive CSS, and build**

Run:

```bash
bun run test src/pages/LandingPage.test.tsx
bun run lint
bun run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/public apps/web/src/components/HeroFilm.tsx \
  apps/web/src/components/hero-film.css apps/web/src/pages
git commit -m "feat(web): add LadingLens landing page"
```

### Task 6: Run the acceptance, performance, and regression pass

**Files:**

- Modify only files required by verified failures from this task.

**Interfaces:**

- Consumes: all prior task outputs.
- Produces: verified issue #34 foundation ready for issues #35-#38.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
bun run test
bun run lint
bun run build
```

Expected: all exit 0 with no warning attributable to project code.

- [ ] **Step 2: Run React Doctor**

Run: `npx react-doctor@latest --verbose --diff`

Expected: no new errors and no score regression.

- [ ] **Step 3: Run the design pre-flight mechanically**

Check: zero visible em/en dashes; no component hex values; every route renders;
all CTA text stays on one line; theme works in both modes; 1920x1080, 1440x900,
and 390x844 layouts have no overflow; reduced motion renders no video; keyboard
focus reaches every control; and the hero stays within the initial viewport.

- [ ] **Step 4: Refresh the knowledge graph**

Run: `graphify update .`

Expected: update completes and graph health reports no new corruption warning.

- [ ] **Step 5: Request code review and fix Critical or Important findings**

Give the reviewer issue #34, this plan, the Perch structural brief, and the
branch diff. Re-run every command in Step 1 after fixes.

- [ ] **Step 6: Commit verified fixes**

```bash
git add apps/web graphify-out docs/superpowers/plans/2026-09-20-alaskantuna-ux-shell-and-landing.md
git commit -m "fix(web): complete UX shell acceptance pass"
```

## Final integration checklist

- [ ] Issue #34 acceptance criteria are traceable to code or a named test.
- [ ] `/` matches Perch's format and layout grammar using LadingLens tokens.
- [ ] `/judge` is public and shell-free; operator routes share `AppShell`.
- [ ] No issue #35-#38 product logic or fabricated data has leaked into #34.
- [ ] The three hero media filenames are ready for the user's generated clip.
- [ ] Tests, lint, build, React Doctor, and Graphify update are fresh.
