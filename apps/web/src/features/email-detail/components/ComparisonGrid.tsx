import { FieldRow, ProvenanceAnchor } from '../../../components/ui/Domain'
import { Tooltip } from '../../../components/ui/Overlays'
import type { ProvenanceKind, StatusKind } from '../../../components/ui/types'
import type { ComparedField, ExtractedValue, FieldVerdictRecord, Provenance } from '../types'
import './comparison-grid.css'

type ComparisonGridProps = {
  verdicts: FieldVerdictRecord[]
  onSelectProvenance?: (provenance: Provenance, valueText: string) => void
}

const FIELD_ORDER: ComparedField[] = [
  'shipper',
  'consignee',
  'notify_party',
  'port_of_loading',
  'port_of_discharge',
  'container_count',
  'gross_weight_kg'
]

const FIELD_HUMAN_LABELS: Record<ComparedField, string> = {
  shipper: 'Shipper',
  consignee: 'Consignee',
  notify_party: 'Notify party',
  port_of_loading: 'Port of loading',
  port_of_discharge: 'Port of discharge',
  container_count: 'Container count',
  gross_weight_kg: 'Gross weight (kg)'
}

const VERDICT_STATUS_MAP: Record<'MATCH' | 'MISMATCH' | 'REVIEW', { status: StatusKind; label: string }> = {
  MATCH: { status: 'match', label: 'Match' },
  MISMATCH: { status: 'mismatch', label: 'Mismatch' },
  REVIEW: { status: 'held', label: 'Held' }
}

function resolveProvenanceKind(value: ExtractedValue): ProvenanceKind {
  const prov = value.provenance
  if (!prov || 'parse_error' in prov || !value.raw_value) {
    return 'none'
  }
  if (prov.format === 'scanned_pdf' && prov.location?.approximate) {
    return 'approximate'
  }
  return 'exact'
}

function renderValueAnchor(value: ExtractedValue, onSelect?: (provenance: Provenance, valueText: string) => void) {
  const kind = resolveProvenanceKind(value)
  const display =
    value.raw_value ?? (value.provenance && 'parse_error' in value.provenance ? 'Unreadable' : 'Missing value')

  return (
    <ProvenanceAnchor
      kind={kind}
      onJump={kind !== 'none' && onSelect ? () => onSelect(value.provenance, display) : undefined}
    >
      {display}
    </ProvenanceAnchor>
  )
}

export function ComparisonGrid({ verdicts, onSelectProvenance }: ComparisonGridProps) {
  const ordered = [...verdicts].sort((a, b) => {
    const rank = (field: ComparedField) => {
      const index = FIELD_ORDER.indexOf(field)
      return index === -1 ? FIELD_ORDER.length : index
    }
    return rank(a.field) - rank(b.field)
  })

  return (
    <section className="comparison-grid-container" aria-label="Field comparison">
      <div className="comparison-grid-header">
        <div className="comparison-grid-header-title">
          <h2 className="comparison-grid-title">Field comparison</h2>
          <Tooltip label="About field comparison">
            <span>
              Compares the seven required fields between the shipping instruction and the draft bill of lading. A side
              marker and label restate each verdict so it never relies on color alone.
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="comparison-grid-rows">
        <div className="comparison-grid-columns-hint" aria-hidden="true">
          <span>Field</span>
          <span>SI reference</span>
          <span>Draft BL</span>
          <span>Verdict</span>
        </div>

        {ordered.map((item) => {
          const fieldLabel = FIELD_HUMAN_LABELS[item.field]
          const { status, label: statusText } = VERDICT_STATUS_MAP[item.verdict]

          return (
            <FieldRow
              key={item.field}
              label={fieldLabel}
              left={renderValueAnchor(item.si, onSelectProvenance)}
              right={renderValueAnchor(item.draft_bl, onSelectProvenance)}
              status={status}
              statusText={statusText}
            />
          )
        })}
      </div>
    </section>
  )
}
