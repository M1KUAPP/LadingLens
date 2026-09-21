import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { createGuestSession, readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'

describe('route boundaries', () => {
  it.each([
    ['/ingest', 'Batch ingest'],
    ['/inbox', 'Inbox'],
    ['/emails/email_001', 'Email detail'],
    ['/review', 'Review queue'],
    ['/graph', 'Control graph'],
    ['/evaluation', 'Evaluation'],
    ['/settings', 'Settings']
  ])('renders the product shell at %s', (path, title) => {
    createGuestSession()
    renderAt(path, <App />)
    const heading = screen.getByRole('heading', { name: title })
    const head = heading.closest('.page-head')
    expect(head).not.toBeNull()
    expect(head?.querySelector('.page-head-supporting')).not.toBeNull()
    expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
  })

  it.each(['/ingest', '/inbox', '/emails/email_001', '/review', '/graph', '/evaluation', '/settings'])(
    'redirects %s to auth without a guest session',
    (path) => {
      renderAt(path, <App />)
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
    }
  )

  it('renders the batch ingest view at /ingest', async () => {
    createGuestSession()
    renderAt('/ingest', <App />)
    expect(await screen.findByRole('button', { name: /prepared mail bundle/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add batch/i })).toBeInTheDocument()
    expect(await screen.findByRole('progressbar', { name: /emails processed/i })).toBeInTheDocument()
    expect(document.querySelector('.batch-progress-text')).toHaveTextContent(
      '503 of 520 processed · 17 held for review'
    )
  })

  it('renders the prepared-fixture inbox triage view at /inbox', async () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(await screen.findByRole('link', { name: 'email_001' })).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent('520 received / 520 accounted for / 0 lost')
  })

  it('renders the fixture-derived evaluation dashboard at /evaluation', async () => {
    createGuestSession()
    renderAt('/evaluation', <App />)
    expect(await screen.findByText('Awaiting fresh extraction benchmark')).toBeInTheDocument()
    expect(screen.getByText('Classification coverage')).toBeInTheDocument()
  })

  it('renders the email detail comparison view at /emails/:emailId', async () => {
    createGuestSession()
    renderAt('/emails/email_001', <App />)
    expect(await screen.findByText('Prepared record')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Attachment check' })).toBeInTheDocument()
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

  it('renders /judge inside the shared shell without operator chrome', () => {
    renderAt('/judge', <App />)
    const heading = screen.getByRole('heading', { name: 'Judge workspace' })
    // Shared chrome: the fixed topbar and the per-page hero card.
    expect(document.querySelector('.app-bar')).not.toBeNull()
    expect(heading.closest('.page-head')).not.toBeNull()
    // No operator chrome or authenticated-only actions.
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open live demo' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument()
    // No footer.
    expect(document.querySelector('footer')).toBeNull()
    // A public way back to the sign-in page is the only bar action.
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth')
  })

  it('renders /judge without minting a guest session', () => {
    renderAt('/judge', <App />)
    expect(readGuestSession()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Judge workspace' })).toBeInTheDocument()
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
    expect(labels).toEqual(['Batch ingest', 'Inbox', 'Email detail', 'Review queue', 'Control graph', 'Evaluation'])
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

  it('shows a breadcrumb trail from the inbox to an email record', () => {
    createGuestSession()
    renderAt('/emails/email_001', <App />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/inbox')
    expect(within(crumbs).getByText('Email detail')).toHaveAttribute('aria-current', 'page')
  })

  it('exposes a skip link that targets the main content', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip).toHaveAttribute('href', '#app-content')
    expect(document.getElementById('app-content')).toBeInTheDocument()
  })

  it('opens the navigation drawer from the menu button and closes on Escape', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    // jsdom does not evaluate media queries, so the button stays display:none
    // even though it only renders below the desktop breakpoint in a browser.
    // Hidden elements compute an empty accessible name, so match the label.
    const menu = screen.getByLabelText('Open menu')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    // The drawer stays mounted so it can slide in and out; while closed it is
    // inert and hidden from assistive tech.
    const drawer = document.getElementById('app-nav-drawer')
    const drawerRoot = drawer?.closest('.app-drawer-root')
    expect(drawerRoot).toHaveAttribute('data-open', 'false')
    expect(drawerRoot).toHaveAttribute('aria-hidden', 'true')
    expect(drawerRoot).toHaveAttribute('inert')

    fireEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(drawerRoot).toHaveAttribute('data-open', 'true')
    expect(drawerRoot).not.toHaveAttribute('aria-hidden')
    expect(drawerRoot).not.toHaveAttribute('inert')
    const drawerLinks = within(drawer as HTMLElement)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label') ?? link.textContent)
    expect(drawerLinks).toEqual([
      'LadingLens home',
      'Batch ingest',
      'Inbox',
      'Email detail',
      'Review queue',
      'Control graph',
      'Evaluation',
      'Settings'
    ])

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(drawerRoot).toHaveAttribute('data-open', 'false')
    expect(drawerRoot).toHaveAttribute('aria-hidden', 'true')
    expect(drawerRoot).toHaveAttribute('inert')
  })
})
