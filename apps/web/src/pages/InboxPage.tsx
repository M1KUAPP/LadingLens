import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon'
import { Button, Field } from '../components/ui/Controls'
import { Scrollbar, StatusPill } from '../components/ui/Domain'
import { PageHead } from '../components/ui/PageHead'
import { Select } from '../components/ui/Select'
import { CASE_STATUSES, CATEGORIES, summarizeInbox } from '../data/inbox-integrity'
import { CATEGORY_LABEL, REVIEW_REASON_LABEL, STATUS_KIND, STATUS_LABEL } from '../data/inbox-labels'
import { fixtureInboxSource } from '../data/inbox-source'
import { useInboxDataset } from '../data/use-inbox-dataset'
import type { InboxDataset, InboxRow, InboxSource } from '../data/inbox-types'
import { InboxBay } from './InboxBay'
import './inbox-page.css'

const PAGE_SIZE = 50

function CategoryBadge({ row }: { row: InboxRow }) {
  const held = row.outcome.status === 'NEEDS_REVIEW'
  return (
    <span className="category-badge" data-channel={held ? 'held' : 'routed'}>
      {CATEGORY_LABEL[row.outcome.category]}
    </span>
  )
}

function InboxRowView({ row }: { row: InboxRow }) {
  const outcome = row.outcome
  return (
    <tr>
      <td data-label="ID">
        <Link className="inbox-id type-data-md" to={`/emails/${encodeURIComponent(row.email_id)}`}>
          {row.email_id}
        </Link>
      </td>
      <td data-label="Subject">
        <span className="inbox-subject">{row.subject}</span>
      </td>
      <td data-label="Category">
        <CategoryBadge row={row} />
      </td>
      <td data-label="Status">
        <span className="inbox-status-cell">
          <StatusPill status={STATUS_KIND[outcome.status]}>{STATUS_LABEL[outcome.status]}</StatusPill>
          {outcome.review_reason ? (
            <span className="inbox-reason type-data-sm">{REVIEW_REASON_LABEL[outcome.review_reason]}</span>
          ) : null}
        </span>
      </td>
    </tr>
  )
}

function InboxLoading() {
  return (
    <div className="inbox-loading" role="status" aria-label="Loading inbox">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="inbox-skeleton-row" key={index}>
          <span className="inbox-skeleton-bar inbox-skeleton-bar--id" />
          <span className="inbox-skeleton-bar" />
          <span className="inbox-skeleton-bar inbox-skeleton-bar--badge" />
          <span className="inbox-skeleton-bar inbox-skeleton-bar--badge" />
        </div>
      ))}
      <span className="inbox-skeleton-note">Loading prepared inbox data.</span>
    </div>
  )
}

