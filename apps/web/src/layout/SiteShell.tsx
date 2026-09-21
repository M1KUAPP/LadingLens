import { useEffect, useRef, type ReactNode } from 'react'
import { SiteFooter } from './SiteFooter'
import './site-shell.css'

/**
 * The page folds over the footer. The footer is fixed behind at z-index 0;
 * the sheet is opaque, sits above it, and reserves the footer's height as
 * bottom margin, so nothing of the footer shows until the reader reaches the
 * end of the page.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const foot = useRef<HTMLElement>(null)

  // Tabbing past the page lands in a footer the sheet is still covering, and
  // the browser cannot rescue it: scrolling an element into view is a no-op
  // on a fixed one, which is always inside the viewport already, so the ring
  // paints underneath. WCAG 2.4.11 Focus Not Obscured.
  useEffect(() => {
    const el = foot.current
    if (!el) return
    const reveal = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
    el.addEventListener('focusin', reveal)
    return () => el.removeEventListener('focusin', reveal)
  }, [])

  return (
    <>
      <div className="site-sheet">{children}</div>
      <footer className="site-foot" ref={foot}>
        <SiteFooter />
      </footer>
    </>
  )
}
