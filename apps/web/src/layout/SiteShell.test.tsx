import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { renderAt } from '../test/render'
import shellCss from './site-shell.css?raw'

describe('site shell', () => {
  it('renders the opaque page sheet before a sibling fixed footer', () => {
    renderAt('/', <App />)
    const sheet = document.querySelector('.site-sheet')
    const foot = document.querySelector('footer.site-foot')
    expect(sheet).not.toBeNull()
    expect(foot).not.toBeNull()
    expect(sheet?.nextElementSibling).toBe(foot)
  })

  it('keeps the landing track and its film stage inside the sheet', () => {
    renderAt('/', <App />)
    const sheet = document.querySelector('.site-sheet')
    const land = sheet?.querySelector('main.land')
    expect(land).not.toBeNull()
    expect(land?.querySelector('.land-track .land-stage')).not.toBeNull()
  })

  it('reserves the footer height as sheet margin and fixes the footer behind it', () => {
    expect(shellCss).toMatch(/--foot-h:\s*min\(100dvh, 560px\)/)
    expect(shellCss).toMatch(/--foot-h:\s*min\(100dvh, 720px\)/)
    expect(shellCss).toContain('min-width: 720px')
    expect(shellCss).toMatch(/\.site-sheet\s*\{[^}]*margin-bottom:\s*var\(--foot-h\)/)
    expect(shellCss).toMatch(/\.site-sheet\s*\{[^}]*z-index:\s*1/)
    expect(shellCss).toMatch(/\.site-sheet\s*\{[^}]*min-height:\s*100dvh/)
    expect(shellCss).toMatch(/\.site-foot\s*\{[^}]*position:\s*fixed/)
    expect(shellCss).toMatch(/\.site-foot\s*\{[^}]*z-index:\s*0/)
    expect(shellCss).toMatch(/\.site-foot\s*\{[^}]*height:\s*var\(--foot-h\)/)
  })

  it('derives colour from tokens only', () => {
    expect(shellCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('flattens the reveal geometry and hides the fixed footer in print', () => {
    const print = shellCss.slice(shellCss.indexOf('@media print'))
    expect(print).toMatch(/\.site-sheet\s*\{[^}]*margin-bottom:\s*0/)
    expect(print).toMatch(/\.site-sheet\s*\{[^}]*min-height:\s*0/)
    expect(print).toMatch(/\.site-sheet\s*\{[^}]*background:\s*none/)
    expect(print).toMatch(/\.site-foot\s*\{[^}]*display:\s*none/)
  })

  it('rings focused footer controls with the shared token, not a second outline', () => {
    for (const control of ['pill', 'brand', 'top']) {
      expect(shellCss).toMatch(
        new RegExp(
          `\\.site-foot-${control}:focus-visible\\s*\\{[^}]*outline:\\s*none[^}]*box-shadow:\\s*var\\(--focus-ring\\)`
        )
      )
    }
    expect(shellCss).toMatch(/\.site-foot-top:focus-visible\s*\{[^}]*border-radius:\s*var\(--radius-sm\)/)
    expect(shellCss).toMatch(/\.site-foot-top:hover\s*\{[^}]*color:\s*var\(--text-primary\)/)
    expect(shellCss).not.toMatch(/\.site-foot-top:hover\s*,\s*\.site-foot-top:focus-visible/)
  })

  it('stops the footer loops and the magnetic pull under reduced motion', () => {
    const reduced = shellCss.slice(shellCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.site-foot-aurora span,/)
    expect(reduced).toMatch(/\.site-foot-grid::before\s*\{[^}]*animation:\s*none/)
    expect(reduced).toMatch(/\.site-foot-pill-label\s*\{[^}]*transform:\s*none/)
  })

  it('runs every footer loop and transition on a duration token', () => {
    const motion = shellCss.match(/(transition|animation)(-duration)?:[^;{}]*;/g) ?? []
    expect(motion.length).toBeGreaterThan(0)
    for (const rule of motion) {
      if (/:\s*none;/.test(rule)) continue
      expect(rule).toMatch(/var\(--duration-/)
    }
  })

  it('keeps the aurora, the grid and the giant word out of the accessibility tree, with no moving band', () => {
    renderAt('/', <App />)
    const foot = screen.getByRole('contentinfo')
    for (const selector of ['.site-foot-aurora', '.site-foot-grid', '.site-foot-word']) {
      expect(foot.querySelector(selector)).toHaveAttribute('aria-hidden', 'true')
    }
    expect(foot.querySelector('.site-foot-marquee')).toBeNull()
  })

  it('pulls a magnetic pill toward a mouse pointer and lets it go when the pointer leaves', () => {
    renderAt('/', <App />)
    const pill = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'GitHub' })
    const field = pill.closest('.site-foot-magnet') as HTMLElement
    fireEvent.pointerMove(field, { pointerType: 'mouse', clientX: 40, clientY: -20 })
    expect(field).toHaveAttribute('data-pull')
    expect(field.style.getPropertyValue('--pull-x')).toBe('8.8px')
    expect(field.style.getPropertyValue('--pull-y')).toBe('-4.4px')
    fireEvent.pointerLeave(field)
    expect(field).not.toHaveAttribute('data-pull')
    expect(field.style.getPropertyValue('--pull-x')).toBe('0px')
    expect(field.style.getPropertyValue('--pull-y')).toBe('0px')
  })

  it('never pulls a pill under touch', () => {
    renderAt('/', <App />)
    const pill = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'GitHub' })
    const field = pill.closest('.site-foot-magnet') as HTMLElement
    fireEvent.pointerMove(field, { pointerType: 'touch', clientX: 40, clientY: -20 })
    expect(field).not.toHaveAttribute('data-pull')
  })

  it('writes the reveal progress onto the footer for the parallax', () => {
    renderAt('/', <App />)
    const foot = document.querySelector('footer.site-foot') as HTMLElement
    // jsdom lays nothing out, so the footer has no height and rests at 1.
    expect(foot.style.getPropertyValue('--foot-reveal')).toBe('1')
  })

  it('leaves the parallax unset under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: query.includes('reduce'), media: query }) as MediaQueryList
    )
    renderAt('/', <App />)
    const foot = document.querySelector('footer.site-foot') as HTMLElement
    expect(foot.style.getPropertyValue('--foot-reveal')).toBe('')
  })

  it('scrolls back to the top from the footer', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/', <App />)
    fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Back to top' }))
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('scrolls to the end of the page when focus enters the covered footer', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/', <App />)
    const link = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'GitHub'
    })
    fireEvent.focusIn(link)
    expect(scrollSpy).toHaveBeenCalledWith({
      top: document.documentElement.scrollHeight,
      behavior: 'instant'
    })
  })

  it('removes the focus listener when the shell unmounts', () => {
    const view = renderAt('/', <App />)
    const foot = document.querySelector('footer.site-foot') as HTMLElement
    const removeSpy = vi.spyOn(foot, 'removeEventListener')
    view.unmount()
    expect(removeSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
  })

  it('keeps the call to action, the GitHub source link and the brand lockup in the footer', () => {
    renderAt('/', <App />)
    const foot = screen.getByRole('contentinfo')
    const links = within(foot)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label') ?? link.textContent)
    expect(links).toEqual(['Enter the demo', 'GitHub', 'LadingLens home'])
    expect(within(foot).getByRole('link', { name: 'Enter the demo' })).toHaveAttribute('href', '/auth')
    expect(within(foot).getByRole('link', { name: 'LadingLens home' })).toHaveAttribute('href', '/')
    expect(within(foot).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Averis-T010NG/LadingLens'
    )
  })

  it('keeps the reveal footer off the other public routes', () => {
    renderAt('/judge', <App />)
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('keeps the reveal footer off the auth route', () => {
    renderAt('/auth', <App />)
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('keeps the reveal footer off the not-found route', () => {
    renderAt('/not-a-real-view', <App />)
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})

describe('scroll restoration', () => {
  it('returns to the top of the page on a route change', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    renderAt('/', <App />)
    scrollSpy.mockClear()
    await user.click(screen.getByRole('link', { name: 'Get Started' }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })
})
