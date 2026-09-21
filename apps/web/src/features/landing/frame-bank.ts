import { DataStream, Endianness, MP4BoxBuffer, createFile } from 'mp4box'
import type { Box, ISOFile, Sample, VisualSampleEntry } from 'mp4box'

// The frame bank behind the landing film: every frame of the clip decoded
// once with WebCodecs and kept as a compressed image, so scrubbing never
// waits on the video element's keyframe seeks.

/** Frames decoded ahead of their image encode, at most. */
const LEAD = 24
/**
 * Pending image encodes, at most. Each pending `toBlob` holds a full-frame
 * copy of the canvas — 8.3 MB at 1080p — until it resolves, so LEAD's 24
 * alone would let about 199 MB of frames wait on their encode at once.
 */
const MAX_ENCODES = 4
/** Decoded bitmaps kept around the playhead; 1080p RGBA is 8.3 MB each. */
export const LRU_MAX = 8
const QUALITY = 0.82

export type BankFrame = { readonly ts: number; readonly blob: Blob }

export type BitmapCache = {
  /** Starts decoding the frame at index and its neighbours. */
  warm(index: number): void
  /** The frame's bitmap if it is decoded, else null. */
  get(index: number): ImageBitmap | null
  dispose(): void
}

type Demuxed = { readonly config: VideoDecoderConfig; readonly samples: readonly Sample[] }

/**
 * Decode checks that need no download: the clip is H.264 High at level 4.0
 * (avc1.640028), 1920x1080. A browser that cannot promise that gets no fetch.
 */
export async function canBuildFrameBank(): Promise<boolean> {
  try {
    const probe = await VideoDecoder.isConfigSupported({ codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 })
    return probe.supported === true
  } catch {
    return false
  }
}

function codecDescription(file: ISOFile, trackId: number): Uint8Array | undefined {
  for (const entry of file.getTrackById(trackId).mdia.minf.stbl.stsd.entries) {
    const visual = entry as VisualSampleEntry
    const box = visual.avcC ?? visual.hvcC ?? visual.vpcC ?? visual.av1C
    if (box) {
      const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
      ;(box as Box).write(stream)
      // The decoder wants the record without its 8-byte box header.
      return new Uint8Array(stream.buffer, 8)
    }
  }
  return undefined
}

function demux(buffer: ArrayBuffer): Promise<Demuxed> {
  return new Promise((resolve, reject) => {
    // keepMdatData: since mp4box 1.0 the sample bytes are dropped by default.
    const file = createFile(true)
    const samples: Sample[] = []
    let config: VideoDecoderConfig | null = null
    let expected = 0
    file.onError = (module, message) => reject(new Error(`${module}: ${message}`))
    file.onReady = (info) => {
      const track = info.videoTracks[0]
      if (!track) {
        reject(new Error('The film has no video track'))
        return
      }
      expected = track.nb_samples
      config = {
        codec: track.codec,
        codedWidth: track.video?.width ?? track.track_width,
        codedHeight: track.video?.height ?? track.track_height,
        description: codecDescription(file, track.id)
      }
      file.setExtractionOptions(track.id, undefined, { nbSamples: expected })
      file.start()
    }
    file.onSamples = (_id, _user, batch) => {
      samples.push(...batch)
      if (config && samples.length >= expected) resolve({ config, samples })
    }
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0))
    file.flush()
    // Samples arrive during appendBuffer; anything still missing never will.
    if (!config) reject(new Error('The film has no movie box'))
    else if (samples.length < expected) reject(new Error('The film ended early'))
  })
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Frame encode failed'))), type, QUALITY)
  })
}

/**
 * WebP where the browser can encode it. Safari cannot, and silently returns
 * PNG instead, about 760 kB a 1080p frame, so it gets JPEG.
 */
async function imageType(): Promise<string> {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const blob = await encode(probe, 'image/webp')
  return blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
}

