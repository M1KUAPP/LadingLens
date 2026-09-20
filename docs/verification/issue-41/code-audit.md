# Issue 41 code audit

Scope: `apps/web/src` against `docs/DESIGN.md`. The `/judge` and
`/settings` routes exist only as placeholders owned by issues #39 and
#40 (`apps/web/src/routing/routes.tsx:35-46` and `:105-112`) and were
ignored per the brief.

## Focus ring

- Fixed: `docs/DESIGN.md:351` read "Focus is always a 2px `border/focus`
  ring drawn OUTSIDE the element". It now reads 3px. Only that sentence
  changed; `git diff` shows one line changed.
- The token was already consistent in all three definitions, all
  `0 0 0 3px rgba(79, 70, 229, 0.45)`: `docs/DESIGN.md:148` (token
  table), `docs/DESIGN.md:153` (CSS block), and
  `apps/web/src/styles/tokens.css:90`. Grepping for `--focus-ring`
  definitions finds no other value.
- Consumers apply it unchanged as `box-shadow: var(--focus-ring)` on
  `:focus-visible`, e.g. `apps/web/src/components/ui/domain.css:131-133`,
  `apps/web/src/components/ui/domain.css:200-204`,
  `apps/web/src/components/ui/domain.css:252-255`, and
  `apps/web/src/features/review-queue/components/review-queue-detail.css:67-71`.
- `apps/web/src/styles/tokens.css` and all consumer CSS were left
  untouched, per the brief.

## Reduced motion

- No findings. Every motion path in `apps/web/src` already routes
  through the duration tokens or is already instant; nothing needed
  fixing.
- `apps/web/src/styles/tokens.css:209-215` sets `--duration-fast`,
  `--duration-base`, `--duration-slow` and `--stagger` to `0ms` under
  `@media (prefers-reduced-motion: reduce)`.
- Every `transition` declaration in application CSS uses
  `var(--duration-*)` and `var(--ease-*)`:
  `apps/web/src/components/ui/controls.css:12-14`,
  `apps/web/src/layout/site-shell.css:111-113`,
  `apps/web/src/pages/landing-page.css:194`, and
  `apps/web/src/components/hero-film.css:13` plus `:18`.
- `apps/web/src/components/hero-film.css:29-33` additionally forces
  `transition: none` on the hero film layers under reduced motion.
- Provenance jump is already instant under reduced motion:
  `apps/web/src/features/email-detail/EmailDetailView.tsx:36-44` reads
  `matchMedia('(prefers-reduced-motion: reduce)')` and calls
  `scrollIntoView` with `behavior: 'auto'` instead of `'smooth'`. Both
  branches are covered by tests at
  `apps/web/src/features/email-detail/EmailDetailView.test.tsx:244-296`.
- Other scroll calls are instant by default (no `behavior: 'smooth'`):
  `apps/web/src/App.tsx:21` (`window.scrollTo(0, 0)`) and
  `apps/web/src/layout/SiteShell.tsx:21`
  (`window.scrollTo({ top: ... })`).
- `apps/web/src/features/control-graph/CytoscapeCanvas.tsx:141` runs
  the cose layout with `animate: false`.
- `apps/web/src/pages/LandingPage.tsx:13` swaps the hero video for a
  static poster when reduced motion is requested.
- `apps/web/src/components/ui/Domain.tsx:88` only reads scroll offsets
  to size the custom scrollbar thumb; `apps/web/src/lib/theme.ts:19`
  queries `prefers-color-scheme`, not motion.
- No `@keyframes`, `animation`, `animation-duration`,
  `transition-duration`, `scroll-behavior`, `setTimeout`, `setInterval`
  or `requestAnimationFrame` exists in `apps/web/src` outside
  `apps/web/src/test/setup.ts:6-20`, which is jsdom test infrastructure.
- `--stagger` (`apps/web/src/styles/tokens.css:97`, zeroed at `:214`)
  has no consumers. Left in place; see Open findings.

## Greyscale safety

- One finding, reported only per the brief: graph edge state is carried
  by colour alone.
  - `apps/web/src/features/control-graph/CytoscapeCanvas.tsx:81-84`
    sets only `line-color` and `target-arrow-color` for `edge[state]`;
    the edge label (`CytoscapeCanvas.tsx:112`) names the relationship
    kind, not the state.
  - `apps/web/src/features/control-graph/AccessibleGraphTable.tsx:75`
    puts `data-state` on edge rows, but
    `apps/web/src/features/control-graph/control-graph.css:101-107`
    only retints `border-bottom-color`; no cell states the state in
    text.
  - Mitigation: an edge's state duplicates the verdict of the node it
    terminates at (e.g. `fixtures/prepared.ts:462-469` edges
    `party:moorim-sp`, whose node state is `mismatch`), and every node
    carries a glyph prefix (`CytoscapeCanvas.tsx:13-18` and `:102`) or
    a `StatusPill` (`AccessibleGraphTable.tsx:55-56`). The state
    survives greyscale via the node; the edge itself does not restate
    it.
  - Only one fixture edge currently carries `state`
    (`apps/web/src/features/control-graph/fixtures/prepared.ts:468`),
    so the gap is narrow in the shipped data.
