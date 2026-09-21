import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BankFrame, BitmapCache } from './frame-bank'
import { useVideoScrub } from './useVideoScrub'

// The frame bank is loaded with a dynamic import; these stand-ins let the
// tests see whether the hook ever asks for it, and drive it when it does.
const bank = vi.hoisted(() => ({
  canBuildFrameBank: vi.fn<() => Promise<boolean>>(),
  loadFrameBank: vi.fn<(src: string, signal: AbortSignal) => Promise<BankFrame[]>>(),
  createBitmapCache: vi.fn<(frames: readonly BankFrame[]) => BitmapCache>()
}))
vi.mock('./frame-bank', () => bank)

let frames: FrameRequestCallback[] = []
let seekTo = 0
let seeking = false

function runFrames(now = performance.now()) {
  act(() => {
    const due = frames
    frames = []
    for (const callback of due) callback(now)
  })
}

// Enough frames, 100 ms apart, for the eased playhead to reach its target.
function settleFrames() {
  const start = performance.now()
  for (let step = 1; step <= 40; step += 1) runFrames(start + step * 100)
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

function scrollTo(scrollY: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
}

// A 10 s film whose seeks land at once, on a 4768px track in a 768px
// viewport: the span is 4000px, so scrollY 2000 is p = 0.5.
function mountAt(scrollY: number, reduceMotion: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduceMotion && query.includes('reduce'), media: query }) as MediaQueryList
  )
  scrollTo(scrollY)
  const view = render(<Harness />)
  const video = screen.getByTestId('film') as HTMLVideoElement
  Object.defineProperty(video, 'duration', { configurable: true, value: 10 })
  Object.defineProperty(video, 'seeking', { configurable: true, get: () => seeking })
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

// Three frames 5 s apart, their decoded bitmaps, and a cache that serves them.
const bankFrames: BankFrame[] = [0, 5_000_000, 10_000_000].map((ts) => ({ ts, blob: new Blob([String(ts)]) }))
const bitmaps = bankFrames.map((_, index) => ({ frame: index }) as unknown as ImageBitmap)

function stubCache(ready = true): BitmapCache {
  return { warm: vi.fn(), get: vi.fn((index: number) => (ready ? bitmaps[index] : null)), dispose: vi.fn() }
}

function stubWebCodecs() {
  vi.stubGlobal('VideoDecoder', function VideoDecoder() {})
  vi.stubGlobal('EncodedVideoChunk', function EncodedVideoChunk() {})
  vi.stubGlobal('createImageBitmap', vi.fn())
}

function stubCanvas() {
  const drawImage = vi.fn()
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage
  } as unknown as CanvasRenderingContext2D)
  return { drawImage, getContext }
}

beforeEach(() => {
  frames = []
  seekTo = 0
  seeking = false
  bank.canBuildFrameBank.mockReset().mockResolvedValue(true)
  bank.loadFrameBank.mockReset().mockResolvedValue(bankFrames)
  bank.createBitmapCache.mockReset().mockImplementation(() => stubCache())
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(4768)
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useVideoScrub without a frame bank', () => {
  it('publishes the scroll progress', () => {
    mountAt(2000, false)
    runFrames()
    expect(screen.getByTestId('progress').textContent).toBe('0.5')
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

  it('leaves a seek in flight alone', () => {
    const { video } = mountAt(2000, true)
    seeking = true
    runFrames()
    expect(video.currentTime).toBe(0)
    seeking = false
    runFrames()
    expect(video.currentTime).toBe(5)
  })

  it('never asks for the frame bank where WebCodecs is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    mountAt(0, false)
    await act(async () => {})
    expect(bank.canBuildFrameBank).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(document.querySelector('canvas')).not.toHaveAttribute('data-live')
  })

  it('stops its loop and listeners on unmount', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const { view } = mountAt(0, false)
    view.unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(removed).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removed).toHaveBeenCalledWith('orientationchange', expect.any(Function))
  })
})

