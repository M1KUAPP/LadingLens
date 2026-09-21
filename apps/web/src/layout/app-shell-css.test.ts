import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/layout/app-shell.css'), 'utf8')

describe('app shell contract', () => {
  it('collapses the sidebar through data-sidebar, never on hover', () => {
    expect(css).not.toMatch(/\.app-sidebar(:hover|:is\(:hover)/)
    expect(css).toMatch(/\.app-shell\s*\{[^}]*grid-template-columns:\s*var\(--sidebar-current\)/)
    expect(css).toMatch(
      /\.app-shell\[data-sidebar='collapsed'\]\s*\{[^}]*--sidebar-current:\s*var\(--sidebar-collapsed\)/
    )
  })

  it('clips collapsed labels instead of removing them from the accessibility tree', () => {
    const rule = css.match(/\.app-shell\[data-sidebar='collapsed'\] \.app-sidebar \.app-nav-label\s*\{[^}]*\}/)
    expect(rule?.[0]).toMatch(/clip-path:\s*inset\(50%\)/)
    expect(rule?.[0]).not.toMatch(/display:\s*none/)
  })

  it('centres each glyph in the rail whether or not the label shows', () => {
    expect(css).toMatch(
      /\.app-nav-icon\s*\{[^}]*width:\s*calc\(var\(--sidebar-collapsed\)\s*-\s*2\s*\*\s*var\(--spacing-3\)\s*-\s*1px\)/
    )
    expect(css).toMatch(/\.app-nav-link\s*\{[^}]*padding:\s*0;/)
  })

  it('hands navigation to the drawer below the app breakpoint', () => {
    expect(css).toMatch(/@media \(max-width: 959px\)\s*\{[\s\S]*?\.app-sidebar\s*\{\s*display:\s*none;/)
  })

  it('routes motion through the shared duration tokens', () => {
    const transitions = css.match(/transition[^;{}]*;/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const rule of transitions) {
      expect(rule).toMatch(/var\(--duration-|0s/)
    }
  })

  it('rings keyboard focus with the shared focus token', () => {
    // The main region takes focus from the skip link; it is never ringed.
    const focusBlocks = (css.match(/[^{}]*:focus-visible\s*\{[^}]*\}/g) ?? []).filter(
      (block) => !block.includes('.app-content')
    )
    expect(focusBlocks.length).toBeGreaterThanOrEqual(4)
    for (const block of focusBlocks) {
      expect(block).toMatch(/box-shadow:\s*var\(--focus-ring\)/)
    }
  })
})
