import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY } from '../../lib/api'
import type { Provenance } from '../email-detail/types'
import {
  JudgeUploadError,
  createJudgeRun,
  downloadArtifact,
  getGateSummary,
  getJudgePolicy,
  getJudgeRun,
  getPreparedFallback,
  retryJudgeRun
} from './judge-api'
import type { GateSummary, JudgeOutcome, JudgePolicy, JudgeRun, PreparedFallback } from './types'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function file(name: string, content = 'data', type = 'text/plain') {
  return new File([content], name, { type })
}

const SI_PROVENANCE: Provenance = {
  attachment_id: 'att-si',
  file_name: 'si.txt',
  format: 'txt',
  location: { kind: 'txt', line: 4, start_col: 0, end_col: 8 }
}

const DRAFT_BL_PROVENANCE: Provenance = {
  attachment_id: 'att-bl',
  file_name: 'bl.txt',
  format: 'txt',
  location: { kind: 'txt', line: 6, start_col: 0, end_col: 8 }
}

const OUTCOME: JudgeOutcome = {
  category: 'BL_COMPARISON',
  status: 'OK',
  review_reason: null,
  has_defect: false,
  defect_fields: []
}

const RUN_SUCCEEDED: JudgeRun = {
  run_id: 'run-1',
  source: 'live',
  state: 'SUCCEEDED',
  attempt: 1,
  created_at: '2026-09-21T00:00:00Z',
  completed_at: '2026-09-21T00:00:05Z',
  latency_ms: 5000,
  documents: [
    {
      document_id: 'doc-si',
      slot: 'si_file',
      file_name: 'si.txt',
      detected_format: 'txt',
      byte_size: 128,
      role: 'SI',
      evidence_url: '/api/judge/runs/run-1/documents/doc-si'
    },
    {
      document_id: 'doc-bl',
      slot: 'draft_bl_file',
      file_name: 'bl.txt',
      detected_format: 'txt',
      byte_size: 256,
      role: 'DRAFT_BL',
      evidence_url: '/api/judge/runs/run-1/documents/doc-bl'
    }
  ],
  outcome: OUTCOME,
  field_verdicts: [
    {
      field: 'shipper',
      si: { field: 'shipper', raw_value: 'Acme', normalized_value: 'ACME', confidence: 0.98, provenance: SI_PROVENANCE },
      draft_bl: {
        field: 'shipper',
        raw_value: 'Acme',
        normalized_value: 'ACME',
        confidence: 0.97,
        provenance: DRAFT_BL_PROVENANCE
      },
      verdict: 'MATCH'
    }
  ],
  diagnostics: [],
  failure: null
}

const FALLBACK: PreparedFallback = {
  label: 'PREPARED FALLBACK',
  source: 'prepared',
  example_id: 'email_004',
  note: 'A prepared example, not your upload.',
  documents: RUN_SUCCEEDED.documents,
  outcome: OUTCOME,
  field_verdicts: RUN_SUCCEEDED.field_verdicts
}

