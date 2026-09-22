import { describe, expect, it } from 'vitest'
import { PREPARED_FIXTURES } from '../email-detail/fixtures'
import { createPreparedEmailDetailService } from '../email-detail/seam'
import { PREPARED_RECONCILIATION_RESULTS } from '../reconciliation/fixtures/prepared'
import { createPreparedReviewQueueService } from './seam'
import type { ReviewQueueItem } from './types'

function exceptions(items: ReviewQueueItem[]) {
  return items.filter((i) => i.kind === 'reconciliation_exception')
}

function cases(items: ReviewQueueItem[]) {
  return items.filter((i) => i.kind === 'case')
}

describe('prepared review queue service', () => {
  it('lists held cases that deep-link only to prepared email detail records', async () => {
    const service = createPreparedReviewQueueService()
    const items = cases(await service.getQueueItems())
    const emailIds = items.map((i) => i.email_id).sort()
    expect(emailIds).toEqual(['email_507', 'email_511', 'email_516', 'email_ambiguous'])
    for (const item of items) {
      expect(PREPARED_FIXTURES[item.email_id]).toBeDefined()
      expect(item.status).toBe('NEEDS_REVIEW')
      expect(item.assigned_owner.length).toBeGreaterThan(0)
      expect(item.target).toEqual({
        target_type: 'CASE',
        case_id: item.case_id
      })
    }
  })

  it('lists reconciliation exceptions for every non-cleared outcome', async () => {
    const service = createPreparedReviewQueueService()
    const items = exceptions(await service.getQueueItems())
    expect(items).toHaveLength(17)
    const outcomes = new Set(items.map((i) => i.outcome))
    for (const outcome of [
      'MISSING_CASE',
      'DOCUMENT_MISSING',
      'UNMATCHED_CASE',
      'DUPLICATE_OR_AMBIGUOUS',
      'SOURCE_STALE'
    ]) {
      expect(outcomes.has(outcome as never)).toBe(true)
    }
    const knownIds = new Set(PREPARED_RECONCILIATION_RESULTS.map((r) => r.reconciliation_id))
    for (const item of items) {
      expect(knownIds.has(item.reconciliation_id)).toBe(true)
      expect(item.target).toEqual({
        target_type: 'RECONCILIATION_EXCEPTION',
        reconciliation_id: item.reconciliation_id
      })
      expect(item.assigned_owner.length).toBeGreaterThan(0)
      expect(item.assignment_state).toBe('ASSIGNED')
    }
    const ownerOf = (id: string) => items.find((i) => i.reconciliation_id === id)?.assigned_owner
    expect(ownerOf('rec_shp_5akr_00230')).toBe('Hafiz Tan')
    expect(ownerOf('rec_shp_5rfr_37631')).toBe('Aisyah Razak')
    expect(ownerOf('rec_shp_5rfr_36541')).toBe('Elena Rostova')
    expect(ownerOf('rec_ambiguous_shp_i978820812_1_shp_i978820812_2')).toBe('Marcus Vance')
    const unmatched = items.filter((i) => i.outcome === 'UNMATCHED_CASE')
    expect(unmatched).toHaveLength(2)
    expect(unmatched.every((i) => i.assigned_owner === 'Aisyah Razak')).toBe(true)
    const syn042 = items.find((i) => i.shipment_id === 'SHP-5RFR-37631')
    expect(syn042?.outcome).toBe('MISSING_CASE')
    expect(syn042?.case_ids).toEqual([])
  })

  it('assigns an exception with a new owner and appends exactly one history entry', async () => {
    const service = createPreparedReviewQueueService()
    const before = exceptions(await service.getQueueItems()).find((i) => i.reconciliation_id === 'rec_shp_5rfr_37631')!
    const updated = await service.submitReconciliationAction({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'operator_42',
      action: 'ASSIGN',
      rationale: 'Rerouting to the duty officer',
      assigned_owner_id: 'Elisa Tukiman'
    })
    expect(updated.kind).toBe('reconciliation_exception')
    if (updated.kind !== 'reconciliation_exception') return
    expect(updated.assignment_state).toBe('ASSIGNED')
    expect(updated.assigned_owner).toBe('Elisa Tukiman')
    expect(updated.history.length).toBe(before.history.length + 1)
    expect(updated.history.slice(0, before.history.length)).toEqual(before.history)
    expect(updated.history.at(-1)?.action).toBe('ASSIGN')
    expect(updated.history.at(-1)?.actor).toBe('operator_42')
    expect(updated.history.at(-1)?.note).toBe('Rerouting to the duty officer')
  })

  it('never reuses a history entry id on the same item', async () => {
    const service = createPreparedReviewQueueService()
    await service.submitReconciliationAction({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'operator_42',
      action: 'ACKNOWLEDGE',
      rationale: 'Seen'
    })
    await service.submitReconciliationAction({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'operator_42',
      action: 'ESCALATE',
      rationale: 'Needs a senior'
    })
    const item = exceptions(await service.getQueueItems()).find((i) => i.reconciliation_id === 'rec_shp_5rfr_37631')!
    const ids = item.history.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('requires an owner for ASSIGN', async () => {
    const service = createPreparedReviewQueueService()
    await expect(
      service.submitReconciliationAction({
        reconciliation_id: 'rec_shp_5rfr_37631',
        actor_id: 'operator_42',
        action: 'ASSIGN',
        rationale: 'Missing owner on purpose'
      })
    ).rejects.toThrow(/owner/i)
    const item = exceptions(await service.getQueueItems()).find((i) => i.reconciliation_id === 'rec_shp_5rfr_37631')!
    expect(item.assigned_owner).toBe('Aisyah Razak')
  })

  it('moves an exception through acknowledge, escalate, and resolve', async () => {
    const service = createPreparedReviewQueueService()
    const input = {
      reconciliation_id: 'rec_shp_5akr_00230',
      actor_id: 'operator_7',
      rationale: 'Working the document chase'
    }
    const acked = await service.submitReconciliationAction({
      ...input,
      action: 'ACKNOWLEDGE'
    })
    expect(acked.kind === 'reconciliation_exception' && acked.assignment_state).toBe('ACKNOWLEDGED')
    const escalated = await service.submitReconciliationAction({
      ...input,
      action: 'ESCALATE'
    })
    expect(escalated.kind === 'reconciliation_exception' && escalated.assignment_state).toBe('ESCALATED')
    const resolved = await service.submitReconciliationAction({
      ...input,
      action: 'RESOLVE'
    })
    expect(resolved.kind === 'reconciliation_exception' && resolved.assignment_state).toBe('RESOLVED')
    await expect(service.submitReconciliationAction({ ...input, action: 'ACKNOWLEDGE' })).rejects.toThrow(/resolved/i)
  })

  it('rejects actions without actor or rationale and unknown targets', async () => {
    const service = createPreparedReviewQueueService()
    const valid = {
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'operator_42',
      action: 'ACKNOWLEDGE' as const,
      rationale: 'Seen'
    }
    await expect(service.submitReconciliationAction({ ...valid, actor_id: ' ' })).rejects.toThrow(/actor/i)
    await expect(service.submitReconciliationAction({ ...valid, rationale: '' })).rejects.toThrow(/rationale/i)
    await expect(
      service.submitReconciliationAction({
        ...valid,
        reconciliation_id: 'rec_does_not_exist'
      })
    ).rejects.toThrow(/rec_does_not_exist/)
    // A cleared shipment is not an exception target.
    const cleared = PREPARED_RECONCILIATION_RESULTS.find((r) => r.outcome === 'CASE_PRESENT')!
    await expect(
      service.submitReconciliationAction({
        ...valid,
        reconciliation_id: cleared.reconciliation_id
      })
    ).rejects.toThrow()
  })

  it('never invents case or shipment identifiers for exception actions', async () => {
    const service = createPreparedReviewQueueService()
    const before = await service.getQueueItems()
    const unmatched = exceptions(before).find((i) => i.outcome === 'UNMATCHED_CASE')!
    const ambiguous = exceptions(before).find((i) => i.outcome === 'DUPLICATE_OR_AMBIGUOUS')!
    await service.submitReconciliationAction({
      reconciliation_id: unmatched.reconciliation_id,
      actor_id: 'operator_9',
      action: 'ESCALATE',
      rationale: 'Cannot locate any expected shipment'
    })
    await service.submitReconciliationAction({
      reconciliation_id: ambiguous.reconciliation_id,
      actor_id: 'operator_9',
      action: 'ACKNOWLEDGE',
      rationale: 'Reviewing candidate shipments'
    })
    const after = await service.getQueueItems()
    expect(after.length).toBe(before.length)
    const unmatchedAfter = exceptions(after).find((i) => i.reconciliation_id === unmatched.reconciliation_id)!
    const ambiguousAfter = exceptions(after).find((i) => i.reconciliation_id === ambiguous.reconciliation_id)!
    expect('shipment_id' in unmatchedAfter && unmatchedAfter.shipment_id).toBeFalsy()
    expect('shipment_id' in ambiguousAfter && ambiguousAfter.shipment_id).toBeFalsy()
    expect(unmatchedAfter.case_ids).toEqual(unmatched.case_ids)
    expect(ambiguousAfter.case_ids).toEqual(ambiguous.case_ids)
    expect(cases(after).map((i) => i.case_id)).toEqual(cases(before).map((i) => i.case_id))
  })

  it('delegates case actions to the case ledger and removes the queue item', async () => {
    const emailDetail = createPreparedEmailDetailService()
    const service = createPreparedReviewQueueService({ emailDetailService: emailDetail })
    const record = await service.submitCaseReviewAction({
      case_id: 'seed-case:email_507',
      action: 'REJECT',
      rationale: 'Duplicate submission confirmed',
      actor_id: 'operator_42'
    })
    expect(record.held_review?.disposition).toBe('REJECTED')
    expect(record.held_review?.history.at(-1)?.action).toBe('REJECT')
    const items = await service.getQueueItems()
    expect(cases(items).map((i) => i.case_id)).not.toContain('seed-case:email_507')
    expect(cases(items)).toHaveLength(3)
  })

  it('rejects case actions for cases not in the queue', async () => {
    const service = createPreparedReviewQueueService()
    await expect(
      service.submitCaseReviewAction({
        case_id: 'case_email_001',
        action: 'APPROVE',
        rationale: 'Not a queued case',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow(/case_email_001/)
  })

  it('reset restores the baseline after case and exception actions', async () => {
    const service = createPreparedReviewQueueService()
    await service.submitReconciliationAction({
      reconciliation_id: 'rec_shp_5rfr_37631',
      actor_id: 'operator_42',
      action: 'RESOLVE',
      rationale: 'Case received and linked'
    })
    await service.submitCaseReviewAction({
      case_id: 'seed-case:email_511',
      action: 'APPROVE',
      rationale: 'Replacement document verified',
      actor_id: 'operator_42'
    })
    await service.reset()
    const items = await service.getQueueItems()
    expect(cases(items).map((i) => i.case_id)).toContain('seed-case:email_511')
    const syn042 = exceptions(items).find((i) => i.reconciliation_id === 'rec_shp_5rfr_37631')!
    expect(syn042.assignment_state).toBe('ASSIGNED')
    expect(syn042.history).toHaveLength(1)
  })

  it('replays the same case action after reset because the case ledger resets too', async () => {
    const service = createPreparedReviewQueueService()
    const first = await service.submitCaseReviewAction({
      case_id: 'seed-case:email_507',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(first.held_review?.disposition).toBe('APPROVED')

    await service.reset()

    const replayed = await service.submitCaseReviewAction({
      case_id: 'seed-case:email_507',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(replayed.held_review?.disposition).toBe('APPROVED')
    expect(replayed.held_review?.history).toHaveLength(first.held_review!.history.length)
  })

  it('returns clones so callers cannot mutate the store', async () => {
    const service = createPreparedReviewQueueService()
    const items = await service.getQueueItems()
    items[0]!.item_id = 'rq_hacked'
    items.pop()
    const again = await service.getQueueItems()
    expect(again[0]?.item_id).not.toBe('rq_hacked')
  })
})
