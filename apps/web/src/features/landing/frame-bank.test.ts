import { afterEach, describe, expect, it, vi } from 'vitest'
import { canBuildFrameBank, createBitmapCache, type BankFrame } from './frame-bank'

type FakeBitmap = ImageBitmap & { readonly frame: number; readonly close: ReturnType<typeof vi.fn> }

const frames: BankFrame[] = Array.from({ length: 40 }, (_, index) => ({
  ts: index * 41_667,
  blob: new Blob([String(index)])
}))
const frameOf = new Map(frames.map((frame, index) => [frame.blob, index]))

// Resolves each blob to a stand-in bitmap that records its own close().
function bitmapDecoder() {
  const made: FakeBitmap[] = []
  const decode = vi.fn(async (blob: Blob) => {
    const bitmap = { frame: frameOf.get(blob), close: vi.fn() } as unknown as FakeBitmap
    made.push(bitmap)
    return bitmap
  })
  return { decode, made }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createBitmapCache', () => {
  it('decodes the playhead frame and its neighbours', async () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(10)
    expect(decode.mock.calls.map(([blob]) => frameOf.get(blob))).toEqual([9, 10, 11, 12])
    expect(cache.get(10)).toBeNull()
    await settle()
    expect(cache.get(10)).toMatchObject({ frame: 10 })
  })

  it('stops warming at the ends of the bank', () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(0)
    cache.warm(39)
    expect(decode.mock.calls.map(([blob]) => frameOf.get(blob))).toEqual([0, 1, 2, 38, 39])
  })

  it('does not decode a cached frame again', async () => {
    const { decode } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(10)
    await settle()
    cache.warm(10)
    expect(decode).toHaveBeenCalledTimes(4)
  })

  it('keeps eight bitmaps by default and closes the oldest', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(1)
    cache.warm(5)
    await settle()
    cache.warm(9)
    await settle()
    const closed = made.filter((bitmap) => bitmap.close.mock.calls.length > 0).map((bitmap) => bitmap.frame)
    expect(closed.sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
    expect(cache.get(2)).toBeNull()
    expect(cache.get(9)).toMatchObject({ frame: 9 })
  })

  it('closes a bitmap that arrives after its slot was evicted', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode, 4)
    cache.warm(1)
    cache.warm(20)
    await settle()
    const early = made.filter((bitmap) => bitmap.frame <= 3)
    expect(early).toHaveLength(4)
    for (const bitmap of early) expect(bitmap.close).toHaveBeenCalledTimes(1)
    expect(cache.get(20)).toMatchObject({ frame: 20 })
  })

  it('closes every bitmap on dispose, late arrivals included', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode)
    cache.warm(5)
    await settle()
    cache.warm(9)
    cache.dispose()
    await settle()
    expect(made).toHaveLength(8)
    for (const bitmap of made) expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('closes a stale decode when a slot is re-warmed before it arrives', async () => {
    const { decode, made } = bitmapDecoder()
    const cache = createBitmapCache(frames, decode, 4)
    cache.warm(1)
    cache.warm(20)
    cache.warm(1)
    await settle()
    cache.dispose()
    await settle()
    // Every bitmap created must be closed exactly once
    for (const bitmap of made) expect(bitmap.close).toHaveBeenCalledTimes(1)
    // And the second warm(1) should have populated the cache
    expect(made.filter((b) => b.frame === 1)).toHaveLength(2)
  })

  it('a stale rejection does not delete a newer filled slot', async () => {
    type Call = { blob: Blob; resolve: (bitmap: ImageBitmap) => void; reject: (error: unknown) => void }
    const calls: Call[] = []
    const decode = vi.fn(
      (blob: Blob) =>
        new Promise<ImageBitmap>((resolve, reject) => {
          calls.push({ blob, resolve, reject })
        })
    )

    const cache = createBitmapCache(frames, decode, 4)
    cache.warm(1) // decodes 0..3; the stale request for frame 1
    cache.warm(20) // evicts 0..3 while they are still pending
    cache.warm(1) // re-requests 0..3; the fresh request for frame 1
    const [stale, fresh] = calls.filter((call) => frameOf.get(call.blob) === 1)

    const bitmap = { frame: 1, close: vi.fn() } as unknown as FakeBitmap
    fresh.resolve(bitmap)
    await settle()
    expect(cache.get(1)).toBe(bitmap)

    stale.reject(new Error('decode failed'))
    await settle()
    // Before the fix, the old handler would delete the slot here
    expect(cache.get(1)).toBe(bitmap)

    cache.dispose()
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

describe('canBuildFrameBank', () => {
  it('says no where WebCodecs is missing', async () => {
    await expect(canBuildFrameBank()).resolves.toBe(false)
  })

  it("asks the decoder about the film's H.264 profile before anything downloads", async () => {
    const isConfigSupported = vi.fn(async () => ({ supported: true }))
    vi.stubGlobal('VideoDecoder', { isConfigSupported })
    await expect(canBuildFrameBank()).resolves.toBe(true)
    expect(isConfigSupported).toHaveBeenCalledWith({ codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 })
  })

  it('says no when the decoder refuses', async () => {
    vi.stubGlobal('VideoDecoder', { isConfigSupported: async () => ({ supported: false }) })
    await expect(canBuildFrameBank()).resolves.toBe(false)
  })
})
