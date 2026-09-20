import { reconciliationResultProblems, type ExpectedShipment, type ReconciliationResult } from '../../domain/contracts'
import { parseExpectedShipmentsCsv } from './csv'
import { PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECONCILIATION_RESULTS, PREPARED_RUN_ID } from './fixtures/prepared'
import { deriveReconciliationResults } from './reconcile'
import type { CsvImportResult } from './types'

export interface ReconciliationService {
  getExpectedShipments(): Promise<ExpectedShipment[]>
  getReconciliationResults(): Promise<ReconciliationResult[]>
  importShipmentsCsv(csvText: string): Promise<CsvImportResult>
  rerunReconciliation(): Promise<ReconciliationResult[]>
  reset(): Promise<void>
}

export function createPreparedReconciliationService(options?: { now?: () => string }): ReconciliationService {
  const now = options?.now ?? (() => new Date().toISOString())
  let shipments: ExpectedShipment[] = []
  let results: ReconciliationResult[] = []
  let runCounter = 0

  const seed = () => {
    shipments = structuredClone(PREPARED_EXPECTED_SHIPMENTS)
    results = structuredClone(PREPARED_RECONCILIATION_RESULTS)
    runCounter = Number(PREPARED_RUN_ID.replace('run_prepared_', ''))
  }
  seed()

  return {
    async getExpectedShipments(): Promise<ExpectedShipment[]> {
      return structuredClone(shipments)
    },

    async getReconciliationResults(): Promise<ReconciliationResult[]> {
      return structuredClone(results)
    },

    async importShipmentsCsv(csvText: string): Promise<CsvImportResult> {
      const parsed = parseExpectedShipmentsCsv(csvText, now())
      if (parsed.errors.length > 0) {
        return { importedCount: 0, errors: parsed.errors }
      }
      shipments = parsed.shipments
      return { importedCount: parsed.shipments.length, errors: [] }
    },

    async rerunReconciliation(): Promise<ReconciliationResult[]> {
      runCounter += 1
      const runId = `run_prepared_${String(runCounter).padStart(3, '0')}`
      const derived = deriveReconciliationResults(shipments, runId, now())
      for (const result of derived) {
        const problems = reconciliationResultProblems(result)
        if (problems.length > 0) {
          throw new Error(`Prepared rerun produced an invalid result for ${result.subject_key}: ${problems.join('; ')}`)
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
