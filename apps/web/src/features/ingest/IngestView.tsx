import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import { Button } from '../../components/ui/Controls'
import { DropZone } from '../../components/ui/Domain'
import { Tooltip } from '../../components/ui/Overlays'
import { REVIEW_REASON_LABEL, STATUS_LABEL } from '../../data/inbox-labels'
import { BatchBayMap } from './components/BatchBayMap'
import { BatchProgress } from './components/BatchProgress'
import { ConfidenceGauge } from './components/ConfidenceGauge'
import { BundleReadError, countStates, defaultIngestSource, ITEM_STATE_LABEL, type IngestSource } from './seam'
import type { IngestBatch, IngestItem, IngestItemState } from './types'
import './ingest.css'

const PAGE_SIZE = 20
const BUNDLE_MAX_BYTES = 30 * 1_000_000
const TILE_STATES: IngestItemState[] = ['processed', 'held', 'failed', 'queued']

const EMPTY_GROUP: Record<IngestItemState, string> = {
  processed: 'No processed items in this batch.',
  held: 'No items are held for review in this batch.',
  failed: 'No failed items in this batch.',
  queued: 'No waiting items in this batch.'
}

function fileCountLabel(item: IngestItem): string {
  if (item.documents === 0) return 'No files'
  if (item.expectedDocuments !== null) {
    return `${item.documents} of ${item.expectedDocuments} files`
  }
  return `${item.documents} ${item.documents === 1 ? 'file' : 'files'}`
}

function IngestRow({ item }: { item: IngestItem }) {
  return (
    <tr>
      <td data-label="Item">
        <span className="ingest-item">
          {item.state === 'processed' ? (
            <Link className="ingest-item-id type-data-md" to={`/emails/${encodeURIComponent(item.id)}`}>
              {item.id}
            </Link>
          ) : (
            <span className="ingest-item-id type-data-md">{item.id}</span>
          )}
          <span className="ingest-item-subject">{item.subject}</span>
        </span>
      </td>
      <td data-label="Files">
        <span className="type-data-sm">{fileCountLabel(item)}</span>
      </td>
      <td data-label="State">
        <span className="ingest-state" data-state={item.state}>
          {ITEM_STATE_LABEL[item.state]}
        </span>
      </td>
      <td data-label="Detail">
        {item.state === 'held' ? (
          <span className="ingest-detail">
            <span>{item.reviewReason ? REVIEW_REASON_LABEL[item.reviewReason] : 'Needs a person'}</span>
            <Link className="ingest-row-link" to="/review">
              Open in review queue
            </Link>
          </span>
        ) : null}
        {item.state === 'processed' && item.outcome ? (
          <span className="ingest-detail">{STATUS_LABEL[item.outcome]}</span>
        ) : null}
        {item.state === 'failed' ? <span className="ingest-detail">{item.failure ?? 'Processing failed.'}</span> : null}
        {item.state === 'queued' ? <span className="ingest-detail">Waiting to be classified</span> : null}
      </td>
      <td data-label="Confidence">
        {item.confidence !== null ? (
          <ConfidenceGauge value={item.confidence} />
        ) : (
          <span className="ingest-noscore type-data-sm">No score</span>
        )}
      </td>
    </tr>
  )
}

function Tile({
  state,
  label,
  count,
  share,
  active,
  onSelect
}: {
  state: string
  label: string
  count: number
  share: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" className="ingest-tile" data-state={state} aria-pressed={active} onClick={onSelect}>
      <span className="ingest-tile-label">
        <span className="ingest-tile-swatch" aria-hidden="true" />
        {label}
      </span>
      <span className="ingest-tile-count type-data-md">{count}</span>
      <span className="ingest-tile-share type-data-xs">{share}</span>
    </button>
  )
}

