import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyTheme, readTheme } from './lib/theme'
import { AppRoutes } from './routing/routes'

// index.html stamps the theme before first paint; this repeats it inside
// React so the root dataset agrees with the assets readTheme picked even
// when that script could not run, and every route shares the one theme.
function ThemeSeed() {
  useEffect(() => {
    applyTheme(readTheme())
  }, [])
  return null
}

// A route change is a new surface, so it starts at the top. Without this the
// landing's reveal footer would leave the next route already scrolled.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <ThemeSeed />
      <ScrollToTop />
      <AppRoutes />
    </>
  )
}

export default App
