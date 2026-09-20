import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(process.cwd(), 'src/features/review-queue')
const cssFiles = [
  'review-queue.css',
  'components/review-queue-table.css',
  'components/review-queue-detail.css',
  'components/reconciliation-action-panel.css'
]
const css = cssFiles.map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')

const tsxFiles = [
  'ReviewQueueView.tsx',
  'components/ReviewQueueTable.tsx',
  'components/ReviewQueueDetail.tsx',
  'components/ReconciliationActionPanel.tsx'
]
const tsx = tsxFiles.map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')

describe('review-queue css token contract', () => {
  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).not.toMatch(/\bhsla?\(/)
    expect(css).toMatch(/var\(--/)
  })

  it('constrains dense regions so narrow viewports do not overflow', () => {
    expect(css).toMatch(/max-height|overflow|min-width:\s*0/)
  })

  it('restacks the table below the app breakpoint for 390px viewports', () => {
    const tableCss = readFileSync(join(dir, 'components/review-queue-table.css'), 'utf8')
    expect(tableCss).toMatch(/@media \(max-width: 959px\)/)
    expect(tableCss).toMatch(/data-label/)
  })

  it('marks held rows with the held rail token, not a cleared state', () => {
    expect(css).toMatch(/--state-held-solid/)
    expect(css).not.toMatch(/data-status='held'][^}]*--state-match/)
  })

  it('keeps visible copy free of em and en dashes', () => {
    expect(tsx).not.toMatch(/[—–]/)
  })
})
