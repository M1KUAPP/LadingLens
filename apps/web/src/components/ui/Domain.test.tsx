import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  DropZone,
  FieldRow,
  ProvenanceAnchor,
  Scrollbar,
  StatusPill
} from './Domain'

describe('StatusPill', () => {
  it('carries a held status with text and the pause glyph', () => {
    render(<StatusPill status="held">Needs review</StatusPill>)
    expect(screen.getByText('Needs review')).toHaveAttribute('data-status', 'held')
    expect(screen.getByLabelText('Held')).toBeInTheDocument()
  })

  it('pairs every status with text, data-status, and a distinct named glyph', () => {
    render(
      <>
        <StatusPill status="match">Aligned</StatusPill>
        <StatusPill status="mismatch">Weight differs</StatusPill>
        <StatusPill status="held">Needs review</StatusPill>
        <StatusPill status="neutral">Not compared</StatusPill>
      </>
    )
    expect(screen.getByText('Aligned')).toHaveAttribute('data-status', 'match')
    expect(screen.getByLabelText('Match')).toBeInTheDocument()
    expect(screen.getByText('Weight differs')).toHaveAttribute('data-status', 'mismatch')
    expect(screen.getByLabelText('Mismatch')).toBeInTheDocument()
    expect(screen.getByText('Needs review')).toHaveAttribute('data-status', 'held')
    expect(screen.getByLabelText('Held')).toBeInTheDocument()
    expect(screen.getByText('Not compared')).toHaveAttribute('data-status', 'neutral')
    expect(screen.getByLabelText('Not compared')).toBeInTheDocument()
  })
})

describe('FieldRow', () => {
  it('stacks field values without losing source labels', () => {
    render(<FieldRow label="Gross weight" left="1200" right="1250" status="mismatch" />)
    expect(screen.getByText('Shipping instruction')).toBeInTheDocument()
    expect(screen.getByText('Draft bill of lading')).toBeInTheDocument()
  })

  it('renders the named field, both values in data roles, and the verdict', () => {
    render(<FieldRow label="Gross weight" left="1200" right="1250" status="mismatch" />)
    expect(screen.getByText('Gross weight')).toBeInTheDocument()
    expect(screen.getByText('1200')).toHaveClass('type-data-md')
    expect(screen.getByText('1250')).toHaveClass('type-data-md')
    expect(screen.getByLabelText('Mismatch')).toBeInTheDocument()
  })

  it('marks the row with the status so the rail can restate it', () => {
    render(<FieldRow label="Port of loading" left="SGSIN" right="SGSIN" status="match" />)
    const row = screen.getByText('Port of loading').closest('[data-status]')
    expect(row).toHaveAttribute('data-status', 'match')
  })
})

describe('Scrollbar', () => {
  it('exposes a labelled scroll region that keeps its content reachable', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Before</button>
        <Scrollbar label="Draft bill of lading">
          <p>Clause one</p>
        </Scrollbar>
      </>
    )
    const region = screen.getByRole('region', { name: 'Draft bill of lading' })
    expect(region).toHaveTextContent('Clause one')
    await user.tab()
    await user.tab()
    expect(region).toHaveFocus()
  })

  it('draws a custom track and thumb instead of relying on OS chrome', () => {
    const { container } = render(
      <Scrollbar label="Shipping instruction">
        <p>Clause one</p>
      </Scrollbar>
    )
    const track = container.querySelector('.scrollbar-track')
    expect(track).toBeInTheDocument()
    expect(track).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.scrollbar-thumb')).toBeInTheDocument()
  })
})

