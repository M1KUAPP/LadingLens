import { describe, expect, it } from 'vitest'
import { PREPARED_FIXTURES } from './fixtures'
import { createPreparedEmailDetailService } from './seam'

describe('PreparedEmailDetailService', () => {
  it('loads cleared prepared record email_001 with seven field verdicts and no held review', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_001')
    expect(record).not.toBeNull()
    expect(record?.is_prepared).toBe(true)
    expect(record?.email_id).toBe('email_001')
    expect(record?.status).toBe('OK')
    expect(record?.held_review).toBeUndefined()
    expect(record?.field_verdicts).toHaveLength(7)
    expect(record?.attachments).toHaveLength(2)
  })

  it('loads email_004 as a real mismatch record whose mismatching verdicts carry provenance', async () => {
    expect(PREPARED_FIXTURES['email_004']?.status).toBe('MISMATCH')
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_004')
    expect(record).not.toBeNull()
    expect(record?.status).toBe('MISMATCH')
    expect(record?.held_review).toBeUndefined()
    const mismatched =
      record?.field_verdicts.filter((v) => v.verdict === 'MISMATCH') ?? []
    expect(mismatched.map((v) => v.field)).toEqual([
      'consignee',
      'notify_party'
    ])
    for (const verdict of mismatched) {
      expect(verdict.si.raw_value).not.toBe(verdict.draft_bl.raw_value)
      expect(verdict.si.provenance.attachment_id).toBe('email_004-1')
      expect(verdict.draft_bl.provenance.attachment_id).toBe('email_004-2')
    }
  })

  it('loads structural refusal email_507 with zero field verdicts and only the SI attachment', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_507')
    expect(record).not.toBeNull()
    expect(record?.status).toBe('NEEDS_REVIEW')
    expect(record?.review_reason).toBe('missing_attachment')
    expect(record?.field_verdicts).toHaveLength(0)
    expect(record?.attachments).toHaveLength(1)
    expect(
      record?.attachments.every(
        (a) => a.document_type === 'SI' && a.parse_state === 'PARSED'
      )
    ).toBe(true)
    expect(record?.retained_evidence).toBeUndefined()
    expect(record?.held_review?.case_id).toBe('seed-case:email_507')
    expect(record?.held_review?.assigned_owner).toBe('docs-demo')
    expect(record?.held_review?.history).toEqual([])
  })

  it('loads semantic ambiguity case with probability between 0.30 and 0.85', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_ambiguous')
    expect(record).not.toBeNull()
    expect(record?.status).toBe('NEEDS_REVIEW')
    const prob = record?.held_review?.probability
    expect(prob).toBeDefined()
    expect(prob!).toBeGreaterThan(0.3)
    expect(prob!).toBeLessThan(0.85)
    expect(record?.held_review?.assigned_owner).toBeTruthy()
  })

  it('throws on unknown case_id instead of mutating the first fixture', async () => {
    const service = createPreparedEmailDetailService()
    await expect(
      service.submitReviewAction({
        case_id: 'case_not_in_fixtures',
        action: 'APPROVE',
        rationale: 'Attempted sign-off on missing case',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow(/case_not_in_fixtures/i)

    const untouched = await service.getEmailDetail('email_507')
    expect(untouched?.held_review?.disposition).toBe('IN_REVIEW')
    expect(untouched?.held_review?.history).toHaveLength(0)
    expect(untouched?.status).toBe('NEEDS_REVIEW')
  })

  it('appends review history and updates disposition on review action without claiming live mutation', async () => {
    const service = createPreparedEmailDetailService()
    const updated = await service.submitReviewAction({
      case_id: 'seed-case:email_507',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(updated.held_review?.history.length).toBe(1)
    const latest = updated.held_review?.history.at(-1)
    expect(latest?.action).toBe('APPROVE')
    expect(latest?.note).toContain('Verified with shipper')
    expect(updated.is_prepared).toBe(true)
  })

  it('rejects repeat actions once a case disposition is settled', async () => {
    const service = createPreparedEmailDetailService()
    const first = await service.submitReviewAction({
      case_id: 'seed-case:email_507',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(first.held_review?.disposition).toBe('APPROVED')

    await expect(
      service.submitReviewAction({
        case_id: 'seed-case:email_507',
        action: 'APPROVE',
        rationale: 'Duplicate approval attempt',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow()

    const record = await service.getEmailDetail('email_507')
    expect(record?.held_review?.history).toHaveLength(1)
    expect(record?.held_review?.disposition).toBe('APPROVED')
  })
})
