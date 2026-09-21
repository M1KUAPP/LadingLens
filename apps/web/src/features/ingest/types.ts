import type { Category, ReviewReason, Status } from '../../domain/contracts'

export type IngestItemState = 'processed' | 'held' | 'failed' | 'queued'

export type IngestItem = {
  id: string
  sender: string
  subject: string
  documents: number
  /** Documents the pipeline expects for this category, when the count is known. */
  expectedDocuments: number | null
  state: IngestItemState
  category: Category | null
  outcome: Status | null
  reviewReason: ReviewReason | null
  /** The probability that decided the outcome, when the record carries one. */
  confidence: number | null
  /** Plain-language explanation for a failed item. */
  failure: string | null
}

export type IngestBatch = {
  id: string
  name: string
  /** Provenance note shown beside the batch name, e.g. prepared data. */
  note: string | null
  items: IngestItem[]
}

export type IngestCounts = {
  total: number
  processed: number
  held: number
  failed: number
  queued: number
}

export type ConfidenceBand = 'mismatch' | 'review' | 'match'
