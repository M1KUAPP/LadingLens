import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GateSummary as GateSummaryData } from '../types'
import { GateSummary } from './GateSummary'

const SUMMARY: GateSummaryData = {
  seed_version: 'seed-v1',
  source: 'recorded',
  gate1: { received: 20, accounted: 20, by_category: { BL_COMPARISON: 12, SI_REQUEST: 8 } },
  comparison: { OK: 14, MISMATCH: 3, NEEDS_REVIEW: 3 },
  gate2: { shipments: 10, outcomes: { CASE_PRESENT: 8, DOCUMENT_MISSING: 2 } }
}

describe('GateSummary', () => {
  it('renders nothing until the summary has loaded', () => {
    const getGateSummary = vi.fn(() => new Promise<GateSummaryData>(() => {}))
    const { container } = render(<GateSummary getGateSummary={getGateSummary} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows Gate 1 accounted/received, comparison counts, and Gate 2 outcome counts', async () => {
    const getGateSummary = vi.fn().mockResolvedValue(SUMMARY)
    render(<GateSummary getGateSummary={getGateSummary} />)

    expect(await screen.findByText('20 of 20 emails accounted for')).toBeInTheDocument()
    expect(screen.getByText('OK (14)')).toBeInTheDocument()
    expect(screen.getByText('MISMATCH (3)')).toBeInTheDocument()
    expect(screen.getByText('NEEDS_REVIEW (3)')).toBeInTheDocument()
    expect(screen.getByText('CASE_PRESENT (8)')).toBeInTheDocument()
    expect(screen.getByText('DOCUMENT_MISSING (2)')).toBeInTheDocument()
  })

  it('uses the singular "email" when exactly one email was received', async () => {
    const singular: GateSummaryData = {
      ...SUMMARY,
      gate1: { received: 1, accounted: 1, by_category: { BL_COMPARISON: 1 } }
    }
    const getGateSummary = vi.fn().mockResolvedValue(singular)
    render(<GateSummary getGateSummary={getGateSummary} />)

    expect(await screen.findByText('1 of 1 email accounted for')).toBeInTheDocument()
  })

  it('shows the source as "Recorded run" for the recorded source, never the raw value', async () => {
    const getGateSummary = vi.fn().mockResolvedValue(SUMMARY)
    render(<GateSummary getGateSummary={getGateSummary} />)

    expect(await screen.findByText('Recorded run')).toBeInTheDocument()
    expect(screen.queryByText('recorded')).not.toBeInTheDocument()
  })

  it('shows the source as "Prepared baseline" for the prepared source, never the raw value', async () => {
    const getGateSummary = vi.fn().mockResolvedValue({ ...SUMMARY, source: 'prepared' as const })
    render(<GateSummary getGateSummary={getGateSummary} />)

    expect(await screen.findByText('Prepared baseline')).toBeInTheDocument()
    expect(screen.queryByText('prepared')).not.toBeInTheDocument()
  })

  it('never renders a status pill, keeping aggregate counts distinct from a live comparison result', async () => {
    const getGateSummary = vi.fn().mockResolvedValue(SUMMARY)
    const { container } = render(<GateSummary getGateSummary={getGateSummary} />)

    await screen.findByText('20 of 20 emails accounted for')
    expect(container.querySelector('.status-pill')).toBeNull()
  })
})
