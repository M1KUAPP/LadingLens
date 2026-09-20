# Issue 41 browser evidence

Evidence-only audit of the LadingLens web app against the issue #41 browser
acceptance criteria. All numbers below were measured in a real browser against
the production build; nothing under `apps/web/src` was changed.

## Method

- App under test: `apps/web` (React 19, Vite 8 production bundle).
- Tested commit: `b44fd2f0bb947d16803d2f6cb27f94c8e51efa0f`.
- Browser: Chromium 151.0.7922.34 (Playwright 1.63.0 headless shell).
- Setup: `bun install`, `bun run build`, production bundle served with
  `vite preview` on `http://localhost:4173/`.
- Authentication: guest-only flow. The script submits the `/auth`
  "Sign in as Guest" button, which writes `ladinglens-guest-session` to
  sessionStorage and lands on `/inbox`. Verified `landedOn: /inbox`,
  `sessionWritten: true`.
- Themes: light and dark, driven through the app's own mechanism
  (`localStorage["ladinglens-theme"]` + `documentElement.dataset.theme`).
- Viewports: 1920x1080, 1440x900, 390x844.
- Matrix: 7 routes x 3 viewports x 2 themes = 42 primary captures, plus 16
  state captures (inbox empty / loading / error, email held and error,
  review reconciliation tab, review item detail, graph table view; each in
  both themes).
- Email id: taken from the first inbox row link (`/emails/email_001`), not
  guessed. The held state was exercised separately on `/emails/email_507`,
  the fixture whose preflight refuses a missing draft bill of lading.
- Capture driver: `docs/verification/issue-41/capture.mjs`. Raw measurements
  are written to `results.json` (regenerated on each run, not committed).
- Console errors: zero across all 42 primary captures.

Limitations:

- The full headed Chromium download failed with `ENOSPC` (the 1 GB `/tmp`
  tmpfs was nearly full); the already-cached headless shell build
  151.0.7922.34 was used instead. Headless vs headed does not change
  computed style, layout, or traversal measurements.
- Contrast uses computed `color`/`background-color` and the WCAG sRGB
  luminance formula; alpha colors are composited over the measured
  background before scoring.
- The boundary scan covers interactive elements (links, buttons, field
  triggers, scroll regions). The `.field-shell` div that draws input
  borders is a wrapper, not an interactive element, so its border was
  measured in a separate probe and is reported per route below.
- Control-graph node labels are painted onto an HTML5 `<canvas>`; they are
  visible in screenshots but are not DOM text, so the jargon extractor can
  only enumerate them via the table view.

## Results by route

### Landing

Route `/`, `SiteShell` (public chrome with footer).

- **Horizontal overflow:** `documentElement.scrollWidth` equals the viewport
  at all three sizes (1920, 1440, 390); document excess = 0. No offenders.
- **Keyboard reachability:** 8 focusable elements reached by Tab, 0
  unreached, no focus trap.
- **Focus ring:** 7 of 8 focused elements resolve to the `--focus-ring`
  token (`0 0 0 3px #4f46e573`, computed `rgba(79, 70, 229, 0.45)` 3px).
  `a.site-foot-brand` does not: computed `box-shadow: none`, falling back to
  the UA outline `auto 1px rgb(16, 16, 16)`.
- **Reduced motion:** 0 elements with nonzero `transition-duration` or
  `animation-duration` under `reducedMotion: 'reduce'`. Normal mode has 8
  elements with nonzero durations (`.hero-film-poster` /
  `.hero-film-video` 0.32s; `.land-go`, theme toggle, footer links 0.12s).
- **Greyscale:** 0 elements flagged; no status/verdict element depends on
  colour alone.
- **Contrast:** light theme — 4 text failures, all `a.site-foot-link`
  footer links at 4.34:1 vs the 4.5 floor (`rgba(100, 116, 139)` on
  `rgba(241, 245, 249)`, 14px weight 400): "Landing", "Live demo",
  "Sign in", "GitHub". Dark theme — no text failures. No boundary
  failures sampled on either theme.
