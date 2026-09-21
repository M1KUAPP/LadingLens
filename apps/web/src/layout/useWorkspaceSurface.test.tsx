import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceSurface } from './useWorkspaceSurface'

function Probe() {
  useWorkspaceSurface()
  return null
}

describe('useWorkspaceSurface', () => {
  it('marks the document as the workspace surface while mounted', () => {
    const { unmount } = render(<Probe />)
    expect(document.documentElement.dataset.surface).toBe('workspace')
    unmount()
    expect(document.documentElement.dataset.surface).toBeUndefined()
  })
})
