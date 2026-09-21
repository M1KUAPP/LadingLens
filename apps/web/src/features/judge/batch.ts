/**
 * A batch: one or more .json files, each entry checked as its own pair.
 *
 * An entry is an email record as the dataset's inbox/ holds them
 * (`email_id`, `from`, `subject`, `attachments`) or a pair
 * (`id`, `documents`). A JSON file holds one entry, an array of entries, or
 * an object with `emails` or `pairs`. Each document either travels inside the
 * JSON, as `text` or `content_base64` beside its `file_name`, or is a file
 * dropped with the JSON, matched by name; a dataset path such as
 * `attachments/email_001_SI.txt` matches a dropped `email_001_SI.txt`.
 */

/** A batch runs this many checks at most: each is a live, metered AI check. */
export const MAX_BATCH_CHECKS = 20

export type BatchPolicy = {
  accepted_formats: string[]
  max_file_bytes: number
}

export type BatchEntry = {
  /** Unique within the batch. */
  key: string
  id: string
  label: string
  /** The documents the entry names, in its order. */
  names: string[]
  files: File[]
  /** Why the entry cannot be checked, or null when it can. */
  problem: string | null
}

export type Batch = {
  /** The JSON files the batch came from. */
  sources: string[]
  entries: BatchEntry[]
}

export class BatchReadError extends Error {}

const MIME: Record<string, string> = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

const MB = 1_000_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function formatCeiling(bytes: number): string {
  if (bytes < MB) return `${Math.ceil(bytes / 1000)} KB`
  const rounded = Math.round((bytes / MB) * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} MB`
}

export function isBatchFile(file: File): boolean {
  return extension(file.name) === 'json'
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function entriesOf(root: unknown, source: string): unknown[] {
  if (Array.isArray(root)) return root
  if (isRecord(root)) {
    if (Array.isArray(root.pairs)) return root.pairs
    if (Array.isArray(root.emails)) return root.emails
    if ('email_id' in root || 'documents' in root || 'attachments' in root) return [root]
  }
  throw new BatchReadError(`${source} is not a batch: it holds no email records or pairs.`)
}

type Found = { name: string; file: File | null; problem: string | null }

function findDocument(document: unknown, dropped: Map<string, File>): Found | null {
  if (typeof document === 'string') {
    const name = baseName(document)
    return { name, file: dropped.get(name.toLowerCase()) ?? null, problem: null }
  }
  if (!isRecord(document)) return null
  const named = text(document.file_name) ?? text(document.name) ?? text(document.path)
  if (!named) return null
  const name = baseName(named)
  if (typeof document.text === 'string') {
    return { name, file: new File([document.text], name, { type: 'text/plain' }), problem: null }
  }
  if (typeof document.content_base64 === 'string') {
    try {
      const bytes = decodeBase64(document.content_base64)
      return { name, file: new File([bytes], name, { type: MIME[extension(name)] ?? '' }), problem: null }
    } catch {
      return { name, file: null, problem: `${name} is not valid base64.` }
    }
  }
  return { name, file: dropped.get(name.toLowerCase()) ?? null, problem: null }
}

function readEntry(
  raw: unknown,
  index: number,
  source: string,
  dropped: Map<string, File>,
  policy: BatchPolicy
): BatchEntry {
  const key = `${source}#${index + 1}`
  if (!isRecord(raw)) {
    return {
      key,
      id: `Entry ${index + 1}`,
      label: source,
      names: [],
      files: [],
      problem: 'Not an email record or a pair.'
    }
  }
  const id = text(raw.email_id) ?? text(raw.id) ?? `Entry ${index + 1}`
  const label = text(raw.subject) ?? text(raw.name) ?? source
  const listed = Array.isArray(raw.documents) ? raw.documents : Array.isArray(raw.attachments) ? raw.attachments : []
  const found = listed.map((document) => findDocument(document, dropped)).filter((item): item is Found => item !== null)
  const names = found.map((item) => item.name)
  const files = found.flatMap((item) => (item.file ? [item.file] : []))

  const accepted = new Set(policy.accepted_formats.map((format) => format.replace(/^\./, '').toLowerCase()))
  const problem = (() => {
    if (found.length === 0) return 'No documents to check.'
    const broken = found.find((item) => item.problem)
    if (broken) return broken.problem
    const missing = found.filter((item) => !item.file).map((item) => item.name)
    if (missing.length > 0) return `Add ${missing.join(' and ')} to the drop.`
    if (found.length !== 2) return `A check takes two documents; this entry has ${found.length}.`
    const unsupported = files.find((file) => !accepted.has(extension(file.name)))
    if (unsupported)
      return `${unsupported.name} is not a ${[...accepted].map((format) => format.toUpperCase()).join(', ')} file.`
    const large = files.find((file) => file.size > policy.max_file_bytes)
    if (large) return `${large.name} is larger than the ${formatCeiling(policy.max_file_bytes)} limit.`
    const empty = files.find((file) => file.size === 0)
    if (empty) return `${empty.name} is empty.`
    return null
  })()
  return { key, id, label, names, files, problem }
}

export async function readBatch(jsonFiles: File[], documents: File[], policy: BatchPolicy): Promise<Batch> {
  const dropped = new Map(documents.map((file) => [file.name.toLowerCase(), file]))
  const entries: BatchEntry[] = []
  for (const json of jsonFiles) {
    let root: unknown
    try {
      root = JSON.parse(await json.text())
    } catch {
      throw new BatchReadError(`${json.name} is not readable JSON.`)
    }
    entriesOf(root, json.name).forEach((raw, index) => entries.push(readEntry(raw, index, json.name, dropped, policy)))
  }
  if (entries.length === 0) throw new BatchReadError('The batch has no entries.')

  // Past the cap, entries wait for another batch rather than run.
  let checks = 0
  for (const entry of entries) {
    if (entry.problem) continue
    checks += 1
    if (checks > MAX_BATCH_CHECKS) entry.problem = `Over the ${MAX_BATCH_CHECKS} checks one batch runs.`
  }
  return { sources: jsonFiles.map((file) => file.name), entries }
}
