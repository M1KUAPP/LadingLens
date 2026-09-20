import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'all', label: 'All statuses' },
  { value: 'ok', label: 'OK' },
  { value: 'held', label: 'Needs review' }
]

describe('Select', () => {
  it('opens the in-house menu from the field trigger', async () => {
    const user = userEvent.setup()
    render(
      <Select label="Status" value="all" options={options} onChange={() => {}} />
    )
    await user.click(
      screen.getByRole('combobox', { name: 'Status All statuses' })
    )
    expect(screen.getByRole('listbox', { name: 'Status' })).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Needs review' })
    ).toBeInTheDocument()
  })

  it('commits the chosen option through onChange and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select label="Status" value="all" options={options} onChange={onChange} />
    )
    await user.click(
      screen.getByRole('combobox', { name: 'Status All statuses' })
    )
    await user.click(screen.getByRole('option', { name: 'Needs review' }))
    expect(onChange).toHaveBeenCalledWith('held')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <Select label="Status" value="all" options={options} onChange={() => {}} />
    )
    const trigger = screen.getByRole('combobox', {
      name: 'Status All statuses'
    })
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('references the actual role="listbox" element with aria-controls', async () => {
    const user = userEvent.setup()
    render(
      <Select label="Status" value="all" options={options} onChange={() => {}} />
    )
    const trigger = screen.getByRole('combobox', { name: 'Status All statuses' })
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    await user.click(trigger)
    const listbox = screen.getByRole('listbox', { name: 'Status' })
    expect(listbox.id).toBe(controlsId)
  })

  it('closes on Tab when active in the composite', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Select label="Status" value="all" options={options} onChange={() => {}} />
        <button type="button">Next field</button>
      </div>
    )
    const trigger = screen.getByRole('combobox', { name: 'Status All statuses' })
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes when focus leaves the composite', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Select label="Status" value="all" options={options} onChange={() => {}} />
        <button type="button">Outside element</button>
      </div>
    )
    const trigger = screen.getByRole('combobox', { name: 'Status All statuses' })
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    const outside = screen.getByRole('button', { name: 'Outside element' })
    outside.focus()
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })
})
