import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY, ApiError } from '../../lib/api'
import { createPreparedEmailDetailService } from './seam'
import {
  EmailDetailContractError,
  createApiEmailDetailService,
  mapEmailDetailView
} from './seam-api'
import type { EmailDetailService } from './seam'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function notFound() {
  return json(404, {
    error: { code: 'email_not_found', message: 'No email exists with that ID.' }
  })
}

function txtProvenance(attachmentId: string) {
  return {
    attachment_id: attachmentId,
    file_name: `${attachmentId}.txt`,
    format: 'txt',
    location: { kind: 'txt', line: 4, start_col: 5, end_col: 25 }
  }
}

function extractedValue(attachmentId: string, provenance?: unknown) {
  return {
    field: 'shipper',
    raw_value: 'ACME CORP',
    normalized_value: 'acme corp',
    confidence: null,
    provenance: provenance ?? txtProvenance(attachmentId)
  }
}

function fieldVerdict(overrides: Record<string, unknown> = {}) {
  return {
    field: 'shipper',
    si: extractedValue('email_018-1'),
    draft_bl: extractedValue('email_018-2'),
    verdict: 'MATCH',
    semantic_probability: null,
    reason: 'Shipper is the same after normalization',
    ...overrides
  }
}

function detailView(overrides: Record<string, unknown> = {}) {
  return {
    email_id: 'email_018',
    source: 'prepared',
    is_prepared: true,
    category: 'BL_COMPARISON',
    status: 'OK',
    review_reason: null,
    sender: 'ops@example.test',
    subject: 'SI for booking 123',
    received_at: '2026-09-20T08:00:00+00:00',
    attachments: [
      {
        attachment_id: 'email_018-1',
        file_name: 'email_018_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED',
        byte_size: 512,
        error: null
      },
      {
        attachment_id: 'email_018-2',
        file_name: 'email_018_BL.txt',
        detected_format: 'txt',
        document_type: 'DRAFT_BL',
        parse_state: 'UNREADABLE',
        byte_size: 256,
        error: 'Document appears corrupt'
      }
    ],
    field_verdicts: [fieldVerdict()],
    held_review: null,
    ...overrides
  }
}

function heldReview(overrides: Record<string, unknown> = {}) {
  return {
    case_id: 'seed-case:email_018',
    email_id: 'email_018',
    status: 'NEEDS_REVIEW',
    review_reason: 'missing_attachment',
    probability: null,
    assigned_owner: 'docs-demo',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_018',
      sender: 'ops@example.test',
      subject: 'SI for booking 123',
      received_at: '2026-09-20T08:00:00+00:00',
      message_hash: 'abc123'
    },
    evidence_summary: 'Missing required draft bill of lading',
    history: [
      {
        id: 'hist-1',
        timestamp: '2026-09-21T09:00:00+00:00',
        actor: 'operator_1',
        action: 'APPROVE',
        note: null
      }
    ],
    ...overrides
  }
}

function stubFallback() {
  return {
    getEmailDetail: vi.fn(async () => null),
    submitReviewAction: vi.fn(),
    reset: vi.fn(async () => {})
  } satisfies EmailDetailService
}

