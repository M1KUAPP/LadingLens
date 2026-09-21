# Landing And Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/` with the Vectrus-style scroll-scrubbed film landing and
`/auth` with the login-v3 split sign-in, on LadingLens copy and tokens.

**Architecture:** Pure scroll math, a WebCodecs frame bank and one
`useVideoScrub` loop live in `apps/web/src/features/landing/`; the landing
page composes them with a navigation bar and three opacity-driven scenes
inside the existing fold-over `SiteShell`. The auth page keeps the
guest-session seam and the in-house `Field`/`Button`, and gains a
`SilkCanvas` panel.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Vite 8, Vitest 5 with
jsdom, Testing Library, plain CSS on design tokens, Hugeicons, mp4box.js,
WebCodecs.

**Spec:** `docs/superpowers/specs/2026-09-21-landing-auth-redesign-design.md`
and `docs/research/build/scroll-scrubbed-video.md`.

## Global Constraints

- Film URL, exactly:
  `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4`
- Reference constants: `LERP_TAU = 8`, `SNAP = 0.002`, `LEAD = 24`,
  watchdog `60000` ms, canvas `1920x1080`, stagger `800ms`
  `cubic-bezier(0.16, 1, 0.3, 1)`, scene fade window `0.08`.
- `LRU_MAX = 8`, not the reference's 24 (spec decision: 24 1080p bitmaps
  hold 199 MB). mp4box.js `^2.4.1`, never 2.4.0.
- The bar turns to paper ink at `p > 0.70` (spec decision, not `0.55`).
- Never call `video.play()`; the video has no `autoplay`, `loop` or
  `controls`.
- No hex colour outside `apps/web/src/styles/tokens.css`. New tokens:
  `--film-ink: #1d3045`, `--film-paper: #ffffff`, `--film-sky: #cfd4dd`,
  `--film-halo-ink: rgba(255, 255, 255, 0.5)`,
  `--film-halo-paper: rgba(29, 48, 69, 0.55)`, `--silk-tint: #4a6680`,
  `--radius-xl: 16px`, `--ease-film: cubic-bezier(0.16, 1, 0.3, 1)`.
- `/auth` has exactly one button, `Sign in as Guest`, and exactly two links:
  `LadingLens home` to `/` and `Open the live demo` to `/judge`. Email and
  Password stay uncontrolled, unnamed, `autocomplete="off"`, outside any
  `form`; nothing typed is stored or sent.
- Reduced motion: no frame bank, no lerp, no stagger, entrance or
  transition, no smooth scroll, one still silk frame.
- Hugeicons for glyphs; no Tailwind; the only new dependency is mp4box.js.
- No em dash (U+2014) or en dash (U+2013) in interface copy.
- Every commit leaves `bun run test` and `bun run build` green in
  `apps/web`. Commits follow Conventional Commits (commitlint runs on
  `commit-msg`); lint-staged runs Prettier on staged files, so a file with
  existing formatting drift gets its own `style:` commit first.

---

### Task 1: Add the film, silk and radius tokens

**Files:**

- Modify: `apps/web/src/styles/tokens.css`
- Modify: `docs/DESIGN.md` (colour, radius and motion token tables)
- Create: `apps/web/src/styles/tokens.test.ts`

**Interfaces:**

- Produces: the CSS custom properties listed under Global Constraints, all
  declared once in `:root` and never overridden by a dark block.

- [ ] **Step 1: Isolate the formatting drift**

Both files predate the Prettier hook. Format them alone so the token
commit carries only tokens.

```bash
cd /Users/yk/Projects/hackathon.repository/averis.repository/averis
bunx prettier --write apps/web/src/styles/tokens.css docs/DESIGN.md
git add apps/web/src/styles/tokens.css docs/DESIGN.md
git commit -m "style: apply prettier to tokens.css and DESIGN.md"
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

const darkBlocks = tokensCss.slice(tokensCss.indexOf(":root[data-theme='dark']"))

describe('film, silk and radius tokens', () => {
  it.each([
    ['--film-ink', '#1d3045'],
    ['--film-paper', '#ffffff'],
    ['--film-sky', '#cfd4dd'],
    ['--film-halo-ink', 'rgba(255, 255, 255, 0.5)'],
    ['--film-halo-paper', 'rgba(29, 48, 69, 0.55)'],
    ['--silk-tint', '#4a6680'],
    ['--radius-xl', '16px'],
    ['--ease-film', 'cubic-bezier(0.16, 1, 0.3, 1)']
  ])('declares %s once, for both themes', (name, value) => {
    expect(tokensCss).toContain(`${name}: ${value};`)
    expect(tokensCss.split(`${name}:`)).toHaveLength(2)
    expect(darkBlocks).not.toContain(`${name}:`)
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/styles/tokens.test.ts`
Expected: FAIL, 8 tests, "expected ... to contain '--film-ink: #1d3045;'".

- [ ] **Step 4: Add the tokens**

In `apps/web/src/styles/tokens.css`, after `--brand-orange: #c2410c;` in the
first `:root` block:

```css
/* Text laid straight over imagery: the landing film and the sign-in silk.
     The picture sets the ground, so these hold in both themes. */
--film-ink: #1d3045;
--film-paper: #ffffff;
--film-sky: #cfd4dd;
--film-halo-ink: rgba(255, 255, 255, 0.5);
--film-halo-paper: rgba(29, 48, 69, 0.55);
--silk-tint: #4a6680;
```

After `--radius-lg: 8px;`:

```css
--radius-xl: 16px;
```

After `--ease-exit: cubic-bezier(0.4, 0, 1, 1);`:

```css
--ease-film: cubic-bezier(0.16, 1, 0.3, 1);
```

- [ ] **Step 5: Document them in DESIGN.md**

In the radius table, after the `radius/lg` row add
`| radius/xl | \`var(--radius-xl)\` | 16px |`(Prettier re-pads the table).
In the motion token block, after`--ease-exit`, add
`--ease-film: cubic-bezier(0.16, 1, 0.3, 1);`. After the chrome, glass and
hero paragraph that ends "resolves both themes." (the gauge paragraph
follows it), add before `## Spacing, Radius And Elevation`:

```markdown
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
```

- [ ] **Step 6: Run the test to see it pass**

Run: `cd apps/web && bunx vitest run src/styles/tokens.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/styles/tokens.css apps/web/src/styles/tokens.test.ts docs/DESIGN.md
git commit -m "feat(web): add film, silk and xl radius tokens"
```

---

### Task 2: Add the landing scroll math

**Files:**

- Create: `apps/web/src/features/landing/scroll-math.ts`
- Test: `apps/web/src/features/landing/scroll-math.test.ts`

**Interfaces:**

- Produces: `LERP_TAU`, `SNAP`, `REVEAL_AT = 0.3`, `INK_FLIP = 0.7`,
  `clamp01(value: number): number`,
  `scrollProgress(scrollY: number, span: number): number`,
  `type SceneOpacities = readonly [number, number, number]`,
  `sceneOpacities(p: number): SceneOpacities`,
  `inkIsPaper(p: number): boolean`,
  `lerpStep(current: number, target: number, dt: number): number`,
  `nearestIndex(timestamps: readonly number[], t: number): number`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/landing/scroll-math.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { inkIsPaper, lerpStep, nearestIndex, sceneOpacities, scrollProgress } from './scroll-math'

describe('scrollProgress', () => {
  it('maps scroll over the span onto 0..1 and clamps it', () => {
    expect(scrollProgress(0, 4000)).toBe(0)
    expect(scrollProgress(2000, 4000)).toBe(0.5)
    expect(scrollProgress(5200, 4000)).toBe(1)
    expect(scrollProgress(-40, 4000)).toBe(0)
  })

  it('reads 0 when the track is no taller than the viewport', () => {
    expect(scrollProgress(120, 0)).toBe(0)
    expect(scrollProgress(120, -300)).toBe(0)
  })
})

describe('sceneOpacities', () => {
  it.each([
    [0, [1, 0, 0]],
    [0.2, [1, 0, 0]],
    [0.24, [0.5, 0, 0]],
    [0.28, [0, 0, 0]],
    [0.32, [0, 0, 0]],
    [0.36, [0, 0.5, 0]],
    [0.4, [0, 1, 0]],
    [0.55, [0, 1, 0]],
    [0.59, [0, 0.5, 0]],
    [0.63, [0, 0, 0]],
    [0.67, [0, 0, 0]],
    [0.71, [0, 0, 0.5]],
    [0.75, [0, 0, 1]],
    [1, [0, 0, 1]]
  ])('at p = %s', (p, expected) => {
    const actual = sceneOpacities(p)
    expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 6))
  })

  it('never shows two scenes at once', () => {
    for (let step = 0; step <= 200; step += 1) {
      const shown = sceneOpacities(step / 200).filter((opacity) => opacity > 0)
      expect(shown.length).toBeLessThanOrEqual(1)
    }
  })
})

describe('inkIsPaper', () => {
  it('holds navy until the film darkens past 0.70', () => {
    expect(inkIsPaper(0.55)).toBe(false)
    expect(inkIsPaper(0.7)).toBe(false)
    expect(inkIsPaper(0.71)).toBe(true)
  })
})

describe('lerpStep', () => {
  it('closes 1 - e^(-8 dt) of the gap each frame', () => {
    expect(lerpStep(0, 10, 0.1)).toBeCloseTo(10 * (1 - Math.exp(-0.8)), 9)
  })

  it('snaps onto the target inside 0.002 s', () => {
    expect(lerpStep(4.999, 5, 0.016)).toBe(5)
  })

  it('stays put when no time passes', () => {
    expect(lerpStep(1, 5, 0)).toBe(1)
  })
})

