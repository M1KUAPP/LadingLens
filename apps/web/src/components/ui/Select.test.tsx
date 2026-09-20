import { render, screen } from '@testing-library/react'
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
})
