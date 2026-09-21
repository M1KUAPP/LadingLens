# Landing And Auth Redesign Design

**Status:** Pre-authorized on 21 September 2026 through the session goal,
which runs the whole workflow (research, plan, build, PR, merge) without an
approval stop. The decisions below are recorded for review on the PR.

The public landing (`/`) becomes a scroll-scrubbed film built from the
MotionSites "Vectrus Energy" prompt, and the guest sign-in (`/auth`) becomes
the split layout of the shadcn/studio admincn "login-v3" page. Both keep
LadingLens's own copy, tokens, type and guest-only rules.

[TOC]

## Goals

- Replace the one-screen landing with the reference's 500vh scroll track: a
  sticky full-viewport film whose playhead follows scroll, three sequential
  text scenes, a colour-flipping navigation bar and a full-screen menu.
- Scrub smoothly: decoded frames drawn to a canvas (WebCodecs frame bank),
  with `video.currentTime` seeking as the fallback, exactly as the reference
  specifies.
- Replace the two-pane auth screen with login-v3's split layout: the form
  column on the left and, from 1024px, a silk-textured panel with a notched
  card on the right.
- Keep every guest-only invariant of `/auth` and every product claim the
  current landing makes.

## Non-goals

- No Tailwind, no Next.js, no new icon set, no motion library. The app stays
  plain CSS on the design tokens, with Hugeicons for UI glyphs.
- No social sign-in, forgotten-password, remember-me or registration controls.
  The demo has no accounts, so each would be a dead control.
- No change to the operator shell, the judge workspace or the guest-session
  seam.

## Sources

- `vectrus-energy-prompt.md`, the full MotionSites prompt behind
  `https://motionsites.ai/?prompt=vectrus-energy`. Taken: page architecture,
  scroll-progress formula, scene opacity curves, `Stagger`, navigation and
  menu-overlay geometry, the `useVideoScrub` constants and frame-bank method,
  the video. Left: the Vectrus copy and brand names, the webfont, Tailwind.
- admincn `src/views/pages/auth/login-v3/index.tsx`,
  `shared/auth-layout-v3.tsx`, `login-v1/login-form.tsx`,
  `components/ui/silk.tsx` and `assets/svg/auth-panel-shape.tsx`. Taken: the
  grid, the column widths and gaps, the silk canvas, the notched card and its
  logo notch, the overlapping-circle row. Left: social buttons, the separator,
  remember-me, forgotten-password and sign-up links, member avatars and counts.
- `docs/research/build/scroll-scrubbed-video.md` for the API facts behind
  the frame bank.

## Decisions

