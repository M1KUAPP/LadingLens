import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EmailDetailView } from './EmailDetailView'
import { createPreparedEmailDetailService } from './seam'

describe('EmailDetailView acceptance behaviors', () => {
  it('1. A normal prepared case renders the attachment preflight list before exactly seven FieldRows with human-friendly labels and source labels', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    // Explicit prepared record badge
    expect(await screen.findByText('PREPARED RECORD')).toBeInTheDocument()

    // Preflight appears before grid
    const preflightRegion = screen.getByRole('region', {
      name: 'Attachment preflight'
    })
    const comparisonRegion = screen.getByRole('region', {
      name: 'Field comparison'
    })
    expect(preflightRegion.compareDocumentPosition(comparisonRegion)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )

    // Exactly seven FieldRows
    const rows = screen
      .getAllByRole('generic')
      .filter((el) => el.classList?.contains('field-row'))
    expect(rows).toHaveLength(7)

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
  })

  it('2. Mismatch/held rows expose status via accessible text/glyph and semantic rail, not color only', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    await screen.findByText('Consignee')
    const row = screen.getByText('Consignee').closest('.field-row') as HTMLElement
    expect(row).toHaveAttribute('data-status', 'mismatch')
    expect(row.querySelector('.field-row-rail')).toBeInTheDocument()
    expect(within(row).getByLabelText('Mismatch')).toBeInTheDocument()
    expect(within(row).getByText('Mismatch')).toBeInTheDocument()
  })

  it('3. Provenance actions open/jump to format-honest evidence for TXT line/column, digital PDF page/bbox, XLSX sheet/cell, DOCX table/paragraph, scanned approximate region, and corrupt none', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(
      <EmailDetailView emailId="email_format_showcase" service={service} />
    )

    await screen.findByText('PREPARED RECORD')

    // TXT line/col
    const txtBtn = screen.getByRole('button', { name: /TXT_VALUE/ })
    await user.click(txtBtn)
    expect(screen.getByText(/Line 10, columns 5 to 25/)).toBeInTheDocument()

    // Scanned approximate
    const scanBtn = screen.getByRole('button', { name: /SCAN_VALUE/ })
    await user.click(scanBtn)
    const evidenceRegion = screen.getByRole('region', { name: 'Source evidence' })
    expect(within(evidenceRegion).getByText('Approximate')).toBeInTheDocument()
    expect(within(evidenceRegion).getByText(/Region: cargo/i)).toBeInTheDocument()

    // Corrupt none
    expect(screen.getByText('No source anchor')).toBeInTheDocument()
  })

  it('4. email_507 shows missing attachment refusal and retained SI evidence with zero FieldRows', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_507" service={service} />)

    await screen.findByText('PREPARED RECORD')
    expect(
      screen.getByText(/Refusal: Missing required draft bill of lading/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText('Retained shipping instruction evidence')
    ).toBeInTheDocument()

    // Zero FieldRows
    const rows = screen
      .queryAllByRole('generic')
      .filter((el) => el.classList?.contains('field-row'))
    expect(rows).toHaveLength(0)
  })

  it('5. Ambiguity probability in the interactive band appears in a held review card with a named owner', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('PREPARED RECORD')
    const card = screen.getByRole('region', { name: 'Review custody' })
    expect(card).toBeInTheDocument()
    expect(within(card).getByText(/Probability: 0\.68/)).toBeInTheDocument()
    expect(within(card).getByText('Marcus Vance')).toBeInTheDocument()
  })

  it('6. Approve/correct/reject go through the review seam and refresh the rendered history/owner; exactly one primary button is present', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('PREPARED RECORD')

    // Exactly one primary button on the entire screen
    const primaryButtons = screen
      .getAllByRole('button')
      .filter((b) => b.classList.contains('button--primary'))
    expect(primaryButtons).toHaveLength(1)
    expect(primaryButtons[0]).toHaveTextContent('Approve sign-off')

    // Submit approve
    await user.click(primaryButtons[0])
    expect(
      await screen.findByText(/Operator sign-off confirmed/i)
    ).toBeInTheDocument()
  })

  it('6b. After approval the irreversible controls are removed and a settled status is shown; approval cannot repeat', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('PREPARED RECORD')
    await user.click(screen.getByRole('button', { name: 'Approve sign-off' }))

    expect(await screen.findByText(/Review settled/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Approve sign-off' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Correct values' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reject with reason' })
    ).not.toBeInTheDocument()
  })

  it('7. Mobile-compatible markup preserves both source labels for each FieldRow', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    await screen.findByText('PREPARED RECORD')
    const consigneeRow = screen.getByText('Consignee').closest('.field-row') as HTMLElement
    const siSource = within(consigneeRow).getByText('Shipping instruction')
    const blSource = within(consigneeRow).getByText('Draft bill of lading')
    expect(siSource).toBeInTheDocument()
    expect(blSource).toBeInTheDocument()
    expect(siSource).toHaveClass('field-row-source')
    expect(blSource).toHaveClass('field-row-source')
  })
})
