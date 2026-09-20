import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { clearGuestSession } from '../lib/guest-session'

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  clearGuestSession()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})
