import { Scrollbar } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import type { Provenance } from '../types'
import './evidence-viewer.css'

type EvidenceViewerProps = {
  activeProvenance?: Provenance | null
  valueText?: string
}

function renderLocationDetails(prov: Provenance) {
  if ('parse_error' in prov || !prov.location) {
    return (
      <div className="evidence-viewer-error-box">
        <div>Attachment corrupted or unreadable</div>
        <div className="evidence-viewer-coordinates">
          Diagnostic: {prov.parse_error}
        </div>
      </div>
    )
  }

  const loc = prov.location
  switch (loc.kind) {
    case 'txt':
      return (
        <div className="evidence-viewer-coordinates">
          Line {loc.line}, columns {loc.start_col} to {loc.end_col}
        </div>
      )
    case 'digital_pdf':
      return (
        <div className="evidence-viewer-coordinates">
          Page {loc.page} (Bbox: [{loc.bbox.map((n) => n.toFixed(1)).join(', ')}])
        </div>
      )
    case 'scanned_pdf':
      return (
        <div className="evidence-viewer-coordinates">
          Page {loc.page}, Region: {loc.region}
        </div>
      )
    case 'xlsx':
      return (
        <div className="evidence-viewer-coordinates">
          Sheet {loc.sheet}, Cell {loc.cell}
        </div>
      )
    case 'docx_table':
      return (
        <div className="evidence-viewer-coordinates">
          Table {loc.table_index}, row {loc.row_index}, column {loc.col_index}
        </div>
      )
    case 'docx_paragraph':
      return (
        <div className="evidence-viewer-coordinates">
          Paragraph {loc.paragraph_index}
        </div>
      )
  }
}

export function EvidenceViewer({
  activeProvenance,
  valueText
}: EvidenceViewerProps) {
  if (!activeProvenance) {
    return (
      <section
        className="evidence-viewer"
        role="region"
        aria-label="Source evidence"
      >
        <div className="evidence-viewer-header">
          <div className="evidence-viewer-title-group">
            <h2 className="evidence-viewer-title">Source evidence</h2>
            <Tooltip label="About source evidence">
              <span>
                Displays format-honest coordinates for the active compared
                field, including text line and column, PDF bounding boxes, or
                spreadsheet cell addresses.
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="evidence-viewer-empty">
          Click any compared field value above to inspect source provenance
          coordinates and location evidence.
        </div>
      </section>
    )
  }

  const isCorrupt =
    'parse_error' in activeProvenance || !activeProvenance.location
  const isApproximate =
    activeProvenance.format === 'scanned_pdf' &&
    activeProvenance.location?.approximate

  return (
    <section
      className="evidence-viewer"
      role="region"
      aria-label="Source evidence"
    >
      <div className="evidence-viewer-header">
        <div className="evidence-viewer-title-group">
          <h2 className="evidence-viewer-title">Source evidence</h2>
          <Tooltip label="About source evidence">
            <span>
              Format-honest source location coordinates. Coordinates preserve
              Unicode offsets for text and standard point space for vector
              documents.
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="evidence-viewer-body">
        <div className="evidence-viewer-meta">
          <span className="evidence-viewer-filename">
            {activeProvenance.file_name}
          </span>
          {isApproximate && (
            <span className="evidence-viewer-approximate-tag">Approximate</span>
          )}
          {isCorrupt && (
            <span className="evidence-viewer-no-anchor">No source anchor</span>
          )}
          {renderLocationDetails(activeProvenance)}
        </div>

        {valueText && (
          <div className="evidence-viewer-value-box">
            <span className="evidence-viewer-value-label">Extracted value</span>
            <span className="evidence-viewer-value-content">{valueText}</span>
          </div>
        )}

        {activeProvenance.format === 'txt' && !isCorrupt && (
          <div className="evidence-viewer-preview">
            <Scrollbar label="Source text preview">
              <pre className="evidence-viewer-preview-text">
                {`[Source: ${activeProvenance.file_name}]\nLine ${activeProvenance.location.line}: ${valueText}`}
              </pre>
            </Scrollbar>
          </div>
        )}
      </div>
    </section>
  )
}
