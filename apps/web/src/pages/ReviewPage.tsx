import { useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon'
import { Button } from '../components/ui/Controls'
import { PageHead } from '../components/ui/PageHead'
import { ReconciliationView } from '../features/reconciliation/ReconciliationView'
import { ReviewQueueView } from '../features/review-queue/ReviewQueueView'
import './review-page.css'

type ReviewTab = 'queue' | 'reconciliation'

const TABS: { key: ReviewTab; label: string }[] = [
  { key: 'queue', label: 'Review queue' },
  { key: 'reconciliation', label: 'Reconciliation' }
]

function readTab(value: string | null): ReviewTab {
  return value === 'reconciliation' ? 'reconciliation' : 'queue'
}

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [queueCount, setQueueCount] = useState<number | null>(null)
  const [reconciliationCount, setReconciliationCount] = useState<number | null>(null)

  const active = readTab(searchParams.get('tab'))
  const counts: Record<ReviewTab, number | null> = {
    queue: queueCount,
    reconciliation: reconciliationCount
  }

  function selectTab(tab: ReviewTab) {
    if (tab !== active) setSearchParams({ tab })
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1
    const next =
      event.key === 'ArrowRight'
        ? index + 1
        : event.key === 'ArrowLeft'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    const target = (next + TABS.length) % TABS.length
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[target]?.focus()
    selectTab(TABS[target].key)
  }

  return (
    <div className="page">
      <PageHead
        icon={FileValidationIcon}
        title="Review queue"
        supporting="Held cases and reconciliation exceptions awaiting a decision."
        hintLabel="About the review views"
        hint={
          <span>
            Two working sets live here: held cases and reconciliation exceptions awaiting a named human owner, and the
            expected-shipment ledger behind them.
          </span>
        }
      />
      <div className="review-tabs" role="tablist" aria-label="Review views">
        {TABS.map((tab, index) => {
          const selected = tab.key === active
          const count = counts[tab.key]
          return (
            <Button
              key={tab.key}
              variant={selected ? 'secondary' : 'ghost'}
              className="review-tab"
              role="tab"
              id={`review-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`review-panel-${tab.key}`}
              aria-label={count !== null ? `${tab.label} (${count})` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.key)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {tab.label}
              {count !== null ? <span className="review-tab-count">{count}</span> : null}
            </Button>
          )
        })}
      </div>

      <div role="tabpanel" id="review-panel-queue" aria-labelledby="review-tab-queue" hidden={active !== 'queue'}>
        <ReviewQueueView onCountChange={setQueueCount} />
      </div>
      <div
        role="tabpanel"
        id="review-panel-reconciliation"
        aria-labelledby="review-tab-reconciliation"
        hidden={active !== 'reconciliation'}
      >
        <ReconciliationView onCountChange={setReconciliationCount} onEscalateMissingCase={() => selectTab('queue')} />
      </div>
    </div>
  )
}
