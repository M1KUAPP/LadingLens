import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, API_SESSION_KEY } from '../../lib/api'
import type { ComparedField } from '../../domain/contracts'
import type { Provenance } from '../email-detail/types'
import { JudgeUploadError, type JudgeApiClient } from './judge-api'
import { JudgeView } from './JudgeView'
import type { FieldVerdictRecord } from '../email-detail/types'
import type { GateSummary, JudgeDocument, JudgeOutcome, JudgePolicy, JudgeRun, PreparedFallback } from './types'

function renderJudgeView(api: JudgeApiClient) {
  return render(
    <MemoryRouter>
      <JudgeView api={api} />
    </MemoryRouter>
  )
}

const POLICY: JudgePolicy = {
  accepted_formats: ['txt', 'pdf', 'docx', 'xlsx'],
  max_file_bytes: 5_000_000,
  data_policy: 'Synthetic data only.',
  confirmation_required: true
}

function file(name: string, size = 10, type = 'text/plain') {
  return new File([new ArrayBuffer(size)], name, { type })
}

function slotInput(label: string) {
  const zone = screen.getByRole('button', { name: label })
  return zone.closest('.drop-zone')!.querySelector('input[type="file"]') as HTMLInputElement
}

function chooseFile(label: string, chosenFile: File) {
  fireEvent.change(slotInput(label), { target: { files: [chosenFile] } })
}

const SI_DOC: JudgeDocument = {
  document_id: 'doc-si',
  slot: 'si_file',
  file_name: 'si.txt',
  detected_format: 'txt',
  byte_size: 512,
  role: 'SI',
  evidence_url: '/api/judge/runs/run-live/documents/doc-si'
}

const BL_DOC: JudgeDocument = {
  document_id: 'doc-bl',
  slot: 'draft_bl_file',
  file_name: 'bl.txt',
  detected_format: 'txt',
  byte_size: 480,
  role: 'DRAFT_BL',
  evidence_url: '/api/judge/runs/run-live/documents/doc-bl'
}

function txtProvenance(fileName: string, line: number, startCol: number, endCol: number): Provenance {
  return {
    attachment_id: `att-${fileName}-${line}-${startCol}`,
    file_name: fileName,
    format: 'txt',
    location: { kind: 'txt', line, start_col: startCol, end_col: endCol }
  }
}

// Anchors the consignee SI value at code points [6, 24) of line 4. The line
// carries a Chinese label plus an astral-plane emoji (one code point but two
// UTF-16 code units) before the value, so a UTF-16 `.slice` would land one
// character short of "ACME LOGISTICS LTD" while a code-point slice lands
// exactly on it.
const CONSIGNEE_SI_PROVENANCE = txtProvenance('si.txt', 4, 6, 24)

const SI_TXT_CONTENT = [
  'Line 1 filler',
  'Line 2 filler',
  'Line 3 filler',
  '收件人 🚀 ACME LOGISTICS LTD notify',
  'Line 5 filler'
].join('\n')

function simpleField(
  fieldName: ComparedField,
  siValue: string,
  blValue: string,
  verdict: FieldVerdictRecord['verdict'] = 'MATCH'
): FieldVerdictRecord {
  return {
    field: fieldName,
    si: { field: fieldName, raw_value: siValue, provenance: txtProvenance('si.txt', 1, 0, siValue.length) },
    draft_bl: { field: fieldName, raw_value: blValue, provenance: txtProvenance('bl.txt', 1, 0, blValue.length) },
    verdict
  }
}

const CONSIGNEE_FIELD: FieldVerdictRecord = {
  field: 'consignee',
  si: { field: 'consignee', raw_value: 'ACME LOGISTICS LTD', provenance: CONSIGNEE_SI_PROVENANCE },
  draft_bl: {
    field: 'consignee',
    raw_value: 'ACME LOGISTICS LTD',
    provenance: txtProvenance('bl.txt', 1, 0, 19)
  },
  verdict: 'MATCH'
}

const SEVEN_FIELDS_OK: FieldVerdictRecord[] = [
  simpleField('shipper', 'Acme Exports Co', 'Acme Exports Co'),
  CONSIGNEE_FIELD,
  simpleField('notify_party', 'Acme Notify Party', 'Acme Notify Party'),
  simpleField('port_of_loading', 'Busan', 'Busan'),
  simpleField('port_of_discharge', 'Long Beach', 'Long Beach'),
  simpleField('container_count', '4', '4'),
  simpleField('gross_weight_kg', '18500', '18500')
]

