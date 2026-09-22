import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PAGE_SIZE } from '../../lib/paging'
import { renderAt } from '../../test/render'
import { PREPARED_REVIEW_QUEUE_ITEMS } from './fixtures/review_queue'
import { ReviewQueueView } from './ReviewQueueView'
import { createPreparedReviewQueueService, type ReviewQueueService } from './seam'
import type { ReviewQueueItem } from './types'

function stubService(getQueueItems: ReviewQueueService['getQueueItems']): ReviewQueueService {
  return {
    getQueueItems,
    submitCaseReviewAction: vi.fn(),
    submitReconciliationAction: vi.fn(),
    reset: vi.fn()
  }
}

function renderView(service: ReviewQueueService) {
  return renderAt('/review', <ReviewQueueView service={service} />)
}

describe('ReviewQueueView', () => {
  it('shows an honest loading state while the service resolves', () => {
    renderView(stubService(() => new Promise<ReviewQueueItem[]>(() => {})))
    expect(screen.getByRole('status', { name: 'Loading review queue' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an honest error state when the queue fails to load', async () => {
    renderView(stubService(() => Promise.reject(new Error('Prepared queue unavailable'))))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be loaded/i)
    expect(alert).toHaveTextContent('Prepared queue unavailable')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders a neutral empty state instead of a verdict', async () => {
    renderView(stubService(() => Promise.resolve([])))
    expect(await screen.findByText(/review queue is empty/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('loads the prepared queue through the injected service', async () => {
    const total = PREPARED_REVIEW_QUEUE_ITEMS.length
    renderView(createPreparedReviewQueueService())
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(total + 1)
    expect(screen.getByText(`1-${total} of ${total}`)).toBeInTheDocument()
    expect(screen.getByText('seed-case:email_507')).toBeInTheDocument()
    expect(screen.getByText('rec_seed_case_email_512')).toBeInTheDocument()
  })

  it('pages through the queue and closes the open detail with its page', async () => {
    const user = userEvent.setup()
    // More exceptions than one page holds, each under its own ID.
    const exception = PREPARED_REVIEW_QUEUE_ITEMS.find((item) => item.kind === 'reconciliation_exception')!
    const many = Array.from({ length: PAGE_SIZE + 10 }, (_, index) => ({
      ...exception,
      item_id: `rq_many_${index}`,
      reconciliation_id: `rec_many_${String(index).padStart(3, '0')}`
    }))
    renderView(stubService(() => Promise.resolve(many)))
    await user.click(await screen.findByRole('button', { name: 'Inspect rec_many_000' }))
    expect(screen.getByRole('region', { name: 'Queue item rec_many_000' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(`51-${many.length} of ${many.length}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Inspect rec_many_000' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Queue item rec_many_000' })).not.toBeInTheDocument()
  })

  it('searches the queue by ID and pages only the matches, keeping the counts whole', async () => {
    const user = userEvent.setup()
    const cases = PREPARED_REVIEW_QUEUE_ITEMS.filter((item) => item.kind === 'case').length
    const exceptions = PREPARED_REVIEW_QUEUE_ITEMS.length - cases
    renderView(createPreparedReviewQueueService())
    await screen.findByRole('table')

    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'SHP-5RFR-37631')
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByText('rec_shp_5rfr_37631')).toBeInTheDocument()
    expect(screen.getByText('1-1 of 1')).toBeInTheDocument()
    expect(document.querySelector('.rq-metrics')).toHaveTextContent(`Held cases${cases}Exceptions${exceptions}`)

    await user.clear(screen.getByRole('searchbox', { name: 'Search by ID' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'email_511')
    expect(within(screen.getByRole('table')).getByText('seed-case:email_511')).toBeInTheDocument()
    expect(screen.getByText('1-1 of 1')).toBeInTheDocument()
  })

  it('sorts by ID in both directions, starting from the queue order', async () => {
    const user = userEvent.setup()
    const firstId = () => screen.getAllByRole('row')[1].querySelector('.rq-item-id')?.textContent
    renderView(createPreparedReviewQueueService())
    await screen.findByRole('table')
    expect(firstId()).toBe('seed-case:email_507')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID ascending' }))
    expect(firstId()).toBe('case_ambiguous_01')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID descending' }))
    expect(firstId()).toBe('seed-case:email_516')
  })

  it('opens a held case from anywhere on its row, leaving Inspect and exception rows alone', async () => {
    const user = userEvent.setup()
    function EmailStub() {
      return <p>Email {useParams().id}</p>
    }
    render(
      <MemoryRouter initialEntries={['/review']}>
        <Routes>
          <Route path="/review" element={<ReviewQueueView service={createPreparedReviewQueueService()} />} />
          <Route path="/emails/:id" element={<EmailStub />} />
        </Routes>
      </MemoryRouter>
    )
    const inspect = await screen.findByRole('button', { name: 'Inspect seed-case:email_507' })
    await user.click(inspect)
    expect(screen.getByRole('region', { name: 'Queue item seed-case:email_507' })).toBeInTheDocument()

    const exceptionRow = screen.getByRole('button', { name: 'Inspect rec_shp_5rfr_37631' }).closest('tr')!
    await user.click(within(exceptionRow).getAllByRole('cell')[1])
    expect(screen.getByRole('table')).toBeInTheDocument()

    await user.click(within(inspect.closest('tr')!).getAllByRole('cell')[1])
    expect(screen.getByText('Email email_507')).toBeInTheDocument()
  })

  it('shows an honest empty state when the search matches nothing', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())
    await screen.findByRole('table')
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'zzz')
    expect(screen.getByText('No items match the current filters.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('filters by reason or outcome, custody and owner, from the first page', async () => {
    const user = userEvent.setup()
    const cases = PREPARED_REVIEW_QUEUE_ITEMS.filter((item) => item.kind === 'case').length
    const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
    const choose = async (name: RegExp, option: string) => {
      await user.click(screen.getByRole('combobox', { name }))
      await user.click(screen.getByRole('option', { name: option }))
    }
    renderView(createPreparedReviewQueueService())
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await choose(/Custody/, 'Needs review')
    expect(rows()).toHaveLength(cases)
    expect(screen.getByText(`1-${cases} of ${cases}`)).toBeInTheDocument()

    await choose(/Custody/, 'All custody states')
    await choose(/Reason or outcome/, 'Missing case')
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText('rec_shp_5rfr_37631')).toBeInTheDocument()

    await choose(/Assigned owner/, 'Hafiz Tan')
    expect(screen.getByText('No items match the current filters.')).toBeInTheDocument()

    await choose(/Reason or outcome/, 'All reasons and outcomes')
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText('rec_shp_5akr_00230')).toBeInTheDocument()
  })

  it('switches row density', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())
    const table = await screen.findByRole('table')
    expect(table).toHaveAttribute('data-density', 'comfortable')
    await user.click(screen.getByRole('combobox', { name: /Density/ }))
    await user.click(screen.getByRole('option', { name: 'Compact' }))
    expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact')
  })

  it('discloses case context, history, and the email deep link on selection', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())

    await user.click(await screen.findByRole('button', { name: 'Inspect seed-case:email_507' }))
    const detail = screen.getByRole('region', {
      name: 'Queue item seed-case:email_507'
    })
    expect(within(detail).getByText('Missing attachment')).toBeInTheDocument()
    expect(within(detail).getByText(/no draft bill of lading was attached/i)).toBeInTheDocument()
    expect(within(detail).getByText('Unassigned')).toBeInTheDocument()
    expect(within(detail).queryByText('docs-demo')).not.toBeInTheDocument()
    expect(within(detail).queryAllByRole('listitem')).toHaveLength(0)
    const link = within(detail).getByRole('link', { name: /email_507/ })
    expect(link).toHaveAttribute('href', '/emails/email_507')
  })

  it('discloses exception context and appends exactly one history entry per action', async () => {
    const user = userEvent.setup()
    const service = createPreparedReviewQueueService()
    const getQueueItems = vi.spyOn(service, 'getQueueItems')
    renderView(service)

    await user.click(await screen.findByRole('button', { name: 'Inspect rec_shp_5akr_00230' }))
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_shp_5akr_00230'
    })
    expect(within(detail).getByText('Document missing')).toBeInTheDocument()
    expect(within(detail).getByText('Shipment SHP-5AKR-00230')).toBeInTheDocument()
    expect(within(detail).getByText('SHP-5AKR-00230')).toBeInTheDocument()
    expect(within(detail).getByText('seed-case:email_507')).toBeInTheDocument()
    expect(within(detail).getAllByRole('listitem')).toHaveLength(1)

    await user.click(within(detail).getByRole('button', { name: 'Acknowledge' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Working the document chase')
    await user.click(within(detail).getByRole('button', { name: 'Submit acknowledgment' }))

    await waitFor(() => expect(within(detail).getAllByRole('listitem')).toHaveLength(2))
    const entries = within(detail).getAllByRole('listitem')
    expect(entries.at(-1)).toHaveTextContent('ACKNOWLEDGE')
    expect(entries.at(-1)).toHaveTextContent('Working the document chase')
    expect(within(detail).getByText('Acknowledged')).toBeInTheDocument()
    // The view reloaded the queue after the action.
    expect(getQueueItems.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('reassigns custody to a named owner through ASSIGN', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())

    await user.click(await screen.findByRole('button', { name: 'Inspect rec_shp_5rfr_37631' }))
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_shp_5rfr_37631'
    })
    await user.click(within(detail).getByRole('button', { name: 'Assign' }))
    await user.type(within(detail).getByLabelText('New owner'), 'Elisa Tukiman')
    await user.type(within(detail).getByLabelText('Rationale'), 'Rerouting to the duty officer')
    await user.click(within(detail).getByRole('button', { name: 'Submit assignment' }))

    await waitFor(() => expect(within(detail).getAllByText('Elisa Tukiman').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByRole('button', { name: 'Inspect rec_shp_5rfr_37631' })).toBeInTheDocument()
    const row = screen.getByRole('button', { name: 'Inspect rec_shp_5rfr_37631' }).closest('tr')!
    expect(within(row).getByText('Elisa Tukiman')).toBeInTheDocument()
  })

  it('settles a resolved exception and removes its action controls', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())

    await user.click(await screen.findByRole('button', { name: 'Inspect rec_shp_5rfr_36541' }))
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_shp_5rfr_36541'
    })
    await user.click(within(detail).getByRole('button', { name: 'Resolve' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Case received and linked')
    await user.click(within(detail).getByRole('button', { name: 'Submit resolution' }))

    await waitFor(() => expect(within(detail).getByText(/no further actions/i)).toBeInTheDocument())
    for (const name of ['Assign', 'Acknowledge', 'Escalate', 'Resolve']) {
      expect(within(detail).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    const row = screen.getByRole('button', { name: 'Inspect rec_shp_5rfr_36541' }).closest('tr')!
    expect(row).not.toHaveAttribute('data-status', 'held')
    expect(within(row).getByText('Resolved')).toBeInTheDocument()
  })

  it('displays seam validation inline and never calls the service without it', async () => {
    const user = userEvent.setup()
    const service = createPreparedReviewQueueService()
    const submit = vi.spyOn(service, 'submitReconciliationAction')
    renderView(service)

    await user.click(
      await screen.findByRole('button', { name: 'Inspect rec_ambiguous_shp_i978820812_1_shp_i978820812_2' })
    )
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_ambiguous_shp_i978820812_1_shp_i978820812_2'
    })
    await user.click(within(detail).getByRole('button', { name: 'Escalate' }))
    await user.click(within(detail).getByRole('button', { name: 'Submit escalation' }))
    expect(await within(detail).findByText(/rationale is required/i)).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it('surfaces a RESOLVED rejection inline when the service refuses an action', async () => {
    const user = userEvent.setup()
    const base = createPreparedReviewQueueService()
    const service: ReviewQueueService = {
      ...base,
      submitReconciliationAction: () =>
        Promise.reject(new Error('Reconciliation exception rec_shp_5rfr_37631 is already resolved'))
    }
    renderView(service)

    await user.click(await screen.findByRole('button', { name: 'Inspect rec_shp_5rfr_37631' }))
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_shp_5rfr_37631'
    })
    await user.click(within(detail).getByRole('button', { name: 'Resolve' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Looks done')
    await user.click(within(detail).getByRole('button', { name: 'Submit resolution' }))
    expect(await within(detail).findByRole('alert')).toHaveTextContent(/already resolved/i)
  })

  it('never fabricates case or shipment identifiers for exception actions', async () => {
    const user = userEvent.setup()
    renderView(createPreparedReviewQueueService())

    // UNMATCHED_CASE has no expected shipment; the UI must not invent one.
    await user.click(
      await screen.findByRole('button', {
        name: 'Inspect rec_seed_case_email_512'
      })
    )
    const detail = screen.getByRole('region', {
      name: 'Queue item rec_seed_case_email_512'
    })
    expect(within(detail).getByText('Case email_512')).toBeInTheDocument()
    expect(within(detail).getByText('seed-case:email_512')).toBeInTheDocument()
    expect(within(detail).queryByText('Expected shipment')).not.toBeInTheDocument()
    expect(within(detail).queryByText(/SYN-/)).not.toBeInTheDocument()

    await user.click(within(detail).getByRole('button', { name: 'Escalate' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Cannot locate any expected shipment')
    await user.click(within(detail).getByRole('button', { name: 'Submit escalation' }))

    await waitFor(() => expect(within(detail).getByText('Escalated')).toBeInTheDocument())
    expect(within(detail).queryByText('Expected shipment')).not.toBeInTheDocument()
    // No new deep links appeared: unmatched cases have no email detail target.
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })
})
