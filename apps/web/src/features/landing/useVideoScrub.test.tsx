import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVideoScrub } from './useVideoScrub'

let frames: FrameRequestCallback[] = []
let seekTo = 0

function runFrames(now = performance.now()) {
  act(() => {
    const due = frames
    frames = []
    for (const callback of due) callback(now)
  })
}

function Harness() {
  const { trackRef, videoRef, canvasRef, progress, canvasLive } = useVideoScrub('/film.mp4')
  return (
    <div ref={trackRef}>
      <video ref={videoRef} data-testid="film" />
      <canvas ref={canvasRef} data-live={canvasLive || undefined} />
      <output data-testid="progress">{progress}</output>
    </div>
  )
}

// A 10 s film whose seeks land at once, on a 4768px track in a 768px
// viewport: the span is 4000px, so scrollY 2000 is p = 0.5.
function mountAt(scrollY: number, reduceMotion: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduceMotion && query.includes('reduce'), media: query }) as MediaQueryList
  )
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  const view = render(<Harness />)
  const video = screen.getByTestId('film') as HTMLVideoElement
  Object.defineProperty(video, 'duration', { configurable: true, value: 10 })
  Object.defineProperty(video, 'seeking', { configurable: true, value: false })
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => seekTo,
    set: (value: number) => {
      seekTo = value
    }
  })
  video.dispatchEvent(new Event('loadedmetadata'))
  return { view, video }
}

beforeEach(() => {
  frames = []
  seekTo = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(4768)
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
})

describe('useVideoScrub', () => {
  it('publishes the scroll progress', () => {
    mountAt(2000, false)
    runFrames()
    expect(screen.getByTestId('progress')).toHaveTextContent('0.5')
  })

  it('seeks straight to the scroll position under reduced motion', () => {
    const { video } = mountAt(2000, true)
    runFrames()
    expect(video.currentTime).toBe(5)
  })

  it('eases the playhead toward the scroll position', () => {
    const { video } = mountAt(2000, false)
    runFrames(performance.now() + 100)
    expect(video.currentTime).toBeGreaterThan(0)
    expect(video.currentTime).toBeLessThan(5)
    expect(video.currentTime).toBeCloseTo(5 * (1 - Math.exp(-0.8)), 1)
  })

  it('never fetches the film where WebCodecs is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    mountAt(0, false)
    await act(async () => {})
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.querySelector('canvas')).not.toHaveAttribute('data-live')
  })

  it('stops its loop on unmount', () => {
    const { view } = mountAt(0, false)
    view.unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