- **Post-auth footer:** n/a (public route). 1 footer element rendered,
  `footer.site-foot`, as designed.
- **Jargon:** `NEEDS_REVIEW` appears raw in visible copy: "Decisions
  without enough evidence return NEEDS_REVIEW; a named person keeps
  release authority."

### Auth

Route `/auth`, guest-only sign-in.

- **Horizontal overflow:** excess = 0 at 1920, 1440 and 390. No offenders.
- **Keyboard reachability:** 4 elements reached (two `input.field-input`
  controls, the "Sign in as Guest" primary button, then the sequence wraps
  to the first input). 0 unreached, no trap.
- **Focus ring:** the submit button resolves to the `--focus-ring` token
  directly. Both inputs compute `box-shadow: none`, but their
  `.field-shell` wrapper paints the token ring on `:focus-visible`
  (measured `rgba(79, 70, 229, 0.45) 0px 0px 0px 3px` plus a
  `rgb(79, 70, 229)` border), so the indicator is present.
- **Reduced motion:** 0 nonzero durations under reduce; 1 element with
  nonzero duration in normal mode (primary button, 0.12s).
- **Greyscale:** 0 flagged; no status elements on this route.
- **Contrast:** 0 text failures on either theme. Boundary probe:
  `.field-shell` input border measures 2.56:1 in light
  (`rgb(148, 163, 184)` on `rgb(255, 255, 255)`) and 2.18:1 in dark
  (`rgb(61, 77, 90)` on `rgb(12, 17, 21)`) — below the 3:1 floor for a UI
  boundary.
- **Post-auth footer:** 0 footer elements.
- **Jargon:** none extracted.

### Inbox

Route `/inbox`, `AppShell`.

- **Horizontal overflow:** document excess = 0 at all three viewports.
  Internal scrollers at 390: `div.app-side` nav strip scrolls horizontally
  (`scrollWidth` 548 vs `clientWidth` 358), so "Control graph",
  "Evaluation" and "Settings" are initially clipped; the hidden table
  `thead`/`tr` in the card layout measure 234 vs 1 (visually-hidden
  measurement artifact, not visible overflow). At 1440 several
  `span.inbox-subject` cells clip text (`scrollWidth` 619–807 vs
  `clientWidth` 592) under `text-overflow: ellipsis`.
- **Keyboard reachability:** 68 focusable elements reached, 0 unreached,
  no focus trap.
- **Focus ring:** 10 elements resolve to the token directly and 5 field
  controls via the `.field-shell` wrapper (search input; Category, Status,
  Sort, Density combobox triggers). 53 focused controls fall back to the
  UA outline (`box-shadow: none`, `auto 1px` outline): `a.app-brand`, and
  `a.inbox-download`, plus all 50 `a.inbox-id` row links
  (`email_001`–`email_050`); `a.app-brand` appears twice because the Tab
  sequence wraps.
- **Reduced motion:** 0 nonzero durations under reduce; 3 nonzero in
  normal mode (theme toggle, Previous, Next — 0.12s).
- **Greyscale:** 0 flagged. Status pills keep glyph + text label
  (`✓ OK`), verified visually in greyscale probes.
- **Contrast:** text — disabled `button.button--secondary "Previous"`
  measures 2.34:1 in light (`rgba(148, 163, 184)` on `rgba(241, 245, 249)`,
  13px w500) and 1.76:1 in dark (`rgba(61, 77, 90)` on `rgba(28, 38, 48)`),
  vs the 4.5 floor. Boundary — 13 sampled edges below 3:1:
  `a.app-nav-link--settings` separator 1.48:1 light / 1.51:1 dark; enabled
  `button--secondary` (Next/Previous) and `tooltip-trigger` borders
  2.56:1 light / 2.18:1 dark; the disabled Previous border 1.48:1 /
  1.51:1. The `.field-shell` input borders measure 2.56:1 / 2.18:1.