const FALLBACK: PreparedFallback = {
  label: 'PREPARED FALLBACK',
  source: 'prepared',
  example_id: 'email_004',
  note: 'A prepared example, not your upload.',
  documents: [
    { ...SI_DOC, document_id: 'doc-fallback-si', file_name: 'fallback-si.txt' },
    { ...BL_DOC, document_id: 'doc-fallback-bl', file_name: 'fallback-bl.txt' }
  ],
  outcome: { category: 'BL_COMPARISON', status: 'OK', review_reason: null, has_defect: false, defect_fields: [] },
  field_verdicts: SEVEN_FIELDS_OK
}

const GATE_SUMMARY: GateSummary = {
  seed_version: 'seed-v1',
  source: 'recorded',
  gate1: { received: 20, accounted: 20, by_category: { BL_COMPARISON: 12, SI_REQUEST: 8 } },
  comparison: { OK: 14, MISMATCH: 3, NEEDS_REVIEW: 3 },
  gate2: { shipments: 10, outcomes: { CASE_PRESENT: 8, DOCUMENT_MISSING: 2 } }
}

function run(overrides: Partial<JudgeRun> = {}): JudgeRun {
  return {
    run_id: 'run-live',
    source: 'live',
    state: 'SUCCEEDED',
    attempt: 1,
    created_at: '2026-09-21T00:00:00Z',
    completed_at: '2026-09-21T00:00:05Z',
    latency_ms: 1200,
    documents: [SI_DOC, BL_DOC],
    outcome: { category: 'BL_COMPARISON', status: 'OK', review_reason: null, has_defect: false, defect_fields: [] },
    field_verdicts: SEVEN_FIELDS_OK,
    diagnostics: [],
    failure: null,
    ...overrides
  }
}

