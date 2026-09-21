import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfidenceGauge } from './components/ConfidenceGauge'

describe('ConfidenceGauge', () => {
  it('renders the exact percentage and its plain-language band', () => {
    render(<ConfidenceGauge value={0.68} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '68')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('68%')).toBeInTheDocument()
    expect(screen.getByText('Needs a person')).toBeInTheDocument()
  })

  it('marks the active decision band for styling', () => {
    const { container } = render(<ConfidenceGauge value={0.95} />)
    expect(container.querySelector('.confidence-gauge')).toHaveAttribute('data-band', 'match')
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('Confident match')).toBeInTheDocument()
  })

  it('labels the low band as a clear difference', () => {
    render(<ConfidenceGauge value={0.1} />)
    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByText('Clear difference')).toBeInTheDocument()
  })

  it('clamps out-of-range values into the visible band labels', () => {
    render(<ConfidenceGauge value={1.2} />)
    expect(screen.getByText('Confident match')).toBeInTheDocument()
  })
})
