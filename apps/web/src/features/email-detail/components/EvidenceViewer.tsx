import type { Ref } from 'react'
import { Scrollbar } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import type { Provenance, ScannedPdfLocation } from '../types'
import './evidence-viewer.css'

type EvidenceViewerProps = {
  activeProvenance?: Provenance | null
  valueText?: string
  ref?: Ref<HTMLElement>
}

const SCANNED_REGION_LABEL: Record<ScannedPdfLocation['region'], string> = {
  header: 'Header',
  party: 'Party',
  routing: 'Routing',
  cargo: 'Cargo',
  footer: 'Footer'
}

function renderLocationDetails(prov: Provenance) {
  if ('parse_error' in prov || !prov.location) {
    return (
      <div className="evidence-viewer-error-box">
        <div>Attachment corrupted or unreadable</div>
        <div className="evidence-viewer-coordinates">
          Error detail: {prov.parse_error}
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
          Page {loc.page}, highlighted area [{loc.bbox.map((n) => n.toFixed(1)).join(', ')}]
        </div>
      )
    case 'scanned_pdf':
      return (
        <div className="evidence-viewer-coordinates">
          Page {loc.page}, {SCANNED_REGION_LABEL[loc.region]} region
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
  valueText,
  ref
}: EvidenceViewerProps) {
  if (!activeProvenance) {
    return (
      <section
        ref={ref}
        className="evidence-viewer"
        aria-label="Source evidence"
      >
        <div className="evidence-viewer-header">
          <div className="evidence-viewer-title-group">
            <h2 className="evidence-viewer-title">Source evidence</h2>
            <Tooltip label="About source evidence">
              <span>
                Shows the exact source location for the selected value: a
                line and column in text, a page area in PDF, or a cell in a
                spreadsheet.
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="evidence-viewer-empty">
          Click any compared field value above to inspect where it was found
          in the source document.
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
      ref={ref}
      className="evidence-viewer"
      aria-label="Source evidence"
    >
      <div className="evidence-viewer-header">
        <div className="evidence-viewer-title-group">
          <h2 className="evidence-viewer-title">Source evidence</h2>
          <Tooltip label="About source evidence">
            <span>
              Shows the exact source location for the selected value,
              preserved from the original attachment.
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
