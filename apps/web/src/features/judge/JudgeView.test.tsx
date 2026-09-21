import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_SESSION_KEY } from '../../lib/api'
import type { ComparedField } from '../../domain/contracts'
import type { Provenance } from '../email-detail/types'
import { JudgeUploadError, type JudgeApiClient } from './judge-api'
import { JudgeView } from './JudgeView'
import type { FieldVerdictRecord } from '../email-detail/types'
import type { JudgeDocument, JudgeOutcome, JudgePolicy, JudgeRun } from './types'

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
    getPreparedFallback: vi.fn(),
    getGateSummary: vi.fn(),
    downloadArtifact: vi.fn(),
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
    render(<JudgeView api={api} />)
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
    expect(screen.queryByRole('button', { name: 'Check documents' })).not.toBeInTheDocument()

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
    render(<JudgeView api={api} />)
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
    render(<JudgeView api={api} />)
    await submitBothFiles(user)
    await screen.findByText('All seven fields match')

    const consigneeValues = screen.getAllByRole('button', { name: 'ACME LOGISTICS LTD' })
    await user.click(consigneeValues[0])

    const evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(within(evidence).getByText(/Line 4, columns 6 to 24/)).toBeInTheDocument()

    const mark = await screen.findByText('ACME LOGISTICS LTD', { selector: 'mark' })
    expect(mark.closest('pre')).toHaveTextContent('收件人 🚀 ACME LOGISTICS LTD notify')
  })

  it('restores a succeeded run from a stored run id on mount', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-live')
    const api = createFakeApi()
    render(<JudgeView api={api} />)

    expect(await screen.findByText('All seven fields match')).toBeInTheDocument()
    expect(api.getJudgeRun).toHaveBeenCalledWith('run-live')
    expect(api.getJudgePolicy).not.toHaveBeenCalled()
  })

  it('restores a failed run as a minimal alert placeholder (Task 4 replaces this panel)', async () => {
    sessionStorage.setItem('ladinglens-judge-last-run', 'run-failed')
    const failedRun = run({
      run_id: 'run-failed',
      state: 'FAILED',
      outcome: null,
      field_verdicts: [],
      failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' }
    })
    const api = createFakeApi({ getJudgeRun: vi.fn().mockResolvedValue(failedRun) })
    render(<JudgeView api={api} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The comparison provider timed out.')
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
    render(<JudgeView api={api} />)

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
    render(<JudgeView api={api} />)

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
    render(<JudgeView api={api} />)
    await submitBothFiles(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.'
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeInTheDocument()
  })
})