beforeEach(() => {
  sessionStorage.setItem(API_SESSION_KEY, 'tok-test')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mapEmailDetailView', () => {
  it('maps a full API payload, turning nulls into absent optionals', () => {
    const record = mapEmailDetailView(detailView())
    expect(record).toEqual({
      email_id: 'email_018',
      is_prepared: true,
      source: 'prepared',
      category: 'BL_COMPARISON',
      status: 'OK',
      attachments: [
        {
          attachment_id: 'email_018-1',
          file_name: 'email_018_SI.txt',
          detected_format: 'txt',
          document_type: 'SI',
          parse_state: 'PARSED',
          byte_size: 512
        },
        {
          attachment_id: 'email_018-2',
          file_name: 'email_018_BL.txt',
          detected_format: 'txt',
          document_type: 'DRAFT_BL',
          parse_state: 'UNREADABLE',
          byte_size: 256,
          error: 'Document appears corrupt'
        }
      ],
      field_verdicts: [
        {
          field: 'shipper',
          si: {
            field: 'shipper',
            raw_value: 'ACME CORP',
            normalized_value: 'acme corp',
            provenance: txtProvenance('email_018-1')
          },
          draft_bl: {
            field: 'shipper',
            raw_value: 'ACME CORP',
            normalized_value: 'acme corp',
            provenance: txtProvenance('email_018-2')
          },
          verdict: 'MATCH',
          reason: 'Shipper is the same after normalization'
        }
      ]
    })
  })

  it('maps a recorded-source record with is_prepared false and a held review', () => {
    const record = mapEmailDetailView(
      detailView({
        source: 'recorded',
        is_prepared: false,
        status: 'NEEDS_REVIEW',
        review_reason: 'missing_attachment',
        field_verdicts: [],
        held_review: heldReview()
      })
    )
    expect(record.is_prepared).toBe(false)
    expect(record.source).toBe('recorded')
    expect(record.review_reason).toBe('missing_attachment')
    expect(record.held_review?.case_id).toBe('seed-case:email_018')
    expect(record.held_review?.disposition).toBe('IN_REVIEW')
    expect(record.held_review?.history).toHaveLength(1)
    expect(record.held_review?.history[0]?.note).toBeUndefined()
  })

  it.each([
    ['txt', txtProvenance('att-1')],
    [
      'digital_pdf',
      {
        attachment_id: 'att-2',
        file_name: 'bill.pdf',
        format: 'digital_pdf',
        location: {
          kind: 'digital_pdf',
          page: 1,
          bbox: [72.0, 140.0, 280.0, 165.0],
          approximate: false
        }
      }
    ],
    [
      'scanned_pdf',
      {
        attachment_id: 'att-3',
        file_name: 'scan.pdf',
        format: 'scanned_pdf',
        location: {
          kind: 'scanned_pdf',
          page: 2,
          approximate: true,
          region: 'cargo'
        }
      }
    ],
    [
      'docx table',
      {
        attachment_id: 'att-4',
        file_name: 'draft.docx',
        format: 'docx',
        location: {
          kind: 'docx_table',
          table_index: 0,
          row_index: 1,
          col_index: 1
        }
      }
    ],
    [
      'docx paragraph',
      {
        attachment_id: 'att-5',
        file_name: 'draft.docx',
        format: 'docx',
        location: { kind: 'docx_paragraph', paragraph_index: 2 }
      }
    ],
    [
      'xlsx',
      {
        attachment_id: 'att-6',
        file_name: 'sheet.xlsx',
        format: 'xlsx',
        location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B5' }
      }
    ]
  ])('round-trips %s provenance', (_label, provenance) => {
    const record = mapEmailDetailView(
      detailView({
        field_verdicts: [
          fieldVerdict({ si: extractedValue('att-x', provenance) })
        ]
      })
    )
    expect(record.field_verdicts[0]?.si.provenance).toEqual(provenance)
  })

  it('treats parse_error as the unreadable discriminator even for a txt format', () => {
    const provenance = {
      attachment_id: 'att-7',
      file_name: 'corrupt.txt',
      format: 'txt',
      parse_error: 'not a text file',
      location: { kind: 'txt', line: 1, start_col: 0, end_col: 5 }
    }
    const record = mapEmailDetailView(
      detailView({
        field_verdicts: [
          fieldVerdict({ si: extractedValue('att-x', provenance) })
        ]
      })
    )
    expect(record.field_verdicts[0]?.si.provenance).toEqual({
      attachment_id: 'att-7',
      file_name: 'corrupt.txt',
      format: 'txt',
      parse_error: 'not a text file'
    })
  })

  it.each([
    ['a null verdict', { verdict: null }],
    ['an out-of-contract verdict', { verdict: 'NOT_APPLICABLE' }],
    ['a verdict of the wrong type', { verdict: 3 }]
  ])('rejects %s visibly', (_label, patch) => {
    expect(() =>
      mapEmailDetailView(detailView({ field_verdicts: [fieldVerdict(patch)] }))
    ).toThrow(EmailDetailContractError)
  })

  it.each([
    ['category', { category: 'FAX' }],
    ['status', { status: 'PENDING' }],
    ['review_reason', { review_reason: 'vibes' }],
    ['is_prepared', { is_prepared: 'yes' }],
    ['attachments', { attachments: 'none' }]
  ])('rejects a drifted %s', (_label, patch) => {
    expect(() => mapEmailDetailView(detailView(patch))).toThrow(
      EmailDetailContractError
    )
  })

  it('rejects a provenance whose location kind does not match its format', () => {
    const provenance = {
      attachment_id: 'att-8',
      file_name: 'odd.txt',
      format: 'txt',
      location: { kind: 'xlsx', sheet: 'S', cell: 'A1' }
    }
    expect(() =>
      mapEmailDetailView(
        detailView({
          field_verdicts: [
            fieldVerdict({ si: extractedValue('att-x', provenance) })
          ]
        })
      )
    ).toThrow(EmailDetailContractError)
  })

  it('rejects an unknown provenance format', () => {
    const provenance = {
      attachment_id: 'att-9',
      file_name: 'odd.eml',
      format: 'eml',
      location: { kind: 'txt', line: 1, start_col: 0, end_col: 5 }
    }
    expect(() =>
      mapEmailDetailView(
        detailView({
          field_verdicts: [
            fieldVerdict({ si: extractedValue('att-x', provenance) })
          ]
        })
      )
    ).toThrow(EmailDetailContractError)
  })
})

