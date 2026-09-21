import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import ChartEvaluationIcon from '@hugeicons/core-free-icons/ChartEvaluationIcon'
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon'
import FileViewIcon from '@hugeicons/core-free-icons/FileViewIcon'
import Flowchart01Icon from '@hugeicons/core-free-icons/Flowchart01Icon'
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon'
import InboxUploadIcon from '@hugeicons/core-free-icons/InboxUploadIcon'
import LayoutLeftIcon from '@hugeicons/core-free-icons/LayoutLeftIcon'
import Login01Icon from '@hugeicons/core-free-icons/Login01Icon'
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon'
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon'
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon'
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon'
import { Button } from '../components/ui/Controls'
import { readTheme, toggleTheme, type Theme } from '../lib/theme'
import { readSidebarMode, storeSidebarMode, type SidebarMode } from './sidebar-state'
import { useWorkspaceSurface } from './useWorkspaceSurface'
import './app-shell.css'

type NavView = {
  to: string
  label: string
  icon: IconSvgElement
  active: boolean
}

type NavGroup = {
  label: string
  views: NavView[]
}

function navLinkClass(active: boolean) {
  return active ? 'app-nav-link app-nav-link--active' : 'app-nav-link'
}

function NavLink({ view, onNavigate }: { view: NavView; onNavigate?: () => void }) {
  return (
    <Link
      to={view.to}
      className={navLinkClass(view.active)}
      aria-current={view.active ? 'page' : undefined}
      data-label={view.label}
      onClick={onNavigate}
    >
      <span className="app-nav-icon">
        <HugeiconsIcon icon={view.icon} size={18} aria-hidden="true" />
      </span>
      <span className="app-nav-label">{view.label}</span>
    </Link>
  )
}

function ProductNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <nav className="app-nav" aria-label="Product views">
      {groups.map((group) => (
        <div className="app-nav-group" key={group.label}>
          <p className="app-nav-caption" aria-hidden="true">
            {group.label}
          </p>
          <ul className="app-nav-list" aria-label={group.label}>
            {group.views.map((view) => (
              <li key={view.to}>
                <NavLink view={view} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SessionCard() {
  return (
    <div className="app-session">
      <span className="app-session-avatar" aria-hidden="true">
        G
      </span>
      <span className="app-session-text">
        <span className="app-session-name">Guest session</span>
        <span className="app-session-note">Synthetic data only</span>
      </span>
    </div>
  )
}

function Brand({ markSrc }: { markSrc: string }) {
  return (
    <>
      <img className="app-mark" src={markSrc} alt="" width={28} height={28} />
      <span className="app-brand-text">
        <span className="app-brand-name">LadingLens</span>
        <span className="app-brand-note">Operator workspace</span>
      </span>
    </>
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
  useWorkspaceSurface()
  const isPublic = variant === 'public'
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [sidebar, setSidebar] = useState<SidebarMode>(readSidebarMode)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const emailDetailActive = useMatch('/emails/:emailId') !== null
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const markSrc = theme === 'dark' ? '/brand/mark-dark.svg' : '/brand/mark-colour.svg'
  const collapsed = sidebar === 'collapsed'

  const groups: NavGroup[] = [
    {
      label: 'Intake',
      views: [
        { to: '/ingest', label: 'Batch ingest', icon: InboxUploadIcon, active: pathname === '/ingest' },
        { to: '/inbox', label: 'Inbox', icon: InboxIcon, active: pathname === '/inbox' }
      ]
    },
    {
      label: 'Review',
      views: [
        { to: '/emails/email_001', label: 'Email detail', icon: FileViewIcon, active: emailDetailActive },
        { to: '/review', label: 'Review queue', icon: FileValidationIcon, active: pathname === '/review' }
      ]
    },
    {
      label: 'Insight',
      views: [
        { to: '/graph', label: 'Control graph', icon: Flowchart01Icon, active: pathname === '/graph' },
        { to: '/evaluation', label: 'Evaluation', icon: ChartEvaluationIcon, active: pathname === '/evaluation' }
      ]
    }
  ]

  const settings: NavView = {
    to: '/settings',
    label: 'Settings',
    icon: Settings02Icon,
    active: pathname === '/settings'
  }

  const crumbs = emailDetailActive ? [{ label: 'Inbox', to: '/inbox' }, { label: title }] : [{ label: title }]

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMenuOpen(false)
  }

  const toggleSidebar = useCallback(() => {
    setSidebar((current) => {
      const next = current === 'collapsed' ? 'expanded' : 'collapsed'
      storeSidebarMode(next)
      return next
    })
  }, [])

  // Cmd or Ctrl plus B, as in admincn and shadcn's sidebar.
  useEffect(() => {
    if (isPublic) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return
      }
      event.preventDefault()
      toggleSidebar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isPublic, toggleSidebar])

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
    <div className="app-shell" data-variant={variant} data-sidebar={isPublic ? undefined : sidebar}>
      <a className="app-skip" href="#app-content">
        Skip to content
      </a>

      {/* Desktop sidebar (admincn): expanded by default, collapsible to an
          icon rail. Labels stay in the accessibility tree when collapsed. */}
      {!isPublic && (
        <aside className="app-sidebar" id="app-sidebar" aria-label="Workspace">
          <div className="app-sidebar-head">
            <Link to="/" className="app-sidebar-brand" aria-label="LadingLens home">
              <Brand markSrc={markSrc} />
            </Link>
          </div>
          <ProductNav groups={groups} />
          <div className="app-sidebar-foot">
            <NavLink view={settings} />
            <SessionCard />
          </div>
        </aside>
      )}

      <div className="app-main">
        {/* Sticky floating header card over a masked blur. */}
        <header className="app-bar">
          <div className="app-bar-card">
            {!isPublic && (
              <Button
                ref={menuButtonRef}
                variant="ghost"
                className="app-icon-button app-menu-button"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="app-nav-drawer"
                onClick={() => setMenuOpen(true)}
              >
                <HugeiconsIcon icon={Menu01Icon} size={18} aria-hidden="true" />
              </Button>
            )}
            {!isPublic && (
              <Button
                variant="ghost"
                className="app-icon-button app-sidebar-toggle"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-controls="app-sidebar"
                aria-expanded={!collapsed}
                onClick={toggleSidebar}
              >
                <HugeiconsIcon icon={LayoutLeftIcon} size={18} aria-hidden="true" />
              </Button>
            )}
            <Link to="/" className="app-brand">
              <img className="app-brand-mark" src={markSrc} alt="" width={20} height={20} />
              LadingLens
            </Link>
            <span className="app-bar-divider" aria-hidden="true" />
            <nav className="app-crumbs" aria-label="Breadcrumb">
              <ol>
                {crumbs.map((crumb, index) => (
                  <li key={crumb.label}>
                    {index > 0 ? (
                      <span className="app-crumb-sep" aria-hidden="true">
                        /
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
                <Link to="/auth" className="app-bar-link" aria-label="Operator sign in">
                  <HugeiconsIcon icon={Login01Icon} size={16} aria-hidden="true" />
                  <span>Operator sign in</span>
                </Link>
              ) : null}
              <Button
                variant="ghost"
                className="app-icon-button app-theme-toggle"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={() => setTheme(toggleTheme(theme))}
              >
                <HugeiconsIcon
                  icon={theme === 'dark' ? Sun01Icon : Moon01Icon}
                  size={18}

                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </header>

        {/* The document scrolls; the sidebar and header stay pinned. */}
        <main className="app-content" id="app-content" tabIndex={-1}>
          <div className="app-column">{children}</div>
        </main>
      </div>

      {/* Narrow-viewport drawer. Stays mounted so it can slide in and out;
          inert + aria-hidden while closed. */}
      {!isPublic && (
        <div
          className="app-drawer-root"
          data-open={menuOpen}
          inert={!menuOpen}
          aria-hidden={menuOpen ? undefined : true}
        >
          <div className="app-drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="app-drawer" id="app-nav-drawer">
            <div className="app-drawer-head">
              <Link to="/" className="app-drawer-brand" aria-label="LadingLens home" onClick={() => setMenuOpen(false)}>
                <Brand markSrc={markSrc} />
              </Link>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                className="app-icon-button app-drawer-close"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
              </Button>
            </div>
            <ProductNav groups={groups} onNavigate={() => setMenuOpen(false)} />
            <div className="app-sidebar-foot">
              <NavLink view={settings} onNavigate={() => setMenuOpen(false)} />
              <SessionCard />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
