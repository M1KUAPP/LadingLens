import { useState } from 'react'
import { Button, Checkbox } from '../../../components/ui/Controls'
import { DropZone } from '../../../components/ui/Domain'
import type { JudgeDocumentSlot, JudgePolicy, UploadRejection } from '../types'
import './upload-panel.css'

type UploadPanelProps = {
  policy: JudgePolicy
  busy: boolean
  serverRejections: UploadRejection[]
  onSubmit: (files: { si: File; draftBl: File }) => void
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${Math.ceil(bytes / 1000)} KB`
  return `${bytes} B`
}

// Mirrors DropZone's own ceiling formatting (components/ui/Domain.tsx) so the
// limit named in a server rejection matches the limit named in the drop zone hint.
function formatCeiling(bytes: number): string {
  return bytes >= 1_000_000 ? `${bytes / 1_000_000} MB` : `${Math.ceil(bytes / 1000)} KB`
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

  return (
    <div className="upload-panel-slot">
      <h3 className="upload-panel-slot-label type-label-md">{label}</h3>
      {file ? (
        <div className="upload-panel-file">
          <span className="upload-panel-file-name type-data-md">{file.name}</span>
          <span className="upload-panel-file-size type-data-sm">{formatFileSize(file.size)}</span>
          <Button variant="ghost" aria-label={`Remove the ${label} file`} disabled={disabled} onClick={onRemove}>
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
        />
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
          serverRejections={serverRejections}
          disabled={busy}
          onFiles={(files) => setSi(files[0])}
          onRemove={() => setSi(null)}
        />
        <UploadSlot
          slot="draft_bl_file"
          label="Draft Bill of Lading"
          file={draftBl}
          formats={policy.accepted_formats}
          maxBytes={policy.max_file_bytes}
          serverRejections={serverRejections}
          disabled={busy}
          onFiles={(files) => setDraftBl(files[0])}
          onRemove={() => setDraftBl(null)}
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
