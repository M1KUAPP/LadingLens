import { useState } from 'react'
import { Button, Checkbox } from '../../../components/ui/Controls'
import { DropZone } from '../../../components/ui/Domain'
import { formatFileSize } from '../judge-format'
import type { DropZoneRejection } from '../../../components/ui/Domain'
import type { JudgeDocumentSlot, JudgePolicy, UploadRejection } from '../types'
import './upload-panel.css'

type UploadPanelProps = {
  policy: JudgePolicy
  busy: boolean
  serverRejections: UploadRejection[]
  onSubmit: (files: { si: File; draftBl: File }) => void
}

const MB = 1_000_000

// Mirrors DropZone's own ceiling formatting (components/ui/Domain.tsx) so the
// limit named in a server rejection matches the limit named in the drop zone hint.
function formatCeiling(bytes: number): string {
  if (bytes < MB) return `${Math.ceil(bytes / 1000)} KB`
  const megabytes = bytes / MB
  const rounded = Math.round(megabytes * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} MB`
}

function humanize(code: string): string {
  const words = code.split('_').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const REJECTION_REASON_LABEL: Record<string, string> = {
  missing: 'Add this document before checking.',
  empty: 'This file is empty.',
  unsupported_format: 'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.'
}

function rejectionMessage(reason: string, maxBytes: number): string {
  if (reason === 'too_large') {
    return `This file is larger than the ${formatCeiling(maxBytes)} limit.`
  }
  return REJECTION_REASON_LABEL[reason] ?? `Something is wrong with this file: ${humanize(reason)}.`
}

// Covers a slot's drop zone accepting one file while the rest of the same
// drop are extra (multiple is always false here), e.g. dropping two files
// at once. Named by count rather than repeating a line per extra file, to
// stay concise when several files are dropped at once.
function extraFilesMessage(count: number): string {
  const noun = count === 1 ? 'file' : 'files'
  const verb = count === 1 ? 'was' : 'were'
  return `${count} extra ${noun} ${verb} ignored. Only one file is accepted here.`
}

type UploadSlotProps = {
  slot: JudgeDocumentSlot
  label: string
  file: File | null
  formats: string[]
  maxBytes: number
  serverRejections: UploadRejection[]
  disabled: boolean
  onFiles: (files: File[]) => void
  onRemove: () => void
}

function UploadSlot({
  slot,
  label,
  file,
  formats,
  maxBytes,
  serverRejections,
  disabled,
  onFiles,
  onRemove
}: UploadSlotProps) {
  const rejections = serverRejections.filter((rejection) => rejection.slot === slot)
  // Lifted out of DropZone: DropZone unmounts as soon as this slot has a
  // file (swapped for the file row below), which would otherwise drop any
  // rejection from that same batch - e.g. a second dropped file, or one
  // rejected file dropped alongside the one that was accepted.
  const [clientRejections, setClientRejections] = useState<DropZoneRejection[]>([])

  function handleRemove() {
    setClientRejections([])
    onRemove()
  }

  const extraCount = clientRejections.filter((rejection) => rejection.reason === 'too_many').length
  const clientMessages = [
    ...clientRejections.filter((rejection) => rejection.reason !== 'too_many').map((rejection) => rejection.message),
    ...(extraCount > 0 ? [extraFilesMessage(extraCount)] : [])
  ]

  return (
    <div className="upload-panel-slot">
      <h3 className="upload-panel-slot-label type-label-md">{label}</h3>
      {file ? (
        <div className="upload-panel-file">
          <span className="upload-panel-file-name type-data-md">{file.name}</span>
          <span className="upload-panel-file-size type-data-sm">{formatFileSize(file.size)}</span>
          <Button variant="ghost" aria-label={`Remove the ${label} file`} disabled={disabled} onClick={handleRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <DropZone
          label={label}
          formats={formats}
          maxBytes={maxBytes}
          multiple={false}
          disabled={disabled}
          onFiles={onFiles}
          onRejected={setClientRejections}
        />
      )}
      {file && clientMessages.length > 0 && (
        <ul className="upload-panel-client-rejection" role="alert">
          {clientMessages.map((message, index) => (
            <li key={`${slot}-client-${index}`}>{message}</li>
          ))}
        </ul>
      )}
      {rejections.length > 0 && (
        <ul className="upload-panel-server-rejection" role="alert">
          {rejections.map((rejection, index) => (
            <li key={`${slot}-${index}`}>{rejectionMessage(rejection.reason, maxBytes)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function UploadPanel({ policy, busy, serverRejections, onSubmit }: UploadPanelProps) {
  const [si, setSi] = useState<File | null>(null)
  const [draftBl, setDraftBl] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [dismissedSlots, setDismissedSlots] = useState<Set<string>>(new Set())
  const [seenServerRejections, setSeenServerRejections] = useState(serverRejections)

  // A fresh batch of server rejections (a new submit result) always
  // supersedes any slot the reader has since dismissed locally. Adjusted
  // during render (React's documented pattern for resetting state when a
  // prop changes) rather than in an effect, so it takes effect in the same
  // render pass instead of scheduling an extra one.
  if (serverRejections !== seenServerRejections) {
    setSeenServerRejections(serverRejections)
    setDismissedSlots(new Set())
  }

  function dismiss(slot: JudgeDocumentSlot) {
    setDismissedSlots((prev) => new Set(prev).add(slot))
  }

  const visibleRejections = serverRejections.filter((rejection) => !dismissedSlots.has(rejection.slot))
  const ready = si !== null && draftBl !== null && confirmed

  function handleSubmit() {
    if (!si || !draftBl || !confirmed) return
    onSubmit({ si, draftBl })
  }

  return (
    <div className="upload-panel">
      <div className="upload-panel-slots">
        <UploadSlot
          slot="si_file"
          label="Shipping Instruction"
          file={si}
          formats={policy.accepted_formats}
          maxBytes={policy.max_file_bytes}
          serverRejections={visibleRejections}
          disabled={busy}
          onFiles={(files) => {
            setSi(files[0])
            dismiss('si_file')
          }}
          onRemove={() => {
            setSi(null)
            dismiss('si_file')
          }}
        />
        <UploadSlot
          slot="draft_bl_file"
          label="Draft Bill of Lading"
          file={draftBl}
          formats={policy.accepted_formats}
          maxBytes={policy.max_file_bytes}
          serverRejections={visibleRejections}
          disabled={busy}
          onFiles={(files) => {
            setDraftBl(files[0])
            dismiss('draft_bl_file')
          }}
          onRemove={() => {
            setDraftBl(null)
            dismiss('draft_bl_file')
          }}
        />
      </div>
      <div className="upload-panel-actions">
        <Checkbox
          label="These documents are synthetic (no real shipping data)"
          checked={confirmed}
          disabled={busy}
          onCheckedChange={setConfirmed}
        />
        <Button variant="primary" disabled={!ready || busy} onClick={handleSubmit}>
          Check documents
        </Button>
      </div>
    </div>
  )
}
