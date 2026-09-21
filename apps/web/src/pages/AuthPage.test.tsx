import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { readGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'
import authCss from './auth-page.css?raw'

function storedValues(): string {
  const values: string[] = []
  for (const storage of [sessionStorage, localStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      values.push(storage.getItem(storage.key(i)!) ?? '')
    }
  }
  return values.join('\n')
}

describe('auth page', () => {
  it('sets the sign-in column beside the about panel', () => {
    renderAt('/auth', <App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Guest access is the only entry for this demo.')).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'About this demo' })
    expect(within(panel).getByText('Every shipping document, checked against its evidence.')).toBeInTheDocument()
    expect(within(panel).getByText('Match, mismatch, held.')).toBeInTheDocument()
    expect(within(panel).getByText('Short of evidence, a named person decides.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Product views' })).not.toBeInTheDocument()
  })

  it('offers one action and one plain link', () => {
    renderAt('/auth', <App />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Sign in as Guest')
    expect(screen.getByRole('link', { name: 'LadingLens home' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: 'Open the live demo' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('says that nothing typed is kept', () => {
    renderAt('/auth', <App />)
    expect(screen.getByText('Synthetic data only. Nothing you type is stored or sent.')).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Product views' })).toBeInTheDocument()
    expect(readGuestSession()).not.toBeNull()
    const stored = storedValues()
    expect(stored).not.toContain('operator@averis.example')
    expect(stored).not.toContain('tr1al-passw0rd')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the silk and the verdict row decorative', () => {
    renderAt('/auth', <App />)
    const panel = screen.getByRole('region', { name: 'About this demo' })
    expect(panel.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(panel.querySelector('.auth-verdicts')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('auth stylesheet contracts', () => {
  it('derives colour from tokens only', () => {
    expect(authCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('drops the panel below 1024px', () => {
    expect(authCss).toMatch(/@media \(max-width: 1023\.98px\)[^@]*\.auth-panel\s*\{\s*display:\s*none/)
  })

  it('rounds the silk card and the notched card on the xl radius', () => {
    expect(authCss).toMatch(/\.auth-card\s*\{[^}]*border-radius:\s*var\(--radius-xl\)/)
    expect(authCss).toMatch(/\.auth-notch\s*\{[^}]*border-radius:\s*var\(--radius-xl\)/)
  })
})
