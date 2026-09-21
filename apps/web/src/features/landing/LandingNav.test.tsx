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

  it('opens the menu with the Menu text button and closes it on Escape', async () => {
    const user = userEvent.setup()
    renderNav()
    // jsdom ignores media queries, so the Menu button keeps its desktop
    // display: none; match it by text and selector.
    const menuButton = screen.getByText('Menu', { selector: 'button' })
    const menu = document.getElementById('land-menu') as HTMLElement
    expect(menu).toHaveAttribute('data-open', 'false')

    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(menu).toHaveAttribute('data-open', 'true')

    await user.keyboard('{Escape}')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveAttribute('data-open', 'false')
    expect(menuButton).toHaveFocus()
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

  it('drops every entrance, fade and hover transition under reduced motion', () => {
    const reduced = navCss.slice(navCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/animation:\s*none/)
    for (const selector of [
      '.land-nav',
      '.land-link',
      '.land-start',
      '.land-start-dot',
      '.land-menu-button',
      '.land-menu',
      '.land-menu-panel',
      '.land-menu-link',
      '.land-menu-close'
    ]) {
      expect(reduced).toMatch(new RegExp(`\\${selector}(?![\\w-])`))
    }
  })
})
