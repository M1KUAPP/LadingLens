import type { EmailDetailRecord } from '../types'

export const email516Fixture: EmailDetailRecord = {
  email_id: 'email_516',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'missing_value',
  attachments: [
    {
      attachment_id: 'email_516-1',
      file_name: 'email_516_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 458
    },
    {
      attachment_id: 'email_516-2',
      file_name: 'email_516_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 654
    }
  ],
  field_verdicts: [],
  held_review: {
    case_id: 'seed-case:email_516',
    email_id: 'email_516',
    status: 'NEEDS_REVIEW',
    review_reason: 'missing_value',
    assigned_owner: 'docs-demo',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_516',
      sender: 'elisa_tukiman@april.com.my',
      subject: 'RE_ AFEMY - CONAKRY_GUINEA - MONTER(MCLSIN6123859) - 5RCY-68239 - 5250074840 - KPP-ANTALIS (SINGAPORE) PTE. LTD. - OA_CFR',
      received_at: '2026-09-20T00:00:00+00:00',
      message_hash: '7a183de2b3b8b6ca2f75ad3919b446c06be8b5e0d3978ba2be5f4f64eb578e72'
    },
    evidence_summary: 'Gross weight in the Shipping Instruction is a placeholder (\'N/A\')',
    history: []
  }
}