describe('nearestIndex', () => {
  const stamps = [0, 41_667, 83_333, 125_000]

  it('returns -1 for an empty bank', () => {
    expect(nearestIndex([], 10)).toBe(-1)
  })

  it('finds the closest timestamp', () => {
    expect(nearestIndex(stamps, 0)).toBe(0)
    expect(nearestIndex(stamps, 20_000)).toBe(0)
    expect(nearestIndex(stamps, 21_000)).toBe(1)
    expect(nearestIndex(stamps, 100_000)).toBe(2)
  })

  it('clamps before the first and after the last frame', () => {
    expect(nearestIndex(stamps, -5)).toBe(0)
    expect(nearestIndex(stamps, 9_000_000)).toBe(3)
  })

  it('prefers the earlier frame on a tie', () => {
    expect(nearestIndex([0, 100], 50)).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/features/landing/scroll-math.test.ts`
Expected: FAIL, "Failed to resolve import ./scroll-math".

- [ ] **Step 3: Implement**

`apps/web/src/features/landing/scroll-math.ts`:

```ts
// Scroll-to-film maths for the landing. Pure functions, so the loop in
// useVideoScrub stays thin and every curve here is unit-tested.

/** How fast the playhead chases the scroll target, per second. */
export const LERP_TAU = 8
/** Seconds within which the playhead snaps onto its target. */
export const SNAP = 0.002
/** A scene's children rise in once its opacity passes this. */
export const REVEAL_AT = 0.3
/**
 * Progress past which the bar turns white. The reference flips at 0.55, but
 * this film stays pale until about 7.0 s of its 10 s, so the flip waits for
 * the frame to darken.
 */
export const INK_FLIP = 0.7

const FADE = 0.08

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Scroll position over the track's scrollable span, as 0..1. */
export function scrollProgress(scrollY: number, span: number): number {
  return span > 0 ? clamp01(scrollY / span) : 0
}

export type SceneOpacities = readonly [number, number, number]

/** The three scenes, each fully gone before the next appears. */
export function sceneOpacities(p: number): SceneOpacities {
  const hero = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / FADE)
  const statement = p < 0.32 ? 0 : p < 0.4 ? (p - 0.32) / FADE : p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / FADE)
  const close = p < 0.67 ? 0 : p < 0.75 ? (p - 0.67) / FADE : 1
  return [hero, statement, close]
}

export function inkIsPaper(p: number): boolean {
  return p > INK_FLIP
}

/** One frame of the playhead's exponential chase, snapping when close. */
export function lerpStep(current: number, target: number, dt: number): number {
  const next = current + (target - current) * (1 - Math.exp(-dt * LERP_TAU))
  return Math.abs(target - next) < SNAP ? target : next
}

/** Index of the timestamp closest to t in an ascending list; -1 if empty. */
export function nearestIndex(timestamps: readonly number[], t: number): number {
  if (timestamps.length === 0) return -1
  let low = 0
  let high = timestamps.length - 1
  while (low < high) {
    const middle = (low + high) >> 1
    if (timestamps[middle] < t) low = middle + 1
    else high = middle
  }
  if (low > 0 && t - timestamps[low - 1] <= timestamps[low] - t) return low - 1
  return low
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd apps/web && bunx vitest run src/features/landing/scroll-math.test.ts`
Expected: PASS, 25 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/landing/scroll-math.ts apps/web/src/features/landing/scroll-math.test.ts
git commit -m "feat(web): add landing scroll and scrub maths"
```

---

### Task 3: Add the WebCodecs frame bank

### Task 3: Add the WebCodecs frame bank

**Files:**

- Modify: `apps/web/package.json`, `apps/web/bun.lock` (add `mp4box`)
- Create: `apps/web/src/features/landing/frame-bank.ts`
- Test: `apps/web/src/features/landing/frame-bank.test.ts`

**Interfaces:**

- Produces: `LRU_MAX = 8`;
  `type BankFrame = { readonly ts: number; readonly blob: Blob }` with `ts`
  in microseconds from the first frame;
  `type BitmapCache = { warm(index: number): void; get(index: number): ImageBitmap | null; dispose(): void }`;
  `canBuildFrameBank(): Promise<boolean>`;
  `loadFrameBank(src: string, signal: AbortSignal): Promise<BankFrame[]>`;
  `createBitmapCache(frames: readonly BankFrame[], decode?: (blob: Blob) => Promise<ImageBitmap>, max?: number): BitmapCache`.

Research (`docs/research/build/scroll-scrubbed-video.md`) sets the API: mp4box
2.4.1 is an ES module with its own types; `createFile(true)` keeps the
sample bytes; `appendBuffer` takes `MP4BoxBuffer.fromArrayBuffer(buf, 0)`;
the `avcC` description is written through a `Box` upcast into a big-endian
`DataStream` and sliced past its 8-byte header; a decoder error closes the
decoder for good; Safari returns PNG for a WebP request; the clip's first
frame is presented 83 ms in.

- [ ] **Step 1: Add the dependency**

Never 2.4.0, which cannot be installed.

```bash
cd apps/web && bun add mp4box@^2.4.1
```

Expected: `package.json` gains `"mp4box": "^2.4.1"` under `dependencies`
and `bun.lock` updates.

- [ ] **Step 2: Write the failing test**

`apps/web/src/features/landing/frame-bank.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canBuildFrameBank, createBitmapCache, type BankFrame } from './frame-bank'

type FakeBitmap = ImageBitmap & { readonly frame: number; readonly close: ReturnType<typeof vi.fn> }

const frames: BankFrame[] = Array.from({ length: 40 }, (_, index) => ({
  ts: index * 41_667,
  blob: new Blob([String(index)])
}))
const frameOf = new Map(frames.map((frame, index) => [frame.blob, index]))

// Resolves each blob to a stand-in bitmap that records its own close().
function bitmapDecoder() {
  const made: FakeBitmap[] = []
  const decode = vi.fn(async (blob: Blob) => {
    const bitmap = { frame: frameOf.get(blob), close: vi.fn() } as unknown as FakeBitmap
    made.push(bitmap)
    return bitmap
  })
  return { decode, made }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createBitmapCache', () => {
  it('decodes the playhead frame and its neighbours', async () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(10)
    expect(decode.mock.calls.map(([blob]) => frameOf.get(blob))).toEqual([9, 10, 11, 12])
    expect(cache.get(10)).toBeNull()
    await settle()
    expect(cache.get(10)).toMatchObject({ frame: 10 })
  })

  it('stops warming at the ends of the bank', () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(0)
    cache.warm(39)
    expect(decode.mock.calls.map(([blob]) => frameOf.get(blob))).toEqual([0, 1, 2, 38, 39])
  })

  it('does not decode a cached frame again', async () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(10)
    await settle()
    cache.warm(10)
    expect(decode).toHaveBeenCalledTimes(4)
  })

  it('keeps eight bitmaps by default and closes the oldest', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(1)
    cache.warm(5)
    await settle()
    cache.warm(9)
    await settle()
    const closed = made.filter((bitmap) => bitmap.close.mock.calls.length > 0).map((bitmap) => bitmap.frame)
    expect(closed.sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
    expect(cache.get(2)).toBeNull()
    expect(cache.get(9)).toMatchObject({ frame: 9 })
  })

  it('closes a bitmap that arrives after its slot was evicted', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode, 4)
    cache.warm(1)
    cache.warm(20)
    await settle()
    const early = made.filter((bitmap) => bitmap.frame <= 3)
    expect(early).toHaveLength(4)
    for (const bitmap of early) expect(bitmap.close).toHaveBeenCalledTimes(1)
    expect(cache.get(20)).toMatchObject({ frame: 20 })
  })

  it('closes every bitmap on dispose, late arrivals included', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(5)
    await settle()
    cache.warm(9)
    cache.dispose()
    await settle()
    expect(made).toHaveLength(8)
    for (const bitmap of made) expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

describe('canBuildFrameBank', () => {
  it('says no where WebCodecs is missing', async () => {
    await expect(canBuildFrameBank()).resolves.toBe(false)
  })

  it("asks the decoder about the film's H.264 profile before anything downloads", async () => {
    const isConfigSupported = vi.fn(async () => ({ supported: true }))
    vi.stubGlobal('VideoDecoder', { isConfigSupported })
    await expect(canBuildFrameBank()).resolves.toBe(true)
    expect(isConfigSupported).toHaveBeenCalledWith({ codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 })
  })

  it('says no when the decoder refuses', async () => {
    vi.stubGlobal('VideoDecoder', { isConfigSupported: async () => ({ supported: false }) })
    await expect(canBuildFrameBank()).resolves.toBe(false)
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/features/landing/frame-bank.test.ts`
Expected: FAIL, "Failed to resolve import ./frame-bank".

- [ ] **Step 4: Implement**

`apps/web/src/features/landing/frame-bank.ts`:

```ts
import { DataStream, Endianness, MP4BoxBuffer, createFile } from 'mp4box'
import type { Box, ISOFile, Sample, VisualSampleEntry } from 'mp4box'

// The frame bank behind the landing film: every frame of the clip decoded
// once with WebCodecs and kept as a compressed image, so scrubbing never
// waits on the video element's keyframe seeks.

/** Frames decoded ahead of their image encode, at most. */
const LEAD = 24
/** Decoded bitmaps kept around the playhead; 1080p RGBA is 8.3 MB each. */
export const LRU_MAX = 8
const QUALITY = 0.82

export type BankFrame = { readonly ts: number; readonly blob: Blob }

export type BitmapCache = {
  /** Starts decoding the frame at index and its neighbours. */
  warm(index: number): void
  /** The frame's bitmap if it is decoded, else null. */
  get(index: number): ImageBitmap | null
  dispose(): void
}

type Demuxed = { readonly config: VideoDecoderConfig; readonly samples: readonly Sample[] }

/**
 * Decode checks that need no download: the clip is H.264 High at level 4.0
 * (avc1.640028), 1920x1080. A browser that cannot promise that gets no fetch.
 */
export async function canBuildFrameBank(): Promise<boolean> {
  try {
    const probe = await VideoDecoder.isConfigSupported({ codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 })
    return probe.supported === true
  } catch {
    return false
  }
}

function codecDescription(file: ISOFile, trackId: number): Uint8Array | undefined {
  for (const entry of file.getTrackById(trackId).mdia.minf.stbl.stsd.entries) {
    const visual = entry as VisualSampleEntry
    const box = visual.avcC ?? visual.hvcC ?? visual.vpcC ?? visual.av1C
    if (box) {
      const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
      ;(box as Box).write(stream)
      // The decoder wants the record without its 8-byte box header.
      return new Uint8Array(stream.buffer, 8)
    }
  }
  return undefined
}

function demux(buffer: ArrayBuffer): Promise<Demuxed> {
  return new Promise((resolve, reject) => {
    // keepMdatData: since mp4box 1.0 the sample bytes are dropped by default.
    const file = createFile(true)
    const samples: Sample[] = []
    let config: VideoDecoderConfig | null = null
    let expected = 0
    file.onError = (module, message) => reject(new Error(`${module}: ${message}`))
    file.onReady = (info) => {
      const track = info.videoTracks[0]
      if (!track) {
        reject(new Error('The film has no video track'))
        return
      }
      expected = track.nb_samples
      config = {
        codec: track.codec,
        codedWidth: track.video?.width ?? track.track_width,
        codedHeight: track.video?.height ?? track.track_height,
        description: codecDescription(file, track.id)
      }
      file.setExtractionOptions(track.id, undefined, { nbSamples: expected })
      file.start()
    }
    file.onSamples = (_id, _user, batch) => {
      samples.push(...batch)
      if (config && samples.length >= expected) resolve({ config, samples })
    }
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0))
    file.flush()
    // Samples arrive during appendBuffer; anything still missing never will.
    if (!config) reject(new Error('The film has no movie box'))
    else if (samples.length < expected) reject(new Error('The film ended early'))
  })
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Frame encode failed'))), type, QUALITY)
  })
}

/**
 * WebP where the browser can encode it. Safari cannot, and silently returns
 * PNG instead, about 760 kB a 1080p frame, so it gets JPEG.
 */
async function imageType(): Promise<string> {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const blob = await encode(probe, 'image/webp')
  return blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
}

async function decodeAll(
  { config, samples }: Demuxed,
  hardwareAcceleration: HardwareAcceleration,
  signal: AbortSignal
): Promise<BankFrame[]> {
  const settings: VideoDecoderConfig = { ...config, hardwareAcceleration }
  const { supported } = await VideoDecoder.isConfigSupported(settings)
  if (!supported) throw new Error(`Decoder refuses ${config.codec} (${hardwareAcceleration})`)

  const canvas = document.createElement('canvas')
  canvas.width = config.codedWidth ?? 1920
  canvas.height = config.codedHeight ?? 1080
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No 2D canvas for frame encoding')
  const type = await imageType()

  const frames: BankFrame[] = []
  const pending = new Set<Promise<void>>()
  let failure: unknown = null

  const decoder = new VideoDecoder({
    output: (frame) => {
      const ts = frame.timestamp
      context.drawImage(frame, 0, 0, canvas.width, canvas.height)
      frame.close()
      // toBlob copies the bitmap now and encodes in parallel, so the one
      // canvas is free for the next frame straight away.
      const job: Promise<void> = encode(canvas, type)
        .then((blob) => {
          frames.push({ ts, blob })
        })
        .catch((error: unknown) => {
          failure ??= error
        })
        .finally(() => pending.delete(job))
      pending.add(job)
    },
    error: (error) => {
      failure ??= error
    }
  })

  try {
    decoder.configure(settings)
    let started = false
    for (const sample of samples) {
      if (signal.aborted) throw signal.reason
      if (failure) throw failure
      // A decoder may only start on a key chunk.
      if (!started && !sample.is_sync) continue
      started = true
      // Hold decoding back so frames never pile up waiting to be encoded.
      while (pending.size + decoder.decodeQueueSize >= LEAD && decoder.state === 'configured') {
        await (pending.size > 0 ? Promise.race(pending) : new Promise((wake) => setTimeout(wake, 4)))
      }
      if (!sample.data) continue
      decoder.decode(
        new EncodedVideoChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: (sample.cts * 1_000_000) / sample.timescale,
          duration: (sample.duration * 1_000_000) / sample.timescale,
          data: sample.data
        })
      )
    }
    await decoder.flush()
    await Promise.all(pending)
    if (failure) throw failure
  } finally {
    if (decoder.state !== 'closed') decoder.close()
  }

  frames.sort((a, b) => a.ts - b.ts)
  // One timeline with the video element: this clip presents its first frame
  // 83 ms in (an edit list), where the element starts it at 0.
  const origin = frames[0]?.ts ?? 0
  return frames.map((frame) => ({ ts: frame.ts - origin, blob: frame.blob }))
}

/**
 * Fetches, demuxes and decodes the film into timestamped images, in
 * microseconds from its first frame. A decoder failure gets one retry in
 * software before the caller falls back to seeking.
 */
export async function loadFrameBank(src: string, signal: AbortSignal): Promise<BankFrame[]> {
  const response = await fetch(src, { signal })
  if (!response.ok) throw new Error(`Film request failed with ${response.status}`)
  const demuxed = await demux(await response.arrayBuffer())
  try {
    return await decodeAll(demuxed, 'no-preference', signal)
  } catch (error) {
    if (signal.aborted) throw error
    return decodeAll(demuxed, 'prefer-software', signal)
  }
}

/**
 * Least-recently-used decoded bitmaps. Evicted bitmaps are closed at once,
 * and one that arrives after its slot was evicted is closed on arrival.
 */
export function createBitmapCache(
  frames: readonly BankFrame[],
  decode: (blob: Blob) => Promise<ImageBitmap> = (blob) => createImageBitmap(blob),
  max = LRU_MAX
): BitmapCache {
  const entries = new Map<number, ImageBitmap | null>()
  let disposed = false

  const touch = (index: number) => {
    const bitmap = entries.get(index) ?? null
    entries.delete(index)
    entries.set(index, bitmap)
  }

  const evict = () => {
    for (const [index, bitmap] of entries) {
      if (entries.size <= max) return
      entries.delete(index)
      bitmap?.close()
    }
  }

  const load = (index: number) => {
    if (index < 0 || index >= frames.length) return
    if (entries.has(index)) {
      touch(index)
      return
    }
    entries.set(index, null)
    evict()
    decode(frames[index].blob).then(
      (bitmap) => {
        if (disposed || !entries.has(index)) bitmap.close()
        else entries.set(index, bitmap)
      },
      () => entries.delete(index)
    )
  }

  return {
    warm(index) {
      for (let offset = -1; offset <= 2; offset += 1) load(index + offset)
    },
    get(index) {
      const bitmap = entries.get(index) ?? null
      if (bitmap) touch(index)
      return bitmap
    },
    dispose() {
      disposed = true
      for (const bitmap of entries.values()) bitmap?.close()
      entries.clear()
    }
  }
}
```

- [ ] **Step 5: Run it to see it pass, then type-check**

Run: `cd apps/web && bunx vitest run src/features/landing/frame-bank.test.ts && bunx tsc -b`
Expected: PASS, 9 tests; `tsc` exits 0.

- [ ] **Step 6: Decode the real film in Chrome**

jsdom has no WebCodecs, so prove the pipeline in installed Chrome through
the dev server. Start `bun run dev` in `apps/web` in the background, save
this as `.superpowers/sdd/2026-09-21-landing-auth-redesign/bank-smoke.mjs`
(git-ignored) and run it with `node`:

```js
import { chromium } from '/Users/yk/Projects/hackathon.repository/averis.repository/averis/apps/web/node_modules/playwright/index.mjs'

const FILM =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.goto('http://localhost:5173/auth')
const result = await page.evaluate(async (src) => {
  const bank = await import('/src/features/landing/frame-bank.ts')
  const supported = await bank.canBuildFrameBank()
  const started = performance.now()
  const frames = await bank.loadFrameBank(src, new AbortController().signal)
  return {
    supported,
    count: frames.length,
    first: frames[0]?.ts,
    last: frames.at(-1)?.ts,
    type: frames[0]?.blob.type,
    megabytes: +(frames.reduce((sum, frame) => sum + frame.blob.size, 0) / 1e6).toFixed(1),
    ms: Math.round(performance.now() - started)
  }
}, FILM)
console.log(JSON.stringify(result))
await browser.close()
```

Expected: `"supported":true,"count":241,"first":0`, `last` near
`10000000`, `"type":"image/webp"`, about 8 MB, well under 15 s. Stop the
dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/bun.lock apps/web/src/features/landing/frame-bank.ts apps/web/src/features/landing/frame-bank.test.ts
git commit -m "feat(web): add the WebCodecs frame bank"
```

---

### Task 4: Add the useVideoScrub loop

**Files:**

- Create: `apps/web/src/features/landing/useVideoScrub.ts`
- Test: `apps/web/src/features/landing/useVideoScrub.test.tsx`

**Interfaces:**

- Consumes: `scrollProgress`, `lerpStep`, `nearestIndex` (Task 2);
  `canBuildFrameBank`, `loadFrameBank`, `createBitmapCache`,
  `type BitmapCache` (Task 3, loaded with a dynamic `import()` so mp4box.js
  stays out of the entry chunk).
- Produces:
  `useVideoScrub(src: string): { trackRef, videoRef, canvasRef, progress: number, canvasLive: boolean }`
  where the refs are `RefObject<HTMLDivElement | null>`,
  `RefObject<HTMLVideoElement | null>` and
  `RefObject<HTMLCanvasElement | null>`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/landing/useVideoScrub.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVideoScrub } from './useVideoScrub'

let frames: FrameRequestCallback[] = []
let seekTo = 0

function runFrames(now = performance.now()) {
  act(() => {
    const due = frames
    frames = []
    for (const callback of due) callback(now)
  })
}

function Harness() {
  const { trackRef, videoRef, canvasRef, progress, canvasLive } = useVideoScrub('/film.mp4')
  return (
    <div ref={trackRef}>
      <video ref={videoRef} data-testid="film" />
      <canvas ref={canvasRef} data-live={canvasLive || undefined} />
      <output data-testid="progress">{progress}</output>
    </div>
  )
}

// A 10 s film whose seeks land at once, on a 4768px track in a 768px
// viewport: the span is 4000px, so scrollY 2000 is p = 0.5.
function mountAt(scrollY: number, reduceMotion: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduceMotion && query.includes('reduce'), media: query }) as MediaQueryList
  )
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  const view = render(<Harness />)
  const video = screen.getByTestId('film') as HTMLVideoElement
  Object.defineProperty(video, 'duration', { configurable: true, value: 10 })
  Object.defineProperty(video, 'seeking', { configurable: true, value: false })
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => seekTo,
    set: (value: number) => {
      seekTo = value
    }
  })
  video.dispatchEvent(new Event('loadedmetadata'))
  return { view, video }
}

beforeEach(() => {
  frames = []
  seekTo = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(4768)
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
})

describe('useVideoScrub', () => {
  it('publishes the scroll progress', () => {
    mountAt(2000, false)
    runFrames()
    expect(screen.getByTestId('progress')).toHaveTextContent('0.5')
  })

  it('seeks straight to the scroll position under reduced motion', () => {
    const { video } = mountAt(2000, true)
    runFrames()
    expect(video.currentTime).toBe(5)
  })

  it('eases the playhead toward the scroll position', () => {
    const { video } = mountAt(2000, false)
    runFrames(performance.now() + 100)
    expect(video.currentTime).toBeGreaterThan(0)
    expect(video.currentTime).toBeLessThan(5)
    expect(video.currentTime).toBeCloseTo(5 * (1 - Math.exp(-0.8)), 1)
  })

  it('never fetches the film where WebCodecs is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    mountAt(0, false)
    await act(async () => {})
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.querySelector('canvas')).not.toHaveAttribute('data-live')
  })

  it('stops its loop on unmount', () => {
    const { view } = mountAt(0, false)
    view.unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/features/landing/useVideoScrub.test.tsx`
Expected: FAIL, "Failed to resolve import ./useVideoScrub".

- [ ] **Step 3: Implement**

`apps/web/src/features/landing/useVideoScrub.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import type { BitmapCache } from './frame-bank'
import { lerpStep, nearestIndex, scrollProgress } from './scroll-math'

/** Longest the frame bank may take before the page settles on seeking. */
const WATCHDOG_MS = 60_000

type Bank = { readonly timestamps: readonly number[]; readonly cache: BitmapCache }

function canDecodeFrames(): boolean {
  return (
    typeof VideoDecoder === 'function' &&
    typeof EncodedVideoChunk === 'function' &&
    typeof createImageBitmap === 'function'
  )
}

/**
 * Ties a video's playhead to the scroll through a track. Frames come from a
 * decoded frame bank drawn to the canvas once it is ready; until then, or
 * without WebCodecs, the video element is seeked instead. It is never played.
 */
export function useVideoScrub(src: string) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [canvasLive, setCanvasLive] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!track || !video || !canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let span = 0
    const measure = () => {
      span = track.offsetHeight - window.innerHeight
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    let duration = 0
    const readDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration
    }
    readDuration()
    video.addEventListener('loadedmetadata', readDuration)

    let bank: Bank | null = null
    let context: CanvasRenderingContext2D | null = null
    let painted = false
    let current = 0
    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, now - last) / 1000)
      last = now
      const p = scrollProgress(window.scrollY, span)
      setProgress(p)
      if (duration > 0) {
        const target = p * duration
        current = reduced ? target : lerpStep(current, target, dt)
        if (bank && context) {
          const index = nearestIndex(bank.timestamps, current * 1e6)
          bank.cache.warm(index)
          const bitmap = bank.cache.get(index)
          if (bitmap) {
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
            if (!painted) {
              painted = true
              setCanvasLive(true)
            }
          }
        } else if (!video.seeking && Math.abs(video.currentTime - current) > 0.01) {
          video.currentTime = current
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const controller = new AbortController()
    let watchdog = 0
    const buildBank = async () => {
      if (reduced || !canDecodeFrames()) return
      const { canBuildFrameBank, createBitmapCache, loadFrameBank } = await import('./frame-bank')
      if (controller.signal.aborted || !(await canBuildFrameBank())) return
      watchdog = window.setTimeout(() => controller.abort(), WATCHDOG_MS)
      try {
        const frames = await loadFrameBank(src, controller.signal)
        const ctx = canvas.getContext('2d')
        if (controller.signal.aborted || frames.length === 0 || !ctx) return
        context = ctx
        bank = { timestamps: frames.map((frame) => frame.ts), cache: createBitmapCache(frames) }
        if (duration === 0) duration = frames[frames.length - 1].ts / 1e6
      } catch {
        // Seeking stays the fallback: without a bank the canvas never shows.
      } finally {
        window.clearTimeout(watchdog)
      }
    }
    if (document.readyState === 'complete') void buildBank()
    else window.addEventListener('load', buildBank, { once: true })

    return () => {
      cancelAnimationFrame(raf)
      controller.abort()
      window.clearTimeout(watchdog)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('load', buildBank)
      video.removeEventListener('loadedmetadata', readDuration)
      bank?.cache.dispose()
    }
  }, [src])

  return { trackRef, videoRef, canvasRef, progress, canvasLive }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd apps/web && bunx vitest run src/features/landing/useVideoScrub.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/landing/useVideoScrub.ts apps/web/src/features/landing/useVideoScrub.test.tsx
git commit -m "feat(web): add the scroll-driven video scrub loop"
```

---

### Task 5: Add the landing navigation and menu

**Files:**

- Create: `apps/web/src/features/landing/LandingNav.tsx`
- Create: `apps/web/src/features/landing/landing-nav.css`
- Test: `apps/web/src/features/landing/LandingNav.test.tsx`

**Interfaces:**

- Produces: `LandingNav({ paper }: { paper: boolean })`, rendering
  `header.land-nav[data-ink='ink' | 'paper']`, `nav[aria-label='Site']`, a
  `Get Started` link to `/auth`, and `#land-menu`, a dialog named `Menu`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/landing/LandingNav.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingNav } from './LandingNav'
import navCss from './landing-nav.css?raw'

const SITE = [
  ['LadingLens', '#top'],
  ['Reconciliation', '#reconcile'],
  ['Human review', '#review'],
  ['Live demo', '/judge'],
  ['GitHub', 'https://github.com/Averis-T010NG/Averis']
]

function renderNav(paper = false) {
  return render(
    <MemoryRouter>
      <LandingNav paper={paper} />
    </MemoryRouter>
  )
}

function linkPairs(container: HTMLElement) {
  return within(container)
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('href')])
}

