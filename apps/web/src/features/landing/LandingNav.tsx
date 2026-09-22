import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import { REPOSITORY_URL } from '../../lib/repository'
import './landing-nav.css'

type SiteLink = {
  readonly label: string
  readonly href: string
  readonly kind: 'scene' | 'route' | 'external'
  readonly current?: boolean
}

// The first three move through the film; the last two leave it.
const SITE_LINKS: readonly SiteLink[] = [
  { label: 'LadingLens', href: '#top', kind: 'scene', current: true },
  { label: 'Reconciliation', href: '#reconcile', kind: 'scene' },
  { label: 'Human review', href: '#review', kind: 'scene' },
  { label: 'Live demo', href: '/judge', kind: 'route' },
  { label: 'GitHub', href: REPOSITORY_URL, kind: 'external' }
]

const FOCUSABLE = 'a[href], button:not([disabled])'

type SiteAnchorProps = {
  link: SiteLink
  className: string
  style?: CSSProperties
  onClick?: () => void
}

function SiteAnchor({ link, className, style, onClick }: SiteAnchorProps) {
  if (link.kind === 'route') {
    return (
      <Link to={link.href} className={className} style={style} onClick={onClick}>
        {link.label}
      </Link>
    )
  }
  const external = link.kind === 'external' ? { target: '_blank', rel: 'noreferrer' } : {}
  return (
    <a
      href={link.href}
      className={className}
      style={style}
      onClick={onClick}
      aria-current={link.current ? 'page' : undefined}
      {...external}
    >
      {link.label}
    </a>
  )
}

function LandingMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // aria-modal tells assistive tech; Tab still has to be kept inside.
  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!items || items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      id="land-menu"
      className="land-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      data-open={open}
      inert={!open}
      aria-hidden={open ? undefined : true}
      onKeyDown={keepFocusInside}
    >
      <div className="land-menu-panel">
        <div className="land-menu-head">
          <button ref={closeRef} type="button" className="land-menu-close" aria-label="Close menu" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="land-menu-links" aria-label="Site menu">
          {SITE_LINKS.map((link, index) => (
            <SiteAnchor
              key={link.href}
              link={link}
              className="land-menu-link"
              style={{ '--i': index } as CSSProperties}
              onClick={onClose}
            />
          ))}
        </nav>
        <div className="land-menu-foot">
          <Link to="/auth" onClick={onClose}>
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}

/** The film's bar: scene links, the way in, and the full-screen menu. */
export function LandingNav({ paper }: { paper: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget
    setOpen(true)
  }
  // Stable, so the menu's open effect does not re-run on every scroll frame.
  const closeMenu = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  return (
    <>
      <header className="land-nav" data-ink={paper ? 'paper' : 'ink'}>
        <button
          type="button"
          className="land-burger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="land-menu"
          onClick={openMenu}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className="land-links" aria-label="Site">
          {SITE_LINKS.map((link, index) => (
            <SiteAnchor
              key={link.href}
              link={link}
              className="land-link"
              style={{ animationDelay: `${300 + index * 80}ms` }}
            />
          ))}
        </nav>
        <div className="land-side">
          <Link to="/auth" className="land-start">
            Get Started
            <span className="land-start-dot" aria-hidden="true">
              <HugeiconsIcon icon={ArrowRight02Icon} size={12} />
            </span>
          </Link>
          <button
            type="button"
            className="land-menu-button"
            aria-expanded={open}
            aria-controls="land-menu"
            onClick={openMenu}
          >
            Menu
          </button>
        </div>
      </header>
      <LandingMenu open={open} onClose={closeMenu} />
    </>
  )
}
