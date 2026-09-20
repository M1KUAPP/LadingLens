import assert from 'node:assert/strict'
import test from 'node:test'

import { scrollAt } from '../motion.mjs'

test('scrollAt requests the target displacement and clears suspended styles on failure', async () => {
  const previousDocument = globalThis.document
  const previousAnimationFrame = globalThis.requestAnimationFrame
  const appliedClasses = []
  const removedClasses = []
  const evaluations = []
  const displacements = []
  const element = {
    scrollBy({ top }) {
      displacements.push(top)
      throw new Error('scroll failed')
    }
  }

  globalThis.document = {
    documentElement: {
      classList: {
        add(name) {
          appliedClasses.push(name)
        },
        remove(name) {
          removedClasses.push(name)
        }
      }
    },
    querySelector(selector) {
      return selector === '#target' ? element : null
    }
  }
  let frame = 0
  globalThis.requestAnimationFrame = (callback) => callback(frame++ === 0 ? 0 : 1000)

  const page = {
    async evaluate(callback, options) {
      evaluations.push(options)
      return callback(options)
    }
  }

  try {
    await assert.rejects(
      scrollAt(page, {
        selector: '#target',
        distance: 120,
        pixelsPerSecond: 60,
        suspendedClasses: ['pause-one', 'pause-two']
      }),
      /scroll failed/
    )
    assert.deepEqual(evaluations, [
      {
        selector: '#target',
        distance: 120,
        pixelsPerSecond: 60,
        suspendedClasses: ['pause-one', 'pause-two']
      }
    ])
    assert.deepEqual(displacements, [60])
    assert.deepEqual(appliedClasses, ['pause-one', 'pause-two'])
    assert.deepEqual(removedClasses, ['pause-one', 'pause-two'])
  } finally {
    globalThis.document = previousDocument
    globalThis.requestAnimationFrame = previousAnimationFrame
  }
})
