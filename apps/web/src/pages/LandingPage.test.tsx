import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { HeroFilm } from '../components/HeroFilm'
import { renderAt } from '../test/render'
import landingCss from './landing-page.css?raw'
import filmCss from '../components/hero-film.css?raw'

describe('landing page', () => {
  it('presents the two controls and the human authority boundary', () => {
    renderAt('/', <App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Account for every shipping document.'
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Gate 1')).toBeInTheDocument()
    expect(screen.getByText('Gate 2')).toBeInTheDocument()
    expect(screen.getByText('Human authority')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open live demo' })).toHaveAttribute('href', '/judge')
  })

  it('keeps the three facts as semantic terms with descriptions', () => {
    renderAt('/', <App />)
    for (const term of ['Gate 1', 'Gate 2', 'Human authority']) {
      const dt = screen.getByText(term)
      expect(dt.tagName).toBe('DT')
      const dd = dt.nextElementSibling
      expect(dd?.tagName).toBe('DD')
      expect(dd?.textContent).toBeTruthy()
    }
    expect(document.querySelector('dl.land-facts')).not.toBeNull()
  })

  it('states the gate facts accurately', () => {
    renderAt('/', <App />)
    const facts = document.querySelectorAll('dl.land-facts dd')
    const copy = [...facts].map((dd) => dd.textContent ?? '')
    expect(copy[0]).toMatch(/every incoming email/i)
    expect(copy[1]).toMatch(/expected shipments/i)
    expect(copy[1]).toMatch(/independent/i)
    expect(copy[2]).toMatch(/NEEDS_REVIEW/)
    expect(copy[2]).toMatch(/release authority/i)
  })

  it('offers a keyboard-operable pause control while the film plays', async () => {
    const user = userEvent.setup()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    renderAt('/', <App />)
    const toggle = screen.getByRole('button', { name: 'Pause film' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Play film' })).toHaveAttribute('aria-pressed', 'true')
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('names the header controls and lays out five fold segments', () => {
    renderAt('/', <App />)
    expect(screen.getByRole('button', { name: /switch to (dark|light) theme/i })).toBeInTheDocument()
    expect(document.querySelectorAll('.land-strip span')).toHaveLength(5)
  })

  it('keeps the public landing outside the product shell', () => {
    renderAt('/', <App />)
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })
})

describe('hero film', () => {
  it('does not render video for reduced-motion users', () => {
    render(<HeroFilm reducedMotion />)
    expect(screen.queryByTestId('hero-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('hero-poster')).toBeInTheDocument()
  })

  it('reveals the poster only after it loads over the branded fallback', () => {
    render(<HeroFilm reducedMotion />)
    const poster = screen.getByTestId('hero-poster')
    expect(poster).not.toHaveAttribute('data-ready')
    fireEvent.load(poster)
    expect(poster).toHaveAttribute('data-ready', 'true')
  })

  it('serves the contracted media sources for motion users', () => {
    render(<HeroFilm reducedMotion={false} />)
    const video = screen.getByTestId('hero-video')
    expect(video).toHaveProperty('muted', true)
    expect(video).toHaveProperty('loop', true)
    expect(video).toHaveProperty('playsInline', true)
    expect(video).toHaveProperty('autoplay', true)
    expect(video).toHaveAttribute('poster', '/media/ladinglens-port-poster.webp')
    const sources = video.querySelectorAll('source')
    expect(sources[0]).toHaveAttribute('src', '/media/ladinglens-port-loop.webm')
    expect(sources[1]).toHaveAttribute('src', '/media/ladinglens-port-loop.mp4')
  })
})

describe('landing stylesheet contracts', () => {
  it('is one 1040px centred column that never positions the landing box', () => {
    expect(landingCss).toMatch(/\.land\s*\{[^}]*min-height:\s*100dvh/)
    expect(landingCss).toMatch(/\.land\s*\{[^}]*max-width:\s*1040px/)
    // The film must resolve against the sheet, not the landing column:
    // .land may not establish a containing block for absolute children.
    expect(landingCss).not.toMatch(/\.land\s*\{[^}]*\b(position|isolation|transform|filter)\b/)
    expect(landingCss).toMatch(/\.land-film\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*-1/)
  })

  it('fades the film down and up on mobile, left-to-right at 720px', () => {
    expect(landingCss).toContain('min-width: 720px')
    expect(landingCss).toContain('to bottom')
    expect(landingCss).toContain('to right')
    expect(landingCss).toContain('to top')
  })

  it('hides the fact band below 720px and pins it low as three tracks', () => {
    expect(landingCss).toMatch(/\.land-facts\s*\{[^}]*display:\s*none/)
    expect(landingCss).toContain('repeat(3, 1fr)')
    expect(landingCss).toContain('margin-top: auto')
    expect(landingCss).toContain('justify-self: start')
    expect(landingCss).toContain('justify-self: center')
    expect(landingCss).toContain('justify-self: end')
  })

  it('keeps the header controls one 44px pill family', () => {
    expect(landingCss).toMatch(/\.land-theme\s*\{[^}]*width:\s*44px/)
    expect(landingCss).toMatch(/\.land-theme\s*\{[^}]*height:\s*44px/)
    expect(landingCss).toMatch(/\.land-go\s*\{[^}]*min-height:\s*44px/)
    expect(landingCss).toMatch(/\.land-theme\s*\{[^}]*border-radius:\s*var\(--radius-full\)/)
    expect(landingCss).toMatch(/\.land-go\s*\{[^}]*border-radius:\s*var\(--radius-full\)/)
  })

  it('lays out the five-segment 10px fold strip', () => {
    expect(landingCss).toMatch(/\.land-strip\s*\{[^}]*height:\s*10px/)
    expect(landingCss).toContain('nth-child(5)')
  })

  it('derives colour from tokens only', () => {
    expect(landingCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(filmCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('animates nothing but opacity on the film', () => {
    expect(filmCss).not.toMatch(/transform|translate|keyframes/i)
    expect(filmCss).toContain('opacity')
  })
})
