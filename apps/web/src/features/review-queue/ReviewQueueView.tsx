import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Field } from '../../components/ui/Controls'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { subjectLabel } from '../../data/inbox-labels'
import { pageOf } from '../../lib/paging'
import { itemIdentifier } from './components/item-labels'
import { ReviewQueueDetail } from './components/ReviewQueueDetail'
import { ReviewQueueTable } from './components/ReviewQueueTable'
import { defaultReviewQueueService, type ReviewQueueService } from './seam'
import type { ReconciliationExceptionActionInput, ReviewQueueItem } from './types'
import './review-queue.css'

const DETAIL_ID = 'review-queue-detail'

type SortOrder = 'queue' | 'asc' | 'desc'

const SORT_OPTIONS = [
  { value: 'queue', label: 'Queue order' },
  { value: 'asc', label: 'ID ascending' },
  { value: 'desc', label: 'ID descending' }
]

/** The IDs a row shows in its item cell: its own, then its email or subject. */
function itemIds(item: ReviewQueueItem): string[] {
  return item.kind === 'case' ? [item.case_id, item.email_id] : [item.reconciliation_id, subjectLabel(item.subject_key)]
}

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

export function ReviewQueueView({ service = defaultReviewQueueService }: { service?: ReviewQueueService }) {
  const [state, setState] = useState<QueueState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<SortOrder>('queue')
  const [page, setPage] = useState(1)
  const [loadedService, setLoadedService] = useState(service)
  if (loadedService !== service) {
    setLoadedService(service)
    setState({ status: 'loading' })
    setSelectedId(null)
    setPage(1)
  }

  useEffect(() => {
    let cancelled = false
    service
      .getQueueItems()
      .then((items) => {
        if (cancelled) return
        setState({ status: 'ready', items })
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
  }, [service])

  function handleToggle(item: ReviewQueueItem) {
    setSelectedId((current) => (current === item.item_id ? null : item.item_id))
  }

  function turnPage(next: number) {
    setPage(next)
    // The detail belongs to a row on screen, so it closes with its page.
    setSelectedId(null)
  }

  const applyQuery = (value: string) => {
    setQuery(value)
    turnPage(1)
  }
  const applyOrder = (value: string) => {
    setOrder(value as SortOrder)
    turnPage(1)
  }

  async function handleExceptionAction(input: ReconciliationExceptionActionInput) {
    await service.submitReconciliationAction(input)
    const items = await service.getQueueItems()
    setState({ status: 'ready', items })
  }

  const items = state.status === 'ready' ? state.items : []
  const term = query.trim().toLowerCase()
  const matching = term ? items.filter((item) => itemIds(item).some((id) => id.toLowerCase().includes(term))) : items
  const visible =
    order === 'queue'
      ? matching
      : [...matching].sort((a, b) => {
          const cmp = itemIdentifier(a).localeCompare(itemIdentifier(b), undefined, { numeric: true })
          return order === 'asc' ? cmp : -cmp
        })
  const { page: current, rows: pageItems } = pageOf(visible, page)
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
          <div className="rq-controls">
            <div className="rq-search">
              <Field
                type="search"
                label="Search by ID"
                value={query}
                placeholder="email_507"
                onChange={(event: ChangeEvent<HTMLInputElement>) => applyQuery(event.target.value)}
              />
            </div>
            <Select label="Sort" value={order} options={SORT_OPTIONS} onChange={applyOrder} />
          </div>
          {visible.length === 0 ? (
            <div className="rq-empty">
              <p className="rq-empty-title">No items match the search.</p>
              <p className="rq-empty-body">Clear the search to see the whole queue.</p>
            </div>
          ) : (
            <ReviewQueueTable
              items={pageItems}
              selectedId={selectedId}
              detailId={DETAIL_ID}
              onToggle={handleToggle}
              footer={
                <Pagination label="Review queue pages" page={current} total={visible.length} onPageChange={turnPage} />
              }
            />
          )}
          {selected && (
            <ReviewQueueDetail item={selected} detailId={DETAIL_ID} onExceptionAction={handleExceptionAction} />
          )}
        </>
      )}
    </div>
  )
}
