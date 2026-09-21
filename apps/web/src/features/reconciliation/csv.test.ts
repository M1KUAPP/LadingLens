import { describe, expect, it } from 'vitest'
import {
  EXPECTED_SHIPMENTS_CSV_HEADER,
  LEGACY_SHIPMENTS_CSV_HEADER,
  parseExpectedShipmentsCsv
} from './csv'
import artifactCsv from './fixtures/expected_shipments.csv?raw'

const IMPORTED_AT = '2026-09-19T09:00:00Z'

describe('parseExpectedShipmentsCsv', () => {
  it('parses the 10-column artifact CSV into six valid shipments', () => {
    const { shipments, errors } = parseExpectedShipmentsCsv(artifactCsv, IMPORTED_AT)
    expect(errors).toEqual([])
    expect(shipments.map((s) => s.shipment_id)).toEqual([
      'SHP-CASE-001',
      'SHP-DOC-507',
      'SYN-042',
      'SHP-STALE-013',
      'SHP-AMB-009-A',
      'SHP-AMB-009-B'
    ])
    const first = shipments[0]!
    expect(first.external_identifiers).toEqual({ order_number: '5RSG-00133' })
    expect(first.required_documents).toEqual(['SI', 'DRAFT_BL'])
    expect(first.source_updated_at).toBe('2026-01-23T00:00:00Z')
    expect(first.source_freshness).toBe('CURRENT')
    expect(first.source_hash).toMatch(/^prepared_[0-9a-f]{8}$/)
  })

  it('still parses the legacy 7-column CSV', () => {
    const csv = [
      LEGACY_SHIPMENTS_CSV_HEADER,
      'SYN-500,SYN-BK-500,BL_CHECK_REQUIRED,SI;DRAFT_BL,2026-09-23T08:00:00Z,Hafiz Tan,CURRENT'
    ].join('\n')
    const { shipments, errors } = parseExpectedShipmentsCsv(csv, IMPORTED_AT)
    expect(errors).toEqual([])
    expect(shipments).toHaveLength(1)
    expect(shipments[0]?.shipment_id).toBe('SYN-500')
    expect(shipments[0]?.external_identifiers).toEqual({})
    expect(shipments[0]?.required_documents).toEqual(['SI', 'DRAFT_BL'])
    expect(shipments[0]?.source_updated_at).toBe(IMPORTED_AT)
  })

  it('flags a malformed external_identifiers cell as a row error', () => {
    const csv = [
      EXPECTED_SHIPMENTS_CSV_HEADER,
      'SYS,SHP-1,BK-1,"{""order_number"":oops}",DRAFT_BL_EXPECTED,"[""SI""]",2026-01-24T00:00:00Z,docs,2026-01-23T00:00:00Z,CURRENT'
    ].join('\n')
    const { shipments, errors } = parseExpectedShipmentsCsv(csv, IMPORTED_AT)
    expect(shipments).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ row: 2, column: 'external_identifiers' })
  })

  it.each([
    ['empty', '""'],
    ['malformed', '"[""SI"",oops]"'],
    ['unknown member', '"[""SI"",""INVOICE""]"']
  ])('flags a bad required_documents cell as a row error: %s', (_label, cell) => {
    const csv = [
      EXPECTED_SHIPMENTS_CSV_HEADER,
      `SYS,SHP-1,BK-1,"{""order_number"":""5RSG-1""}",DRAFT_BL_EXPECTED,${cell},2026-01-24T00:00:00Z,docs,2026-01-23T00:00:00Z,CURRENT`
    ].join('\n')
    const { shipments, errors } = parseExpectedShipmentsCsv(csv, IMPORTED_AT)
    expect(shipments).toHaveLength(0)
    expect(errors.some((e) => e.column === 'required_documents' && e.row === 2)).toBe(true)
  })

  it('flags a malformed source_updated_at as a row error', () => {
    const csv = [
      EXPECTED_SHIPMENTS_CSV_HEADER,
      'SYS,SHP-1,BK-1,,DRAFT_BL_EXPECTED,"[""SI""]",2026-01-24T00:00:00Z,docs,soon,CURRENT'
    ].join('\n')
    const { shipments, errors } = parseExpectedShipmentsCsv(csv, IMPORTED_AT)
    expect(shipments).toHaveLength(0)
    expect(errors).toEqual([
      { row: 2, column: 'source_updated_at', message: 'source_updated_at must be an ISO 8601 timestamp' }
    ])
  })

  it('names both accepted headers when the header is wrong', () => {
    const { shipments, errors } = parseExpectedShipmentsCsv('a,b,c\n1,2,3', IMPORTED_AT)
    expect(shipments).toEqual([])
    expect(errors).toHaveLength(1)
    expect(errors[0]?.row).toBe(1)
    expect(errors[0]?.message).toContain(EXPECTED_SHIPMENTS_CSV_HEADER)
    expect(errors[0]?.message).toContain(LEGACY_SHIPMENTS_CSV_HEADER)
  })

  it('splits quoted fields containing commas and escaped quotes', () => {
    const csv = [
      EXPECTED_SHIPMENTS_CSV_HEADER,
      'SYS,SHP-1,"BK, with comma","{""order_number"":""5RSG-1""}","DRAFT_""BL""_EXPECTED","[""SI""]",2026-01-24T00:00:00Z,docs,2026-01-23T00:00:00Z,CURRENT'
    ].join('\n')
    const { shipments, errors } = parseExpectedShipmentsCsv(csv, IMPORTED_AT)
    expect(errors).toEqual([])
    expect(shipments[0]?.booking_reference).toBe('BK, with comma')
    expect(shipments[0]?.external_identifiers).toEqual({ order_number: '5RSG-1' })
    expect(shipments[0]?.lifecycle).toBe('DRAFT_"BL"_EXPECTED')
  })
})
