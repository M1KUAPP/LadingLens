import { useEffect, useState } from 'react'
import { ReviewQueueDetail } from './components/ReviewQueueDetail'
import { ReviewQueueTable } from './components/ReviewQueueTable'
import { defaultReviewQueueService, type ReviewQueueService } from './seam'
import type { ReconciliationExceptionActionInput, ReviewQueueItem } from './types'
import './review-queue.css'

const DETAIL_ID = 'review-queue-detail'

type QueueState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: ReviewQueueItem[] }

function ReviewQueueLoading() {
  return (
    <div className="rq-loading" role="status" aria-label="Loading review queue">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="rq-skeleton-row" key={index}>
          <span className="rq-skeleton-bar rq-skeleton-bar--id" />
          <span className="rq-skeleton-bar" />
          <span className="rq-skeleton-bar rq-skeleton-bar--badge" />
          <span className="rq-skeleton-bar rq-skeleton-bar--badge" />
        </div>
      ))}
      <span className="rq-skeleton-note">Loading prepared review queue.</span>
    </div>
  )
}

function ReviewQueueError({ message }: { message: string }) {
  return (
    <div className="rq-error" role="alert">
      <h2 className="type-heading-sm">The review queue could not be loaded</h2>
      <p className="rq-error-message type-data-sm">{message}</p>
    </div>
  )
}

export function ReviewQueueView({
  service = defaultReviewQueueService,
  onCountChange
}: {
  service?: ReviewQueueService
  onCountChange?: (count: number) => void
}) {
  const [state, setState] = useState<QueueState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadedService, setLoadedService] = useState(service)
  if (loadedService !== service) {
    setLoadedService(service)
    setState({ status: 'loading' })
    setSelectedId(null)
  }

  useEffect(() => {
    let cancelled = false
    service
      .getQueueItems()
      .then((items) => {
        if (cancelled) return
        setState({ status: 'ready', items })
        onCountChange?.(items.length)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    return () => {
      cancelled = true
    }
  }, [service, onCountChange])

  function handleToggle(item: ReviewQueueItem) {
    setSelectedId((current) => (current === item.item_id ? null : item.item_id))
  }

  async function handleExceptionAction(input: ReconciliationExceptionActionInput) {
    await service.submitReconciliationAction(input)
    const items = await service.getQueueItems()
    setState({ status: 'ready', items })
    onCountChange?.(items.length)
  }

  const items = state.status === 'ready' ? state.items : []
  const selected = items.find((item) => item.item_id === selectedId)
  const caseCount = items.filter((item) => item.kind === 'case').length
  const exceptionCount = items.length - caseCount

  return (
    <div className="review-queue">
      {state.status === 'loading' && <ReviewQueueLoading />}
      {state.status === 'error' && <ReviewQueueError message={state.message} />}
      {state.status === 'ready' && items.length === 0 && (
        <div className="rq-empty">
          <p className="rq-empty-title">The review queue is empty</p>
          <p className="rq-empty-body">Held cases and reconciliation exceptions appear here when they need a human.</p>
        </div>
      )}
      {state.status === 'ready' && items.length > 0 && (
        <>
          <dl className="rq-metrics">
            <div className="rq-metric">
              <dt className="rq-metric-label">Held cases</dt>
              <dd className="rq-metric-value">{caseCount}</dd>
            </div>
            <div className="rq-metric">
              <dt className="rq-metric-label">Exceptions</dt>
              <dd className="rq-metric-value">{exceptionCount}</dd>
            </div>
          </dl>
          <ReviewQueueTable items={items} selectedId={selectedId} detailId={DETAIL_ID} onToggle={handleToggle} />
          {selected && (
            <ReviewQueueDetail item={selected} detailId={DETAIL_ID} onExceptionAction={handleExceptionAction} />
          )}
        </>
      )}
    </div>
  )
}
