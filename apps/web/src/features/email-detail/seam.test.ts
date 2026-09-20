import { describe, expect, it } from 'vitest'
import { createPreparedEmailDetailService } from './seam'

describe('PreparedEmailDetailService', () => {
  it('loads normal prepared case email_001 with seven field verdicts', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_001')
    expect(record).not.toBeNull()
    expect(record?.is_prepared).toBe(true)
    expect(record?.email_id).toBe('email_001')
    expect(record?.field_verdicts).toHaveLength(7)
    expect(record?.attachments).toHaveLength(2)
  })

  it('loads structural refusal email_507 with zero field verdicts and missing draft BL preflight', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_507')
    expect(record).not.toBeNull()
    expect(record?.review_reason).toBe('missing_attachment')
    expect(record?.field_verdicts).toHaveLength(0)
    expect(
      record?.attachments.some(
        (a) => a.document_type === 'DRAFT_BL' && a.parse_state === 'MISSING'
      )
    ).toBe(true)
    expect(record?.retained_evidence).toBeDefined()
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

    const untouched = await service.getEmailDetail('email_001')
    expect(untouched?.held_review?.disposition).toBe('IN_REVIEW')
    expect(untouched?.held_review?.history).toHaveLength(2)
    expect(untouched?.status).toBe('MISMATCH')
  })

  it('appends review history and updates disposition on review action without claiming live mutation', async () => {
    const service = createPreparedEmailDetailService()
    const updated = await service.submitReviewAction({
      case_id: 'case_email_001',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(updated.held_review?.history.length).toBeGreaterThan(1)
    const latest = updated.held_review?.history.at(-1)
    expect(latest?.action).toBe('APPROVE')
    expect(latest?.note).toContain('Verified with shipper')
    expect(updated.is_prepared).toBe(true)
  })

  it('rejects repeat actions once a case disposition is settled', async () => {
    const service = createPreparedEmailDetailService()
    const first = await service.submitReviewAction({
      case_id: 'case_email_001',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(first.held_review?.disposition).toBe('APPROVED')

    await expect(
      service.submitReviewAction({
        case_id: 'case_email_001',
        action: 'APPROVE',
        rationale: 'Duplicate approval attempt',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow()

    const record = await service.getEmailDetail('email_001')
    expect(record?.held_review?.history).toHaveLength(3)
    expect(record?.held_review?.disposition).toBe('APPROVED')
  })
})