- All other verdict/status/outcome surfaces pair colour with a glyph,
  rail or text label:
  - `StatusPill` renders glyph + text
    (`apps/web/src/components/ui/Domain.tsx:19-42`; styles
    `apps/web/src/components/ui/domain.css:1-37`).
  - `FieldRow` renders a status rail + pill
    (`apps/web/src/components/ui/Domain.tsx:52-69`;
    `apps/web/src/components/ui/domain.css:52-79`). Verdict labels are
    mapped at
    `apps/web/src/features/email-detail/components/ComparisonGrid.tsx:32-36`,
    and the header tooltip at `:74-83` states the restatement contract.
  - Held surfaces carry a 3px left rail plus a pill:
    `apps/web/src/features/email-detail/components/held-review-card.css:6-10`,
    `apps/web/src/features/review-queue/components/review-queue-detail.css:11-13`,
    `apps/web/src/features/review-queue/components/review-queue-table.css:42`,
    `apps/web/src/features/email-detail/email-detail.css:87`, and
    `apps/web/src/features/reconciliation/components/missing-case-peak-card.css:22`.
  - The missing-case card renders rail + hold glyph + titled pill at
    `apps/web/src/features/reconciliation/components/MissingCasePeakCard.tsx:26-31`.
  - The inbox category badge held tint
    (`apps/web/src/pages/inbox-page.css:172-176`) is supplementary; the
    row's Status cell carries the verdict via `StatusPill` with glyph +
    label at `apps/web/src/pages/InboxPage.tsx:45-51`.
  - Evidence "Approximate"/"No anchor" tags are text + colour
    (`apps/web/src/features/email-detail/components/evidence-viewer.css:70-90`);
    the attachment refusal has rail + title
    (`apps/web/src/features/email-detail/components/attachment-preflight.css:24-55`);
    drop-zone rejections
    (`apps/web/src/components/ui/domain.css:225-234`) and CSV import
    errors
    (`apps/web/src/features/reconciliation/components/csv-import-section.css:53-54`)
    are plain text.

## Tabular numerals

- Root cause of every fix below: the `font:` shorthand resets
  `font-variant-numeric` to `normal`, so a component rule with
  `font: var(--type-data-*)` silently stripped `tabular-nums` —
  including where markup already carried a `type-data-*` class
  (`.inbox-id`, `.inbox-range`, `.rq-item-id`,
  `.eval-figure-note.type-data-sm`). Each fix adds the existing
  declaration inside the rule; no other property changed.
- Already correct, unchanged: the `type-data-md/sm/xs` utility classes
  at `apps/web/src/styles/base.css:66-82`, placeholder params at
  `apps/web/src/index.css:18-21`, and eval figure values at
  `apps/web/src/pages/evaluation-page.css:55-58`.
- Added `font-variant-numeric: tabular-nums` to 16 rules:
  - `apps/web/src/pages/inbox-page.css:44-48` — selector
    `.inbox-accounting .type-data-md`, accounting counts.
  - `apps/web/src/pages/inbox-page.css:134-140` — selector `.inbox-id`,
    ID column.
  - `apps/web/src/pages/inbox-page.css:198-202` — selector
    `.inbox-range`, "1-50 of N" pagination.
  - `apps/web/src/pages/evaluation-page.css:68-71` — selector
    `.eval-figure-note.type-data-sm`, "X of Y" figure notes.
  - `apps/web/src/features/review-queue/components/review-queue-table.css:77-83`
    — selector `.rq-item-id`, held-case identifier column.
  - `apps/web/src/features/review-queue/components/review-queue-detail.css:50-56`
    — selector `.rq-meta-value`, ids and timestamps.
  - `apps/web/src/features/review-queue/components/review-queue-detail.css:119-127`
    — selector `.rq-history-meta`, event timestamps.
  - `apps/web/src/features/email-detail/components/held-review-card.css:55-59`
    — selector `.held-review-item-value`, probability and ids.
  - `apps/web/src/features/email-detail/components/held-review-card.css:118-124`
    — selector `.held-review-history-meta`, timestamps.
  - `apps/web/src/features/email-detail/email-detail.css:76-80` —
    selector `.email-detail-meta-value`, ids and counts.
  - `apps/web/src/features/email-detail/email-detail.css:106-110` —
    selector `.email-detail-retained-evidence-meta`, source location
    with line numbers.
  - `apps/web/src/features/email-detail/components/attachment-preflight.css:92-95`
    — selector `.attachment-preflight-filename`, file identifier
    column.
  - `apps/web/src/features/email-detail/components/attachment-preflight.css:97-101`
    — selector `.attachment-preflight-meta`, format and size.
  - `apps/web/src/features/email-detail/components/evidence-viewer.css:57-62`
    — selector `.evidence-viewer-filename`, identifier.
  - `apps/web/src/features/email-detail/components/evidence-viewer.css:64-68`
    — selector `.evidence-viewer-coordinates`, numeric coordinates.
  - `apps/web/src/features/email-detail/components/evidence-viewer.css:109-113`
    — selector `.evidence-viewer-value-content`, extracted values such
    as `22,100 KG` and `1 x 40'HC`.
