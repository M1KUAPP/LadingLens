import type { IngestCounts } from '../types'
import './batch-progress.css'

// Batch progress is a count of items in each terminal state, drawn as a
// segmented share bar. It is deliberately not a probability gauge: segments
// are coloured by state and the reading is always stated as counts of items.
export function BatchProgress({ counts }: { counts: IngestCounts }) {
  const segments: { state: 'processed' | 'held' | 'failed' | 'queued'; count: number }[] = [
    { state: 'processed', count: counts.processed },
    { state: 'held', count: counts.held },
    { state: 'failed', count: counts.failed },
    { state: 'queued', count: counts.queued }
  ]
  return (
    <div className="batch-progress">
      <p className="batch-progress-text">
        <span className="type-data-md">{counts.processed} of {counts.total}</span> processed
        {counts.held > 0 ? (
          <>
            {' · '}
            <span className="type-data-md">{counts.held}</span> held for review
          </>
        ) : null}
        {counts.failed > 0 ? (
          <>
            {' · '}
            <span className="type-data-md">{counts.failed}</span> failed
          </>
        ) : null}
        {counts.queued > 0 ? (
          <>
            {' · '}
            <span className="type-data-md">{counts.queued}</span> waiting
          </>
        ) : null}
      </p>
      <div
        className="batch-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={counts.total}
        aria-valuenow={counts.processed}
        aria-label="Emails processed"
      >
        {segments.map(({ state, count }) =>
          count > 0 ? (
            <span
              key={state}
              className={`batch-progress-segment batch-progress-segment--${state}`}
              style={{ width: `${(count / counts.total) * 100}%` }}
              aria-hidden="true"
            />
          ) : null
        )}
      </div>
    </div>
  )
}
