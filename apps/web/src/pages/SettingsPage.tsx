import { useEffect, useRef, useState } from 'react'
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon'
import { Button } from '../components/ui/Controls'
import { ConfirmDialog, Tooltip } from '../components/ui/Overlays'
import { PageHead } from '../components/ui/PageHead'
import { useDemoReset } from '../lib/reset-context'
import './settings-page.css'

const RESET_TRIGGER_ID = 'settings-reset-trigger'

export function SettingsPage() {
  const { reset, lastReset, clearLastReset } = useDemoReset()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const wasDialogOpenRef = useRef(false)
  // Captured once, via the lazy initializer, from this instance's first
  // render: a successful reset remounts this page (KeyedRoutes in App.tsx
  // keys the routes on resetKey), so a fresh mount that already carries a
  // successful lastReset is *usually* the direct result of that reset - but
  // the reset can also settle after the user has already navigated away
  // (e.g. Back while it's running), so lastReset is tagged with the
  // pathname reset() completed on; only a match with this page's own
  // mountPathname below means this mount is that direct result. Kept in
  // state rather than read live from context, so the rendered outcome stays
  // stable for this instance's lifetime even after clearLastReset() (below)
  // runs; refs can't be read during render, so state is what makes this
  // lint-clean and re-render-safe at the same time.
  const [mountOutcome, setMountOutcome] = useState(() => lastReset)
  // This page's own pathname, captured the same way and at the same mount,
  // so the comparison below still matches '/settings/' (which the router
  // also matches) or a future app basename, not just a literal '/settings'.
  const [mountPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    // Consume the captured outcome exactly once: focus it if it was a
    // success that ran on this page, then clear it from context. Otherwise
    // an ordinary later visit to /settings (no new reset since) would
    // re-show this outcome and re-steal focus, because lastReset lives
    // above the router and nothing else would ever clear it. mountOutcome
    // only actually changes again on a same-instance retry (see
    // handleConfirm), when there is nothing left to focus and nothing left
    // to clear.
    if (mountOutcome?.outcome.ok && mountOutcome.pathname === mountPathname) statusRef.current?.focus()
    clearLastReset()
  }, [mountOutcome, mountPathname, clearLastReset])

  useEffect(() => {
    // Runs after the dialog element is actually removed from the DOM, so the
    // trigger button is no longer behind an inert modal when it is focused.
    if (wasDialogOpenRef.current && !dialogOpen) {
      document.getElementById(RESET_TRIGGER_ID)?.focus()
    }
    wasDialogOpenRef.current = dialogOpen
  }, [dialogOpen])

  function handleCancel() {
    if (busy) return
    setDialogOpen(false)
  }

  async function handleConfirm() {
    // A retry on this same instance (no navigation since an earlier captured
    // success) must not keep masking a new outcome with the stale one.
    setMountOutcome(null)
    setBusy(true)
    setFailureMessage(null)
    const outcome = await reset()
    setBusy(false)
    setDialogOpen(false)
    if (!outcome.ok) setFailureMessage(outcome.message)
  }

  return (
    <div className="page">
      <PageHead
        icon={Settings02Icon}
        title="Settings"
        supporting="Demo data controls for this guest workspace."
        hintLabel="About settings"
        hint={<span>Settings apply to this browser tab and your guest workspace only.</span>}
      />

      <section className="settings-section">
        <div className="settings-section-head">
          <h2 className="type-heading-sm">Demo data</h2>
          <Tooltip label="About demo data">
            Other guests keep their own workspaces; a reset never touches theirs.
          </Tooltip>
        </div>

        <p className="type-body-md">
          Reset All restores the original demo data so you can run the demonstration again from the start.
        </p>

        <div className="settings-reset-will">
          <p className="type-label-md">Reset All will:</p>
          <ul>
            <li>Remove your uploads and judge runs</li>
            <li>Undo your review decisions and reconciliation actions</li>
            <li>Restore the original inbox, shipment ledger, and assignments</li>
            <li>Return theme, filters, and selections to their defaults</li>
          </ul>
        </div>

        <Button id={RESET_TRIGGER_ID} variant="secondary" disabled={busy} onClick={() => setDialogOpen(true)}>
          Reset All
        </Button>

        {busy ? (
          <p role="status" className="settings-reset-status">
            Resetting your workspace…
          </p>
        ) : mountOutcome?.outcome.ok && mountOutcome.pathname === mountPathname ? (
          <p role="status" className="settings-reset-status" tabIndex={-1} ref={statusRef}>
            Demo data reset. You are on a clean workspace. Reset at{' '}
            {new Date(mountOutcome.outcome.resetAt).toLocaleTimeString()}.
          </p>
        ) : failureMessage ? (
          <p role="alert" className="settings-reset-alert">
            {failureMessage} Your data was not changed.
          </p>
        ) : null}

        <ConfirmDialog
          open={dialogOpen}
          title="Reset all demo data?"
          confirmLabel={busy ? 'Resetting…' : 'Reset all'}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        >
          <p>This restores the original demo data for your guest workspace. It cannot be undone.</p>
        </ConfirmDialog>
      </section>
    </div>
  )
}
