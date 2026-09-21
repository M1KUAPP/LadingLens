import type { ControlGraph, GraphEdge, GraphNode } from '../types'

const nodes: GraphNode[] = [
  {
    id: 'email:email_001',
    kind: 'email',
    identifier: 'email_001',
    label: 'TO CONFIRM DOCS _ 5RSG-00133 _ CALLAO_PERU _ MOORIM SP CO., LTD',
    state: 'mismatch',
    detail: 'Consignee mismatch'
  },
  {
    id: 'email:email_004',
    kind: 'email',
    identifier: 'email_004',
    label: 'REQUEST BL DRAFT _ PO 26067_ COATED IVORY BOARD__138MT',
    state: 'match'
  },
  {
    id: 'email:email_009',
    kind: 'email',
    identifier: 'email_009',
    label: 'TO CONFIRM DOCS _ 5ALT-19136 _ MERSIN_TURKEY _ PACIFIC OFFICE (M) SDN BHD',
    state: 'match'
  },
  {
    id: 'email:email_013',
    kind: 'email',
    identifier: 'email_013',
    label: 'AFEMY - MOMBASA_KENYA - ROXCEL TRADING GMBH',
    state: 'match',
    detail: 'Case present, shipment link unmatched'
  },
  {
    id: 'email:email_507',
    kind: 'email',
    identifier: 'email_507',
    label: 'RE_ TO CONFIRM DOCS _ 5AKR-00230 _ KOPER_SLOVENIA _ 3S PAPER PRODUCTS SDN BHD',
    state: 'held',
    detail: 'Missing attachment'
  },
  {
    id: 'email:email_511',
    kind: 'email',
    identifier: 'email_511',
    label: 'RE_ TO CONFIRM DOCS _ 5SUS-40134 _ KOPER_SLOVENIA _ AL GURG STATIONERY LLC',
    state: 'held',
    detail: 'Unreadable file'
  },
  {
    id: 'email:email_516',
    kind: 'email',
    identifier: 'email_516',
    label: 'RE_ AFEMY - CONAKRY_GUINEA - MONTER - 5RCY-68239',
    state: 'held',
    detail: 'Missing value'
  },
  {
    id: 'email:email_ambiguous',
    kind: 'email',
    identifier: 'email_ambiguous',
    label: 'SI and Draft BL for OC 5RSG-0089 _ MELBOURNE _ ORIENT TRADING',
    state: 'held',
    detail: 'Ambiguous consignee match'
  },
  {
    id: 'shipment:SYN-001',
    kind: 'shipment',
    identifier: 'SYN-001',
    label: 'SYN-BK-001',
    state: 'match',
    detail: 'BL check required · Case present'
  },
  {
    id: 'shipment:SYN-007',
    kind: 'shipment',
    identifier: 'SYN-007',
    label: 'SYN-BK-007',
    state: 'match',
    detail: 'BL check required · Case present'
  },
  {
    id: 'shipment:SYN-013',
    kind: 'shipment',
    identifier: 'SYN-013',
    label: 'SYN-BK-013',
    state: 'match',
    detail: 'Draft BL expected · Case present'
  },
  {
    id: 'shipment:SYN-021',
    kind: 'shipment',
    identifier: 'SYN-021',
    label: 'SYN-BK-021',
    state: 'mismatch',
    detail: 'BL check required · Document missing'
  },
  {
    id: 'shipment:SYN-033',
    kind: 'shipment',
    identifier: 'SYN-033',
    label: 'SYN-BK-033',
    state: 'held',
    detail: 'BL check required · Unmatched case'
  },
  {
    id: 'shipment:SYN-042',
    kind: 'shipment',
    identifier: 'SYN-042',
    label: 'SYN-BK-042',
    state: 'mismatch',
    detail: 'Draft BL expected · Missing case'
  },
  {
    id: 'party:april-far-east',
    kind: 'party',
    label: 'APRIL FAR EAST (M) SDN BHD',
    state: 'match'
  },
  {
    id: 'party:moorim-sp',
    kind: 'party',
    label: 'MOORIM SP CO., LTD',
    state: 'mismatch',
    detail: 'SI consignee'
  },
  {
    id: 'party:moorim-paper',
    kind: 'party',
    label: 'MOORIM PAPER CO., LTD',
    state: 'mismatch',
    detail: 'Draft BL consignee'
  },
  {
    id: 'party:uab-novakopa',
    kind: 'party',
    label: 'UAB NOVAKOPA',
    state: 'match'
  },
  {
    id: 'party:3s-paper',
    kind: 'party',
    label: '3S PAPER PRODUCTS SDN BHD',
    state: 'neutral'
  },
  {
    id: 'party:al-gurg',
    kind: 'party',
    label: 'AL GURG STATIONERY LLC',
    state: 'neutral'
  },
  {
    id: 'party:kpp-antalis',
    kind: 'party',
    label: 'KPP-ANTALIS (SINGAPORE) PTE. LTD.',
    state: 'neutral'
  },
  {
    id: 'party:april-fine-paper',
    kind: 'party',
    label: 'APRIL Fine Paper Trading',
    state: 'neutral'
  },
  {
    id: 'party:monter-trading',
    kind: 'party',
    label: 'MONTER TRADING GUINEA',
    state: 'held',
    detail: 'BL consignee, SI value blank'
  },
  {
    id: 'party:pacific-timber',
    kind: 'party',
    label: 'PACIFIC TIMBER PRODUCTS SDN BHD',
    state: 'neutral'
  },
  {
    id: 'party:orient-trading',
    kind: 'party',
    label: 'ORIENT TRADING CO. (MELBOURNE) PTY LTD',
    state: 'held',
    detail: 'SI consignee'
  },
  {
    id: 'party:orient-enterprises',
    kind: 'party',
    label: 'ORIENT ENTERPRISES VIC PTY LTD',
    state: 'held',
    detail: 'Draft BL consignee'
  },
  {
    id: 'party:australian-customs',
    kind: 'party',
    label: 'AUSTRALIAN CUSTOMS BROKERS',
    state: 'neutral'
  },
  {
    id: 'port:MYPKG',
    kind: 'port',
    identifier: 'MYPKG',
    label: 'Port Klang (Westport), Malaysia',
    state: 'match'
  },
  {
    id: 'port:PECLL',
    kind: 'port',
    identifier: 'PECLL',
    label: 'Callao, Peru',
    state: 'match'
  },
  {
    id: 'port:SGSIN',
    kind: 'port',
    identifier: 'SGSIN',
    label: 'Singapore',
    state: 'neutral'
  },
  {
    id: 'port:SIKOP',
    kind: 'port',
    identifier: 'SIKOP',
    label: 'Koper, Slovenia',
    state: 'neutral'
  },
  {
    id: 'port:GNCKY',
    kind: 'port',
    identifier: 'GNCKY',
    label: 'Conakry, Guinea',
    state: 'neutral'
  },
  {
    id: 'port:AUMEL',
    kind: 'port',
    identifier: 'AUMEL',
    label: 'Melbourne, Australia',
    state: 'neutral'
  },
  {
    id: 'document:email_001_SI.txt',
    kind: 'document',
    identifier: 'email_001_SI.txt',
    label: 'Shipping instruction',
    state: 'neutral'
  },
  {
    id: 'document:email_001_BL.txt',
    kind: 'document',
    identifier: 'email_001_BL.txt',
    label: 'Draft bill of lading',
    state: 'neutral'
  },
  {
    id: 'document:email_507_SI.txt',
    kind: 'document',
    identifier: 'email_507_SI.txt',
    label: 'Shipping instruction',
    state: 'neutral'
  },
  {
    id: 'document:att_507_bl_missing',
    kind: 'document',
    identifier: 'att_507_bl_missing',
    label: 'Draft bill of lading',
    state: 'held',
    detail: 'Missing attachment'
  },
  {
    id: 'document:email_511_SI.txt',
    kind: 'document',
    identifier: 'email_511_SI.txt',
    label: 'Shipping instruction',
    state: 'neutral'
  },
  {
    id: 'document:email_511_BL.pdf',
    kind: 'document',
    identifier: 'email_511_BL.pdf',
    label: 'Draft bill of lading',
    state: 'held',
    detail: 'Unreadable file'
  },
  {
    id: 'document:email_516_SI.txt',
    kind: 'document',
    identifier: 'email_516_SI.txt',
    label: 'Shipping instruction',
    state: 'neutral'
  },
  {
    id: 'document:email_516_BL.txt',
    kind: 'document',
    identifier: 'email_516_BL.txt',
    label: 'Draft bill of lading',
    state: 'neutral'
  },
  {
    id: 'document:email_ambiguous_SI.txt',
    kind: 'document',
    identifier: 'email_ambiguous_SI.txt',
    label: 'Shipping instruction',
    state: 'neutral'
  },
  {
    id: 'document:email_ambiguous_BL.txt',
    kind: 'document',
    identifier: 'email_ambiguous_BL.txt',
    label: 'Draft bill of lading',
    state: 'neutral'
  },
  {
    id: 'mismatch:email_001_consignee',
    identifier: 'exc_email_001_consignee',
    kind: 'mismatch',
    label: 'Consignee mismatch',
    state: 'mismatch',
    detail: 'SI: MOORIM SP CO., LTD · BL: MOORIM PAPER CO., LTD'
  },
  {
    id: 'exception:email_507_missing_attachment',
    identifier: 'exc_email_507_missing_attachment',
    kind: 'exception',
    label: 'Missing attachment',
    state: 'held',
    detail: 'Draft BL required, not received'
  },
  {
    id: 'exception:email_511_unreadable',
    identifier: 'exc_email_511_unreadable',
    kind: 'exception',
    label: 'Unreadable file',
    state: 'held',
    detail: 'email_511_BL.pdf could not be parsed'
  },
  {
    id: 'exception:email_516_missing_value',
    identifier: 'exc_email_516_missing_value',
    kind: 'exception',
    label: 'Missing value',
    state: 'held',
    detail: 'Consignee blank in customer SI'
  },
  {
    id: 'exception:email_ambiguous',
    identifier: 'exc_email_ambiguous',
    kind: 'exception',
    label: 'Ambiguous match',
    state: 'held',
    detail: 'Consignee naming probability 0.68'
  },
  {
    id: 'exception:syn_021_document_missing',
    identifier: 'exc_syn_021',
    kind: 'exception',
    label: 'Document missing',
    state: 'mismatch',
    detail: 'Expected shipment SYN-021'
  },
  {
    id: 'exception:syn_033_unmatched_case',
    identifier: 'exc_syn_033',
    kind: 'exception',
    label: 'Unmatched case',
    state: 'held',
    detail: 'Claimed booking 5RFR-36541'
  },
  {
    id: 'exception:syn_042_missing_case',
    identifier: 'exc_syn_042',
    kind: 'exception',
    label: 'Missing case',
    state: 'mismatch',
    detail: 'Expected shipment SYN-042'
  }
]