describe('landing navigation', () => {
  it('links the three scenes and the two ways out', () => {
    renderNav()
    const site = screen.getByRole('navigation', { name: 'Site' })
    expect(linkPairs(site)).toEqual(SITE)
    expect(within(site).getByRole('link', { name: 'LadingLens' })).toHaveAttribute('aria-current', 'page')
    expect(within(site).getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank')
  })

  it('keeps the way in on the bar', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/auth')
  })

  it('takes its ink from the film', () => {
    const view = renderNav(false)
    const bar = view.container.querySelector('header.land-nav')
    expect(bar).toHaveAttribute('data-ink', 'ink')
    view.rerender(
      <MemoryRouter>
        <LandingNav paper />
      </MemoryRouter>
    )
    expect(bar).toHaveAttribute('data-ink', 'paper')
  })

  it('opens the menu as a modal dialog and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderNav()
    // jsdom ignores media queries, so the burger keeps its desktop
    // display: none; match it by label rather than by role.
    const burger = screen.getByLabelText('Open menu')
    const menu = document.getElementById('land-menu') as HTMLElement
    expect(menu).toHaveAttribute('data-open', 'false')
    expect(menu).toHaveAttribute('inert')
    expect(menu).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(burger)
    expect(burger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBe(menu)
    expect(menu).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    expect(linkPairs(within(menu).getByRole('navigation', { name: 'Site menu' }))).toEqual(SITE)

    await user.keyboard('{Escape}')
    expect(burger).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveAttribute('inert')
    expect(document.body.style.overflow).toBe('')
    expect(burger).toHaveFocus()
  })

  it('keeps Tab inside the open menu', async () => {
    const user = userEvent.setup()
    renderNav()
    fireEvent.click(screen.getByLabelText('Open menu'))
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    const start = within(menu).getByRole('link', { name: 'Get Started' })
    start.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(start).toHaveFocus()
  })

  it('closes the menu when a link is chosen', () => {
    renderNav()
    fireEvent.click(screen.getByLabelText('Open menu'))
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    fireEvent.click(within(menu).getByRole('link', { name: 'Human review' }))
    expect(menu).toHaveAttribute('data-open', 'false')
  })
})

