# Post-auth structure

This document fixes one layout grammar for every route behind the operator
guard (`/inbox`, `/emails/:emailId`, `/review`, `/graph`, `/evaluation`,
`/settings`). The six views are one product: same shell, same page frame,
same spacing rhythm, same state treatment, and an obvious path through the
work. All colour, type, spacing, radii, elevation and motion come from the
tokens in `apps/web/src/styles/tokens.css` and the contract in
`docs/DESIGN.md`. No footer renders inside the authenticated shell.

## Shell

The authenticated shell is `AppShell`. It owns two persistent regions and
the content column between them.

- **Top bar.** A sticky bar across the full width. Left to right: the
  LadingLens brand, a breadcrumb trail that names the current position in
  the work, then the workspace utilities pushed to the right edge: the
  "Open live demo" link to `/judge`, the theme toggle, and — on narrow
  screens only — a menu button that opens the navigation drawer. The bar
  keeps a single bottom border and never scrolls away.
- **Navigation rail.** On viewports 960px and wider, a vertical rail sits
  under the top bar on the left. It lists the product views in the order
  work flows through them, each row an icon plus a text label under a
  "Product views" caption, with Settings pinned to the bottom behind a
  separator. The active view is announced by `aria-current="page"` and
  shown by a left rail marker plus a tinted background — position and
  tint together, never colour alone. On viewports under 960px the rail
  is replaced by the top-bar menu button, which opens a slide-in drawer
  carrying the same navigation. The drawer closes on route change, on
  Escape, and on its backdrop, and returns focus to its trigger.
- **Content column.** The remaining width holds one centred column capped
  at a single readable measure. Pages never set their own page-level
  margins; the column owns outer spacing. A skip link at the very start of
  the shell moves keyboard users straight to the content.

Every interactive element in the shell — brand, crumbs, demo link, theme
toggle, menu button, nav links, drawer controls — draws keyboard focus
with `box-shadow: var(--focus-ring)` on `:focus-visible` and nothing else.

## Page frame

Each page is a single vertical stack inside the content column. The stack
has two parts, always in this order.

1.  **Page head.** One `<header>` row that wraps when narrow. It holds the
    page `<h1>`, an optional dataset tag beside it (a neutral uppercase
    pill such as "Prepared fixture"), the optional `i` tooltip that
    carries the page's only secondary explanation, and an optional
    right-aligned slot for a status pill. The head ends with a single
    bottom rule that separates it from the body.
2.  **Page body.** A vertical stack of surfaces at the shared spacing
    rhythm. The primary working surface comes first — the board, the
    comparison grid, the canvas, the ledger. Secondary panels follow:
    each is a bordered raised section with its own `<h2>` and its own
    optional `i` tooltip. Tooltips are the only home for secondary
    explanation; anything operational — refusal banners, held-review
    actions, escalation controls, error alerts — stays permanently
    visible in the body flow.

Exactly one `button--primary` exists per screen, and it is reserved for
the action that settles work (sign-off, rerun, reset). Navigation and
utilities never take the primary style.

## Navigation and flow

The rail order is the workflow order: Inbox (triage intake) → Email
detail (inspect one case) → Review queue (decide held items and
reconciliation exceptions) → Control graph (inspect relationships) →
Evaluation (read the scoreboard). Settings sits apart at the bottom
because it maintains the workspace rather than doing the work.

- The breadcrumb trail echoes the path: `/emails/:emailId` shows
  `Inbox › Email detail`, so a detail view always offers a step back to
  the list it came from. On very narrow screens the trail collapses to
  the current page name only.
- Deep links move the operator forward: inbox rows and queue items open
  their email detail; the reconciliation escalation moves the exception
  into the queue. Nothing forward-moving hides behind a hover.
- `/review` holds two decision surfaces behind one tab strip — the held
  queue and the reconciliation ledger — so switching between deciding
  and checking never leaves the step.

## States

Every page renders four honest states inside the same frame; the frame
itself never changes shape between them.

- **Loading** is a layout-shaped skeleton inside the body region, marked
  `role="status"`, followed by a one-line note naming what is loading.
  No verdict colours render before data exists.
- **Error** is a `role="alert"` panel stating what could not be loaded
  or verified and what the operator can do about it. Partial or missing
  values are labelled, never fabricated.
- **Empty** is a centred, dashed-border panel naming what is empty and
  what will appear there.
- **Ready** renders the primary surface first, then secondary panels.

## Applying it per page

- **Inbox.** Page head (title, prepared-data tag, source tooltip) then
  the accounting strip, filter controls, the emails table and
  pagination. Rows link into email detail — the forward step.
- **Email detail.** Page head (title, prepared-data tag, tooltip,
  status pill aside) then a metadata strip, attachment check with any
  refusal banner permanently visible, the field-comparison grid, source
  evidence, and the held-review custody card carrying the screen's one
  primary action.
- **Review.** Page head then a two-tab strip: the held queue (summary
  count, item table, expandable custody detail with exception actions)
  and the reconciliation ledger (missing-case escalation cards, outcome
  table, expected-shipment table, CSV import with its rerun action).
- **Control graph.** Page head then the canvas/table toggle and the
  chosen representation; the table view is the keyboard-complete
  equivalent, never a lesser disclosure.
- **Evaluation.** Page head then a metric panel grid; the pending
  benchmark panel shows its awaiting state instead of a number.
- **Settings.** Page head then the demo-data section with the always
  visible reset consequences and the screen's single destructive
  action.
