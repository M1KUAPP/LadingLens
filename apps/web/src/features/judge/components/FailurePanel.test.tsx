import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { JudgeDocument, JudgeRun } from '../types'
import { FailurePanel } from './FailurePanel'

const SI_DOC: JudgeDocument = {
  document_id: 'doc-si',
  slot: 'si_file',
  file_name: 'si.txt',
  detected_format: 'txt',
  byte_size: 512,
  role: 'SI',
  evidence_url: '/api/judge/runs/run-1/documents/doc-si'
}

const BL_DOC: JudgeDocument = {
  document_id: 'doc-bl',
  slot: 'draft_bl_file',
  file_name: 'bl.txt',
  detected_format: 'txt',
  byte_size: 480,
  role: 'DRAFT_BL',
  evidence_url: '/api/judge/runs/run-1/documents/doc-bl'
}

function failedRun(overrides: Partial<JudgeRun> = {}): JudgeRun {
  return {
    run_id: 'run-1',
    source: 'live',
    state: 'FAILED',
    attempt: 1,
    created_at: '2026-09-21T00:00:00Z',
    completed_at: '2026-09-21T00:00:05Z',
    latency_ms: 900,
    documents: [SI_DOC, BL_DOC],
    outcome: null,
    field_verdicts: [],
    diagnostics: [],
    failure: { code: 'provider_timeout', retryable: true, message: 'The comparison provider timed out.' },
    ...overrides
  }
}

describe('FailurePanel', () => {
  it('discloses the failure, the kept upload names, and a retry control, in order', () => {
    render(<FailurePanel run={failedRun()} onRetry={vi.fn()} retrying={false} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The live check did not finish')
    expect(screen.getByText('The comparison provider timed out.')).toBeInTheDocument()
    expect(screen.getByText('Your upload is kept: si.txt and bl.txt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry live check' })).toBeEnabled()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<FailurePanel run={failedRun()} onRetry={onRetry} retrying={false} />)

    await user.click(screen.getByRole('button', { name: 'Retry live check' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables the retry button while a retry is in flight', () => {
    render(<FailurePanel run={failedRun()} onRetry={vi.fn()} retrying={true} />)
    expect(screen.getByRole('button', { name: 'Retry live check' })).toBeDisabled()
  })

  it('hides the retry button and explains when the failure is not retryable', () => {
    const notRetryable = failedRun({
      failure: { code: 'permanent_rejection', retryable: false, message: 'The provider rejected this document pair.' }
    })
    render(<FailurePanel run={notRetryable} onRetry={vi.fn()} retrying={false} />)

    expect(screen.queryByRole('button', { name: 'Retry live check' })).not.toBeInTheDocument()
    expect(screen.getByText('This failure cannot be retried; try again later.')).toBeInTheDocument()
  })
})
