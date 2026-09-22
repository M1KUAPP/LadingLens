import { describe, expect, it } from 'vitest'
import { createPreparedEmailDetailService } from '../email-detail/seam'
import { EXPECTED_SHIPMENTS_CSV } from '../reconciliation/fixtures/prepared'
import { createPreparedReconciliationService } from '../reconciliation/seam'
import { createPreparedReviewQueueService } from './seam'
import type { ReviewQueueItem } from './types'

const MISSING = 'rec_shp_5rfr_37631'
const DOCUMENT_MISSING = 'rec_shp_5akr_00230'

function exceptions(items: ReviewQueueItem[]) {
  return items.filter((i) => i.kind === 'reconciliation_exception')
}

function cases(items: ReviewQueueItem[]) {
  return items.filter((i) => i.kind === 'case')
}

/** A queue whose reconciliation has run once. */
async function queueAfterRun(options?: Parameters<typeof createPreparedReviewQueueService>[0]) {
  const reconciliation = createPreparedReconciliationService()
  const results = await reconciliation.runReconciliation()
  const service = createPreparedReviewQueueService({ ...options, reconciliationService: reconciliation })
  return { reconciliation, results, service }
}

describe('prepared review queue service', () => {
  it("lists the seed's held cases, five for each review reason", async () => {
    const service = createPreparedReviewQueueService({ reconciliationService: createPreparedReconciliationService() })
    const items = cases(await service.getQueueItems())
    expect(items.map((i) => i.email_id)).toEqual(Array.from({ length: 20 }, (_, index) => `email_${501 + index}`))
    const reasons = new Map<string, number>()
    for (const item of items) {
      expect(item.status).toBe('NEEDS_REVIEW')
      expect(item.case_id).toBe(`seed-case:${item.email_id}`)
      expect(item.target).toEqual({ target_type: 'CASE', case_id: item.case_id })
      expect(item.evidence_summary.length).toBeGreaterThan(0)
      reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1)
    }
    expect(Object.fromEntries(reasons)).toEqual({
      wrong_doc_type: 5,
      missing_attachment: 5,
      unreadable: 5,
      missing_value: 5
    })
    expect(items.find((i) => i.email_id === 'email_512')?.evidence_summary).toMatch(/image-only scan/)
  })

  it('queues no exceptions before reconciliation has run', async () => {
    const service = createPreparedReviewQueueService({ reconciliationService: createPreparedReconciliationService() })
    expect(exceptions(await service.getQueueItems())).toEqual([])
  })

  it("queues the run's exceptions for every non-cleared outcome", async () => {
    const { results, service } = await queueAfterRun()
    const items = exceptions(await service.getQueueItems())
    expect(items).toHaveLength(17)
    expect(new Set(items.map((i) => i.outcome))).toEqual(
      new Set(['MISSING_CASE', 'DOCUMENT_MISSING', 'UNMATCHED_CASE', 'DUPLICATE_OR_AMBIGUOUS', 'SOURCE_STALE'])
    )
    const runIds = new Set(results.map((r) => r.reconciliation_id))
    for (const item of items) {
      expect(runIds.has(item.reconciliation_id)).toBe(true)
      expect(item.target).toEqual({
        target_type: 'RECONCILIATION_EXCEPTION',
        reconciliation_id: item.reconciliation_id
      })
      expect(item.assignment_state).toBe('ASSIGNED')
      expect(item.history).toEqual([
        expect.objectContaining({ actor: 'System', action: 'OPENED', note: 'Reconciliation run 001' })
      ])
    }
    const missing = items.find((i) => i.reconciliation_id === MISSING)
    expect(missing?.shipment_id).toBe('SHP-5RFR-37631')
    expect(missing?.case_ids).toEqual([])
    const ambiguous = items.find((i) => i.outcome === 'DUPLICATE_OR_AMBIGUOUS')
    expect(ambiguous?.shipment_id).toBeUndefined()
    expect(ambiguous?.candidate_shipment_ids).toEqual(['SHP-I978820812-1', 'SHP-I978820812-2'])
    expect(ambiguous?.case_ids).toEqual(['seed-case:email_009'])
  })

  it("replaces the last run's exceptions with a new run's, and drops them with a new ledger", async () => {
    const { reconciliation, service } = await queueAfterRun()
    await service.submitReconciliationAction({
      reconciliation_id: MISSING,
      actor_id: 'operator_42',
      action: 'ACKNOWLEDGE',
      rationale: 'Seen'
    })
    await reconciliation.runReconciliation()
    const rerun = exceptions(await service.getQueueItems()).find((i) => i.reconciliation_id === MISSING)!
    expect(rerun.assignment_state).toBe('ASSIGNED')
    expect(rerun.history.at(-1)?.note).toBe('Reconciliation run 002')

    await reconciliation.importShipmentsCsv(EXPECTED_SHIPMENTS_CSV)
    expect(exceptions(await service.getQueueItems())).toEqual([])
  })

  it('never reuses a history entry id on the same item', async () => {
    const { service } = await queueAfterRun()
    for (const [action, rationale] of [
      ['ACKNOWLEDGE', 'Seen'],
      ['ESCALATE', 'Needs a senior']
    ] as const) {
      await service.submitReconciliationAction({
        reconciliation_id: MISSING,
        actor_id: 'operator_42',
        action,
        rationale
      })
    }
    const item = exceptions(await service.getQueueItems()).find((i) => i.reconciliation_id === MISSING)!
    const ids = item.history.map((entry) => entry.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('moves an exception through acknowledge, escalate, and resolve', async () => {
    const { service } = await queueAfterRun()
    const input = {
      reconciliation_id: DOCUMENT_MISSING,
      actor_id: 'operator_7',
      rationale: 'Working the document chase'
    }
    const acked = await service.submitReconciliationAction({ ...input, action: 'ACKNOWLEDGE' })
    expect(acked.assignment_state).toBe('ACKNOWLEDGED')
    expect(acked.history.at(-1)).toMatchObject({ actor: 'operator_7', action: 'ACKNOWLEDGE', note: input.rationale })
    const escalated = await service.submitReconciliationAction({ ...input, action: 'ESCALATE' })
    expect(escalated.assignment_state).toBe('ESCALATED')
    const resolved = await service.submitReconciliationAction({ ...input, action: 'RESOLVE' })
    expect(resolved.assignment_state).toBe('RESOLVED')
    await expect(service.submitReconciliationAction({ ...input, action: 'ACKNOWLEDGE' })).rejects.toThrow(/resolved/i)
  })

  it('rejects actions without actor or rationale, and targets that are not exceptions', async () => {
    const { results, service } = await queueAfterRun()
    const valid = {
      reconciliation_id: MISSING,
      actor_id: 'operator_42',
      action: 'ACKNOWLEDGE' as const,
      rationale: 'Seen'
    }
    await expect(service.submitReconciliationAction({ ...valid, actor_id: ' ' })).rejects.toThrow(/actor/i)
    await expect(service.submitReconciliationAction({ ...valid, rationale: '' })).rejects.toThrow(/rationale/i)
    await expect(
      service.submitReconciliationAction({ ...valid, reconciliation_id: 'rec_does_not_exist' })
    ).rejects.toThrow(/rec_does_not_exist/)
    // A cleared shipment is not an exception target.
    const cleared = results.find((r) => r.outcome === 'CASE_PRESENT')!
    await expect(
      service.submitReconciliationAction({ ...valid, reconciliation_id: cleared.reconciliation_id })
    ).rejects.toThrow()
  })

  it('never invents case or shipment identifiers for exception actions', async () => {
    const { service } = await queueAfterRun()
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
    expect(unmatchedAfter.shipment_id).toBeUndefined()
    expect(ambiguousAfter.shipment_id).toBeUndefined()
    expect(unmatchedAfter.case_ids).toEqual(unmatched.case_ids)
    expect(ambiguousAfter.case_ids).toEqual(ambiguous.case_ids)
    expect(cases(after).map((i) => i.case_id)).toEqual(cases(before).map((i) => i.case_id))
  })

  it('delegates case actions to the case ledger and removes the queue item', async () => {
    const emailDetail = createPreparedEmailDetailService()
    const { service } = await queueAfterRun({ emailDetailService: emailDetail })
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
    expect(cases(items)).toHaveLength(19)
  })

  it('rejects case actions for cases not in the queue', async () => {
    const { service } = await queueAfterRun()
    await expect(
      service.submitCaseReviewAction({
        case_id: 'seed-case:email_001',
        action: 'APPROVE',
        rationale: 'Not a queued case',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow(/seed-case:email_001/)
  })

  it("reset restores the held cases and reopens the run's exceptions", async () => {
    const { service } = await queueAfterRun()
    await service.submitReconciliationAction({
      reconciliation_id: MISSING,
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
    const missing = exceptions(items).find((i) => i.reconciliation_id === MISSING)!
    expect(missing.assignment_state).toBe('ASSIGNED')
    expect(missing.history).toHaveLength(1)
  })

  it('replays the same case action after reset because the case ledger resets too', async () => {
    const { service } = await queueAfterRun()
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
    const { service } = await queueAfterRun()
    const items = await service.getQueueItems()
    items[0]!.item_id = 'rq_hacked'
    items.pop()
    const again = await service.getQueueItems()
    expect(again[0]?.item_id).not.toBe('rq_hacked')
    expect(again).toHaveLength(37)
  })
})
