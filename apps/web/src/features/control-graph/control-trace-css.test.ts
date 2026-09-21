import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/features/control-graph/control-trace.css'), 'utf8')

describe('control-trace.css token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).toMatch(/var\(--/)
  })

  it('routes motion through the duration tokens and rings focus with the focus token', () => {
    const motion = css.match(/(transition|animation):[^;{}]*;/g) ?? []
    expect(motion.length).toBeGreaterThan(0)
    for (const rule of motion) {
      if (/:\s*none;/.test(rule)) continue
      expect(rule).toMatch(/var\(--duration-/)
    }
    const focusBlocks = css.match(/[^{}]*:focus-visible\s*\{[^}]*\}/g) ?? []
    expect(focusBlocks.length).toBeGreaterThan(0)
    for (const block of focusBlocks) expect(block).toMatch(/box-shadow:\s*var\(--focus-ring\)/)
  })

  it('stands each chain up below the app breakpoint and stills the scan for reduced motion', () => {
    expect(css).toMatch(/@media \(max-width: 959px\)/)
    expect(css).toMatch(/attr\(data-stage\)/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^@]*animation:\s*none/)
  })

  it('traces without colour: a neutral ring and fill, and the other rows blur back', () => {
    const lit = css.match(/\[data-lit='true'\][^{]*\{[^}]*\}/)?.[0] ?? ''
    expect(lit).toContain('var(--border-strong)')
    expect(lit).not.toMatch(/--state-|--accent|--trace/)
    const pressed = css.match(/\.trace-entity\[aria-pressed='true'\]\s*\{[^}]*\}/)?.[0] ?? ''
    expect(pressed).toContain('var(--surface-active)')
    expect(pressed).not.toMatch(/--text-primary|--surface-canvas|--trace/)
    const others = css.match(/tr\[data-lit='false'\]\s*\{[^}]*\}/)?.[0] ?? ''
    expect(others).toMatch(/filter:\s*blur\(/)
    expect(css).not.toMatch(/transition[^;]*filter/)
  })
})
