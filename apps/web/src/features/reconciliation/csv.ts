import type { ExpectedShipment, RequiredDocument, SourceFreshness } from '../../domain/contracts'
import type { CsvImportError } from './types'

export const EXPECTED_SHIPMENTS_CSV_HEADER =
  'shipment_id,booking_reference,lifecycle,required_documents,cutoff_at,owner,source_freshness'

const REQUIRED_DOCUMENTS = new Set<RequiredDocument>(['SI', 'DRAFT_BL'])
const SOURCE_FRESHNESS = new Set<SourceFreshness>(['CURRENT', 'STALE'])

export function stableHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function parseExpectedShipmentsCsv(
  csvText: string,
  importedAt: string
): { shipments: ExpectedShipment[]; errors: CsvImportError[] } {
  const shipments: ExpectedShipment[] = []
  const errors: CsvImportError[] = []
  const seenIds = new Set<string>()

  const lines = csvText.replace(/\r\n/g, '\n').split('\n')
  const header = lines[0]?.trim()
  if (header !== EXPECTED_SHIPMENTS_CSV_HEADER) {
    return {
      shipments,
      errors: [
        {
          row: 1,
          message: `Header must be exactly "${EXPECTED_SHIPMENTS_CSV_HEADER}"`
        }
      ]
    }
  }

  for (let index = 1; index < lines.length; index += 1) {
    const raw = lines[index]
    if (!raw || raw.trim() === '') continue
    const row = index + 1
    const cells = raw.split(',')
    if (cells.length !== 7) {
      errors.push({ row, message: `Expected 7 columns, found ${cells.length}` })
      continue
    }
    const [shipmentId, bookingReference, lifecycle, requiredDocuments, cutoffAt, owner, sourceFreshness] = cells.map(
      (cell) => cell.trim()
    )

    let valid = true
    const fail = (column: string, message: string) => {
      errors.push({ row, column, message })
      valid = false
    }

    if (!shipmentId) fail('shipment_id', 'shipment_id is required')
    else if (seenIds.has(shipmentId)) fail('shipment_id', `Duplicate shipment_id ${shipmentId}`)
    if (!lifecycle) fail('lifecycle', 'lifecycle is required')
    if (!owner) fail('owner', 'owner is required')
    if (!sourceFreshness || !SOURCE_FRESHNESS.has(sourceFreshness as SourceFreshness))
      fail('source_freshness', 'source_freshness must be CURRENT or STALE')
    if (cutoffAt && Number.isNaN(Date.parse(cutoffAt))) fail('cutoff_at', 'cutoff_at must be an ISO 8601 timestamp')

    const documents = requiredDocuments
      .split(';')
      .map((doc) => doc.trim())
      .filter((doc) => doc !== '')
    if (documents.length === 0) {
      fail('required_documents', 'required_documents must list at least one document')
    } else {
      for (const doc of documents) {
        if (!REQUIRED_DOCUMENTS.has(doc as RequiredDocument))
          fail('required_documents', `Unknown required document ${doc}`)
      }
    }

    if (!valid) continue
    seenIds.add(shipmentId)
    shipments.push({
      shipment_id: shipmentId,
      booking_reference: bookingReference || undefined,
      external_identifiers: {},
      lifecycle,
      required_documents: documents as RequiredDocument[],
      cutoff_at: cutoffAt || undefined,
      owner,
      source_updated_at: importedAt,
      source_freshness: sourceFreshness as SourceFreshness,
      source_hash: `prepared_${stableHash(raw)}`
    })
  }

  return { shipments, errors }
}
