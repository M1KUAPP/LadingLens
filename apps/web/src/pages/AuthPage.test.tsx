import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'

function storedValues(): string {
  const values: string[] = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    values.push(sessionStorage.getItem(sessionStorage.key(i)!) ?? '')
  }
  return values.join('\n')
}

describe('auth page', () => {
  it('renders both panes with the demo notice and a single guest action', () => {
    renderAt('/auth', <App />)
    expect(
      screen.getByRole('region', { name: 'About this demo' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sign in' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByText(/synthetic data only/i)).toBeInTheDocument()
    expect(screen.getByText(/not submitted or stored/i)).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Sign in as Guest')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(
      screen.queryByRole('navigation', { name: 'Product views' })
    ).not.toBeInTheDocument()
  })

  it('keeps the credential fields presentational', () => {
    renderAt('/auth', <App />)
    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    expect(email.closest('form')).toBeNull()
    expect(password.closest('form')).toBeNull()
    expect(email).not.toHaveAttribute('name')
    expect(password).not.toHaveAttribute('name')
    expect(email).toHaveAttribute('autocomplete', 'off')
    expect(password).toHaveAttribute('autocomplete', 'off')
  })

  it('enters the inbox as a guest without storing typed credentials', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderAt('/auth', <App />)
    await user.type(screen.getByLabelText('Email'), 'operator@averis.example')
    await user.type(screen.getByLabelText('Password'), 'tr1al-passw0rd')
    await user.click(screen.getByRole('button', { name: 'Sign in as Guest' }))
    expect(
      screen.getByRole('heading', { name: 'Inbox' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Product views' })
    ).toBeInTheDocument()
    expect(readGuestSession()).not.toBeNull()
    const stored = storedValues()
    expect(stored).not.toContain('operator@averis.example')
    expect(stored).not.toContain('tr1al-passw0rd')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
