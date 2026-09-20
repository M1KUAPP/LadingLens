export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ladinglens-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readTheme(): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage may be unavailable in sandboxed or privacy-restricted contexts.
  }
  if (isTheme(stored)) {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The in-memory theme still applies when persistence is unavailable.
  }
}

export function toggleTheme(theme: Theme): Theme {
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