function InboxError({ problems }: { problems: string[] }) {
  return (
    <div className="inbox-error" role="alert">
      <h2 className="type-heading-sm">The prepared inbox data could not be verified</h2>
      <p>No accounting summary or submission artifact is shown until the prepared data verifies.</p>
      <ul className="inbox-error-list">
        {problems.map((problem) => (
          <li className="type-data-sm" key={problem}>
            {problem}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InboxBoard({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return dataset.rows
      .filter((row) => {
        if (term && !row.email_id.toLowerCase().includes(term)) return false
        if (category !== 'all' && row.outcome.category !== category) {
          return false
        }
        if (status !== 'all' && row.outcome.status !== status) return false
        return true
      })
      .sort((a, b) => {
        const cmp = a.email_id.localeCompare(b.email_id, undefined, { numeric: true })
        return direction === 'asc' ? cmp : -cmp
      })
  }, [dataset.rows, query, category, status, direction])

  const matchingIds = useMemo(() => new Set(filtered.map((row) => row.email_id)), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  const applyQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }
  const applyCategory = (value: string) => {
    setCategory(value)
    setPage(1)
  }
  const applyStatus = (value: string) => {
    setStatus(value)
    setPage(1)
  }
  const applyDirection = (value: string) => {
    setDirection(value as 'asc' | 'desc')
    setPage(1)
  }

  return (
    <>
      <div className="inbox-summary">
        <p className="inbox-accounting">
          <span className="inbox-metric">
            <span className="inbox-metric-value">{summary.received}</span>{' '}
            <span className="inbox-metric-label">received</span>
          </span>
          <span className="inbox-accounting-sep">{' / '}</span>
          <span className="inbox-metric">
            <span className="inbox-metric-value">{summary.accountedFor}</span>{' '}
            <span className="inbox-metric-label">accounted for</span>
          </span>
          <span className="inbox-accounting-sep">{' / '}</span>
          <span className="inbox-metric">
            <span className="inbox-metric-value">{summary.lost}</span> <span className="inbox-metric-label">lost</span>
          </span>
        </p>
      </div>
      <InboxBay rows={dataset.rows} matching={matchingIds} />
      <div className="inbox-controls">
        <div className="inbox-search">
          <Field
            type="search"
            label="Search by ID"
            value={query}
            placeholder="email_001"
            onChange={(event: ChangeEvent<HTMLInputElement>) => applyQuery(event.target.value)}
          />
        </div>
        <Select
          label="Category"
          value={category}
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map((value) => ({
              value,
              label: CATEGORY_LABEL[value]
            }))
          ]}
          onChange={applyCategory}
        />
        <Select
          label="Status"
          value={status}
          options={[
            { value: 'all', label: 'All statuses' },
            ...CASE_STATUSES.map((value) => ({
              value,
              label: STATUS_LABEL[value]
            }))
          ]}
          onChange={applyStatus}
        />
        <div className="inbox-toolbar-view">
          <Select
            label="Sort"
            value={direction}
            options={[
              { value: 'asc', label: 'ID ascending' },
              { value: 'desc', label: 'ID descending' }
            ]}
            onChange={applyDirection}
          />
          <Select
            label="Density"
            value={density}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' }
            ]}
            onChange={(next) => setDensity(next as 'comfortable' | 'compact')}
          />
        </div>
      </div>
      <div className="inbox-table-card">
        {pageRows.length === 0 ? (
          <div className="inbox-empty">
            <p className="inbox-empty-title">No emails match the current filters.</p>
            <p className="inbox-empty-text">Clear the search, or choose another category or status.</p>
          </div>
        ) : (
          <>
            <div className="inbox-scroll">
              <Scrollbar label="Inbox emails">
                <table className="inbox-table" data-density={density}>
                  <colgroup>
                    <col className="inbox-col-id" />
                    <col className="inbox-col-subject" />
                    <col className="inbox-col-category" />
                    <col className="inbox-col-status" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="type-data-xs">
                        ID
                      </th>
                      <th scope="col" className="type-data-xs">
                        Subject
                      </th>
                      <th scope="col" className="type-data-xs">
                        Category
                      </th>
                      <th scope="col" className="type-data-xs">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <InboxRowView key={row.email_id} row={row} />
                    ))}
                  </tbody>
                </table>
              </Scrollbar>
            </div>
            <nav className="inbox-pagination" aria-label="Inbox pages">
              <Button variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
                Previous
              </Button>
              <span className="inbox-range type-data-sm">
                {start + 1}-{start + pageRows.length} of {filtered.length}
              </span>
              <Button variant="secondary" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
              </Button>
            </nav>
          </>
        )}
      </div>
    </>
  )
}

export function InboxPage({ source = fixtureInboxSource }: { source?: InboxSource }) {
  const state = useInboxDataset(source)
  return (
    <div className="page">
      <PageHead
        icon={InboxIcon}
        title="Inbox"
        supporting="Every received email with its category and processing status."
        tag="Prepared data"
        hintLabel="Where this inbox data comes from"
        hint={
          <span>
            Demonstration dataset representing operational intake across customer correspondence, shipping instructions,
            and billing inquiries.
          </span>
        }
      />
      {state.status === 'loading' ? <InboxLoading /> : null}
      {state.status === 'error' ? <InboxError problems={state.problems} /> : null}
      {state.status === 'ready' ? <InboxBoard dataset={state.dataset} /> : null}
    </div>
  )
}