describe('landing navigation stylesheet', () => {
  it('derives colour from tokens only', () => {
    expect(navCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('swaps the link row for the burger below 1024px and drops the side cluster below 640px', () => {
    expect(navCss).toMatch(/@media \(max-width: 1023\.98px\)[^@]*\.land-links\s*\{\s*display:\s*none/)
    expect(navCss).toMatch(/@media \(max-width: 639\.98px\)[^@]*\.land-side\s*\{\s*display:\s*none/)
  })

  it('flips to paper ink with its own halo', () => {
    expect(navCss).toMatch(/\.land-nav\[data-ink='paper'\]\s*\{[^}]*color:\s*var\(--film-paper\)/)
    expect(navCss).toMatch(/\.land-nav\[data-ink='paper'\]\s*\{[^}]*text-shadow:[^}]*var\(--film-halo-paper\)/)
  })

  it('drops the entrance and the fades under reduced motion', () => {
    const reduced = navCss.slice(navCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/animation:\s*none/)
    expect(reduced).toMatch(/transition:\s*none/)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/features/landing/LandingNav.test.tsx`
Expected: FAIL, "Failed to resolve import ./LandingNav".

- [ ] **Step 3: Implement the component**

`apps/web/src/features/landing/LandingNav.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import './landing-nav.css'

type SiteLink = {
  readonly label: string
  readonly href: string
  readonly kind: 'scene' | 'route' | 'external'
  readonly current?: boolean
}

// The first three move through the film; the last two leave it.
const SITE_LINKS: readonly SiteLink[] = [
  { label: 'LadingLens', href: '#top', kind: 'scene', current: true },
  { label: 'Reconciliation', href: '#reconcile', kind: 'scene' },
  { label: 'Human review', href: '#review', kind: 'scene' },
  { label: 'Live demo', href: '/judge', kind: 'route' },
  { label: 'GitHub', href: 'https://github.com/Averis-T010NG/Averis', kind: 'external' }
]

const FOCUSABLE = 'a[href], button:not([disabled])'

type SiteAnchorProps = {
  link: SiteLink
  className: string
  style?: CSSProperties
  onClick?: () => void
}

function SiteAnchor({ link, className, style, onClick }: SiteAnchorProps) {
  if (link.kind === 'route') {
    return (
      <Link to={link.href} className={className} style={style} onClick={onClick}>
        {link.label}
      </Link>
    )
  }
  const external = link.kind === 'external' ? { target: '_blank', rel: 'noreferrer' } : {}
  return (
    <a
      href={link.href}
      className={className}
      style={style}
      onClick={onClick}
      aria-current={link.current ? 'page' : undefined}
      {...external}
    >
      {link.label}
    </a>
  )
}

function LandingMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // aria-modal tells assistive tech; Tab still has to be kept inside.
  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!items || items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      id="land-menu"
      className="land-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      data-open={open}
      inert={!open}
      aria-hidden={open ? undefined : true}
      onKeyDown={keepFocusInside}
    >
      <div className="land-menu-panel">
        <div className="land-menu-head">
          <button ref={closeRef} type="button" className="land-menu-close" aria-label="Close menu" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="land-menu-links" aria-label="Site menu">
          {SITE_LINKS.map((link, index) => (
            <SiteAnchor
              key={link.href}
              link={link}
              className="land-menu-link"
              style={{ '--i': index } as CSSProperties}
              onClick={onClose}
            />
          ))}
        </nav>
        <div className="land-menu-foot">
          <Link to="/auth" onClick={onClose}>
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}

/** The film's bar: scene links, the way in, and the full-screen menu. */
export function LandingNav({ paper }: { paper: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget
    setOpen(true)
  }
  // Stable, so the menu's open effect does not re-run on every scroll frame.
  const closeMenu = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  return (
    <>
      <header className="land-nav" data-ink={paper ? 'paper' : 'ink'}>
        <button
          type="button"
          className="land-burger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="land-menu"
          onClick={openMenu}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className="land-links" aria-label="Site">
          {SITE_LINKS.map((link, index) => (
            <SiteAnchor
              key={link.href}
              link={link}
              className="land-link"
              style={{ animationDelay: `${300 + index * 80}ms` }}
            />
          ))}
        </nav>
        <div className="land-side">
          <Link to="/auth" className="land-start">
            Get Started
            <span className="land-start-dot" aria-hidden="true">
              <HugeiconsIcon icon={ArrowRight02Icon} size={12} />
            </span>
          </Link>
          <button
            type="button"
            className="land-menu-button"
            aria-expanded={open}
            aria-controls="land-menu"
            onClick={openMenu}
          >
            Menu
          </button>
        </div>
      </header>
      <LandingMenu open={open} onClose={closeMenu} />
    </>
  )
}
```

- [ ] **Step 4: Implement the stylesheet**

`apps/web/src/features/landing/landing-nav.css`:

```css
/* The bar rides the sticky stage, so it leaves with the film once the
   footer folds out. Its ink follows the frame: navy on cloud, white once
   the clip reaches the dark sea, each with a halo in the other colour
   because no frame of this film gives small text 4.5:1 on its own. */
.land-nav {
  position: absolute;
  inset: 0 0 auto;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px var(--spacing-7) var(--spacing-7);
  color: var(--film-ink);
  text-shadow: 0 0 12px var(--film-halo-ink);
  pointer-events: auto;
  transition: color 500ms var(--ease-standard);
}

.land-nav[data-ink='paper'] {
  color: var(--film-paper);
  text-shadow: 0 0 12px var(--film-halo-paper);
}

@media (min-width: 640px) {
  .land-nav {
    padding: var(--spacing-10) var(--spacing-8) var(--spacing-7);
  }
}

@media (min-width: 768px) {
  .land-nav {
    padding-inline: var(--spacing-10);
  }
}

.land-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
}

@media (min-width: 1280px) {
  .land-links {
    gap: var(--spacing-9);
  }
}

.land-link,
.land-start,
.land-menu-button {
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  color: inherit;
  text-decoration: none;
  transition: opacity 300ms var(--ease-standard);
}

.land-link {
  position: relative;
  letter-spacing: 0.15em;
  animation: land-drop 600ms var(--ease-film) both;
}

.land-link[aria-current='page']::after {
  content: '';
  position: absolute;
  inset: auto 0 -12px;
  height: 2px;
  background: currentColor;
}

.land-link:hover,
.land-start:hover,
.land-menu-button:hover {
  opacity: 0.7;
}

.land-side {
  display: flex;
  align-items: center;
  gap: var(--spacing-8);
  animation: land-drop 600ms var(--ease-film) 700ms both;
}

.land-start {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-4);
  letter-spacing: 0.2em;
}

/* The disc takes the bar's ink; its arrow takes the other one. */
.land-start-dot {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--film-ink);
  color: var(--film-paper);
  transition:
    background-color 500ms var(--ease-standard),
    color 500ms var(--ease-standard);
}

.land-nav[data-ink='paper'] .land-start-dot {
  background: var(--film-paper);
  color: var(--film-ink);
}

.land-menu-button {
  display: none;
  padding: 0;
  border: 0;
  background: none;
  letter-spacing: 0.2em;
  cursor: pointer;
}

/* 44px of target around the three bars. */
.land-burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  margin-left: -10px;
  padding: 0 10px;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

.land-burger span {
  display: block;
  width: 24px;
  height: 2px;
  background: currentColor;
}

.land-burger span:last-child {
  width: 16px;
}

.land-link:focus-visible,
.land-start:focus-visible,
.land-menu-button:focus-visible,
.land-burger:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: var(--focus-ring);
}

@media (max-width: 1023.98px) {
  .land-links {
    display: none;
  }

  .land-burger {
    display: flex;
  }

  .land-menu-button {
    display: inline;
  }
}

@media (max-width: 639.98px) {
  .land-side {
    display: none;
  }
}

/* The menu: one navy sheet over everything, links staggered in. */
.land-menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--film-ink);
  color: var(--film-paper);
  opacity: 0;
  visibility: hidden;
  pointer-events: auto;
  transition:
    opacity 500ms var(--ease-standard),
    visibility 0s linear 500ms;
}

.land-menu[data-open='true'] {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 500ms var(--ease-standard),
    visibility 0s;
}

.land-menu-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  transform: translateY(-32px);
  transition: transform 500ms var(--ease-standard);
}

