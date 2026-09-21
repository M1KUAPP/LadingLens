import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Controls'
import { ConfirmDialog, Tooltip } from '../components/ui/Overlays'
import { useDemoReset } from '../lib/reset-context'
import './settings-page.css'

const RESET_TRIGGER_ID = 'settings-reset-trigger'

export function SettingsPage() {
  const { reset, lastReset } = useDemoReset()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const wasDialogOpenRef = useRef(false)

  useEffect(() => {
    // A successful reset remounts this page (KeyedRoutes in App.tsx keys the
    // routes on resetKey), so a fresh mount that already carries a successful
    // lastReset is the direct result of that reset: land focus on the
    // outcome instead of leaving it at the top of the page.
    if (lastReset?.ok) statusRef.current?.focus()
  }, [])

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
    setBusy(true)
    setFailureMessage(null)
    const outcome = await reset()
    setBusy(false)
    setDialogOpen(false)
    if (!outcome.ok) setFailureMessage(outcome.message)
  }

  return (
    <div className="settings-page">
      <header className="settings-page-head">
        <h1 className="type-heading-lg">Settings</h1>
        <Tooltip label="About settings">Settings apply to this browser tab and your guest workspace only.</Tooltip>
      </header>

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
        ) : lastReset?.ok ? (
          <p role="status" className="settings-reset-status" tabIndex={-1} ref={statusRef}>
            Demo data reset. You are on a clean workspace. Reset at {new Date(lastReset.resetAt).toLocaleTimeString()}.
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
