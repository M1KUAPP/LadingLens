import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { SUBTITLE_TOP, lowestMeaningfulFloor, renderSlides } from '../slides/render.mjs'

test('subtitle-safe boundary is fixed at 852', () => {
  assert.equal(SUBTITLE_TOP, 852)
})

test('empty slide list exits without resolving Playwright', async () => {
  await assert.doesNotReject(() => renderSlides({ DEMO_SLIDES: '' }))
})

test('content below the subtitle boundary is rejected', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'slide-render-'))
  await writeFile(join(temporary, 'intro.html'), '<main>slide</main>')
  try {
    await assert.rejects(
      () => renderSlides({ DEMO_SLIDES: 'intro:1', DEMO_DIR: temporary, DEMO_SLIDE_DIR: temporary }, {
      loadPlaywright: async () => ({ launch: async () => ({
        newContext: async () => ({
          newPage: async () => ({
            goto: async () => {},
            evaluate: async () => ({ textBottoms: [853], mediaBottoms: [] }),
            screenshot: async () => {},
          }),
          close: async () => {},
        }),
        close: async () => {},
      }) }),
      }),
      /collision/i,
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('a full-height wrapper does not collide when its visible leaf content is safe', async () => {
  assert.equal(lowestMeaningfulFloor([800], []), 800)
  assert.equal(lowestMeaningfulFloor([853], []), 853)
  const temporary = await mkdtemp(join(tmpdir(), 'slide-render-'))
  await writeFile(join(temporary, 'intro.html'), '<main>slide</main>')
  try {
    await assert.doesNotReject(() => renderSlides(
      { DEMO_SLIDES: 'intro:1', DEMO_DIR: temporary, DEMO_SLIDE_DIR: temporary },
      { loadPlaywright: async () => ({ launch: async () => ({
        newContext: async () => ({
          newPage: async () => ({
            goto: async () => {},
            evaluate: async () => ({ textBottoms: [800], mediaBottoms: [] }),
            screenshot: async () => {},
            close: async () => {},
          }),
          close: async () => {},
        }),
        close: async () => {},
      }) }) },
    ))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
