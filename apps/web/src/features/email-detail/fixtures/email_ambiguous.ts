import type { EmailDetailRecord } from '../types'

export const emailAmbiguousFixture: EmailDetailRecord = {
  email_id: 'email_ambiguous',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'NEEDS_REVIEW',
  attachments: [
    {
      attachment_id: 'att_amb_si',
      file_name: 'email_ambiguous_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 680
    },
    {
      attachment_id: 'att_amb_bl',
      file_name: 'email_ambiguous_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 672
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'PACIFIC TIMBER PRODUCTS SDN BHD',
        normalized_value: 'PACIFIC TIMBER PRODUCTS SDN BHD',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 40 }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'PACIFIC TIMBER PRODUCTS SDN BHD',
        normalized_value: 'PACIFIC TIMBER PRODUCTS SDN BHD',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 4, start_col: 9, end_col: 40 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: 'ORIENT TRADING CO. (MELBOURNE) PTY LTD',
        normalized_value: 'ORIENT TRADING CO. (MELBOURNE) PTY LTD',
        confidence: 0.92,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 49 }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'ORIENT ENTERPRISES VIC PTY LTD',
        normalized_value: 'ORIENT ENTERPRISES VIC PTY LTD',
        confidence: 0.91,
        provenance: {
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 6, start_col: 11, end_col: 41 }
        }
      },
      verdict: 'REVIEW',
      semantic_probability: 0.68,
      reason: 'Semantic ambiguity in entity trading division name'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'AUSTRALIAN CUSTOMS BROKERS',
        normalized_value: 'AUSTRALIAN CUSTOMS BROKERS',
        confidence: 0.96,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 14, end_col: 40 }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'AUSTRALIAN CUSTOMS BROKERS',
        normalized_value: 'AUSTRALIAN CUSTOMS BROKERS',
        confidence: 0.96,
        provenance: {
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 8, start_col: 8, end_col: 34 }
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
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
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
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
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
        raw_value: 'MELBOURNE, AUSTRALIA (AUMEL)',
        normalized_value: 'AUMEL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 16, end_col: 44 }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'MELBOURNE, AUSTRALIA (AUMEL)',
        normalized_value: 'AUMEL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 5, end_col: 33 }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: "1 x 40'HC",
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
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
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
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
        raw_value: '22,100 KG',
        normalized_value: 22100,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_si',
          file_name: 'email_ambiguous_SI.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 19, end_col: 28 }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '22,100 KG',
        normalized_value: 22100,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_amb_bl',
          file_name: 'email_ambiguous_BL.txt',
          format: 'txt',
          location: { kind: 'txt', line: 12, start_col: 16, end_col: 25 }
        }
      },
      verdict: 'MATCH'
    }
  ],
  held_review: {
    case_id: 'case_ambiguous_01',
    email_id: 'email_ambiguous',
    status: 'NEEDS_REVIEW',
    probability: 0.68,
    assigned_owner: 'Marcus Vance',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_ambiguous',
      sender: 'docs@pacificshipping.com',
      subject: 'SI and Draft BL for OC 5RSG-0089 _ MELBOURNE _ ORIENT TRADING',
      received_at: '2026-09-18T14:32:00Z',
      message_hash: '3f7b2c9180ae1492'
    },
    evidence_summary: 'Consignee naming has semantic probability 0.68 in interactive review band (0.30 to 0.85). Human custody required before bill of lading release.',
    history: [
      {
        id: 'hist_amb_1',
        timestamp: '2026-09-18T14:32:05Z',
        actor: 'Semantic Evaluation Model',
        action: 'CREATED',
        note: 'Calculated equivalence probability P=0.68'
      },
      {
        id: 'hist_amb_2',
        timestamp: '2026-09-18T14:33:10Z',
        actor: 'System',
        action: 'ASSIGNED',
        note: 'Assigned to Marcus Vance'
      }
    ]
  }
}
