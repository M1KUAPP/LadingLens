import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { createGuestSession, readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'

describe('route boundaries', () => {
  it.each([
    ['/upload', 'Upload'],
    ['/inbox', 'Inbox'],
    ['/emails/email_001', 'Email detail'],
    ['/review', 'Review queue'],
    ['/reconciliation', 'Reconciliation'],
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

  it.each([
    '/upload',
    '/inbox',
    '/emails/email_001',
    '/review',
    '/reconciliation',
    '/graph',
    '/evaluation',
    '/settings'
  ])('redirects %s to auth without a guest session', (path) => {
    renderAt(path, <App />)
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('sends the retired /ingest route to the inbox, which now holds the batch view', async () => {
    createGuestSession()
    renderAt('/ingest', <App />)
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('img', { name: /^520 emails:/ })).toBeInTheDocument()
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

  it('opens /review on the review queue alone', async () => {
    createGuestSession()
    renderAt('/review', <App />)
    expect(screen.getByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Reconciliation outcomes' })).not.toBeInTheDocument()
  })

  it('renders the reconciliation inputs at /reconciliation', async () => {
    createGuestSession()
    renderAt('/reconciliation', <App />)
    expect(screen.getByRole('link', { name: 'Reconciliation' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('region', { name: 'Reconciliation inputs' })).toBeInTheDocument()
  })

  it('sends the old /review?tab=reconciliation link to the reconciliation page', async () => {
    createGuestSession()
    renderAt('/review?tab=reconciliation', <App />)
    expect(screen.getByRole('heading', { name: 'Reconciliation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reconciliation' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('region', { name: 'Reconciliation inputs' })).toBeInTheDocument()
  })

  it('renders the control trace at /graph', async () => {
    createGuestSession()
    renderAt('/graph', <App />)
    expect(await screen.findByRole('heading', { name: 'Control graph' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Control trace' })).toBeInTheDocument()
  })

  it('opens the upload page from /judge without a sign-in', () => {
    renderAt('/judge', <App />)
    // The public judge entry (PRD FR-13) starts a guest session and lands on
    // the workspace's upload page, with the full workspace navigation.
    expect(readGuestSession()).not.toBeNull()
    const heading = screen.getByRole('heading', { name: 'Upload' })
    expect(heading.closest('.page-head')).not.toBeNull()
    expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps an existing guest session when entering through /judge', () => {
    const session = createGuestSession()
    renderAt('/judge', <App />)
    expect(readGuestSession()).toEqual(session)
    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument()
  })

  it.each([
    '/upload',
    '/inbox',
    '/emails/email_001',
    '/review',
    '/reconciliation',
    '/graph',
    '/evaluation',
    '/settings'
  ])('floats the assistant at %s', (path) => {
    createGuestSession()
    renderAt(path, <App />)
    const aside = screen.getByRole('complementary', { name: 'Assistant' })
    expect(within(aside).getByRole('button', { name: 'Assistant' })).toHaveAttribute('aria-expanded', 'false')
  })

  it.each(['/', '/auth'])('keeps the assistant off the public page at %s', (path) => {
    renderAt(path, <App />)
    expect(screen.queryByRole('complementary', { name: 'Assistant' })).not.toBeInTheDocument()
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
  it('lists the product views in order with settings separate', () => {
    createGuestSession()
    renderAt('/inbox', <App />)
    const nav = screen.getByRole('navigation', { name: 'Product views' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(['Upload', 'Inbox', 'Review queue', 'Reconciliation', 'Control graph', 'Evaluation'])
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

  it('files an email record under the inbox in the sidebar', () => {
    createGuestSession()
    renderAt('/emails/email_001', <App />)
    const nav = screen.getByRole('navigation', { name: 'Product views' })
    expect(within(nav).queryByRole('link', { name: 'Email detail' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page')
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
      'Upload',
      'Inbox',
      'Review queue',
      'Reconciliation',
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
