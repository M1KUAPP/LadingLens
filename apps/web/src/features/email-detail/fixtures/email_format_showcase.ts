import type { EmailDetailRecord } from '../types'

export const emailFormatShowcaseFixture: EmailDetailRecord = {
  email_id: 'email_format_showcase',
  is_prepared: true,
  category: 'BL_COMPARISON',
  status: 'MISMATCH',
  attachments: [
    {
      attachment_id: 'att_txt',
      file_name: 'manifest.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 1024
    },
    {
      attachment_id: 'att_pdf_dig',
      file_name: 'bill_digital.pdf',
      detected_format: 'pdf',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 45000
    },
    {
      attachment_id: 'att_xlsx',
      file_name: 'booking_sheet.xlsx',
      detected_format: 'xlsx',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 18000
    },
    {
      attachment_id: 'att_docx',
      file_name: 'draft_bl.docx',
      detected_format: 'docx',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 24000
    },
    {
      attachment_id: 'att_scan',
      file_name: 'scan_bl.pdf',
      detected_format: 'pdf',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 89000
    },
    {
      attachment_id: 'att_corrupt',
      file_name: 'corrupted_fragment.pdf',
      detected_format: 'pdf',
      document_type: 'DRAFT_BL',
      parse_state: 'UNREADABLE',
      byte_size: 512,
      error: 'Corrupted binary fragment'
    }
  ],
  field_verdicts: [
    {
      field: 'shipper',
      si: {
        field: 'shipper',
        raw_value: 'TXT_VALUE_PT_INDAH',
        normalized_value: 'TXT_VALUE_PT_INDAH',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_txt',
          file_name: 'manifest.txt',
          format: 'txt',
          location: { kind: 'txt', line: 10, start_col: 5, end_col: 25 }
        }
      },
      draft_bl: {
        field: 'shipper',
        raw_value: 'PDF_DIGITAL_VALUE',
        normalized_value: 'PDF_DIGITAL_VALUE',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_pdf_dig',
          file_name: 'bill_digital.pdf',
          format: 'digital_pdf',
          location: {
            kind: 'digital_pdf',
            page: 1,
            bbox: [72.0, 140.0, 280.0, 165.0],
            approximate: false
          }
        }
      },
      verdict: 'MISMATCH'
    },
    {
      field: 'consignee',
      si: {
        field: 'consignee',
        raw_value: 'XLSX_VALUE_BALL_DOGGETT',
        normalized_value: 'XLSX_VALUE_BALL_DOGGETT',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_xlsx',
          file_name: 'booking_sheet.xlsx',
          format: 'xlsx',
          location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B5' }
        }
      },
      draft_bl: {
        field: 'consignee',
        raw_value: 'DOCX_VALUE_TABLE_CELL',
        normalized_value: 'DOCX_VALUE_TABLE_CELL',
        confidence: 0.98,
        provenance: {
          attachment_id: 'att_docx',
          file_name: 'draft_bl.docx',
          format: 'docx',
          location: {
            kind: 'docx_table',
            table_index: 0,
            row_index: 1,
            col_index: 1
          }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'notify_party',
      si: {
        field: 'notify_party',
        raw_value: 'DOCX_PARAGRAPH_VALUE',
        normalized_value: 'DOCX_PARAGRAPH_VALUE',
        confidence: 0.95,
        provenance: {
          attachment_id: 'att_docx',
          file_name: 'draft_bl.docx',
          format: 'docx',
          location: { kind: 'docx_paragraph', paragraph_index: 2 }
        }
      },
      draft_bl: {
        field: 'notify_party',
        raw_value: 'SCAN_VALUE_APPROX_REGION',
        normalized_value: 'SCAN_VALUE_APPROX_REGION',
        confidence: 0.91,
        provenance: {
          attachment_id: 'att_scan',
          file_name: 'scan_bl.pdf',
          format: 'scanned_pdf',
          location: {
            kind: 'scanned_pdf',
            page: 1,
            approximate: true,
            region: 'cargo'
          }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'port_of_loading',
      si: {
        field: 'port_of_loading',
        raw_value: 'PORT KLANG (MYPKG)',
        normalized_value: 'MYPKG',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_txt',
          file_name: 'manifest.txt',
          format: 'txt',
          location: { kind: 'txt', line: 15, start_col: 1, end_col: 19 }
        }
      },
      draft_bl: {
        field: 'port_of_loading',
        raw_value: undefined,
        normalized_value: undefined,
        confidence: undefined,
        provenance: {
          attachment_id: 'att_corrupt',
          file_name: 'corrupted_fragment.pdf',
          format: 'pdf',
          parse_error: 'corrupted_file'
        }
      },
      verdict: 'REVIEW',
      reason: 'Draft BL file is corrupted'
    },
    {
      field: 'port_of_discharge',
      si: {
        field: 'port_of_discharge',
        raw_value: 'CALLAO (PECLL)',
        normalized_value: 'PECLL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_txt',
          file_name: 'manifest.txt',
          format: 'txt',
          location: { kind: 'txt', line: 16, start_col: 1, end_col: 15 }
        }
      },
      draft_bl: {
        field: 'port_of_discharge',
        raw_value: 'CALLAO (PECLL)',
        normalized_value: 'PECLL',
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_pdf_dig',
          file_name: 'bill_digital.pdf',
          format: 'digital_pdf',
          location: {
            kind: 'digital_pdf',
            page: 1,
            bbox: [72.0, 200.0, 250.0, 220.0],
            approximate: false
          }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'container_count',
      si: {
        field: 'container_count',
        raw_value: '1',
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_xlsx',
          file_name: 'booking_sheet.xlsx',
          format: 'xlsx',
          location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B8' }
        }
      },
      draft_bl: {
        field: 'container_count',
        raw_value: '1',
        normalized_value: 1,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_pdf_dig',
          file_name: 'bill_digital.pdf',
          format: 'digital_pdf',
          location: {
            kind: 'digital_pdf',
            page: 1,
            bbox: [72.0, 300.0, 150.0, 315.0],
            approximate: false
          }
        }
      },
      verdict: 'MATCH'
    },
    {
      field: 'gross_weight_kg',
      si: {
        field: 'gross_weight_kg',
        raw_value: '25,000 KG',
        normalized_value: 25000,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_xlsx',
          file_name: 'booking_sheet.xlsx',
          format: 'xlsx',
          location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B9' }
        }
      },
      draft_bl: {
        field: 'gross_weight_kg',
        raw_value: '25,000 KG',
        normalized_value: 25000,
        confidence: 0.99,
        provenance: {
          attachment_id: 'att_pdf_dig',
          file_name: 'bill_digital.pdf',
          format: 'digital_pdf',
          location: {
            kind: 'digital_pdf',
            page: 1,
            bbox: [72.0, 330.0, 190.0, 345.0],
            approximate: false
          }
        }
      },
      verdict: 'MATCH'
    }
  ],
  held_review: {
    case_id: 'case_showcase',
    email_id: 'email_format_showcase',
    status: 'MISMATCH',
    assigned_owner: 'Kiran Patel',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_format_showcase',
      sender: 'ops@formatshowcase.com',
      subject: 'Showcase Multi Format Evidence',
      received_at: '2026-09-18T15:00:00Z',
      message_hash: 'abc1234fed5678'
    },
    evidence_summary: 'Showcase record with multi-format anchors',
    history: [
      {
        id: 'hist_showcase_1',
        timestamp: '2026-09-18T15:00:05Z',
        actor: 'Engine',
        action: 'CREATED',
        note: 'Loaded multi-format evidence record'
      }
    ]
  }
}
