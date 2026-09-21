import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon'
import ArrowUp02Icon from '@hugeicons/core-free-icons/ArrowUp02Icon'
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon'

const REPO_URL = 'https://github.com/Averis-T010NG/Averis'

// How far a pill follows the pointer, as a share of the pointer's offset from
// the pill's centre.
const PULL = 0.22

// A pill that leans toward a mouse pointer inside its field and springs back
// past rest when the pointer leaves. Touch and pen never pull it, and reduced
// motion pins it in CSS.
function Magnetic({ children }: { children: ReactNode }) {
  const field = useRef<HTMLSpanElement>(null)

  const pull = (event: PointerEvent<HTMLSpanElement>) => {
    const el = field.current
    if (!el || event.pointerType !== 'mouse') return
    const box = el.getBoundingClientRect()
    el.dataset.pull = ''
    el.style.setProperty('--pull-x', `${(event.clientX - box.left - box.width / 2) * PULL}px`)
    el.style.setProperty('--pull-y', `${(event.clientY - box.top - box.height / 2) * PULL}px`)
  }

  const release = () => {
    const el = field.current
    if (!el) return
    delete el.dataset.pull
    el.style.setProperty('--pull-x', '0px')
    el.style.setProperty('--pull-y', '0px')
  }

  return (
    <span ref={field} className="site-foot-magnet" onPointerMove={pull} onPointerLeave={release}>
      {children}
    </span>
  )
}

function backToTop() {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: still ? 'instant' : 'smooth' })
}

/**
 * One footer, one mounting. The shell fixes it behind the scrolling page and
 * uncovers it at the end: the landing reserves exactly its height, so the
 * reveal is the page's only scroll.
 */
export function SiteFooter() {
  return (
    <div className="site-foot-stage">
      <div className="site-foot-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="site-foot-grid" aria-hidden="true" />
      <div className="site-foot-inner">
        <div className="site-foot-cta">
          <p className="site-foot-eyebrow">Synthetic data, open source</p>
          <h2 className="site-foot-title">
            Ready when the next <span>draft lands.</span>
          </h2>
          <div className="site-foot-actions">
            <Magnetic>
              <Link to="/auth" className="site-foot-pill site-foot-pill--solid">
                <span className="site-foot-pill-label">Enter the demo</span>
                <span className="site-foot-pill-dot" aria-hidden="true">
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                </span>
              </Link>
            </Magnetic>
            <Magnetic>
              <a className="site-foot-pill" href={REPO_URL} target="_blank" rel="noreferrer">
                <span className="site-foot-pill-label">GitHub</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" />
              </a>
            </Magnetic>
          </div>
        </div>
        <div className="site-foot-meta">
          <Link to="/" className="site-foot-brand" aria-label="LadingLens home">
            <img
              className="site-foot-mark site-foot-mark--light"
              src="/brand/mark-colour.svg"
              alt=""
              width={28}
              height={28}
            />
            <img
              className="site-foot-mark site-foot-mark--dark"
              src="/brand/mark-dark.svg"
              alt=""
              width={28}
              height={28}
            />
            <span className="site-foot-name">LadingLens</span>
          </Link>
          <p className="site-foot-note">Every shipping document checked against its evidence.</p>
          <button type="button" className="site-foot-top" onClick={backToTop}>
            Back to top
            <HugeiconsIcon icon={ArrowUp02Icon} size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="site-foot-word" aria-hidden="true">
        LadingLens
      </p>
    </div>
  )
}