describe('createApiEmailDetailService', () => {
  it('fetches and maps GET /api/emails/{id}', async () => {
    const fetchMock = vi.fn(async () => json(200, detailView()))
    vi.stubGlobal('fetch', fetchMock)

    const record = await createApiEmailDetailService().getEmailDetail(
      'email_018'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/emails/email_018',
      expect.objectContaining({})
    )
    expect(record?.email_id).toBe('email_018')
    expect(record?.is_prepared).toBe(true)
  })

  it('answers null on a 404 when there is no fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => notFound()))
    await expect(
      createApiEmailDetailService().getEmailDetail('nope')
    ).resolves.toBeNull()
  })

  it('serves the fixture on a 404 for an id the API never seeded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => notFound()))
    const service = createApiEmailDetailService(
      createPreparedEmailDetailService()
    )
    const record = await service.getEmailDetail('email_ambiguous')
    expect(record?.email_id).toBe('email_ambiguous')
    expect(record?.is_prepared).toBe(true)
    expect(record?.held_review?.case_id).toBe('case_ambiguous_01')
  })

  it('answers null on a 404 when the fixture does not know the id either', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => notFound()))
    const service = createApiEmailDetailService(
      createPreparedEmailDetailService()
    )
    await expect(service.getEmailDetail('nope')).resolves.toBeNull()
  })

  it('serves the fixture when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )
    const service = createApiEmailDetailService(
      createPreparedEmailDetailService()
    )
    const record = await service.getEmailDetail('email_001')
    expect(record?.email_id).toBe('email_001')
    expect(record?.field_verdicts).toHaveLength(7)
  })

  it('does not consult the fallback when the API serves the record', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(200, detailView())))
    const fallback = stubFallback()
    const service = createApiEmailDetailService(fallback)
    const record = await service.getEmailDetail('email_018')
    expect(record?.email_id).toBe('email_018')
    expect(fallback.getEmailDetail).not.toHaveBeenCalled()
  })

  it('lets contract drift fail visibly instead of falling back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, detailView({ field_verdicts: [fieldVerdict({ verdict: 'NOT_APPLICABLE' })] }))
      )
    )
    const fallback = stubFallback()
    const service = createApiEmailDetailService(fallback)
    await expect(service.getEmailDetail('email_018')).rejects.toThrow(
      EmailDetailContractError
    )
    expect(fallback.getEmailDetail).not.toHaveBeenCalled()
  })

  it('posts the review action and maps the updated view', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json(
          200,
          detailView({
            status: 'NEEDS_REVIEW',
            review_reason: 'missing_attachment',
            field_verdicts: [],
            held_review: heldReview({ disposition: 'APPROVED' })
          })
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    const updated = await createApiEmailDetailService().submitReviewAction({
      case_id: 'seed-case:email_018',
      action: 'APPROVE',
      rationale: 'Checked with the shipper',
      actor_id: 'operator_42'
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ]
    expect(url).toBe('/api/cases/seed-case%3Aemail_018/review-actions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'APPROVE',
      actor_id: 'operator_42',
      rationale: 'Checked with the shipper'
    })
    expect(updated.held_review?.disposition).toBe('APPROVED')
  })

  it('falls back to the fixture for a case the API does not know', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(404, {
          error: { code: 'case_not_found', message: 'No case exists with that ID.' }
        })
      )
    )
    const service = createApiEmailDetailService(
      createPreparedEmailDetailService()
    )
    const updated = await service.submitReviewAction({
      case_id: 'case_ambiguous_01',
      action: 'APPROVE',
      rationale: 'Fixture-only case',
      actor_id: 'operator_42'
    })
    expect(updated.held_review?.disposition).toBe('APPROVED')
  })

  it('propagates the API’s own rejections instead of mutating the fixture', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(409, {
          error: {
            code: 'already_settled',
            message: 'This case already has a review decision.'
          }
        })
      )
    )
    const fallback = stubFallback()
    const service = createApiEmailDetailService(fallback)
    await expect(
      service.submitReviewAction({
        case_id: 'seed-case:email_018',
        action: 'APPROVE',
        rationale: 'Duplicate approval',
        actor_id: 'operator_42'
      })
    ).rejects.toThrow(ApiError)
    expect(fallback.submitReviewAction).not.toHaveBeenCalled()
  })

  it('delegates reset to the fallback store without posting /api/reset', async () => {
    const fetchMock = vi.fn(async () => json(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    const fallback = stubFallback()
    await createApiEmailDetailService(fallback).reset()
    expect(fallback.reset).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts /api/reset when running standalone', async () => {
    const fetchMock = vi.fn(async () => json(200, { generation: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiEmailDetailService().reset()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reset',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
