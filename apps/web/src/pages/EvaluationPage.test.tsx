import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixtureInboxSource } from '../data/inbox-source'
import type { InboxSource } from '../data/inbox-types'
import { EvaluationPage } from './EvaluationPage'

const pendingSource: InboxSource = { load: () => new Promise(() => {}) }
const brokenSource: InboxSource = {
  load: () =>
    Promise.resolve({
      kind: 'error',
      problems: ['email_520 is missing from the prepared fixture.']
    })
}

function renderEvaluation(source: InboxSource = fixtureInboxSource) {
  return render(
    <MemoryRouter>
      <EvaluationPage source={source} />
    </MemoryRouter>
  )
}

async function panel(name: string): Promise<HTMLElement> {
  const heading = await screen.findByText(name)
  return heading.closest('[data-panel]') as HTMLElement
}

describe('EvaluationPage states', () => {
  it('shows a neutral loading shell without verdict styling', () => {
    renderEvaluation(pendingSource)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('[data-status]')).toBeNull()
  })

  it('shows the integrity error state without any metric panels', async () => {
    renderEvaluation(brokenSource)
    await screen.findByRole('alert')
    expect(screen.getByText('email_520 is missing from the prepared fixture.')).toBeInTheDocument()
    expect(screen.queryByText('Classification coverage')).not.toBeInTheDocument()
  })
})

describe('EvaluationPage metrics', () => {
  it('derives classification coverage from the fixture', async () => {
    renderEvaluation()
    const coverage = await panel('Classification coverage')
    expect(within(coverage).getByText('100.0%')).toBeInTheDocument()
    expect(within(coverage).getByText('520 of 520')).toBeInTheDocument()
    expect(within(coverage).getByText('BL_COMPARISON')).toBeInTheDocument()
    expect(within(coverage).getByText('129')).toBeInTheDocument()
    expect(within(coverage).getByText('SI_REQUEST')).toBeInTheDocument()
    expect(within(coverage).getByText('216')).toBeInTheDocument()
    expect(within(coverage).getByText('INVOICE_QUERY')).toBeInTheDocument()
    expect(within(coverage).getByText('75')).toBeInTheDocument()
    expect(within(coverage).getByText('GENERAL')).toBeInTheDocument()
    expect(within(coverage).getByText('60')).toBeInTheDocument()
    expect(within(coverage).getByText('SPAM')).toBeInTheDocument()
    expect(within(coverage).getByText('40')).toBeInTheDocument()
  })

  it('derives comparison outcomes from the fixture', async () => {
    renderEvaluation()
    const comparison = await panel('Comparison outcomes')
    expect(within(comparison).getByText('129')).toBeInTheDocument()
    expect(within(comparison).getByText('66')).toBeInTheDocument()
    expect(within(comparison).getByText('MISMATCH')).toBeInTheDocument()
    expect(within(comparison).getByText('46')).toBeInTheDocument()
    expect(within(comparison).getByText('NEEDS_REVIEW')).toBeInTheDocument()
    expect(within(comparison).getByText('17')).toBeInTheDocument()
  })

  it('derives status and review reason counts from the fixture', async () => {
    renderEvaluation()
    const status = await panel('Processed status')
    expect(within(status).getByText('457')).toBeInTheDocument()
    expect(within(status).getByText('46')).toBeInTheDocument()
    expect(within(status).getByText('17')).toBeInTheDocument()
    expect(within(status).getByText('wrong_doc_type')).toBeInTheDocument()
    expect(within(status).getByText('missing_attachment')).toBeInTheDocument()
    expect(within(status).getByText('unreadable')).toBeInTheDocument()
    expect(within(status).getByText('missing_value')).toBeInTheDocument()
    expect(within(status).getAllByText('5')).toHaveLength(3)
    expect(within(status).getByText('2')).toBeInTheDocument()
  })

  it('derives reconciliation outcomes from the fixture', async () => {
    renderEvaluation()
    const reconciliation = await panel('Reconciliation outcomes')
    expect(within(reconciliation).getByText('6')).toBeInTheDocument()
    expect(within(reconciliation).getAllByText('CASE_PRESENT')).toHaveLength(2)
    expect(within(reconciliation).getAllByText('DOCUMENT_MISSING')).toHaveLength(2)
    expect(within(reconciliation).getAllByText('MISSING_CASE')).toHaveLength(2)
    expect(within(reconciliation).getAllByText('SOURCE_STALE')).toHaveLength(2)
    expect(within(reconciliation).getAllByText('DUPLICATE_OR_AMBIGUOUS')).toHaveLength(3)
    expect(within(reconciliation).getByText('UNMATCHED_CASE')).toBeInTheDocument()
    expect(within(reconciliation).getByText('125')).toBeInTheDocument()
    expect(within(reconciliation).getAllByText('1')).toHaveLength(4)
    expect(within(reconciliation).getByText('2')).toBeInTheDocument()
    expect(within(reconciliation).getByText('SYN-042')).toBeInTheDocument()
  })

  it('shows the awaiting-benchmark latency state with no number', async () => {
    renderEvaluation()
    const latency = await panel('Awaiting fresh extraction benchmark')
    expect(latency).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Flash Lite/i)
    expect(latency.textContent).not.toMatch(/\d+(\.\d+)?\s*(ms|s)\b/)
    expect(latency.textContent).toContain('case processing time')
  })
})

describe('evaluation page css contract', () => {
  const css = readFileSync(join(process.cwd(), 'src/pages/evaluation-page.css'), 'utf8')
  const tsx = readFileSync(join(process.cwd(), 'src/pages/EvaluationPage.tsx'), 'utf8')

  it('uses design tokens instead of hardcoded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgba?\(/)
    expect(css).not.toMatch(/\bhsla?\(/)
  })

  it('routes motion through the duration tokens', () => {
    const motion = css.match(/(transition|animation)[^;{}]*;/g) ?? []
    expect(motion.length).toBeGreaterThan(0)
    for (const rule of motion) expect(rule).toMatch(/var\(--duration-/)
  })

  it('keeps errors off the verdict palette', () => {
    const errorBlocks = css.match(/[^{}]*error[^{}]*\{[^}]*\}/g) ?? []
    expect(errorBlocks.length).toBeGreaterThan(0)
    for (const block of errorBlocks) expect(block).not.toMatch(/--state-/)
  })

  it('falls back to one column below the app breakpoint', () => {
    expect(css).toMatch(
      /@media \(max-width: 959px\)\s*\{\s*\.eval-grid,\s*\.eval-loading\s*\{\s*grid-template-columns: 1fr;/
    )
  })

  it('keeps visible copy free of em and en dashes', () => {
    expect(tsx).not.toMatch(/[—–]/)
  })
})
