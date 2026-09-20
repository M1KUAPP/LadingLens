import type { EmailDetailRecord } from '../types'

export const email516Fixture: EmailDetailRecord = {
  email_id: 'email_516',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  review_reason: 'missing_value',
  attachments: [
    {
      attachment_id: 'att_516_si',
      file_name: 'email_516_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 580
    },
    {
      attachment_id: 'att_516_bl',
      file_name: 'email_516_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 630
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'APRIL Fine Paper Trading',
        normalized_value: 'APRIL Fine Paper Trading',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 33 }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'APRIL Fine Paper Trading',
        normalized_value: 'APRIL Fine Paper Trading',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 33 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: 0,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 11 }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'MONTER TRADING GUINEA',
        normalized_value: 'MONTER TRADING GUINEA',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 32 }
        }
      },
      verdict: 'REVIEW',
      reason: 'Missing consignee value in customer SI'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'SAME AS CONSIGNEE',
        normalized_value: 'SAME AS CONSIGNEE',
        confidence: 0.95,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 14, end_col: 31 }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'SAME AS CONSIGNEE',
        normalized_value: 'SAME AS CONSIGNEE',
        confidence: 0.95,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 8, end_col: 25 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG, MALAYSIA (MYPKG)',
        normalized_value: 'MYPKG',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 9, start_col: 17, end_col: 45 }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG, MALAYSIA (MYPKG)',
        normalized_value: 'MYPKG',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 9, start_col: 23, end_col: 51 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'port_of_discharge',
      si: {
        field: 'port_of_discharge',
        raw_value: 'CONAKRY, GUINEA (GNCKY)',
        normalized_value: 'GNCKY',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 16, end_col: 39 }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'CONAKRY, GUINEA (GNCKY)',
        normalized_value: 'GNCKY',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 5, end_col: 28 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: "2 x 20'GP",
        normalized_value: 2,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 11, start_col: 31, end_col: 40 }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: "2 x 20'GP",
        normalized_value: 2,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 11, start_col: 17, end_col: 26 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '36,800 KG',
        normalized_value: 36800,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_si',
          file_name: 'email_516_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 19, end_col: 28 }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '36,800 KG',
        normalized_value: 36800,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_516_bl',
          file_name: 'email_516_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 16, end_col: 25 }
        }
      },
      verdict: 'MATCH'
    }
  ],
  held_review: {
    case_id: 'case_email_516',
    email_id: 'email_516',
    status: 'NEEDS_REVIEW',
    review_reason: 'missing_value',
    assigned_owner: 'Elisa Tukiman',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_516',
      sender: 'elisa_tukiman@april.com.my',
      subject: 'RE_ AFEMY - CONAKRY_GUINEA - MONTER(MCLSIN6123859) - 5RCY-68239 - 5250074840 - KPP-ANTALIS (SINGAPORE) PTE. LTD. - OA_CFR',
      received_at: '2026-09-18T13:45:00Z',
      message_hash: '2d4e6108af37b291'
    },
    evidence_summary: 'Consignee field in customer SI is blank. Value must be verified against booking reference before sign-off.',
    history: [
      {
        id: 'hist_516_1',
        timestamp: '2026-09-18T13:45:06Z',
        actor: 'Extraction Engine',
        action: 'CREATED',
        note: 'Flagged missing value: consignee blank in SI'
      },
      {
        id: 'hist_516_2',
        timestamp: '2026-09-18T13:46:12Z',
        actor: 'System',
        action: 'ASSIGNED',
        note: 'Assigned to Elisa Tukiman'
      }
    ]
  }
}