- **Post-auth footer:** 0 footer elements.
- **Jargon:** 75 raw-token candidates on the page: `email_001`–`email_050`
  identifiers in the ID column, and subject-line location tokens including
  `AED_26`, `ALI_UAE`, `AQABA_JORDAN`, `ASHDOD_ISRAEL`,
  `BRISBANE_AUSTRALIA`, `BUSAN_SOUTH`, `CALLAO_PERU`, `CITY_VIETNAM`,
  `CONAKRY_GUINEA`, `KOPER_SLOVENIA`, `MERSIN_TURKEY`, `MOMBASA_KENYA`.
  The `PREPARED FIXTURE` provenance tag is also internal phrasing.
- **States:** empty renders "No emails match the current filters."
  (excess 0); loading renders the skeleton; error renders "The prepared
  inbox data could not be verified".

### Email detail

Route `/emails/email_001` (id taken from inbox row 1).

- **Horizontal overflow:** document excess = 0 at all viewports. Internal
  scrollers at 390: `div.app-side` 548 vs 358 (nav strip) and
  `div.attachment-preflight-table-wrap` 411 vs 300 — the preflight table
  scrolls horizontally inside its card.
- **Keyboard reachability:** 32 elements reached, 0 unreached, no trap.
- **Focus ring:** 30 of 32 resolve to the token (nav links, tooltip
  triggers, provenance anchor buttons, scroll regions, action buttons).
  `a.app-brand` falls back to the UA outline (measured `box-shadow: none`,
  `auto 1px rgb(16, 16, 16)`); it appears twice because the sequence wraps.
- **Reduced motion:** 0 nonzero durations under reduce; 4 nonzero in
  normal mode (theme toggle plus Approve sign-off / Correct values /
  Reject with reason, 0.12s).
- **Greyscale:** 0 flagged; MATCH/MISMATCH verdicts keep glyph + label.
- **Contrast:** light — 0 text failures. Dark — 6 text failures, all at
  3.35:1 (`rgba(255, 247, 237)` on `rgba(234, 88, 12)`, the MISMATCH row
  fill): `span.status-pill-text "MISMATCH"` (11px w500),
  `span.field-row-name "CONSIGNEE"` (10px w500), two
  `span.field-row-source` labels (14px), and two
  `button.provenance-anchor-jump` values "MOORIM SP CO., LTD" /
  "MOORIM PAPER CO., LTD" (13px). Boundary — 25 edges below 3:1:
  settings separator 1.48:1 / 1.51:1; tooltip triggers 2.56:1 light /
  2.18:1 dark on canvas, 2.45:1 / 1.96:1 on raised fills, and 2.08:1 /
  1.83:1 on the held-tinted fill (`rgba(224, 231, 255)` /
  `rgba(30, 27, 75)`); secondary buttons on the tinted fill also
  2.08:1 / 1.83:1.
- **Post-auth footer:** 0 footer elements.
- **Jargon:** raw enum/identifier strings visible: `MISMATCH` (page
  status pill), `BL_COMPARISON` (category), `email_001` (identifier,
  twice), artifact filenames `email_001_SI.txt` / `email_001_BL.txt`,
  `IN_REVIEW` (disposition), ISO timestamps `2026-09-18T10:14:08Z` /
  `2026-09-18T10:15:20Z` in review history. Held fixture `email_507`
  shows the same pattern plus `NEEDS_REVIEW` (status pill),
  `email_507_SI.txt`, `PARSED`/`MISSING`/`UNKNOWN` row statuses, and
  `2026-09-18T11:20:04Z`.
- **States:** held state on `email_507` renders the refusal banner and 28
  held-related elements (excess 0); error state on `email_999` renders
  "Record not found for email: email_999".

### Review

Route `/review`, queue tab + reconciliation tab.

- **Horizontal overflow:** document excess = 0 at all viewports. The
  reconciliation view contains a wide internal table:
  `table.recon-outcomes-table` measures 1256px wide with right edge at
  1643px inside a horizontal scroll region; the document itself does not
  overflow. At 390 the `div.app-side` nav strip scrolls (548 vs 358).
