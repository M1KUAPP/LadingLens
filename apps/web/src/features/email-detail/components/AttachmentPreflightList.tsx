import { StatusPill } from '../../../components/ui/Domain'
import { VerdictHoldGlyph } from '../../../components/ui/Icons'
import { Tooltip } from '../../../components/ui/Overlays'
import type { StatusKind } from '../../../components/ui/types'
import type { AttachmentParseState, AttachmentPreflightItem, DocumentType, ReviewReason } from '../types'
import './attachment-preflight.css'

type AttachmentPreflightListProps = {
  items: AttachmentPreflightItem[]
  refusalReason?: ReviewReason
  /** The fields were compared anyway: an unreadable case is a held scan. */
  compared?: boolean
  /** Why nothing is attached, when the email says so. */
  emptyNote?: string
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
  UNREADABLE: 'held',
  REJECTED: 'neutral'
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
  unreadable: 'Comparison cannot proceed because one or more attachments are corrupt or cannot be parsed.',
  missing_value: 'Comparison cannot proceed automatically because required fields are missing from source documents.'
}

// A scan with no text layer is compared from its reading, then held.
const SCAN_HOLD_TITLE = 'Held: image-only scan'
const SCAN_HOLD_EXPLANATION =
  'The fields below were read from a scan with no text layer, so a person confirms them before the case closes.'

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return ''
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${Math.ceil(bytes / 1000)} KB`
  return `${bytes} B`
}

export function AttachmentPreflightList({ items, refusalReason, compared, emptyNote }: AttachmentPreflightListProps) {
  const scanHold = refusalReason === 'unreadable' && compared
  return (
    <section className="attachment-preflight" aria-label="Attachment check">
      <div className="attachment-preflight-header">
        <h2 className="attachment-preflight-title">Attachment check</h2>
        <Tooltip label="About the attachment check">
          <span>Checks that each attachment can be opened and identified before fields are compared.</span>
        </Tooltip>
      </div>

      {refusalReason && (
        <div className="attachment-preflight-refusal" role="alert" aria-live="polite" data-status="held">
          <span className="attachment-preflight-refusal-title">
            <VerdictHoldGlyph aria-label="Held" />
            {scanHold ? SCAN_HOLD_TITLE : REFUSAL_TITLES[refusalReason]}
          </span>
          <span>{scanHold ? SCAN_HOLD_EXPLANATION : REFUSAL_EXPLANATIONS[refusalReason]}</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="attachment-preflight-empty">{emptyNote ?? 'No files were attached to this email.'}</p>
      ) : (
        <div className="attachment-preflight-table-wrap">
          <table className="attachment-preflight-table">
            <thead>
              <tr>
                <th className="attachment-preflight-th">File</th>
                <th className="attachment-preflight-th">Detected type</th>
                <th className="attachment-preflight-th">Format / size</th>
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
                      <div className="attachment-preflight-filename">{item.file_name}</div>
                      {item.error && <div className="attachment-preflight-error">{item.error}</div>}
                    </td>
                    <td className="attachment-preflight-td">{DOC_TYPE_LABEL[item.document_type]}</td>
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
        </div>
      )}
    </section>
  )
}
