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

export type CsvImportError = {
  row: number
  column?: string
  message: string
}

export type CsvImportResult = {
  importedCount: number
  errors: CsvImportError[]
}
