import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, PointerEvent, ReactNode } from 'react'
import { VerdictCheckGlyph, VerdictCrossGlyph, VerdictDashGlyph, VerdictHoldGlyph } from './Icons'
import type { ProvenanceKind, StatusKind } from './types'
import './domain.css'

const STATUS_LABEL: Record<StatusKind, string> = {
  match: 'Match',
  mismatch: 'Mismatch',
  held: 'Held',
  neutral: 'Not compared'
}

function StatusGlyph({ status }: { status: StatusKind }) {
  const label = STATUS_LABEL[status]
  if (status === 'match') return <VerdictCheckGlyph aria-label={label} />
  if (status === 'mismatch') return <VerdictCrossGlyph aria-label={label} />
  if (status === 'held') return <VerdictHoldGlyph aria-label={label} />
  return <VerdictDashGlyph aria-label={label} />
}

export function StatusPill({ status, children }: { status: StatusKind; children: ReactNode }) {
  return (
    <span className="status-pill" data-status={status}>
      <StatusGlyph status={status} />
      <span className="status-pill-text" data-status={status}>
        {children}
      </span>
    </span>
  )
}

type FieldRowProps = {
  label: string
  left: ReactNode
  right: ReactNode
  status: StatusKind
  statusText?: string
}

export function FieldRow({ label, left, right, status, statusText }: FieldRowProps) {
  return (
    <div className="field-row" data-status={status}>
      <span className="field-row-rail" aria-hidden="true" />
      <span className="field-row-name type-data-xs">{label}</span>
      <span className="field-row-value field-row-value--si">
        <span className="field-row-source">Shipping instruction</span>
        <span className="field-row-data type-data-md">{left}</span>
      </span>
      <span className="field-row-value field-row-value--bl">
        <span className="field-row-source">Draft bill of lading</span>
        <span className="field-row-data type-data-md">{right}</span>
      </span>
      <span className="field-row-status">
        <StatusPill status={status}>{statusText ?? STATUS_LABEL[status]}</StatusPill>
      </span>
    </div>
  )
}

type ScrollbarProps = {
  label: string
  orientation?: 'vertical' | 'horizontal'
  children: ReactNode
}

export function Scrollbar({ label, orientation = 'vertical', children }: ScrollbarProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; grabOffset: number } | null>(null)
  const [thumb, setThumb] = useState({ size: 1, offset: 0 })
  const [dragging, setDragging] = useState(false)

  const updateThumb = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const horizontal = orientation === 'horizontal'
    const scrollSize = horizontal ? viewport.scrollWidth : viewport.scrollHeight
    const viewSize = horizontal ? viewport.clientWidth : viewport.clientHeight
    const position = horizontal ? viewport.scrollLeft : viewport.scrollTop
    const size = scrollSize > 0 ? Math.min(1, viewSize / scrollSize) : 1
    const range = scrollSize - viewSize
    const offset = range > 0 ? (position / range) * (1 - size) : 0
    setThumb({ size, offset })
  }, [orientation])

  useEffect(() => {
    updateThumb()
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateThumb)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [updateThumb])

  // Drag geometry is read from the DOM rather than thumb state so it is right
  // even between render and the first scroll/ResizeObserver tick.
  const trackMetrics = useCallback(
    (track: HTMLElement) => {
      const viewport = viewportRef.current
      if (!viewport) return null
      const horizontal = orientation === 'horizontal'
      const scrollSize = horizontal ? viewport.scrollWidth : viewport.scrollHeight
      const viewSize = horizontal ? viewport.clientWidth : viewport.clientHeight
      const scrollRange = scrollSize - viewSize
      const rect = track.getBoundingClientRect()
      const trackSize = horizontal ? rect.width : rect.height
      const thumbSize = trackSize * (scrollSize > 0 ? Math.min(1, viewSize / scrollSize) : 1)
      const dragRange = trackSize - thumbSize
      // No overflow — or a zero-sized track — leaves nothing to drag across.
      if (scrollRange <= 0 || dragRange <= 0) return null
      const position = horizontal ? viewport.scrollLeft : viewport.scrollTop
      return {
        horizontal,
        viewport,
        scrollRange,
        dragRange,
        trackStart: horizontal ? rect.left : rect.top,
        thumbSize,
        thumbStart: (position / scrollRange) * dragRange
      }
    },
    [orientation]
  )

  const thumbStyle =
    orientation === 'horizontal'
      ? { left: `${thumb.offset * 100}%`, width: `${thumb.size * 100}%` }
      : { top: `${thumb.offset * 100}%`, height: `${thumb.size * 100}%` }

  function scrollToPointer(metrics: NonNullable<ReturnType<typeof trackMetrics>>, pointer: number, grabOffset: number) {
    const thumbPos = Math.min(Math.max(pointer - metrics.trackStart - grabOffset, 0), metrics.dragRange)
    const next = (thumbPos / metrics.dragRange) * metrics.scrollRange
    if (metrics.horizontal) metrics.viewport.scrollLeft = next
    else metrics.viewport.scrollTop = next
  }

  function onTrackPointerDown(event: PointerEvent<HTMLDivElement>) {
    // A second pointer mid-drag is ignored rather than stacking a drag.
    if (dragRef.current) return
    event.preventDefault()
    const metrics = trackMetrics(event.currentTarget)
    if (!metrics) return
    const pointer = metrics.horizontal ? event.clientX : event.clientY
    const onThumb = event.target !== event.currentTarget
    // A press on the track aims the thumb's centre at the pointer; a press on
    // the thumb keeps the grab point so the drag starts without a jump.
    const grabOffset = onThumb
      ? Math.min(Math.max(pointer - metrics.trackStart - metrics.thumbStart, 0), metrics.thumbSize)
      : metrics.thumbSize / 2
    dragRef.current = { pointerId: event.pointerId, grabOffset }
    // Capture keeps the drag alive when the pointer leaves the viewport.
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    if (!onThumb) scrollToPointer(metrics, pointer, grabOffset)
  }

  function onTrackPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const metrics = trackMetrics(event.currentTarget)
    if (!metrics) return
    scrollToPointer(metrics, metrics.horizontal ? event.clientX : event.clientY, drag.grabOffset)
  }

  function endTrackDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div className="scrollbar" data-orientation={orientation} data-dragging={dragging || undefined}>
      <div
        ref={viewportRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="scrollbar-viewport"
        onScroll={updateThumb}
      >
        {children}
      </div>
      <div
        className="scrollbar-track"
        aria-hidden="true"
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={endTrackDrag}
        onPointerCancel={endTrackDrag}
        onLostPointerCapture={endTrackDrag}
      >
        <div className="scrollbar-thumb" style={thumbStyle} />
      </div>
    </div>
  )
}