- **Keyboard reachability:** 26 elements reached on the queue view.
  `button#review-tab-reconciliation` carries `tabIndex="-1"` as the
  roving tab in the tablist — it is not Tab-reachable but activates via
  ArrowRight (verified: focus lands on it and the URL becomes
  `/review?tab=reconciliation`). Reconciliation view: 22 reached; the two
  unreached controls are the roving `review-tab-queue` (expected) and
  `input.drop-zone-input` (`tabIndex="-1"`, `aria-hidden` — its visible
  `button.drop-zone-surface` is the keyboard path and is reached). No
  focus traps.
- **Focus ring:** 24 of 26 queue-view elements resolve to the token,
  including `a.rq-item-link` item links and all Inspect buttons.
  `a.app-brand` falls back to the UA outline (twice, due to wrap).
- **Reduced motion:** 0 nonzero durations under reduce; 17 nonzero in
  normal mode (tabs, Inspect buttons, theme toggle — 0.12s).
- **Greyscale:** 0 flagged; queue status pills keep glyph + label.
- **Contrast:** queue view — 0 text failures; 9 boundary edges below 3:1
  (settings separator 1.48:1 / 1.51:1; selected `review-tab-queue` and
  tooltip borders 2.56:1 / 2.18:1). Reconciliation view — 7 additional
  text failures at 3.86:1 (`rgba(100, 116, 139)` on `rgba(224, 231, 255)`,
  11px w500 labels on the missing-case peek panel): "Expected shipment",
  "Shipment", "Booking reference", "Lifecycle", "Required documents",
  "Cutoff", "Owner".
- **Post-auth footer:** 0 footer elements.
- **Jargon:** queue view shows raw ids `case_email_507`,
  `case_email_511`, `case_email_516`, `case_ambiguous_01`, `EMAIL_507`,
  `EMAIL_511`, `EMAIL_516`, `EMAIL_AMBIGUOUS`, `CASE_EMAIL_013`,
  `rec_booking_syn_bk_099`, `rec_case_email_013`, `rec_syn_021`,
  `rec_syn_033`, `rec_syn_042`, `rec_syn_088`. The item detail drawer
  titles `case_email_507`, `email_507`, ISO `2026-09-18T11:20:04Z`.
  Reconciliation view adds `BL_CHECK_REQUIRED` (x6), `DRAFT_BL` (x11),
  `DRAFT_BL_EXPECTED` (x5), field names `booking_reference` (x5),
  `booking_reference_claim`, `source_freshness`, artifact
  `expected_shipments` (.csv), `run_prepared_001`, match-basis strings
  `shipment:SYN-001`, `case:case_email_013`,
  `booking_reference:SYN-BK-001`, freshness values `CURRENT`/`STALE`,
  outcome labels `CASE_PRESENT`, `DOCUMENT_MISSING`, `MISSING_CASE`,
  `UNMATCHED_CASE`, `DUPLICATE_OR_AMBIGUOUS`, and
  `Candidates: SYN-099A, SYN-099B`.
- **States:** reconciliation tab and item detail drawer both captured;
  see keyboard/contrast notes above.

### Graph

Route `/graph`, canvas view default, table view toggled for extraction.

- **Horizontal overflow:** document excess = 0 at all viewports. At 390
  the `div.app-side` nav strip scrolls (548 vs 358). The
  `p.graph-canvas-description` element measures `scrollWidth` 951 vs
  `clientWidth` 1 — a visually-hidden accessibility description, not
  visible overflow.
- **Keyboard reachability:** 12 elements reached, 0 unreached, no trap.
- **Focus ring:** 10 of 12 resolve to the token; `a.app-brand` falls back
  to the UA outline (twice, wrap).
- **Reduced motion:** 0 nonzero durations under reduce; 3 nonzero in
  normal mode (theme toggle, Graph canvas / Table view buttons).
