import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonGrid } from './ComparisonGrid'
import { email001Fixture } from '../fixtures/email_001'
import { email004Fixture } from '../fixtures/email_004'

describe('ComparisonGrid', () => {
  it('renders exactly seven FieldRows with human friendly labels and source labels', () => {
    render(<ComparisonGrid verdicts={email001Fixture.field_verdicts} />)
    const expectedLabels = [
      'Shipper',
      'Consignee',
      'Notify party',
      'Port of loading',
      'Port of discharge',
      'Container count',
      'Gross weight (kg)'
    ]
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Shipping instruction')).toHaveLength(7)
    expect(screen.getAllByText('Draft bill of lading')).toHaveLength(7)
  })

  it('renders rows in canonical field order regardless of input order', () => {
    const shuffled = [
      email001Fixture.field_verdicts[4],
      email001Fixture.field_verdicts[0],
      email001Fixture.field_verdicts[6],
      email001Fixture.field_verdicts[2],
      email001Fixture.field_verdicts[5],
      email001Fixture.field_verdicts[1],
      email001Fixture.field_verdicts[3]
    ]
    render(<ComparisonGrid verdicts={shuffled} />)
    const names = Array.from(
      document.querySelectorAll('.field-row-name')
    ).map((el) => el.textContent)
    expect(names).toEqual([
      'Shipper',
      'Consignee',
      'Notify party',
      'Port of loading',
      'Port of discharge',
      'Container count',
      'Gross weight (kg)'
    ])
  })

  it('exposes mismatch and held rows via accessible text, glyph, and rail attribute', () => {
    render(<ComparisonGrid verdicts={email004Fixture.field_verdicts} />)
    const consigneeRow = screen.getByText('Consignee').closest('.field-row')
    expect(consigneeRow).toHaveAttribute('data-status', 'mismatch')
    expect(consigneeRow?.querySelector('.field-row-rail')).toBeInTheDocument()
    expect(within(consigneeRow as HTMLElement).getByLabelText('Mismatch')).toBeInTheDocument()
  })

  it('describes the verdict rail without CSS jargon', async () => {
    const user = userEvent.setup()
    render(<ComparisonGrid verdicts={email001Fixture.field_verdicts} />)
    await user.hover(
      screen.getByRole('button', { name: 'About field comparison' })
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent(/verdict/i)
    expect(tip).not.toHaveTextContent(/3px|rail|pixel|CSS/i)
  })

  it('triggers provenance selection when an extracted value anchor is activated', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ComparisonGrid
        verdicts={email001Fixture.field_verdicts}
        onSelectProvenance={onSelect}
      />
    )
    const shipperButtons = screen.getAllByRole('button', {
      name: /APRIL FAR EAST/i
    })
    await user.click(shipperButtons[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0].format).toBe('txt')
  })
})
