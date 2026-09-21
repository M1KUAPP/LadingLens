import { describe, expect, it } from 'vitest'
import artifactRaw from './sample-submission.json?raw'
import fixtureRaw from './inbox-fixture.json?raw'
import {
  CASE_STATUSES,
  EXPECTED_EMAIL_COUNT,
  REVIEW_REASONS,
  expectedEmailIds,
  summarizeInbox,
  validateEvaluatorArtifact,
  validateInboxFixture
} from './inbox-integrity'
import type { EvaluatorRecord, InboxDataset } from './inbox-types'

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
    if (result.ok) {
      expect(result.rows).toHaveLength(EXPECTED_EMAIL_COUNT)
      expect(result.unmatchedCaseCount).toBe(125)
    }
  })

  it('rejects a fixture with a negative unmatched_case_count', () => {
    const result = validateInboxFixture({
      emails: buildEmails(expectedEmailIds()),
      reconciliation: [],
      unmatched_case_count: -1
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.problems.join(' ')).toContain('unmatched_case_count')
    }
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
      emails: buildEmails(expectedEmailIds().filter((id) => id !== 'email_300')),
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

  it('mirrors the shipped artifact outcome for every fixture email', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    const artifact = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    expect(fixture.ok).toBe(true)
    expect(artifact.ok).toBe(true)
    if (!fixture.ok || !artifact.ok) return
    for (const row of fixture.rows) {
      const record = artifact.artifact[row.email_id]
      expect(record).toBeDefined()
      expect(row.outcome).toEqual({
        category: record.category,
        status: record.status,
        review_reason: record.review_reason
      })
    }
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
      ],
      unmatchedCaseCount: 125
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
    expect(summary.reconciliationByOutcome.UNMATCHED_CASE).toBe(125)
  })

  it('counts UNMATCHED_CASE reconciliation entries when unmatchedCaseCount is absent', () => {
    const dataset: InboxDataset = {
      source: 'prepared-fixture',
      receivedCount: 1,
      rows: [],
      artifact: {},
      reconciliation: [
        {
          shipment_id: 'SYN-033',
          booking_reference: 'SYN-BK-033',
          lifecycle: 'DRAFT_BL_EXPECTED',
          outcome: 'UNMATCHED_CASE',
          linked_email_id: 'email_013'
        }
      ]
    }
    const summary = summarizeInbox(dataset)
    expect(summary.reconciliationByOutcome.UNMATCHED_CASE).toBe(1)
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
      reconciliation: []
    }
    const summary = summarizeInbox(dataset)
    expect(summary.received).toBe(520)
    expect(summary.accountedFor).toBe(1)
    expect(summary.lost).toBe(519)
  })
})

describe('prepared demonstration fixture integrity', () => {
  function loadSummary() {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return null
    return summarizeInbox({
      source: 'prepared-fixture',
      receivedCount: fixture.receivedCount,
      rows: fixture.rows,
      artifact: {},
      reconciliation: fixture.reconciliation,
      unmatchedCaseCount: fixture.unmatchedCaseCount
    })
  }

  function loadArtifact(): Record<string, EvaluatorRecord> {
    const artifact = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    expect(artifact.ok).toBe(true)
    return artifact.ok ? artifact.artifact : {}
  }

  it('exposes authentic non-zero category counts matching the submission artifact', () => {
    const summary = loadSummary()
    if (!summary) return
    const records = Object.values(loadArtifact())

    const expected: Record<string, number> = {}
    for (const record of records) {
      expected[record.category] = (expected[record.category] ?? 0) + 1
    }
    expect(expected.BL_COMPARISON).toBe(129)
    expect(expected.SI_REQUEST).toBe(216)

    for (const category of Object.keys(summary.byCategory)) {
      expect(summary.byCategory[category as keyof typeof summary.byCategory]).toBe(expected[category] ?? 0)
    }
    expect(summary.byCategory.SI_REQUEST).toBeGreaterThan(0)
    expect(summary.byCategory.INVOICE_QUERY).toBeGreaterThan(0)
    expect(summary.byCategory.SPAM).toBeGreaterThan(0)
  })

  it('reports comparison and review-reason counts matching the submission artifact', () => {
    const summary = loadSummary()
    if (!summary) return
    const records = Object.values(loadArtifact())
    const comparisons = records.filter((record) => record.category === 'BL_COMPARISON')

    expect(summary.comparisonRows).toBe(comparisons.length)
    for (const status of CASE_STATUSES) {
      expect(summary.comparisonByStatus[status]).toBe(comparisons.filter((record) => record.status === status).length)
    }
    expect(summary.comparisonByStatus.OK).toBe(66)
    expect(summary.comparisonByStatus.MISMATCH).toBe(46)
    expect(summary.comparisonByStatus.NEEDS_REVIEW).toBe(17)

    for (const reason of REVIEW_REASONS) {
      expect(summary.heldReasons[reason] ?? 0).toBe(records.filter((record) => record.review_reason === reason).length)
    }
  })

  it('reports the unmatched case count carried by the fixture', () => {
    const summary = loadSummary()
    if (!summary) return
    expect(summary.reconciliationByOutcome.UNMATCHED_CASE).toBe(125)
  })

  it('restricts non-OK outcomes strictly to BL_COMPARISON rows', () => {
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

  it('marks every held artifact record as a NEEDS_REVIEW BL_COMPARISON row', () => {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(fixture.ok).toBe(true)
    if (!fixture.ok) return

    const artifact = loadArtifact()
    const expectedReasons = Object.fromEntries(
      Object.entries(artifact)
        .filter(([, record]) => record.review_reason !== null)
        .map(([id, record]) => [id, record.review_reason as string])
    )
    expect(Object.keys(expectedReasons)).toHaveLength(17)

    const rowMap = new Map(fixture.rows.map((row) => [row.email_id, row]))
    for (const [id, reason] of Object.entries(expectedReasons)) {
      const row = rowMap.get(id)
      expect(row).toBeDefined()
      expect(row?.outcome.category).toBe('BL_COMPARISON')
      expect(row?.outcome.status).toBe('NEEDS_REVIEW')
      expect(row?.outcome.review_reason).toBe(reason)
    }
  })
})
