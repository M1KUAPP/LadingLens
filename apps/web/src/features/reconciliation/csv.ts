import type { ExpectedShipment, RequiredDocument, SourceFreshness } from '../../domain/contracts'
import type { CsvImportError } from './types'

export const EXPECTED_SHIPMENTS_CSV_HEADER =
  'source_system,shipment_id,booking_reference,external_identifiers,lifecycle,required_documents,cutoff_at,owner,source_updated_at,source_freshness'

export const LEGACY_SHIPMENTS_CSV_HEADER =
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

function splitCsvRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

function parseExternalIdentifiers(cell: string): Record<string, string> | null {
  if (cell === '') return {}
  try {
    const parsed: unknown = JSON.parse(cell)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const identifiers: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') return null
      identifiers[key] = value
    }
    return identifiers
  } catch {
    return null
  }
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
  const isArtifact = header === EXPECTED_SHIPMENTS_CSV_HEADER
  if (!isArtifact && header !== LEGACY_SHIPMENTS_CSV_HEADER) {
    return {
      shipments,
      errors: [
        {
          row: 1,
          message: `Header must be exactly "${EXPECTED_SHIPMENTS_CSV_HEADER}" or "${LEGACY_SHIPMENTS_CSV_HEADER}"`
        }
      ]
    }
  }
  const columnCount = isArtifact ? 10 : 7

  for (let index = 1; index < lines.length; index += 1) {
    const raw = lines[index]
    if (!raw || raw.trim() === '') continue
    const row = index + 1
    const cells = splitCsvRow(raw).map((cell) => cell.trim())
    if (cells.length !== columnCount) {
      errors.push({ row, message: `Expected ${columnCount} columns, found ${cells.length}` })
      continue
    }

    const [
      shipmentId,
      bookingReference,
      externalIdentifiersCell,
      lifecycle,
      requiredDocuments,
      cutoffAt,
      owner,
      sourceUpdatedAt,
      sourceFreshness
    ] = isArtifact
      ? [cells[1], cells[2], cells[3], cells[4], cells[5], cells[6], cells[7], cells[8], cells[9]]
      : [cells[0], cells[1], '', cells[2], cells[3], cells[4], cells[5], importedAt, cells[6]]

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

    let externalIdentifiers: Record<string, string> = {}
    if (isArtifact) {
      if (sourceUpdatedAt && Number.isNaN(Date.parse(sourceUpdatedAt)))
        fail('source_updated_at', 'source_updated_at must be an ISO 8601 timestamp')
      const parsedIdentifiers = parseExternalIdentifiers(externalIdentifiersCell)
      if (parsedIdentifiers === null) {
        fail('external_identifiers', 'external_identifiers must be a JSON object of string values')
      } else {
        externalIdentifiers = parsedIdentifiers
      }
    }

    let documents: string[]
    if (isArtifact) {
      try {
        const parsed: unknown = JSON.parse(requiredDocuments)
        documents = Array.isArray(parsed) ? parsed : []
      } catch {
        documents = []
      }
      if (documents.length === 0 || documents.some((doc) => typeof doc !== 'string')) {
        fail('required_documents', 'required_documents must be a JSON array of document codes')
        documents = []
      }
    } else {
      documents = requiredDocuments
        .split(';')
        .map((doc) => doc.trim())
        .filter((doc) => doc !== '')
      if (documents.length === 0) {
        fail('required_documents', 'required_documents must list at least one document')
      }
    }
    for (const doc of documents) {
      if (!REQUIRED_DOCUMENTS.has(doc as RequiredDocument)) fail('required_documents', `Unknown required document ${doc}`)
    }

    if (!valid) continue
    seenIds.add(shipmentId)
    shipments.push({
      shipment_id: shipmentId,
      booking_reference: bookingReference || undefined,
      external_identifiers: externalIdentifiers,
      lifecycle,
      required_documents: documents as RequiredDocument[],
      cutoff_at: cutoffAt || undefined,
      owner,
      source_updated_at: sourceUpdatedAt || importedAt,
      source_freshness: sourceFreshness as SourceFreshness,
      source_hash: `prepared_${stableHash(raw)}`
    })
  }

  return { shipments, errors }
}
