import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { createGuestSession } from './lib/guest-session'
import { renderAt } from './test/render'

function mockOsTheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: dark, media: query }) as MediaQueryList
  )
}

describe('theme seeding', () => {
  it('stamps a persisted dark theme on the root when the OS prefers light', () => {
    mockOsTheme(false)
    localStorage.setItem('ladinglens-theme', 'dark')
    renderAt('/', <App />)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it.each(['/auth', '/judge', '/not-a-real-view'])('seeds the same resolved theme on a direct load of %s', (path) => {
    mockOsTheme(true)
    localStorage.setItem('ladinglens-theme', 'light')
    renderAt(path, <App />)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('seeds the resolved theme on a guarded operator route', () => {
    mockOsTheme(false)
    localStorage.setItem('ladinglens-theme', 'dark')
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('keeps the root dataset in sync with later toggles', async () => {
    mockOsTheme(false)
    const user = userEvent.setup()
    createGuestSession()
    renderAt('/inbox', <App />)
    expect(document.documentElement.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('ladinglens-theme')).toBe('dark')
  })
})
