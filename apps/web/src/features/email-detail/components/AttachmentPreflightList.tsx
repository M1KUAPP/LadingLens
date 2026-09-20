import { StatusPill } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import type { StatusKind } from '../../../components/ui/types'
import type {
  AttachmentParseState,
  AttachmentPreflightItem,
  DocumentType,
  ReviewReason
} from '../types'
import './attachment-preflight.css'

type AttachmentPreflightListProps = {
  items: AttachmentPreflightItem[]
  refusalReason?: ReviewReason
}

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  SI: 'Shipping instruction',
  DRAFT_BL: 'Draft bill of lading',
  COMMERCIAL_INVOICE: 'Commercial invoice',
  UNKNOWN: 'Unknown document'
}

const PARSE_STATUS_MAP: Record<AttachmentParseState, StatusKind> = {
  PARSED: 'match',
  MISSING: 'held',
  UNREADABLE: 'mismatch',
  REJECTED: 'mismatch'
}

const PARSE_TEXT_MAP: Record<AttachmentParseState, string> = {
  PARSED: 'Parsed',
  MISSING: 'Missing',
  UNREADABLE: 'Unreadable',
  REJECTED: 'Rejected'
}

const REFUSAL_TITLES: Record<ReviewReason, string> = {
  missing_attachment: 'Refusal: Missing required draft bill of lading',
  wrong_doc_type: 'Refusal: Wrong document type',
  unreadable: 'Refusal: Unreadable attachment',
  missing_value: 'Refusal: Missing required field value'
}

const REFUSAL_EXPLANATIONS: Record<ReviewReason, string> = {
  missing_attachment:
    'Comparison cannot proceed because the required draft bill of lading is absent from email attachments.',
  wrong_doc_type:
    'Comparison cannot proceed because received files do not match required shipping instruction and draft bill of lading pair.',
  unreadable:
    'Comparison cannot proceed because one or more attachments are corrupt or cannot be parsed.',
  missing_value:
    'Comparison cannot proceed automatically because required fields are missing from source documents.'
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return ''
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${Math.ceil(bytes / 1000)} KB`
  return `${bytes} B`
}

export function AttachmentPreflightList({
  items,
  refusalReason
}: AttachmentPreflightListProps) {
  return (
    <section
      className="attachment-preflight"
      role="region"
      aria-label="Attachment preflight"
    >
      <div className="attachment-preflight-header">
        <h2 className="attachment-preflight-title">Attachment preflight</h2>
        <Tooltip label="About attachment preflight">
          <span>
            Verifies container format, document type classification, and parser
            readiness before field comparison runs.
          </span>
        </Tooltip>
      </div>

      {refusalReason && (
        <div
          className="attachment-preflight-refusal"
          role="alert"
          aria-live="polite"
        >
          <span className="attachment-preflight-refusal-title">
            {REFUSAL_TITLES[refusalReason]}
          </span>
          <span>{REFUSAL_EXPLANATIONS[refusalReason]}</span>
        </div>
      )}

      <table className="attachment-preflight-table">
        <thead>
          <tr>
            <th className="attachment-preflight-th">File</th>
            <th className="attachment-preflight-th">Detected type</th>
            <th className="attachment-preflight-th">Format / Size</th>
            <th className="attachment-preflight-th">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const statusKind = PARSE_STATUS_MAP[item.parse_state]
            const statusLabel = PARSE_TEXT_MAP[item.parse_state]
            const sizeStr = formatBytes(item.byte_size)
            return (
              <tr key={item.attachment_id} className="attachment-preflight-row">
                <td className="attachment-preflight-td">
                  <div className="attachment-preflight-filename">
                    {item.file_name}
                  </div>
                  {item.error && (
                    <div className="attachment-preflight-error">
                      {item.error}
                    </div>
                  )}
                </td>
                <td className="attachment-preflight-td">
                  {DOC_TYPE_LABEL[item.document_type]}
                </td>
                <td className="attachment-preflight-td attachment-preflight-meta">
                  {item.detected_format.toUpperCase()}
                  {sizeStr ? ` (${sizeStr})` : ''}
                </td>
                <td className="attachment-preflight-td">
                  <StatusPill status={statusKind}>{statusLabel}</StatusPill>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
