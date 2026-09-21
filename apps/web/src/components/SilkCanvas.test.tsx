import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SilkCanvas } from './SilkCanvas'

type Resize = (entries: Array<{ contentRect: { width: number; height: number } }>) => void

let resize: Resize | null = null
const putImageData = vi.fn()

class FakeResizeObserver {
  constructor(callback: Resize) {
    resize = callback
  }
  observe() {}
  disconnect() {}
}

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }) as MediaQueryList
  )
}

beforeEach(() => {
  resize = null
  putImageData.mockClear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountSized() {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  const view = render(<SilkCanvas />)
  const canvas = view.container.querySelector('canvas') as HTMLCanvasElement
  canvas.style.setProperty('--silk-tint', '#4a6680')
  resize?.([{ contentRect: { width: 400, height: 800 } }])
  return canvas
}

describe('SilkCanvas', () => {
  it('is decorative', () => {
    const view = render(<SilkCanvas />)
    expect(view.container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })

  it('stays idle where the browser cannot observe its size', () => {
    render(<SilkCanvas />)
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled()
  })

  it('paints at a quarter of its size', () => {
    reduceMotion(true)
    const canvas = mountSized()
    expect(canvas.width).toBe(100)
    expect(canvas.height).toBe(200)
  })

  it('paints one still frame under reduced motion', () => {
    reduceMotion(true)
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    mountSized()
    expect(putImageData).toHaveBeenCalledTimes(1)
    expect(raf).not.toHaveBeenCalled()
  })

  it('animates while it has a size', () => {
    reduceMotion(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    mountSized()
    expect(raf).toHaveBeenCalled()
  })

  it('fills its container whatever the caller styles', () => {
    const view = render(<SilkCanvas />)
    const canvas = view.container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.style.display).toBe('block')
    expect(canvas.style.width).toBe('100%')
    expect(canvas.style.height).toBe('100%')
  })

  it('paints the admincn sheen in the tint', () => {
    reduceMotion(true)
    mountSized()
    const image = putImageData.mock.calls[0][0] as ImageData
    // At the origin with no time elapsed the sheen is 0.6 + 0.4 * sin(5): #4a6680 scaled by 0.2164.
    expect([...image.data.slice(0, 4)]).toEqual([16, 22, 28, 255])
  })
})