const GATE_SUMMARY: GateSummary = {
  seed_version: 'seed-v1',
  source: 'recorded',
  gate1: { received: 20, accounted: 20, by_category: { BL_COMPARISON: 12, SI_REQUEST: 8 } },
  comparison: { OK: 14, MISMATCH: 3, NEEDS_REVIEW: 3 },
  gate2: { shipments: 10, outcomes: { CASE_PRESENT: 8, DOCUMENT_MISSING: 2 } }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('judge API client', () => {
  it('fetches the judge policy', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    const policy: JudgePolicy = {
      accepted_formats: ['txt', 'pdf', 'docx', 'xlsx'],
      max_file_bytes: 5_000_000,
      data_policy: 'Synthetic data only.',
      confirmation_required: true
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/judge/policy')
      return json(200, policy)
    }))

    await expect(getJudgePolicy()).resolves.toEqual(policy)
  })

  it('submits both files and the confirmation flag as multipart form data without a manual content type', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    let capturedInit: RequestInit | undefined
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/judge/runs') {
        capturedInit = init
        return json(201, RUN_SUCCEEDED)
      }
      throw new Error(`unexpected fetch to ${String(input)}`)
    }))

    const si = file('si.txt')
    const draftBl = file('bl.txt')
    await expect(createJudgeRun({ si, draftBl, confirmed: true })).resolves.toEqual(RUN_SUCCEEDED)

    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.body).toBeInstanceOf(FormData)
    const form = capturedInit?.body as FormData
    expect(form.get('si_file')).toBe(si)
    expect(form.get('draft_bl_file')).toBe(draftBl)
    expect(form.get('synthetic_confirmed')).toBe('true')
    expect(new Headers(capturedInit?.headers).has('Content-Type')).toBe(false)
  })

  it('maps a 422 upload rejection into a JudgeUploadError carrying the slot rejections', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async () =>
      json(422, {
        error: {
          code: 'upload_rejected',
          message: 'One or more files could not be used.',
          details: [{ slot: 'si_file', reason: 'unsupported_format' }]
        }
      })
    ))

    const error = await createJudgeRun({
      si: file('si.png', 'x', 'image/png'),
      draftBl: file('bl.txt'),
      confirmed: true
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(JudgeUploadError)
    expect(error).toMatchObject({
      name: 'JudgeUploadError',
      code: 'upload_rejected',
      message: 'One or more files could not be used.',
      rejections: [{ slot: 'si_file', reason: 'unsupported_format' }]
    })
  })

  it('fetches a run by id', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/judge/runs/run-1')
      return json(200, RUN_SUCCEEDED)
    }))

    await expect(getJudgeRun('run-1')).resolves.toEqual(RUN_SUCCEEDED)
  })

  it('posts to the retry path for a run', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/judge/runs/run-1/retry')
      expect(init?.method).toBe('POST')
      return json(200, RUN_SUCCEEDED)
    }))

    await expect(retryJudgeRun('run-1')).resolves.toEqual(RUN_SUCCEEDED)
  })

  it('fetches the prepared fallback', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/judge/fallback')
      return json(200, FALLBACK)
    }))

    await expect(getPreparedFallback()).resolves.toEqual(FALLBACK)
  })

  it('fetches the gate summary', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/api/summary')
      return json(200, GATE_SUMMARY)
    }))

    await expect(getGateSummary()).resolves.toEqual(GATE_SUMMARY)
  })

  describe('downloadArtifact', () => {
    afterEach(() => {
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    })

    it('fetches the artifact as a blob and clicks a temporary download link', async () => {
      sessionStorage.setItem(API_SESSION_KEY, 'tok')
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe('/api/artifacts/submission.json')
        // Build the Response from a string, not a jsdom Blob: the Response
        // implementation reads a Blob body via .stream(), which jsdom's Blob
        // does not implement in every resolved version.
        return new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }))
      const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock-url')
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      await downloadArtifact('/api/artifacts/submission.json', 'submission.json')

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      const capturedLink = (clickSpy.mock.instances as unknown[])[0] as HTMLAnchorElement
      expect(capturedLink.getAttribute('href')).toBe('blob:mock-url')
      expect(capturedLink.download).toBe('submission.json')
      expect(document.body.contains(capturedLink)).toBe(false)

      clickSpy.mockRestore()
    })

    it('defers revoking the object URL until after the current task, so Safari and older Firefox have started the download', async () => {
      vi.useFakeTimers()
      sessionStorage.setItem(API_SESSION_KEY, 'tok')
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('{"ok":true}', {
              status: 200,
              headers: { 'content-type': 'application/json' }
            })
        )
      )
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL })
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      await downloadArtifact('/api/artifacts/submission.json', 'submission.json')
      expect(revokeObjectURL).not.toHaveBeenCalled()

      vi.runAllTimers()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

      clickSpy.mockRestore()
    })
  })
})
