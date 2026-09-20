import type { EmailDetailRecord } from '../types'

export const email001Fixture: EmailDetailRecord = {
  email_id: 'email_001',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'MISMATCH',
  review_reason: undefined,
  attachments: [
    {
      attachment_id: 'att_001_si',
      file_name: 'email_001_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 671
    },
    {
      attachment_id: 'att_001_bl',
      file_name: 'email_001_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 647
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'APRIL FAR EAST (M) SDN BHD',
        normalized_value: 'APRIL FAR EAST (M) SDN BHD',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 18, end_col: 44 }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'APRIL FAR EAST (M) SDN BHD',
        normalized_value: 'APRIL FAR EAST (M) SDN BHD',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 35 }
        }
      },
      verdict: 'MATCH',
      reason: 'Exact textual match after whitespace normalization'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: 'MOORIM SP CO., LTD',
        normalized_value: 'MOORIM SP CO., LTD',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 29 }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'MOORIM PAPER CO., LTD',
        normalized_value: 'MOORIM PAPER CO., LTD',
        confidence: 0.97,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 32 }
        }
      },
      verdict: 'MISMATCH',
      reason: 'Entity name differs: MOORIM SP CO., LTD vs MOORIM PAPER CO., LTD'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'UAB NOVAKOPA',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 14, end_col: 26 }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'UAB NOVAKOPA',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 8, end_col: 20 }
        }
      },
      verdict: 'MATCH',
      reason: 'Exact textual match'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG (WESTPORT), MALAYSIA (MYPKG)',
        normalized_value: 'MYPKG',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 9, start_col: 17, end_col: 56 }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG (WESTPORT), MALAYSIA (MYPKG)',
        normalized_value: 'MYPKG',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 9, start_col: 23, end_col: 62 }
        }
      },
      verdict: 'MATCH',
      reason: 'UN/LOCODE MYPKG aligned'
    },
    {
      field: 'port_of_discharge',
      si: {
        field: 'port_of_discharge',
        raw_value: 'CALLAO, PERU (PECLL)',
        normalized_value: 'PECLL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 16, end_col: 36 }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'CALLAO, PERU (PECLL)',
        normalized_value: 'PECLL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 5, end_col: 25 }
        }
      },
      verdict: 'MATCH',
      reason: 'UN/LOCODE PECLL aligned'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: "1 x 40'HC",
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 11, start_col: 31, end_col: 40 }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: "1 x 40'HC",
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 11, start_col: 17, end_col: 26 }
        }
      },
      verdict: 'MATCH',
      reason: 'Numeric container count equals 1'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '21,577 KG',
        normalized_value: 21577,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_si',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 19, end_col: 28 }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '21,577 KG',
        normalized_value: 21577,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_001_bl',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 16, end_col: 25 }
        }
      },
      verdict: 'MATCH',
      reason: 'Numeric weight equals 21577 kg'
    }
  ],
  held_review: {
    case_id: 'case_email_001',
    email_id: 'email_001',
    status: 'MISMATCH',
    assigned_owner: 'Aisyah Razak',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_001',
      sender: 'aziztz@safqa.co.ke',
      subject: 'TO CONFIRM DOCS _ 5RSG-00133 _ CALLAO_PERU _ MOORIM SP CO., LTD _ MEDUUD104332',
      received_at: '2026-09-18T10:14:00Z',
      message_hash: '9a31c3bf1e0d4a7c'
    },
    evidence_summary: 'Consignee mismatch detected: MOORIM SP CO., LTD vs MOORIM PAPER CO., LTD',
    history: [
      {
        id: 'hist_001_1',
        timestamp: '2026-09-18T10:14:08Z',
        actor: 'Comparison Engine',
        action: 'CREATED',
        note: 'Flagged consignee discrepancy between SI and draft BL'
      },
      {
        id: 'hist_001_2',
        timestamp: '2026-09-18T10:15:20Z',
        actor: 'System',
        action: 'ASSIGNED',
        note: 'Assigned to Aisyah Razak for verification'
      }
    ]
  }
}
