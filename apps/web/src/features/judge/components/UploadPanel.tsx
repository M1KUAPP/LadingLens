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

type UploadSlotProps = {
  slot: JudgeDocumentSlot
  label: string
  file: File | null
  formats: string[]
  maxBytes: number
  serverRejections: UploadRejection[]
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
          <Button variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <DropZone label={label} formats={formats} maxBytes={maxBytes} multiple={false} onFiles={onFiles} />
      )}
      {rejections.length > 0 && (
        <ul className="upload-panel-server-rejection" role="alert">
          {rejections.map((rejection) => (
            <li key={rejection.reason}>{rejection.reason}</li>
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
          onFiles={(files) => setDraftBl(files[0])}
          onRemove={() => setDraftBl(null)}
        />
      </div>
      <div className="upload-panel-actions">
        <Checkbox
          label="These documents are synthetic (no real shipping data)"
          checked={confirmed}
          onCheckedChange={setConfirmed}
        />
        <Button variant="primary" disabled={!ready || busy} onClick={handleSubmit}>
          Check documents
        </Button>
      </div>
    </div>
  )
}
