import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import ChartEvaluationIcon from '@hugeicons/core-free-icons/ChartEvaluationIcon'
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon'
import FileViewIcon from '@hugeicons/core-free-icons/FileViewIcon'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon'
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon'
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon'
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon'
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon'
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon'
import { Button } from '../components/ui/Controls'
import { readTheme, toggleTheme, type Theme } from '../lib/theme'
import './app-shell.css'

type ProductView = {
  to: string
  label: string
  icon: IconSvgElement
  active: boolean
}

function navLinkClass(active: boolean) {
  return active ? 'app-nav-link app-nav-link--active' : 'app-nav-link'
}

function ProductNavList({ views, onNavigate }: { views: ProductView[]; onNavigate?: () => void }) {
  return (
    <nav className="app-nav" aria-label="Product views">
      <p className="app-nav-caption">Product views</p>
      <ul className="app-nav-list">
        {views.map((view) => (
          <li key={view.to}>
            <Link
              to={view.to}
              className={navLinkClass(view.active)}
              aria-current={view.active ? 'page' : undefined}
              onClick={onNavigate}
            >
              <HugeiconsIcon icon={view.icon} size={18} aria-hidden="true" />
              <span>{view.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function AppShell({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const emailDetailActive = useMatch('/emails/:emailId') !== null
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const productViews: ProductView[] = [
    { to: '/inbox', label: 'Inbox', icon: InboxIcon, active: pathname === '/inbox' },
    {
      to: '/emails/email_001',
      label: 'Email detail',
      icon: FileViewIcon,
      active: emailDetailActive
    },
    {
      to: '/review',
      label: 'Review queue',
      icon: FileValidationIcon,
      active: pathname === '/review'
    },
    {
      to: '/graph',
      label: 'Control graph',
      icon: Flowchart01Icon,
      active: pathname === '/graph'
    },
    {
      to: '/evaluation',
      label: 'Evaluation',
      icon: ChartEvaluationIcon,
      active: pathname === '/evaluation'
    }
  ]

  const settingsActive = pathname === '/settings'
  const crumbs = emailDetailActive
    ? [
        { label: 'Inbox', to: '/inbox' },
        { label: title }
      ]
    : [{ label: title }]

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const menuButton = menuButtonRef.current
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      menuButton?.focus()
    }
  }, [menuOpen])

  const settingsLink = (onNavigate?: () => void) => (
    <Link
      to="/settings"
      className={`${navLinkClass(settingsActive)} app-nav-link--settings`}
      aria-current={settingsActive ? 'page' : undefined}
      onClick={onNavigate}
    >
      <HugeiconsIcon icon={Settings02Icon} size={18} aria-hidden="true" />
      <span>Settings</span>
    </Link>
  )

  return (
    <div className="app-shell">
      <a className="app-skip" href="#app-content">
        Skip to content
      </a>
      <header className="app-bar">
        <Button
          ref={menuButtonRef}
          variant="ghost"
          className="app-menu-button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="app-nav-drawer"
          onClick={() => setMenuOpen(true)}
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} aria-hidden="true" />
        </Button>
        <Link to="/" className="app-brand">
          LadingLens
        </Link>
        <nav className="app-crumbs" aria-label="Breadcrumb">
          <ol>
            {crumbs.map((crumb, index) => (
              <li key={crumb.label}>
                {index > 0 ? (
                  <span className="app-crumb-sep" aria-hidden="true">
                    ›
                  </span>
                ) : null}
                {crumb.to ? (
                  <Link className="app-crumb-link" to={crumb.to}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="app-crumb-current" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <Link to="/judge" className="app-demo-link" aria-label="Open live demo">
          <HugeiconsIcon icon={PlayIcon} size={16} aria-hidden="true" />
          <span>Open live demo</span>
        </Link>
        <Button
          variant="ghost"
          className="app-theme-toggle"
          aria-label={
            theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
          onClick={() => setTheme(toggleTheme(theme))}
        >
          <HugeiconsIcon
            icon={theme === 'dark' ? Sun01Icon : Moon01Icon}
            size={20}
            aria-hidden="true"
          />
        </Button>
      </header>
      <div className="app-body">
        <div className="app-side">
          <ProductNavList views={productViews} />
          {settingsLink()}
        </div>
        <main className="app-content" id="app-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      {menuOpen ? (
        <div className="app-drawer-root">
          <div
            className="app-drawer-backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <div className="app-drawer" id="app-nav-drawer">
            <div className="app-drawer-head">
              <span className="app-drawer-title">Menu</span>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                className="app-drawer-close"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
              </Button>
            </div>
            <ProductNavList views={productViews} onNavigate={() => setMenuOpen(false)} />
            {settingsLink(() => setMenuOpen(false))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
