import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FEATURE_DIR = join(process.cwd(), 'src/features/reconciliation')

const CSS_FILES = [
  'reconciliation.css',
  'components/reconciliation-outcome-table.css',
  'components/missing-case-peak-card.css',
  'components/reconciliation-inputs.css'
]

const sheets = CSS_FILES.map((file) => readFileSync(join(FEATURE_DIR, file), 'utf8'))
const combined = sheets.join('\n')

describe('reconciliation CSS token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(combined).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(combined).not.toMatch(/\brgba?\(/)
    expect(combined).toMatch(/var\(--/)
  })

  it('keeps tables scrolling internally on narrow viewports', () => {
    for (const file of ['components/reconciliation-outcome-table.css', 'components/reconciliation-inputs.css']) {
      const css = readFileSync(join(FEATURE_DIR, file), 'utf8')
      expect(css).toMatch(/min-width/)
    }
    expect(combined).toMatch(/min-width:\s*0/)
  })

  it('carries the missing-case peak as held custody', () => {
    const css = readFileSync(join(FEATURE_DIR, 'components/missing-case-peak-card.css'), 'utf8')
    expect(css).toMatch(/var\(--state-held-(fill|border|text)\)/)
  })

  it('states token-driven motion only, so reduced motion stays safe', () => {
    const transitions = combined.match(/transition[^;]*/g) ?? []
    for (const transition of transitions) {
      expect(transition).toMatch(/var\(--duration-/)
      expect(transition).toMatch(/var\(--ease-/)
    }
  })
})