- **Greyscale:** 0 flagged. Canvas node types differ by shape as well as
  colour (visible in the greyscale screenshots); the table view's outcome
  pills keep glyph + label.
- **Contrast:** 0 text failures; 9 boundary edges below 3:1 (settings
  separator 1.48:1 / 1.51:1; `button--secondary` and tooltip borders
  2.56:1 light / 2.18:1 dark).
- **Post-auth footer:** 0 footer elements.
- **Jargon:** node labels are painted on the HTML5 canvas (raw ids
  visible in screenshots; not DOM text). The table view exposes:
  `email_001`, `email_004`, `email_009`, `email_013`, `email_507`,
  `email_511`, `email_516`, `email_ambiguous`, `att_507_bl_missing`,
  `exc_email_001_consignee`, `exc_email_507_missing_attachment`,
  `exc_email_511_unreadable`, `exc_email_516_missing_value`,
  `exc_email_ambiguous`, `exc_syn_021`, `exc_syn_033`, `exc_syn_042`,
  `EMAIL_511_BL`, `BL_CHECK_REQUIRED`, `CASE_PRESENT`,
  `DOCUMENT_MISSING`, `DRAFT_BL_EXPECTED`, `MISSING_CASE`,
  `UNMATCHED_CASE`, `source_freshness`, `shipment:SYN-001`,
  `case:case_email_013`, and location tokens `CALLAO_PERU`,
  `CONAKRY_GUINEA`, `KOPER_SLOVENIA`, `MERSIN_TURKEY`, `MOMBASA_KENYA`.
- **States:** graph table view captured (14 focusable reached, excess 0).

### Evaluation

Route `/evaluation`, `AppShell`.

- **Horizontal overflow:** document excess = 0 at all viewports; at 390
  the `div.app-side` nav strip scrolls (548 vs 358).
- **Keyboard reachability:** 10 elements reached, 0 unreached, no trap.
- **Focus ring:** 8 of 10 resolve to the token; `a.app-brand` falls back
  to the UA outline (twice, wrap).
- **Reduced motion:** 0 nonzero durations under reduce; 1 nonzero in
  normal mode (theme toggle, 0.12s).
- **Greyscale:** 0 flagged; status pills keep glyph + label.
- **Contrast:** light — 0 text failures. Dark — 3 text failures at
  3.35:1 (`rgba(255, 247, 237)` on `rgba(234, 88, 12)`, 11px w500 pill
  text): "MISMATCH", "DOCUMENT MISSING", "MISSING CASE". Boundary —
  5 edges below 3:1 (settings separator 1.48:1 / 1.51:1; tooltip border
  2.56:1 / 2.18:1).
- **Post-auth footer:** 0 footer elements.
- **Jargon:** raw enum `MISMATCH` appears in the comparison-outcomes and
  processed-status counts. Outcome labels `CASE_PRESENT`,
  `DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`,
  `DUPLICATE_OR_AMBIGUOUS`, `SOURCE STALE` render as spaced mapped labels
  in caps. Other internal strings: shipment ids `SYN-001`, `SYN-007`,
  `SYN-013`, `SYN-021`, `SYN-033`, `SYN-042`; "Awaiting fresh
  Gemini 3.5 Flash benchmark" names the model; "per-case pipeline time"
  and "end-to-end inbox throughput" are engineering phrasing;
  `PREPARED FIXTURE` provenance tag.

## Out of scope

- `/judge` — not yet implemented, out of scope. The landing "Open live
  demo" link routes to this placeholder; recorded as evidence, not a
  failure.
- `/settings` — not yet implemented, out of scope. The `AppShell` nav
  renders a "Settings" link that targets the unimplemented route;
  recorded as evidence, not a failure.

## Failures to fix

Measured violations of the issue #41 acceptance criteria:

- **Text contrast below 4.5:1.**
  - Landing, light: four `a.site-foot-link` footer links at 4.34:1.
  - Inbox: disabled `Previous` button at 2.34:1 (light) / 1.76:1 (dark).
  - Email detail, dark: six elements at 3.35:1 on the MISMATCH row fill
    (`MISMATCH` pill, `CONSIGNEE` label, two field-source labels, two
    provenance values).
  - Evaluation, dark: three status-pill labels at 3.35:1.
  - Review, reconciliation view: seven peek-panel labels at 3.86:1.
