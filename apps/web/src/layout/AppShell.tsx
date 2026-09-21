import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import ChartEvaluationIcon from '@hugeicons/core-free-icons/ChartEvaluationIcon'
import ChevronLeftIcon from '@hugeicons/core-free-icons/ChevronLeftIcon'
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon'
import FileViewIcon from '@hugeicons/core-free-icons/FileViewIcon'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon'
import InboxUploadIcon from '@hugeicons/core-free-icons/InboxUploadIcon'
import Login01Icon from '@hugeicons/core-free-icons/Login01Icon'
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
      {/* The caption row crossfades: a plain rule marks the collapsed rail,
          the caption text appears when the rail expands. */}
      <div className="app-nav-caption-row">
        <span className="app-nav-caption-rule" aria-hidden="true" />
        <p className="app-nav-caption">Product views</p>
      </div>
      <ul className="app-nav-list">
        {views.map((view) => (
          <li key={view.to}>
            <Link
              to={view.to}
              className={navLinkClass(view.active)}
              aria-current={view.active ? 'page' : undefined}
              onClick={onNavigate}
            >
              <span className="app-nav-icon">
                <HugeiconsIcon icon={view.icon} size={18} aria-hidden="true" />
              </span>
              <span className="app-nav-label">{view.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SettingsLink({ active, onNavigate }: { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to="/settings"
      className={`${navLinkClass(active)} app-nav-link--settings`}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <span className="app-nav-icon">
        <HugeiconsIcon icon={Settings02Icon} size={18} aria-hidden="true" />
      </span>
      <span className="app-nav-label">Settings</span>
    </Link>
  )
}

export function AppShell({
  title,
  variant = 'operator',
  children
}: {
  title: string
  variant?: 'operator' | 'public'
  children: ReactNode
}) {
  const isPublic = variant === 'public'
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const emailDetailActive = useMatch('/emails/:emailId') !== null
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const markSrc = theme === 'dark' ? '/brand/mark-dark.svg' : '/brand/mark-colour.svg'

  const productViews: ProductView[] = [
    {
      to: '/ingest',
      label: 'Batch ingest',
      icon: InboxUploadIcon,
      active: pathname === '/ingest'
    },
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

  return (
    <div className="app-shell" data-variant={variant}>
      <a className="app-skip" href="#app-content">
        Skip to content
      </a>

      {/* Fixed glass topbar: menu (narrow only), brand (narrow only),
          breadcrumbs, then the action cluster on the right. */}
      <header className="app-bar">
        {!isPublic && (
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
        )}
        <Link to="/" className="app-brand">
          {isPublic ? (
            <img className="app-brand-mark" src={markSrc} alt="" width={20} height={20} />
          ) : null}
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
        <div className="app-bar-actions">
          {isPublic ? (
            <Link to="/auth" className="app-demo-link" aria-label="Operator sign in">
              <HugeiconsIcon icon={Login01Icon} size={16} aria-hidden="true" />
              <span>Operator sign in</span>
            </Link>
          ) : (
            <Link to="/judge" className="app-demo-link" aria-label="Open live demo">
              <HugeiconsIcon icon={PlayIcon} size={16} aria-hidden="true" />
              <span>Open live demo</span>
            </Link>
          )}
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
        </div>
      </header>

      {/* Fixed navigation rail (desktop). Collapsed to icons by default;
          :hover and :focus-within expand it over the content. The public
          variant renders no rail: there are no operator destinations to
          navigate. */}
      {!isPublic && (
      <aside className="app-sidebar">
        <div className="app-sidebar-head">
          <Link to="/" className="app-sidebar-brand" aria-label="LadingLens home">
            <img className="app-mark" src={markSrc} alt="" width={32} height={32} />
            <span className="app-nav-label app-sidebar-wordmark">LadingLens</span>
          </Link>
        </div>
        <ProductNavList views={productViews} />
        <SettingsLink active={settingsActive} />
        <div className="app-sidebar-hint" aria-hidden="true">
          <HugeiconsIcon icon={ChevronLeftIcon} size={16} />
        </div>
      </aside>
      )}
      {/* Scrim sits over the content (and under the rail) while the rail is
          expanded. */}
      {!isPublic && <div className="app-scrim" aria-hidden="true" />}

      {/* The only region that scrolls: chrome is fixed, the column flows. */}
      <main className="app-content" id="app-content" tabIndex={-1}>
        <div className="app-column">{children}</div>
      </main>

      {/* Narrow-viewport drawer. Stays mounted so it can slide in and out;
          inert + aria-hidden while closed. */}
      {!isPublic && (
      <div
        className="app-drawer-root"
        data-open={menuOpen}
        inert={!menuOpen}
        aria-hidden={menuOpen ? undefined : true}
      >
        <div
          className="app-drawer-backdrop"
          onClick={() => setMenuOpen(false)}
        />
        <div className="app-drawer" id="app-nav-drawer">
          <div className="app-drawer-head">
            <Link to="/" className="app-drawer-brand" onClick={() => setMenuOpen(false)}>
              <img className="app-mark" src={markSrc} alt="" width={32} height={32} />
              <span>LadingLens</span>
            </Link>
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
          <SettingsLink active={settingsActive} onNavigate={() => setMenuOpen(false)} />
        </div>
      </div>
      )}
    </div>
  )
}