function createFakeApi(overrides: Partial<JudgeApiClient> = {}): JudgeApiClient {
  return {
    getJudgePolicy: vi.fn().mockResolvedValue(POLICY),
    createJudgeRun: vi.fn().mockResolvedValue(run()),
    getJudgeRun: vi.fn().mockResolvedValue(run()),
    retryJudgeRun: vi.fn(),
    getPreparedFallback: vi.fn().mockResolvedValue(FALLBACK),
    getGateSummary: vi.fn().mockResolvedValue(GATE_SUMMARY),
    downloadArtifact: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

async function submitBothFiles(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('button', { name: 'Shipping Instruction' })
  chooseFile('Shipping Instruction', file('si.txt'))
  chooseFile('Draft Bill of Lading', file('bl.txt'))
  await user.click(screen.getByRole('checkbox', { name: /synthetic/i }))
  await user.click(screen.getByRole('button', { name: 'Check documents' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('JudgeView', () => {
  it('shows honest checking progress with an elapsed-seconds counter and no status pill', async () => {
    const api = createFakeApi({
      createJudgeRun: vi.fn(() => new Promise<JudgeRun>(() => {}))
    })
    renderJudgeView(api)
    await screen.findByRole('button', { name: 'Shipping Instruction' })
    chooseFile('Shipping Instruction', file('si.txt'))
    chooseFile('Draft Bill of Lading', file('bl.txt'))
    fireEvent.click(screen.getByRole('checkbox', { name: /synthetic/i }))

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Check documents' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Checking your documents live…')
    expect(status).toHaveTextContent('0 s elapsed')
    expect(document.querySelector('.status-pill')).toBeNull()
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('1 s elapsed')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('3 s elapsed')
  })

  it('renders exactly seven field rows and the match headline after the live check succeeds', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByText('All seven fields match')).toBeInTheDocument()
    const rows = screen.getAllByRole('generic').filter((el) => el.classList.contains('field-row'))
    expect(rows).toHaveLength(7)
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
  })

  it('shows the source location and a code-point-accurate highlighted excerpt when a TXT value is clicked', async () => {
    sessionStorage.setItem(API_SESSION_KEY, 'tok')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === SI_DOC.evidence_url) {
          return new Response(SI_TXT_CONTENT, { status: 200 })
        }
        throw new Error(`unexpected fetch to ${String(input)}`)
      })
    )

    const user = userEvent.setup()
    const api = createFakeApi()
    renderJudgeView(api)
    await submitBothFiles(user)
    await screen.findByText('All seven fields match')

    const consigneeValues = screen.getAllByRole('button', { name: 'ACME LOGISTICS LTD' })
    await user.click(consigneeValues[0])

    const evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(within(evidence).getByText(/Line 4, columns 6 to 24/)).toBeInTheDocument()

    const mark = await screen.findByText('ACME LOGISTICS LTD', { selector: 'mark' })
    expect(mark.closest('pre')).toHaveTextContent('收件人 🚀 ACME LOGISTICS LTD notify')
  })

  it('scrolls the source evidence region into view when a value is selected', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    const scrollSpy = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollSpy
    try {
      renderJudgeView(api)
      await submitBothFiles(user)
      await screen.findByText('All seven fields match')

      await user.click(screen.getAllByRole('button', { name: 'ACME LOGISTICS LTD' })[0])

      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('shows a plain-language alert with a retry button when the judge policy fails to load', async () => {
    const api = createFakeApi({ getJudgePolicy: vi.fn().mockRejectedValue(new Error('network down')) })
    renderJudgeView(api)

    expect(await screen.findByRole('alert')).toHaveTextContent('The upload rules could not load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shipping Instruction' })).not.toBeInTheDocument()
  })

  it('loads the upload panel once Try again succeeds after a policy load failure', async () => {
    const user = userEvent.setup()
    const getJudgePolicy = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(POLICY)
    const api = createFakeApi({ getJudgePolicy })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Shipping Instruction' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('restores a succeeded run from a stored run id on mount', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-live')
    const api = createFakeApi()
    renderJudgeView(api)

    expect(await screen.findByText('All seven fields match')).toBeInTheDocument()
    expect(api.getJudgeRun).toHaveBeenCalledWith('run-live')
    expect(api.getJudgePolicy).toHaveBeenCalled()
  })

  it('returns to the upload panel and clears the stored run id when "Check another pair" is clicked from a result', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    renderJudgeView(api)
    await submitBothFiles(user)
    await screen.findByText('All seven fields match')
    expect(sessionStorage.getItem('ladinglens-judge-last-run')).toBe('run-live')

    await user.click(screen.getByRole('button', { name: 'Check another pair' }))

    expect(await screen.findByRole('button', { name: 'Shipping Instruction' })).toBeInTheDocument()
    expect(screen.queryByText('All seven fields match')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('ladinglens-judge-last-run')).toBeNull()
  })

  it('returns to the upload panel and clears the stored run id when "Check another pair" is clicked from a failure', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(failedRun) })
    renderJudgeView(api)
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Check another pair' }))

    expect(await screen.findByRole('button', { name: 'Shipping Instruction' })).toBeInTheDocument()
    expect(screen.queryByText('The live check did not finish')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('ladinglens-judge-last-run')).toBeNull()
  })

  it('discloses a restored failure before the labelled prepared fallback, keeping the uploaded file names visible', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(failedRun) })
    renderJudgeView(api)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The live check did not finish')
    expect(screen.getByText('The comparison provider timed out.')).toBeInTheDocument()
    expect(screen.getByText('Your upload is kept: si.txt and bl.txt')).toBeInTheDocument()

    const fallbackHeading = await screen.findByRole('heading', { name: 'PREPARED FALLBACK' })
    expect(screen.queryByText(/Your result/i)).not.toBeInTheDocument()
    expect(alert.compareDocumentPosition(fallbackHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the retry button and explains when the failure is not retryable', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'permanent_rejection', retryable: false, message: 'The provider rejected this document pair.' }
    })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(failedRun) })
    renderJudgeView(api)

    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: 'Retry live check' })).not.toBeInTheDocument()
    expect(screen.getByText('This failure cannot be retried; try again later.')).toBeInTheDocument()
  })

  it('disables the retry button while a retry is in flight', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({
      getJudgeRun: vi.fn().mockResolvedValue(failedRun),
      retryJudgeRun: vi.fn(() => new Promise<JudgeRun>(() => {}))
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(screen.getByRole('button', { name: 'Retry live check' })).toBeDisabled()
  })

  it('switches to the result state and removes both panels when a retry succeeds', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const succeededRun = run({ run_id: 'run-failed', attempt: 2 })
    const api = createFakeApi({
      getJudgeRun: vi.fn().mockResolvedValue(failedRun),
      retryJudgeRun: vi.fn().mockResolvedValue(succeededRun)
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await screen.findByRole('heading', { name: 'PREPARED FALLBACK' })
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(await screen.findByText('All seven fields match')).toBeInTheDocument()
    expect(api.retryJudgeRun).toHaveBeenCalledWith('run-failed')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'PREPARED FALLBACK' })).not.toBeInTheDocument()
  })

  it('keeps both panels and updates the message when a retry fails again', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const secondFailure = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      attempt: 2,
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out again.' }
    })
    const api = createFakeApi({
      getJudgeRun: vi.fn().mockResolvedValue(failedRun),
      retryJudgeRun: vi.fn().mockResolvedValue(secondFailure)
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await screen.findByRole('heading', { name: 'PREPARED FALLBACK' })
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(await screen.findByText('The comparison provider timed out again.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PREPARED FALLBACK' })).toBeInTheDocument()
    expect(screen.getByText('Your upload is kept: si.txt and bl.txt')).toBeInTheDocument()
  })

  it('refetches and shows the result when retry answers 409 already_succeeded', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const succeededRun = run({ run_id: 'run-failed', attempt: 2 })
    const getJudgeRun = vi.fn().mockResolvedValueOnce(failedRun).mockResolvedValueOnce(succeededRun)
    const api = createFakeApi({
      getJudgeRun,
      retryJudgeRun: vi.fn().mockRejectedValue(new ApiError(409, 'already_succeeded', 'This run already succeeded.'))
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(await screen.findByText('All seven fields match')).toBeInTheDocument()
    expect(getJudgeRun).toHaveBeenCalledTimes(2)
    expect(getJudgeRun).toHaveBeenLastCalledWith('run-failed')
  })

  it('shows a plain-language alert and keeps Retry available when a retry fails for a reason other than already_succeeded', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({
      getJudgeRun: vi.fn().mockResolvedValue(failedRun),
      retryJudgeRun: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(await screen.findByText('The check could not reach the server. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry live check' })).toBeEnabled()
    expect(screen.getByText('Your upload is kept: si.txt and bl.txt')).toBeInTheDocument()
  })

  it('shows a plain-language alert without an unhandled rejection when the post-409 refresh fails', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const getJudgeRun = vi
      .fn()
      .mockResolvedValueOnce(failedRun)
      .mockRejectedValueOnce(new ApiError(503, 'provider_unavailable', 'The judge provider is unavailable.'))
    const api = createFakeApi({
      getJudgeRun,
      retryJudgeRun: vi.fn().mockRejectedValue(new ApiError(409, 'already_succeeded', 'This run already succeeded.'))
    })
    renderJudgeView(api)

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry live check' }))

    expect(await screen.findByText('The judge provider is unavailable.')).toBeInTheDocument()
    expect(getJudgeRun).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Retry live check' })).toBeEnabled()
  })

  it('shows the MISMATCH headline listing the differing fields', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-mismatch')
    const outcome: JudgeOutcome = {
      category: 'BL_COMPARISON',
      status: 'MISMATCH',
      review_reason: null,
      has_defect: true,
      defect_fields: ['consignee', 'gross_weight_kg']
    }
    const mismatchRun = run({ run_id: 'run-mismatch', outcome })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(mismatchRun) })
    renderJudgeView(api)

    expect(await screen.findByText('2 fields differ: Consignee, Gross weight (kg)')).toBeInTheDocument()
  })

  it('shows the NEEDS_REVIEW headline in plain language', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-review')
    const outcome: JudgeOutcome = {
      category: 'BL_COMPARISON',
      status: 'NEEDS_REVIEW',
      review_reason: 'unreadable',
      has_defect: true,
      defect_fields: []
    }
    const reviewRun = run({ run_id: 'run-review', outcome })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(reviewRun) })
    renderJudgeView(api)

    expect(await screen.findByText('Needs review: Unreadable file')).toBeInTheDocument()
  })

  it('returns to the upload panel with server rejections after a 422 upload rejection, never leaving a checking status behind', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi
        .fn()
        .mockRejectedValue(
          new JudgeUploadError('upload_rejected', 'One or more files could not be used.', [
            { slot: 'si_file', reason: 'unsupported_format' }
          ])
        )
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.'
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeInTheDocument()
  })

  it('keeps the chosen files and confirmation across a 422 rejection, re-enabling submit once the rejected file is replaced', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi
        .fn()
        .mockRejectedValue(
          new JudgeUploadError('upload_rejected', 'One or more files could not be used.', [
            { slot: 'draft_bl_file', reason: 'unsupported_format' }
          ])
        )
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    await screen.findByRole('alert')
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /synthetic/i })).toBeChecked()

    const blSlot = screen.getByText('Draft Bill of Lading').closest('.upload-panel-slot') as HTMLElement
    expect(within(blSlot).getByRole('alert')).toHaveTextContent(
      'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.'
    )
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Remove the Draft Bill of Lading file' }))
    chooseFile('Draft Bill of Lading', file('bl2.txt'))

    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /synthetic/i })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeEnabled()
  })

  it('shows the server message as a role="alert" when a 422 upload rejection carries no per-slot details', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi
        .fn()
        .mockRejectedValue(new JudgeUploadError('synthetic_only', 'Synthetic confirmation is required.', []))
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic confirmation is required.')
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
  })

  it('shows the server message as a role="alert" when a 422 upload rejection only names a slot the panel does not render', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi
        .fn()
        .mockRejectedValue(
          new JudgeUploadError('upload_rejected', 'One or more files could not be used.', [
            { slot: 'commercial_invoice_file', reason: 'unsupported_format' }
          ])
        )
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('One or more files could not be used.')
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
  })

  it('falls back to a fixed sentence when a 422 with no visible slot rejection carries an empty message', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi.fn().mockRejectedValue(new JudgeUploadError('synthetic_only', '', []))
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'One or more files could not be used. Check your files and try again.'
    )
  })

  it('shows a role="alert" message and keeps the chosen files when the server reports the demo was reset mid-check', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi.fn().mockRejectedValue(new ApiError(409, 'session_reset', 'The demo was reset.'))
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your demo was reset while this check ran. Upload the pair again.'
    )
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /synthetic/i })).toBeChecked()
  })

  it('shows the server error message as a role="alert" for other submit failures, keeping the chosen files', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi
        .fn()
        .mockRejectedValue(new ApiError(503, 'provider_unavailable', 'The judge provider is unavailable.'))
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('The judge provider is unavailable.')
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
  })

  it('shows a generic network-error message as a role="alert" when the submit request never reaches the server', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      createJudgeRun: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    })
    renderJudgeView(api)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('The check could not reach the server. Try again.')
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('bl.txt')).toBeInTheDocument()
  })

  it('shows the permanent synthetic-data banner before any check has run', async () => {
    const api = createFakeApi()
    renderJudgeView(api)

    expect(
      await screen.findByText('Synthetic data only. Do not upload real shipping documents.')
    ).toBeInTheDocument()
  })

  it('keeps the synthetic-data banner visible once the live check has a result', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    renderJudgeView(api)
    await submitBothFiles(user)

    await screen.findByText('All seven fields match')
    expect(screen.getByText('Synthetic data only. Do not upload real shipping documents.')).toBeInTheDocument()
  })

  it('keeps the synthetic-data banner visible when the live check fails', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(failedRun) })
    renderJudgeView(api)

    await screen.findByRole('alert')
    expect(screen.getByText('Synthetic data only. Do not upload real shipping documents.')).toBeInTheDocument()
  })

  it('renders the gate summary numbers from the dataset-wide summary', async () => {
    const api = createFakeApi()
    renderJudgeView(api)

    expect(await screen.findByText('20 of 20 emails accounted for')).toBeInTheDocument()
    expect(screen.getByText('OK (14)')).toBeInTheDocument()
    expect(screen.getByText('Case present (8)')).toBeInTheDocument()
    expect(screen.getByText('Recorded run')).toBeInTheDocument()
  })

  it('calls downloadArtifact with the submission JSON and synthetic CSV paths', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    renderJudgeView(api)

    await user.click(await screen.findByRole('button', { name: 'Download submission JSON' }))
    expect(api.downloadArtifact).toHaveBeenCalledWith('/api/artifacts/submission.json', 'submission.json')

    await user.click(screen.getByRole('button', { name: 'Download synthetic CSV' }))
    expect(api.downloadArtifact).toHaveBeenCalledWith(
      '/api/artifacts/expected-shipments.csv',
      'expected-shipments.csv'
    )
  })

  it('links the inbox, reconciliation, and the default example case', async () => {
    const api = createFakeApi()
    renderJudgeView(api)

    expect(await screen.findByRole('link', { name: 'Open the inbox' })).toHaveAttribute('href', '/inbox')
    expect(screen.getByRole('link', { name: 'Open reconciliation' })).toHaveAttribute(
      'href',
      '/review?tab=reconciliation'
    )
    expect(screen.getByRole('link', { name: 'Open the example case' })).toHaveAttribute('href', '/emails/email_004')
  })

  it('updates the example case link to the loaded prepared fallback id after a failure', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const distinctFallback: PreparedFallback = { ...FALLBACK, example_id: 'email_009' }
    const api = createFakeApi({
      getJudgeRun: vi.fn().mockResolvedValue(failedRun),
      getPreparedFallback: vi.fn().mockResolvedValue(distinctFallback)
    })
    renderJudgeView(api)

    await screen.findByRole('heading', { name: 'PREPARED FALLBACK' })
    expect(await screen.findByRole('link', { name: 'Open the example case' })).toHaveAttribute(
      'href',
      '/emails/email_009'
    )
  })
})
