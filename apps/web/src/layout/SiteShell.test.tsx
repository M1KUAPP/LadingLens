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

  it('keeps the landing column and its film layer inside the sheet', () => {
    renderAt('/', <App />)
    const sheet = document.querySelector('.site-sheet')
    const land = sheet?.querySelector('main.land')
    expect(land).not.toBeNull()
    expect(land?.querySelector('.land-film')).not.toBeNull()
  })

  it('reserves the footer height as sheet margin and fixes the footer behind it', () => {
    expect(shellCss).toMatch(/--foot-h:\s*196px/)
    expect(shellCss).toMatch(/--foot-h:\s*184px/)
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

  it('rings a focused footer link with the shared token, not a second outline', () => {
    expect(shellCss).toMatch(
      /\.site-foot-link:focus-visible\s*\{[^}]*outline:\s*none[^}]*box-shadow:\s*var\(--focus-ring\)/
    )
    expect(shellCss).toMatch(/\.site-foot-link:focus-visible\s*\{[^}]*border-radius:\s*var\(--radius-sm\)/)
    expect(shellCss).toMatch(/\.site-foot-link:hover\s*\{[^}]*color:\s*var\(--text-primary\)/)
    expect(shellCss).not.toMatch(/\.site-foot-link:hover\s*,\s*\.site-foot-link:focus-visible/)
  })

  it('scrolls to the end of the page when focus enters the covered footer', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderAt('/', <App />)
    const link = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'GitHub'
    })
    fireEvent.focusIn(link)
    expect(scrollSpy).toHaveBeenCalledWith({
      top: document.documentElement.scrollHeight
    })
  })

  it('removes the focus listener when the shell unmounts', () => {
    const view = renderAt('/', <App />)
    const foot = document.querySelector('footer.site-foot') as HTMLElement
    const removeSpy = vi.spyOn(foot, 'removeEventListener')
    view.unmount()
    expect(removeSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
  })

  it('lists the site links in the footer', () => {
    renderAt('/', <App />)
    const foot = screen.getByRole('contentinfo')
    const links = within(foot)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(links).toEqual(['LadingLens', 'Landing', 'Live demo', 'Sign in', 'GitHub'])
    expect(within(foot).getByRole('link', { name: 'LadingLens home' })).toHaveAttribute('href', '/')
    expect(within(foot).getByRole('link', { name: 'Landing' })).toHaveAttribute('href', '/')
    expect(within(foot).getByRole('link', { name: 'Live demo' })).toHaveAttribute('href', '/judge')
    expect(within(foot).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth')
    expect(within(foot).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Averis-T010NG/Averis'
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
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('link', {
        name: 'Live demo'
      })
    )
    expect(screen.getByRole('heading', { name: 'Judge workspace' })).toBeInTheDocument()
    expect(scrollSpy).toHaveBeenCalledWith(0, 0)
  })
})
