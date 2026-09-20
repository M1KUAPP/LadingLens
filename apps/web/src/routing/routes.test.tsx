import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import {
  createGuestSession,
  readGuestSession
} from '../lib/guest-session'
import { renderAt } from '../test/render'

describe('route boundaries', () => {
  it.each([
    ['/inbox', 'Inbox'],
    ['/emails/email_001', 'Email detail'],
    ['/review', 'Review queue'],
    ['/graph', 'Control graph'],
    ['/evaluation', 'Evaluation'],
    ['/settings', 'Settings']
  ])('renders the product shell at %s', (path, title) => {
    createGuestSession()
    renderAt(path, <App />)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Product views' })
    ).toBeInTheDocument()
  })

  it('redirects operator routes to auth without a guest session', () => {
    renderAt('/inbox', <App />)
    expect(
      screen.getByRole('heading', { name: 'Sign in' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('keeps the public judge route outside the operator guard', () => {
    renderAt('/judge', <App />)
    expect(
      screen.getByRole('heading', { name: 'Judge workspace' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('initializes a guest session for direct judge visits', () => {
    renderAt('/judge', <App />)
    expect(readGuestSession()).not.toBeNull()
  })

  it('keeps the auth route outside the product shell', () => {
    renderAt('/auth', <App />)
    expect(
      screen.getByRole('heading', { name: 'Sign in' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('renders the shell-free landing page at /', () => {
    renderAt('/', <App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Account for every shipping document.'
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('renders a useful shell-free fallback for unknown routes', () => {
    renderAt('/not-a-real-view', <App />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })
})

describe('product navigation', () => {
  it('lists the five product views in order with settings separate', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    const nav = screen.getByRole('navigation', { name: 'Product views' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual([
      'Inbox',
      'Email detail',
      'Review queue',
      'Control graph',
      'Evaluation'
    ])
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    )
  })

  it('marks the active view with aria-current', () => {
    createGuestSession()
    renderAt('/review', <App />)
    expect(screen.getByRole('link', { name: 'Review queue' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('keeps the theme toggle in the app bar', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(
      screen.getByRole('button', { name: /theme/i })
    ).toBeInTheDocument()
  })
})
