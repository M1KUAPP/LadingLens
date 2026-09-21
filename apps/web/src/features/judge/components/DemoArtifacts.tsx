import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Controls'

type DemoArtifactsProps = {
  downloadArtifact: (path: string, fileName: string) => Promise<void>
  exampleId?: string
}

const DOWNLOAD_ERROR_MESSAGE = 'The download did not start. Try again.'

type ArtifactKey = 'submission' | 'csv'

export function DemoArtifacts({ downloadArtifact, exampleId }: DemoArtifactsProps) {
  const [pending, setPending] = useState<ArtifactKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(key: ArtifactKey, path: string, fileName: string) {
    setError(null)
    setPending(key)
    try {
      await downloadArtifact(path, fileName)
    } catch {
      setError(DOWNLOAD_ERROR_MESSAGE)
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="demo-artifacts" aria-label="Demo artifacts">
      <h2 className="demo-artifacts-heading">Demo artifacts</h2>
      <div className="demo-artifacts-downloads">
        <Button
          variant="secondary"
          disabled={pending === 'submission'}
          onClick={() => handleDownload('submission', '/api/artifacts/submission.json', 'submission.json')}
        >
          Download submission JSON
        </Button>
        <Button
          variant="secondary"
          disabled={pending === 'csv'}
          onClick={() =>
            handleDownload('csv', '/api/artifacts/expected-shipments.csv', 'expected-shipments.csv')
          }
        >
          Download synthetic CSV
        </Button>
      </div>
      {error && (
        <p role="alert" className="demo-artifacts-error">
          {error}
        </p>
      )}
      <nav className="demo-artifacts-links" aria-label="Demo links">
        <Link to="/inbox">Open the inbox</Link>
        <Link to="/review?tab=reconciliation">Open reconciliation</Link>
        <Link to={`/emails/${encodeURIComponent(exampleId ?? 'email_004')}`}>Open the example case</Link>
      </nav>
    </section>
  )
}
