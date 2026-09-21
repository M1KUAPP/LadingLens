import type { EmailDetailRecord } from '../types'

export const email507Fixture: EmailDetailRecord = {
  email_id: 'email_507',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'missing_attachment',
  attachments: [
    {
      attachment_id: 'email_507-1',
      file_name: 'email_507_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 692
    }
  ],
  field_verdicts: [],
  held_review: {
    case_id: 'seed-case:email_507',
    email_id: 'email_507',
    status: 'NEEDS_REVIEW',
    review_reason: 'missing_attachment',
    assigned_owner: 'docs-demo',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_507',
      sender: 'docs@vitalsolutions.sg',
      subject: 'RE_ TO CONFIRM DOCS _ 5AKR-00230 _ KOPER_SLOVENIA _ 3S PAPER PRODUCTS SDN BHD _ YMJAI530601198',
      received_at: '2026-09-20T00:00:00+00:00',
      message_hash: '74eea44682722300349f754c8381a0c0911920e130c6562d2fa595cf66df71b9'
    },
    evidence_summary: 'No draft Bill of Lading was attached',
    history: []
  }
}
