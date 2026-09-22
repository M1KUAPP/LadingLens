import { parseExpectedShipmentsCsv } from '../csv'
import type { ReceivedCase } from '../types'
import csvText from './expected_shipments.csv?raw'
import casesText from './received_cases.json?raw'

export const EXPECTED_SHIPMENTS_CSV = csvText

// The seed's inbox was read on 2026-09-20; the ledger was exported the day before.
const PREPARED_AT = '2026-09-19T00:00:00Z'

const parsed = parseExpectedShipmentsCsv(csvText, PREPARED_AT)
if (parsed.errors.length > 0) {
  throw new Error(
    `expected_shipments.csv fixture failed to parse: ${parsed.errors
      .map((e) => `row ${e.row}: ${e.message}`)
      .join('; ')}`
  )
}

export const PREPARED_EXPECTED_SHIPMENTS = parsed.shipments

/** The seed's BL cases, written by apps/api/scripts/build_web_fixtures.py. */
export const PREPARED_RECEIVED_CASES = JSON.parse(casesText) as ReceivedCase[]
