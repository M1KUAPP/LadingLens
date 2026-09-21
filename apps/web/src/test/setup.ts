import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { forgetApiSession } from '../lib/api'
import { clearGuestSession } from '../lib/guest-session'

// jsdom stubs scrollTo as a not-implemented warning; the app calls it on
// every route change, so give tests a silent no-op to spy on instead.
window.scrollTo = () => {}

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
  forgetApiSession()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})