export type DropZoneRejectionReason = 'unsupported_format' | 'too_large' | 'too_many'

export type DropZoneRejection = {
  fileName: string
  reason: DropZoneRejectionReason
  message: string
}

type DropZoneProps = {
  label: string
  formats: string[]
  maxBytes: number
  multiple?: boolean
  disabled?: boolean
  onFiles?: (files: File[]) => void
  // Reports every rejection from the most recent drop/pick, even once a
  // sibling accepted file has swapped this DropZone out for another view -
  // the parent slot can hold onto these so the reason isn't lost.
  onRejected?: (rejections: DropZoneRejection[]) => void
}

const MB = 1_000_000

function formatCeiling(bytes: number) {
  if (bytes < MB) return `${Math.ceil(bytes / 1000)} KB`
  // A binary ceiling divided by a decimal MB is not a round number: the
  // server's 5242880-byte limit rendered as "5.24288 MB" on the page a
  // judge lands on first. Show at most one decimal, and drop it when the
  // value is whole so "25 MB" does not become "25.0 MB".
  const megabytes = bytes / MB
  const rounded = Math.round(megabytes * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} MB`
}

export function DropZone({
  label,
  formats,
  maxBytes,
  multiple = true,
  disabled = false,
  onFiles,
  onRejected
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [rejections, setRejections] = useState<string[]>([])
  const [active, setActive] = useState(false)
  const ceiling = formatCeiling(maxBytes)
  const accepted = formats.map((format) => format.replace(/^\./, '').toLowerCase())
  const acceptedSet = new Set(accepted)

  function takeFiles(files: File[]) {
    const acceptedFiles: File[] = []
    const rejected: DropZoneRejection[] = []
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!multiple && acceptedFiles.length >= 1) {
        rejected.push({
          fileName: file.name,
          reason: 'too_many',
          message: `${file.name} was not used; only one file is accepted`
        })
      } else if (!acceptedSet.has(extension)) {
        rejected.push({
          fileName: file.name,
          reason: 'unsupported_format',
          message: `${file.name} is not an accepted format`
        })
      } else if (file.size > maxBytes) {
        rejected.push({
          fileName: file.name,
          reason: 'too_large',
          message: `${file.name} exceeds the ${ceiling} limit`
        })
      } else {
        acceptedFiles.push(file)
      }
    }
    setRejections(rejected.map((rejection) => rejection.message))
    onRejected?.(rejected)
    if (acceptedFiles.length > 0) onFiles?.(acceptedFiles)
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setActive(false)
    if (disabled) return
    takeFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="drop-zone">
      <button
        type="button"
        className="drop-zone-surface"
        aria-label={label}
        aria-describedby={hintId}
        data-active={active || undefined}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={onDrop}
      >
        <span className="drop-zone-action">Drop files here or press Enter to browse</span>
        <span className="drop-zone-hint" id={hintId}>
          Accepts {accepted.map((format) => format.toUpperCase()).join(', ')} up to {ceiling}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="drop-zone-input"
        tabIndex={-1}
        aria-hidden="true"
        multiple={multiple}
        disabled={disabled}
        accept={accepted.map((format) => `.${format}`).join(',')}
        onChange={(event) => {
          takeFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      {rejections.length > 0 && (
        <ul className="drop-zone-rejections" role="alert">
          {rejections.map((rejection) => (
            <li key={rejection}>{rejection}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

type ProvenanceAnchorProps = {
  kind: ProvenanceKind
  onJump?: () => void
  children: ReactNode
}

export function ProvenanceAnchor({ kind, onJump, children }: ProvenanceAnchorProps) {
  const tagId = useId()
  if (kind === 'none') {
    return (
      <span className="provenance-anchor" data-kind="none">
        <span className="provenance-anchor-value type-data-md">{children}</span>
        <span className="provenance-anchor-note">No source anchor</span>
      </span>
    )
  }
  return (
    <span className="provenance-anchor" data-kind={kind}>
      <button
        type="button"
        className="provenance-anchor-jump type-data-md"
        aria-describedby={kind === 'approximate' ? tagId : undefined}
        onClick={onJump}
      >
        {children}
      </button>
      {kind === 'approximate' && (
        <span className="provenance-anchor-tag" id={tagId}>
          Approximate
        </span>
      )}
    </span>
  )
}
