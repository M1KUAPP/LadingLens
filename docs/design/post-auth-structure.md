# Post-auth structure

Companion to `docs/DESIGN.md`. This file describes the structure of every
post-auth screen — the shell chrome, the page frame, shared tables, and the
shared display components they compose — in implementation terms.

Post-auth routes mount under `AppShell` (`src/layout/AppShell.tsx`), the single
shared chrome for the guest workspace (`/inbox`, `/emails/:emailId`, `/review`,
`/graph`, `/evaluation`, `/settings`). The public site shell
(`src/layout/SiteShell.tsx`) and its footer are separate and do not appear
here. All class names below live in `src/layout/app-shell.css`,
`src/components/ui/`, or the page/feature stylesheet noted; stylesheets are
co-located with their component.

## Route map

| Route | Page | Page frame | Body sections |
|---|---|---|---|
| `/inbox` | `InboxPage` | `PageHead` (card) + `span#end-of-results` | `.inbox-toolbar` (search + `Select` channel filter); `.table-card` state view (`.inbox-skeleton`, `.inbox-empty`, or `.table-scroll > table.data-table` + `.inbox-pagination`); `.table-card.table-card--danger` raw preview; `.footnote-row` |
| `/emails/:emailId` | `EmailDetailPage` → `EmailDetailView` | `PageHead` (card, `aside` = `StatusPill`) | `.email-detail-metadata-grid`; `.email-detail-grid`: `.email-summary` card (subject, sender, `AttachmentPreflightList`, `.email-actions` = `a.button` + `Button`), `.panel` document extraction + comparison, `.email-refusal` banner when refused |
| `/review` | `ReviewPage` | `PageHead` (card, `hint` on "Review views") | `.tab-bar` → `ReviewQueueView` (`.review-grid` of `.review-case` cards + `.review-empty` in `.table-card`) or `ReconciliationView` (`.recon-toolbar` + `.table-card` state view + `.table-card.table-card--danger` preview + `.footnote-row`) |
| `/graph` | `GraphPage` | `PageHead` (card) | `ControlGraphView`: `.graph-card > .graph-svg`, `.graph-legend`, `.graph-key` |
| `/evaluation` | `EvaluationPage` | `PageHead` (card) | `.table-card` state view (`.eval-skeleton`, `.eval-empty`, or three tables + `.table-note`) |
| `/settings` | `SettingsPage` | `PageHead` (card, `hint`) | `.settings-grid` (`.settings-card` ×2); `ConfirmDialog` on reset |

`PageHead (card)` means the hero variant: a gradient card carrying an icon
tile, the title, a supporting line, an optional tag + `i`-tooltip, and an
optional `aside` slot for a status or action.

## Chrome and navigation

The shell pins its chrome to the viewport; the document scrolls and the
content region sits clear of the chrome through padding:

- **Navigation rail (desktop).** `.app-sidebar`, fixed left full-height at
  `z-index` 60, collapsed to `--sidebar-collapsed` (64px, icon-only) by
  default. On `:hover` and `:focus-within` it widens to `--sidebar-width`
  (200px) and floats over the content while `.app-scrim` fades in behind it —
  a blur-tinted overlay that also intercepts clicks so the rail collapses on
  the next pointer or focus change. Labels, the section caption, and the
  brand wordmark fade in with the same width/opacity transition; icon slots
  are fixed-width so glyphs never move. The active route keeps a tinted
  surface plus an inset left rail — `aria-current` plus two visual cues (fill
  and rail), not colour alone. Below 960px the rail is gone entirely and the
  drawer takes over.
- **Topbar.** `.app-bar`, fixed across the top at `z-index` 50, offset from
  the left by the collapsed rail width so it reads as one strip with the
  rail's head cell. It holds the menu button (below 960px only), the brand
  link (below 960px only — the rail head owns the brand on desktop), the
  breadcrumb trail, and the right-side action cluster: the "Open live demo"
  link to `/judge` and the theme toggle. The bar is a glass surface —
  `--glass-bg` under `backdrop-filter: blur(--glass-blur)
  saturate(--glass-saturate)` — so scrolling content reads faintly through
  it. Below 640px only the last crumb stays; below 480px the demo link
  collapses to its icon with an `aria-label`.
