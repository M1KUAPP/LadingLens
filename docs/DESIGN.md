# Design

The visual specification for the Averis prototype. This document is a
placeholder: it fixes the structure the spec will follow, but every value
inside is still to be decided.

Contents:

1.  [Decisions](#decisions)
1.  [Typeface](#typeface)
1.  [Colour](#colour)
1.  [Spacing, Radius And Elevation](#spacing-radius-and-elevation)
1.  [Icons](#icons)
1.  [Motion](#motion)
1.  [App Layout](#app-layout)
1.  [The Views](#the-views)
1.  [States](#states)
1.  [Dark Mode](#dark-mode)
1.  [Accessibility](#accessibility)
1.  [Fallbacks](#fallbacks)
1.  [Acceptance](#acceptance)
1.  [Do And Do Not](#do-and-do-not)
1.  [See Also](#see-also)

## Decisions

_The open design questions this document will settle, stated once and
never reopened below. One decision is already made: the frontend is
React + Vite + TypeScript, served by FastAPI._

| Question | Decision |
| -------- | -------- |
| TBD      | TBD      |

## Typeface

_Type styles: family, weight, size over line height, tracking and case,
plus loading rules._

| Style | Family | Weight | Size / line | Tracking | Case |
| ----- | ------ | ------ | ----------- | -------- | ---- |
| TBD   | TBD    | TBD    | TBD         | TBD      | TBD  |

## Colour

_Colour tokens: name, CSS custom property, role, and light and dark
values._

| Token | CSS | Light | Dark |
| ----- | --- | ----- | ---- |
| TBD   | TBD | TBD   | TBD  |

_Status and comparison tokens: the colours that mark a match, a
mismatch, a `NEEDS_REVIEW` case and each email category._

| Token | CSS | Light | Dark |
| ----- | --- | ----- | ---- |
| TBD   | TBD | TBD   | TBD  |

## Spacing, Radius And Elevation

_Spacing scale, corner radii and shadow or elevation tokens._

| Token | CSS | Value |
| ----- | --- | ----- |
| TBD   | TBD | TBD   |

## Icons

_Icon libraries: which set covers UI glyphs, which covers larger art,
and their sizes._

| Need | Library | Size |
| ---- | ------- | ---- |
| TBD  | TBD     | TBD  |

## Motion

### Motion Tokens

_The easing curves, durations and stagger values, as CSS custom
properties._

```css
/* TBD */
```

### Motion Rules

_Where motion is allowed: entrances, list reordering, graph transitions
and pointer response, and what stays on the compositor._

### Reduced Motion

_What `prefers-reduced-motion` disables, and which controls must still
work._

## App Layout

_The shell every view lives in: the app bar, the navigation, and the
grid and breakpoints each view sits on._

## The Views

_One subsection per view, in navigation order._

### The Inbox List

_The triage list: columns, category and status badges, filtering,
sorting, pagination and row density._

### The Email Detail View

_The SI vs BL side-by-side field comparison: how aligned fields sit,
how a mismatch is highlighted, and how the attachments are shown._

### The Human Review Flow

_How `NEEDS_REVIEW` cases are presented and resolved: the review
reasons, the queue and the resolution controls._

### The Graph View

_The Cytoscape.js graph: node and edge types for emails, shipments,
parties, ports, documents and mismatches, their visual encoding and
layout._

### The Evaluation Dashboard

_The score dashboard: which metrics are shown, how scores are charted,
and the run history._

## States

_Empty, loading, error and partial-data states for every view._

## Dark Mode

_Whether dark mode ships, and how tokens flip between light and dark._

## Accessibility

_Contrast floors, focus treatment, keyboard support, and how mismatches
and statuses read without colour._

## Fallbacks

_Narrow screens, no WebGL or graph fallback, slow networks and degraded
or missing data._

## Acceptance

_The checks the finished design is verified against, at named viewports
and browsers._

## Do And Do Not

_The binding do and do-not rules distilled from the sections above._

## See Also

- [Design research](/docs/research/design/README.md) — the reference
  suite this spec will draw on.
- [Product brief](PRODUCT.md), [product requirements](PRD.md) and the
  [technical design](TRD.md).
- [Markdown style guide](/docs/references/markdown-style.md).
