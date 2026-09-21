import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { resetDemo, type ResetOutcome } from './demo-reset'

export type ResetRecord = { outcome: ResetOutcome; pathname: string }

type DemoReset = {
  resetKey: number
  reset: () => Promise<ResetOutcome>
  lastReset: ResetRecord | null
  clearLastReset: () => void
}

const ResetContext = createContext<DemoReset | null>(null)

export function ResetKeyProvider({ children }: { children: ReactNode }) {
  const [resetKey, setResetKey] = useState(0)
  const [lastReset, setLastReset] = useState<ResetRecord | null>(null)
  const reset = useCallback(async () => {
    const outcome = await resetDemo()
    // Record the outcome together with the page it completed on: a page
    // that's navigated away before this resolves shouldn't have a later,
    // ordinary visit show or focus an outcome that actually ran elsewhere.
    setLastReset({ outcome, pathname: window.location.pathname })
    if (outcome.ok) setResetKey((key) => key + 1)
    return outcome
  }, [])
  // Lets a page consume lastReset exactly once, so it doesn't keep re-showing
  // a stale outcome on a later, ordinary visit.
  const clearLastReset = useCallback(() => setLastReset(null), [])
  const value = useMemo(
    () => ({ resetKey, reset, lastReset, clearLastReset }),
    [resetKey, reset, lastReset, clearLastReset]
  )
  return <ResetContext.Provider value={value}>{children}</ResetContext.Provider>
}

export function useDemoReset(): DemoReset {
  const value = useContext(ResetContext)
  if (value === null) throw new Error('useDemoReset needs ResetKeyProvider')
  return value
}
