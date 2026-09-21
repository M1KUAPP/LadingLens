import { fixtureInboxSource } from '../../data/inbox-source'
import type { InboxDataset, InboxRow, InboxSource } from '../../data/inbox-types'
import { PREPARED_FIXTURES } from '../email-detail/fixtures'
import type { EmailDetailRecord } from '../email-detail/types'
import type { ConfidenceBand, IngestBatch, IngestCounts, IngestItem, IngestItemState } from './types'

export const ITEM_STATE_LABEL: Record<IngestItemState, string> = {
  processed: 'Processed',
  held: 'Held for review',
  failed: 'Failed',
  queued: 'Waiting'
}

export const CONFIDENCE_BAND_LABEL: Record<ConfidenceBand, string> = {
  mismatch: 'Clear difference',
  review: 'Needs a person',
  match: 'Confident match'
}

// Decision bands from docs/research/ideation/escalation-policy.md: at or below
// 30% reads as a clear difference, between 30% and 85% goes to a person, and
// 85% and above is trusted automatically.
export function confidenceBand(value: number): ConfidenceBand {
  if (value <= 0.3) return 'mismatch'
  if (value < 0.85) return 'review'
  return 'match'
}

export function countStates(items: IngestItem[]): IngestCounts {
  const counts: IngestCounts = { total: items.length, processed: 0, held: 0, failed: 0, queued: 0 }
  for (const item of items) {
    counts[item.state] += 1
  }
  return counts
}

// The probability an operator should see is the one that decided the outcome:
// an explicit review probability on a held case, else the weakest field
// probability on the record. Most prepared records carry neither.
export function confidenceFromRecord(record: EmailDetailRecord | undefined): number | null {
  if (!record) return null
  const reviewProbability = record.held_review?.probability
  if (typeof reviewProbability === 'number') return reviewProbability
  const verdictProbabilities = record.field_verdicts
    .map((verdict) => verdict.semantic_probability)
    .filter((probability): probability is number => typeof probability === 'number')
  if (!verdictProbabilities.length) return null
  return Math.min(...verdictProbabilities)
}

function deriveItem(row: InboxRow, details: Record<string, EmailDetailRecord>): IngestItem {
  return {
    id: row.email_id,
    sender: row.sender,
    subject: row.subject,
    documents: row.attachments.length,
    expectedDocuments: row.outcome.category === 'BL_COMPARISON' ? 2 : null,
    state: row.outcome.status === 'NEEDS_REVIEW' ? 'held' : 'processed',
    category: row.outcome.category,
    outcome: row.outcome.status,
    reviewReason: row.outcome.review_reason,
    confidence: confidenceFromRecord(details[row.email_id]),
    failure: null
  }
}

function deriveBatch(dataset: InboxDataset, details: Record<string, EmailDetailRecord>): IngestBatch {
  return {
    id: 'prepared-bundle',
    name: 'Prepared mail bundle',
    note: 'Checked-in demo data',
    items: dataset.rows.map((row) => deriveItem(row, details))
  }
}

export interface IngestSource {
  loadBatches(): Promise<IngestBatch[]>
}

export function createIngestSource(
  inbox: InboxSource = fixtureInboxSource,
  details: Record<string, EmailDetailRecord> = PREPARED_FIXTURES
): IngestSource {
  return {
    async loadBatches() {
      const result = await inbox.load()
      if (result.kind !== 'ready') {
        throw new Error(result.problems.join(' '))
      }
      return [deriveBatch(result.dataset, details)]
    }
  }
}

export const defaultIngestSource = createIngestSource()
