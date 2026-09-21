# Issue 41 browser evidence

Verification record for the issue #41 acceptance criteria, measured in real
browsers against the production build after the fix pass. Capture driver:
`docs/verification/issue-41/capture.mjs`; deployed-build driver:
`docs/verification/issue-41/deployed-check.mjs`. Raw measurements regenerate
into `results.json` / `results-firefox.json` / `results-webkit.json`
(gitignored).

## Method

- App under test: `apps/web` (React 19, Vite 8 production bundle), served with
  `vite preview` on `http://localhost:4173/`.
- Tested commit: HEAD of this change (run the capture to re-stamp
  `results.commit`).
- Browsers: Chromium 153.0.8010.12, Firefox 155.0, and WebKit 26.6
  (Playwright 1.63.0). WebKit's missing host libraries were satisfied
  user-space: the required `.deb`s were extracted under a prefix and the
  shared objects placed in the Playwright bundle's `minibrowser-wpe/lib`
  directory (plus a `libjxl.so.0.8` -> installed `libjxl.so.0.7` soname
  link and Debian's `libbacktrace0`), no sudo needed.
- Authentication: guest-only flow. `authFlowCheck` clicks
  "Sign in as Guest" on `/auth`; verified `landedOn: /inbox`,
  `sessionWritten: true` on all three browsers.
- Themes: light and dark via the app's own mechanism
  (`localStorage["ladinglens-theme"]` + `documentElement.dataset.theme`).
- Viewports: 1920x1080, 1440x900, 390x844.
- Matrix: 10 routes x 3 viewports x 2 themes = 60 primary captures per
  browser, plus 16 state captures (inbox empty / loading / error, email held
  and error, review reconciliation tab, review item detail, graph table
  view).
- Routes: `/`, `/auth`, `/inbox`, `/emails/email_001`, `/review`, `/graph`,
  `/evaluation`, `/ingest`, `/settings`, `/judge`.
- Console errors: zero across all primary captures except `/judge`, which
  logs a 502 for `/api/*` under `vite preview` (no API backend locally;
  environment artifact, verified working on the deployed build below).

## Results after the fix pass

All three browsers (Chromium, Firefox, WebKit), all 60 captures:

- **Horizontal overflow:** document excess = 0 everywhere.
- **Text contrast:** 0 failures (4.5:1 body / 3:1 large floors).
- **UI boundary contrast:** 0 failures (3:1 floor on interactive-element
  borders).
- **Keyboard reachability:** every interactive control reached by Tab; no
  focus traps. The only `tabIndex="-1"` elements are intentional:
  `main#app-content` (skip-link target), the roving review tabs
  (ArrowRight-operable), and the aria-hidden drop-zone input whose visible
  button is reached.
- **Focus ring:** all focused elements resolve to the `--focus-ring` token,
  directly or via the `.field-shell` / tile wrapper. No UA-outline
  fallbacks remain in the Tab sequence.
- **Reduced motion:** 0 nonzero transition/animation durations under
  `prefers-reduced-motion: reduce` on every route, both browsers. The
  provenance jump uses `behavior: 'auto'` under reduce
  (`EmailDetailView.tsx`), covered by tests.
- **Greyscale:** 0 colour-only status encodings; pills keep glyph + label.
- **Light/dark tokens:** both themes render from the same token set; no
  hardcoded hex in component CSS (tokens.css is the only hex source).
- **Tabular numerals:** `font-variant-numeric: tabular-nums` on all numeric
  columns (see code-audit.md for the per-rule list).
- **One primary action per screen:** landing "Get Started", auth "Sign in
  as Guest", ingest "Add to inbox", judge "Check documents", settings
  "Reset All" (secondary trigger + primary confirm inside the dialog),
  email sign-off actions.
- **Tooltips:** `i`-icon triggers open on hover, keyboard focus, and tap
  (`Tooltip` in components/ui/Overlays.tsx); Escape dismisses.
- **Jargon:** no raw enum/identifier strings in UI chrome copy. Remaining
  uppercase tokens are record identifiers and fixture data values
  (`email_001`, `case_email_507`, `PO_25_*`, port names) rendered in the
  data typeface — the content of the demo, not interface copy.

## Fixes applied in this pass

- `.site-foot-link` colour `--text-tertiary` -> `--text-secondary`
  (footer links 4.34:1 -> ~9:1 on the sunken footer).
- `.app-skip` border `--border-default` -> `--border-strong`.
- `.app-nav-link--settings` separator `--border-default` ->
  `--border-strong`.
- `.ingest-tile` border `--border-default` -> `--border-strong`.
- `.ingest-handoff-link` border `--state-held-border` ->
  `--state-held-solid`.
- `.attachment-preflight-table-wrap:focus-visible` now paints the
  `--focus-ring` token (scroll region was falling back to the UA outline).
- `.demo-artifacts-links a:focus-visible` now paints the `--focus-ring`
  token (judge "Open ..." links).
- Landing copy: raw `NEEDS_REVIEW` enum replaced with "come back for
  review"; orphaned `.land-data` rule removed.
- `capture.mjs` extended: `/ingest`, `/settings`, `/judge` added to the
  route matrix; `BROWSER`, `RESULTS_NAME`, `SCREENS_DIR` env switches.

## Deployed build

`deployed-check.mjs` against
`https://averis-222536409832.asia-southeast1.run.app`:

- Guest auth: "Sign in as Guest" lands on `/inbox`.
- `/judge` renders publicly (no session required for the shell).
- Live judge run: uploaded `email_377_SI.txt` + `email_378_BL.txt` from the
  synthetic bundle, ticked the synthetic-data confirmation, submitted; the
  live pipeline returned "6 fields differ: Shipper, Consignee, Notify
  party, Port of discharge, Container count, Gross weight (kg)" with the
  full field-comparison grid. No fallback needed; the `PREPARED FALLBACK`
  panel mounts only on run failure by design.
- `/settings` Reset All: confirm dialog -> "Demo data reset. You are on a
  clean workspace."; inbox re-renders post-reset.
- Screenshot: `screens/judge-deployed-1440x900.png`.

## Open items / nonblocking findings

- At 390px the rail-collapse topbar nav strip scrolls horizontally by
  design (`overflow-x: auto`); the document does not overflow.
- Internal scrollers (attachment preflight table, reconciliation table)
  scroll inside their regions at narrow widths.
- `/judge` under local `vite preview` logs one 502 console error per
  capture (no API backend); the deployed build returns live results.
- Graph edge state on the canvas is carried by colour alone; the state
  remains readable via the terminating node's glyph/pill and the
  accessible table view restates it. Design-level item, unchanged.
