import { useState } from 'react'
import { Button, Checkbox } from '../../../components/ui/Controls'
import { DropZone } from '../../../components/ui/Domain'
import type { DropZoneRejection } from '../../../components/ui/Domain'
import { BatchReadError, isBatchFile, readBatch, type Batch } from '../batch'
import { formatFileSize } from '../judge-format'
import type { JudgePolicy, UploadRejection } from '../types'
import './upload-panel.css'

type UploadPanelProps = {
  policy: JudgePolicy
  busy: boolean
  serverRejections: UploadRejection[]
  onSubmit: (files: File[]) => void
  onBatch: (batch: Batch) => void
}

const MB = 1_000_000

// The chosen file's extension, shown as its tag in the file row.
function fileKind(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0
    ? name
        .slice(dot + 1)
        .toUpperCase()
        .slice(0, 4)
    : 'FILE'
}

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
  missing: 'Add the second document before checking.',
  empty: 'This file is empty.',
  unsupported_format: 'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.',
  too_many: 'Only two documents are checked at a time.'
}

function rejectionMessage(reason: string, maxBytes: number): string {
  if (reason === 'too_large') {
    return `This file is larger than the ${formatCeiling(maxBytes)} limit.`
  }
  return REJECTION_REASON_LABEL[reason] ?? `Something is wrong with this file: ${humanize(reason)}.`
}

function extraFilesMessage(count: number): string {
  const noun = count === 1 ? 'file was' : 'files were'
  return `${count} extra ${noun} not added. A check takes two documents; drop a .json batch to check more pairs.`
}

// A rejection names the numbered slot its file arrived in: file_1 is the
// first chosen file, file_2 the second.
function slotIndex(slot: string): number | null {
  const match = /^file_(\d)$/.exec(slot)
  return match ? Number(match[1]) - 1 : null
}

export function UploadPanel({ policy, busy, serverRejections, onSubmit, onBatch }: UploadPanelProps) {
  const [files, setFiles] = useState<File[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState<string[]>([])
  const [clientRejections, setClientRejections] = useState<DropZoneRejection[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [seenServerRejections, setSeenServerRejections] = useState(serverRejections)

  // A fresh set of server rejections (a new submit result) shows again even
  // after the reader changed the files. Adjusted during render (React's
  // documented pattern for resetting state when a prop changes).
  if (serverRejections !== seenServerRejections) {
    setSeenServerRejections(serverRejections)
    setDismissed(false)
  }

  const rejections = dismissed ? [] : serverRejections
  const fileRejections = (index: number) =>
    rejections.filter((rejection) => slotIndex(rejection.slot) === index && index < files.length)
  const generalRejections = rejections.filter((rejection) => {
    const index = slotIndex(rejection.slot)
    return index === null || index >= files.length
  })
  const ready = files.length === 2 && confirmed

  async function take(dropped: File[]) {
    setDismissed(true)
    const batchFiles = dropped.filter(isBatchFile)
    const documents = dropped.filter((file) => !isBatchFile(file))
    if (batchFiles.length > 0) {
      try {
        onBatch(await readBatch(batchFiles, [...files, ...documents], policy))
      } catch (error) {
        setNotes([error instanceof BatchReadError ? error.message : 'The batch could not be read.'])
      }
      return
    }
    const next = [...files, ...documents]
    setFiles(next.slice(0, 2))
    setNotes(next.length > 2 ? [extraFilesMessage(next.length - 2)] : [])
  }

  function remove(index: number) {
    setDismissed(true)
    setNotes([])
    setClientRejections([])
    setFiles((current) => current.filter((_, position) => position !== index))
  }

  // The drop zone shows its own rejections while it is on screen; once two
  // files hide it, the ones it reported are kept here.
  const zoneShown = files.length < 2
  const messages = [...(zoneShown ? [] : clientRejections.map((rejection) => rejection.message)), ...notes]

  return (
    <div className="upload-panel">
      <div className="upload-panel-head">
        <h2 className="upload-panel-title">Documents</h2>
        <p className="upload-panel-subtitle">
          A shipping instruction and its draft bill of lading, in either order. The check reads each file to tell which
          is which.
        </p>
      </div>
      <div className="upload-panel-body">
        {zoneShown ? (
          <DropZone
            label="Shipping documents"
            formats={[...policy.accepted_formats, 'json']}
            maxBytes={policy.max_file_bytes}
            disabled={busy}
            onFiles={(dropped) => void take(dropped)}
            onRejected={setClientRejections}
          />
        ) : null}
        {files.length > 0 ? (
          <ul className="upload-panel-files" aria-label="Chosen documents">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="upload-panel-file">
                <span className="upload-panel-file-kind" aria-hidden="true">
                  {fileKind(file.name)}
                </span>
                <span className="upload-panel-file-text">
                  <span className="upload-panel-file-name type-data-md">{file.name}</span>
                  <span className="upload-panel-file-size type-data-sm">{formatFileSize(file.size)}</span>
                </span>
                <Button
                  variant="ghost"
                  aria-label={`Remove ${file.name}`}
                  disabled={busy}
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
                {fileRejections(index).length > 0 ? (
                  <ul className="upload-panel-server-rejection" role="alert">
                    {fileRejections(index).map((rejection) => (
                      <li key={rejection.reason}>{rejectionMessage(rejection.reason, policy.max_file_bytes)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {files.length === 1 ? <p className="upload-panel-next">Add the second document to check the pair.</p> : null}
        {generalRejections.length > 0 ? (
          <ul className="upload-panel-server-rejection" role="alert">
            {generalRejections.map((rejection) => (
              <li key={`${rejection.slot}-${rejection.reason}`}>
                {rejectionMessage(rejection.reason, policy.max_file_bytes)}
              </li>
            ))}
          </ul>
        ) : null}
        {messages.length > 0 ? (
          <ul className="upload-panel-client-rejection" role="alert">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
        <p className="upload-panel-batch-hint">
          To check many pairs, drop a .json batch of email records or pairs together with their documents.
        </p>
      </div>
      <div className="upload-panel-actions">
        <Checkbox
          label="These documents are synthetic (no real shipping data)"
          checked={confirmed}
          disabled={busy}
          onCheckedChange={setConfirmed}
        />
        <Button variant="primary" disabled={!ready || busy} onClick={() => ready && onSubmit(files)}>
          Check documents
        </Button>
      </div>
    </div>
  )
}
