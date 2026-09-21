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
