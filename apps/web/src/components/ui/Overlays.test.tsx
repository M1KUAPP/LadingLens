import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, DatePicker, Menu, MenuItem, Tooltip } from './Overlays'

function MenuHarness({
  onSelect = vi.fn(),
  onClose = vi.fn()
}: {
  onSelect?: (value: string) => void
  onClose?: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const select = (value: string) => {
    onSelect(value)
    setOpen(false)
    triggerRef.current?.focus()
  }
  return (
    <div>
      <button type="button" ref={triggerRef} onClick={() => setOpen(true)}>
        Route
      </button>
      {open && (
        <Menu label="Route" triggerRef={triggerRef} onClose={() => { onClose(); setOpen(false) }}>
          <MenuItem value="inbox" onSelect={select}>Inbox</MenuItem>
          <MenuItem value="review" selected onSelect={select}>Review queue</MenuItem>
          <MenuItem value="archive" disabled onSelect={select}>Archive</MenuItem>
          <MenuItem value="graph" onSelect={select}>Control graph</MenuItem>
        </Menu>
      )}
    </div>
  )
}

describe('Menu', () => {
  it('renders a custom listbox of options, not a native select', async () => {
    const user = userEvent.setup()
    const { container } = render(<MenuHarness />)
    await user.click(screen.getByRole('button', { name: 'Route' }))
    expect(screen.getByRole('listbox', { name: 'Route' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(container.querySelector('select')).toBeNull()
  })

  it('focuses the selected option on open and marks it with a check', async () => {
    const user = userEvent.setup()
    render(<MenuHarness />)
    await user.click(screen.getByRole('button', { name: 'Route' }))
    const review = screen.getByRole('option', { name: 'Review queue' })
    expect(review).toHaveFocus()
    expect(review).toHaveAttribute('aria-selected', 'true')
    expect(review.querySelector('svg')).not.toBeNull()
  })

  it('moves focus with ArrowUp and ArrowDown, skipping disabled options', async () => {
    const user = userEvent.setup()
    render(<MenuHarness />)
    await user.click(screen.getByRole('button', { name: 'Route' }))
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Control graph' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Inbox' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: 'Control graph' })).toHaveFocus()
  })

  it('commits the focused option with Enter', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<MenuHarness onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Route' }))
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('graph')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Route' })).toHaveFocus()
  })

  it('commits on pointer selection and ignores a disabled option', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<MenuHarness onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Route' }))
    await user.click(screen.getByRole('option', { name: 'Archive' }))
    expect(onSelect).not.toHaveBeenCalled()
    await user.click(screen.getByRole('option', { name: 'Inbox' }))
    expect(onSelect).toHaveBeenCalledWith('inbox')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<MenuHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Route' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

function DatePickerHarness({
  value = '2026-09-15',
  onSelect = vi.fn(),
  onClose = vi.fn()
}: {
  value?: string
  onSelect?: (iso: string) => void
  onClose?: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" ref={triggerRef} onClick={() => setOpen(true)}>
        Sailing date
      </button>
      {open && (
        <DatePicker
          value={value}
          label="Sailing date"
          triggerRef={triggerRef}
          onClose={() => { onClose(); setOpen(false) }}
          onSelect={(iso) => { onSelect(iso); setOpen(false); triggerRef.current?.focus() }}
        />
      )}
    </div>
  )
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Sailing date' }))
}

describe('DatePicker', () => {
  it('opens a calendar grid focused on the selected date', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)
    await openPicker(user)
    expect(screen.getByRole('grid', { name: 'Sailing date' })).toBeInTheDocument()
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15 September 2026' })).toHaveFocus()
  })

  it('moves by single days and weeks with arrow keys', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)
    await openPicker(user)
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: '16 September 2026' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: '23 September 2026' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: '22 September 2026' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: '15 September 2026' })).toHaveFocus()
  })

  it('crosses a month boundary with arrow keys', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness value="2026-09-30" />)
    await openPicker(user)
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('October 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 October 2026' })).toHaveFocus()
  })

  it('moves by month with PageUp and PageDown', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)
    await openPicker(user)
    await user.keyboard('{PageDown}')
    expect(screen.getByText('October 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15 October 2026' })).toHaveFocus()
    await user.keyboard('{PageUp}')
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15 September 2026' })).toHaveFocus()
  })

  it('moves between months with pointer controls', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)
    await openPicker(user)
    await user.click(screen.getByRole('button', { name: 'Show October 2026' }))
    expect(screen.getByText('October 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show September 2026' }))
    expect(screen.getByText('September 2026')).toBeInTheDocument()
  })

  it('clamps the day when the target month is shorter', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness value="2026-01-31" />)
    await openPicker(user)
    await user.keyboard('{PageDown}')
    expect(screen.getByText('February 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '28 February 2026' })).toHaveFocus()
  })

  it('commits the focused date with Enter', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<DatePickerHarness onSelect={onSelect} />)
    await openPicker(user)
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('2026-09-16')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sailing date' })).toHaveFocus()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DatePickerHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Sailing date' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('sets dates and figures in data type roles', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)
    await openPicker(user)
    expect(screen.getByText('September 2026')).toHaveClass('type-data-sm')
    expect(screen.getByRole('button', { name: '15 September 2026' })).toHaveClass('type-data-sm')
  })
})

