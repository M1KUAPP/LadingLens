import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(process.cwd(), 'src/features/ingest')
const cssFiles = ['ingest.css', 'components/confidence-gauge.css', 'components/batch-progress.css']
const css = cssFiles.map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')

const tsxFiles = ['IngestView.tsx', 'components/ConfidenceGauge.tsx', 'components/BatchProgress.tsx']
const tsx = tsxFiles.map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')

describe('ingest css token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).not.toMatch(/\bhsla?\(/)
    expect(css).toMatch(/var\(--/)
  })

  it('routes motion through the shared duration tokens', () => {
    expect(css).not.toMatch(/transition[^;{}]*\d+\.?\d*(ms|s)\b/)
    const transitions = css.match(/transition[^;{}]*;/g) ?? []
    for (const rule of transitions) {
      expect(rule).toMatch(/var\(--duration-/)
    }
  })

  it('rings every keyboard focus with the shared focus token', () => {
    const focusBlocks = css.match(/:focus-visible\s*\{[^}]*\}/g) ?? []
    expect(focusBlocks.length).toBeGreaterThanOrEqual(3)
    for (const block of focusBlocks) {
      expect(block).toMatch(/box-shadow:\s*var\(--focus-ring\)/)
    }
  })

  it('restacks to a single column below the app breakpoint for 390px viewports', () => {
    expect(css).toMatch(/@media \(max-width: 959px\)/)
    expect(css).toMatch(/grid-template-columns:\s*1fr/)
  })

  it('keeps figures in tabular numeric classes', () => {
    expect(tsx).toMatch(/type-data-/)
    expect(css).not.toMatch(/font-variant-numeric:\s*normal/)
  })

  it('keeps visible copy free of em and en dashes', () => {
    expect(tsx).not.toMatch(/[—–]/)
  })

  it('paints the confidence bands from state tokens, never raw values', () => {
    expect(css).toMatch(/--gauge-band-(match|review|mismatch)/)
  })
})
