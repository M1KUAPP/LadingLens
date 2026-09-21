import { describe, expect, it } from 'vitest'
import type { InboxDataset, InboxLoadResult, InboxRow, InboxSource } from '../../data/inbox-types'
import { email507Fixture, emailAmbiguousFixture } from '../email-detail/fixtures'
import type { EmailDetailRecord } from '../email-detail/types'
import {
  BundleReadError,
  confidenceBand,
  confidenceFromRecord,
  countStates,
  createIngestSource
} from './seam'
import type { IngestItem } from './types'

function row(partial: Partial<InboxRow> & Pick<InboxRow, 'email_id'>): InboxRow {
  return {
    sender: 'ops@shipper.example',
    subject: 'Docs for booking BK-100',
    attachments: ['si.txt', 'draft_bl.pdf'],
    outcome: { category: 'BL_COMPARISON', status: 'OK', review_reason: null },
    ...partial
  }
}

function dataset(rows: InboxRow[]): InboxDataset {
  return {
    source: 'prepared-fixture',
    receivedCount: rows.length,
    rows,
    artifact: {},
    artifactUrl: '/artifact.json',
    reconciliation: []
  }
}

function inboxSource(load: () => Promise<InboxLoadResult>): InboxSource {
  return { load }
}

function item(partial: Partial<IngestItem>): IngestItem {
  return {
    id: 'email_x',
    sender: 'ops@shipper.example',
    subject: 'Docs',
    documents: 2,
    expectedDocuments: 2,
    state: 'processed',
    category: 'BL_COMPARISON',
    outcome: 'OK',
    reviewReason: null,
    confidence: null,
    failure: null,
    ...partial
  }
}

describe('createIngestSource.loadBatches', () => {
  it('derives one prepared batch from the inbox dataset', async () => {
    const source = createIngestSource(
      inboxSource(async () => ({ kind: 'ready', dataset: dataset([row({ email_id: 'email_1' })]) }))
    )
    const batches = await source.loadBatches()
    expect(batches).toHaveLength(1)
    expect(batches[0].name).toBe('Prepared mail bundle')
    expect(batches[0].items).toHaveLength(1)
  })

  it('maps terminal outcomes to item states', async () => {
    const rows = [
      row({ email_id: 'email_ok' }),
      row({
        email_id: 'email_mismatch',
        outcome: { category: 'BL_COMPARISON', status: 'MISMATCH', review_reason: null }
      }),
      row({
        email_id: 'email_held',
        outcome: { category: 'SI_REQUEST', status: 'NEEDS_REVIEW', review_reason: 'missing_attachment' }
      })
    ]
    const source = createIngestSource(inboxSource(async () => ({ kind: 'ready', dataset: dataset(rows) })))
    const [batch] = await source.loadBatches()
    const byId = new Map(batch.items.map((entry) => [entry.id, entry]))
    expect(byId.get('email_ok')?.state).toBe('processed')
    expect(byId.get('email_mismatch')?.state).toBe('processed')
    expect(byId.get('email_held')?.state).toBe('held')
    expect(byId.get('email_held')?.reviewReason).toBe('missing_attachment')
  })

  it('joins the detail record so a carried probability reaches the item', async () => {
    const rows = [
      row({
        email_id: 'email_ambiguous',
        outcome: { category: 'BL_COMPARISON', status: 'NEEDS_REVIEW', review_reason: null }
      })
    ]
    const source = createIngestSource(
      inboxSource(async () => ({ kind: 'ready', dataset: dataset(rows) })),
      { email_ambiguous: emailAmbiguousFixture }
    )
    const [batch] = await source.loadBatches()
    expect(batch.items[0].confidence).toBeCloseTo(0.68)
  })

  it('leaves confidence empty when the record carries no probability', async () => {
    const source = createIngestSource(
      inboxSource(async () => ({ kind: 'ready', dataset: dataset([row({ email_id: 'email_507' })]) })),
      { email_507: email507Fixture }
    )
    const [batch] = await source.loadBatches()
    expect(batch.items[0].confidence).toBeNull()
  })

  it('surfaces prepared-data problems as a thrown error', async () => {
    const source = createIngestSource(
      inboxSource(async () => ({ kind: 'error', problems: ['broken fixture'] }))
    )
    await expect(source.loadBatches()).rejects.toThrow('broken fixture')
  })
})

