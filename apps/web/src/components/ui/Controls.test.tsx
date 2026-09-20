import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, Checkbox, Field } from './Controls'

describe('Button', () => {
  it('activates on click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Sign off</Button>)
    await user.click(screen.getByRole('button', { name: 'Sign off' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on Enter and Space from the keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <Button onClick={onClick}>Sign off</Button>
        <Button>Route to owner</Button>
      </>
    )
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sign off' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('renders every variant under its accessible name', () => {
    render(
      <>
        <Button variant="primary">Commit sign-off</Button>
        <Button variant="secondary">Route to owner</Button>
        <Button variant="ghost">Withdraw</Button>
      </>
    )
    expect(screen.getByRole('button', { name: 'Commit sign-off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Route to owner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument()
  })

  it('cannot be activated while disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <Button disabled onClick={onClick}>
          Sign off
        </Button>
        <Button>Route to owner</Button>
      </>
    )
    const disabled = screen.getByRole('button', { name: 'Sign off' })
    expect(disabled).toBeDisabled()
    await user.click(disabled)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Route to owner' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Field', () => {
  it('names the input with its label and accepts typed text', async () => {
    const user = userEvent.setup()
    render(<Field label="Shipper" />)
    const input = screen.getByLabelText('Shipper')
    await user.type(input, 'Acme Exports')
    expect(input).toHaveValue('Acme Exports')
  })

  it('renders a searchbox for search fields', async () => {
    const user = userEvent.setup()
    render(<Field label="Search mail" type="search" />)
    const input = screen.getByRole('searchbox', { name: 'Search mail' })
    await user.type(input, 'MSC')
    expect(input).toHaveValue('MSC')
  })

  it('masks password fields', () => {
    render(<Field label="Passphrase" type="password" />)
    expect(screen.getByLabelText('Passphrase')).toHaveAttribute('type', 'password')
  })

  it('stacks helper then inline error and wires both as descriptions', () => {
    render(<Field label="Gross weight" helper="Kilograms only" error="Enter a weight" />)
    const input = screen.getByLabelText('Gross weight')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/Kilograms only/)
    expect(input).toHaveAccessibleDescription(/Enter a weight/)
    const helper = screen.getByText('Kilograms only')
    const error = screen.getByText('Enter a weight')
    expect(helper.compareDocumentPosition(error)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('presents a select field as a custom trigger with no native control', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<Field label="Port of loading" type="select" value="SGSIN" onOpen={onOpen} />)
    const trigger = screen.getByRole('button', { name: 'Port of loading' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveTextContent('SGSIN')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(trigger)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('presents a date field as a custom trigger that opens from the keyboard', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<Field label="Document date" type="date" placeholder="Pick a date" onOpen={onOpen} />)
    const trigger = screen.getByRole('button', { name: 'Document date' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveTextContent('Pick a date')
    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('disables the control without removing the label', () => {
    render(<Field label="Consignee" disabled />)
    expect(screen.getByLabelText('Consignee')).toBeDisabled()
  })
})

describe('Checkbox', () => {
  it('toggles by click and reports the next state', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Select page" onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox', { name: 'Select page' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    await user.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(box).toHaveAttribute('aria-checked', 'true')
    await user.click(box)
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
    expect(box).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles with Space from the keyboard', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Select page" onCheckedChange={onCheckedChange} />)
    await user.tab()
    const box = screen.getByRole('checkbox', { name: 'Select page' })
    expect(box).toHaveFocus()
    await user.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('exposes indeterminate and resolves to checked on activation', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Pages" indeterminate onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox', { name: 'Pages' })
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    await user.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('respects a controlled checked value', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Row" checked={false} onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox', { name: 'Row' })
    await user.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(box).toHaveAttribute('aria-checked', 'false')
  })

  it('cannot be toggled while disabled', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(
      <>
        <Checkbox label="Locked" disabled onCheckedChange={onCheckedChange} />
        <Checkbox label="Free" />
      </>
    )
    const locked = screen.getByRole('checkbox', { name: 'Locked' })
    expect(locked).toBeDisabled()
    await user.click(locked)
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Free' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
