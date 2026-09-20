/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import artifactRaw from './sample-submission.json?raw'
import fixtureRaw from './inbox-fixture.json?raw'
import {
  EXPECTED_EMAIL_COUNT,
  expectedEmailIds,
  summarizeInbox,
  validateEvaluatorArtifact,
  validateInboxFixture
} from './inbox-integrity'
import type { InboxDataset } from './inbox-types'

function buildEmails(ids: string[]) {
  return ids.map((id) => ({
    email_id: id,
    sender: 'docs@example.com',
    subject: `Subject ${id}`,
    attachments: [`attachments/${id}_SI.txt`],
    outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
  }))
}

function buildArtifact(ids: string[]): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        category: 'GENERAL',
        status: 'OK',
        review_reason: null,
        has_defect: false,
        defect_fields: []
      }
    ])
  )
}

describe('validateInboxFixture', () => {
  it('accepts the checked-in prepared fixture', () => {
    const result = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rows).toHaveLength(EXPECTED_EMAIL_COUNT)
  })

  it('rejects a fixture that is short of the expected range', () => {
    const result = validateInboxFixture({
      emails: buildEmails(expectedEmailIds().slice(0, 519)),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_520')
  })

  it('rejects a fixture with a gap in the ID range', () => {
    const result = validateInboxFixture({
      emails: buildEmails(
        expectedEmailIds().filter((id) => id !== 'email_300')
      ),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_300')
  })

  it('rejects a fixture with a duplicate ID', () => {
    const result = validateInboxFixture({
      emails: buildEmails([...expectedEmailIds(), 'email_001']),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_001')
  })

  it('rejects a row with an invalid outcome value', () => {
    const emails = buildEmails(expectedEmailIds())
    emails[7] = {
      ...emails[7],
      outcome: {
        category: 'GENERAL',
        status: 'UNKNOWN',
        review_reason: null
      }
    }
    const result = validateInboxFixture({ emails, reconciliation: [] })
    expect(result.ok).toBe(false)
  })
})

describe('validateEvaluatorArtifact', () => {
  it('accepts the checked-in artifact', () => {
    const result = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.artifact)).toHaveLength(EXPECTED_EMAIL_COUNT)
    }
  })

  it('matches the bundled sample submission byte for byte', () => {
    const bundled = readFileSync(
      resolve(
        process.cwd(),
        '../../data/sdoc-hackathon-bundle/sample_submission.json'
      ),
      'utf8'
    )
    expect(artifactRaw).toBe(bundled)
  })

  it('rejects a record carrying a sixth key', () => {
    const artifact = buildArtifact(expectedEmailIds())
    artifact['email_001'] = { ...artifact['email_001'], confidence: 0.9 }
    expect(validateEvaluatorArtifact(artifact).ok).toBe(false)
  })

  it('rejects has_defect true with empty defect_fields', () => {
    const artifact = buildArtifact(expectedEmailIds())
    artifact['email_010'] = { ...artifact['email_010'], has_defect: true }
    expect(validateEvaluatorArtifact(artifact).ok).toBe(false)
  })

  it('rejects an artifact missing an expected ID', () => {
    const artifact = buildArtifact(expectedEmailIds())
    delete artifact['email_520']
    const result = validateEvaluatorArtifact(artifact)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_520')
  })
})

describe('summarizeInbox', () => {
  it('derives coverage and outcome counts from the dataset', () => {
    const dataset: InboxDataset = {
      source: 'prepared-fixture',
      receivedCount: 3,
      rows: [
        {
          email_id: 'email_001',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: {
            category: 'BL_COMPARISON',
            status: 'OK',
            review_reason: null
          }
        },
        {
          email_id: 'email_002',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
        },
        {
          email_id: 'email_003',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: {
            category: 'BL_COMPARISON',
            status: 'NEEDS_REVIEW',
            review_reason: 'missing_attachment'
          }
        }
      ],
      artifact: {},
      artifactUrl: '/x.json',
      reconciliation: [
        {
          shipment_id: 'SYN-001',
          booking_reference: 'SYN-BK-001',
          lifecycle: 'BL_CHECK_REQUIRED',
          outcome: 'CASE_PRESENT',
          linked_email_id: 'email_001'
        },
        {
          shipment_id: 'SYN-042',
          booking_reference: 'SYN-BK-042',
          lifecycle: 'DRAFT_BL_EXPECTED',
          outcome: 'MISSING_CASE',
          linked_email_id: null
        }
      ]
    }
    const summary = summarizeInbox(dataset)
    expect(summary.received).toBe(3)
    expect(summary.accountedFor).toBe(3)
    expect(summary.lost).toBe(0)
    expect(summary.byCategory.BL_COMPARISON).toBe(2)
    expect(summary.comparisonRows).toBe(2)
    expect(summary.comparisonByStatus.NEEDS_REVIEW).toBe(1)
    expect(summary.heldReasons.missing_attachment).toBe(1)
    expect(summary.reconciliationByOutcome.MISSING_CASE).toBe(1)
  })

  it('proves a partial dataset reports loss from received minus accounted', () => {
    const dataset: InboxDataset = {
      source: 'prepared-fixture',
      receivedCount: 520,
      rows: [
        {
          email_id: 'email_001',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: {
            category: 'BL_COMPARISON',
            status: 'OK',
            review_reason: null
          }
        }
      ],
      artifact: {},
      artifactUrl: '/x.json',
      reconciliation: []
    }
    const summary = summarizeInbox(dataset)
    expect(summary.received).toBe(520)
    expect(summary.accountedFor).toBe(1)
    expect(summary.lost).toBe(519)
  })
})

describe('prepared demonstration fixture integrity', () => {
  it('exposes authentic non-zero category counts matching synthetic template recovery', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return

    const summary = summarizeInbox({
      source: 'prepared-fixture',
      receivedCount: fixture.receivedCount,
      rows: fixture.rows,
      artifact: {},
      artifactUrl: '/sample-submission.json',
      reconciliation: fixture.reconciliation
    })

    expect(summary.byCategory.BL_COMPARISON).toBe(129)
    expect(summary.byCategory.SI_REQUEST).toBe(216)
    expect(summary.byCategory.INVOICE_QUERY).toBe(75)
    expect(summary.byCategory.GENERAL).toBe(60)
    expect(summary.byCategory.SPAM).toBe(40)

    expect(summary.byCategory.SI_REQUEST).toBeGreaterThan(0)
    expect(summary.byCategory.INVOICE_QUERY).toBeGreaterThan(0)
    expect(summary.byCategory.SPAM).toBeGreaterThan(0)
  })

  it('preserves complete representation of all 20 benchmark review cases', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return

    const summary = summarizeInbox({
      source: 'prepared-fixture',
      receivedCount: fixture.receivedCount,
      rows: fixture.rows,
      artifact: {},
      artifactUrl: '/sample-submission.json',
      reconciliation: fixture.reconciliation
    })

    expect(summary.comparisonByStatus.NEEDS_REVIEW).toBe(20)
    expect(summary.comparisonByStatus.OK).toBe(109)
    expect(summary.heldReasons.wrong_doc_type).toBe(5)
    expect(summary.heldReasons.missing_attachment).toBe(5)
    expect(summary.heldReasons.unreadable).toBe(5)
    expect(summary.heldReasons.missing_value).toBe(5)
  })

  it('restricts NEEDS_REVIEW outcomes strictly to BL_COMPARISON rows', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return

    for (const row of fixture.rows) {
      if (row.outcome.category !== 'BL_COMPARISON') {
        expect(row.outcome.status).toBe('OK')
        expect(row.outcome.review_reason).toBeNull()
      }
    }
  })

  it('verifies all 20 held benchmark IDs email_501 through email_520 have expected review reasons', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return

    const rowMap = new Map(fixture.rows.map((row) => [row.email_id, row]))

    const expectedReasons: Record<string, string> = {}
    for (let i = 501; i <= 505; i += 1) expectedReasons[`email_${i}`] = 'wrong_doc_type'
    for (let i = 506; i <= 510; i += 1) expectedReasons[`email_${i}`] = 'missing_attachment'
    for (let i = 511; i <= 515; i += 1) expectedReasons[`email_${i}`] = 'unreadable'
    for (let i = 516; i <= 520; i += 1) expectedReasons[`email_${i}`] = 'missing_value'

    expect(Object.keys(expectedReasons)).toHaveLength(20)

    for (const [id, reason] of Object.entries(expectedReasons)) {
      const row = rowMap.get(id)
      expect(row).toBeDefined()
      expect(row?.outcome.category).toBe('BL_COMPARISON')
      expect(row?.outcome.status).toBe('NEEDS_REVIEW')
      expect(row?.outcome.review_reason).toBe(reason)
    }
  })
})