- **Mobile drawer.** `.app-drawer-root` stays mounted so the panel can slide
  both ways; while closed it is `inert`, `aria-hidden`, visibility-hidden and
  pointer-events-none. It opens from the menu button and closes on the
  `.app-drawer-backdrop`, the close button, `Escape`, or any route change,
  returning focus to the menu button. It holds the same `ProductNavList`
  (labels always visible) plus a Settings link and brand.
- **Content layer.** `.app-content` is the in-flow region under the fixed
  chrome — padded top by `--topbar-height` + rhythm and left by
  `--sidebar-collapsed` + gutter, so the document scrolls content
  independently of the chrome. `.app-column` centers the page at
  `--content-max` (75rem) with token padding; below 960px the rail offset and
  scrim disappear and the padding tightens.
- **Skip link.** `.app-skip` jumps to `#app-content`.
- **Breadcrumbs.** Rendered inside `.app-bar` as
  `nav[aria-label="Breadcrumb"]` > `ol` of `.app-crumb-link`s + the current
  page as `.app-crumb-current` with `aria-current="page"`, separated by `›`.

`AppShell.tsx` also holds `ProductNavList`, `SettingsLink`, `ThemeToggle`, and
the `ViewDef` icon map. The route map lives in `src/routing/routes.tsx`.

## Page frame

Every post-auth page is `div.page > PageHead + sections`; `.page` is a flex
column with `gap: var(--spacing-5)`:

```html
<div class="page">
  <header class="page-hero">          <!-- PageHead card -->
    <span class="page-hero-orb page-hero-orb--primary" aria-hidden="true"></span>
    <span class="page-hero-orb page-hero-orb--accent" aria-hidden="true"></span>
    <div class="page-hero-body">
      <span class="page-hero-icon"><svg /></span>
      <div class="page-hero-main">
        <div class="page-head-main">
          <h1 class="page-head-title">…</h1>
          <span class="page-head-tag">…</span>   <!-- optional -->
          <button class="tooltip-icon">i</button> <!-- optional hint -->
        </div>
        <p class="page-hero-supporting">…</p>
      </div>
      <div class="page-hero-aside">…</div>       <!-- optional action/status -->
    </div>
  </header>
  <!-- sections -->
</div>
```

The hero enters with `fade-in-up` at `--duration-base`; its two accent orbs
sit under `blur(--orb-blur)` and the accent orb breathes with `glow-pulse` at
nine times the slow duration. A plain `header.page-head` remains for frames
that need the bare heading; both variants support `tag` (a `.page-head-tag`)
and `hint`/`hintLabel` (an `i`-icon `Tooltip` opening on hover, focus, and
touch).

## Shared surfaces

- **Card.** `.table-card` = raised surface, 1px `--border-default`,
  `--radius-lg`, `padding: --spacing-6`. The same card recipe appears wherever
  a bordered raised panel is needed (`.email-summary`, `.panel`,
  `.settings-card`, `.review-case`, `.graph-card` …).
- **Table.** `table.data-table` inside `.table-scroll` (the only horizontal
  overflow container). `th` uses `--type-label` uppercase; `td` uses
  `--type-body-sm`; `.col-num` is right-aligned and every `font:`-shorthand
  rule on numeric cells restates `font-variant-numeric: tabular-nums`. Data
  columns use `.cell-id`, `.cell-date`, `.cell-count` (`--type-data-*`).
- **Table state views.** Loading renders row-shaped `.…-skeleton` bars
  shimmering with the `shimmer` keyframe and `aria-hidden`; every loading block
  also carries a visible text status (e.g. "Loading inbox…") so the state is
  never conveyed by motion alone. Empty/error views are `.…-empty` blocks with
  a `role="alert"` headline, a body line, and one primary action.
- **Pagination.** `.inbox-pagination` = prev/next `Button variant="ghost"` +
  "Page X of Y" + `span#end-of-results` anchor for the keyboard "Jump past
  results" link in the toolbar.

## Component inventory

Structure components used across post-auth pages (all in
`src/components/ui/` unless noted):

