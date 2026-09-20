import { useEffect } from 'react'
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

function App() {
  return (
    <>
      <ThemeSeed />
      <AppRoutes />
    </>
  )
}

export default App
