import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/features/control-graph/control-graph.css'), 'utf8')

describe('control-graph.css token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).toMatch(/var\(--/)
  })

  it('constrains the canvas region so narrow viewports do not overflow', () => {
    expect(css).toMatch(/max-width|overflow|min-width:\s*0/)
  })

  it('lets the canvas fill its pane instead of a fixed height', () => {
    expect(css).not.toMatch(/height:\s*480px/)
    expect(css).toMatch(/\.graph-canvas\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/)
  })
})
