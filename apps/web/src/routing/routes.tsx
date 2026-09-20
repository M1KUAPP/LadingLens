import { useEffect, type ReactNode } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams
} from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import {
  ensureGuestSession,
  readGuestSession
} from '../lib/guest-session'
import { AuthPage } from '../pages/AuthPage'
import { LandingPage } from '../pages/LandingPage'
import { PlaceholderView } from '../pages/PlaceholderView'

function ShellPage({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <AppShell title={title}>
      <PlaceholderView title={title}>{children}</PlaceholderView>
    </AppShell>
  )
}

function PublicPage({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="public-view">
      <PlaceholderView title={title}>{children}</PlaceholderView>
    </main>
  )
}

function OperatorGuard() {
  return readGuestSession() ? <Outlet /> : <Navigate to="/auth" replace />
}

function JudgePage() {
  useEffect(() => {
    ensureGuestSession()
  }, [])
  return (
    <PublicPage title="Judge workspace">
      <p className="placeholder-copy">
        Issue #39 builds the public flow where a judge submits a fresh
        synthetic pair and inspects a live result.
      </p>
    </PublicPage>
  )
}

function EmailDetailPage() {
  const { emailId } = useParams()
  return (
    <ShellPage title="Email detail">
      <p className="placeholder-param">{emailId}</p>
      <p className="placeholder-copy">
        Issue #37 builds the side-by-side comparison of the shipping
        instruction and the draft bill of lading with source evidence.
      </p>
    </ShellPage>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<OperatorGuard />}>
        <Route
          path="/inbox"
          element={
            <ShellPage title="Inbox">
              <p className="placeholder-copy">
                Issue #36 builds the triage list that accounts for every
                received email.
              </p>
            </ShellPage>
          }
        />
        <Route path="/emails/:emailId" element={<EmailDetailPage />} />
        <Route
          path="/review"
          element={
            <ShellPage title="Review queue">
              <p className="placeholder-copy">
                Issue #38 builds the queue where a named reviewer approves,
                corrects, or rejects held cases.
              </p>
            </ShellPage>
          }
        />
        <Route
          path="/graph"
          element={
            <ShellPage title="Control graph">
              <p className="placeholder-copy">
                Issue #38 builds the graph of emails, shipments, parties,
                ports, documents, and mismatches.
              </p>
            </ShellPage>
          }
        />
        <Route
          path="/evaluation"
          element={
            <ShellPage title="Evaluation">
              <p className="placeholder-copy">
                Issue #36 builds the dashboard that reports evaluation run
                metrics.
              </p>
            </ShellPage>
          }
        />
        <Route
          path="/settings"
          element={
            <ShellPage title="Settings">
              <p className="placeholder-copy">
                Issue #40 builds this view with the guest-scoped Reset All
                control.
              </p>
            </ShellPage>
          }
        />
      </Route>
      <Route path="/judge" element={<JudgePage />} />
      <Route
        path="*"
        element={
          <PublicPage title="Page not found">
            <p className="placeholder-copy">
              Check the address or return to the LadingLens landing page.
            </p>
          </PublicPage>
        }
      />
    </Routes>
  )
}
