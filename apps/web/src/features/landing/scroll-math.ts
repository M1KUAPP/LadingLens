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
