import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import {
  VerdictCheckGlyph,
  VerdictCrossGlyph,
  VerdictDashGlyph,
  VerdictHoldGlyph
} from './Icons'
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

export function StatusPill({
  status,
  children
}: {
  status: StatusKind
  children: ReactNode
}) {
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
  const [thumb, setThumb] = useState({ size: 1, offset: 0 })

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

  const thumbStyle =
    orientation === 'horizontal'
      ? { left: `${thumb.offset * 100}%`, width: `${thumb.size * 100}%` }
      : { top: `${thumb.offset * 100}%`, height: `${thumb.size * 100}%` }

  return (
    <div className="scrollbar" data-orientation={orientation}>
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
      <div className="scrollbar-track" aria-hidden="true">
        <div className="scrollbar-thumb" style={thumbStyle} />
      </div>
    </div>
  )
}

type DropZoneProps = {
  label: string
  formats: string[]
  maxBytes: number
  multiple?: boolean
  onFiles?: (files: File[]) => void
}

const MB = 1_000_000

function formatCeiling(bytes: number) {
  return bytes >= MB ? `${bytes / MB} MB` : `${Math.ceil(bytes / 1000)} KB`
}

export function DropZone({ label, formats, maxBytes, multiple = true, onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [rejections, setRejections] = useState<string[]>([])
  const [active, setActive] = useState(false)
  const ceiling = formatCeiling(maxBytes)
  const accepted = formats.map((format) => format.replace(/^\./, '').toLowerCase())
  const acceptedSet = new Set(accepted)

  function takeFiles(files: File[]) {
    const acceptedFiles: File[] = []
    const rejected: string[] = []
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!multiple && acceptedFiles.length >= 1) {
        rejected.push(`${file.name} was not used; only one file is accepted`)
      } else if (!acceptedSet.has(extension)) {
        rejected.push(`${file.name} is not an accepted format`)
      } else if (file.size > maxBytes) {
        rejected.push(`${file.name} exceeds the ${ceiling} limit`)
      } else {
        acceptedFiles.push(file)
      }
    }
    setRejections(rejected)
    if (acceptedFiles.length > 0) onFiles?.(acceptedFiles)
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setActive(false)
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
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setActive(true)
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
