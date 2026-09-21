import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FieldVerdictRecord, Provenance } from '../../email-detail/types'
import type { JudgeDocument, JudgeOutcome, PreparedFallback } from '../types'
import { PreparedFallbackPanel } from './PreparedFallbackPanel'

const SI_DOC: JudgeDocument = {
  document_id: 'doc-fallback-si',
  slot: 'si_file',
  file_name: 'fallback-si.txt',
  detected_format: 'txt',
  byte_size: 400,
  role: 'SI',
  evidence_url: '/api/judge/fallback/documents/doc-fallback-si'
}

const BL_DOC: JudgeDocument = {
  document_id: 'doc-fallback-bl',
  slot: 'draft_bl_file',
  file_name: 'fallback-bl.txt',
  detected_format: 'txt',
  byte_size: 380,
  role: 'DRAFT_BL',
  evidence_url: '/api/judge/fallback/documents/doc-fallback-bl'
}

const OUTCOME: JudgeOutcome = {
  category: 'BL_COMPARISON',
  status: 'OK',
  review_reason: null,
  has_defect: false,
  defect_fields: []
}

function fallbackProvenance(fileName: string): Provenance {
  return {
    attachment_id: `att-${fileName}`,
    file_name: fileName,
    format: 'txt',
    location: { kind: 'txt', line: 1, start_col: 0, end_col: 1 }
  }
}

function field(fieldName: FieldVerdictRecord['field']): FieldVerdictRecord {
  return {
    field: fieldName,
    si: { field: fieldName, raw_value: 'A', provenance: fallbackProvenance('fallback-si.txt') },
    draft_bl: { field: fieldName, raw_value: 'A', provenance: fallbackProvenance('fallback-bl.txt') },
    verdict: 'MATCH'
  }
}

const FALLBACK: PreparedFallback = {
  label: 'PREPARED FALLBACK',
  source: 'prepared',
  example_id: 'email_004',
  note: 'A prepared example, not your upload.',
  documents: [SI_DOC, BL_DOC],
  outcome: OUTCOME,
  field_verdicts: [
    field('shipper'),
    field('consignee'),
    field('notify_party'),
    field('port_of_loading'),
    field('port_of_discharge'),
    field('container_count'),
    field('gross_weight_kg')
  ]
}

describe('PreparedFallbackPanel', () => {
  it('loads and renders the prepared example labelled PREPARED FALLBACK, never as "Your result"', async () => {
    const getPreparedFallback = vi.fn().mockResolvedValue(FALLBACK)
    render(<PreparedFallbackPanel getPreparedFallback={getPreparedFallback} />)

    expect(await screen.findByRole('heading', { name: 'PREPARED FALLBACK' })).toBeInTheDocument()
    expect(screen.queryByText(/Your result/i)).not.toBeInTheDocument()
    expect(screen.getByText('A prepared example, not your upload.')).toBeInTheDocument()
    expect(screen.getByText('Example files: fallback-si.txt and fallback-bl.txt')).toBeInTheDocument()
    expect(screen.getByText('All seven fields match')).toBeInTheDocument()

    const rows = screen.getAllByRole('generic').filter((el) => el.classList.contains('field-row'))
    expect(rows).toHaveLength(7)
  })

  it('renders nothing until the fallback has loaded', () => {
    const getPreparedFallback = vi.fn(() => new Promise<PreparedFallback>(() => {}))
    const { container } = render(<PreparedFallbackPanel getPreparedFallback={getPreparedFallback} />)
    expect(container).toBeEmptyDOMElement()
  })
})
