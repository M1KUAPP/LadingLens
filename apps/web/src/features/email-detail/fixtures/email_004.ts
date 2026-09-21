import type { EmailDetailRecord } from '../types'

export const email004Fixture: EmailDetailRecord = {
  email_id: 'email_004',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'MISMATCH',
  attachments: [
    {
      attachment_id: 'email_004-1',
      file_name: 'email_004_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 644
    },
    {
      attachment_id: 'email_004-2',
      file_name: 'email_004_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 622
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'APRIL FAR EAST (M) SDN BHD',
        normalized_value: 'april far east m sdn bhd',
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 4,
            start_col: 9,
            end_col: 35
          }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'APRIL FAR EAST (M) SDN BHD',
        normalized_value: 'april far east m sdn bhd',
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 4,
            start_col: 9,
            end_col: 35
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Shipper is the same after normalization'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: 'EAST BRIGHT FZ-LLC',
        normalized_value: 'east bright fz llc',
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 6,
            start_col: 28,
            end_col: 46
          }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'uab novakopa',
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 6,
            start_col: 17,
            end_col: 29
          }
        }
      },
      verdict: 'MISMATCH',
      reason: 'Prepared baseline: the texts differ after normalization and were not judged by Jev'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'EAST BRIGHT FZ-LLC',
        normalized_value: 'east bright fz llc',
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 8,
            start_col: 8,
            end_col: 26
          }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'uab novakopa',
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 8,
            start_col: 14,
            end_col: 26
          }
        }
      },
      verdict: 'MISMATCH',
      reason: 'Prepared baseline: the texts differ after normalization and were not judged by Jev'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'NANTONG, CHINA (CNNTG)',
        normalized_value: 'nantong china',
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 9,
            start_col: 23,
            end_col: 45
          }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: 'NANTONG, CHINA (CNNTG)',
        normalized_value: 'nantong china',
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 9,
            start_col: 23,
            end_col: 45
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Port of loading is the same after normalization'
    },
    {
      field: 'port_of_discharge',
      si: {
        field: 'port_of_discharge',
        raw_value: 'KARACHI, PAKISTAN (PKKHI)',
        normalized_value: 'karachi pakistan',
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 10,
            start_col: 5,
            end_col: 30
          }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'KARACHI, PAKISTAN (PKKHI)',
        normalized_value: 'karachi pakistan',
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 10,
            start_col: 5,
            end_col: 30
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Port of discharge is the same after normalization'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: '6 x 40\'HC',
        normalized_value: 6,
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 11,
            start_col: 18,
            end_col: 27
          }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: '6 x 40\'HC',
        normalized_value: 6,
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 11,
            start_col: 17,
            end_col: 26
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Container count is 6 in both documents'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '131,058 KG',
        normalized_value: 131058,
        provenance: {
          attachment_id: 'email_004-1',
          file_name: 'email_004_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 12,
            start_col: 16,
            end_col: 26
          }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '131,058 KG',
        normalized_value: 131058,
        provenance: {
          attachment_id: 'email_004-2',
          file_name: 'email_004_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 12,
            start_col: 19,
            end_col: 29
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Gross weight is 131,058 in both documents'
    }
  ]
}
