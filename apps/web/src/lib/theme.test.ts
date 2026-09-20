import { describe, expect, it, vi } from 'vitest'
import { applyTheme, readTheme, toggleTheme } from './theme.ts'

describe('theme', () => {
  it('uses the OS preference until a manual choice exists', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(readTheme()).toBe('dark')
  })

  it('prefers a valid stored manual choice over the OS', () => {
    localStorage.setItem('ladinglens-theme', 'light')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(readTheme()).toBe('light')
  })

  it('falls back to the OS preference when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(readTheme()).toBe('dark')
  })

  it('persists and stamps a manual theme', () => {
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('ladinglens-theme')).toBe('light')
  })

  it('still stamps the theme when persistence is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    expect(() => applyTheme('dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('flips the current theme and keeps persistence in sync', () => {
    expect(toggleTheme('dark')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('ladinglens-theme')).toBe('light')
  })
})
