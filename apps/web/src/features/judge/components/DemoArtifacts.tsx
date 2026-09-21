import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Controls'

type DemoArtifactsProps = {
  downloadArtifact: (path: string, fileName: string) => Promise<void>
  exampleId?: string
}

export function DemoArtifacts({ downloadArtifact, exampleId }: DemoArtifactsProps) {
  return (
    <section className="demo-artifacts" aria-label="Demo artifacts">
      <h2 className="demo-artifacts-heading">Demo artifacts</h2>
      <div className="demo-artifacts-downloads">
        <Button
          variant="secondary"
          onClick={() => downloadArtifact('/api/artifacts/submission.json', 'submission.json').catch(() => {})}
        >
          Download submission JSON
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            downloadArtifact('/api/artifacts/expected-shipments.csv', 'expected-shipments.csv').catch(() => {})
          }
        >
          Download synthetic CSV
        </Button>
      </div>
      <nav className="demo-artifacts-links" aria-label="Demo links">
        <Link to="/inbox">Open the inbox</Link>
        <Link to="/review?tab=reconciliation">Open reconciliation</Link>
        <Link to={`/emails/${encodeURIComponent(exampleId ?? 'email_004')}`}>Open the example case</Link>
      </nav>
    </section>
  )
}
