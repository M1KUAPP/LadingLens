import { ApiError, abortInFlight, apiJson } from './api'
import { applyTheme, readTheme } from './theme'
import { defaultEmailDetailService } from '../features/email-detail/seam'
import { defaultReconciliationService } from '../features/reconciliation/seam'
import { defaultReviewQueueService } from '../features/review-queue/seam'

export const DEMO_LOCAL_KEYS = ['ladinglens-theme'] as const
export const DEMO_SESSION_KEYS = ['ladinglens-judge-last-run'] as const

export type ResetOutcome =
  | { ok: true; generation: number; resetAt: string }
  | { ok: false; message: string }

type ResetResponse = { generation: number; seed_version: string; reset_at: string }

function removeKeys(storage: () => Storage, keys: readonly string[]): void {
  try {
    const target = storage()
    keys.forEach((key) => target.removeItem(key))
  } catch {
    // Unavailable storage holds nothing to clear.
  }
}

export async function resetDemo(): Promise<ResetOutcome> {
  abortInFlight()
  let body: ResetResponse
  try {
    body = await apiJson<ResetResponse>('/api/reset', { method: 'POST' })
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'The reset could not reach the server. Nothing was changed.'
    }
  }
  await Promise.all([
    defaultEmailDetailService.reset(),
    defaultReviewQueueService.reset(),
    defaultReconciliationService.reset()
  ])
  removeKeys(() => localStorage, DEMO_LOCAL_KEYS)
  removeKeys(() => sessionStorage, DEMO_SESSION_KEYS)
  applyTheme(readTheme())
  return { ok: true, generation: body.generation, resetAt: body.reset_at }
}