const edges: GraphEdge[] = [
  {
    id: 'edge:email_001:att:si',
    source: 'email:email_001',
    target: 'document:email_001_SI.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_001:att:bl',
    source: 'email:email_001',
    target: 'document:email_001_BL.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_507:att:si',
    source: 'email:email_507',
    target: 'document:email_507_SI.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_507:att:bl',
    source: 'email:email_507',
    target: 'document:att_507_bl_missing',
    kind: 'attachment',
    label: 'Expected attachment'
  },
  {
    id: 'edge:email_511:att:si',
    source: 'email:email_511',
    target: 'document:email_511_SI.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_511:att:bl',
    source: 'email:email_511',
    target: 'document:email_511_BL.pdf',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_516:att:si',
    source: 'email:email_516',
    target: 'document:email_516_SI.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_516:att:bl',
    source: 'email:email_516',
    target: 'document:email_516_BL.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_ambiguous:att:si',
    source: 'email:email_ambiguous',
    target: 'document:email_ambiguous_SI.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:email_ambiguous:att:bl',
    source: 'email:email_ambiguous',
    target: 'document:email_ambiguous_BL.txt',
    kind: 'attachment',
    label: 'Attachment'
  },
  {
    id: 'edge:att_001_si:shipper',
    source: 'document:email_001_SI.txt',
    target: 'party:april-far-east',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_001_bl:shipper',
    source: 'document:email_001_BL.txt',
    target: 'party:april-far-east',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_001_si:consignee',
    source: 'document:email_001_SI.txt',
    target: 'party:moorim-sp',
    kind: 'party_role',
    label: 'Consignee',
    state: 'mismatch'
  },
  {
    id: 'edge:att_001_bl:consignee',
    source: 'document:email_001_BL.txt',
    target: 'party:moorim-paper',
    kind: 'party_role',
    label: 'Consignee',
    state: 'mismatch'
  },
  {
    id: 'edge:att_001_si:notify',
    source: 'document:email_001_SI.txt',
    target: 'party:uab-novakopa',
    kind: 'party_role',
    label: 'Notify party'
  },
  {
    id: 'edge:att_001_bl:notify',
    source: 'document:email_001_BL.txt',
    target: 'party:uab-novakopa',
    kind: 'party_role',
    label: 'Notify party'
  },
  {
    id: 'edge:att_507_si:consignee',
    source: 'document:email_507_SI.txt',
    target: 'party:3s-paper',
    kind: 'party_role',
    label: 'Consignee'
  },
  {
    id: 'edge:att_511_si:shipper',
    source: 'document:email_511_SI.txt',
    target: 'party:al-gurg',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_511_si:consignee',
    source: 'document:email_511_SI.txt',
    target: 'party:kpp-antalis',
    kind: 'party_role',
    label: 'Consignee'
  },
  {
    id: 'edge:att_516_si:shipper',
    source: 'document:email_516_SI.txt',
    target: 'party:april-fine-paper',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_516_bl:consignee',
    source: 'document:email_516_BL.txt',
    target: 'party:monter-trading',
    kind: 'party_role',
    label: 'Consignee',
    state: 'held'
  },
  {
    id: 'edge:att_amb_si:shipper',
    source: 'document:email_ambiguous_SI.txt',
    target: 'party:pacific-timber',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_amb_bl:shipper',
    source: 'document:email_ambiguous_BL.txt',
    target: 'party:pacific-timber',
    kind: 'party_role',
    label: 'Shipper'
  },
  {
    id: 'edge:att_amb_si:consignee',
    source: 'document:email_ambiguous_SI.txt',
    target: 'party:orient-trading',
    kind: 'party_role',
    label: 'Consignee',
    state: 'held'
  },
  {
    id: 'edge:att_amb_bl:consignee',
    source: 'document:email_ambiguous_BL.txt',
    target: 'party:orient-enterprises',
    kind: 'party_role',
    label: 'Consignee',
    state: 'held'
  },
  {
    id: 'edge:att_amb_si:notify',
    source: 'document:email_ambiguous_SI.txt',
    target: 'party:australian-customs',
    kind: 'party_role',
    label: 'Notify party'
  },
  {
    id: 'edge:att_amb_bl:notify',
    source: 'document:email_ambiguous_BL.txt',
    target: 'party:australian-customs',
    kind: 'party_role',
    label: 'Notify party'
  },
  {
    id: 'edge:att_001_si:pol',
    source: 'document:email_001_SI.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_001_si:pod',
    source: 'document:email_001_SI.txt',
    target: 'port:PECLL',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_001_bl:pol',
    source: 'document:email_001_BL.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_001_bl:pod',
    source: 'document:email_001_BL.txt',
    target: 'port:PECLL',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_507_si:pod',
    source: 'document:email_507_SI.txt',
    target: 'port:SIKOP',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_511_si:pol',
    source: 'document:email_511_SI.txt',
    target: 'port:SGSIN',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_511_si:pod',
    source: 'document:email_511_SI.txt',
    target: 'port:SIKOP',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_516_si:pol',
    source: 'document:email_516_SI.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_516_si:pod',
    source: 'document:email_516_SI.txt',
    target: 'port:GNCKY',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_516_bl:pol',
    source: 'document:email_516_BL.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_516_bl:pod',
    source: 'document:email_516_BL.txt',
    target: 'port:GNCKY',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_amb_si:pol',
    source: 'document:email_ambiguous_SI.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_amb_si:pod',
    source: 'document:email_ambiguous_SI.txt',
    target: 'port:AUMEL',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:att_amb_bl:pol',
    source: 'document:email_ambiguous_BL.txt',
    target: 'port:MYPKG',
    kind: 'routing',
    label: 'Port of loading'
  },
  {
    id: 'edge:att_amb_bl:pod',
    source: 'document:email_ambiguous_BL.txt',
    target: 'port:AUMEL',
    kind: 'routing',
    label: 'Port of discharge'
  },
  {
    id: 'edge:recon:SYN-001',
    source: 'email:email_001',
    target: 'shipment:SYN-001',
    kind: 'reconciles',
    label: 'Case present',
    state: 'match'
  },
  {
    id: 'edge:recon:SYN-007',
    source: 'email:email_004',
    target: 'shipment:SYN-007',
    kind: 'reconciles',
    label: 'Case present',
    state: 'match'
  },
  {
    id: 'edge:recon:SYN-013',
    source: 'email:email_009',
    target: 'shipment:SYN-013',
    kind: 'reconciles',
    label: 'Case present',
    state: 'match'
  },
  {
    id: 'edge:recon:SYN-021',
    source: 'email:email_507',
    target: 'shipment:SYN-021',
    kind: 'reconciles',
    label: 'Document missing',
    state: 'mismatch'
  },
  {
    id: 'edge:recon:SYN-033',
    source: 'email:email_013',
    target: 'shipment:SYN-033',
    kind: 'reconciles',
    label: 'Unmatched case',
    state: 'held'
  },
  {
    id: 'edge:flag:email_001:si',
    source: 'mismatch:email_001_consignee',
    target: 'document:email_001_SI.txt',
    kind: 'flags',
    label: 'Consignee mismatch',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:email_001:bl',
    source: 'mismatch:email_001_consignee',
    target: 'document:email_001_BL.txt',
    kind: 'flags',
    label: 'Consignee mismatch',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:email_001:si_party',
    source: 'mismatch:email_001_consignee',
    target: 'party:moorim-sp',
    kind: 'flags',
    label: 'Consignee mismatch',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:email_001:bl_party',
    source: 'mismatch:email_001_consignee',
    target: 'party:moorim-paper',
    kind: 'flags',
    label: 'Consignee mismatch',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:email_507:case',
    source: 'exception:email_507_missing_attachment',
    target: 'email:email_507',
    kind: 'flags',
    label: 'Missing attachment',
    state: 'held'
  },
  {
    id: 'edge:flag:email_507:doc',
    source: 'exception:email_507_missing_attachment',
    target: 'document:att_507_bl_missing',
    kind: 'flags',
    label: 'Missing attachment',
    state: 'held'
  },
  {
    id: 'edge:flag:email_511:case',
    source: 'exception:email_511_unreadable',
    target: 'email:email_511',
    kind: 'flags',
    label: 'Unreadable file',
    state: 'held'
  },
  {
    id: 'edge:flag:email_511:doc',
    source: 'exception:email_511_unreadable',
    target: 'document:email_511_BL.pdf',
    kind: 'flags',
    label: 'Unreadable file',
    state: 'held'
  },
  {
    id: 'edge:flag:email_516:case',
    source: 'exception:email_516_missing_value',
    target: 'email:email_516',
    kind: 'flags',
    label: 'Missing value',
    state: 'held'
  },
  {
    id: 'edge:flag:email_ambiguous:case',
    source: 'exception:email_ambiguous',
    target: 'email:email_ambiguous',
    kind: 'flags',
    label: 'Ambiguous match',
    state: 'held'
  },
  {
    id: 'edge:flag:email_ambiguous:si_party',
    source: 'exception:email_ambiguous',
    target: 'party:orient-trading',
    kind: 'flags',
    label: 'Ambiguous match',
    state: 'held'
  },
  {
    id: 'edge:flag:email_ambiguous:bl_party',
    source: 'exception:email_ambiguous',
    target: 'party:orient-enterprises',
    kind: 'flags',
    label: 'Ambiguous match',
    state: 'held'
  },
  {
    id: 'edge:flag:syn_021:shipment',
    source: 'exception:syn_021_document_missing',
    target: 'shipment:SYN-021',
    kind: 'flags',
    label: 'Document missing',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:syn_021:case',
    source: 'exception:syn_021_document_missing',
    target: 'email:email_507',
    kind: 'flags',
    label: 'Document missing',
    state: 'mismatch'
  },
  {
    id: 'edge:flag:syn_033:case',
    source: 'exception:syn_033_unmatched_case',
    target: 'email:email_013',
    kind: 'flags',
    label: 'Unmatched case',
    state: 'held'
  },
  {
    id: 'edge:flag:syn_042:shipment',
    source: 'exception:syn_042_missing_case',
    target: 'shipment:SYN-042',
    kind: 'flags',
    label: 'Missing case',
    state: 'mismatch'
  }
]

export const preparedControlGraph: ControlGraph = { nodes, edges }