.land-menu[data-open='true'] .land-menu-panel {
  transform: none;
}

.land-menu-head {
  display: flex;
  justify-content: flex-end;
  padding: 32px var(--spacing-7) 0;
}

@media (min-width: 640px) {
  .land-menu-head {
    padding: var(--spacing-10) var(--spacing-8) 0;
  }
}

.land-menu-close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--film-paper) 30%, transparent);
  border-radius: var(--radius-full);
  background: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 300ms var(--ease-standard);
}

.land-menu-close:hover {
  border-color: var(--film-paper);
}

.land-menu-links {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding-inline: var(--spacing-8);
}

@media (min-width: 640px) {
  .land-menu-links {
    padding-inline: var(--spacing-10);
  }
}

.land-menu-link {
  padding-block: var(--spacing-4);
  font-size: 24px;
  line-height: 32px;
  font-weight: 300;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--film-paper) 60%, transparent);
  text-decoration: none;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 500ms var(--ease-film) calc(var(--i, 0) * 60ms),
    transform 500ms var(--ease-film) calc(var(--i, 0) * 60ms),
    color 300ms var(--ease-standard);
}

@media (min-width: 640px) {
  .land-menu-link {
    font-size: 30px;
    line-height: 36px;
  }
}

.land-menu[data-open='true'] .land-menu-link {
  opacity: 1;
  transform: none;
}

.land-menu-link:hover,
.land-menu-link[aria-current='page'] {
  color: var(--film-paper);
}

.land-menu-foot {
  display: flex;
  gap: var(--spacing-8);
  padding: 0 var(--spacing-8) var(--spacing-9);
}

@media (min-width: 640px) {
  .land-menu-foot {
    padding-inline: var(--spacing-10);
  }
}

.land-menu-foot a {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--film-paper) 60%, transparent);
  text-decoration: none;
}

.land-menu-foot a:hover {
  color: var(--film-paper);
}

.land-menu-close:focus-visible,
.land-menu-link:focus-visible,
.land-menu-foot a:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: var(--focus-ring);
}

@keyframes land-drop {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .land-link,
  .land-side {
    animation: none;
  }

  .land-nav,
  .land-start-dot,
  .land-menu,
  .land-menu-panel,
  .land-menu-link {
    transition: none;
  }
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `cd apps/web && bunx vitest run src/features/landing/LandingNav.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/landing/LandingNav.tsx apps/web/src/features/landing/landing-nav.css apps/web/src/features/landing/LandingNav.test.tsx
git commit -m "feat(web): add the landing bar and full-screen menu"
```

---

### Task 6: Rebuild the landing on the scroll-scrubbed film

**Files:**

- Create: `apps/web/src/features/landing/Stagger.tsx`
- Modify: `apps/web/src/pages/LandingPage.tsx` (full rewrite)
- Modify: `apps/web/src/pages/landing-page.css` (full rewrite)
- Modify: `apps/web/src/pages/LandingPage.test.tsx` (full rewrite)
- Modify: `apps/web/src/layout/SiteShell.test.tsx:18-24`
- Modify: `apps/web/src/App.test.tsx:37-45`
- Modify: `docs/DESIGN.md` (Motion Rules, Reduced Motion)
- Delete: `apps/web/src/components/HeroFilm.tsx`,
  `apps/web/src/components/hero-film.css`

**Interfaces:**

- Consumes: `useVideoScrub` (Task 4); `sceneOpacities`, `inkIsPaper`,
  `REVEAL_AT` (Task 2); `LandingNav` (Task 5).
- Produces: `Stagger({ visible, delay?, children })`, and the landing DOM:
  `main.land > .land-track > (#top, #reconcile, #review, .land-stage)`,
  three `section.land-scene[data-live]`.

- [ ] **Step 1: Write the failing page test**

Replace `apps/web/src/pages/LandingPage.test.tsx` with:

```tsx
import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { renderAt } from '../test/render'
import landingCss from './landing-page.css?raw'

const FILM =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4'

let frames: FrameRequestCallback[] = []

function runFrames() {
  act(() => {
    const due = frames
    frames = []
    for (const callback of due) callback(performance.now())
  })
}

// A 4768px track in a 768px viewport: a 4000px span, so scrollY = p * 4000.
function scrollToProgress(p: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: p * 4000 })
  runFrames()
}

function liveScenes() {
  return [...document.querySelectorAll('.land-scene')].map((scene) => scene.hasAttribute('data-live'))
}

beforeEach(() => {
  frames = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(4768)
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
})

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
})

describe('landing page', () => {
  it('states the three facts across the three scenes', () => {
    renderAt('/', <App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Account for every shipping document.' })).toBeInTheDocument()
    expect(screen.getByText('Every email captured and accounted for')).toBeInTheDocument()
    const [statement, closing] = screen.getAllByRole('heading', { level: 2 })
    expect(statement).toHaveTextContent('Expected shipments reconciled to the case ledger independently of the inbox')
    expect(closing).toHaveTextContent('Held for review, released by a person.')
    expect(screen.getByText('NEEDS_REVIEW')).toHaveClass('land-data')
    expect(screen.getByText('Human authority')).toBeInTheDocument()
  })

  it('offers the way in from the bar and from the last scene', () => {
    renderAt('/', <App />)
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/auth')
    scrollToProgress(0.875)
    expect(screen.getByRole('link', { name: 'Enter the demo' })).toHaveAttribute('href', '/auth')
  })

  it('scrubs the film from scroll and never plays it', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    renderAt('/', <App />)
    const video = document.querySelector('video.land-video') as HTMLVideoElement
    expect(video).toHaveAttribute('src', FILM)
    expect(video).toHaveProperty('muted', true)
    expect(video).toHaveProperty('playsInline', true)
    expect(video).toHaveAttribute('preload', 'auto')
    expect(video).not.toHaveAttribute('autoplay')
    expect(video).not.toHaveAttribute('loop')
    expect(video).not.toHaveAttribute('controls')
    const canvas = document.querySelector('canvas.land-canvas')
    expect(canvas).toHaveAttribute('width', '1920')
    expect(canvas).toHaveAttribute('height', '1080')
    scrollToProgress(0.5)
    expect(play).not.toHaveBeenCalled()
  })

  it('shows one scene at a time as the reader scrolls', () => {
    renderAt('/', <App />)
    runFrames()
    expect(liveScenes()).toEqual([true, false, false])
    scrollToProgress(0.475)
    expect(liveScenes()).toEqual([false, true, false])
    scrollToProgress(0.875)
    expect(liveScenes()).toEqual([false, false, true])
  })

  it('takes the links of a hidden scene out of reach', () => {
    renderAt('/', <App />)
    runFrames()
    const cta = screen.getByText('Enter the demo').closest('a')
    expect(cta).toHaveAttribute('tabindex', '-1')
    expect(cta).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link', { name: 'Next: reconciliation' })).toHaveAttribute('href', '#reconcile')
    scrollToProgress(0.475)
    expect(screen.getByRole('link', { name: 'Next: human review' })).toHaveAttribute('href', '#review')
    expect(screen.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top')
  })

  it('turns the bar white only once the film reaches the dark sea', () => {
    renderAt('/', <App />)
    const bar = document.querySelector('header.land-nav')
    scrollToProgress(0.6)
    expect(bar).toHaveAttribute('data-ink', 'ink')
    scrollToProgress(0.8)
    expect(bar).toHaveAttribute('data-ink', 'paper')
  })

  it('keeps the public landing outside the product shell', () => {
    renderAt('/', <App />)
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })
})

describe('landing stylesheet contracts', () => {
  it('scrolls a 500vh track past a sticky full-screen stage', () => {
    expect(landingCss).toMatch(/\.land-track\s*\{[^}]*position:\s*relative[^}]*height:\s*500vh/)
    expect(landingCss).toMatch(
      /\.land-stage\s*\{[^}]*position:\s*sticky[^}]*top:\s*0[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/
    )
  })

  it('covers the stage with the film and fades the canvas in once live', () => {
    expect(landingCss).toMatch(/\.land-video,\s*\.land-canvas\s*\{[^}]*object-fit:\s*cover/)
    expect(landingCss).toMatch(/\.land-canvas\s*\{[^}]*opacity:\s*0/)
    expect(landingCss).toMatch(/\.land-canvas\[data-live\]\s*\{[^}]*opacity:\s*1/)
  })

  it('parks the scene anchors in the middle of each full-opacity window', () => {
    expect(landingCss).toMatch(/\.land-anchor--reconcile\s*\{[^}]*top:\s*190vh/)
    expect(landingCss).toMatch(/\.land-anchor--review\s*\{[^}]*top:\s*350vh/)
  })

  it('scrolls smoothly only on the landing and only without reduced motion', () => {
    expect(landingCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*html:has\(\.land\)\s*\{\s*scroll-behavior:\s*smooth/
    )
  })

  it('derives colour from tokens only', () => {
    expect(landingCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('drops every transition under reduced motion', () => {
    const reduced = landingCss.slice(landingCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.land-stagger/)
    expect(reduced).toMatch(/transition:\s*none/)
  })
})
```

- [ ] **Step 2: Update the two shell-level tests**

In `apps/web/src/layout/SiteShell.test.tsx`, replace the test at lines 18-24
with:

```tsx
it('keeps the landing track and its film stage inside the sheet', () => {
  renderAt('/', <App />)
  const sheet = document.querySelector('.site-sheet')
  const land = sheet?.querySelector('main.land')
  expect(land).not.toBeNull()
  expect(land?.querySelector('.land-track .land-stage')).not.toBeNull()
})
```

In `apps/web/src/App.test.tsx`, the landing no longer carries a theme
toggle (the film sets its ground), so the toggle test moves to the app bar.
Replace the test at lines 37-45 with:

```tsx
it('keeps the root dataset in sync with later toggles', async () => {
  mockOsTheme(false)
  const user = userEvent.setup()
  createGuestSession()
  renderAt('/inbox', <App />)
  expect(document.documentElement.dataset.theme).toBe('light')
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('ladinglens-theme')).toBe('dark')
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `cd apps/web && bunx vitest run src/pages/LandingPage.test.tsx src/layout/SiteShell.test.tsx`
Expected: FAIL: "Unable to find ... Every email captured and accounted
for", "expected null not to be null" for `.land-track .land-stage`.

- [ ] **Step 4: Add Stagger**

`apps/web/src/features/landing/Stagger.tsx`:

```tsx
import type { ReactNode } from 'react'

type StaggerProps = { visible: boolean; delay?: number; children: ReactNode }

/** One entrance: rises 24px and fades in while visible, `delay` ms late. */
export function Stagger({ visible, delay = 0, children }: StaggerProps) {
  return (
    <div
      className="land-stagger"
      data-visible={visible || undefined}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Rewrite the page**

Replace `apps/web/src/pages/LandingPage.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowDown02Icon from '@hugeicons/core-free-icons/ArrowDown02Icon'
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon'
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon'
import { LandingNav } from '../features/landing/LandingNav'
import { Stagger } from '../features/landing/Stagger'
import { REVEAL_AT, inkIsPaper, sceneOpacities } from '../features/landing/scroll-math'
import { useVideoScrub } from '../features/landing/useVideoScrub'
import './landing-page.css'

// The MotionSites clip the page is built around: cloud, then a container
// ship on a dark sea. Its host sends open CORS, which the frame bank needs.
const FILM_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4'

type SceneProps = {
  opacity: number
  className: string
  children: (live: boolean) => ReactNode
}

// A scene fades with the scroll; its children rise in once it passes the
// reveal threshold, and only then do its links take the pointer.
function Scene({ opacity, className, children }: SceneProps) {
  const live = opacity > REVEAL_AT
  return (
    <section className={`land-scene ${className}`} style={{ opacity }} data-live={live || undefined}>
      {children(live)}
    </section>
  )
}

// A link in a scene that is not showing leaves the tab order and the
// accessibility tree; the scene's text stays readable.
function reach(live: boolean) {
  return live ? {} : ({ tabIndex: -1, 'aria-hidden': true } as const)
}

export function LandingPage() {
  const { trackRef, videoRef, canvasRef, progress, canvasLive } = useVideoScrub(FILM_SRC)
  const [hero, statement, close] = sceneOpacities(progress)

  return (
    <main className="land">
      <div className="land-track" ref={trackRef}>
        <span id="top" className="land-anchor land-anchor--top" />
        <span id="reconcile" className="land-anchor land-anchor--reconcile" />
        <span id="review" className="land-anchor land-anchor--review" />
        <div className="land-stage">
          <video
            ref={videoRef}
            className="land-video"
            src={FILM_SRC}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            className="land-canvas"
            width={1920}
            height={1080}
            data-live={canvasLive || undefined}
            aria-hidden="true"
          />
          <div className="land-overlay">
            <LandingNav paper={inkIsPaper(progress)} />
            <Scene opacity={hero} className="land-scene--hero">
              {(live) => (
                <>
                  <Stagger visible={live}>
                    <h1 className="land-title">Account for every shipping document.</h1>
                  </Stagger>
                  <Stagger visible={live} delay={150}>
                    <p className="land-subtitle">Every email captured and accounted for</p>
                  </Stagger>
                  <div className="land-hero-next">
                    <Stagger visible={live} delay={300}>
                      <a href="#reconcile" className="land-circle" aria-label="Next: reconciliation" {...reach(live)}>
                        <HugeiconsIcon icon={ArrowRight02Icon} size={18} aria-hidden="true" />
                      </a>
                    </Stagger>
                  </div>
                </>
              )}
            </Scene>
            <Scene opacity={statement} className="land-scene--statement">
              {(live) => (
                <>
                  <Stagger visible={live}>
                    <h2 className="land-statement">
                      Expected shipments reconciled <span className="land-soft">to the case ledger</span>{' '}
                      <span className="land-faint">independently of the inbox</span>
                    </h2>
                  </Stagger>
                  <div className="land-rail">
                    <Stagger visible={live} delay={200}>
                      <a href="#review" className="land-circle" aria-label="Next: human review" {...reach(live)}>
                        <HugeiconsIcon icon={ArrowDown02Icon} size={18} aria-hidden="true" />
                      </a>
                    </Stagger>
                    <Stagger visible={live} delay={350}>
                      <div className="land-dots" aria-hidden="true">
                        <span />
                        <span data-active="" />
                        <span />
                      </div>
                    </Stagger>
                    <Stagger visible={live} delay={500}>
                      <a
                        href="#top"
                        className="land-circle land-circle--small"
                        aria-label="Back to top"
                        {...reach(live)}
                      >
                        <HugeiconsIcon icon={ArrowUp01Icon} size={16} aria-hidden="true" />
                      </a>
                    </Stagger>
                  </div>
                </>
              )}
            </Scene>
            <Scene opacity={close} className="land-scene--close">
              {(live) => (
                <div className="land-close">
                  <Stagger visible={live}>
                    <p className="land-eyebrow">
                      <span className="land-data">NEEDS_REVIEW</span>
                      <span aria-hidden="true"> | </span>
                      Human authority
                    </p>
                  </Stagger>
                  <Stagger visible={live} delay={150}>
                    <h2 className="land-closing">
                      <span>Held for review,</span> <span>released by a person.</span>
                    </h2>
                  </Stagger>
                  <Stagger visible={live} delay={300}>
                    <Link to="/auth" className="land-cta" {...reach(live)}>
                      Enter the demo
                      <span className="land-cta-dot" aria-hidden="true">
                        <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                      </span>
                    </Link>
                  </Stagger>
                </div>
              )}
            </Scene>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Rewrite the stylesheet**

Replace `apps/web/src/pages/landing-page.css` with:

```css
/* The landing opts the page into smooth anchor scrolling, and clips
   sideways overflow, only while it is mounted. */
@media (prefers-reduced-motion: no-preference) {
  html:has(.land) {
    scroll-behavior: smooth;
  }
}

body:has(.land) {
  overflow-x: hidden;
}

.land {
  font-family: var(--font-ui);
  color: var(--film-ink);
}

/* The scroll distance: the 400vh past the first screen drives the film. */
.land-track {
  position: relative;
  height: 500vh;
}

/* Anchor targets in the middle of each scene's full-opacity window: p = 0,
   0.475 and 0.875 of the 400vh span. */
.land-anchor {
  position: absolute;
  left: 0;
  width: 1px;
  height: 1px;
}

.land-anchor--top {
  top: 0;
}

.land-anchor--reconcile {
  top: 190vh;
}

.land-anchor--review {
  top: 350vh;
}

/* One full-screen scene held in place while the track scrolls past. The sky
   colour shows until the first frame arrives, and stays if the film never
   does, so the navy copy reads either way. */
.land-stage {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--film-sky);
}

.land-video,
.land-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Decoded frames draw here once the frame bank is live; the video below
   carries the picture until then. */
.land-canvas {
  opacity: 0;
  transition: opacity 300ms var(--ease-standard);
}

.land-canvas[data-live] {
  opacity: 1;
}

.land-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.land-scene {
  position: absolute;
  inset: 0;
  transition: opacity 100ms ease-out;
}

/* Only a scene that is showing takes the pointer. */
.land-scene[data-live] a {
  pointer-events: auto;
}

.land-stagger {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 800ms var(--ease-film),
    transform 800ms var(--ease-film);
}

.land-stagger[data-visible] {
  opacity: 1;
  transform: none;
}

.land-circle {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--film-ink) 50%, transparent);
  border-radius: var(--radius-full);
  color: var(--film-ink);
  transition: opacity 300ms var(--ease-standard);
}