| Question           | Decision                                                                                                                                       | Why                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Film               | The reference's CloudFront MP4, unchanged URL                                                                                                  | The brief pins it; it descends from cloud to a container ship, which is our subject; CORS is open; no watermark. MotionSites publishes no licence for it (see [Risks](#risks)) |
| Webfont            | Archivo Variable, already self-hosted, at weights 200 to 500                                                                                   | DESIGN.md forbids a runtime font CDN; the prompt's Helvetica Neue ME comes from a third-party host with no licence shown                                                       |
| Copy               | LadingLens copy mapped onto the three scenes                                                                                                   | The reference copy sells an energy company                                                                                                                                     |
| Styling            | Plain CSS on tokens; Tailwind classes translated                                                                                               | The app has no Tailwind                                                                                                                                                        |
| Icons              | Hugeicons: `ArrowRight02`, `ArrowDown02`, `ArrowUp01`, `Cancel01`                                                                              | DESIGN.md names Hugeicons for UI glyphs                                                                                                                                        |
| Film colours       | New theme-invariant tokens `--film-ink` (#1D3045), `--film-paper` (#FFFFFF), `--film-sky` (#CFD4DD), `--film-halo-ink` and `--film-halo-paper` | Text must stay navy on bright cloud in both themes; no hex outside `tokens.css`                                                                                                |
| Nav flip           | White from `p > 0.70`, not the reference's `0.55`                                                                                              | Measured below: the frame stays pale until about 7.0 s                                                                                                                         |
| Faded spans        | Scene 2 spans at 80% and 60% ink, not 80% and 50%                                                                                              | 50% measures 2.55:1 on the cloud, under the 3:1 large-text floor; 60% measures 3.2:1                                                                                           |
| Scene 3 small type | Full white, not 60% or 80%                                                                                                                     | On the dark frames only full white clears 4.5:1                                                                                                                                |
| Footer             | Keep the fold-over `SiteShell` footer after the track                                                                                          | It carries the brand and GitHub link, and is tested                                                                                                                            |
| Theme toggle       | Removed from the landing                                                                                                                       | The film sets the ground; a theme change would not show                                                                                                                        |
| Smooth scroll      | `html:has(.land)` only, and only without reduced motion                                                                                        | A global rule would animate every route change                                                                                                                                 |
| Auth controls      | One button, `Sign in as Guest`; the logo links home; one text link to `/judge`                                                                 | Guest-only rule; no dead controls                                                                                                                                              |
| Silk colour        | New token `--silk-tint` (#4A6680)                                                                                                              | White panel copy measures 6.0:1 at the brightest silk                                                                                                                          |
| Card radius        | New token `--radius-xl` (16px)                                                                                                                 | login-v3's panel and notched card use 14 to 18px corners                                                                                                                       |
| Demuxer            | mp4box.js 2.4.1: ES module with its own types, `createFile(true)`                                                                              | 0.5.x is untyped CommonJS; since 1.0 `createFile()` drops the sample bytes                                                                                                     |
| Bitmap cache       | 8 `ImageBitmap`s, not the reference's 24                                                                                                       | Each 1080p bitmap holds 8.3 MB, so 24 is 199 MB; the warm window needs 4                                                                                                       |
| Timeline           | Frame timestamps shifted to start at 0                                                                                                         | The clip's edit list presents its first frame 83 ms in; the video element starts at 0                                                                                          |

Film luminance behind the chrome and text, sampled from the MP4 (average
colour of the region, contrast against the text colour):

| Time         | Region             | Colour  | Navy  | White |
| ------------ | ------------------ | ------- | ----- | ----- |
| 0.0 to 4.0 s | whole frame        | #CFD4DD | 9.0:1 | 1.5:1 |
| 5.5 s        | nav strip          | #C4CAD2 | 8.2:1 | 1.7:1 |
| 6.8 s        | nav strip          | #B5C4D2 | 7.6:1 | 1.8:1 |
| 7.5 s        | nav strip          | #8AA8BE | 5.4:1 | 2.5:1 |
| 8.5 s        | scene 3 text       | #5A768A | 2.8:1 | 4.8:1 |
| 10.0 s       | nav, right cluster | #627E93 | 3.2:1 | 4.3:1 |

The nav strip never gets dark enough for white small text to reach 4.5:1,
and navy falls under it on the right-hand cluster at the end. Chrome text
over the film therefore carries a soft halo in the ink's opposite colour
(`--film-halo-*`), and the flip waits for the frame to turn. This is a
stated gap against the DESIGN.md floor for text laid directly on video, not
a claimed pass.

## Landing

### Landing structure

```text
main.land
└── div.land-track (500vh, relative)
    ├── span#top, #reconcile, #review  anchors at 0, 190vh, 350vh
    └── div.land-stage (sticky, 100vh, overflow hidden)
        ├── video.land-video           fallback, drawn until the canvas is live
        ├── canvas.land-canvas         1920x1080, object-fit cover
        └── div.land-overlay           pointer-events none
            ├── LandingNav
            └── three scenes
```

The landing stays inside `SiteShell`, so the footer folds out after the
track ends and the scroll progress is already clamped to 1.

### Scroll progress and scenes

`p = clamp(0, 1, scrollY / (track.offsetHeight - innerHeight))`, recomputed
on resize and orientation change. The scene opacities are the reference's:

- Scene 1: 1 until 0.20, then down to 0 by 0.28.
- Scene 2: 0 until 0.32, up to 1 by 0.40, 1 until 0.55, down to 0 by 0.63.
- Scene 3: 0 until 0.67, up to 1 by 0.75, then 1.

A scene's children stagger in once its opacity passes 0.3 (opacity 0 to 1,
`translateY(24px)` to 0, 0.8s `cubic-bezier(0.16, 1, 0.3, 1)`). At opacity 0
a scene takes no pointer events, and its links leave the tab order and the
accessibility tree. Its text stays readable to assistive technology.

The anchors sit at the middle of each scene's full-opacity window: `#top` at
p = 0, `#reconcile` at p = 0.475 (190vh of the 400vh span) and `#review` at
p = 0.875 (350vh).

### Scene content

| Scene | Element     | Copy                                                                                                              |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| 1     | H1          | Account for every shipping document.                                                                              |
| 1     | Subtitle    | Every email captured and accounted for                                                                            |
| 1     | Circle link | ArrowRight to `#reconcile`, named "Next: reconciliation"                                                          |
| 2     | H2          | Expected shipments reconciled / to the case ledger (80%) / independently of the inbox (60%)                       |
| 2     | Column      | ArrowDown to `#review` ("Next: human review"); three dots, the second active; ChevronUp to `#top` ("Back to top") |
| 3     | Eyebrow     | `NEEDS_REVIEW` (data font) &#124; Human authority                                                                 |
| 3     | H2          | Held for review, / released by a person.                                                                          |
| 3     | CTA         | Enter the demo, to `/auth`, with the white 40px arrow circle                                                      |

These restate the three facts the current landing states: every incoming
email is captured and accounted for; expected shipments are reconciled to
the case ledger independently of the inbox; decisions without enough
evidence return `NEEDS_REVIEW` and a named person keeps release authority.

### Navigation and menu

- Left cluster, 1024px and up: LadingLens (`#top`, current, 2px underline),
  Reconciliation (`#reconcile`), Human review (`#review`), Live demo
  (`/judge`), GitHub (the repository, new tab).
- Right cluster, 640px and up: Get Started (`/auth`) with a 20px disc in the
  current ink holding an arrow in the opposite ink; below 1024px a Menu
  button.
- Below 1024px a three-bar hamburger opens the menu.
- The menu is a modal dialog: full-screen `--film-ink`, the same five links
  large and staggered, Get Started in its footer, a 40px close circle. Open
  focuses the close button and hides body overflow; Escape or close returns
  focus to the trigger. Closed, it stays mounted, `inert` and `aria-hidden`,
  like the operator drawer.
- Entrance: links from `translateY(-12px)` and opacity 0 over 0.6s, delayed
  `300 + i * 80` ms; the right cluster at 700ms. CSS animations, no timers.
- Ink is `--film-ink` until `p > 0.70`, then `--film-paper`, over 500ms.

### Film scrubbing

`useVideoScrub(src)` owns one animation-frame loop:

1.  `dt = min(0.1, seconds since last frame)`; read `p`; publish it.
1.  `target = p * duration`. Reduced motion jumps `current` to `target`;
    otherwise `current += (target - current) * (1 - exp(-dt * 8))`, snapping
    once within 0.002 s.
1.  With the frame bank ready, draw the nearest decoded frame. Otherwise, if
    the video is not seeking and is more than 0.01 s off, set
    `video.currentTime = current`.

The frame bank builds after `window` load, and never under reduced motion,
without `VideoDecoder`, or when `VideoDecoder.isConfigSupported()` refuses
the clip's H.264 profile (`avc1.640028`, 1920x1080); those checks run before
any download. It fetches the MP4, demuxes it with mp4box.js, decodes with
WebCodecs from the first key sample (holding at most 24 frames ahead of
encoding), paints each frame to an offscreen canvas and stores it as a WebP
blob, or JPEG where the browser cannot encode WebP, with its timestamp
shifted so the first frame is 0. Drawing binary-searches the timestamps and
keeps an LRU of 8 `ImageBitmap`s around the playhead, closing each one it
evicts and any that arrives after its slot was evicted. The first
painted frame fades the canvas in over 300ms. A failed hardware decode
retries once with `prefer-software`; a 60 s watchdog reverts to seeking and
hides the canvas. The module loads with a dynamic import, so mp4box.js stays
out of the entry chunk.

### Landing accessibility

- One `h1` (scene 1); scenes 2 and 3 are `h2`.
- `prefers-reduced-motion`: no frame bank, no lerp, no stagger or entrance
  animation, no smooth scroll. Every link still works.
- The film layers are `aria-hidden`. The video has no controls and is never
  played; its position only follows scroll.

## Auth

### Auth layout

`min-height: 100dvh`; from 1024px a two-column grid of equal tracks. The
form column centres a 32rem stack with 24px gaps and 24px padding. The panel
column is hidden below 1024px, has a 20px `--surface-sunken` frame and holds
one 16px-radius card.

### Form column

1.  The LadingLens lockup, linking to `/`.
1.  `h1` Sign in, then "Guest access is the only entry for this demo."
1.  Email and Password as the in-house `Field`: uncontrolled, no `name`,
    `autocomplete="off"`, no `form` element, never read.
1.  "Synthetic data only. Nothing you type is stored or sent."
1.  `Sign in as Guest`, full width, the only button: it mints the guest
    session and opens `/inbox`.
1.  "Testing your own documents?" with an "Open the live demo" link to
    `/judge`.

### Panel

- A silk canvas fills the card: the admincn pattern, tinted `--silk-tint`,
  drawn at a quarter of the card's size and scaled up. Under reduced motion
  it paints one frame and stops.
- Top: "Every shipping document, checked against its evidence." in display
  type and "Walk the inbox, comparison, review, and reconciliation views for
  a synthetic shipping operation." in white.
- Bottom: the notched card in `--surface-canvas`, the LadingLens mark in the
  notch, "Match, mismatch, held." and "Short of evidence, a named person
  decides.", and three overlapping verdict circles (match, mismatch, held)
  in the state tokens with the in-house glyphs. The card is login-v3's fixed
  248px, so each line is kept to one line at 1440px.
- The panel is a region named "About this demo". The silk and the circles
  are decorative.

## Units

| Unit                                | Does                                                                | Depends on                                     |
| ----------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| `features/landing/scroll-math.ts`   | Progress, scene opacities, ink flip, lerp step, nearest frame index | nothing                                        |
| `features/landing/frame-bank.ts`    | Fetch, demux, decode, encode; LRU of bitmaps                        | mp4box.js, WebCodecs                           |
| `features/landing/useVideoScrub.ts` | The loop; fallback seeking; canvas liveness                         | the two above                                  |
| `features/landing/Stagger.tsx`      | One staggered entrance                                              | nothing                                        |
| `features/landing/LandingNav.tsx`   | Bar, clusters, hamburger, menu dialog                               | router `Link`                                  |
| `pages/LandingPage.tsx`             | Track, stage, scenes                                                | the units above                                |
| `components/SilkCanvas.tsx`         | The animated silk                                                   | canvas 2D                                      |
| `pages/AuthPage.tsx`                | The split layout                                                    | `Field`, `Button`, `SilkCanvas`, guest session |

`HeroFilm`, its stylesheet and the port-loop media become unused and are
removed.

## Testing

- Unit tests for every pure function in `scroll-math.ts` and for the frame
  bank's LRU and index search.
- Hook tests in jsdom for the fallback path: no `VideoDecoder`, so no fetch,
  and `currentTime` follows scroll.
- Page tests for copy, links and their targets, the menu dialog's keyboard
  contract, scene visibility against scroll, and the auth invariants: one
  button, presentational fields, nothing stored, no network call.
- The existing stylesheet-contract style: tokens only, no hex outside
  `tokens.css`, reduced-motion rules present.
- A browser pass with Playwright at 1440x900 and 390x844, both themes on
  `/auth`, checking the canvas goes live and the scenes change with scroll.

## Risks

- The film is MotionSites' asset. The site publishes no terms or licence
  and marks its pages "All rights reserved"; the prompt itself instructs
  builders to use this URL. We ship it because the brief pins it, and flag
  it: if the team does not hold the rights, swap `FILM_SRC` for our port
  film re-encoded for scrubbing (research, implication 2) and lift
  `INK_FLIP` above 1, since that film never darkens behind the bar.
- The film is hosted by MotionSites. If it disappears, the stage shows
  `--film-sky`, the navy copy stays legible and the page still works. The
  URL is one constant.
- The frame bank downloads the 12.4 MB film a second time and holds its
  frames in memory. That is the reference's trade; it is skipped under
  reduced motion and without WebCodecs.
- Text on moving video cannot meet the contrast floor on every frame; see the
  table under [Decisions](#decisions).
