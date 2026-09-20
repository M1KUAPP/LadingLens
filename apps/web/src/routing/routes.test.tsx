import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { createGuestSession, readGuestSession } from '../lib/guest-session'
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
    expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
  })

  it.each(['/inbox', '/emails/email_001', '/review', '/graph', '/evaluation', '/settings'])(
    'redirects %s to auth without a guest session',
    (path) => {
      renderAt(path, <App />)
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
    }
  )

  it('renders the prepared-fixture inbox triage view at /inbox', async () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(await screen.findByRole('link', { name: 'email_001' })).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent('520 received / 520 accounted for / 0 lost')
  })

  it('renders the fixture-derived evaluation dashboard at /evaluation', async () => {
    createGuestSession()
    renderAt('/evaluation', <App />)
    expect(await screen.findByText('Awaiting fresh Gemini 3.5 Flash benchmark')).toBeInTheDocument()
    expect(screen.getByText('Classification coverage')).toBeInTheDocument()
  })

  it('renders the email detail comparison view at /emails/:emailId', async () => {
    createGuestSession()
    renderAt('/emails/email_001', <App />)
    expect(await screen.findByText('PREPARED RECORD')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Attachment preflight' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Field comparison' })).toBeInTheDocument()
  })

  it('opens /review on the queue tab with live counts', async () => {
    createGuestSession()
    renderAt('/review', <App />)
    const tablist = await screen.findByRole('tablist', {
      name: 'Review views'
    })
    const queueTab = within(tablist).getByRole('tab', {
      name: /review queue/i
    })
    expect(queueTab).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: /review queue \(\d+\)/i })).toBeInTheDocument()
  })

  it('honours the /review?tab=reconciliation deep link', async () => {
    createGuestSession()
    renderAt('/review?tab=reconciliation', <App />)
    expect(await screen.findByRole('region', { name: 'Reconciliation outcomes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /reconciliation/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Missing case SYN-042' })).toBeInTheDocument()
  })

  it('renders the control graph view at /graph', async () => {
    createGuestSession()
    renderAt('/graph', <App />)
    expect(await screen.findByRole('heading', { name: 'Control graph' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Graph view' })).toBeInTheDocument()
    await screen.findByRole('table', { name: /graph nodes/i })
  })

  it('keeps the public judge route outside the operator guard', () => {
    renderAt('/judge', <App />)
    expect(screen.getByRole('heading', { name: 'Judge workspace' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('initializes a guest session for direct judge visits', () => {
    renderAt('/judge', <App />)
    expect(readGuestSession()).not.toBeNull()
  })

  it('keeps the auth route outside the product shell', () => {
    renderAt('/auth', <App />)
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('renders the shell-free landing page at /', () => {
    renderAt('/', <App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Account for every shipping document.'
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('renders a useful shell-free fallback for unknown routes', () => {
    renderAt('/not-a-real-view', <App />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
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
    expect(labels).toEqual(['Inbox', 'Email detail', 'Review queue', 'Control graph', 'Evaluation'])
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('marks the active view with aria-current', () => {
    createGuestSession()
    renderAt('/review', <App />)
    expect(screen.getByRole('link', { name: 'Review queue' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps the theme toggle in the app bar', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument()
  })
})