.land-circle:hover {
  opacity: 0.7;
}

.land-circle:focus-visible,
.land-cta:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Scene 1 holds left and centred; scene 3 holds right. */
.land-scene--hero,
.land-scene--close {
  display: flex;
  padding-inline: var(--spacing-7);
}

.land-scene--hero {
  flex-direction: column;
  justify-content: center;
}

.land-scene--close {
  align-items: center;
  justify-content: flex-end;
}

@media (min-width: 640px) {
  .land-scene--hero,
  .land-scene--close {
    padding-inline: var(--spacing-8);
  }
}

@media (min-width: 768px) {
  .land-scene--hero,
  .land-scene--close {
    padding-inline: 80px;
  }
}

@media (min-width: 1024px) {
  .land-scene--hero,
  .land-scene--close {
    padding-inline: 128px;
  }
}

.land-title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 5rem);
  font-weight: 300;
  line-height: 1.2;
  text-transform: uppercase;
}

.land-subtitle {
  margin: var(--spacing-7) 0 0;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--film-ink) 90%, transparent);
}

.land-hero-next {
  position: absolute;
  right: var(--spacing-7);
  bottom: var(--spacing-10);
}

@media (min-width: 640px) {
  .land-hero-next {
    right: var(--spacing-8);
  }
}

@media (min-width: 768px) {
  .land-hero-next {
    right: var(--spacing-10);
  }
}

/* Scene 2: the reconciliation statement, centred. */
.land-scene--statement {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: var(--spacing-7);
}

@media (min-width: 640px) {
  .land-scene--statement {
    padding-inline: var(--spacing-8);
  }
}

.land-statement {
  max-width: 900px;
  margin: 0;
  font-size: clamp(1.5rem, 4.5vw, 4.5rem);
  font-weight: 200;
  line-height: 1.3;
  letter-spacing: 0.025em;
  text-align: center;
  text-transform: uppercase;
}

/* 80% and 60% ink: 50% measures 2.55:1 on the cloud frames, under the 3:1
   floor for large text. */
.land-soft {
  color: color-mix(in srgb, var(--film-ink) 80%, transparent);
}

.land-faint {
  color: color-mix(in srgb, var(--film-ink) 60%, transparent);
}

.land-rail {
  position: absolute;
  right: var(--spacing-7);
  bottom: var(--spacing-11);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-5);
}

@media (min-width: 640px) {
  .land-rail {
    right: var(--spacing-8);
  }
}

@media (min-width: 768px) {
  .land-rail {
    right: var(--spacing-10);
  }
}

.land-rail .land-circle {
  border-color: color-mix(in srgb, var(--film-ink) 40%, transparent);
}

.land-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-5);
}

.land-dots span {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--film-ink) 40%, transparent);
}

.land-dots span[data-active] {
  width: 8px;
  height: 8px;
  background: var(--film-ink);
}

.land-rail .land-circle--small {
  width: 40px;
  height: 40px;
  margin-top: var(--spacing-3);
  border-color: color-mix(in srgb, var(--film-ink) 30%, transparent);
  color: color-mix(in srgb, var(--film-ink) 80%, transparent);
}

/* Scene 3: white type on the dark sea. Small type is full white: on these
   frames anything lighter falls under 4.5:1. */
.land-close {
  max-width: 42rem;
}

.land-eyebrow {
  margin: 0 0 var(--spacing-5);
  font-size: 18px;
  line-height: 28px;
  letter-spacing: 0.025em;
  color: var(--film-paper);
}

.land-data {
  font-family: var(--font-data);
  font-size: 16px;
  letter-spacing: -0.2px;
}

.land-closing {
  margin: 0 0 var(--spacing-8);
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--film-paper);
}

.land-closing span {
  display: block;
}

.land-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-5);
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--film-paper);
  text-decoration: none;
}

.land-cta-dot {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--film-paper);
  color: var(--film-ink);
  transition: transform 300ms var(--ease-standard);
}

