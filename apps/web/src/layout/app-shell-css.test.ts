import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/layout/app-shell.css'), 'utf8')

describe('app shell navigation rail contract', () => {
  it('the rail expands on focus-visible so a click-navigation does not pin it open', () => {
    expect(css).not.toMatch(/\.app-sidebar[^{]*:focus-within/)
    const matches = css.match(/\.app-sidebar:is\(:hover, :has\(:focus-visible\)\)/g) ?? []
    expect(matches).toHaveLength(7)
  })
})
