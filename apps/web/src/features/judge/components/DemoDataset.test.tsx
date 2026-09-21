import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GateSummary } from '../types'
import { DemoDataset } from './DemoDataset'

const SUMMARY: GateSummary = {
  seed_version: 'seed-v1',
  source: 'recorded',
  gate1: { received: 20, accounted: 20, by_category: { BL_COMPARISON: 12, SI_REQUEST: 8 } },
  comparison: { OK: 14, MISMATCH: 3, NEEDS_REVIEW: 3 },
  gate2: { shipments: 10, outcomes: { CASE_PRESENT: 8, DOCUMENT_MISSING: 2 } }
}

function renderDemoDataset({
  getGateSummary = vi.fn().mockResolvedValue(SUMMARY),
  downloadArtifact = vi.fn().mockResolvedValue(undefined)
}: {
  getGateSummary?: () => Promise<GateSummary>
  downloadArtifact?: (path: string, fileName: string) => Promise<void>
} = {}) {
  const view = render(<DemoDataset getGateSummary={getGateSummary} downloadArtifact={downloadArtifact} />)
  return { ...view, downloadArtifact }
}

describe('DemoDataset', () => {
  it('holds the gate counts and the submission download in one card, with no links out', async () => {
    renderDemoDataset()
    const card = screen.getByRole('region', { name: 'Demo dataset' })
    expect(await screen.findByText('20 of 20 emails accounted for')).toBeInTheDocument()
    expect(card).toContainElement(screen.getByText('20 of 20 emails accounted for'))
    expect(card).toContainElement(screen.getByRole('button', { name: 'Download submission JSON' }))
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('offers the download, and only the submission, before the summary has loaded', () => {
    const { container } = renderDemoDataset({ getGateSummary: vi.fn(() => new Promise<GateSummary>(() => {})) })
    expect(screen.getByRole('button', { name: 'Download submission JSON' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download synthetic CSV' })).not.toBeInTheDocument()
    expect(container.querySelector('.demo-dataset-gate1')).toBeNull()
  })

  it('shows Gate 1 accounted/received, comparison counts, and Gate 2 outcome counts', async () => {
    renderDemoDataset()

    expect(await screen.findByText('20 of 20 emails accounted for')).toBeInTheDocument()
    expect(screen.getByText('OK (14)')).toBeInTheDocument()
    expect(screen.getByText('MISMATCH (3)')).toBeInTheDocument()
    expect(screen.getByText('NEEDS_REVIEW (3)')).toBeInTheDocument()
    expect(screen.getByText('CASE_PRESENT (8)')).toBeInTheDocument()
    expect(screen.getByText('DOCUMENT_MISSING (2)')).toBeInTheDocument()
  })

  it('uses the singular "email" when exactly one email was received', async () => {
    const singular: GateSummary = {
      ...SUMMARY,
      gate1: { received: 1, accounted: 1, by_category: { BL_COMPARISON: 1 } }
    }
    renderDemoDataset({ getGateSummary: vi.fn().mockResolvedValue(singular) })

    expect(await screen.findByText('1 of 1 email accounted for')).toBeInTheDocument()
  })

  it('shows the source as "Recorded run" for the recorded source, never the raw value', async () => {
    renderDemoDataset()

    expect(await screen.findByText('Recorded run')).toBeInTheDocument()
    expect(screen.queryByText('recorded')).not.toBeInTheDocument()
  })

  it('shows the source as "Prepared baseline" for the prepared source, never the raw value', async () => {
    renderDemoDataset({ getGateSummary: vi.fn().mockResolvedValue({ ...SUMMARY, source: 'prepared' as const }) })

    expect(await screen.findByText('Prepared baseline')).toBeInTheDocument()
    expect(screen.queryByText('prepared')).not.toBeInTheDocument()
  })

  it('never renders a status pill, keeping aggregate counts distinct from a live comparison result', async () => {
    const { container } = renderDemoDataset()

    await screen.findByText('20 of 20 emails accounted for')
    expect(container.querySelector('.status-pill')).toBeNull()
  })

  it('downloads the submission JSON through the artifact path and file name', async () => {
    const user = userEvent.setup()
    const { downloadArtifact } = renderDemoDataset()

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))

    expect(downloadArtifact).toHaveBeenCalledWith('/api/artifacts/submission.json', 'submission.json')
  })

  it('disables the clicked button while its download is in flight, re-enabling it once settled', async () => {
    const user = userEvent.setup()
    let resolveDownload!: () => void
    const downloadArtifact = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDownload = resolve
        })
    )
    renderDemoDataset({ downloadArtifact })

    const submissionButton = screen.getByRole('button', { name: 'Download submission JSON' })
    await user.click(submissionButton)
    expect(submissionButton).toBeDisabled()

    resolveDownload()
    await waitFor(() => expect(submissionButton).toBeEnabled())
  })

  it('shows a plain-language alert when a download rejects, clearing it on the next attempt', async () => {
    const user = userEvent.setup()
    const downloadArtifact = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
    renderDemoDataset({ downloadArtifact })

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The download did not start. Try again.')

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no alert after a successful download', async () => {
    const user = userEvent.setup()
    const { downloadArtifact } = renderDemoDataset()

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))

    expect(downloadArtifact).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