describe('confidenceFromRecord', () => {
  it('prefers the review probability that decided a held case', () => {
    expect(confidenceFromRecord(emailAmbiguousFixture)).toBeCloseTo(0.68)
  })

  it('falls back to the weakest field probability on the record', () => {
    const provenance: EmailDetailRecord['field_verdicts'][number]['si']['provenance'] = {
      attachment_id: 'att_1',
      file_name: 'si.txt',
      format: 'txt',
      location: { kind: 'txt', line: 1, start_col: 0, end_col: 4 }
    }
    const record: EmailDetailRecord = {
      ...email507Fixture,
      field_verdicts: [
        {
          field: 'consignee',
          si: { field: 'consignee', provenance },
          draft_bl: { field: 'consignee', provenance },
          verdict: 'MATCH',
          semantic_probability: 0.91
        },
        {
          field: 'gross_weight_kg',
          si: { field: 'gross_weight_kg', provenance },
          draft_bl: { field: 'gross_weight_kg', provenance },
          verdict: 'REVIEW',
          semantic_probability: 0.42
        }
      ]
    }
    expect(confidenceFromRecord(record)).toBeCloseTo(0.42)
  })

  it('returns null when nothing was recorded', () => {
    expect(confidenceFromRecord(email507Fixture)).toBeNull()
    expect(confidenceFromRecord(undefined)).toBeNull()
  })
})

describe('confidenceBand', () => {
  it.each([
    [0.0, 'mismatch'],
    [0.3, 'mismatch'],
    [0.31, 'review'],
    [0.84, 'review'],
    [0.85, 'match'],
    [1.0, 'match']
  ] as const)('puts %f in the %s band', (value, band) => {
    expect(confidenceBand(value)).toBe(band)
  })
})

describe('countStates', () => {
  it('counts every terminal and waiting state', () => {
    const items = [
      item({ state: 'processed' }),
      item({ state: 'processed' }),
      item({ state: 'held' }),
      item({ state: 'failed' }),
      item({ state: 'queued' })
    ]
    expect(countStates(items)).toEqual({ total: 5, processed: 2, held: 1, failed: 1, queued: 1 })
  })
})

describe('stageBundle', () => {
  const source = createIngestSource(inboxSource(async () => ({ kind: 'error', problems: [] })))

  it('stages a mail bundle JSON into waiting items', () => {
    const batch = source.stageBundle(
      'october.json',
      JSON.stringify({
        emails: [
          { email_id: 'm1', from: 'a@carrier.example', subject: 'SI docs', attachments: ['si.txt', 'draft_bl.pdf'] },
          { id: 'm2', sender: 'b@shipper.example', subject: 'Invoice' }
        ]
      })
    )
    expect(batch.name).toBe('october.json')
    expect(batch.items).toHaveLength(2)
    expect(batch.items[0]).toMatchObject({
      id: 'm1',
      sender: 'a@carrier.example',
      state: 'queued',
      documents: 2,
      confidence: null
    })
    expect(batch.items[1]).toMatchObject({ id: 'm2', documents: 0 })
  })

  it('accepts a bare array of emails', () => {
    const batch = source.stageBundle('flat.json', JSON.stringify([{ email_id: 'x1' }]))
    expect(batch.items[0].id).toBe('x1')
  })

  it('rejects content that is not readable JSON', () => {
    expect(() => source.stageBundle('notes.json', 'not json {')).toThrow(BundleReadError)
    expect(() => source.stageBundle('notes.json', 'not json {')).toThrow(/not readable JSON/)
  })

  it('rejects JSON that does not look like a mail bundle', () => {
    expect(() => source.stageBundle('config.json', '{"a": 1}')).toThrow(/not look like a mail bundle/)
  })

  it('rejects an empty bundle', () => {
    expect(() => source.stageBundle('empty.json', '[]')).toThrow(/contains no emails/)
  })

  it('rejects entries with no email id', () => {
    expect(() => source.stageBundle('bad.json', JSON.stringify({ emails: [{ subject: 'x' }] }))).toThrow(
      /has no email id/
    )
  })
})