- Reviewed and intentionally left unchanged — data-styled prose, not
  numeric columns:
  - `.inbox-reason` (`apps/web/src/pages/inbox-page.css:185-189`)
    carries review-reason prose. Its `type-data-sm` markup class
    (`apps/web/src/pages/InboxPage.tsx:49`) is overridden by the
    rule's `font:` shorthand, but the content has no digits to align.
  - `.graph-table-detail`
    (`apps/web/src/features/control-graph/control-graph.css:92-98`)
    carries prose detail such as "Consignee mismatch".
  - `.evidence-viewer-preview-text`
    (`apps/web/src/features/email-detail/components/evidence-viewer.css:126-131`)
    renders source-document preview prose.
  - Skeleton/loading notes, fixture tags, `.category-badge`
    (`apps/web/src/pages/inbox-page.css:158-170`, category label) and
    table `th` labels are text. Error-list items carry `type-data-sm`
    directly in markup (`apps/web/src/pages/InboxPage.tsx:80`).

## Open findings

- `bun run lint` at the worktree root fails: `prettier --check .`
  flags 570 files across `data/`, `docs/` and `apps/web/src`. This is
  pre-existing formatting drift — `docs/DESIGN.md` fails identically
  at HEAD before this change, and all eight CSS files touched here
  pass `prettier --check` individually. Not fixed: reformatting 570
  unrelated files is outside this brief's scope, and the mandated
  one-sentence edit to `docs/DESIGN.md` cannot make that file conform.
- Graph edge state is colour-only on both renderings (see Greyscale
  safety). Reported only — the brief forbids redesign, and restating
  edge state would be a design decision. The verdict remains readable
  via the terminating node's glyph/pill.
- `--stagger` (`apps/web/src/styles/tokens.css:97`) is defined and
  zeroed under reduced motion but has no consumers. Dead token; left
  in place rather than deleted under an audit brief.
- No `test` or `build` script exists at the worktree root, so those
  commands were run in `apps/web`, the package that defines them. The
  root `lint` script is repo-wide prettier; `apps/web` also has an
  `oxlint` lint which passes.
- Verification output:

  `bun install` (worktree root) — pass:

  ```text
  bun install v1.4.0 (34cbb9a40)

  $ husky

  + @commitlint/cli@21.2.2
  + @commitlint/config-conventional@21.2.2
  + husky@9.1.7
  + lint-staged@17.5.1
  + prettier@3.9.8

  80 packages installed [118.00ms]
  ```

  `bun run lint` (worktree root) — fails on pre-existing formatting;
  570 `[warn]` file lines elided below:

  ```text
  $ prettier --check .
  Checking formatting...
  [warn] apps/web/src/components/ui/Controls.test.tsx
  [warn] apps/web/src/components/ui/Controls.tsx
  [warn] apps/web/src/components/ui/Domain.test.tsx
  [warn] apps/web/src/components/ui/Domain.tsx
  [warn] apps/web/src/components/ui/Icons.tsx
  [...]
  [warn] docs/superpowers/plans/2026-09-20-alaskantuna-inbox-evaluation.md
  [warn] Code style issues found in 570 files. Run Prettier with --write to fix.
  error: script "lint" exited with code 1
  ```

  `bun run lint` in `apps/web` (`oxlint`) — pass, no output beyond the
  script line:

  ```text
  $ oxlint
  ```

  `bun run test` in `apps/web` (`vitest run`) — pass:

  ```text
  $ vitest run

   RUN  v5.0.1 /home/user/Documents/Averis/.worktrees/audit-41-code/apps/web

  Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package

   Test Files  41 passed (41)
        Tests  390 passed (390)
     Start at  15:34:04
     Duration  9.81s (environment 40%, tests 39%, setup 8%, import 7%, transform 4%, worker 1%)

  Environment  jsdom was created 41 times · 22.74s total, 40% of tracked time
  ```

  `bun run build` in `apps/web` (`tsc -b && vite build`) — pass:

  ```text
  $ tsc -b && vite build
  vite v8.3.0 building client environment for production...
  transforming...
  ✓ 129 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                              0.74 kB │ gzip:   0.42 kB
  dist/assets/martian-mono-latin-wght-normal-5W32yIyr.woff2   23.55 kB
  dist/assets/archivo-latin-wght-normal-E0tuGl4L.woff2        34.92 kB
  dist/assets/sample-submission-CNojSQiu.json                 75.40 kB │ gzip:   1.66 kB
  dist/assets/index-CB76h2k-.css                              70.96 kB │ gzip:   9.38 kB
  dist/assets/sample-submission-DyawfZoI.js                   75.43 kB │ gzip:   1.69 kB
  dist/assets/inbox-fixture-CDdsQUwm.js                      159.22 kB │ gzip:  16.91 kB
  dist/assets/index-1l2uFAlo.js                              403.74 kB │ gzip: 116.10 kB
  dist/assets/CytoscapeCanvas-kOlVsHXE.js                    437.62 kB │ gzip: 139.00 kB

  ✓ built in 211ms
  ```