| Class / element | Defined in | Used for |
|---|---|---|
| `.app-shell`, `.app-bar`, `.app-sidebar`, `.app-content`, `.app-column` | `layout/app-shell.css` | Fixed chrome and content column |
| `.app-nav-*`, `.app-sidebar-*`, `.app-scrim` | `layout/app-shell.css` | Rail items, brand cell, expanded-rail overlay |
| `.app-drawer-*` | `layout/app-shell.css` | Mobile drawer and its backdrop |
| `.app-crumbs`, `.app-crumb-*`, `.app-demo-link`, `.app-theme-toggle`, `.app-menu-button` | `layout/app-shell.css` | Topbar breadcrumb and actions |
| `.app-skip` | `layout/app-shell.css` | "Skip to content" |
| `.page`, `.page-hero*`, `.page-head*` | `components/ui/page-frame.css` | Page frame and hero card |
| `.table-card`, `.table-scroll`, `.data-table`, `.table-note`, `.footnote-row` | `components/ui/table.css` | Tables and notes |
| `.tag` | `components/ui/tags.css` | "Prepared data"/"Prepared record" markers |
| `.button` + variants | `components/ui/controls.css` | Buttons (`Button` or `a.button`) |
| `.menu`, `.menu-item`, `.menu-sep` | `components/ui/overlays.css` | `Menu` dropdown — `scale-in` entrance |
| `.tooltip-panel`, `.tooltip-icon` | `components/ui/overlays.css` | `Tooltip` — `fade-in` entrance |
| `.dialog-*` | `components/ui/overlays.css` | `ConfirmDialog` |
| `.status-pill`, `.status-dot` | `components/ui/domain.css` | `StatusPill` |
| `.field-*`, `.select`, `.search-input` | `components/ui/controls.css` | `Field`, `Select`, search inputs |
| `.inbox-*`, `.email-*`, `.review-*`, `.recon-*`, `.graph-*`, `.eval-*`, `.settings-*` | page/feature CSS | Per-route bodies |

Post-auth pages also render their own in-page footers where content warrants
one — `.footnote-row`, `.table-note`, `.graph-legend`/`.graph-key`. There is no
site footer on any post-auth route.

## z-index and layering

`.app-bar` 50 · expanded-rail `.app-scrim` 55 · `.app-sidebar` 60 ·
`.app-drawer-root` 70 · `.app-skip` 80 · `.tooltip-panel` 10 ·
`.date-picker`/`.dialog-overlay` per `overlays.css`.

## Post-auth HTML skeleton

```html
<div class="app-shell">
  <a class="app-skip" href="#app-content">Skip to content</a>
  <header class="app-bar">menu · brand · breadcrumbs · actions</header>
  <aside class="app-sidebar">brand · nav · settings · collapse cue</aside>
  <div class="app-scrim" aria-hidden="true"></div>
  <main class="app-content" id="app-content" tabindex="-1">
    <div class="app-column">
      <div class="page">
        <header class="page-hero">…</header>
        <!-- page sections -->
      </div>
    </div>
  </main>
  <div class="app-drawer-root" data-open="…">
    <div class="app-drawer-backdrop"></div>
    <div class="app-drawer" id="app-nav-drawer">…</div>
  </div>
</div>
```

## Motion

Entrance and ambient keyframes are defined once in `src/styles/base.css` —
`fade-in`, `fade-in-up`, `fade-in-down`, `slide-in-left`, `slide-in-right`,
`scale-in`, `glow-pulse`, `shimmer` — and every duration routes through
`--duration-fast` / `--duration-base` / `--duration-slow` (or a `calc()`
multiple). `tokens.css` zeroes all three under
`prefers-reduced-motion: reduce`, so every animation and transition in the
shell lands instantly; the drawer and rail stay functional because their state
is DOM (`data-open`, `:hover`/`:focus-within`), not a pending animation.

## Theme

The shell reads and writes `data-theme` through `src/lib/theme.ts`
(`readTheme`/`toggleTheme`, persisted to `localStorage`), and swaps its brand
mark between `/brand/mark-colour.svg` and `/brand/mark-dark.svg` to match.
Both themes resolve from the same tokens — see `docs/DESIGN.md` for the token
table.
