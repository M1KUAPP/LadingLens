import { Button } from '../../../components/ui/Controls'
import type { JudgeRun } from '../types'

type FailurePanelProps = {
  run: JudgeRun
  onRetry: () => void
  retrying: boolean
}

export function FailurePanel({ run, onRetry, retrying }: FailurePanelProps) {
  const failure = run.failure
  const si = run.documents.find((doc) => doc.slot === 'si_file')
  const draftBl = run.documents.find((doc) => doc.slot === 'draft_bl_file')

  return (
    <div className="failure-panel">
      <h2 role="alert" className="failure-panel-heading">
        The live check did not finish
      </h2>
      <p className="failure-panel-message">{failure?.message}</p>
      <p className="failure-panel-files">{`Your upload is kept: ${si?.file_name} and ${draftBl?.file_name}`}</p>
      {failure?.retryable === false ? (
        <p className="failure-panel-no-retry">This failure cannot be retried; try again later.</p>
      ) : (
        <Button variant="primary" onClick={onRetry} disabled={retrying}>
          Retry live check
        </Button>
      )}
    </div>
  )
}
