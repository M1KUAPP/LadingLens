import { useEffect, useRef, type ReactNode } from 'react'
import { footReveal } from './foot-reveal'
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

  // The curtain's parallax reads --foot-reveal, the share of the footer the
  // sheet has uncovered. Reduced motion never sets it, so the footer rests
  // in place.
  useEffect(() => {
    const el = foot.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const progress = footReveal(
        window.scrollY,
        document.documentElement.scrollHeight,
        window.innerHeight,
        el.offsetHeight
      )
      el.style.setProperty('--foot-reveal', String(progress))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
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
