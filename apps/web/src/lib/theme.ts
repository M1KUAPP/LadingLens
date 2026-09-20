export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ladinglens-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isTheme(stored)) {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

export function toggleTheme(theme: Theme): Theme {
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
