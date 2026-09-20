import type { EmailDetailRecord } from '../types'

export const email507Fixture: EmailDetailRecord = {
  email_id: 'email_507',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'missing_attachment',
  attachments: [
    {
      attachment_id: 'att_507_si',
      file_name: 'email_507_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 590
    },
    {
      attachment_id: 'att_507_bl_missing',
      file_name: 'Draft BL required',
      detected_format: 'unknown',
      document_type: 'DRAFT_BL',
      parse_state: 'MISSING',
      error: 'Draft bill of lading attachment not found in email'
    }
  ],
  field_verdicts: [],
  retained_evidence: {
    label: 'Retained shipping instruction evidence',
    text: 'Shipper: 3S PAPER PRODUCTS SDN BHD; Consignee: VITAL SOLUTIONS PTE LTD; POL: PORT KLANG; POD: KOPER; Weight: 24,150 KG',
    location_description: 'email_507_SI.txt lines 1 to 14'
  },
  held_review: {
    case_id: 'case_email_507',
    email_id: 'email_507',
    status: 'NEEDS_REVIEW',
    review_reason: 'missing_attachment',
    assigned_owner: 'Hafiz Tan',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_507',
      sender: 'docs@vitalsolutions.sg',
      subject: 'RE_ TO CONFIRM DOCS _ 5AKR-00230 _ KOPER_SLOVENIA _ 3S PAPER PRODUCTS SDN BHD _ YMJAI530601198',
      received_at: '2026-09-18T11:20:00Z',
      message_hash: '5b8e9142ca184f09'
    },
    evidence_summary: 'Required draft bill of lading is absent. Retained SI evidence preserved for manual attachment recovery.',
    history: [
      {
        id: 'hist_507_1',
        timestamp: '2026-09-18T11:20:04Z',
        actor: 'Preflight Validator',
        action: 'CREATED',
        note: 'Structural refusal: missing draft BL attachment'
      },
      {
        id: 'hist_507_2',
        timestamp: '2026-09-18T11:20:45Z',
        actor: 'System',
        action: 'ASSIGNED',
        note: 'Assigned to Hafiz Tan to request missing document'
      }
    ]
  }
}
