import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { SiteShell } from '../layout/SiteShell'
import { ensureGuestSession, readGuestSession } from '../lib/guest-session'
import { AuthPage } from '../pages/AuthPage'
import { EvaluationPage } from '../pages/EvaluationPage'
import { GraphPage } from '../pages/GraphPage'
import { InboxPage } from '../pages/InboxPage'
import { LandingPage } from '../pages/LandingPage'
import { PlaceholderView } from '../pages/PlaceholderView'
import { ReconciliationPage } from '../pages/ReconciliationPage'
import { ReviewPage } from '../pages/ReviewPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UploadPage } from '../pages/UploadPage'
import { EmailDetailView } from '../features/email-detail/EmailDetailView'
import { FloatingAssistant } from '../features/graph-chat/FloatingAssistant'
import { GraphAssistantProvider } from '../features/graph-chat/GraphAssistantProvider'

function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="public-view">
      <PlaceholderView title={title}>{children}</PlaceholderView>
    </main>
  )
}

function OperatorGuard() {
  return readGuestSession() ? <Outlet /> : <Navigate to="/auth" replace />
}

// The assistant floats over every workspace page and keeps its conversation
// from one to the next, so it mounts once, above their routes.
function WorkspaceAssistant() {
  return (
    <GraphAssistantProvider>
      <Outlet />
      <FloatingAssistant />
    </GraphAssistantProvider>
  )
}

// /judge stays the public, no-account entry (PRD FR-13): it starts a guest
// session so the workspace opens straight on the upload page. The README, the
// deck's QR code and the deployment smoke check all point here.
function JudgeEntry() {
  useState(ensureGuestSession)
  return <Navigate to="/upload" replace />
}

// Reconciliation was a tab on /review before it had its own page, so links to
// that tab still land on it.
function ReviewRoute() {
  const [searchParams] = useSearchParams()
  if (searchParams.get('tab') === 'reconciliation') return <Navigate to="/reconciliation" replace />
  return (
    <AppShell title="Review queue">
      <ReviewPage />
    </AppShell>
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
        <Route element={<WorkspaceAssistant />}>
          <Route
            path="/upload"
            element={
              <AppShell title="Upload">
                <UploadPage />
              </AppShell>
            }
          />
          {/* Batch ingest was folded into the inbox; old links land there. */}
          <Route path="/ingest" element={<Navigate to="/inbox" replace />} />
          <Route
            path="/inbox"
            element={
              <AppShell title="Inbox">
                <InboxPage />
              </AppShell>
            }
          />
          <Route path="/emails/:emailId" element={<EmailDetailPage />} />
          <Route path="/review" element={<ReviewRoute />} />
          <Route
            path="/reconciliation"
            element={
              <AppShell title="Reconciliation">
                <ReconciliationPage />
              </AppShell>
            }
          />
          <Route
            path="/graph"
            element={
              <AppShell title="Control graph">
                <GraphPage />
              </AppShell>
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
              <AppShell title="Settings">
                <SettingsPage />
              </AppShell>
            }
          />
        </Route>
      </Route>
      <Route path="/judge" element={<JudgeEntry />} />
      <Route
        path="*"
        element={
          <PublicPage title="Page not found">
            <p className="placeholder-copy">Check the address or return to the LadingLens landing page.</p>
          </PublicPage>
        }
      />
    </Routes>
  )
}
