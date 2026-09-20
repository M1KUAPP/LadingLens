import type { EmailDetailRecord } from '../types'

export const email511Fixture: EmailDetailRecord = {
  email_id: 'email_511',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'unreadable',
  attachments: [
    {
      attachment_id: 'att_511_si',
      file_name: 'email_511_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 612
    },
    {
      attachment_id: 'att_511_bl',
      file_name: 'email_511_BL.pdf',
      detected_format: 'pdf',
      document_type: 'DRAFT_BL',
      parse_state: 'UNREADABLE',
      byte_size: 775,
      error: 'Corrupted binary fragment: no cross-reference tables found'
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'AL GURG STATIONERY LLC',
        normalized_value: 'AL GURG STATIONERY LLC',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 31 }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Draft bill of lading PDF is corrupted and cannot be parsed'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: 'KPP-ANTALIS (SINGAPORE) PTE. LTD.',
        normalized_value: 'KPP-ANTALIS (SINGAPORE) PTE. LTD.',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 44 }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'SAME AS CONSIGNEE',
        normalized_value: 'SAME AS CONSIGNEE',
        confidence: 0.95,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 14, end_col: 31 }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'SINGAPORE (SGSIN)',
        normalized_value: 'SGSIN',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 9, start_col: 17, end_col: 34 }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    },
    {
      field: 'port_of_discharge',
      si: {
        field: 'port_of_discharge',
        raw_value: 'KOPER, SLOVENIA (SIKOP)',
        normalized_value: 'SIKOP',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 16, end_col: 39 }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: "1 x 20'GP",
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 11, start_col: 31, end_col: 40 }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '18,400 KG',
        normalized_value: 18400,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_511_si',
          file_name: 'email_511_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 19, end_col: 28 }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_511_bl',
          file_name: 'email_511_BL.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Unreadable draft BL source'
    }
  ],
  held_review: {
    case_id: 'case_email_511',
    email_id: 'email_511',
    status: 'NEEDS_REVIEW',
    review_reason: 'unreadable',
    assigned_owner: 'Willy Situmorang',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_511',
      sender: 'willy_ss@aprilasia.com',
      subject: 'RE_ TO CONFIRM DOCS _ 5SUS-40134 _ KOPER_SLOVENIA _ AL GURG STATIONERY LLC _ MCLSIN6917768',
      received_at: '2026-09-18T12:05:00Z',
      message_hash: '7c129e840d21a415'
    },
    evidence_summary: 'Draft BL PDF attachment email_511_BL.pdf is truncated or corrupted (775 bytes). No objects or cross-reference tables found.',
    history: [
      {
        id: 'hist_511_1',
        timestamp: '2026-09-18T12:05:02Z',
        actor: 'Parser Preflight',
        action: 'CREATED',
        note: 'Format parser failed to parse email_511_BL.pdf'
      },
      {
        id: 'hist_511_2',
        timestamp: '2026-09-18T12:06:10Z',
        actor: 'System',
        action: 'ASSIGNED',
        note: 'Assigned to Willy Situmorang for manual attachment request'
      }
    ]
  }
}
