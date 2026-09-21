import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckWaiting } from './CheckWaiting'

function file(name: string, size: number) {
  return new File([new ArrayBuffer(size)], name, { type: 'text/plain' })
}

const FILES = { si: file('pair_si.txt', 1_480), draftBl: file('pair_bl.txt', 920) }

afterEach(() => {
  vi.useRealTimers()
})

function renderWaiting(verdict: Parameters<typeof CheckWaiting>[0]['verdict'] = 'running') {
  return render(<CheckWaiting files={FILES} startedAt={Date.now()} verdict={verdict} />)
}

describe('CheckWaiting', () => {
  it('draws an 11 by 10 bay whose first tile holds the estimate', () => {
    const { container } = renderWaiting()
    const bay = screen.getByRole('progressbar', { name: 'Estimated check progress' })
    expect(bay).toHaveAttribute('aria-valuenow', '0')
    expect(bay).toHaveAttribute('aria-valuetext', '0 percent, estimated')
    expect(container.querySelectorAll('.check-bay-tile')).toHaveLength(110)
    expect(container.querySelector('.check-bay-tile--counter')).toHaveTextContent('0%')
  })

  it('announces the headline and the active step, not the ticking seconds', () => {
    renderWaiting()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Checking your documents live…')
    expect(status).toHaveTextContent('Receive the pair')
    expect(status).not.toHaveTextContent(/elapsed/)
  })

  it('names both files and their sizes', () => {
    renderWaiting()
    const files = screen.getByRole('list', { name: 'Documents in this check' })
    expect(within(files).getByText('pair_si.txt')).toBeInTheDocument()
    expect(within(files).getByText('pair_bl.txt')).toBeInTheDocument()
    expect(within(files).getByText('2 KB')).toBeInTheDocument()
    expect(within(files).getByText('920 B')).toBeInTheDocument()
    expect(within(files).getByText('Shipping instruction')).toBeInTheDocument()
    expect(within(files).getByText('Draft bill of lading')).toBeInTheDocument()
  })

  it('advances the elapsed time, the estimate and the steps as time passes', () => {
    vi.useFakeTimers()
    const { container } = renderWaiting()
    expect(screen.getByText('0 s elapsed')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(20_000)
    })

    expect(screen.getByText('20 s elapsed')).toBeInTheDocument()
    const bay = screen.getByRole('progressbar', { name: 'Estimated check progress' })
    const percent = Number(bay.getAttribute('aria-valuenow'))
    expect(percent).toBeGreaterThan(70)
    expect(percent).toBeLessThan(95)
    expect(screen.getByRole('status')).toHaveTextContent('Compare the fields')
    const steps = screen.getAllByRole('listitem').filter((item) => item.classList.contains('check-stage'))
    expect(steps.map((step) => step.getAttribute('data-state'))).toEqual(['done', 'done', 'active'])
    expect(container.querySelectorAll('.check-bay-tile[data-full]').length).toBeGreaterThan(70)
  })

  it('never pre-draws a verdict pill while the check runs', () => {
    const { container } = renderWaiting()
    expect(container.querySelector('.status-pill')).toBeNull()
    expect(container.querySelector('.check-waiting')).toHaveAttribute('data-verdict', 'running')
  })

  it('completes the bay and washes it in the verdict colour once the run returns', () => {
    const { container } = renderWaiting('mismatch')
    const bay = screen.getByRole('progressbar', { name: 'Estimated check progress' })
    expect(bay).toHaveAttribute('aria-valuenow', '100')
    expect(container.querySelector('.check-waiting')).toHaveAttribute('data-verdict', 'mismatch')
    expect(container.querySelectorAll('.check-bay-tile[data-full]')).toHaveLength(109)
    expect(screen.getByRole('status')).toHaveTextContent('Check complete')
  })

  it('says so when the check stops without a result', () => {
    renderWaiting('failed')
    expect(screen.getByRole('status')).toHaveTextContent('The check stopped')
  })
})
