import type { EmailDetailRecord } from '../types'

export const email511Fixture: EmailDetailRecord = {
  email_id: 'email_511',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'unreadable',
  attachments: [
    {
      attachment_id: 'email_511-1',
      file_name: 'email_511_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 602
    },
    {
      attachment_id: 'email_511-2',
      file_name: 'email_511_BL.pdf',
      detected_format: 'pdf',
      document_type: 'UNKNOWN',
      parse_state: 'UNREADABLE',
      byte_size: 775,
      error: 'PDF could not be opened (FileDataError)'
    }
  ],
  field_verdicts: [],
  held_review: {
    case_id: 'seed-case:email_511',
    email_id: 'email_511',
    status: 'NEEDS_REVIEW',
    review_reason: 'unreadable',
    assigned_owner: 'docs-demo',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_511',
      sender: 'willy_ss@aprilasia.com',
      subject: 'RE_ TO CONFIRM DOCS _ 5SUS-40134 _ KOPER_SLOVENIA _ AL GURG STATIONERY LLC _ MCLSIN6917768',
      received_at: '2026-09-20T00:00:00+00:00',
      message_hash: '5cc39cb3e7e857d4462f7757c1a716e9e330bd4ecfffc8b1b95a93bd4d2e280d'
    },
    evidence_summary: 'PDF could not be opened (FileDataError)',
    history: []
  }
}
