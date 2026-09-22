import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PAGE_SIZE } from '../../lib/paging'
import { renderAt } from '../../test/render'
import { createPreparedReconciliationService } from '../reconciliation/seam'
import { ReviewQueueView } from './ReviewQueueView'
import { createPreparedReviewQueueService, type ReviewQueueService } from './seam'
import type { ReconciliationExceptionQueueItem, ReviewQueueItem } from './types'

function stubService(getQueueItems: ReviewQueueService['getQueueItems']): ReviewQueueService {
  return {
    getQueueItems,
    submitCaseReviewAction: vi.fn(),
    submitReconciliationAction: vi.fn(),
    reset: vi.fn()
  }
}

/** The prepared queue once reconciliation has run: 20 held cases, 17 exceptions. */
async function queueAfterRun(): Promise<ReviewQueueService> {
  const reconciliation = createPreparedReconciliationService()
  await reconciliation.runReconciliation()
  return createPreparedReviewQueueService({ reconciliationService: reconciliation })
}

function renderView(service: ReviewQueueService) {
  return renderAt('/review', <ReviewQueueView service={service} />)
}

function rows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
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

  it('holds only the cases before reconciliation runs, and says where the exceptions come from', async () => {
    renderView(createPreparedReviewQueueService({ reconciliationService: createPreparedReconciliationService() }))
    await screen.findByRole('table')
    expect(rows()).toHaveLength(20)
    expect(document.querySelector('.rq-metrics')).toHaveTextContent('Held cases20Exceptions0')
    expect(screen.getByText(/join the queue after a run/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reconciliation' })).toHaveAttribute('href', '/reconciliation')
  })

  it("loads the held cases and the run's exceptions, each led by its email or shipment", async () => {
    renderView(await queueAfterRun())
    await screen.findByRole('table')
    expect(rows()).toHaveLength(37)
    expect(screen.getByText('1-37 of 37')).toBeInTheDocument()
    expect(document.querySelector('.rq-metrics')).toHaveTextContent('Held cases20Exceptions17')
    expect(screen.queryByText(/join the queue after a run/)).not.toBeInTheDocument()
    // Internal IDs stay out of the rows.
    expect(screen.queryByText(/seed-case:|rec_/)).not.toBeInTheDocument()
    const missing = screen.getByRole('button', { name: 'Inspect Exception SHP-5RFR-37631' }).closest('tr')!
    expect(within(missing).getByText('No case received')).toBeInTheDocument()
    const held = screen.getByRole('button', { name: 'Inspect Case email_507' }).closest('tr')!
    expect(within(held).getByRole('link', { name: 'email_507' })).toHaveAttribute('href', '/emails/email_507')
    expect(within(held).getByText('No draft Bill of Lading was attached')).toBeInTheDocument()
  })

  it('pages through the queue and closes the open detail with its page', async () => {
    const user = userEvent.setup()
    const service = await queueAfterRun()
    const base = (await service.getQueueItems()).find(
      (item): item is ReconciliationExceptionQueueItem => item.kind === 'reconciliation_exception' && !!item.shipment_id
    )!
    // More exceptions than one page holds, each for its own shipment.
    const many = Array.from({ length: PAGE_SIZE + 10 }, (_, index) => ({
      ...base,
      item_id: `rq_many_${index}`,
      reconciliation_id: `rec_many_${index}`,
      shipment_id: `SHP-MANY-${String(index).padStart(3, '0')}`
    }))
    renderView(stubService(() => Promise.resolve(many)))
    await user.click(await screen.findByRole('button', { name: 'Inspect Exception SHP-MANY-000' }))
    expect(screen.getByRole('region', { name: 'Exception SHP-MANY-000' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(`51-${many.length} of ${many.length}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.queryByRole('region', { name: 'Exception SHP-MANY-000' })).not.toBeInTheDocument()
  })

  it('searches by any email or shipment a row names, keeping the counts whole', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())
    await screen.findByRole('table')

    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'SHP-5RFR-37631')
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('1-1 of 1')).toBeInTheDocument()
    expect(document.querySelector('.rq-metrics')).toHaveTextContent('Held cases20Exceptions17')

    // email_511 is a held case, and the exception for its shipment links it.
    await user.clear(screen.getByRole('searchbox', { name: 'Search by ID' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'email_511')
    expect(screen.getByRole('button', { name: 'Inspect Case email_511' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect Exception SHP-5SUS-40134' })).toBeInTheDocument()
    expect(screen.getByText('1-2 of 2')).toBeInTheDocument()
  })

  it('sorts by ID in both directions, starting from the queue order', async () => {
    const user = userEvent.setup()
    const firstId = () => rows()[0].querySelector('.rq-item-link, .rq-item-id')?.textContent
    renderView(await queueAfterRun())
    await screen.findByRole('table')
    expect(firstId()).toBe('email_501')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID ascending' }))
    expect(firstId()).toBe('email_009')

    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID descending' }))
    expect(firstId()).toBe('SHP-5SUS-40134')
  })

  it('opens a held case from anywhere on its row, leaving Inspect and exception rows alone', async () => {
    const user = userEvent.setup()
    function EmailStub() {
      return <p>Email {useParams().id}</p>
    }
    const service = await queueAfterRun()
    render(
      <MemoryRouter initialEntries={['/review']}>
        <Routes>
          <Route path="/review" element={<ReviewQueueView service={service} />} />
          <Route path="/emails/:id" element={<EmailStub />} />
        </Routes>
      </MemoryRouter>
    )
    const inspect = await screen.findByRole('button', { name: 'Inspect Case email_507' })
    await user.click(inspect)
    expect(screen.getByRole('region', { name: 'Case email_507' })).toBeInTheDocument()

    const exceptionRow = screen.getByRole('button', { name: 'Inspect Exception SHP-5RFR-37631' }).closest('tr')!
    await user.click(within(exceptionRow).getAllByRole('cell')[1])
    expect(screen.getByRole('table')).toBeInTheDocument()

    await user.click(within(inspect.closest('tr')!).getAllByRole('cell')[1])
    expect(screen.getByText('Email email_507')).toBeInTheDocument()
  })

  it('shows an honest empty state when the search matches nothing', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())
    await screen.findByRole('table')
    await user.type(screen.getByRole('searchbox', { name: 'Search by ID' }), 'zzz')
    expect(screen.getByText('No items match the current filters.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('filters by reason or outcome and custody, with no owner filter', async () => {
    const user = userEvent.setup()
    const choose = async (name: RegExp, option: string) => {
      await user.click(screen.getByRole('combobox', { name }))
      await user.click(screen.getByRole('option', { name: option }))
    }
    renderView(await queueAfterRun())
    await screen.findByRole('table')
    expect(screen.queryByRole('combobox', { name: /owner/i })).not.toBeInTheDocument()

    await choose(/Custody/, 'Needs review')
    expect(rows()).toHaveLength(20)

    await choose(/Custody/, 'Open')
    expect(rows()).toHaveLength(17)

    await choose(/Reason or outcome/, 'Missing case')
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]).getByText('SHP-5RFR-37631')).toBeInTheDocument()
  })

  it('switches row density', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())
    const table = await screen.findByRole('table')
    expect(table).toHaveAttribute('data-density', 'comfortable')
    await user.click(screen.getByRole('combobox', { name: /Density/ }))
    await user.click(screen.getByRole('option', { name: 'Compact' }))
    expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact')
  })

  it('discloses case context, history, and the email deep link on selection', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())

    await user.click(await screen.findByRole('button', { name: 'Inspect Case email_507' }))
    const detail = screen.getByRole('region', { name: 'Case email_507' })
    expect(within(detail).getByText('Missing attachment')).toBeInTheDocument()
    expect(within(detail).getByText(/no draft bill of lading was attached/i)).toBeInTheDocument()
    expect(within(detail).queryByText(/owner/i)).not.toBeInTheDocument()
    expect(within(detail).queryAllByRole('listitem')).toHaveLength(0)
    const link = within(detail).getByRole('link', { name: /email_507/ })
    expect(link).toHaveAttribute('href', '/emails/email_507')
  })

  it('discloses exception context and appends exactly one history entry per action', async () => {
    const user = userEvent.setup()
    const service = await queueAfterRun()
    const getQueueItems = vi.spyOn(service, 'getQueueItems')
    renderView(service)

    await user.click(await screen.findByRole('button', { name: 'Inspect Exception SHP-5AKR-00230' }))
    const detail = screen.getByRole('region', { name: 'Exception SHP-5AKR-00230' })
    expect(within(detail).getByText('Document missing')).toBeInTheDocument()
    expect(within(detail).getAllByText('SHP-5AKR-00230').length).toBeGreaterThanOrEqual(1)
    expect(within(detail).getByText('email_507')).toBeInTheDocument()
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

  it('offers no Assign action and asks for no owner', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())

    await user.click(await screen.findByRole('button', { name: 'Inspect Exception SHP-5RFR-37631' }))
    const detail = screen.getByRole('region', { name: 'Exception SHP-5RFR-37631' })
    const actions = within(within(detail).getByRole('group', { name: 'Exception actions' })).getAllByRole('button')
    expect(actions.map((button) => button.textContent)).toEqual(['Acknowledge', 'Escalate', 'Resolve'])
    await user.click(within(detail).getByRole('button', { name: 'Escalate' }))
    expect(within(detail).queryByLabelText(/owner/i)).not.toBeInTheDocument()
  })

  it('settles a resolved exception and removes its action controls', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())

    await user.click(await screen.findByRole('button', { name: 'Inspect Exception SHP-5RFR-36541' }))
    const detail = screen.getByRole('region', { name: 'Exception SHP-5RFR-36541' })
    await user.click(within(detail).getByRole('button', { name: 'Resolve' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Case received and linked')
    await user.click(within(detail).getByRole('button', { name: 'Submit resolution' }))

    await waitFor(() => expect(within(detail).getByText(/no further actions/i)).toBeInTheDocument())
    for (const name of ['Acknowledge', 'Escalate', 'Resolve']) {
      expect(within(detail).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    const row = screen.getByRole('button', { name: 'Inspect Exception SHP-5RFR-36541' }).closest('tr')!
    expect(row).not.toHaveAttribute('data-status', 'held')
    expect(within(row).getByText('Resolved')).toBeInTheDocument()
  })

  it('displays seam validation inline and never calls the service without it', async () => {
    const user = userEvent.setup()
    const service = await queueAfterRun()
    const submit = vi.spyOn(service, 'submitReconciliationAction')
    renderView(service)

    await user.click(await screen.findByRole('button', { name: 'Inspect Exception email_009' }))
    const detail = screen.getByRole('region', { name: 'Exception email_009' })
    expect(within(detail).getByText('SHP-I978820812-1, SHP-I978820812-2')).toBeInTheDocument()
    await user.click(within(detail).getByRole('button', { name: 'Escalate' }))
    await user.click(within(detail).getByRole('button', { name: 'Submit escalation' }))
    expect(await within(detail).findByText(/rationale is required/i)).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it('surfaces a RESOLVED rejection inline when the service refuses an action', async () => {
    const user = userEvent.setup()
    const base = await queueAfterRun()
    const service: ReviewQueueService = {
      ...base,
      submitReconciliationAction: () =>
        Promise.reject(new Error('Reconciliation exception rec_shp_5rfr_37631 is already resolved'))
    }
    renderView(service)

    await user.click(await screen.findByRole('button', { name: 'Inspect Exception SHP-5RFR-37631' }))
    const detail = screen.getByRole('region', { name: 'Exception SHP-5RFR-37631' })
    await user.click(within(detail).getByRole('button', { name: 'Resolve' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Looks done')
    await user.click(within(detail).getByRole('button', { name: 'Submit resolution' }))
    expect(await within(detail).findByRole('alert')).toHaveTextContent(/already resolved/i)
  })

  it('never fabricates case or shipment identifiers for exception actions', async () => {
    const user = userEvent.setup()
    renderView(await queueAfterRun())

    // UNMATCHED_CASE has no expected shipment; the UI must not invent one.
    await user.click(await screen.findByRole('button', { name: 'Inspect Exception email_512' }))
    const detail = screen.getByRole('region', { name: 'Exception email_512' })
    expect(within(detail).getByText('Unmatched case')).toBeInTheDocument()
    expect(within(detail).queryByText('Expected shipment')).not.toBeInTheDocument()
    expect(within(detail).queryByText(/SHP-/)).not.toBeInTheDocument()

    await user.click(within(detail).getByRole('button', { name: 'Escalate' }))
    await user.type(within(detail).getByLabelText('Rationale'), 'Cannot locate any expected shipment')
    await user.click(within(detail).getByRole('button', { name: 'Submit escalation' }))

    await waitFor(() => expect(within(detail).getByText('Escalated')).toBeInTheDocument())
    expect(within(detail).queryByText('Expected shipment')).not.toBeInTheDocument()
    // No new deep links appeared: an unmatched case has no shipment to open.
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })
})
