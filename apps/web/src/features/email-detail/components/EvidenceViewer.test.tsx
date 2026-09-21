import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EvidenceViewer } from './EvidenceViewer'
import evidenceCss from './evidence-viewer.css?raw'
import type { Provenance } from '../types'

describe('EvidenceViewer', () => {
  it('renders format-honest coordinates for TXT line and column span', () => {
    const prov: Provenance = {
      attachment_id: 'att_1',
      file_name: 'email_001_SI.txt',
      format: 'txt',
      location: { kind: 'txt', line: 12, start_col: 9, end_col: 48 }
    }
    render(
      <EvidenceViewer
        activeProvenance={prov}
        valueText="BALL & DOGGETT AUSTRALIA PTY LTD"
      />
    )
    expect(screen.getByText('email_001_SI.txt')).toBeInTheDocument()
    expect(screen.getByText(/Line 12, columns 9 to 48/)).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Source text preview' })
    ).toBeInTheDocument()
  })

  it('renders digital PDF page and bounding box coordinates', () => {
    const prov: Provenance = {
      attachment_id: 'att_2',
      file_name: 'email_002_BL.pdf',
      format: 'digital_pdf',
      location: {
        kind: 'digital_pdf',
        page: 1,
        bbox: [72.0, 140.0, 280.0, 165.0],
        approximate: false
      }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="SGSIN" />)
    expect(screen.getByText('email_002_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Page 1/)).toBeInTheDocument()
    expect(screen.getByText(/72\.0, 140\.0, 280\.0, 165\.0/)).toBeInTheDocument()
  })

  it('renders scanned PDF as visibly approximate with named region', () => {
    const prov: Provenance = {
      attachment_id: 'att_3',
      file_name: 'email_512_BL.pdf',
      format: 'scanned_pdf',
      location: {
        kind: 'scanned_pdf',
        page: 1,
        approximate: true,
        region: 'party'
      }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="CONSIGNEE DATA" />)
    expect(screen.getByText('email_512_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText('Approximate')).toBeInTheDocument()
    expect(screen.getByText(/Party region/i)).toBeInTheDocument()
  })

  it('renders spreadsheet sheet and cell coordinates for XLSX', () => {
    const prov: Provenance = {
      attachment_id: 'att_4',
      file_name: 'email_005_SI.xlsx',
      format: 'xlsx',
      location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B5' }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="BALL & DOGGETT" />)
    expect(screen.getByText('email_005_SI.xlsx')).toBeInTheDocument()
    expect(screen.getByText(/Sheet S\.I\., Cell B5/)).toBeInTheDocument()
  })

  it('renders table coordinates for DOCX', () => {
    const prov: Provenance = {
      attachment_id: 'att_5',
      file_name: 'email_008_BL.docx',
      format: 'docx',
      location: {
        kind: 'docx_table',
        table_index: 0,
        row_index: 1,
        col_index: 1
      }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="BALL & DOGGETT" />)
    expect(screen.getByText('email_008_BL.docx')).toBeInTheDocument()
    expect(screen.getByText(/Table 0, row 1, column 1/i)).toBeInTheDocument()
  })

  it('renders refusal and no coordinates for corrupted file', () => {
    const prov: Provenance = {
      attachment_id: 'att_6',
      file_name: 'email_511_BL.pdf',
      format: 'pdf',
      parse_error: 'corrupted_file'
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="Unreadable" />)
    expect(screen.getByText('email_511_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText('No source anchor')).toBeInTheDocument()
    expect(
      screen.getByText(/Attachment corrupted or unreadable/i)
    ).toBeInTheDocument()
  })

  it('describes source evidence without parser jargon', async () => {
    const user = userEvent.setup()
    const prov: Provenance = {
      attachment_id: 'att_1',
      file_name: 'email_001_SI.txt',
      format: 'txt',
      location: { kind: 'txt', line: 12, start_col: 9, end_col: 48 }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="SGSIN" />)
    await user.hover(
      screen.getByRole('button', { name: 'About source evidence' })
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).not.toHaveTextContent(
      /Unicode|vector|format-honest|offsets|point space/i
    )
  })

  it('stretches the scrollbar to fill the evidence preview height', () => {
    expect(evidenceCss).toContain('.evidence-viewer-preview .scrollbar')
    expect(evidenceCss).toMatch(
      /\.evidence-viewer-preview \.scrollbar[^{}]*\{[^}]*height:\s*100%/
    )
  })
})
