import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadPanel } from './UploadPanel'
import type { JudgePolicy, UploadRejection } from '../types'

const POLICY: JudgePolicy = {
  accepted_formats: ['txt', 'pdf', 'docx', 'xlsx'],
  max_file_bytes: 5_242_880,
  data_policy: 'Synthetic data only.',
  confirmation_required: true
}

const ZONE = 'Shipping documents'

function file(name: string, size = 10, type = 'text/plain') {
  return new File([new ArrayBuffer(size)], name, { type })
}

function zoneInput() {
  const zone = screen.getByRole('button', { name: ZONE })
  return zone.closest('.drop-zone')!.querySelector('input[type="file"]') as HTMLInputElement
}

function drop(...files: File[]) {
  fireEvent.change(zoneInput(), { target: { files } })
}

function confirm(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('checkbox', { name: 'These documents are synthetic (no real shipping data)' }))
}

function renderPanel(props: Partial<Parameters<typeof UploadPanel>[0]> = {}) {
  const onSubmit = vi.fn()
  const onBatch = vi.fn()
  const view = render(
    <UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={onSubmit} onBatch={onBatch} {...props} />
  )
  return { ...view, onSubmit, onBatch }
}

describe('UploadPanel', () => {
  it('offers one drop zone for the pair, naming formats, JSON batches and the size ceiling', () => {
    renderPanel()
    expect(screen.getAllByRole('button', { name: ZONE })).toHaveLength(1)
    expect(screen.getByText(/Accepts TXT, PDF, DOCX, XLSX, JSON up to 5.2 MB/)).toBeInTheDocument()
    expect(screen.getByText(/in either order/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shipping Instruction' })).not.toBeInTheDocument()
  })

  it('rejects a .png inline with the file name and never calls window.alert', () => {
    const alertSpy = vi.spyOn(window, 'alert')
    renderPanel()
    drop(file('scan.png', 10, 'image/png'))
    expect(screen.getByText(/scan\.png is not an accepted format/)).toBeInTheDocument()
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('rejects an oversize file inline', () => {
    renderPanel()
    drop(file('huge.pdf', 6_000_000))
    expect(screen.getByText(/huge\.pdf exceeds the 5.2 MB limit/)).toBeInTheDocument()
  })

  it('takes the pair in either order, listing each file with its size and a Remove button', () => {
    renderPanel()
    drop(file('bl.txt', 920), file('si.txt', 2_000))
    const chosen = screen.getByRole('list', { name: 'Chosen documents' })
    expect(
      within(chosen)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([expect.stringContaining('bl.txt'), expect.stringContaining('si.txt')])
    expect(within(chosen).getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove bl.txt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove si.txt' })).toBeInTheDocument()
    // With the pair chosen, the drop zone steps aside.
    expect(screen.queryByRole('button', { name: ZONE })).not.toBeInTheDocument()
  })

  it('asks for the second document after one, and keeps the zone for it', () => {
    renderPanel()
    drop(file('si.txt'))
    expect(screen.getByText('Add the second document to check the pair.')).toBeInTheDocument()
    drop(file('bl.txt'))
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2)
  })

  it('keeps two of more dropped documents and says how many were not added', () => {
    renderPanel()
    drop(file('a.txt'), file('b.txt'), file('c.txt'))
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('1 extra file was not added.')
  })

  it('keeps the submit button disabled until the pair is chosen and confirmed, and while busy', async () => {
    const user = userEvent.setup()
    const { rerender, onSubmit, onBatch } = renderPanel()
    const submit = () => screen.getByRole('button', { name: 'Check documents' })
    drop(file('si.txt'))
    await confirm(user)
    expect(submit()).toBeDisabled()
    drop(file('bl.txt'))
    expect(submit()).toBeEnabled()
    rerender(<UploadPanel policy={POLICY} busy serverRejections={[]} onSubmit={onSubmit} onBatch={onBatch} />)
    expect(submit()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove si.txt' })).toBeDisabled()
  })

  it('submits both files in the order they were dropped once ready and confirmed', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderPanel()
    const bl = file('bl.txt')
    const si = file('si.txt')
    drop(bl, si)
    await confirm(user)
    await user.click(screen.getByRole('button', { name: 'Check documents' }))
    expect(onSubmit).toHaveBeenCalledWith([bl, si])
  })

  it('shows a server rejection under the file it names, and a general one below the files', () => {
    const rejections: UploadRejection[] = [
      { slot: 'file_2', reason: 'unsupported_format' },
      { slot: 'files', reason: 'too_many' }
    ]
    const { rerender, onSubmit, onBatch } = renderPanel()
    drop(file('si.txt'), file('bl.txt'))
    rerender(
      <UploadPanel policy={POLICY} busy={false} serverRejections={rejections} onSubmit={onSubmit} onBatch={onBatch} />
    )
    const [first, second] = within(screen.getByRole('list', { name: 'Chosen documents' })).getAllByRole('listitem')
    expect(within(first).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(second).getByRole('alert')).toHaveTextContent('This file type is not accepted.')
    expect(screen.getByText('Only two documents are checked at a time.')).toBeInTheDocument()
  })

  it('renders a humanized fallback sentence for an unrecognized rejection code', () => {
    const { rerender, onSubmit, onBatch } = renderPanel()
    drop(file('si.txt'), file('bl.txt'))
    rerender(
      <UploadPanel
        policy={POLICY}
        busy={false}
        serverRejections={[{ slot: 'file_1', reason: 'mystery_problem' }]}
        onSubmit={onSubmit}
        onBatch={onBatch}
      />
    )
    expect(screen.getByText('Something is wrong with this file: Mystery problem.')).toBeInTheDocument()
  })

  it('clears a stale server rejection as soon as the files change', async () => {
    const user = userEvent.setup()
    const { rerender, onSubmit, onBatch } = renderPanel()
    drop(file('si.txt'), file('bl.png.txt'))
    rerender(
      <UploadPanel
        policy={POLICY}
        busy={false}
        serverRejections={[{ slot: 'file_2', reason: 'empty' }]}
        onSubmit={onSubmit}
        onBatch={onBatch}
      />
    )
    expect(screen.getByText('This file is empty.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove bl.png.txt' }))
    expect(screen.queryByText('This file is empty.')).not.toBeInTheDocument()
  })

  it('reads a .json drop as a batch, matching the documents dropped with it', async () => {
    const { onBatch, onSubmit } = renderPanel()
    const record = new File(
      [JSON.stringify({ email_id: 'email_001', attachments: ['attachments/si.txt', 'attachments/bl.txt'] })],
      'email_001.json',
      { type: 'application/json' }
    )
    drop(record, file('si.txt'), file('bl.txt'))
    await waitFor(() => expect(onBatch).toHaveBeenCalledTimes(1))
    const [batch] = onBatch.mock.calls[0]
    expect(batch.entries[0]).toMatchObject({ id: 'email_001', problem: null })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('says so when a dropped .json is not a batch', async () => {
    const { onBatch } = renderPanel()
    drop(new File(['not json'], 'notes.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('notes.json is not readable JSON.')
    expect(onBatch).not.toHaveBeenCalled()
  })
})