- **UI boundary contrast below 3:1** (sampled edges per capture):
  - `a.app-nav-link--settings` separator on every post-auth route:
    1.48:1 light / 1.51:1 dark.
  - `button.button--secondary` borders: 2.56:1 light / 2.18:1 dark on
    canvas; 2.08:1 / 1.83:1 on the email held-tinted fill; disabled
    state 1.48:1 / 1.51:1.
  - `button.tooltip-trigger` borders: 2.56:1 / 2.18:1 on canvas,
    2.45:1 / 1.96:1 on raised fills, 2.08:1 / 1.83:1 on tinted fills.
  - `.field-shell` input borders (auth, inbox): 2.56:1 light /
    2.18:1 dark.
  - `button#review-tab-queue` border: 2.56:1 / 2.18:1.
  - The `--focus-ring` indicator itself composites to ~2.1:1 on the
    light canvas and ~1.5:1 on the dark canvas — below 3:1 for a focus
    indicator.
- **Focus indicators that differ from `--focus-ring`:** these controls
  compute `box-shadow: none` and fall back to the UA `auto 1px` outline:
  `a.app-brand` (all post-auth routes), `a.inbox-download` and all 50
  `a.inbox-id` row links (inbox), `a.site-foot-brand` (landing).
- **Horizontal overflow:** none — document excess was 0 on all 42
  captures.
- **Keyboard reachability:** no unreachable interactive control and no
  focus trap; the only `tabIndex="-1"` items are the roving review tabs
  (ArrowRight-operable) and the aria-hidden drop-zone input whose visible
  button is reachable.
- **Reduced motion:** no failures — 0 nonzero durations under reduce on
  every route.
- **Greyscale:** no failures — 0 colour-only status encodings.
- **Post-auth footer:** no failures — 0 footers on all five post-auth
  routes.

## Nonblocking findings

Cosmetic or usability observations that do not violate the measured
criteria:

- At 390px the horizontal `div.app-side` nav strip (548 vs 358) clips
  "Control graph", "Evaluation" and "Settings" until scrolled — designed
  `overflow-x: auto`, no document overflow.
- Internal horizontal scrollers: the email attachment table (411 vs 300
  at 390) and the reconciliation results table (1256px wide, right edge
  1643px) scroll inside their regions.
- Inbox subject cells ellipsize at 1440 (`scrollWidth` 619–807 vs
  `clientWidth` 592); intended truncation, not overflow.
- Raw internal identifiers are visible throughout the post-auth UI —
  `email_*`, `case_*`, `rec_*`, `exc_*`, `att_*`, `SYN-*` ids, enum
  labels (`BL_COMPARISON`, `MISMATCH`, `NEEDS_REVIEW`, `IN_REVIEW`,
  `BL_CHECK_REQUIRED`, `DRAFT_BL_EXPECTED`, `MISSING_CASE`,
  `UNMATCHED_CASE`, `DUPLICATE_OR_AMBIGUOUS`), field names
  (`source_freshness`, `booking_reference`), artifact names
  (`email_001_SI.txt`, `expected_shipments` csv, `run_prepared_001`),
  ISO timestamps, and subject-line location tokens (`CALLAO_PERU`,
  `AQABA_JORDAN`, ...). Exact strings are listed per route above.
- `PREPARED FIXTURE` / `PREPARED RECORD` provenance tags use internal
  phrasing.
- Normal-mode transitions exist on 1–17 elements per route (0.12s UI
  transitions; hero media 0.32s on landing) but all collapse to 0s under
  reduced motion.
- The visually-hidden graph description paragraph and the inbox table
  `thead` (in 390 card layout) report `scrollWidth` > `clientWidth` as
  measurement artifacts; they are not visible overflow.
