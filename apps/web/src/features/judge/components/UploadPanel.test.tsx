import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadPanel } from './UploadPanel'
import type { JudgePolicy, UploadRejection } from '../types'

const POLICY: JudgePolicy = {
  accepted_formats: ['txt', 'pdf', 'docx', 'xlsx'],
  max_file_bytes: 5_000_000,
  data_policy: 'Synthetic data only.',
  confirmation_required: true
}

function file(name: string, size = 10, type = 'text/plain') {
  return new File([new ArrayBuffer(size)], name, { type })
}

function slotInput(label: string) {
  const zone = screen.getByRole('button', { name: label })
  return zone.closest('.drop-zone')!.querySelector('input[type="file"]') as HTMLInputElement
}

function chooseFile(label: string, chosenFile: File) {
  fireEvent.change(slotInput(label), { target: { files: [chosenFile] } })
}

function confirm(user: ReturnType<typeof userEvent.setup>) {
  return user.click(
    screen.getByRole('checkbox', { name: 'These documents are synthetic (no real shipping data)' })
  )
}

describe('UploadPanel', () => {
  it('names accepted formats and the size ceiling for both slots before any upload', () => {
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    expect(screen.getAllByText(/Accepts TXT, PDF, DOCX, XLSX up to 5 MB/)).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Shipping Instruction' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draft Bill of Lading' })).toBeInTheDocument()
  })

  it('rejects a .png inline with the file name and never calls window.alert', () => {
    const alertSpy = vi.spyOn(window, 'alert')
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    chooseFile('Shipping Instruction', file('scan.png', 10, 'image/png'))
    expect(screen.getByText(/scan\.png is not an accepted format/)).toBeInTheDocument()
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('rejects an oversize file inline', () => {
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    chooseFile('Draft Bill of Lading', file('huge.pdf', 6_000_000))
    expect(screen.getByText(/huge\.pdf exceeds the 5 MB limit/)).toBeInTheDocument()
  })

  it('shows the chosen file name and size with a Remove ghost button', async () => {
    const user = userEvent.setup()
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    chooseFile('Shipping Instruction', file('si.txt', 2_000))
    expect(screen.getByText('si.txt')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()

    const removeButton = screen.getByRole('button', { name: 'Remove the Shipping Instruction file' })
    expect(removeButton).toHaveClass('button--ghost')
    await user.click(removeButton)

    expect(screen.queryByText('si.txt')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shipping Instruction' })).toBeInTheDocument()
  })

  it('keeps the submit button disabled until both files are chosen and confirmed', async () => {
    const user = userEvent.setup()
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Check documents' })
    expect(submit).toBeDisabled()

    chooseFile('Shipping Instruction', file('si.txt'))
    chooseFile('Draft Bill of Lading', file('bl.txt'))
    expect(submit).toBeDisabled()

    await confirm(user)
    expect(submit).toBeEnabled()
  })

  it('keeps the submit button disabled while busy even when otherwise ready', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />
    )
    chooseFile('Shipping Instruction', file('si.txt'))
    chooseFile('Draft Bill of Lading', file('bl.txt'))
    await confirm(user)

    rerender(<UploadPanel policy={POLICY} busy={true} serverRejections={[]} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Check documents' })).toBeDisabled()
  })

  it('submits both accepted files once ready and confirmed', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={onSubmit} />)
    const si = file('si.txt')
    const draftBl = file('bl.txt')
    chooseFile('Shipping Instruction', si)
    chooseFile('Draft Bill of Lading', draftBl)
    await confirm(user)

    await user.click(screen.getByRole('button', { name: 'Check documents' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ si, draftBl })
  })

  it('renders server rejection text under the matching slot only', () => {
    const serverRejections: UploadRejection[] = [{ slot: 'si_file', reason: 'unsupported_format' }]
    render(
      <UploadPanel policy={POLICY} busy={false} serverRejections={serverRejections} onSubmit={vi.fn()} />
    )
    const siSlot = screen.getByText('Shipping Instruction').closest('.upload-panel-slot') as HTMLElement
    const blSlot = screen.getByText('Draft Bill of Lading').closest('.upload-panel-slot') as HTMLElement

    expect(within(siSlot).getByRole('alert')).toHaveTextContent(
      'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.'
    )
    expect(within(siSlot).getByRole('alert')).not.toHaveAttribute('aria-live')
    expect(within(blSlot).queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['missing', 'Add this document before checking.'],
    ['empty', 'This file is empty.'],
    ['too_large', 'This file is larger than the 5 MB limit.'],
    ['unsupported_format', 'This file type is not accepted. Use TXT, PDF, DOCX, or XLSX.']
  ] as const)('translates the %s rejection code into a plain-language sentence', (reason, sentence) => {
    const serverRejections: UploadRejection[] = [{ slot: 'si_file', reason }]
    render(
      <UploadPanel policy={POLICY} busy={false} serverRejections={serverRejections} onSubmit={vi.fn()} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(sentence)
  })

  it('renders a humanized fallback sentence for an unrecognized rejection code', () => {
    const serverRejections: UploadRejection[] = [
      { slot: 'draft_bl_file', reason: 'checksum_mismatch' }
    ]
    render(
      <UploadPanel policy={POLICY} busy={false} serverRejections={serverRejections} onSubmit={vi.fn()} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something is wrong with this file: Checksum mismatch.'
    )
  })

  it('gives the two Remove buttons distinct accessible names', () => {
    render(<UploadPanel policy={POLICY} busy={false} serverRejections={[]} onSubmit={vi.fn()} />)
    chooseFile('Shipping Instruction', file('si.txt'))
    chooseFile('Draft Bill of Lading', file('bl.txt'))

    expect(
      screen.getByRole('button', { name: 'Remove the Shipping Instruction file' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove the Draft Bill of Lading file' })
    ).toBeInTheDocument()
  })
})
