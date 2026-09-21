import { ApiError, apiFetch, apiJson } from '../../lib/api'
import type { GateSummary, JudgePolicy, JudgeRun, PreparedFallback, UploadRejection } from './types'

export class JudgeUploadError extends Error {
  readonly code: string
  readonly rejections: UploadRejection[]

  constructor(code: string, message: string, rejections: UploadRejection[]) {
    super(message)
    this.name = 'JudgeUploadError'
    this.code = code
    this.rejections = rejections
  }
}

function isUploadRejection(value: unknown): value is UploadRejection {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UploadRejection).slot === 'string' &&
    typeof (value as UploadRejection).reason === 'string'
  )
}

function toJudgeUploadError(error: unknown): unknown {
  if (error instanceof ApiError && error.status === 422) {
    const rejections = (error.details ?? []).filter(isUploadRejection)
    return new JudgeUploadError(error.code, error.message, rejections)
  }
  return error
}

export function getJudgePolicy(): Promise<JudgePolicy> {
  return apiJson<JudgePolicy>('/api/judge/policy')
}

export type CreateJudgeRunInput = {
  /** The pair, in either order: the check reads each file to tell the SI from the draft BL. */
  files: File[]
  confirmed: boolean
  signal?: AbortSignal
}

export async function createJudgeRun({ files, confirmed, signal }: CreateJudgeRunInput): Promise<JudgeRun> {
  const body = new FormData()
  for (const file of files) body.append('files', file)
  body.append('synthetic_confirmed', String(confirmed))
  try {
    return await apiJson<JudgeRun>('/api/judge/runs', { method: 'POST', body, signal })
  } catch (error) {
    throw toJudgeUploadError(error)
  }
}

export function getJudgeRun(runId: string): Promise<JudgeRun> {
  return apiJson<JudgeRun>(`/api/judge/runs/${runId}`)
}

export function retryJudgeRun(runId: string): Promise<JudgeRun> {
  return apiJson<JudgeRun>(`/api/judge/runs/${runId}/retry`, { method: 'POST' })
}

export function getPreparedFallback(): Promise<PreparedFallback> {
  return apiJson<PreparedFallback>('/api/judge/fallback')
}

export function getGateSummary(): Promise<GateSummary> {
  return apiJson<GateSummary>('/api/summary')
}

export async function downloadArtifact(path: string, fileName: string): Promise<void> {
  const response = await apiFetch(path)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Safari and older Firefox start the blob download asynchronously, so
  // revoking the object URL in the same task can cancel it before the
  // browser has read the data. Deferring to the next task gives it time.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export type JudgeApiClient = {
  getJudgePolicy: typeof getJudgePolicy
  createJudgeRun: typeof createJudgeRun
  getJudgeRun: typeof getJudgeRun
  retryJudgeRun: typeof retryJudgeRun
  getPreparedFallback: typeof getPreparedFallback
  getGateSummary: typeof getGateSummary
  downloadArtifact: typeof downloadArtifact
}

export const defaultJudgeApi: JudgeApiClient = {
  getJudgePolicy,
  createJudgeRun,
  getJudgeRun,
  retryJudgeRun,
  getPreparedFallback,
  getGateSummary,
  downloadArtifact
}