async function decodeAll(
  { config, samples }: Demuxed,
  hardwareAcceleration: HardwareAcceleration,
  signal: AbortSignal
): Promise<BankFrame[]> {
  const settings: VideoDecoderConfig = { ...config, hardwareAcceleration }
  const { supported } = await VideoDecoder.isConfigSupported(settings)
  if (!supported) throw new Error(`Decoder refuses ${config.codec} (${hardwareAcceleration})`)

  const canvas = document.createElement('canvas')
  canvas.width = config.codedWidth ?? 1920
  canvas.height = config.codedHeight ?? 1080
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No 2D canvas for frame encoding')
  const type = await imageType()

  const frames: BankFrame[] = []
  const pending = new Set<Promise<void>>()
  let failure: unknown = null

  const decoder = new VideoDecoder({
    output: (frame) => {
      const ts = frame.timestamp
      context.drawImage(frame, 0, 0, canvas.width, canvas.height)
      frame.close()
      // toBlob copies the bitmap now and encodes in parallel, so the one
      // canvas is free for the next frame straight away.
      const job: Promise<void> = encode(canvas, type)
        .then((blob) => {
          frames.push({ ts, blob })
        })
        .catch((error: unknown) => {
          failure ??= error
        })
        .finally(() => pending.delete(job))
      pending.add(job)
    },
    error: (error) => {
      failure ??= error
    }
  })

  try {
    decoder.configure(settings)
    let started = false
    for (const sample of samples) {
      if (signal.aborted) throw signal.reason
      if (failure) throw failure
      // A decoder may only start on a key chunk.
      if (!started && !sample.is_sync) continue
      started = true
      // Hold decoding back so frames never pile up waiting to be encoded.
      while (
        (pending.size >= MAX_ENCODES || pending.size + decoder.decodeQueueSize >= LEAD) &&
        decoder.state === 'configured'
      ) {
        await (pending.size > 0 ? Promise.race(pending) : new Promise((wake) => setTimeout(wake, 4)))
      }
      if (!sample.data) continue
      decoder.decode(
        new EncodedVideoChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: (sample.cts * 1_000_000) / sample.timescale,
          duration: (sample.duration * 1_000_000) / sample.timescale,
          data: sample.data
        })
      )
    }
    await decoder.flush()
    await Promise.all(pending)
    if (failure) throw failure
  } finally {
    if (decoder.state !== 'closed') decoder.close()
  }

  frames.sort((a, b) => a.ts - b.ts)
  // One timeline with the video element: this clip presents its first frame
  // 83 ms in (an edit list), where the element starts it at 0.
  const origin = frames[0]?.ts ?? 0
  return frames.map((frame) => ({ ts: frame.ts - origin, blob: frame.blob }))
}

/**
 * Fetches, demuxes and decodes the film into timestamped images, in
 * microseconds from its first frame. A decoder failure gets one retry in
 * software before the caller falls back to seeking.
 */
export async function loadFrameBank(src: string, signal: AbortSignal): Promise<BankFrame[]> {
  const response = await fetch(src, { signal })
  if (!response.ok) throw new Error(`Film request failed with ${response.status}`)
  const demuxed = await demux(await response.arrayBuffer())
  try {
    return await decodeAll(demuxed, 'no-preference', signal)
  } catch (error) {
    if (signal.aborted) throw error
    return decodeAll(demuxed, 'prefer-software', signal)
  }
}

/**
 * Least-recently-used decoded bitmaps. Evicted bitmaps are closed at once,
 * and one that arrives after its slot was evicted is closed on arrival.
 */
export function createBitmapCache(
  frames: readonly BankFrame[],
  decode: (blob: Blob) => Promise<ImageBitmap> = (blob) => createImageBitmap(blob),
  max = LRU_MAX
): BitmapCache {
  const entries = new Map<number, ImageBitmap | null>()
  let disposed = false

  const touch = (index: number) => {
    const bitmap = entries.get(index) ?? null
    entries.delete(index)
    entries.set(index, bitmap)
  }

  const evict = () => {
    for (const [index, bitmap] of entries) {
      if (entries.size <= max) return
      entries.delete(index)
      bitmap?.close()
    }
  }

  const load = (index: number) => {
    if (index < 0 || index >= frames.length) return
    if (entries.has(index)) {
      touch(index)
      return
    }
    entries.set(index, null)
    evict()
    decode(frames[index].blob).then(
      (bitmap) => {
        if (disposed || entries.get(index) !== null) bitmap.close()
        else entries.set(index, bitmap)
      },
      () => {
        if (entries.get(index) === null) entries.delete(index)
      }
    )
  }

  return {
    warm(index) {
      for (let offset = -1; offset <= 2; offset += 1) load(index + offset)
    },
    get(index) {
      const bitmap = entries.get(index) ?? null
      if (bitmap) touch(index)
      return bitmap
    },
    dispose() {
      disposed = true
      for (const bitmap of entries.values()) bitmap?.close()
      entries.clear()
    }
  }
}
