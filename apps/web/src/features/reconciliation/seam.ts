import { reconciliationResultProblems, type ExpectedShipment, type ReconciliationResult } from '../../domain/contracts'
import { readSessionState, removeSessionState, writeSessionState } from '../../lib/session-state'
import { parseExpectedShipmentsCsv } from './csv'
import { PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECEIVED_CASES } from './fixtures/prepared'
import { reconcileShipments } from './reconcile'
import type { CsvImportResult, ReceivedCase } from './types'

export interface ReconciliationService {
  getExpectedShipments(): Promise<ExpectedShipment[]>
  getReceivedCases(): Promise<ReceivedCase[]>
  /** The latest run's results; empty until reconciliation runs. */
  getReconciliationResults(): Promise<ReconciliationResult[]>
  importShipmentsCsv(csvText: string): Promise<CsvImportResult>
  runReconciliation(): Promise<ReconciliationResult[]>
  reset(): Promise<void>
}

/** Where the app's service keeps its run for the guest session. */
export const RECONCILIATION_STORAGE_KEY = 'ladinglens-reconciliation'

// What a person did, not what it produced: the ledger they loaded (null for
// the prepared one), how many runs they started, and when the latest ran
// (null once a new ledger clears it). A page load derives the outcomes again.
type StoredReconciliation = {
  ledger: { csvText: string; importedAt: string } | null
  runs: number
  ranAt: string | null
}

function isStoredReconciliation(value: unknown): value is StoredReconciliation {
  if (typeof value !== 'object' || value === null) return false
  const { ledger, runs, ranAt } = value as Record<string, unknown>
  const { csvText, importedAt } = (ledger ?? {}) as Record<string, unknown>
  return (
    (ledger === null || (typeof csvText === 'string' && typeof importedAt === 'string')) &&
    Number.isInteger(runs) &&
    (runs as number) >= 0 &&
    (ranAt === null || (typeof ranAt === 'string' && (runs as number) > 0))
  )
}

export function createPreparedReconciliationService(options?: {
  now?: () => string
  /** Keeps the run in sessionStorage under this key, so a page load keeps it until reset. */
  storageKey?: string
}): ReconciliationService {
  const now = options?.now ?? (() => new Date().toISOString())
  const storageKey = options?.storageKey
  let ledger: StoredReconciliation['ledger'] = null
  let shipments: ExpectedShipment[] = []
  let results: ReconciliationResult[] = []
  let runCounter = 0
  let ranAt: string | null = null

  // The page opens on the inputs: nothing is reconciled until a person runs it.
  const seed = () => {
    ledger = null
    shipments = structuredClone(PREPARED_EXPECTED_SHIPMENTS)
    results = []
    runCounter = 0
    ranAt = null
  }

  function derive(createdAt: string): ReconciliationResult[] {
    const runId = `run_prepared_${String(runCounter).padStart(3, '0')}`
    const derived = reconcileShipments(shipments, PREPARED_RECEIVED_CASES, runId, createdAt)
    for (const result of derived) {
      const problems = reconciliationResultProblems(result)
      if (problems.length > 0) {
        throw new Error(`Prepared run produced an invalid result for ${result.subject_key}: ${problems.join('; ')}`)
      }
    }
    return derived
  }

  function save() {
    if (storageKey) writeSessionState(storageKey, { ledger, runs: runCounter, ranAt } satisfies StoredReconciliation)
  }

  function restore(stored: StoredReconciliation) {
    if (stored.ledger) {
      const parsed = parseExpectedShipmentsCsv(stored.ledger.csvText, stored.ledger.importedAt)
      if (parsed.errors.length > 0) throw new Error('The stored ledger no longer parses')
      shipments = parsed.shipments
    }
    ledger = stored.ledger
    runCounter = stored.runs
    ranAt = stored.ranAt
    results = ranAt === null ? [] : derive(ranAt)
  }

  seed()
  if (storageKey) {
    const stored = readSessionState(storageKey)
    if (isStoredReconciliation(stored)) {
      try {
        restore(stored)
      } catch {
        // A stored run that no longer derives cleanly is dropped, not shown.
        seed()
        removeSessionState(storageKey)
      }
    }
  }

  return {
    async getExpectedShipments(): Promise<ExpectedShipment[]> {
      return structuredClone(shipments)
    },

    async getReceivedCases(): Promise<ReceivedCase[]> {
      return structuredClone(PREPARED_RECEIVED_CASES)
    },

    async getReconciliationResults(): Promise<ReconciliationResult[]> {
      return structuredClone(results)
    },

    async importShipmentsCsv(csvText: string): Promise<CsvImportResult> {
      const importedAt = now()
      const parsed = parseExpectedShipmentsCsv(csvText, importedAt)
      if (parsed.errors.length > 0) {
        return { importedCount: 0, errors: parsed.errors }
      }
      // A new ledger makes the latest run's outcomes stale.
      ledger = { csvText, importedAt }
      shipments = parsed.shipments
      results = []
      ranAt = null
      save()
      return { importedCount: parsed.shipments.length, errors: [] }
    },

    async runReconciliation(): Promise<ReconciliationResult[]> {
      runCounter += 1
      const createdAt = now()
      results = derive(createdAt)
      ranAt = createdAt
      save()
      return structuredClone(results)
    },

    async reset(): Promise<void> {
      seed()
      if (storageKey) removeSessionState(storageKey)
    }
  }
}

export const defaultReconciliationService = createPreparedReconciliationService({
  storageKey: RECONCILIATION_STORAGE_KEY
})
