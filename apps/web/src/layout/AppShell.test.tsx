import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { createGuestSession } from '../lib/guest-session'
import { renderAt } from '../test/render'

function shell() {
  return document.querySelector('.app-shell')
}

describe('workspace sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    createGuestSession()
  })

  it('opens expanded and collapses from the header, keeping the choice', () => {
    renderAt('/inbox', <App />)
    expect(shell()).toHaveAttribute('data-sidebar', 'expanded')
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'app-sidebar')

    fireEvent.click(toggle)

    expect(shell()).toHaveAttribute('data-sidebar', 'collapsed')
    expect(localStorage.getItem('ladinglens-sidebar')).toBe('collapsed')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    // Collapsed links keep their names for assistive technology.
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
  })

  it('restores a collapsed sidebar on the next visit', () => {
    localStorage.setItem('ladinglens-sidebar', 'collapsed')
    renderAt('/review', <App />)
    expect(shell()).toHaveAttribute('data-sidebar', 'collapsed')
  })

  it('toggles with Ctrl+B and Cmd+B', () => {
    renderAt('/inbox', <App />)
    fireEvent.keyDown(document, { key: 'b', ctrlKey: true })
    expect(shell()).toHaveAttribute('data-sidebar', 'collapsed')
    fireEvent.keyDown(document, { key: 'b', metaKey: true })
    expect(shell()).toHaveAttribute('data-sidebar', 'expanded')
    fireEvent.keyDown(document, { key: 'b', ctrlKey: true, shiftKey: true })
    expect(shell()).toHaveAttribute('data-sidebar', 'expanded')
  })

  it('groups the views under intake, review and insight', () => {
    renderAt('/inbox', <App />)
    expect(screen.getByRole('list', { name: 'Intake' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Insight' })).toBeInTheDocument()
  })
})
