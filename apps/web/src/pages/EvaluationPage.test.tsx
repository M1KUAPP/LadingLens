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
    expect(
      screen.getByText('email_520 is missing from the prepared fixture.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Classification coverage')).not.toBeInTheDocument()
  })
})

describe('EvaluationPage metrics', () => {
  it('derives classification coverage from the fixture', async () => {
    renderEvaluation()
    const coverage = await panel('Classification coverage')
    expect(within(coverage).getByText('100.0%')).toBeInTheDocument()
    expect(within(coverage).getByText('520 of 520')).toBeInTheDocument()
    expect(within(coverage).getByText('BL comparison')).toBeInTheDocument()
    expect(within(coverage).getByText('129')).toBeInTheDocument()
    expect(within(coverage).getByText('SI request')).toBeInTheDocument()
    expect(within(coverage).getByText('216')).toBeInTheDocument()
    expect(within(coverage).getByText('Invoice query')).toBeInTheDocument()
    expect(within(coverage).getByText('75')).toBeInTheDocument()
    expect(within(coverage).getByText('General')).toBeInTheDocument()
    expect(within(coverage).getByText('60')).toBeInTheDocument()
    expect(within(coverage).getByText('Spam')).toBeInTheDocument()
    expect(within(coverage).getByText('40')).toBeInTheDocument()
  })

  it('derives comparison outcomes from the fixture', async () => {
    renderEvaluation()
    const comparison = await panel('Comparison outcomes')
    expect(within(comparison).getByText('129')).toBeInTheDocument()
    expect(within(comparison).getByText('109')).toBeInTheDocument()
    expect(within(comparison).getByText('20')).toBeInTheDocument()
    expect(within(comparison).getByText('0')).toBeInTheDocument()
  })

  it('derives status and review reason counts from the fixture', async () => {
    renderEvaluation()
    const status = await panel('Processed status')
    expect(within(status).getByText('500')).toBeInTheDocument()
    expect(within(status).getByText('20')).toBeInTheDocument()
    expect(within(status).getByText('Wrong document type')).toBeInTheDocument()
    expect(within(status).getByText('Missing attachment')).toBeInTheDocument()
    expect(within(status).getByText('Unreadable file')).toBeInTheDocument()
    expect(within(status).getByText('Missing value')).toBeInTheDocument()
    expect(within(status).getAllByText('5')).toHaveLength(4)
  })

  it('derives reconciliation outcomes from the fixture', async () => {
    renderEvaluation()
    const reconciliation = await panel('Reconciliation outcomes')
    expect(within(reconciliation).getByText('6')).toBeInTheDocument()
    expect(
      within(reconciliation).getAllByText('Case present')
    ).toHaveLength(4)
    expect(within(reconciliation).getByText('3')).toBeInTheDocument()
    expect(
      within(reconciliation).getAllByText('Document missing')
    ).toHaveLength(2)
    expect(
      within(reconciliation).getAllByText('Unmatched case')
    ).toHaveLength(2)
    expect(
      within(reconciliation).getAllByText('Missing case')
    ).toHaveLength(2)
    expect(within(reconciliation).getAllByText('1')).toHaveLength(3)
    expect(within(reconciliation).getByText('SYN-042')).toBeInTheDocument()
  })

  it('shows the awaiting-benchmark latency state with no number', async () => {
    renderEvaluation()
    const latency = await panel('Awaiting fresh Gemini 3.5 Flash benchmark')
    expect(latency).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Flash Lite/i)
    expect(latency.textContent).not.toMatch(/\d+(\.\d+)?\s*(ms|s)\b/)
    expect(latency.textContent).toContain('case processing time')
  })
})
