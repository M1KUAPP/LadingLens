import { describe, expect, it } from 'vitest'
import { BatchReadError, MAX_BATCH_CHECKS, isBatchFile, readBatch } from './batch'

const POLICY = { accepted_formats: ['txt', 'pdf', 'docx', 'xlsx'], max_file_bytes: 5_000_000 }

function json(name: string, value: unknown): File {
  return new File([JSON.stringify(value)], name, { type: 'application/json' })
}

function doc(name: string, body = 'SHIPPING INSTRUCTION'): File {
  return new File([body], name, { type: 'text/plain' })
}

describe('readBatch', () => {
  it('reads a dataset email record and matches its attachment paths to dropped files', async () => {
    const record = {
      email_id: 'email_001',
      from: 'ops@example.com',
      subject: 'TO CONFIRM DOCS',
      body: '',
      attachments: ['attachments/email_001_SI.txt', 'attachments/email_001_BL.txt']
    }
    const si = doc('email_001_SI.txt')
    const bl = doc('email_001_BL.txt', 'BILL OF LADING (DRAFT)')
    const batch = await readBatch([json('email_001.json', record)], [bl, si], POLICY)

    expect(batch.sources).toEqual(['email_001.json'])
    expect(batch.entries).toEqual([
      expect.objectContaining({
        id: 'email_001',
        label: 'TO CONFIRM DOCS',
        names: ['email_001_SI.txt', 'email_001_BL.txt'],
        files: [si, bl],
        problem: null
      })
    ])
  })

  it('reads pairs whose documents travel inside the JSON as text or base64', async () => {
    const batch = await readBatch(
      [
        json('pairs.json', {
          pairs: [
            {
              id: 'pair_a',
              documents: [
                { file_name: 'si.txt', text: 'SHIPPING INSTRUCTION' },
                { file_name: 'bl.txt', content_base64: btoa('BILL OF LADING (DRAFT)') }
              ]
            }
          ]
        })
      ],
      [],
      POLICY
    )
    const [entry] = batch.entries
    expect(entry.problem).toBeNull()
    expect(entry.files.map((file) => file.name)).toEqual(['si.txt', 'bl.txt'])
    expect(await entry.files[1].text()).toBe('BILL OF LADING (DRAFT)')
  })

  it('accepts an array or an emails list, one entry per record', async () => {
    const records = [
      { email_id: 'email_002', attachments: [] },
      { email_id: 'email_003', attachments: [] }
    ]
    expect((await readBatch([json('a.json', records)], [], POLICY)).entries).toHaveLength(2)
    expect((await readBatch([json('b.json', { emails: records })], [], POLICY)).entries).toHaveLength(2)
  })

  it('says why an entry cannot be checked', async () => {
    const batch = await readBatch(
      [
        json('inbox.json', [
          { email_id: 'no_docs', attachments: [] },
          { email_id: 'missing_file', attachments: ['attachments/x_SI.txt', 'attachments/x_BL.txt'] },
          { email_id: 'one_doc', documents: [{ file_name: 'si.txt', text: 'SI' }] },
          {
            email_id: 'image',
            documents: [
              { file_name: 'si.png', text: 'SI' },
              { file_name: 'bl.txt', text: 'BL' }
            ]
          },
          {
            email_id: 'bad_base64',
            documents: [
              { file_name: 'si.pdf', content_base64: '%%%' },
              { file_name: 'bl.txt', text: 'BL' }
            ]
          }
        ])
      ],
      [doc('x_SI.txt')],
      POLICY
    )
    expect(batch.entries.map((entry) => [entry.id, entry.problem])).toEqual([
      ['no_docs', 'No documents to check.'],
      ['missing_file', 'Add x_BL.txt to the drop.'],
      ['one_doc', 'A check takes two documents; this entry has 1.'],
      ['image', 'si.png is not a TXT, PDF, DOCX, XLSX file.'],
      ['bad_base64', 'si.pdf is not valid base64.']
    ])
  })

  it(`holds entries past the ${MAX_BATCH_CHECKS}-check cap for another batch`, async () => {
    const pairs = Array.from({ length: MAX_BATCH_CHECKS + 2 }, (_, index) => ({
      id: `pair_${index}`,
      documents: [
        { file_name: 'si.txt', text: 'SI' },
        { file_name: 'bl.txt', text: 'BL' }
      ]
    }))
    const batch = await readBatch([json('pairs.json', pairs)], [], POLICY)
    expect(batch.entries.filter((entry) => entry.problem === null)).toHaveLength(MAX_BATCH_CHECKS)
    expect(batch.entries.at(-1)?.problem).toBe(`Over the ${MAX_BATCH_CHECKS} checks one batch runs.`)
  })

  it('refuses a file that is not JSON or not a batch', async () => {
    await expect(readBatch([new File(['nope'], 'notes.json')], [], POLICY)).rejects.toThrow(
      new BatchReadError('notes.json is not readable JSON.')
    )
    await expect(readBatch([json('settings.json', { theme: 'dark' })], [], POLICY)).rejects.toThrow(
      'settings.json is not a batch: it holds no email records or pairs.'
    )
  })
})

describe('isBatchFile', () => {
  it('knows a batch by its .json name', () => {
    expect(isBatchFile(doc('inbox.JSON'))).toBe(true)
    expect(isBatchFile(doc('si.txt'))).toBe(false)
  })
})
