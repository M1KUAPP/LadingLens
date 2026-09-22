import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { API_SESSION_KEY } from '../lib/api'
import { createGuestSession } from '../lib/guest-session'
import { ResetKeyProvider } from '../lib/reset-context'
import { renderAt } from '../test/render'
import { SettingsPage } from './SettingsPage'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <ResetKeyProvider>
      <SettingsPage />
    </ResetKeyProvider>
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('SettingsPage', () => {
  it('renders the heading, the always-visible explanation and Reset All without opening anything', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Demo data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About demo data' })).toBeInTheDocument()
    // Secondary captions stay inside their tooltip panels until opened.
    expect(
      screen.queryByText('Settings apply to this browser tab and your guest workspace only.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Other guests keep their own workspaces; a reset never touches theirs.')
    ).not.toBeInTheDocument()

    expect(
      screen.getByText(
        'Reset All restores the original demo data so you can run the demonstration again from the start.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Reset All will:')).toBeInTheDocument()
    expect(screen.getByText('Remove your uploads, judge runs, and reconciliation runs')).toBeInTheDocument()
    expect(screen.getByText('Undo your review decisions and reconciliation actions')).toBeInTheDocument()
    expect(screen.getByText('Restore the original inbox, shipment ledger, and assignments')).toBeInTheDocument()
    expect(screen.getByText('Return theme, filters, and selections to their defaults')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Reset All' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('cancels on Cancel without calling fetch and returns focus to the Reset All trigger', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const trigger = screen.getByRole('button', { name: 'Reset All' })
    await user.click(trigger)
    expect(screen.getByRole('alertdialog', { name: 'Reset all demo data?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('cancels on Escape without calling fetch and returns focus to the Reset All trigger', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    const trigger = screen.getByRole('button', { name: 'Reset All' })
    await user.click(trigger)
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('shows the busy copy while the reset is in flight, then confirms with one POST /api/reset', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    let resolveFetch: (value: Response) => void = () => {}
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))

    expect(screen.getByRole('status')).toHaveTextContent('Resetting your workspace…')
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    resolveFetch(json(200, { generation: 3, seed_version: 'seed-v1', reset_at: '2026-09-21T09:00:00Z' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/reset', expect.objectContaining({ method: 'POST' }))
    // A standalone render has no KeyedRoutes/resetKey remount to stand in for
    // a fresh instance, so this same instance shows no outcome message here
    // once busy clears — the success status is instead covered by the
    // whole-App tests below, which do exercise the real remount.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the alert on a 503 and keeps Reset All enabled and focused for retry', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    localStorage.setItem('ladinglens-theme', 'dark')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(503, { error: { code: 'reset_unavailable', message: 'The demo database is unavailable.' } })
      )
    )
    renderPage()

    const trigger = screen.getByRole('button', { name: 'Reset All' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Reset all' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The demo database is unavailable. Your data was not changed.'
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toBeEnabled()
    expect(trigger).toHaveFocus()
    expect(localStorage.getItem('ladinglens-theme')).toBe('dark')
  })
})

function renderSettingsApp(path: string) {
  // renderAt's MemoryRouter never touches window.location, but reset-context
  // tags a completed reset with window.location.pathname so a later mount
  // can tell whether it ran on this page. Keep the two in step so that check
  // is meaningful here too.
  window.history.pushState({}, '', path)
  return renderAt(path, <App />)
}

describe('SettingsPage inside the app', () => {
  it('remounts after a successful reset, keeps the success status from lastReset, clears the dark theme and focuses the outcome', async () => {
    const user = userEvent.setup()
    createGuestSession()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    localStorage.setItem('ladinglens-theme', 'dark')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
    )
    renderSettingsApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Demo data reset. You are on a clean workspace.')
    expect(status).toHaveFocus()
    expect(localStorage.getItem('ladinglens-theme')).not.toBe('dark')
  })

  it('shows and focuses the success when a reset completes at /settings/ (trailing slash)', async () => {
    const user = userEvent.setup()
    createGuestSession()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
    )
    renderSettingsApp('/settings/')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Demo data reset. You are on a clean workspace.')
    expect(status).toHaveFocus()
  })

  it('shows no stale success message or focus-steal on an ordinary later visit to /settings', async () => {
    const user = userEvent.setup()
    createGuestSession()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
    )
    renderSettingsApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Demo data reset. You are on a clean workspace.')

    await user.click(screen.getByRole('link', { name: 'Inbox' }))
    expect(await screen.findByRole('heading', { name: 'Inbox' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(
      screen.queryByText('Demo data reset. You are on a clean workspace.', { exact: false })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset All' })).not.toHaveFocus()
    // AppShell itself isn't remounted by an ordinary nav click (only its
    // `children` swap), so focus naturally stays wherever the user's last
    // interaction left it — nothing in SettingsPage should redirect it.
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveFocus()
  })

  it('shows no success message or focus-steal on /settings when a reset resolves after the user already navigated away', async () => {
    const user = userEvent.setup()
    createGuestSession()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    localStorage.setItem('ladinglens-theme', 'dark')
    let resolveFetch: (value: Response) => void = () => {}
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    renderSettingsApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(screen.getByRole('status')).toHaveTextContent('Resetting your workspace…')

    await user.click(screen.getByRole('link', { name: 'Inbox' }))
    window.history.pushState({}, '', '/inbox')
    expect(await screen.findByRole('heading', { name: 'Inbox' })).toBeInTheDocument()

    resolveFetch(json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
    await waitFor(() => expect(localStorage.getItem('ladinglens-theme')).not.toBe('dark'))

    // Push before the click (not after, like the Inbox nav above): the new
    // SettingsPage mount's lazy mountPathname capture runs synchronously as
    // part of this click, so window.location must already say '/settings'
    // by the time it does, same as a real browser's Link navigation would.
    window.history.pushState({}, '', '/settings')
    await user.click(screen.getByRole('link', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(
      screen.queryByText('Demo data reset. You are on a clean workspace.', { exact: false })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset All' })).not.toHaveFocus()
  })

  it('does not let an already-shown success mask a new failure from an immediate retry', async () => {
    const user = userEvent.setup()
    createGuestSession()
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' }))
      .mockResolvedValueOnce(
        json(503, { error: { code: 'reset_unavailable', message: 'The demo database is unavailable.' } })
      )
    vi.stubGlobal('fetch', fetchMock)
    renderSettingsApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.getByRole('status')).toHaveTextContent('Demo data reset. You are on a clean workspace.')

    await user.click(screen.getByRole('button', { name: 'Reset All' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The demo database is unavailable. Your data was not changed.'
    )
    expect(
      screen.queryByText('Demo data reset. You are on a clean workspace.', { exact: false })
    ).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