describe('DropZone', () => {
  it('names its accepted formats and byte ceiling up front', () => {
    render(
      <DropZone label="Attach source documents" formats={['pdf', 'xlsx']} maxBytes={25_000_000} />
    )
    expect(screen.getByRole('button', { name: 'Attach source documents' })).toBeInTheDocument()
    expect(screen.getByText(/PDF/)).toBeInTheDocument()
    expect(screen.getByText(/XLSX/)).toBeInTheDocument()
    expect(screen.getByText(/25 MB/)).toBeInTheDocument()
  })

  it('opens file access from the keyboard through the hidden input', async () => {
    const user = userEvent.setup()
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {})
    render(<DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} />)
    await user.tab()
    const zone = screen.getByRole('button', { name: 'Attach source documents' })
    expect(zone).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps the file input out of the tab order and out of the accessible tree', () => {
    const { container } = render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} />
    )
    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('aria-hidden', 'true')
    expect(input).toHaveAttribute('tabindex', '-1')
  })

  it('hands accepted files to onFiles', () => {
    const onFiles = vi.fn()
    const { container } = render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} onFiles={onFiles} />
    )
    const input = container.querySelector('input[type="file"]')!
    const file = new File(['%PDF-1.4'], 'manifest.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(['manifest.pdf'])
  })

  it('accepts files dropped on the surface', () => {
    const onFiles = vi.fn()
    render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} onFiles={onFiles} />
    )
    const zone = screen.getByRole('button', { name: 'Attach source documents' })
    const file = new File(['%PDF-1.4'], 'manifest.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(['manifest.pdf'])
  })

  it('reports rejected files inline instead of a browser alert', () => {
    const alertSpy = vi.spyOn(window, 'alert')
    const onFiles = vi.fn()
    const { container } = render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={10} onFiles={onFiles} />
    )
    const input = container.querySelector('input[type="file"]')!
    fireEvent.change(input, {
      target: {
        files: [
          new File(['x'.repeat(100)], 'oversize.pdf'),
          new File(['a'], 'notes.txt')
        ]
      }
    })
    expect(screen.getByText(/oversize\.pdf exceeds the/)).toBeInTheDocument()
    expect(screen.getByText(/notes\.txt is not an accepted format/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live')
    expect(alertSpy).not.toHaveBeenCalled()
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('disables the trigger and hidden input, and ignores dropped files, when disabled', () => {
    const onFiles = vi.fn()
    const { container } = render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} disabled onFiles={onFiles} />
    )
    const zone = screen.getByRole('button', { name: 'Attach source documents' })
    expect(zone).toBeDisabled()
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeDisabled()

    const file = new File(['%PDF-1.4'], 'manifest.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('defaults to accepting multiple files', () => {
    const onFiles = vi.fn()
    const { container } = render(
      <DropZone label="Attach source documents" formats={['pdf']} maxBytes={25_000_000} onFiles={onFiles} />
    )
    const input = container.querySelector('input[type="file"]')!
    fireEvent.change(input, {
      target: {
        files: [
          new File(['%PDF-1.4'], 'first.pdf'),
          new File(['%PDF-1.4'], 'second.pdf')
        ]
      }
    })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(['first.pdf', 'second.pdf'])
  })

  it('keeps only one file in single-file mode and rejects the rest inline', () => {
    const onFiles = vi.fn()
    const { container } = render(
      <DropZone
        label="Attach source documents"
        formats={['pdf']}
        maxBytes={25_000_000}
        multiple={false}
        onFiles={onFiles}
      />
    )
    const input = container.querySelector('input[type="file"]')!
    fireEvent.change(input, {
      target: {
        files: [
          new File(['%PDF-1.4'], 'first.pdf'),
          new File(['%PDF-1.4'], 'second.pdf')
        ]
      }
    })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(['first.pdf'])
    expect(screen.getByRole('alert')).toHaveTextContent('second.pdf')
  })
})

describe('ProvenanceAnchor', () => {
  it('jumps to an exact source location on activation', async () => {
    const user = userEvent.setup()
    const onJump = vi.fn()
    render(
      <ProvenanceAnchor kind="exact" onJump={onJump}>
        SGSIN
      </ProvenanceAnchor>
    )
    await user.click(screen.getByRole('button', { name: 'SGSIN' }))
    expect(onJump).toHaveBeenCalledTimes(1)
  })

  it('names an approximate anchor visibly and stays clickable', async () => {
    const user = userEvent.setup()
    const onJump = vi.fn()
    render(
      <ProvenanceAnchor kind="approximate" onJump={onJump}>
        1200
      </ProvenanceAnchor>
    )
    expect(screen.getByText('Approximate')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '1200' }))
    expect(onJump).toHaveBeenCalledTimes(1)
  })

  it('renders no interactive anchor when the source is unreadable', () => {
    render(<ProvenanceAnchor kind="none">Unreadable</ProvenanceAnchor>)
    expect(screen.getByText('Unreadable')).toBeInTheDocument()
    expect(screen.getByText('No source anchor')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('drop zone size ceiling', () => {
  it('rounds a binary byte ceiling to a readable decimal MB', () => {
    render(<DropZone label="SI" formats={['txt']} maxBytes={5_242_880} onFiles={() => {}} />)
    expect(screen.getByText(/up to 5\.2 MB/)).toBeInTheDocument()
    expect(screen.queryByText(/5\.24288/)).not.toBeInTheDocument()
  })

  it('keeps a whole number whole', () => {
    render(<DropZone label="SI" formats={['txt']} maxBytes={25_000_000} onFiles={() => {}} />)
    expect(screen.getByText(/up to 25 MB/)).toBeInTheDocument()
  })
})
