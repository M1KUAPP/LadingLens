import { useEffect, type ReactNode } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams
} from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { SiteShell } from '../layout/SiteShell'
import {
  ensureGuestSession,
  readGuestSession
} from '../lib/guest-session'
import { AuthPage } from '../pages/AuthPage'
import { EvaluationPage } from '../pages/EvaluationPage'
import { InboxPage } from '../pages/InboxPage'
import { LandingPage } from '../pages/LandingPage'
import { PlaceholderView } from '../pages/PlaceholderView'
import { EmailDetailView } from '../features/email-detail/EmailDetailView'

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
    <AppShell title="Email detail">
      <EmailDetailView emailId={emailId ?? 'email_001'} />
    </AppShell>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* The landing folds over the site footer, so nothing of it shows
          until the reader scrolls to the end. */}
      <Route
        path="/"
        element={
          <SiteShell>
            <LandingPage />
          </SiteShell>
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<OperatorGuard />}>
        <Route
          path="/inbox"
          element={
            <AppShell title="Inbox">
              <InboxPage />
            </AppShell>
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
            <AppShell title="Evaluation">
              <EvaluationPage />
            </AppShell>
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
