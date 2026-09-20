import { useState, type ReactNode } from 'react'
import { Link, useLocation, useMatch } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon'
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon'
import { Button } from '../components/ui/Controls'
import { readTheme, toggleTheme, type Theme } from '../lib/theme'
import './app-shell.css'

export function AppShell({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const { pathname } = useLocation()
  const emailDetailActive = useMatch('/emails/:emailId') !== null

  const productViews = [
    { to: '/inbox', label: 'Inbox', active: pathname === '/inbox' },
    {
      to: '/emails/email_001',
      label: 'Email detail',
      active: emailDetailActive
    },
    { to: '/review', label: 'Review queue', active: pathname === '/review' },
    { to: '/graph', label: 'Control graph', active: pathname === '/graph' },
    {
      to: '/evaluation',
      label: 'Evaluation',
      active: pathname === '/evaluation'
    }
  ]

  const navLinkClass = (active: boolean) =>
    active ? 'app-nav-link app-nav-link--active' : 'app-nav-link'

  return (
    <div className="app-shell">
      <header className="app-bar">
        <Link to="/" className="app-brand">
          LadingLens
        </Link>
        <span className="app-bar-view">{title}</span>
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
          <nav className="app-nav" aria-label="Product views">
            <ul className="app-nav-list">
              {productViews.map((view) => (
                <li key={view.to}>
                  <Link
                    to={view.to}
                    className={navLinkClass(view.active)}
                    aria-current={view.active ? 'page' : undefined}
                  >
                    {view.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            to="/settings"
            className={`${navLinkClass(pathname === '/settings')} app-nav-link--settings`}
            aria-current={pathname === '/settings' ? 'page' : undefined}
          >
            Settings
          </Link>
        </div>
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
