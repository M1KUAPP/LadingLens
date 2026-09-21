import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('link', { name: 'Open reconciliation' })).toHaveAttribute(
      'href',
      '/review?tab=reconciliation'
    )
  })

  it('links the example case to email_004 when no fallback id is known', () => {
    renderDemoArtifacts()

    expect(screen.getByRole('link', { name: 'Open the example case' })).toHaveAttribute('href', '/emails/email_004')
  })

  it('links the example case to the given fallback id when known', () => {
    renderDemoArtifacts('email_009')

    expect(screen.getByRole('link', { name: 'Open the example case' })).toHaveAttribute('href', '/emails/email_009')
  })
})
