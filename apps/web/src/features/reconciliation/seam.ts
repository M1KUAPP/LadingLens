import { reconciliationResultProblems, type ExpectedShipment, type ReconciliationResult } from '../../domain/contracts'
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

export function createPreparedReconciliationService(options?: { now?: () => string }): ReconciliationService {
  const now = options?.now ?? (() => new Date().toISOString())
  let shipments: ExpectedShipment[] = []
  let results: ReconciliationResult[] = []
  let runCounter = 0

  // The page opens on the inputs: nothing is reconciled until a person runs it.
  const seed = () => {
    shipments = structuredClone(PREPARED_EXPECTED_SHIPMENTS)
    results = []
    runCounter = 0
  }
  seed()

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
      const parsed = parseExpectedShipmentsCsv(csvText, now())
      if (parsed.errors.length > 0) {
        return { importedCount: 0, errors: parsed.errors }
      }
      // A new ledger makes the latest run's outcomes stale.
      shipments = parsed.shipments
      results = []
      return { importedCount: parsed.shipments.length, errors: [] }
    },

    async runReconciliation(): Promise<ReconciliationResult[]> {
      runCounter += 1
      const runId = `run_prepared_${String(runCounter).padStart(3, '0')}`
      const derived = reconcileShipments(shipments, PREPARED_RECEIVED_CASES, runId, now())
      for (const result of derived) {
        const problems = reconciliationResultProblems(result)
        if (problems.length > 0) {
          throw new Error(`Prepared run produced an invalid result for ${result.subject_key}: ${problems.join('; ')}`)
        }
      }
      results = derived
      return structuredClone(results)
    },

    async reset(): Promise<void> {
      seed()
    }
  }
}

export const defaultReconciliationService = createPreparedReconciliationService()
