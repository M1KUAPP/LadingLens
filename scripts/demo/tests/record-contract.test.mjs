import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { auditCapture, validateWorkflowModule } from '../contract.mjs'
import { runCapture } from '../record.mjs'

test('workflow contract requires unique ordered beats and a workflow function', () => {
  assert.throws(
    () => validateWorkflowModule({ requiredBeats: ['one', 'one'], workflow() {} }),
    /unique/
  )
  assert.throws(() => validateWorkflowModule({ requiredBeats: ['one'] }), /workflow/)
})

test('capture audit rejects missing, duplicate, and unordered beats', () => {
  const required = ['one', 'two']
  const filmed = { one: 1, two: 1 }
  assert.equal(
    auditCapture(
      required,
      [
        { name: 'one', ms: 0 },
        { name: 'two', ms: 100 }
      ],
      filmed
    ).complete,
    true
  )
  assert.equal(
    auditCapture(required, [{ name: 'two', ms: 0 }], { two: 1 }).complete, false)
  assert.equal(
    auditCapture(
      required,
      [
        { name: 'one', ms: 0 },
        { name: 'two', ms: 100 },
        { name: 'unexpected', ms: 200 }
      ],
      filmed
    ).complete,
    false
  )
})

test('capture rejects an output directory outside the configured scratch root', async () => {
  const scratchRoot = await mkdtemp(join(tmpdir(), 'capture-scratch-'))
  const outsideScratch = await mkdtemp(join(tmpdir(), 'capture-outside-'))
  const marker = join(outsideScratch, 'marker.txt')
  const previousTmpdir = process.env.TMPDIR
  await writeFile(marker, 'keep')
  process.env.TMPDIR = scratchRoot

  try {
    await assert.rejects(
      runCapture({
        DEMO_WEB: 'https://example.test',
        DEMO_WORKFLOW: fileURLToPath(new URL('../workflow.example.mjs', import.meta.url)),
        DEMO_DIR: outsideScratch
      }),
      /scratch/
    )
    assert.equal(await readFile(marker, 'utf8'), 'keep')
  } finally {
    if (previousTmpdir === undefined) {
      delete process.env.TMPDIR
    } else {
      process.env.TMPDIR = previousTmpdir
    }
    await rm(scratchRoot, { recursive: true, force: true })
    await rm(outsideScratch, { recursive: true, force: true })
  }
})

test('capture rejects a scratch path with a symlinked component outside the scratch root', async () => {
  const scratchRoot = await mkdtemp(join(tmpdir(), 'capture-scratch-'))
  const outsideScratch = await mkdtemp(join(tmpdir(), 'capture-outside-'))
  const escapedComponent = join(scratchRoot, 'escape')
  const output = join(escapedComponent, 'capture')
  const marker = join(output, 'marker.txt')
  const previousTmpdir = process.env.TMPDIR
  await symlink(outsideScratch, escapedComponent, 'dir')
  await mkdir(output)
  await writeFile(marker, 'keep')
  process.env.TMPDIR = scratchRoot

  try {
    await assert.rejects(
      runCapture({
        DEMO_WEB: 'https://example.test',
        DEMO_WORKFLOW: fileURLToPath(new URL('../workflow.example.mjs', import.meta.url)),
        DEMO_DIR: output
      }),
      /scratch/
    )
    assert.equal(await readFile(marker, 'utf8'), 'keep')
  } finally {
    if (previousTmpdir === undefined) {
      delete process.env.TMPDIR
    } else {
      process.env.TMPDIR = previousTmpdir
    }
    await rm(scratchRoot, { recursive: true, force: true })
    await rm(outsideScratch, { recursive: true, force: true })
  }
})
