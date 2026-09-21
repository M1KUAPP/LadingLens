import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DemoArtifacts } from './DemoArtifacts'

function renderDemoArtifacts(exampleId?: string) {
  const downloadArtifact = vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <DemoArtifacts downloadArtifact={downloadArtifact} exampleId={exampleId} />
    </MemoryRouter>
  )
  return { downloadArtifact }
}

describe('DemoArtifacts', () => {
  it('downloads the submission JSON through the artifact path and file name', async () => {
    const user = userEvent.setup()
    const { downloadArtifact } = renderDemoArtifacts()

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))

    expect(downloadArtifact).toHaveBeenCalledWith('/api/artifacts/submission.json', 'submission.json')
  })

  it('downloads the synthetic CSV through the artifact path and file name', async () => {
    const user = userEvent.setup()
    const { downloadArtifact } = renderDemoArtifacts()

    await user.click(screen.getByRole('button', { name: 'Download synthetic CSV' }))

    expect(downloadArtifact).toHaveBeenCalledWith('/api/artifacts/expected-shipments.csv', 'expected-shipments.csv')
  })

  it('links to the inbox and to reconciliation review', () => {
    renderDemoArtifacts()

    expect(screen.getByRole('link', { name: 'Open the inbox' })).toHaveAttribute('href', '/inbox')
    expect(screen.getByRole('link', { name: 'Open reconciliation' })).toHaveAttribute('href', '/reconciliation')
  })

  it('links the example case to email_004 when no fallback id is known', () => {
    renderDemoArtifacts()

    expect(screen.getByRole('link', { name: 'Open the example case' })).toHaveAttribute('href', '/emails/email_004')
  })

  it('links the example case to the given fallback id when known', () => {
    renderDemoArtifacts('email_009')

    expect(screen.getByRole('link', { name: 'Open the example case' })).toHaveAttribute('href', '/emails/email_009')
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
    render(
      <MemoryRouter>
        <DemoArtifacts downloadArtifact={downloadArtifact} />
      </MemoryRouter>
    )

    const submissionButton = screen.getByRole('button', { name: 'Download submission JSON' })
    await user.click(submissionButton)
    expect(submissionButton).toBeDisabled()

    resolveDownload()
    await waitFor(() => expect(submissionButton).toBeEnabled())
  })

  it('tracks each download independently: a second download starting before the first settles does not re-enable the first button', async () => {
    const user = userEvent.setup()
    let resolveSubmission!: () => void
    let resolveCsv!: () => void
    const downloadArtifact = vi.fn((path: string) => {
      if (path === '/api/artifacts/submission.json') {
        return new Promise<void>((resolve) => {
          resolveSubmission = resolve
        })
      }
      return new Promise<void>((resolve) => {
        resolveCsv = resolve
      })
    })
    render(
      <MemoryRouter>
        <DemoArtifacts downloadArtifact={downloadArtifact} />
      </MemoryRouter>
    )

    const submissionButton = screen.getByRole('button', { name: 'Download submission JSON' })
    const csvButton = screen.getByRole('button', { name: 'Download synthetic CSV' })

    await user.click(submissionButton)
    await user.click(csvButton)
    expect(submissionButton).toBeDisabled()
    expect(csvButton).toBeDisabled()

    resolveCsv()
    await waitFor(() => expect(csvButton).toBeEnabled())
    expect(submissionButton).toBeDisabled()

    resolveSubmission()
    await waitFor(() => expect(submissionButton).toBeEnabled())

    expect(downloadArtifact).toHaveBeenCalledTimes(2)
  })

  it('shows a plain-language alert when a download rejects, clearing it on the next attempt', async () => {
    const user = userEvent.setup()
    const downloadArtifact = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
    render(
      <MemoryRouter>
        <DemoArtifacts downloadArtifact={downloadArtifact} />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The download did not start. Try again.')

    await user.click(screen.getByRole('button', { name: 'Download submission JSON' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no alert after a successful download', async () => {
    const user = userEvent.setup()
    const { downloadArtifact } = renderDemoArtifacts()

    await user.click(screen.getByRole('button', { name: 'Download synthetic CSV' }))

    expect(downloadArtifact).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
