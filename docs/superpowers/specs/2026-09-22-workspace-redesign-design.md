# Workspace Redesign Design

The post-auth workspace (`/ingest`, `/inbox`, `/emails/:emailId`, `/review`,
`/graph`, `/evaluation`, `/settings`) is rebuilt on the Geist design language
and the admincn shell, the public `/judge` page becomes the workspace's
**Upload** page, and a live check now waits on a full waiting screen instead
of a one-line counter. The research behind every value is in
[admincn and Geist](/docs/research/design/admincn-and-geist.md).

Contents:

1.  [Design read](#design-read)
1.  [Decisions](#decisions)
1.  [Scope and isolation](#scope-and-isolation)
1.  [Tokens](#tokens)
1.  [Shell](#shell)
1.  [Page header](#page-header)
1.  [Shared primitives](#shared-primitives)
1.  [Upload page](#upload-page)
1.  [Waiting screen](#waiting-screen)
1.  [Page restyles](#page-restyles)
1.  [Motion](#motion)
1.  [Accessibility](#accessibility)
1.  [Testing](#testing)
1.  [Out of scope](#out-of-scope)
1.  [See also](#see-also)

## Design read

Reading this as: an operator workspace for a document-accountability tool,
used by hackathon judges and operations reviewers, with a Geist-precise
monochrome language, leaning toward native CSS tokens with Geist values, the
admincn sidebar and header, and one signature motif: the **bay**, a grid of
rounded tiles like the slots of a container bay plan.

Dials: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 5`, `VISUAL_DENSITY 6`. This is
product UI, not a landing page, so the taste skill's landing rules apply only
where they fit: no em dashes in visible copy, one accent, one radius system,
honest numbers, motion with a reason, both themes.

## Decisions

| Question         | Decision                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Scope mechanism  | `data-surface="workspace"` on `<html>` while `AppShell` is mounted; every workspace rule keys off it          |
| Typefaces        | Geist Sans for UI text, Geist Mono for data, self-hosted from Fontsource; public pages keep Archivo           |
| Neutrals         | Geist gray and gray-alpha steps; dark pages are `#0a0a0a`, not pure black                                     |
| Primary action   | Monochrome (gray-1000 fill), as Geist does; indigo is reserved for focus, links and in-progress state         |
| Status palette   | Unchanged in meaning: match teal, held indigo, mismatch orange, as `docs/DESIGN.md` binds                     |
| Radii            | 4px chips, 6px controls, 12px cards, 16px large panels, full pills                                            |
| Edges            | 1px hairlines at gray-alpha-400 (8% ink); elevation only on menus, dialogs and the header                     |
| `/judge`         | A public entry that starts a guest session and redirects to `/upload`, so FR-13 stays true without a sign-in  |
| Upload page      | `/upload`, first item in the nav, hosting the whole live check                                                |
| Waiting screen   | Wireframe layout: status card and three stage cards left, an 11 by 10 bay right, percentage in the first tile |
| Progress honesty | Progress and stages are estimated from the run-time benchmark and labelled as estimates                       |

## Scope and isolation

The unmerged `feat/landing-auth-redesign` branch rebuilds the landing and
sign-in pages and edits `src/styles/tokens.css` and `docs/DESIGN.md`. This
redesign therefore leaves both files and every public page alone:

- `AppShell` sets `document.documentElement.dataset.surface = 'workspace'`
  in a layout effect and removes it on unmount. Portaled overlays (tooltips,
  menus, dialogs) live under `<html>`, so they pick up the scope too.
- `src/styles/workspace/tokens.css` redefines the existing semantic tokens
  (`--surface-*`, `--text-*`, `--border-*`, `--type-*`, `--radius-*`,
  `--font-*`, shell dimensions) under `:root[data-surface='workspace']`, with
  a dark block at higher specificity. Feature stylesheets keep consuming the
  same token names, so they follow automatically.
- `src/styles/workspace/primitives.css` restyles the shared primitives
  (`Button`, `Field`, `Checkbox`, `StatusPill`, `DropZone`, `Scrollbar`,
  `Tooltip`, `Menu`, `Select`, `ConfirmDialog`) under the same scope, so the
  sign-in page's controls do not change.

## Tokens

All values are Geist's unless marked. Light first, dark second.

| Token              | Light                 | Dark                        | Geist source             |
| ------------------ | --------------------- | --------------------------- | ------------------------ |
| `--surface-canvas` | `#fafafa`             | `#0a0a0a`                   | background-200 (dark: *) |
| `--surface-raised` | `#ffffff`             | `#111111`                   | background-100 (dark: *) |
| `--surface-sunken` | `#f2f2f2`             | `#1a1a1a`                   | gray-100                 |
| `--surface-hover`  | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.07)` | gray-alpha-100           |
| `--surface-active` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.1)`  | gray-alpha-300           |
| `--border-default` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.14)` | gray-alpha-400           |
| `--border-strong`  | `rgba(0, 0, 0, 0.21)` | `rgba(255, 255, 255, 0.24)` | gray-alpha-500           |
| `--text-primary`   | `#171717`             | `#ededed`                   | gray-1000                |
| `--text-secondary` | `#4d4d4d`             | `#a1a1a1`                   | gray-900                 |
| `--text-tertiary`  | `#666666`             | `#8f8f8f`                   | * (AA on both surfaces)  |
| `--brand-primary`  | `#171717`             | `#ededed`                   | gray-1000                |
| `--accent`         | `#4f46e5`             | `#818cf8`                   | * brand indigo           |
| `--border-focus`   | `#4f46e5`             | `#818cf8`                   | * brand indigo           |

`*` marks a deliberate departure: dark pages sit on `#0a0a0a` and `#111111`
rather than Geist's pure black, tertiary text is `#666666` so it clears 4.5:1
on white and `#fafafa`, and the accent stays the LadingLens indigo that the
brand mark and the held state already use.

The state tokens (`--state-match-*`, `--state-held-*`, `--state-mismatch-*`,
`--state-neutral-*`) keep their light values, which `docs/DESIGN.md` measured
for contrast. Their dark values move off the old slate surfaces onto the
neutral ones.

Type follows Geist's scale, set in Geist Sans:

| Token               | Value           | Geist class          |
| ------------------- | --------------- | -------------------- |
| `--type-display-md` | 600 32px / 40px | `text-heading-32`    |
| `--type-heading-lg` | 600 24px / 32px | `text-heading-24`    |
| `--type-heading-md` | 600 20px / 26px | `text-heading-20`    |
| `--type-heading-sm` | 600 16px / 24px | `text-heading-16`    |
| `--type-body-md`    | 400 14px / 20px | `text-copy-14`       |
| `--type-body-sm`    | 400 13px / 18px | `text-copy-13`       |
| `--type-label-md`   | 500 14px / 20px | `text-button-14`     |
| `--type-label-sm`   | 500 12px / 16px | `text-label-12`      |
| `--type-data-md`    | 400 13px / 20px | `text-label-13-mono` |
| `--type-data-sm`    | 400 12px / 16px | `text-label-12-mono` |

Shell tokens: `--sidebar-width: 256px` (admincn's 16rem),
`--sidebar-collapsed: 56px`, `--topbar-height: 56px`, `--content-max: 1440px`.

## Shell

- **Sidebar.** 256px, on the page canvas with a hairline right edge. The head
  holds the brand mark, "LadingLens" and "Operator workspace". The nav keeps
  the accessible name "Product views" and groups the views: Intake (Upload,
  Batch ingest, Inbox), Review (Email detail, Review queue) and Insight
  (Control graph, Evaluation). The foot holds Settings and a guest session
  card. The active item is a gray-alpha fill at weight 500 with
  `aria-current="page"`.
- **Collapse.** A header button and Cmd or Ctrl plus B collapse the sidebar
  to a 56px icon rail; the choice is kept in `localStorage`
  (`ladinglens-sidebar`, wrapped in try/catch). Collapsed labels stay in the
  accessibility tree and show as a tooltip on hover and keyboard focus.
- **Header.** A sticky floating card inside the main column, 12px from the
  top, 12px radius, hairline ring and a masked backdrop blur: sidebar toggle,
  a divider, the breadcrumb trail, then the theme toggle on the right. The
  old "Open live demo" link goes away because Upload now leads the nav.
- **Narrow viewports.** Below 960px the sidebar leaves and the existing drawer
  takes over, with its inert, focus-return and Escape behaviour unchanged.

## Page header

`PageHead` drops the gradient hero card and its orbs. It renders a ringed
40px icon tile, the title in `--type-display-md` (24px below 640px), the tag
as a subtle badge and the hint tooltip on the title row, the supporting line
in `--type-body-md` secondary text, and the `aside` slot right-aligned. A
hairline closes the header. The `card` prop is removed from every call site.

## Shared primitives

- **Button.** 36px, 14px weight 500, 6px radius. Primary is gray-1000 on
  white, secondary is the raised surface with a hairline, ghost is
  transparent with the hover fill. `:active` presses 1px.
- **Field and Select.** 36px, 6px radius, gray-alpha-500 edge, the focus ring
  on focus.
- **StatusPill.** A 22px pill with its glyph, the state fill and state text;
  the mismatch pill stays solid orange.
- **DropZone.** A 12px-radius area on the sunken surface with a dashed
  gray-alpha-500 edge, an upload glyph, and an indigo edge and tint on
  drag-over.
- **Tables.** One raised surface with a hairline ring and 12px radius, a
  13px secondary-text header row in sentence case on the canvas colour, 14px
  cells, IDs in Geist Mono, and row hover on gray-alpha-100.

## Upload page

`/upload` is `UploadPage`, which renders `PageHead` (title "Upload") and the
existing `JudgeView`. Everything the judge page did still happens here:

- **Idle.** A two-column layout: the document-pair card (the SI and draft BL
  slots side by side, then a footer bar with the synthetic confirmation and
  "Check documents"), and a side column with the gate summary and the demo
  artifacts. The synthetic-data banner sits above both as a note.
- **Checking.** The waiting screen replaces the pair card. The upload panel
  stays mounted but hidden, so a rejected upload returns with its files.
- **Result, failure and fallback.** Unchanged behaviour, restyled: an outcome
  banner with the run's latency, the documents and their detected roles, the
  field comparison, the evidence viewer and "Check another pair".

`/judge` renders `JudgeEntry`, which calls `ensureGuestSession()` once and
redirects to `/upload`. The README, the deck's QR code and the smoke script
keep working, and a judge still needs no account.

## Waiting screen

The layout follows the wireframe (`waiting-wireframe.png`): one large panel on
a fine blueprint grid, a left column and a right column.

- **Status card.** "Checking your documents live…", both file names and sizes,
  the elapsed seconds, and "Most checks finish in 15 to 40 seconds." The
  range comes from the live-path benchmark (12.9 to 38.4 seconds per read,
  end-to-end p95 25.6 seconds, `docs/research/build/live-path-latency-method.md`).
- **Stage cards.** Receive the pair, Read both documents, Compare the fields.
  Each is waiting, active (an animated indigo status dot) or done (a teal
  check). These are the real pipeline steps in `apps/api/app/judge.py`:
  `_receive`, then `run_case` extraction, then comparison.
- **The bay.** 11 columns by 10 rows of rounded tiles. The first tile shows
  the estimated percentage; the other 109 fill bottom-up in a diagonal sweep
  out from it. When the run returns, the bay completes and washes into the
  verdict colour (teal, indigo or orange; neutral for a failure) before the
  result replaces it.
- **Estimate.** `progress = 0.95 × (1 − e^(−t / 12 s))`, so it never reaches
  100% before the server answers. Stages switch at 8% and 72%. A caption says
  the progress is estimated from typical run times.

## Page restyles

- **Batch ingest.** The stage card and batch list on the left; on the right
  the batch header with its progress bar, the five filter tiles as admincn
  stat cards, a bay map with one tile per email coloured by state (the filter
  dims the others), then the table.
- **Inbox.** The accounting line becomes a three-cell metric strip (received,
  accounted for, lost); the filters sit in a toolbar over the table card.
- **Email detail.** The metadata row becomes a key-value strip, the attachment
  check and field comparison use the table style, and the evidence viewer and
  held review card become 12px cards.
- **Review.** Geist underline tabs with count badges; the queue and the
  reconciliation tables use the table style.
- **Control graph.** The chat dock and canvas become two 12px cards with the
  hairline edge; message bubbles use the sunken surface.
- **Evaluation.** Metric tables in the table style.
- **Settings.** Vercel-style settings cards: title, description and control
  in the body, a footer bar with helper text and the action.

## Motion

Motion marks state, never decoration: the sidebar width (200ms linear, as
admincn), tile fills and the verdict wash (the check's progress and result),
the status dot (only while a stage is active, as Geist's StatusDot), hover
and press feedback. Every duration goes through the `--duration-*` tokens,
which `prefers-reduced-motion` zeroes; the wash hold before the result is
skipped under reduced motion.

## Accessibility

- The bay is one `role="progressbar"` with an estimated `aria-valuetext`; its
  tiles are `aria-hidden`.
- The waiting screen's `role="status"` region announces the headline and the
  stage, not the ticking seconds.
- Focus keeps `box-shadow: var(--focus-ring)`, now a 2px surface gap and a 2px
  indigo ring.
- Collapsed nav links keep their text for screen readers.
- Text meets 4.5:1 on every surface in both themes.

## Testing

- Unit tests for the progress model, the stage states and the tile order.
- Component tests for the waiting screen, the sidebar collapse (button,
  shortcut, persistence) and the bay map.
- Route tests for `/upload`, the `/judge` redirect and guest session, and the
  new nav order.
- The CSS contract tests keep their rules (tokens only, duration tokens,
  focus ring, the 959px breakpoint, no dashes in copy) and describe the new
  shell instead of the hover rail.
- Screenshots of every page in both themes at 1440px and 390px.

## Out of scope

- The landing page, the sign-in page and `docs/DESIGN.md`, which the
  unmerged landing branch owns.
- A command palette, notifications, and any new data or API.
- Classifying staged mail bundles; staging stays instant, so it has no
  waiting screen.

## See also

- [admincn and Geist](/docs/research/design/admincn-and-geist.md)
- [Post-auth structure](/docs/design/post-auth-structure.md)
- [Live-path latency method](/docs/research/build/live-path-latency-method.md)
- https://vercel.com/geist/introduction
