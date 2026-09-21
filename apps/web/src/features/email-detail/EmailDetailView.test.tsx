import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmailDetailView } from './EmailDetailView'
import { createPreparedEmailDetailService } from './seam'

describe('EmailDetailView acceptance behaviors', () => {
  it('1. A normal prepared case renders the attachment preflight list before exactly seven FieldRows with human-friendly labels and source labels', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    // Explicit prepared record badge
    expect(await screen.findByText('Prepared record')).toBeInTheDocument()

    // Preflight appears before grid
    const preflightRegion = screen.getByRole('region', {
      name: 'Attachment check'
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
    render(<EmailDetailView emailId="email_004" service={service} />)

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

    await screen.findByText('Prepared record')

    // TXT line and column
    await user.click(
      screen.getByRole('button', { name: 'TXT_VALUE_PT_INDAH' })
    )
    let evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(
      within(evidence).getByText('manifest.txt')
    ).toBeInTheDocument()
    expect(
      within(evidence).getByText(/Line 10, columns 5 to 25/)
    ).toBeInTheDocument()

    // Digital PDF page and bounding box
    await user.click(
      screen.getByRole('button', { name: 'PDF_DIGITAL_VALUE' })
    )
    evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(
      within(evidence).getByText('bill_digital.pdf')
    ).toBeInTheDocument()
    expect(within(evidence).getByText(/Page 1/)).toBeInTheDocument()
    expect(
      within(evidence).getByText(/72\.0, 140\.0, 280\.0, 165\.0/)
    ).toBeInTheDocument()

    // XLSX sheet and cell
    await user.click(
      screen.getByRole('button', { name: 'XLSX_VALUE_BALL_DOGGETT' })
    )
    evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(
      within(evidence).getByText('booking_sheet.xlsx')
    ).toBeInTheDocument()
    expect(
      within(evidence).getByText(/Sheet S\.I\., Cell B5/)
    ).toBeInTheDocument()

    // DOCX table cell
    await user.click(
      screen.getByRole('button', { name: 'DOCX_VALUE_TABLE_CELL' })
    )
    evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(
      within(evidence).getByText('draft_bl.docx')
    ).toBeInTheDocument()
    expect(
      within(evidence).getByText(/Table 0, row 1, column 1/i)
    ).toBeInTheDocument()

    // DOCX paragraph
    await user.click(
      screen.getByRole('button', { name: 'DOCX_PARAGRAPH_VALUE' })
    )
    evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(
      within(evidence).getByText(/Paragraph 2/)
    ).toBeInTheDocument()

    // Scanned PDF approximate region
    await user.click(
      screen.getByRole('button', { name: 'SCAN_VALUE_APPROX_REGION' })
    )
    evidence = screen.getByRole('region', { name: 'Source evidence' })
    expect(within(evidence).getByText('scan_bl.pdf')).toBeInTheDocument()
    expect(within(evidence).getByText('Approximate')).toBeInTheDocument()
    expect(
      within(evidence).getByText(/Cargo region/i)
    ).toBeInTheDocument()

    // Corrupt attachment: value shown without a usable anchor
    const loadingRow = screen
      .getByText('Port of loading')
      .closest('.field-row') as HTMLElement
    expect(
      within(loadingRow).getByText('Unreadable')
    ).toBeInTheDocument()
    expect(
      within(loadingRow).getByText('No source anchor')
    ).toBeInTheDocument()
    expect(
      within(loadingRow).queryByRole('button', { name: /Unreadable/ })
    ).not.toBeInTheDocument()
  })

  it('4. email_507 shows missing attachment refusal with zero FieldRows', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_507" service={service} />)

    await screen.findByText('Prepared record')
    expect(
      screen.getByText(/Refusal: Missing required draft bill of lading/i)
    ).toBeInTheDocument()

    // Zero FieldRows
    const rows = screen
      .queryAllByRole('generic')
      .filter((el) => el.classList?.contains('field-row'))
    expect(rows).toHaveLength(0)

    // No empty source evidence panel when there is no comparison
    expect(
      screen.queryByRole('region', { name: 'Source evidence' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Click any compared field value/i)
    ).not.toBeInTheDocument()
  })

  it('4b. The attachments metadata counts only files actually present, not missing-required placeholders', async () => {
    const service = createPreparedEmailDetailService()
    const { rerender } = render(
      <EmailDetailView emailId="email_001" service={service} />
    )
    expect(await screen.findByText('2 files detected')).toBeInTheDocument()

    rerender(<EmailDetailView emailId="email_507" service={service} />)
    expect(await screen.findByText('1 file detected')).toBeInTheDocument()
  })

  it('5. Ambiguity probability in the interactive band appears in a held review card with a named owner', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('Prepared record')
    const card = screen.getByRole('region', { name: 'Review custody' })
    expect(card).toBeInTheDocument()
    expect(within(card).getByText(/Probability: 0\.68/)).toBeInTheDocument()
    expect(within(card).getByText('Marcus Vance')).toBeInTheDocument()
  })

  it('6. Approve/correct/reject go through the review seam and refresh the rendered history/owner; exactly one primary button is present', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('Prepared record')

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

    await screen.findByText('Prepared record')
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

  it('6c. A provenance jump scrolls the source evidence region into view', async () => {
    const user = userEvent.setup()
    const scrollSpy = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollSpy
    try {
      const service = createPreparedEmailDetailService()
      render(<EmailDetailView emailId="email_001" service={service} />)

      await screen.findByText('Prepared record')
      await user.click(
        screen.getAllByRole('button', { name: /MOORIM SP CO\., LTD/i })[0]
      )

      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' })
      )
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('6d. A provenance jump uses non-animated scrolling when reduced motion is preferred', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        }) as MediaQueryList
    )
    const scrollSpy = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollSpy
    try {
      const service = createPreparedEmailDetailService()
      render(<EmailDetailView emailId="email_001" service={service} />)

      await screen.findByText('Prepared record')
      await user.click(
        screen.getAllByRole('button', { name: /MOORIM SP CO\., LTD/i })[0]
      )

      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'auto' })
      )
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('8a. Prepared record copy reads plainly without implementation jargon', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)
    await screen.findByText('Prepared record')

    await user.hover(
      screen.getByRole('button', { name: 'About prepared data' })
    )
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent(/prepared/i)
    expect(tip).not.toHaveTextContent(/fixture|pipeline|issue/i)
  })

  it('8. Changing emailId returns the view to a loading state before showing the next record', async () => {
    const service = createPreparedEmailDetailService()
    const { rerender } = render(
      <EmailDetailView emailId="email_001" service={service} />
    )
    await screen.findByText('Prepared record')

    rerender(<EmailDetailView emailId="email_507" service={service} />)
    expect(screen.getByText('Loading email detail...')).toBeInTheDocument()

    expect(
      await screen.findByText(/Refusal: Missing required draft bill of lading/i)
    ).toBeInTheDocument()
  })

  it('7. Mobile-compatible markup preserves both source labels for each FieldRow', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    await screen.findByText('Prepared record')
    const consigneeRow = screen.getByText('Consignee').closest('.field-row') as HTMLElement
    const siSource = within(consigneeRow).getByText('Shipping instruction')
    const blSource = within(consigneeRow).getByText('Draft bill of lading')
    expect(siSource).toBeInTheDocument()
    expect(blSource).toBeInTheDocument()
    expect(siSource).toHaveClass('field-row-source')
    expect(blSource).toHaveClass('field-row-source')
  })
})
