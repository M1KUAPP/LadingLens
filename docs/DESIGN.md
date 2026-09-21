# Design

The visual specification for LadingLens. Tokens and components are
maintained in the Figma file linked under [See also](#see-also); this
document records the decisions and rules the frontend implements.

Contents:

1.  [Decisions](#decisions)
1.  [Typeface](#typeface)
1.  [Colour](#colour)
1.  [Spacing, Radius And Elevation](#spacing-radius-and-elevation)
1.  [Icons](#icons)
1.  [Motion](#motion)
1.  [App Layout](#app-layout)
1.  [The Views](#the-views)
1.  [Components](#components)
1.  [States](#states)
1.  [Dark Mode](#dark-mode)
1.  [Accessibility](#accessibility)
1.  [Fallbacks](#fallbacks)
1.  [Acceptance](#acceptance)
1.  [Do And Do Not](#do-and-do-not)
1.  [See Also](#see-also)

## Decisions

_The design questions this document settles, stated once and never
reopened below._

| Question                            | Decision                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Product name                        | LadingLens                                                                                                                          |
| Frontend stack                      | React + Vite + TypeScript, served by FastAPI; Bun for packages and scripts; `oxlint` for linting                                    |
| Typefaces                           | Archivo for UI text, Martian Mono for data; both SIL Open Font Licence 1.1, self-hosted as WOFF2 with no runtime CDN                |
| Status palette                      | Held in indigo: `NEEDS_REVIEW` is moved off the warm hazard axis so a refusal reads as a deliberate custody handoff, never an error |
| Token and component source of truth | the Figma file linked under [See also](#see-also)                                                                                   |
| Dark mode                           | ships; every colour token carries a light and a dark value                                                                          |

## Typeface

_Type styles: family, weight, size over line height, tracking and case,
plus loading rules._

| Style      | Family       | Weight | Size / line | Tracking | Case      |
| ---------- | ------------ | ------ | ----------- | -------- | --------- |
| display/lg | Archivo      | 600    | 48 / 52     | -1.7px   | as typed  |
| display/md | Archivo      | 600    | 34 / 38     | -1.0px   | as typed  |
| heading/lg | Archivo      | 600    | 24 / 30     | -0.5px   | as typed  |
| heading/md | Archivo      | 600    | 19 / 26     | -0.3px   | as typed  |
| heading/sm | Archivo      | 500    | 16 / 22     | -0.15px  | as typed  |
| body/lg    | Archivo      | 400    | 16 / 25     | 0        | as typed  |
| body/md    | Archivo      | 400    | 14 / 21     | 0        | as typed  |
| body/sm    | Archivo      | 400    | 13 / 19     | 0        | as typed  |
| label/md   | Archivo      | 500    | 13 / 16     | +0.2px   | as typed  |
| label/sm   | Archivo      | 500    | 11 / 14     | +0.6px   | uppercase |
| data/md    | Martian Mono | 400    | 13 / 20     | -0.2px   | as typed  |
| data/sm    | Martian Mono | 400    | 11 / 17     | -0.1px   | as typed  |
| data/xs    | Martian Mono | 500    | 10 / 14     | +0.4px   | uppercase |

Loading rules:

- Both families are self-hosted as WOFF2, subset to Latin, served with
  `font-display: swap`. There is no runtime font CDN.
- Every numeric value uses `font-variant-numeric: tabular-nums`.
- Martian Mono is mandatory for all identifiers and figures — B/L
  numbers, container numbers, weights, dates, port codes — because
  comparison columns that do not align digit-for-digit hide the
  mismatch they exist to reveal.

## Colour

_Colour tokens: name, CSS custom property, role, and light and dark
values._

The CSS custom property is the token name with slashes replaced by
hyphens: `surface/canvas` becomes `var(--surface-canvas)`.

| Token               | CSS                          | Light   | Dark    |
| ------------------- | ---------------------------- | ------- | ------- |
| surface/canvas      | `var(--surface-canvas)`      | #FFFFFF | #0C1115 |
| surface/raised      | `var(--surface-raised)`      | #F8FAFB | #141D24 |
| surface/sunken      | `var(--surface-sunken)`      | #F1F5F9 | #1C2630 |
| surface/hover       | `var(--surface-hover)`       | #F1F5F9 | #1C2630 |
| border/default      | `var(--border-default)`      | #CBD5E1 | #28353F |
| border/strong       | `var(--border-strong)`       | #64748B | #72829A |
| border/focus        | `var(--border-focus)`        | #4F46E5 | #818CF8 |
| text/primary        | `var(--text-primary)`        | #0F172A | #E7EEF3 |
| text/secondary      | `var(--text-secondary)`      | #334155 | #B2C0CB |
| text/tertiary       | `var(--text-tertiary)`       | #64748B | #8593A0 |
| text/inverse        | `var(--text-inverse)`        | #FFFFFF | #0C1115 |
| text/disabled       | `var(--text-disabled)`       | #57636F | #8593A0 |
| brand/primary       | `var(--brand-primary)`       | #4F46E5 | #818CF8 |
| brand/primary-hover | `var(--brand-primary-hover)` | #312E81 | #A5B4FC |
| brand/teal          | `var(--brand-teal)`          | #0D9488 | #14B8A6 |
| brand/orange        | `var(--brand-orange)`        | #C2410C | #EA580C |

_Status and comparison tokens: the colours that mark a match, a
mismatch, a `NEEDS_REVIEW` case and each email category._

| Token                 | CSS                            | Light   | Dark    |
| --------------------- | ------------------------------ | ------- | ------- |
| state/match/fill      | `var(--state-match-fill)`      | #CCFBF1 | #0C2F2B |
| state/match/border    | `var(--state-match-border)`    | #5EEAD4 | #0D9488 |
| state/match/text      | `var(--state-match-text)`      | #0F3F3A | #5EEAD4 |
| state/match/solid     | `var(--state-match-solid)`     | #0D9488 | #14B8A6 |
| state/mismatch/fill   | `var(--state-mismatch-fill)`   | #C2410C | #C2410C |
| state/mismatch/border | `var(--state-mismatch-border)` | #C2410C | #EA580C |
| state/mismatch/text   | `var(--state-mismatch-text)`   | #FFF7ED | #FFF7ED |
| state/mismatch/solid  | `var(--state-mismatch-solid)`  | #C2410C | #EA580C |
| state/held/fill       | `var(--state-held-fill)`       | #E0E7FF | #1E1B4B |
| state/held/border     | `var(--state-held-border)`     | #A5B4FC | #6366F1 |
| state/held/text       | `var(--state-held-text)`       | #312E81 | #A5B4FC |
| state/held/solid      | `var(--state-held-solid)`      | #4F46E5 | #6366F1 |
| state/neutral/fill    | `var(--state-neutral-fill)`    | #F1F5F9 | #1C2630 |
| state/neutral/border  | `var(--state-neutral-border)`  | #CBD5E1 | #28353F |
| state/neutral/text    | `var(--state-neutral-text)`    | #57636F | #8593A0 |

Email category badges reuse `state/neutral/*` for routed mail and
`state/held/*` for anything awaiting a person. There are no separate
category colours.

_Chrome, glass and hero tokens: the fixed shell's dimensions, the
translucent surfaces layered over the canvas, and the page-hero card's
tints._

| Token                    | CSS                          | Light                                      | Dark                   |
| ------------------------ | ---------------------------- | ------------------------------------------ | ---------------------- |
| chrome/topbar-height     | `var(--topbar-height)`       | 64px (`--spacing-11`)                      | same                   |
| chrome/sidebar-width     | `var(--sidebar-width)`       | 200px                                      | same                   |
| chrome/sidebar-collapsed | `var(--sidebar-collapsed)`   | 64px (`--spacing-11`)                      | same                   |
| chrome/content-max       | `var(--content-max)`         | 75rem                                      | same                   |
| glass/bg                 | `var(--glass-bg)`            | rgba(255, 255, 255, 0.72)                  | rgba(12, 17, 21, 0.72) |
| glass/blur               | `var(--glass-blur)`          | 20px                                       | same                   |
| glass/saturate           | `var(--glass-saturate)`      | 180%                                       | same                   |
| scrim/bg                 | `var(--scrim-bg)`            | rgba(15, 23, 42, 0.08)                     | rgba(0, 0, 0, 0.25)    |
| scrim/blur               | `var(--scrim-blur)`          | 12px                                       | same                   |
| orb/blur                 | `var(--orb-blur)`            | 48px                                       | same                   |
| hero/fill-from           | `var(--hero-fill-from)`      | brand/primary 9% on surface/canvas         | same mix, dark bases   |
| hero/fill-to             | `var(--hero-fill-to)`        | brand/teal 7% on surface/canvas            | same mix, dark bases   |
| hero/border              | `var(--hero-border)`         | brand/primary 22% on border/default        | same mix, dark bases   |
| hero/orb-primary         | `var(--hero-orb-primary)`    | brand/primary 14%                          | same mix, dark bases   |
| hero/orb-accent          | `var(--hero-orb-accent)`     | brand/teal 14%                             | same mix, dark bases   |
| hero/icon-fill           | `var(--hero-icon-fill)`      | brand/primary 12%                          | same mix, dark bases   |
| gauge/band-match         | `var(--gauge-band-match)`    | state/match/solid 16% on surface/canvas    | same mix, dark bases   |
| gauge/band-review        | `var(--gauge-band-review)`   | state/held/solid 16% on surface/canvas     | same mix, dark bases   |
| gauge/band-mismatch      | `var(--gauge-band-mismatch)` | state/mismatch/solid 16% on surface/canvas | same mix, dark bases   |

The hero tokens are `color-mix()` blends of the themed base tokens, so one
declaration resolves both themes — the dark column lists the same mix over
the dark bases.

The gauge tokens are the three decision bands of the horizontal probability
gauge used for recorded confidence: clear difference (up to 30%), needs a
person (30 to 85%), confident match (85% and above). They are `color-mix()`
tints of the `state/*` solids over `surface/canvas`, so one declaration
resolves both themes.

_Film tokens: text laid straight over imagery, the landing film and the
sign-in silk. The picture sets the ground, so one value serves both
themes._

| Token           | CSS                      | Value                                        |
| --------------- | ------------------------ | -------------------------------------------- |
| film/ink        | `var(--film-ink)`        | #1D3045                                      |
| film/paper      | `var(--film-paper)`      | #FFFFFF                                      |
| film/sky        | `var(--film-sky)`        | #CFD4DD, the ground until the first frame    |
| film/halo-ink   | `var(--film-halo-ink)`   | rgba(255, 255, 255, 0.5), behind navy chrome |
| film/halo-paper | `var(--film-halo-paper)` | rgba(29, 48, 69, 0.55), behind white chrome  |
| silk/tint       | `var(--silk-tint)`       | #4A6680                                      |

## Spacing, Radius And Elevation

_Spacing scale, corner radii and shadow or elevation tokens._

| Token        | CSS                   | Value                                                             |
| ------------ | --------------------- | ----------------------------------------------------------------- |
| spacing/0    | `var(--spacing-0)`    | 0                                                                 |
| spacing/1    | `var(--spacing-1)`    | 2px                                                               |
| spacing/2    | `var(--spacing-2)`    | 4px                                                               |
| spacing/3    | `var(--spacing-3)`    | 8px                                                               |
| spacing/4    | `var(--spacing-4)`    | 12px                                                              |
| spacing/5    | `var(--spacing-5)`    | 16px                                                              |
| spacing/6    | `var(--spacing-6)`    | 20px                                                              |
| spacing/7    | `var(--spacing-7)`    | 24px                                                              |
| spacing/8    | `var(--spacing-8)`    | 32px                                                              |
| spacing/9    | `var(--spacing-9)`    | 40px                                                              |
| spacing/10   | `var(--spacing-10)`   | 48px                                                              |
| spacing/11   | `var(--spacing-11)`   | 64px                                                              |
| radius/none  | `var(--radius-none)`  | 0                                                                 |
| radius/sm    | `var(--radius-sm)`    | 2px                                                               |
| radius/md    | `var(--radius-md)`    | 4px                                                               |
| radius/lg    | `var(--radius-lg)`    | 8px                                                               |
| radius/xl    | `var(--radius-xl)`    | 16px                                                              |
| radius/full  | `var(--radius-full)`  | 9999px                                                            |
| elevation/sm | `var(--elevation-sm)` | 0 1px 2px rgba(15, 23, 42, 0.06)                                  |
| elevation/md | `var(--elevation-md)` | 0 2px 8px rgba(15, 23, 42, 0.08)                                  |
| elevation/lg | `var(--elevation-lg)` | 0 8px 24px rgba(15, 23, 42, 0.14) light; rgba(0, 0, 0, 0.45) dark |
| focus-ring   | `var(--focus-ring)`   | 0 0 0 3px var(--border-focus)                                     |

```css
--elevation-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--elevation-md: 0 2px 8px rgba(15, 23, 42, 0.08);
--elevation-lg: 0 8px 24px rgba(15, 23, 42, 0.14);
--focus-ring: 0 0 0 3px var(--border-focus);
```

## Icons

_Icon libraries: which set covers UI glyphs, which covers larger art,
and their sizes._

| Need                                               | Library                 | Size                                              |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| UI glyphs                                          | Hugeicons, stroke style | 20px in controls, 16px inline with `data/*` text  |
| Verdict glyphs: check, cross, two pause bars, dash | in-house vectors        | set by the Status Pill                            |
| Larger art and empty states                        | in-house vectors        | 120px on a 12-column field, scaled down on narrow |

The four verdict glyphs are drawn in-house as vectors so their
silhouettes stay distinct at projector distance. The 12-glyph set is
drawn in-house on a 16px grid at a 1.5 to 1.8 stroke weight; Check,
Cross and Hold are reserved as verdict glyphs.

## Motion

### Motion Tokens

_The easing curves, durations and stagger values, as CSS custom
properties._

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
--ease-film: cubic-bezier(0.16, 1, 0.3, 1);
--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast: 120ms;
--duration-base: 200ms;
--duration-slow: 320ms;
--stagger: 40ms;
```

### Motion Rules

_Where motion is allowed: entrances, list reordering, graph transitions
and pointer response, and what stays on the compositor._

Motion is allowed on four things: provenance jumps, where the source
region settles into place; entrances — the page hero and overlay surfaces
arrive on the shared `fade-in`, `fade-in-up`, `fade-in-down`,
`slide-in-left`, `slide-in-right` and `scale-in` keyframes; ambient motion —
`glow-pulse` on decorative orbs, `shimmer` on skeleton bars and the silk
behind the sign-in panel, a canvas repaint that holds one frame under
reduced motion; and pointer response. Only `transform` and `opacity` may
animate, plus `background-position` for the skeleton shimmer, which repaints
but never relayouts.

The public landing adds scroll as a fifth driver. Its film's playhead
follows the scroll position through an exponential ease, its three scenes
cross-fade on opacity, and its bar changes ink over 500ms; nothing on it
runs on a timer except the bar's one entrance. The bar and menu also
transition colour — the ink flip and their hover states — at the
reference's literal durations, not the tokens above; reduced motion drops
every one of them.

The site footer the landing folds over adds a slower ambient layer on
multiples of `--duration-slow`: three aurora orbs in the brand tints that
drift and breathe on `glow-pulse`, and a hairline grid that slides one
cell. Scroll drives its parallax as it drives the film: the footer rises
into place a little slower than the page lifts off it. Its two pills answer
a mouse pointer with a magnetic pull and spring back on `--ease-overshoot`;
touch never pulls them. Reduced motion stops the loops, pins the pills and
holds the footer at rest.

A verdict changing state does not animate. A mismatch must be true the
instant it renders.

### Reduced Motion

_What `prefers-reduced-motion` disables, and which controls must still
work._

`prefers-reduced-motion: reduce` drops every duration to 0ms. All
controls keep working, and the provenance jump becomes an instant
scroll to the source region. The landing film seeks straight to the scroll
position and never builds its frame bank, and anchor scrolling is instant.

## App Layout

_The shell every view lives in: the app bar, the navigation, and the
grid and breakpoints each view sits on._

One shell hosts the five views listed under [The Views](#the-views), in
navigation order: the inbox list, the email detail view, the human
review flow, the graph view, and the evaluation dashboard. The app bar
carries the product name and the current view; the navigation moves
between views and never carries a consequential action.

The grid is 12 columns with a 24px gutter and a 16px minimum side
gutter at every width. Breakpoints: `sm` 640px, `md` 960px, `lg` 1280px,
`xl` 1600px. The comparison view needs `md` or wider to hold both
document panes; below that it stacks, described under Fallbacks.

## The Views

_One subsection per view, in navigation order._

### The Inbox List

_The triage list: columns, category and status badges, filtering,
sorting, pagination and row density._

The triage list accounts for every received email. Each row carries a
category badge and, once processed, a Status Pill. Category badges use
`state/neutral/*` for routed mail and `state/held/*` for anything
awaiting a person, so the list itself shows where the queue owes a
human. Identifiers and counts in every column are set in `data/*`
styles with tabular figures.

Filtering, sorting, pagination and row density exist so the full set
stays inspectable; their specific options are TBD.

### The Email Detail View

_The SI vs BL side-by-side field comparison: how aligned fields sit,
how a mismatch is highlighted, and how the attachments are shown._

This is the core screen: the SI and the draft BL sit side by side, one
Field Row per compared field. Each Field Row is field name (`data/xs`,
150px), SI value (`data/md`, 230px), BL value (`data/md`, 230px), then
the Status Pill. The pill's glyph and label restate the verdict, so the
row reads under greyscale and colour-blind viewing. A mismatch fills the
row with `state/mismatch/*`.

Clicking a value makes a provenance jump into the source document,
anchored in the form that is honest for its format: a TXT line and
column range, a digital-PDF bounding box, an XLSX sheet and cell, or a
DOCX table cell or paragraph. A scanned PDF opens at an approximate
page region and is visibly labelled approximate. A corrupt file has no
anchor and is routed `unreadable`.

The attachment list shows each file with its detected document type and
parse state, so a `wrong_doc_type` or `missing_attachment` case is
visible before the field grid is read.

### The Human Review Flow

_How `NEEDS_REVIEW` cases are presented and resolved: the review
reasons, the queue and the resolution controls._

`NEEDS_REVIEW` is a decision, not an alarm: the queue and its cases
render in `state/held/*` with the pause-bars glyph. A case shows its
review reason, the immutable source, evidence, a diagnostic or
probability where applicable, and the named owner.

Resolution uses the Button variants: Primary commits the irreversible
sign-off and appears once per screen; Secondary routes the case to a
person; Ghost withdraws the action. Reconciliation exceptions carry
assign, acknowledge, escalate and resolve as append-only actions and
never fabricate an email case.

### The Graph View

_The control trace: the control graph read as one chain per case, from
email to shipment, with the verdict of every stage on its link._

The graph view reads the control graph as a trace
(`features/control-graph/trace.ts`, drawn by `ControlTrace`). A case is
what one email brought in: the email, its documents, and the flags raised
on them. Each case is one row, read left to right as the pipeline runs:
case, documents, checked fields, flags, shipment. Every stage's marker
restates its verdict with the in-house glyph and rides a rail along the top
of the row, with the stage's content below it, so the hairline threading
the markers never crosses text and scanning down a marker column shows
where each chain broke. Rows run worst first: mismatch, held, not compared, match.
Shipments the ledger expects that no email reached, such as a
`MISSING_CASE`, close the list as chains with no email.

Checked fields pair each party and port across the two documents. A field
where they agree shows the value once; where they differ, both sides show
with an `SI` or `BL` tag, and a mismatch fills the field line with
`state/mismatch/*`, as the Field Row does. Parties, ports and shipments
are shared between cases; they are the graph's cross-links. Pressing one
traces it: the cases that name it stay, the rest blur and fade back, and a
status strip counts them. Tracing carries no colour of its own: the traced
value takes the pressed fill and what a trace or an answer points at is
ringed in neutral ink, never a verdict colour. Chips hold one line, and a
value or flag the column clips shows whole in a tooltip (`ClipTooltip`) on
hover or focus. Longer prose stays out of the rows: an email's subject, the
notes on a held document and a shipment's ledger note sit behind a
"Details" trigger, a `Tooltip` with visible text.

The assistant drives the trace from its floating panel. An answer narrows
the trace to the cases it drew, a citation lights its node and scrolls its
row into view, and while a question is in flight the trace dims and scans.
Nothing the corpus sends is dropped: a node no row can hold is listed
under "Also in view". Below the app breakpoint each chain stands up, the
stages stacking down a vertical thread.

### The Evaluation Dashboard

_The score dashboard: which metrics are shown, how scores are charted,
and the run history._

The dashboard reports the evaluation runs: classification coverage,
comparison outcomes, reconciliation outcomes, and the end-to-end
latency benchmark. Figures are `data/*` with tabular numerals, and any
score that maps to a verdict uses the matching `state/*` tokens. Chart
types and the run-history presentation are TBD.

## Components

_The component set: what each control replaces, its variants, and the
shared geometry and interaction rules._

No browser-native control ships in LadingLens. Every select, dropdown,
scrollbar, date picker, search field, checkbox and file input is drawn
as our own component. Native controls cannot be themed, so they break
dark mode. They render a different widget on every OS and browser, so
the layout is not predictable. Their text is not tabular, so dates and
identifiers will not align in a comparison column. And a native
scrollbar changes width between platforms, which would shift the
two-pane geometry the whole comparison depends on.

| Component         | Variants          | Replaces                                                          | Note                                                 |
| ----------------- | ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Icons             | 12 glyphs at 16px | icon fonts                                                        | Check, Cross and Hold are reserved verdict glyphs    |
| Button            | Style x State, 12 | `<button>` default chrome                                         | One Primary per view, always the irreversible action |
| Checkbox          | 4                 | `<input type=checkbox>`                                           | Indeterminate is for partial page selection only     |
| Field             | Type x State, 16  | `<input>`, `<select>`, `<input type=date>`, `<input type=search>` | One 36px shell for Input, Search, Select and Date    |
| Tooltip           | 1                 | `title` attribute                                                 | Carries the approximate-anchor caveat                |
| Status pill       | 4                 | none                                                              | The three verdicts plus not-compared                 |
| Scrollbar         | 2                 | OS scrollbar                                                      | Both document panes, always visible                  |
| Menu item         | 4                 | `<option>`                                                        | Selected uses the held token, with a check           |
| Menu              | 1                 | native dropdown list                                              | The only list a Select may open                      |
| Date picker       | 1                 | native date widget                                                | The only calendar a Date field may open              |
| Field Row         | 3                 | none                                                              | The SI-against-BL comparison row                     |
| Provenance anchor | 3                 | none                                                              | Exact, Approximate and None                          |
| Drop zone         | 2                 | `<input type=file>`                                               | Names its formats and size ceiling up front          |

_Shared geometry: heights, padding, radii and borders._

| Element         | Height | Padding       | Radius | Border                           |
| --------------- | ------ | ------------- | ------ | -------------------------------- |
| Button          | 36     | 18 horizontal | 4      | none, or 1px on Secondary        |
| Field           | 36     | 12 horizontal | 4      | 1px border/strong                |
| Menu item       | 32     | 12 horizontal | 0      | none                             |
| Menu panel      | hugs   | 6 vertical    | 4      | 1px border/default, elevation/md |
| Status pill     | 22     | 9 by 5        | 2      | 1px                              |
| Date picker     | hugs   | 16            | 4      | 1px border/default, elevation/md |
| Scrollbar track | fills  | 0             | 6      | none                             |
| Field Row       | 52     | 16 left       | 0      | 1px bottom                       |

- Focus is always a 3px `border/focus` ring drawn OUTSIDE the element,
  so focus never shifts layout. Keyboard focus only, never on pointer
  click.
- Disabled uses `state/neutral/fill` with `text/disabled`. Never
  opacity, because opacity over an arbitrary surface gives an
  unpredictable contrast.
- Hover moves one step darker. No gradients, no shadows, no scale on
  press.
- A Select opens the Menu. A Date field opens the Date picker. Neither
  ever falls through to the browser.
- Keyboard contracts: in a Menu, up and down move, Enter commits,
  Escape closes and returns focus to the Field. In the Date picker,
  arrows move by day, PageUp and PageDown by month, Enter commits,
  Escape closes.
- A rejected file explains itself inline in `state/mismatch/text`,
  below the Drop zone, never as a browser alert.

## States

_Empty, loading, error and partial-data states for every view._

- Empty states use `state/neutral/*` and plain language; an empty queue
  is not a verdict.
- Loading states use `text/secondary` and `surface/sunken`; a skeleton
  must never pre-draw a Status Pill in a way that could be mistaken
  for a result.
- Errors are not verdicts. A failed load or provider failure uses
  `text/*` and `border/*`, never `state/mismatch/*` — orange is
  reserved for a real comparison defect.
- Partial data is honest: a missing value renders empty with its
  `missing_value` reason, an approximate anchor is labelled
  approximate, and an unreadable file shows no invented region.

## Dark Mode

_Whether dark mode ships, and how tokens flip between light and dark._

Dark mode ships. Every colour token in the tables above carries a
light and a dark value; switching themes re-points the same CSS custom
properties, so no component hardcodes a hex. `prefers-color-scheme` sets
the default, and a manual toggle stamps `data-theme` on the root to
override it in either direction. The choice persists per browser and
never travels with the account.

## Accessibility

_Contrast floors, focus treatment, keyboard support, and how mismatches
and statuses read without colour._

Floors: 4.5:1 for body text, 3:1 for large text and UI boundaries.

Measured on `#FFFFFF`: `text/primary` 17.85:1, `text/secondary`
10.35:1, `text/tertiary` 4.76:1, focus ring 6.29:1. Badge text on its
own fill: match 6.81:1, held 8.88:1, neutral 7.24:1. Measured on
on `surface/canvas` dark (`#0C1115`): primary 16.29:1, secondary
10.27:1, tertiary 6.07:1, focus ring 6.36:1.

Badge borders sit below 3:1 deliberately: the fill and text carry the
boundary, the border is decorative. This is stated, not claimed as a
pass.

Focus uses `var(--focus-ring)` over `border/focus`. Controls laid on the
landing film ring focus with a 2px outline in their own ink, 3px out,
because the theme focus token cannot hold 3:1 against imagery. Every
control is keyboard reachable. No verdict is carried by colour alone: each Status
Pill pairs colour with a glyph and a label, so the screen survives
greyscale, a bad projector and colour-blind viewing.

## Fallbacks

_Narrow screens, slow networks and degraded
or missing data._

- Narrow screens: below `md` (960px) the Field Row stops holding two
  value columns side by side. It stacks to the SI value above the BL
  value, keeps the Status Pill, and labels each value
  with its source so the comparison is still unambiguous.
- Graph: the trace is plain HTML, so there is no canvas to fail, and
  every node the corpus sends lands in a row or under "Also in view".
- Slow networks: fonts are self-hosted WOFF2 with
  `font-display: swap`, so text renders immediately in the fallback
  stack and swaps in place.
- Degraded or missing data: see [States](#states) — approximate
  anchors are labelled, unreadable files are routed, and nothing is
  fabricated to fill a gap.

## Acceptance

_The checks the finished design is verified against, at named viewports
and browsers._

- Every screen survives greyscale: no verdict depends on colour alone.
- Comparison columns align digit-for-digit under `tabular-nums`.
- `prefers-reduced-motion` drops all durations to 0ms with every
  control still working.
- Light and dark render from the same tokens with no hardcoded hex.
- The Primary button appears once per screen and only on the
  irreversible sign-off.
- The pass runs at 1920x1080 (the projector), 1440x900 and 390x844,
  on current Chrome, Firefox and Safari.

## Do And Do Not

_The binding do and do-not rules distilled from the sections above._

- Do treat a refusal as a decision: `NEEDS_REVIEW` is indigo with the
  pause-bars glyph. Do not use a warning triangle, amber, or anything
  that reads as an error or a retry.
- Do carry every verdict on three channels — colour, icon, and label.
  Do not let colour be the only channel. No coloured rules or rails down
  a row or card edge.
- Do set every compared value in tabular figures. Do not let digits
  drift out of alignment in a comparison column.
- Do keep the Primary action for the named person's irreversible
  sign-off, once per screen. Do not spend it on navigation.
- Do not ship a browser-native control; every select, scrollbar and
  file input is drawn in-house.

## See Also

- [LadingLens design system](https://www.figma.com/design/W9xsrgxvW4AFRmAtNhbGkL/LadingLens-Design-System?node-id=0-1)
  in Figma — the single source of truth for every token and component
  in this document.
- [Product brief](PRODUCT.md), [product requirements](PRD.md) and the
  [technical design](TRD.md).
- [Markdown style guide](/docs/references/markdown-style.md).
