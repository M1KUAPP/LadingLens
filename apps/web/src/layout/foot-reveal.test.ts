import { describe, expect, it } from 'vitest'
import { footReveal } from './foot-reveal'

describe('footReveal', () => {
  // A 3000px page in an 800px viewport scrolls 2200px; a 600px footer is
  // uncovered over the last 600 of them.
  it('runs from 0 to 1 over the last footer height of scroll', () => {
    expect(footReveal(1000, 3000, 800, 600)).toBe(0)
    expect(footReveal(1600, 3000, 800, 600)).toBe(0)
    expect(footReveal(1900, 3000, 800, 600)).toBe(0.5)
    expect(footReveal(2200, 3000, 800, 600)).toBe(1)
  })

  it('clamps an overscrolled page to fully shown', () => {
    expect(footReveal(2400, 3000, 800, 600)).toBe(1)
  })

  it('rests at 1 when the footer has no height', () => {
    expect(footReveal(0, 0, 768, 0)).toBe(1)
  })
})
