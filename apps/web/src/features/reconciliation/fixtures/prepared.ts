import { reconciliationResultProblems } from '../../../domain/contracts'
import { parseExpectedShipmentsCsv } from '../csv'
import { deriveReconciliationResults } from '../reconcile'
import csvText from './expected_shipments.csv?raw'

export const PREPARED_DATASET_LABEL = 'Synthetic demo dataset - prepared fixture for verification'
export const EXPECTED_SHIPMENTS_CSV = csvText
export const PREPARED_RUN_ID = 'run_prepared_001'

const PREPARED_AT = '2026-09-19T09:00:00Z'

const parsed = parseExpectedShipmentsCsv(csvText, PREPARED_AT)
if (parsed.errors.length > 0) {
  throw new Error(
    `expected_shipments.csv fixture failed to parse: ${parsed.errors
      .map((e) => `row ${e.row}: ${e.message}`)
      .join('; ')}`
  )
}

export const PREPARED_EXPECTED_SHIPMENTS = parsed.shipments

export const PREPARED_RECONCILIATION_RESULTS = deriveReconciliationResults(
  PREPARED_EXPECTED_SHIPMENTS,
  PREPARED_RUN_ID,
  PREPARED_AT
)

for (const result of PREPARED_RECONCILIATION_RESULTS) {
  const problems = reconciliationResultProblems(result)
  if (problems.length > 0) {
    throw new Error(
      `Prepared reconciliation result ${result.reconciliation_id} violates contract: ${problems.join('; ')}`
    )
  }
}