describe('useVideoScrub with a frame bank', () => {
  it('skips the frame bank under reduced motion', async () => {
    stubWebCodecs()
    mountAt(0, true)
    await act(async () => {})
    expect(bank.canBuildFrameBank).not.toHaveBeenCalled()
    expect(bank.loadFrameBank).not.toHaveBeenCalled()
  })

  it('draws the frame nearest the playhead and shows the canvas once it paints', async () => {
    stubWebCodecs()
    const { drawImage } = stubCanvas()
    const { video } = mountAt(0, false)
    await vi.waitFor(() => expect(bank.createBitmapCache).toHaveBeenCalledWith(bankFrames))
    runFrames()
    expect(drawImage).toHaveBeenCalledWith(bitmaps[0], 0, 0, 300, 150)
    expect(document.querySelector('canvas')).toHaveAttribute('data-live', 'true')
    scrollTo(4000)
    settleFrames()
    expect(drawImage).toHaveBeenLastCalledWith(bitmaps[2], 0, 0, 300, 150)
    // Once the canvas has painted the video is no longer seeked.
    expect(video.currentTime).toBe(0)
  })

  it('does not redraw an unchanged frame', async () => {
    stubWebCodecs()
    const { drawImage } = stubCanvas()
    mountAt(0, false)
    await vi.waitFor(() => expect(bank.createBitmapCache).toHaveBeenCalled())
    runFrames()
    runFrames()
    runFrames()
    expect(drawImage).toHaveBeenCalledTimes(1)
  })

  it('keeps seeking the video until the first frame paints', async () => {
    stubWebCodecs()
    const { drawImage } = stubCanvas()
    bank.createBitmapCache.mockImplementation(() => stubCache(false))
    const { video } = mountAt(0, false)
    await vi.waitFor(() => expect(bank.createBitmapCache).toHaveBeenCalled())
    scrollTo(4000)
    settleFrames()
    expect(drawImage).not.toHaveBeenCalled()
    expect(video.currentTime).toBeCloseTo(10, 1)
    expect(document.querySelector('canvas')).not.toHaveAttribute('data-live')
  })

  it('abandons a bank that lands after unmount', async () => {
    stubWebCodecs()
    const { getContext } = stubCanvas()
    let land: (value: BankFrame[]) => void = () => {}
    bank.loadFrameBank.mockImplementation(() => new Promise((resolve) => (land = resolve)))
    const { view } = mountAt(0, false)
    await vi.waitFor(() => expect(bank.loadFrameBank).toHaveBeenCalled())
    const signal = bank.loadFrameBank.mock.calls[0][1]
    view.unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => land(bankFrames))
    expect(bank.createBitmapCache).not.toHaveBeenCalled()
    expect(getContext).not.toHaveBeenCalled()
  })

  it('disposes the bank on unmount', async () => {
    stubWebCodecs()
    stubCanvas()
    const cache = stubCache()
    bank.createBitmapCache.mockReturnValue(cache)
    const { view } = mountAt(0, false)
    await vi.waitFor(() => expect(bank.createBitmapCache).toHaveBeenCalled())
    view.unmount()
    expect(cache.dispose).toHaveBeenCalledTimes(1)
  })

  it('gives up on the bank after 60 seconds', async () => {
    stubWebCodecs()
    const timers = vi.spyOn(window, 'setTimeout')
    bank.loadFrameBank.mockImplementation(() => new Promise(() => {}))
    mountAt(0, false)
    await vi.waitFor(() => expect(bank.loadFrameBank).toHaveBeenCalled())
    const signal = bank.loadFrameBank.mock.calls[0][1]
    const watchdog = timers.mock.calls.find(([, delay]) => delay === 60_000)
    expect(watchdog).toBeDefined()
    act(() => (watchdog![0] as () => void)())
    expect(signal.aborted).toBe(true)
  })

  it('stays on seeking when the bank fails to load', async () => {
    stubWebCodecs()
    bank.loadFrameBank.mockRejectedValue(new Error('decode failed'))
    const { video } = mountAt(2000, false)
    await vi.waitFor(() => expect(bank.loadFrameBank).toHaveBeenCalled())
    await act(async () => {})
    settleFrames()
    expect(bank.createBitmapCache).not.toHaveBeenCalled()
    expect(video.currentTime).toBeCloseTo(5, 1)
  })
})