.land-cta:hover .land-cta-dot {
  transform: scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .land-canvas,
  .land-scene,
  .land-stagger,
  .land-circle,
  .land-cta-dot {
    transition: none;
  }
}
```

- [ ] **Step 7: Delete the retired hero film component**

```bash
git rm apps/web/src/components/HeroFilm.tsx apps/web/src/components/hero-film.css
```

- [ ] **Step 8: Record the motion rule in DESIGN.md**

After the Motion Rules paragraph that ends "which repaints but never
relayouts.", add:

```markdown
The public landing adds scroll as a fifth driver. Its film's playhead
follows the scroll position through an exponential ease, its three scenes
cross-fade on opacity, and its bar changes ink over 500ms; nothing on it
runs on a timer except the bar's one entrance.
```

Replace the Reduced Motion paragraph with:

```markdown
`prefers-reduced-motion: reduce` drops every duration to 0ms. All
controls keep working, and the provenance jump becomes an instant
scroll to the source region. The landing film seeks straight to the scroll
position and never builds its frame bank, and anchor scrolling is instant.
```

- [ ] **Step 9: Run the full suite and the build**

Run: `cd apps/web && bun run test && bun run build`
Expected: all test files pass; `tsc -b` and `vite build` succeed, with
`frame-bank` in its own chunk.

- [ ] **Step 10: Commit**

```bash
git add -A apps/web/src/pages/LandingPage.tsx apps/web/src/pages/landing-page.css apps/web/src/pages/LandingPage.test.tsx apps/web/src/features/landing/Stagger.tsx apps/web/src/layout/SiteShell.test.tsx apps/web/src/App.test.tsx apps/web/src/components docs/DESIGN.md
git commit -m "feat(web): rebuild the landing as a scroll-scrubbed film"
```

---

### Task 7: Remove the retired port film

**Files:**

- Delete: `apps/web/public/media/ladinglens-port-loop.mp4`,
  `apps/web/public/media/ladinglens-port-loop.webm`,
  `apps/web/public/media/ladinglens-port-poster.webp`,
  `apps/web/public/media/README.md`

- [ ] **Step 1: Confirm nothing serves them**

Run: `git grep -n "ladinglens-port" -- apps`
Expected: only `apps/web/public/media/README.md`.

- [ ] **Step 2: Delete and verify the build**

```bash
git rm -r apps/web/public/media
cd apps/web && bun run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(web): remove the retired port film media"
```

---

### Task 8: Add the silk canvas

**Files:**

- Create: `apps/web/src/components/SilkCanvas.tsx`
- Test: `apps/web/src/components/SilkCanvas.test.tsx`

**Interfaces:**

- Produces:
  `SilkCanvas({ className?, speed = 10, scale = 1, rotation = 8 }: SilkCanvasProps)`,
  an `aria-hidden` canvas tinted by `--silk-tint` read from its computed
  style.

- [ ] **Step 1: Write the failing test**

`apps/web/src/components/SilkCanvas.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SilkCanvas } from './SilkCanvas'

type Resize = (entries: Array<{ contentRect: { width: number; height: number } }>) => void

let resize: Resize | null = null
const putImageData = vi.fn()

class FakeResizeObserver {
  constructor(callback: Resize) {
    resize = callback
  }
  observe() {}
  disconnect() {}
}

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }) as MediaQueryList
  )
}

