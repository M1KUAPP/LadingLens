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

function deriveBatch(
  dataset: InboxDataset,
  details: Record<string, EmailDetailRecord>
): IngestBatch {
  return {
    id: 'prepared-bundle',
    name: 'Prepared mail bundle',
    note: 'Checked-in demo data',
    items: dataset.rows.map((row) => deriveItem(row, details))
  }
}

export class BundleReadError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Staged uploads are never classified in this demo: every entry lands as a
// waiting item so the batch list reflects exactly what the file declared.
function parseBundle(id: string, fileName: string, contents: string): IngestBatch {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new BundleReadError(`${fileName} is not readable JSON.`)
  }
  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.emails)
      ? parsed.emails
      : null
  if (!entries) {
    throw new BundleReadError(`${fileName} does not look like a mail bundle.`)
  }
  if (entries.length === 0) {
    throw new BundleReadError(`${fileName} contains no emails.`)
  }
  const items = entries.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new BundleReadError(`Entry ${index + 1} in ${fileName} is not an email.`)
    }
    const entryId = entry.email_id ?? entry.id
    if (typeof entryId !== 'string' || !entryId.trim()) {
      throw new BundleReadError(`Entry ${index + 1} in ${fileName} has no email id.`)
    }
    const sender =
      typeof entry.sender === 'string'
        ? entry.sender
        : typeof entry.from === 'string'
          ? entry.from
          : 'Unknown sender'
    const subject = typeof entry.subject === 'string' && entry.subject ? entry.subject : 'No subject'
    return {
      id: entryId,
      sender,
      subject,
      documents: Array.isArray(entry.attachments) ? entry.attachments.length : 0,
      expectedDocuments: null,
      state: 'queued' as const,
      category: null,
      outcome: null,
      reviewReason: null,
      confidence: null,
      failure: null
    }
  })
  return {
    id,
    name: fileName,
    note: 'Staged upload, not classified in this demo',
    items
  }
}

export interface IngestSource {
  loadBatches(): Promise<IngestBatch[]>
  stageBundle(fileName: string, contents: string): IngestBatch
}

export function createIngestSource(
  inbox: InboxSource = fixtureInboxSource,
  details: Record<string, EmailDetailRecord> = PREPARED_FIXTURES
): IngestSource {
  let stagedCount = 0
  return {
    async loadBatches() {
      const result = await inbox.load()
      if (result.kind !== 'ready') {
        throw new Error(result.problems.join(' '))
      }
      return [deriveBatch(result.dataset, details)]
    },
    stageBundle(fileName, contents) {
      stagedCount += 1
      return parseBundle(`staged-${stagedCount}`, fileName, contents)
    }
  }
}

export const defaultIngestSource = createIngestSource()
