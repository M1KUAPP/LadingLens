# Post-auth structure

Companion to `docs/DESIGN.md`. This file describes every post-auth screen in
implementation terms: the workspace scope and its tokens, the shell, the page
frame, the shared surface recipes, and the upload flow with its waiting
screen. The design decisions behind it are in the
[workspace redesign spec](/docs/superpowers/specs/2026-09-22-workspace-redesign-design.md),
and the source values in
[admincn and Geist](/docs/research/design/admincn-and-geist.md).

Contents:

1.  [Route map](#route-map)
1.  [Workspace scope](#workspace-scope)
1.  [Shell](#shell)
1.  [Page frame](#page-frame)
1.  [Shared surfaces](#shared-surfaces)
1.  [Upload and the waiting screen](#upload-and-the-waiting-screen)
1.  [Motion](#motion)
1.  [Theme](#theme)
1.  [See also](#see-also)

## Route map

Post-auth routes mount under `AppShell` (`src/layout/AppShell.tsx`) behind
`OperatorGuard`, which sends a visitor without a guest session to `/auth`.
The public site shell (`src/layout/SiteShell.tsx`) and the sign-in page are
separate and keep the public tokens.

| Route              | Page                                        | Body                                                                                                                           |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/upload`          | `UploadPage` → `JudgeView`                  | Document pair, waiting screen, result or failure; the demo dataset card                                                        |
| `/inbox`           | `InboxPage`                                 | Accounting strip, intake bay, filter toolbar, table card with pagination                                                       |
| `/emails/:emailId` | `EmailDetailPage` → `EmailDetailView`       | Metadata strip, attachment check, field comparison, evidence                                                                   |
| `/review`          | `ReviewPage` → `ReviewQueueView`            | Metric strip, toolbar, queue table card, item detail with its actions                                                          |
| `/reconciliation`  | `ReconciliationPage` → `ReconciliationView` | Inputs card (ledger, received cases, CSV import, run), then after a run the missing-case card, toolbar and outcomes table card |
| `/graph`           | `GraphPage`                                 | Control trace: one chain per case, filters, tracing of shared values                                                           |
| `/evaluation`      | `EvaluationPage`                            | Metric cards with count lists                                                                                                  |
| `/settings`        | `SettingsPage`                              | Settings cards with footer action bars; `ConfirmDialog` on reset                                                               |

`/ingest` redirects to `/inbox`: batch ingest was folded into the inbox,
which now carries the intake bay. `/review?tab=reconciliation` redirects to
`/reconciliation`, which was a tab on the review page before it had its own.
`/judge` is the public, no-account entry (PRD FR-13). `JudgeEntry` in
`src/routing/routes.tsx` starts a guest session once and redirects to
`/upload`, so the README, the deck's QR code and the smoke check keep working
and a judge lands in the full workspace without a sign-in step.

## Workspace scope

`AppShell` calls `useWorkspaceSurface()` (`src/layout/useWorkspaceSurface.ts`),
which sets `data-surface="workspace"` on `<html>` in a layout effect and
removes it on unmount. Two stylesheets key off that attribute, imported in
`src/main.tsx` after the public tokens:

- `src/styles/workspace/tokens.css` loads Geist Sans and Geist Mono
  (Fontsource, latin subset) and redefines the existing semantic tokens with
  Geist values: surfaces, text, borders, radii (4, 6, 12 and 16px), shadows,
  the type scale and the shell dimensions. It adds `--accent`,
  `--accent-soft`, `--surface-active`, `--radius-xl`, the assistant pill's
  height and inset, and the blueprint grid lines. A dark block sits at higher
  specificity.
- `src/styles/workspace/primitives.css` skins the shared primitives in
  `src/components/ui/` (button, field, checkbox, status pill, drop zone,
  scrollbar, provenance anchor, menu, date picker, tooltip, confirm dialog)
  without touching their base stylesheets, which also dress the sign-in page.

Because the attribute is on `<html>`, overlays portaled to `<body>` resolve
the same tokens. Feature stylesheets keep consuming the same token names and
never contain colour literals; the CSS contract tests enforce that.

## Shell

`.app-shell` is a two-column grid whose first column is `--sidebar-current`:
`--sidebar-width` (256px) expanded, `--sidebar-collapsed` (56px) collapsed.
The document scrolls; the sidebar is sticky at full viewport height.

- **Sidebar.** `aside.app-sidebar#app-sidebar` holds the brand block (mark,
  "LadingLens", "Operator workspace"), `nav[aria-label="Product views"]` with
  three `.app-nav-group`s (Intake: Upload, Inbox; Review: Review queue,
  Reconciliation; Insight: Control graph, Evaluation), and a foot with the
  Settings link and the guest session card. The active link has
  `aria-current="page"`, the active fill and weight 500. An email record has
  no nav entry of its own: it opens from the inbox, so Inbox stays active on
  `/emails/:emailId`.
- **Collapse.** The header's `.app-sidebar-toggle` (`aria-controls`,
  `aria-expanded`) and Cmd or Ctrl plus B toggle `data-sidebar` between
  `expanded` and `collapsed`; `src/layout/sidebar-state.ts` keeps the choice
  in `localStorage` under `ladinglens-sidebar`. Collapsed labels are clipped,
  not removed, so links keep their names, and a hovered or focused link shows
  its label in a tooltip drawn from `data-label`.
- **Header.** `header.app-bar` is sticky; inside it `.app-bar-card` is a
  floating card (12px radius, hairline ring, backdrop blur, with a masked
  blur strip behind it) holding the menu button (below 960px), the sidebar
  toggle (960px and up), the brand (below 960px), the breadcrumb trail
  (`nav[aria-label="Breadcrumb"]`, `/` separators, the current page with
  `aria-current="page"`), and the theme toggle.
- **Drawer.** Below 960px the sidebar leaves and `.app-drawer-root` takes
  over: always mounted, `inert` and `aria-hidden` while closed, opened from
  the menu button, closed by the backdrop, the close button, Escape or a
  route change, with focus returned to the menu button.
- **Content.** `main.app-content#app-content` (the skip link's target) wraps
  `.app-column`, centred at `--content-max` (1440px). Its bottom padding is
  the assistant's lane, so the pill never covers the end of a page.
- **Assistant.** `FloatingAssistant` (`src/features/graph-chat/`) floats at
  the bottom right of every workspace page: a pill that unfolds into the
  chat panel over the same corner, with focus moving into the composer and
  back to the pill; Escape or the fold button folds it. It mounts once above
  the workspace routes, under `GraphAssistantProvider`, so the conversation,
  the answer subgraph and the highlight survive page changes and the
  `/graph` canvas draws them. A citation pressed off `/graph` opens it.

## Page frame

Every page is `div.page > PageHead + sections`, a flex column with a 24px
gap. `PageHead` (`src/components/ui/PageHead.tsx`) renders `header.page-head`:
a ringed 44px `.page-head-icon` with the page's nav glyph, the title row
(`h1.page-head-title`, the optional `.page-head-tag` data tag and the hint
`Tooltip`), `.page-head-supporting`, and an optional `.page-head-aside` for a
status or action. Space, not a rule, sets it off from the page body.

## Shared surfaces

The workspace pages share a small set of recipes, all from tokens:

- **Card.** Raised surface, 12px radius (16px for large panels), edge drawn
  as `0 0 0 1px var(--border-default)` plus `--elevation-sm`, never a CSS
  border.
- **Table card.** One card holding the table and its pagination bar. Header
  cells are sentence case, 13px weight 500 in secondary text on the canvas
  colour; rows are separated by hairlines and take the hover fill; IDs and
  codes are Geist Mono. The inbox, the review queue and the reconciliation
  outcomes share the bar (`src/components/ui/Pagination.tsx`): 50 rows a
  page, the range on the left, Previous and Next on the right.
- **Toolbar.** Above each of those table cards: search by ID and the page's
  filters on the left, sort and density on the right. The inbox filters by
  category and status, the review queue by reason or outcome and custody,
  and reconciliation by outcome and freshness. A search, filter or sort
  change returns to the first page.
- **Row links.** An inbox row, and a held case's row in the review queue,
  opens its email from anywhere on the row (`src/lib/use-row-link.ts`). The
  ID link stays the keyboard and screen reader target; controls in the row
  keep their own action. A review row leads with its email or shipment, not
  an internal ID: a held case says why it is held, and an exception names
  the emails it links or the side that is missing.
- **Metric strip.** Cells with a 13px label over a 28px tabular value.
- **Chips.** 22px pills on the sunken surface for codes and categories; held
  chips use the held tokens.
- **Errors.** Neutral text and border tokens, never the mismatch orange:
  errors are not verdicts.
- **Intake bay.** `InboxBay` (`src/pages/InboxBay.tsx`) draws one tile per
  email in ID order, coloured like the status pills (OK in ink, MISMATCH in
  the mismatch orange, NEEDS_REVIEW in the held indigo), with a counted
  legend and the held-emails link to the review queue. Emails the table's
  filters leave out are dimmed. It is one `role="img"` with a count summary;
  the per-email detail stays in the table.

## Upload and the waiting screen

`JudgeView` (`src/features/judge/`) runs the live check with the phases
`loading`, `idle`, `checking`, `settling`, `result` and `failed`:

- **Idle.** `.judge-view[data-layout='split']` puts the documents card
  (`UploadPanel`: one drop zone, the chosen files, and a footer bar with the
  synthetic confirmation and "Check documents") beside the side column:
  `DemoDataset`, one card with the gate counts and the submission download.
  The pair is dropped in either order and sent unlabelled as `files`; the
  pipeline reads each document to decide which is the SI and which the draft
  BL, and the result names each file by the role it was given. The
  synthetic-data note sits above both.
- **Batch.** A `.json` in the drop (`src/features/judge/batch.ts`) swaps the
  documents card for `BatchPanel`: dataset email records or pairs, with their
  documents embedded as `text` or `content_base64` or dropped alongside and
  matched by name. Each entry says whether it can be checked; up to 20 run,
  one at a time (`batch-run.ts`), each through the same upload. A finished
  row opens its result, which offers "Back to batch".
- **Checking.** `CheckWaiting` replaces the pair; `UploadPanel` stays mounted
  with `hidden`, so a rejected upload returns with its files chosen. The
  waiting screen follows the wireframe: a status card (headline, both files,
  elapsed seconds, the typical-duration note) and the three step cards on the
  left, and the bay on the right: an 11 by 10 grid whose first tile shows the
  estimated percentage and whose other 109 tiles fill in a diagonal sweep.
- **Estimate.** `src/features/judge/waiting-progress.ts` holds the model:
  `0.95 × (1 − e^(−t / 12 s))`, stage changes at 8% and 72%, tile ranks and
  fills. It never reaches 100% before the server answers, and the screen says
  the progress is estimated from typical run times.
- **Settling.** When the run returns, the bay completes and washes into the
  verdict colour (teal, indigo or orange, neutral for a failure) for 900ms
  before the result replaces it; `settleMs` sets the hold and reduced motion
  skips it.
- **Result and failure.** A verdict card with the outcome pill and
  headline, the checked documents, `ComparisonGrid`, `EvidenceViewer` and
  `SourceExcerpt`; or `FailurePanel`, the retry, and the labelled
  `PreparedFallbackPanel`.

## Motion

Keyframes live in `src/styles/base.css`, plus `check-pulse` in the waiting
screen's stylesheet. Every duration routes through `--duration-fast`,
`--duration-base` or `--duration-slow`, which `prefers-reduced-motion`
zeroes, and the bay's sweep staggers on `--stagger`, which it also zeroes.
Motion marks state: the sidebar width, tile fills and the verdict wash, the
status dot while a step is active, and hover and press feedback.

## Theme

The shell reads and writes `data-theme` through `src/lib/theme.ts`
(`readTheme` and `toggleTheme`, persisted to `localStorage`) and swaps its
brand mark between `/brand/mark-colour.svg` and `/brand/mark-dark.svg`. The
workspace tokens define both themes, with a `prefers-color-scheme` fallback
when no theme is stored.

## See also

- [Design](/docs/DESIGN.md)
- [Workspace redesign spec](/docs/superpowers/specs/2026-09-22-workspace-redesign-design.md)
- [admincn and Geist](/docs/research/design/admincn-and-geist.md)
