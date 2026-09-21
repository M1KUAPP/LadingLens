import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AttachmentPreflightList } from './AttachmentPreflightList'
import type { AttachmentPreflightItem } from '../types'

describe('AttachmentPreflightList', () => {
  const normalItems: AttachmentPreflightItem[] = [
    {
      attachment_id: 'att_si_1',
      file_name: 'email_001_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 1420
    },
    {
      attachment_id: 'att_bl_1',
      file_name: 'email_001_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 1510
    }
  ]

  it('renders preflight list before field comparison with document types and parse states', () => {
    render(<AttachmentPreflightList items={normalItems} />)
    expect(screen.getByRole('region', { name: 'Attachment check' })).toBeInTheDocument()
    expect(screen.getByText('email_001_SI.txt')).toBeInTheDocument()
    expect(screen.getByText('Shipping instruction')).toBeInTheDocument()
    expect(screen.getByText('email_001_BL.txt')).toBeInTheDocument()
    expect(screen.getByText('Draft bill of lading')).toBeInTheDocument()
    expect(screen.getAllByText('Parsed')).toHaveLength(2)
  })

  it('displays structural refusal notice when draft bill of lading is missing', () => {
    const missingBlItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_si_507',
        file_name: 'email_507_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED',
        byte_size: 1280
      },
      {
        attachment_id: 'att_missing_bl',
        file_name: 'Draft BL required',
        detected_format: 'unknown',
        document_type: 'DRAFT_BL',
        parse_state: 'MISSING',
        error: 'Draft bill of lading attachment not found in email'
      }
    ]
    render(<AttachmentPreflightList items={missingBlItems} refusalReason="missing_attachment" />)
    expect(screen.getByText(/Refusal: Missing required draft bill of lading/i)).toBeInTheDocument()
    expect(screen.getByText('Missing')).toBeInTheDocument()
  })

  it('marks the structural refusal as held with a pause-bars glyph, not a mismatch', () => {
    const missingBlItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_si_507',
        file_name: 'email_507_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED',
        byte_size: 1280
      },
      {
        attachment_id: 'att_missing_bl',
        file_name: 'Draft BL required',
        detected_format: 'unknown',
        document_type: 'DRAFT_BL',
        parse_state: 'MISSING',
        error: 'Draft bill of lading attachment not found in email'
      }
    ]
    render(<AttachmentPreflightList items={missingBlItems} refusalReason="missing_attachment" />)

    const refusal = screen.getByRole('alert')
    expect(refusal).toHaveAttribute('data-status', 'held')
    expect(refusal).not.toHaveAttribute('data-status', 'mismatch')
    expect(refusal.querySelector('.attachment-preflight-refusal-rail')).toBeNull()
    expect(within(refusal).getByLabelText('Held')).toBeInTheDocument()
    expect(within(refusal).getByText(/Refusal: Missing required draft bill of lading/i)).toBeInTheDocument()
  })

  it('displays wrong document type refusal when an unexpected file is received', () => {
    const wrongDocItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_si_501',
        file_name: 'email_501_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED'
      },
      {
        attachment_id: 'att_inv_501',
        file_name: 'email_501_BL.txt',
        detected_format: 'txt',
        document_type: 'COMMERCIAL_INVOICE',
        parse_state: 'REJECTED',
        error: 'Attachment is a commercial invoice, not a draft bill of lading'
      }
    ]
    render(<AttachmentPreflightList items={wrongDocItems} refusalReason="wrong_doc_type" />)
    expect(screen.getByText(/Refusal: Wrong document type/i)).toBeInTheDocument()
    expect(screen.getByText('Commercial invoice')).toBeInTheDocument()
  })

  it('does not style structural parse failures as semantic mismatches', () => {
    const structuralItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_unreadable_1',
        file_name: 'email_511_BL.pdf',
        detected_format: 'pdf',
        document_type: 'DRAFT_BL',
        parse_state: 'UNREADABLE',
        error: 'Corrupted binary fragment'
      },
      {
        attachment_id: 'att_rejected_1',
        file_name: 'email_501_inv.txt',
        detected_format: 'txt',
        document_type: 'COMMERCIAL_INVOICE',
        parse_state: 'REJECTED',
        error: 'Attachment is a commercial invoice, not a draft bill of lading'
      }
    ]
    render(<AttachmentPreflightList items={structuralItems} />)

    const unreadablePill = screen.getByText('Unreadable').closest('.status-pill')
    expect(unreadablePill).toHaveAttribute('data-status', 'held')

    const rejectedPill = screen.getByText('Rejected').closest('.status-pill')
    expect(rejectedPill).toHaveAttribute('data-status', 'neutral')
    expect(rejectedPill).not.toHaveAttribute('data-status', 'mismatch')
  })

  it('wraps the preflight table in a horizontally scrollable container for narrow viewports', () => {
    const { container } = render(<AttachmentPreflightList items={normalItems} />)
    const scrollWrap = container.querySelector('.attachment-preflight-table-wrap')
    expect(scrollWrap).toBeInTheDocument()
    expect(scrollWrap?.querySelector('.attachment-preflight-table')).toBeInTheDocument()
  })

  it('describes preflight checks without parser jargon', async () => {
    const user = userEvent.setup()
    render(<AttachmentPreflightList items={normalItems} />)
    await user.hover(screen.getByRole('button', { name: 'About the attachment check' }))
    const tip = await screen.findByRole('tooltip')
    expect(tip).not.toHaveTextContent(/parser|container format/i)
  })
})
