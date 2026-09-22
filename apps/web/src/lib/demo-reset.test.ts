import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY } from './api'
import { resetDemo } from './demo-reset'
import { defaultReviewQueueService, EXCEPTION_ACTIONS_STORAGE_KEY } from '../features/review-queue/seam'
import { defaultReconciliationService, RECONCILIATION_STORAGE_KEY } from '../features/reconciliation/seam'
import { defaultEmailDetailService } from '../features/email-detail/seam'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('resetDemo', () => {
  it('resets the server first, then clears demo browser state', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    sessionStorage.setItem('ladinglens-guest-session', '{"id":"guest-1","issuedAt":"x"}')
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-1')
    localStorage.setItem('ladinglens-theme', 'dark')
    await defaultReconciliationService.runReconciliation()
    expect(sessionStorage.getItem(RECONCILIATION_STORAGE_KEY)).not.toBeNull()
    sessionStorage.setItem(EXCEPTION_ACTIONS_STORAGE_KEY, '{"run":"run_prepared_001@x","actions":[]}')
    const spies = [
      vi.spyOn(defaultReviewQueueService, 'reset'),
      vi.spyOn(defaultReconciliationService, 'reset'),
      vi.spyOn(defaultEmailDetailService, 'reset')
    ]
    const fetchMock = vi.fn(async () =>
      json(200, { generation: 2, seed_version: 'seed-v1', reset_at: '2026-09-21T08:00:00Z' })
    )
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await resetDemo()

    expect(outcome).toEqual({ ok: true, generation: 2, resetAt: '2026-09-21T08:00:00Z' })
    expect(fetchMock).toHaveBeenCalledWith('/api/reset', expect.objectContaining({ method: 'POST' }))
    expect(localStorage.getItem('ladinglens-theme')).not.toBe('dark')
    expect(sessionStorage.getItem('ladinglens-judge-last-run')).toBeNull()
    expect(sessionStorage.getItem(RECONCILIATION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(EXCEPTION_ACTIONS_STORAGE_KEY)).toBeNull()
    expect(await defaultReconciliationService.getReconciliationResults()).toEqual([])
    expect(sessionStorage.getItem('ladinglens-guest-session')).not.toBeNull()
    expect(sessionStorage.getItem(API_SESSION_KEY)).toBe('tok')
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce())
  })

  it('reports a failed server reset honestly and changes nothing', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    localStorage.setItem('ladinglens-theme', 'dark')
    const spy = vi.spyOn(defaultReviewQueueService, 'reset')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(503, { error: { code: 'reset_unavailable', message: 'The demo database is unavailable.' } })
      )
    )

    const outcome = await resetDemo()

    expect(outcome).toEqual({ ok: false, message: 'The demo database is unavailable.' })
    expect(localStorage.getItem('ladinglens-theme')).toBe('dark')
    expect(spy).not.toHaveBeenCalled()
  })

  it('reports an unreachable server honestly', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    await expect(resetDemo()).resolves.toEqual({
      ok: false,
      message: 'The reset could not reach the server.'
    })
  })
})
