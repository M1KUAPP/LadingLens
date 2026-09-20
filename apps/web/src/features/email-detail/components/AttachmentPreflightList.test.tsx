import { render, screen } from '@testing-library/react'
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
    expect(
      screen.getByRole('region', { name: 'Attachment preflight' })
    ).toBeInTheDocument()
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
    render(
      <AttachmentPreflightList
        items={missingBlItems}
        refusalReason="missing_attachment"
      />
    )
    expect(
      screen.getByText(/Refusal: Missing required draft bill of lading/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Missing')).toBeInTheDocument()
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
    render(
      <AttachmentPreflightList
        items={wrongDocItems}
        refusalReason="wrong_doc_type"
      />
    )
    expect(
      screen.getByText(/Refusal: Wrong document type/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Commercial invoice')).toBeInTheDocument()
  })
})
