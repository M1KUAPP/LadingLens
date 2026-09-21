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
  const [pending, setPending] = useState<Set<ArtifactKey>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(key: ArtifactKey, path: string, fileName: string) {
    setError(null)
    setPending((prev) => new Set(prev).add(key))
    try {
      await downloadArtifact(path, fileName)
    } catch {
      setError(DOWNLOAD_ERROR_MESSAGE)
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <section className="demo-artifacts" aria-label="Demo artifacts">
      <h2 className="demo-artifacts-heading">Demo artifacts</h2>
      <div className="demo-artifacts-downloads">
        <Button
          variant="secondary"
          disabled={pending.has('submission')}
          onClick={() => handleDownload('submission', '/api/artifacts/submission.json', 'submission.json')}
        >
          Download submission JSON
        </Button>
        <Button
          variant="secondary"
          disabled={pending.has('csv')}
          onClick={() => handleDownload('csv', '/api/artifacts/expected-shipments.csv', 'expected-shipments.csv')}
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
        <Link to="/reconciliation">Open reconciliation</Link>
        <Link to={`/emails/${encodeURIComponent(exampleId ?? 'email_004')}`}>Open the example case</Link>
      </nav>
    </section>
  )
}