export function IngestView({ source = defaultIngestSource }: { source?: IngestSource }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadedBatches, setLoadedBatches] = useState<IngestBatch[]>([])
  const [stagedBatches, setStagedBatches] = useState<IngestBatch[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tile, setTile] = useState<IngestItemState | 'all'>('all')
  const [page, setPage] = useState(1)
  const [staged, setStaged] = useState<IngestBatch | null>(null)
  const [stageError, setStageError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    source
      .loadBatches()
      .then((loaded) => {
        if (!live) return
        setLoadedBatches(loaded)
        setPhase('ready')
      })
      .catch((error: unknown) => {
        if (!live) return
        setLoadError(error instanceof Error ? error.message : 'The batches could not be read.')
        setPhase('error')
      })
    return () => {
      live = false
    }
  }, [source])

  const batches = [...loadedBatches, ...stagedBatches]
  const selected = batches.find((entry) => entry.id === selectedId) ?? batches[0] ?? null
  const counts = selected ? countStates(selected.items) : null
  const visible =
    selected && tile !== 'all' ? selected.items.filter((entry) => entry.state === tile) : (selected?.items ?? [])
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * PAGE_SIZE
  const pageItems = visible.slice(start, start + PAGE_SIZE)
  const totalEmails = batches.reduce((sum, entry) => sum + entry.items.length, 0)

  function selectBatch(id: string) {
    setSelectedId(id)
    setTile('all')
    setPage(1)
  }

  function selectTile(next: IngestItemState | 'all') {
    setTile(next)
    setPage(1)
  }

  function onFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    setStageError(null)
    file
      .text()
      .then((contents) => {
        try {
          setStaged(source.stageBundle(file.name, contents))
        } catch (error) {
          setStaged(null)
          setStageError(error instanceof BundleReadError ? error.message : `${file.name} could not be read.`)
        }
      })
      .catch(() => {
        setStaged(null)
        setStageError(`${file.name} could not be read.`)
      })
  }

  function commitStaged() {
    if (!staged) return
    setStagedBatches((previous) => [...previous, staged])
    setSelectedId(staged.id)
    setTile('all')
    setPage(1)
    setStaged(null)
  }

  return (
    <div className="ingest">
      <div className="ingest-side">
        <section className="ingest-upload" aria-labelledby="ingest-upload-title">
          <h2 className="ingest-upload-title" id="ingest-upload-title">
            New batch
            <Tooltip label="About uploading bundles">
              <span>
                Drop a mail bundle JSON file to stage it. Staged bundles join the batch list; this demo does not
                classify them.
              </span>
            </Tooltip>
          </h2>
          <p className="ingest-upload-summary">
            <span className="type-data-sm">{batches.length}</span> {batches.length === 1 ? 'batch' : 'batches'}
            {' · '}
            <span className="type-data-sm">{totalEmails}</span> {totalEmails === 1 ? 'email' : 'emails'}
          </p>
          <DropZone
            label="Mail bundle file"
            formats={['json']}
            maxBytes={BUNDLE_MAX_BYTES}
            multiple={false}
            onFiles={onFiles}
          />
          {stageError ? (
            <p className="ingest-stage-error" role="alert">
              {stageError}
            </p>
          ) : null}
          {staged ? (
            <p className="ingest-staged">
              <span className="type-data-sm">{staged.name}</span>
              {' · '}
              {staged.items.length} {staged.items.length === 1 ? 'email' : 'emails'} found
            </p>
          ) : null}
          <Button variant="primary" className="ingest-add" disabled={!staged} onClick={commitStaged}>
            Add batch
          </Button>
          <p className="ingest-upload-note">Uploaded bundles are staged only. This demo does not classify them.</p>
        </section>

        <div className="ingest-batches" role="group" aria-label="Batches">
          {batches.map((entry) => {
            const entryCounts = countStates(entry.items)
            return (
              <button
                key={entry.id}
                type="button"
                className="ingest-batch-card"
                aria-pressed={entry.id === selected?.id}
                onClick={() => selectBatch(entry.id)}
              >
                <span className="ingest-batch-name">{entry.name}</span>
                <span className="ingest-batch-size type-data-sm">
                  {entryCounts.total} {entryCounts.total === 1 ? 'email' : 'emails'}
                </span>
                <span className="ingest-batch-counts type-data-xs">
                  {entryCounts.queued === entryCounts.total
                    ? `${entryCounts.queued} waiting`
                    : `${entryCounts.processed} processed · ${entryCounts.held} held · ${entryCounts.failed} failed`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="ingest-panel" aria-labelledby="ingest-panel-title">
        {phase === 'loading' ? (
          <p className="ingest-loading" role="status">
            Loading batches…
          </p>
        ) : null}
        {phase === 'error' ? (
          <p className="ingest-error" role="alert">
            {loadError}
          </p>
        ) : null}
        {phase === 'ready' && !selected ? (
          <p className="ingest-empty">No batches yet. Drop a mail bundle to stage the first one.</p>
        ) : null}
        {phase === 'ready' && selected && counts ? (
          <>
            <header className="ingest-panel-head">
              <div className="ingest-panel-heading">
                <h2 className="ingest-panel-title" id="ingest-panel-title">
                  {selected.name}
                  <Tooltip label="About confidence">
                    <span>
                      Confidence is the recorded probability behind an item's outcome. Below 30% counts as a clear
                      difference, 30 to 85% goes to a person, and 85% and above is accepted automatically. Items without
                      a recorded probability show No score.
                    </span>
                  </Tooltip>
                </h2>
                {selected.note ? <p className="ingest-batch-note">{selected.note}</p> : null}
              </div>
              <BatchProgress counts={counts} />
              {counts.held > 0 ? (
                <p className="ingest-handoff">
                  <Link className="ingest-handoff-link" to="/review">
                    {counts.held} {counts.held === 1 ? 'item is' : 'items are'} waiting for a person. Open the review
                    queue
                  </Link>
                </p>
              ) : null}
            </header>

            <div className="ingest-tiles" role="group" aria-label="Show items by state">
              <Tile
                state="all"
                label="All items"
                count={counts.total}
                share="every email in this batch"
                active={tile === 'all'}
                onSelect={() => selectTile('all')}
              />
              {TILE_STATES.map((state) => {
                const count = counts[state]
                const share = counts.total ? Math.round((count / counts.total) * 100) : 0
                return (
                  <Tile
                    key={state}
                    state={state}
                    label={ITEM_STATE_LABEL[state]}
                    count={count}
                    share={`${share}% of this batch`}
                    active={tile === state}
                    onSelect={() => selectTile(state)}
                  />
                )
              })}
            </div>

            <BatchBayMap items={selected.items} focus={tile} />

            {pageItems.length === 0 ? (
              <p className="ingest-empty-group">{tile === 'all' ? 'This batch has no items.' : EMPTY_GROUP[tile]}</p>
            ) : (
              <div className="ingest-table-card">
                <div className="ingest-scroll">
                  <table className="ingest-table">
                    <thead>
                      <tr>
                        <th scope="col" className="type-data-xs">
                          Item
                        </th>
                        <th scope="col" className="type-data-xs">
                          Files
                        </th>
                        <th scope="col" className="type-data-xs">
                          State
                        </th>
                        <th scope="col" className="type-data-xs">
                          Detail
                        </th>
                        <th scope="col" className="type-data-xs">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((entry) => (
                        <IngestRow key={entry.id} item={entry} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 ? (
                  <nav className="ingest-pagination" aria-label="Batch pages">
                    <Button variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
                      Previous
                    </Button>
                    <span className="ingest-range type-data-sm">
                      {start + 1}-{start + pageItems.length} of {visible.length}
                    </span>
                    <Button variant="secondary" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                      Next
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
                    </Button>
                  </nav>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
