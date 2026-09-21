/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXPECTED_EMAIL_COUNT } from './inbox-integrity'
import { fixtureInboxSource } from './inbox-source'

describe('fixtureInboxSource', () => {
  it('loads the complete prepared dataset through the async seam', async () => {
    const result = await fixtureInboxSource.load()
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return
    expect(result.dataset.rows).toHaveLength(EXPECTED_EMAIL_COUNT)
    expect(result.dataset.receivedCount).toBe(EXPECTED_EMAIL_COUNT)
    expect(Object.keys(result.dataset.artifact)).toHaveLength(EXPECTED_EMAIL_COUNT)
  })

  it('keeps the heavy JSON payloads out of the shell bundle', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/data/inbox-source.ts'), 'utf8')
    expect(source).not.toMatch(/^import\s+\S+\s+from\s+['"][^'"]*\.json\?raw['"]/m)
    expect(source).toContain("import('./inbox-fixture.json?raw')")
    expect(source).toContain("import('./sample-submission.json?raw')")
  })
})
