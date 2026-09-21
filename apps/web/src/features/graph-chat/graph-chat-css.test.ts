import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/features/graph-chat/graph-chat.css'), 'utf8')

describe('graph-chat.css token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).toMatch(/var\(--/)
  })

  it('keeps the suggestion row on one line with horizontal overflow', () => {
    expect(css).toMatch(/\.graph-chat-chips\s*\{[^}]*flex-wrap:\s*nowrap/)
    expect(css).toMatch(/\.graph-chat-chip\s*\{[^}]*white-space:\s*nowrap/)
  })

  it('caps the composer at four lines via the line-height unit, not pixels', () => {
    expect(css).toMatch(/\.graph-chat-input\s*\{[^}]*max-height:\s*calc\(4lh/)
  })

  it('marks the refusal as a held decision, never a mismatch', () => {
    const refusal = css.match(/\.graph-chat-answer\[data-grounded='false'\]\s*\{[^}]*\}/)?.[0] ?? ''
    expect(refusal).toContain('var(--state-held-fill)')
    expect(refusal).toContain('var(--state-held-border)')
    expect(refusal).not.toContain('mismatch')
  })

  it('keeps failures off the verdict palette', () => {
    const failure = css.match(/\.graph-chat-failure\s*\{[^}]*\}/)?.[0] ?? ''
    expect(failure).not.toContain('state-mismatch')
    expect(failure).toContain('var(--border-default)')
  })

  it('lets the message log be the only scrolling region', () => {
    expect(css).toMatch(/\.graph-chat-log-wrap\s*\{[^}]*flex:\s*1[^}]*min-height:\s*0/)
    expect(css).not.toMatch(/\.graph-chat-composer\s*\{[^}]*overflow/)
  })
})