beforeEach(() => {
  resize = null
  putImageData.mockClear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountSized() {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  const view = render(<SilkCanvas />)
  const canvas = view.container.querySelector('canvas') as HTMLCanvasElement
  canvas.style.setProperty('--silk-tint', '#4a6680')
  resize?.([{ contentRect: { width: 400, height: 800 } }])
  return canvas
}

describe('SilkCanvas', () => {
  it('is decorative', () => {
    const view = render(<SilkCanvas />)
    expect(view.container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })

  it('stays idle where nothing can measure it', () => {
    render(<SilkCanvas />)
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled()
  })

  it('paints at a quarter of its size', () => {
    reduceMotion(true)
    const canvas = mountSized()
    expect(canvas.width).toBe(100)
    expect(canvas.height).toBe(200)
  })

  it('paints one still frame under reduced motion', () => {
    reduceMotion(true)
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    mountSized()
    expect(putImageData).toHaveBeenCalledTimes(1)
    expect(raf).not.toHaveBeenCalled()
  })

  it('animates while it has a size', () => {
    reduceMotion(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    mountSized()
    expect(raf).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/components/SilkCanvas.test.tsx`
Expected: FAIL, "Failed to resolve import ./SilkCanvas".

- [ ] **Step 3: Implement**

`apps/web/src/components/SilkCanvas.tsx`:

```tsx
import { useEffect, useRef } from 'react'

// Painted at a quarter of the panel's size and scaled up by the browser: the
// sheen is smooth, so the saving costs nothing visible.
const RESOLUTION = 0.25

type SilkCanvasProps = {
  className?: string
  speed?: number
  scale?: number
  rotation?: number
}

function hexToRgb(value: string): readonly [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The login-v3 silk: a slow sheen in the --silk-tint colour, after admincn's
 * canvas port of the pattern. It paints only while it has a size, and holds
 * one still frame under reduced motion.
 */
export function SilkCanvas({ className, speed = 10, scale = 1, rotation = 8 }: SilkCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    let context: CanvasRenderingContext2D | null = null
    let tint: readonly [number, number, number] | null = null
    let elapsed = 0
    let last: number | null = null
    let raf = 0

    const paint = () => {
      const { width, height } = canvas
      if (!context || !tint || width === 0 || height === 0) return
      const image = context.createImageData(width, height)
      const data = image.data
      const phase = speed * elapsed
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const px = (x / width) * scale
          const py = (y / height) * scale
          const u = (cos * px - sin * py) * scale
          const v = (sin * px + cos * py) * scale + 0.03 * Math.sin(8 * u - phase)
          const sheen =
            0.6 +
            0.4 * Math.sin(5 * (u + v + Math.cos(3 * u + 5 * v) + 0.02 * phase) + Math.sin(20 * (u + v - 0.1 * phase)))
          const offset = (y * width + x) * 4
          data[offset] = tint[0] * sheen
          data[offset + 1] = tint[1] * sheen
          data[offset + 2] = tint[2] * sheen
          data[offset + 3] = 255
        }
      }
      context.putImageData(image, 0, 0)
    }

    const tick = (now: number) => {
      elapsed += (last === null ? 0.016 : Math.min((now - last) / 1000, 0.05)) * 0.1
      last = now
      paint()
      raf = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf)
      const width = Math.round(entry.contentRect.width * RESOLUTION)
      const height = Math.round(entry.contentRect.height * RESOLUTION)
      if (width === 0 || height === 0) return
      canvas.width = width
      canvas.height = height
      context ??= canvas.getContext('2d')
      tint ??= hexToRgb(getComputedStyle(canvas).getPropertyValue('--silk-tint'))
      if (still) {
        paint()
      } else {
        last = null
        raf = requestAnimationFrame(tick)
      }
    })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [speed, scale, rotation])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `cd apps/web && bunx vitest run src/components/SilkCanvas.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/SilkCanvas.tsx apps/web/src/components/SilkCanvas.test.tsx
git commit -m "feat(web): add the silk canvas background"
```

---

### Task 9: Rebuild the sign-in on the login-v3 split

**Files:**

- Modify: `apps/web/src/pages/AuthPage.tsx` (full rewrite)
- Modify: `apps/web/src/pages/auth-page.css` (full rewrite)
- Modify: `apps/web/src/pages/AuthPage.test.tsx` (full rewrite)
- Modify: `docs/DESIGN.md` (Motion Rules)

**Interfaces:**

- Consumes: `SilkCanvas` (Task 8); `Field`, `Button` from
  `components/ui/Controls`; `VerdictCheckGlyph`, `VerdictCrossGlyph`,
  `VerdictHoldGlyph` from `components/ui/Icons`; `ensureGuestSession`;
  `readTheme`.

- [ ] **Step 1: Write the failing test**

Replace `apps/web/src/pages/AuthPage.test.tsx` with:

```tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'
import authCss from './auth-page.css?raw'

function storedValues(): string {
  const values: string[] = []
  for (const storage of [sessionStorage, localStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      values.push(storage.getItem(storage.key(i)!) ?? '')
    }
  }
  return values.join('\n')
}

describe('auth page', () => {
  it('sets the sign-in column beside the about panel', () => {
    renderAt('/auth', <App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Guest access is the only entry for this demo.')).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'About this demo' })
    expect(within(panel).getByText('Every shipping document, checked against its evidence.')).toBeInTheDocument()
    expect(within(panel).getByText('Match, mismatch, held.')).toBeInTheDocument()
    expect(within(panel).getByText('Short of evidence, a named person decides.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('offers one action and two plain links', () => {
    renderAt('/auth', <App />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Sign in as Guest')
    expect(screen.getByRole('link', { name: 'LadingLens home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Open the live demo' })).toHaveAttribute('href', '/judge')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('says that nothing typed is kept', () => {
    renderAt('/auth', <App />)
    expect(screen.getByText('Synthetic data only. Nothing you type is stored or sent.')).toBeInTheDocument()
  })

  it('keeps the credential fields presentational', () => {
    renderAt('/auth', <App />)
    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    expect(email.closest('form')).toBeNull()
    expect(password.closest('form')).toBeNull()
    expect(email).not.toHaveAttribute('name')
    expect(password).not.toHaveAttribute('name')
    expect(email).toHaveAttribute('autocomplete', 'off')
    expect(password).toHaveAttribute('autocomplete', 'off')
  })

  it('enters the inbox as a guest without storing typed credentials', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAt('/auth', <App />)
    await user.type(screen.getByLabelText('Email'), 'operator@averis.example')
    await user.type(screen.getByLabelText('Password'), 'tr1al-passw0rd')
    await user.click(screen.getByRole('button', { name: 'Sign in as Guest' }))
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
    expect(readGuestSession()).not.toBeNull()
    const stored = storedValues()
    expect(stored).not.toContain('operator@averis.example')
    expect(stored).not.toContain('tr1al-passw0rd')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the silk and the verdict row decorative', () => {
    renderAt('/auth', <App />)
    const panel = screen.getByRole('region', { name: 'About this demo' })
    expect(panel.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(panel.querySelector('.auth-verdicts')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('auth stylesheet contracts', () => {
  it('derives colour from tokens only', () => {
    expect(authCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('drops the panel below 1024px', () => {
    expect(authCss).toMatch(/@media \(max-width: 1023\.98px\)[^@]*\.auth-panel\s*\{\s*display:\s*none/)
  })

  it('rounds the silk card and the notched card on the xl radius', () => {
    expect(authCss).toMatch(/\.auth-card\s*\{[^}]*border-radius:\s*var\(--radius-xl\)/)
    expect(authCss).toMatch(/\.auth-notch\s*\{[^}]*border-radius:\s*var\(--radius-xl\)/)
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/web && bunx vitest run src/pages/AuthPage.test.tsx`
Expected: FAIL: no region "About this demo" text "Match, mismatch,
held.", no link "LadingLens home".

- [ ] **Step 3: Rewrite the page**

Replace `apps/web/src/pages/AuthPage.tsx` with:

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { SilkCanvas } from '../components/SilkCanvas'
import { Button, Field } from '../components/ui/Controls'
import { VerdictCheckGlyph, VerdictCrossGlyph, VerdictHoldGlyph } from '../components/ui/Icons'
import { ensureGuestSession } from '../lib/guest-session'
import { readTheme } from '../lib/theme'
import './auth-page.css'

export function AuthPage() {
  const navigate = useNavigate()
  const dark = readTheme() === 'dark'

  const enterAsGuest = () => {
    ensureGuestSession()
    navigate('/inbox')
  }

  return (
    <main className="auth">
      <section className="auth-form" aria-labelledby="auth-heading">
        <div className="auth-stack">
          <Link to="/" className="auth-brand" aria-label="LadingLens home">
            <img
              className="auth-lockup"
              src={dark ? '/brand/lockup-dark.svg' : '/brand/lockup-colour.svg'}
              alt=""
              width={172}
              height={32}
            />
          </Link>
          <div className="auth-head">
            <h1 className="auth-heading" id="auth-heading">
              Sign in
            </h1>
            <p className="auth-subhead">Guest access is the only entry for this demo.</p>
          </div>
          <div className="auth-fields">
            <Field label="Email" type="email" autoComplete="off" placeholder="name@company.com" />
            <Field label="Password" type="password" autoComplete="off" />
          </div>
          <p className="auth-note">Synthetic data only. Nothing you type is stored or sent.</p>
          <Button className="auth-submit" onClick={enterAsGuest}>
            Sign in as Guest
          </Button>
          <p className="auth-alt">
            Testing your own documents?{' '}
            <Link to="/judge" className="auth-alt-link">
              Open the live demo
            </Link>
          </p>
        </div>
      </section>
      <section className="auth-panel" aria-label="About this demo">
        <div className="auth-card">
          <SilkCanvas className="auth-silk" />
          <div className="auth-card-head">
            <p className="auth-headline">Every shipping document, checked against its evidence.</p>
            <p className="auth-copy">
              Walk the inbox, comparison, review, and reconciliation views for a synthetic shipping operation.
            </p>
          </div>
          <div className="auth-notch">
            <svg className="auth-notch-shape" viewBox="0 0 1094 249" aria-hidden="true">
              <path
                d="M0.263672 16.8809C0.263672 8.0443 7.42712 0.880859 16.2637 0.880859H786.394H999.115C1012.37 0.880859 1023.12 11.626 1023.12 24.8808L1023.12 47.3809C1023.12 60.6357 1033.86 71.3809 1047.12 71.3809H1069.6C1082.85 71.3809 1093.6 82.126 1093.6 95.3809L1093.6 232.881C1093.6 241.717 1086.43 248.881 1077.6 248.881H16.2637C7.42716 248.881 0.263672 241.717 0.263672 232.881V16.8809Z"
                fill="currentColor"
              />
            </svg>
            <span className="auth-notch-mark">
              <img src={dark ? '/brand/mark-dark.svg' : '/brand/mark-colour.svg'} alt="" width={32} height={32} />
            </span>
            <div className="auth-notch-body">
              <p className="auth-notch-title">Match, mismatch, held.</p>
              <p className="auth-notch-copy">Short of evidence, a named person decides.</p>
              <div className="auth-verdicts" aria-hidden="true">
                <span className="auth-verdict auth-verdict--match">
                  <VerdictCheckGlyph size={20} />
                </span>
                <span className="auth-verdict auth-verdict--mismatch">
                  <VerdictCrossGlyph size={20} />
                </span>
                <span className="auth-verdict auth-verdict--held">
                  <VerdictHoldGlyph size={20} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Rewrite the stylesheet**

Replace `apps/web/src/pages/auth-page.css` with:

```css
/* login-v3: the sign-in column, and from 1024px a silk panel beside it. */
.auth {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 100dvh;
  background: var(--surface-canvas);
}

.auth-form {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: var(--spacing-8);
}

.auth-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-7);
  width: 100%;
  max-width: 32rem;
  padding: var(--spacing-7);
}

.auth-brand {
  align-self: flex-start;
  border-radius: var(--radius-sm);
}

.auth-brand:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.auth-lockup {
  display: block;
  width: 172px;
  height: 32px;
}

.auth-head {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.auth-heading {
  margin: 0;
  font: var(--type-heading-lg);
  letter-spacing: var(--type-heading-lg-tracking);
}

.auth-subhead {
  margin: 0;
  font: var(--type-body-lg);
  color: var(--text-secondary);
}

.auth-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.auth-note {
  margin: 0;
  font: var(--type-body-sm);
  color: var(--text-tertiary);
}

.auth-submit {
  width: 100%;
}

.auth-alt {
  margin: 0;
  text-align: center;
  color: var(--text-secondary);
}

.auth-alt-link {
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-decoration: none;
}

.auth-alt-link:hover {
  text-decoration: underline;
}

.auth-alt-link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* The panel: a sunken frame around one silk card, pinned while the form
   column scrolls on short screens. */
.auth-panel {
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: var(--spacing-6);
  background: var(--surface-sunken);
}

.auth-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--spacing-8);
  height: 100%;
  padding-block: var(--spacing-8);
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--radius-xl);
  background: var(--silk-tint);
  color: var(--film-paper);
}

.auth-silk {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.auth-card-head {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-7);
  padding-inline: var(--spacing-8);
}

.auth-headline {
  margin: 0;
  font: var(--type-display-md);
  font-weight: 700;
  letter-spacing: var(--type-display-md-tracking);
}

.auth-copy {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
}

/* The notched card. Its shape is drawn wider than any panel and pinned
   right, so the notch holds its place and the left edge is simply cut. */
.auth-notch {
  position: relative;
  height: 248px;
  margin-inline: var(--spacing-8);
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--radius-xl);
  color: var(--text-primary);
}

.auth-notch-shape {
  position: absolute;
  top: 0;
  right: 0;
  z-index: -1;
  width: 1094px;
  height: 249px;
  color: var(--surface-canvas);
}

.auth-notch-mark {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-xl);
  background: var(--surface-raised);
}

.auth-notch-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  height: 100%;
  padding: var(--spacing-7);
}

.auth-notch-title {
  margin: 0;
  padding-right: var(--spacing-10);
  font: var(--type-heading-lg);
  font-weight: 700;
  letter-spacing: var(--type-heading-lg-tracking);
}

.auth-notch-copy {
  margin: 0;
  font-size: 18px;
  line-height: 28px;
  color: var(--text-secondary);
}

.auth-verdicts {
  display: flex;
  align-self: flex-end;
  margin-top: auto;
}

.auth-verdict {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 2px var(--surface-canvas);
}

.auth-verdict + .auth-verdict {
  margin-left: -16px;
}

.auth-verdict--match {
  background: var(--state-match-fill);
  color: var(--state-match-text);
}

.auth-verdict--mismatch {
  background: var(--state-mismatch-fill);
  color: var(--state-mismatch-text);
}

.auth-verdict--held {
  background: var(--state-held-fill);
  color: var(--state-held-text);
}

@media (min-width: 1280px) {
  .auth-headline {
    font: var(--type-display-lg);
    font-weight: 700;
    letter-spacing: var(--type-display-lg-tracking);
  }

  .auth-notch-title {
    font-size: 30px;
    line-height: 36px;
  }
}

@media (max-width: 1023.98px) {
  .auth {
    grid-template-columns: minmax(0, 1fr);
  }

  .auth-panel {
    display: none;
  }
}

@media (max-width: 639.98px) {
  .auth-form {
    padding-inline: 0;
  }
}
```

- [ ] **Step 5: Record the silk in DESIGN.md**

In the Motion Rules paragraph, replace "`glow-pulse` on decorative orbs and
`shimmer` on skeleton bars;" with "`glow-pulse` on decorative orbs,
`shimmer` on skeleton bars and the silk behind the sign-in panel, a canvas
repaint that holds one frame under reduced motion;".

- [ ] **Step 6: Run the tests and the build**

Run: `cd apps/web && bun run test && bun run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/AuthPage.tsx apps/web/src/pages/auth-page.css apps/web/src/pages/AuthPage.test.tsx docs/DESIGN.md
git commit -m "feat(web): rebuild the sign-in on the silk split layout"
```

---

### Task 10: Verify in a browser and refresh the artefacts

**Files:**

- Modify: `assets/screens/01-landing.png`
- Modify: `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`,
  `graphify-out/graph.html`

- [ ] **Step 1: Lint, test and build from clean**

Run: `cd apps/web && bun run lint && bun run test && bun run build`
Expected: no new oxlint findings; all tests pass; build succeeds.

- [ ] **Step 2: Browser pass**

Start `bun run dev` in `apps/web` (port 5173). Installed Chrome is driven
rather than Playwright's Chromium, which lacks H.264 for both the video
element and WebCodecs. Save as `$SCRATCH/verify.mjs` (outside the repo) and
run `OUT=$SCRATCH/shots node $SCRATCH/verify.mjs`:

```js
import { mkdirSync } from 'node:fs'
import { chromium } from '/Users/yk/Projects/hackathon.repository/averis.repository/averis/apps/web/node_modules/playwright/index.mjs'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = process.env.OUT
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const errors = []

async function open(viewport, theme) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  if (theme) await context.addInitScript((value) => localStorage.setItem('ladinglens-theme', value), theme)
  const page = await context.newPage()
  page.on('console', (message) => message.type() === 'error' && errors.push(`${viewport.width} ${message.text()}`))
  page.on('pageerror', (error) => errors.push(`${viewport.width} ${error.message}`))
  return page
}

// Jump, not glide: inline auto beats the landing's smooth-scroll rule.
async function scrollToProgress(page, progress) {
  await page.evaluate((p) => {
    const track = document.querySelector('.land-track')
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, p * (track.offsetHeight - innerHeight))
  }, progress)
  await page.waitForTimeout(1500)
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 }
]) {
  const page = await open(viewport)
  await page.goto(`${BASE}/`)
  const live = await page.waitForSelector('canvas.land-canvas[data-live]', { timeout: 60_000 }).then(
    () => true,
    () => false
  )
  console.log(`${viewport.width}px canvas live: ${live}`)
  for (const progress of [0, 0.475, 0.875]) {
    await scrollToProgress(page, progress)
    await page.screenshot({ path: `${OUT}/land-${viewport.width}-${progress}.png` })
  }
  if (viewport.width === 390) {
    await scrollToProgress(page, 0)
    await page.click('button[aria-label="Open menu"]')
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/menu-390.png` })
  }
  await page.context().close()
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 }
  ]) {
    const page = await open(viewport, theme)
    await page.goto(`${BASE}/auth`)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${OUT}/auth-${theme}-${viewport.width}.png` })
    await page.context().close()
  }
}

console.log(errors.length ? errors.join('\n') : 'no console errors')
await browser.close()
```

Expected: `canvas live: true` at both widths, the three scenes in the
landing captures, the navy menu, both `/auth` themes, and no console
errors. Read every capture before moving on.

- [ ] **Step 3: Refresh the README landing screenshot**

The existing screens are 1440x900 8-bit palette PNGs. Quantise the p = 0
capture the same way with ffmpeg (no pngquant on this machine):

```bash
ffmpeg -v error -y -i "$SCRATCH/shots/land-1440-0.png" \
  -vf "split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=sierra2_4a" \
  assets/screens/01-landing.png
file assets/screens/01-landing.png
git add assets/screens/01-landing.png
git commit -m "docs(readme): refresh the landing screenshot"
```

- [ ] **Step 4: Refresh the knowledge graph**

```bash
graphify update .
git add graphify-out
git commit -m "chore(graphify): refresh the knowledge graph"
```

## Final integration checklist

- [ ] `bun run lint`, `bun run test`, `bun run build` green in `apps/web`.
- [ ] Browser pass: canvas goes live; scenes change at the three anchors;
      menu traps focus; `/auth` light and dark match the spec.
- [ ] No hex outside `tokens.css`; no em or en dash in interface copy.
- [ ] Spec decisions table still true of the code.
