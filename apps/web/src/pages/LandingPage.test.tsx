import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import shellCss from '../layout/site-shell.css?raw'
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
    expect(document.querySelector('.land-eyebrow')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Evidence first | Human authority'
    )
  })

  it('keeps a word gap in the eyebrow for assistive tech', () => {
    renderAt('/', <App />)
    const eyebrow = document.querySelector('.land-eyebrow') as HTMLElement
    const spoken = [...eyebrow.childNodes]
      .filter((node) => !(node instanceof HTMLElement && node.getAttribute('aria-hidden') === 'true'))
      .map((node) => node.textContent ?? '')
      .join('')
    expect(spoken.replace(/\s+/g, ' ').trim()).toBe('Evidence first Human authority')
    expect(eyebrow.textContent?.replace(/\s+/g, ' ').trim()).toBe('Evidence first | Human authority')
  })

  it('keeps the raw status enum out of the copy (issue #41)', () => {
    renderAt('/', <App />)
    expect(document.querySelector('main.land')?.textContent).not.toMatch(/NEEDS_REVIEW/)
  })

  it('offers the way in from the bar and from the last scene', () => {
    renderAt('/', <App />)
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/auth')
    scrollToProgress(0.875)
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Enter the demo' })).toHaveAttribute(
      'href',
      '/auth'
    )
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
    const cta = within(screen.getByRole('main')).getByText('Enter the demo').closest('a')
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

  it("rings focus on the circles and CTA in the film's own ink, never the theme focus ring", () => {
    expect(landingCss).toMatch(
      /\.land-circle:focus-visible,[^{]*\{[^}]*outline:\s*2px solid currentColor;[^}]*outline-offset:\s*3px/
    )
    expect(landingCss).not.toMatch(/var\(--focus-ring\)/)
  })

  it('drops every transition under reduced motion', () => {
    const reduced = landingCss.slice(landingCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/transition:\s*none/)
    for (const selector of ['.land-canvas', '.land-scene', '.land-stagger', '.land-circle', '.land-cta-dot']) {
      expect(reduced).toMatch(new RegExp(`\\${selector}(?![\\w-])`))
    }
  })

  it("keeps the fixed menu's ancestors free of a containing block", () => {
    // position: fixed inside .land-stage's sticky ancestry means .land,
    // .land-track, .land-stage, .land-overlay and every .site-sheet block
    // must never gain a transform, filter, perspective, contain or
    // will-change, or the full-screen menu would be trapped inside them.
    const trapped = /\b(transform|filter|perspective|contain|will-change)\s*:/

    function ruleBodies(css: string, selector: string): string[] {
      const pattern = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, 'g')
      return [...css.matchAll(pattern)].map((match) => match[1])
    }

    for (const selector of ['.land', '.land-track', '.land-stage', '.land-overlay']) {
      const bodies = ruleBodies(landingCss, selector)
      expect(bodies.length).toBeGreaterThan(0)
      for (const body of bodies) expect(body).not.toMatch(trapped)
    }

    const sheetBodies = ruleBodies(shellCss, '.site-sheet')
    expect(sheetBodies.length).toBeGreaterThanOrEqual(2)
    for (const body of sheetBodies) expect(body).not.toMatch(trapped)
  })
})
