import type { EmailDetailRecord } from '../types'

export const email001Fixture: EmailDetailRecord = {
  email_id: 'email_001',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'OK',
  attachments: [
    {
      attachment_id: 'email_001-1',
      file_name: 'email_001_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 702
    },
    {
      attachment_id: 'email_001-2',
      file_name: 'email_001_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 632
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
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 4,
            start_col: 18,
            end_col: 44
          }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'APRIL FAR EAST (M) SDN BHD',
        normalized_value: 'april far east m sdn bhd',
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
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
        raw_value: 'MOORIM SP CO., LTD',
        normalized_value: 'moorim sp co ltd',
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 6,
            start_col: 11,
            end_col: 29
          }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'MOORIM SP CO., LTD',
        normalized_value: 'moorim sp co ltd',
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 6,
            start_col: 11,
            end_col: 29
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Consignee is the same after normalization'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'uab novakopa',
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 8,
            start_col: 14,
            end_col: 26
          }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'UAB NOVAKOPA',
        normalized_value: 'uab novakopa',
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 8,
            start_col: 8,
            end_col: 20
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Notify party is the same after normalization'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG (WESTPORT), MALAYSIA (MYPKG)',
        normalized_value: 'port klang westport malaysia',
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 9,
            start_col: 17,
            end_col: 56
          }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG (WESTPORT), MALAYSIA (MYPKG)',
        normalized_value: 'port klang westport malaysia',
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 9,
            start_col: 23,
            end_col: 62
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
        raw_value: 'CALLAO, PERU (PECLL)',
        normalized_value: 'callao peru',
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 10,
            start_col: 16,
            end_col: 36
          }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'CALLAO, PERU (PECLL)',
        normalized_value: 'callao peru',
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 10,
            start_col: 5,
            end_col: 25
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
        raw_value: '1 x 40\'HC',
        normalized_value: 1,
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 11,
            start_col: 31,
            end_col: 40
          }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: '1 x 40\'HC',
        normalized_value: 1,
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
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
      reason: 'Container count is 1 in both documents'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '21,577 KG',
        normalized_value: 21577,
        provenance: {
          attachment_id: 'email_001-1',
          file_name: 'email_001_SI.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 12,
            start_col: 19,
            end_col: 28
          }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '21,577 KG',
        normalized_value: 21577,
        provenance: {
          attachment_id: 'email_001-2',
          file_name: 'email_001_BL.txt',
          format: 'txt',
          location: {
            kind: 'txt',
            line: 12,
            start_col: 16,
            end_col: 25
          }
        }
      },
      verdict: 'MATCH',
      reason: 'Gross weight is 21,577 in both documents'
    }
  ]
}
