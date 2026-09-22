import type { RequiredDocument } from '../../domain/contracts'

export type {
  AmbiguousReconciliation,
  ExpectedShipment,
  MissingCaseReconciliation,
  ReconciliationBase,
  ReconciliationOutcome,
  ReconciliationResult,
  RequiredDocument,
  ShipmentBackedReconciliation,
  SourceFreshness,
  UnmatchedCaseReconciliation
} from '../../domain/contracts'

/** A received BL case as reconciliation reads it: the numbers its documents
 * and email name, and the documents it carries. */
export type ReceivedCase = {
  case_id: string
  email_id: string
  identifiers: Record<string, string>
  documents: RequiredDocument[]
}

export type CsvImportError = {
  row: number
  column?: string
  message: string
}

export type CsvImportResult = {
  importedCount: number
  errors: CsvImportError[]
}