describe('Tooltip', () => {
  it('opens explanatory tooltips from keyboard focus', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeVisible()
  })

  it('names the trigger and links it to the tooltip', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
    const trigger = screen.getByRole('button', { name: 'Why this is held' })
    await user.tab()
    const tip = screen.getByRole('tooltip')
    expect(trigger).toHaveAttribute('aria-describedby', tip.id)
  })

  it('opens on hover and closes when the pointer leaves', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
    const trigger = screen.getByRole('button', { name: 'Why this is held' })
    await user.hover(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Evidence was incomplete.')
    await user.unhover(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens on click or touch', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
    await user.click(screen.getByRole('button', { name: 'Why this is held' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Why this is held">Evidence was incomplete.</Tooltip>)
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('opens as a modal alert dialog with focus on the least destructive action', () => {
    render(
      <ConfirmDialog open title="Reset all demo data?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
        <p>Your uploads will be removed.</p>
      </ConfirmDialog>
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Reset all demo data?' })
    expect(dialog).toHaveAccessibleDescription('Your uploads will be removed.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('cancels on Escape and on Cancel, confirms on the primary action', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={onConfirm} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('renders nothing while closed and disables actions while busy', () => {
    const { rerender } = render(
      <ConfirmDialog open={false} title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
        <p>Body</p>
      </ConfirmDialog>
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    rerender(
      <ConfirmDialog open busy title="Reset?" confirmLabel="Resetting…" onConfirm={() => {}} onCancel={() => {}}>
        <p>Body</p>
      </ConfirmDialog>
    )
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('prevents the native cancel default so the dialog cannot close independent of React state', () => {
    render(
      <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
        <p>Body</p>
      </ConfirmDialog>
    )
    const event = new Event('cancel', { cancelable: true })
    fireEvent(screen.getByRole('alertdialog'), event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not double-invoke showModal under StrictMode and leaves no open attribute once closed', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      if (this.open) throw new DOMException('already open', 'InvalidStateError')
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.showModal = showModal
    try {
      const { unmount } = render(
        <StrictMode>
          <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={() => {}}>
            <p>Body</p>
          </ConfirmDialog>
        </StrictMode>
      )
      const dialog = screen.getByRole('alertdialog')
      expect(showModal).toHaveBeenCalledTimes(2)
      expect(dialog).toHaveAttribute('open')
      unmount()
      expect(dialog).not.toHaveAttribute('open')
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    }
  })

  it('calls onCancel when the dialog fires a native close event while still open', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    fireEvent(screen.getByRole('alertdialog'), new Event('close'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('re-opens the dialog and does not call onCancel when a native close fires while busy', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open busy title="Reset?" confirmLabel="Resetting…" onConfirm={() => {}} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    const dialog = screen.getByRole('alertdialog')
    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(dialog).toHaveAttribute('open')
    expect(onCancel).not.toHaveBeenCalled()
    expect(dialog).toHaveTextContent('Body')
  })

  it('does not call onCancel for a close event left over from its own effect cleanup closing the dialog', () => {
    const onCancel = vi.fn()
    const { rerender } = render(
      <ConfirmDialog open title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    const dialog = screen.getByRole('alertdialog')
    rerender(
      <ConfirmDialog open={false} title="Reset?" confirmLabel="Reset all" onConfirm={() => {}} onCancel={onCancel}>
        <p>Body</p>
      </ConfirmDialog>
    )
    fireEvent(dialog, new Event('close'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})
