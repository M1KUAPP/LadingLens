import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparedControlGraph } from './fixtures'

const mocks = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>
    destroy: ReturnType<typeof vi.fn>
    style: ReturnType<typeof vi.fn>
  }>,
  throwOnInit: false
}))

vi.mock('cytoscape', () => ({
  default: (options: Record<string, unknown>) => {
    if (mocks.throwOnInit) throw new Error('canvas renderer unavailable')
    const instance = { options, destroy: vi.fn(), style: vi.fn() }
    mocks.instances.push(instance)
    return instance
  }
}))

import CytoscapeCanvas from './CytoscapeCanvas'

const TOKEN_MAP: Record<string, string> = {
  '--surface-raised': 'rgb(10, 10, 10)',
  '--border-default': 'rgb(11, 11, 11)',
  '--text-primary': 'rgb(12, 12, 12)',
  '--state-match-solid': 'rgb(20, 20, 20)',
  '--state-mismatch-solid': 'rgb(21, 21, 21)',
  '--state-held-solid': 'rgb(22, 22, 22)',
  '--state-neutral-text': 'rgb(23, 23, 23)',
  '--font-data': 'Test Mono'
}

function stubTokens() {
  return vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        getPropertyValue: (name: string) => TOKEN_MAP[name] ?? ''
      }) as CSSStyleDeclaration
  )
}

beforeEach(() => {
  mocks.instances.length = 0
  mocks.throwOnInit = false
})

describe('CytoscapeCanvas', () => {
  it('exposes an accessible label and description', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const canvas = screen.getByRole('img', { name: /control graph/i })
    expect(canvas).toBeInTheDocument()
    expect(canvas.getAttribute('aria-describedby')).toBeTruthy()
    const description = document.getElementById(canvas.getAttribute('aria-describedby')!)
    expect(description?.textContent).toMatch(/nodes/i)
    expect(description?.textContent).toMatch(/relationships|edges/i)
  })

  it('passes every node and edge to the renderer', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    expect(mocks.instances).toHaveLength(1)
    const elements = mocks.instances[0].options.elements as unknown[]
    expect(elements).toHaveLength(preparedControlGraph.nodes.length + preparedControlGraph.edges.length)
  })

  it('configures a deterministic, non-animated layout', () => {
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const layout = mocks.instances[0].options.layout as Record<string, unknown>
    expect(layout.randomize).toBe(false)
    expect(layout.animate).toBe(false)
  })

  it('derives node styling from design tokens, never hardcoded hex', () => {
    stubTokens()
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const style = JSON.stringify(mocks.instances[0].options.style)
    expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(style).toContain('rgb(21, 21, 21)')
    expect(style).toContain('rgb(22, 22, 22)')
  })

  it('re-reads tokens when the theme changes', async () => {
    stubTokens()
    render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const cy = mocks.instances[0]
    expect(cy.style).not.toHaveBeenCalled()
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() => expect(cy.style).toHaveBeenCalled())
  })

  it('destroys the renderer on unmount', () => {
    const { unmount } = render(<CytoscapeCanvas graph={preparedControlGraph} />)
    const cy = mocks.instances[0]
    unmount()
    expect(cy.destroy).toHaveBeenCalledTimes(1)
  })

  it('reports when the renderer cannot initialise', () => {
    mocks.throwOnInit = true
    const onUnavailable = vi.fn()
    render(<CytoscapeCanvas graph={preparedControlGraph} onUnavailable={onUnavailable} />)
    expect(onUnavailable).toHaveBeenCalledWith(expect.any(String))
  })
})
