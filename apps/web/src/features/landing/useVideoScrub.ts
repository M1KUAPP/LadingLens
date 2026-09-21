import { useEffect, useRef, useState } from 'react'
import type { BitmapCache } from './frame-bank'
import { lerpStep, nearestIndex, scrollProgress } from './scroll-math'

/** Longest the frame bank may take before the page settles on seeking. */
const WATCHDOG_MS = 60_000

type Bank = { readonly timestamps: readonly number[]; readonly cache: BitmapCache }

function canDecodeFrames(): boolean {
  return (
    typeof VideoDecoder === 'function' &&
    typeof EncodedVideoChunk === 'function' &&
    typeof createImageBitmap === 'function'
  )
}

/**
 * Ties a video's playhead to the scroll through a track. Frames come from a
 * decoded frame bank drawn to the canvas once it paints; until then, or
 * without WebCodecs, the video element is seeked instead. It is never played.
 *
 * Progress is `scrollY` over the track's height less one viewport, so the
 * track must start at the top of the document. All three refs must be
 * mounted with the caller, the canvas included even under reduced motion:
 * they are read once per `src`.
 */
export function useVideoScrub(src: string) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [canvasLive, setCanvasLive] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!track || !video || !canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let span = 0
    const measure = () => {
      span = track.offsetHeight - window.innerHeight
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    let duration = 0
    const readDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration
    }
    readDuration()
    video.addEventListener('loadedmetadata', readDuration)

    let bank: Bank | null = null
    let context: CanvasRenderingContext2D | null = null
    let painted = false
    let drawn = -1
    let current = 0
    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, now - last) / 1000)
      last = now
      const p = scrollProgress(window.scrollY, span)
      setProgress(p)
      if (duration > 0) {
        const target = p * duration
        current = reduced ? target : lerpStep(current, target, dt)
        if (bank && context) {
          const index = nearestIndex(bank.timestamps, current * 1e6)
          bank.cache.warm(index)
          // The canvas keeps its pixels, so an unchanged frame is not redrawn.
          const bitmap = index === drawn ? null : bank.cache.get(index)
          if (bitmap) {
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
            drawn = index
            if (!painted) {
              painted = true
              setCanvasLive(true)
            }
          }
        }
        // The video carries the picture until the canvas has painted once.
        if (!painted && !video.seeking && Math.abs(video.currentTime - current) > 0.01) {
          video.currentTime = current
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const controller = new AbortController()
    let watchdog = 0
    const buildBank = async () => {
      if (reduced || !canDecodeFrames()) return
      try {
        const { canBuildFrameBank, createBitmapCache, loadFrameBank } = await import('./frame-bank')
        if (!(await canBuildFrameBank()) || controller.signal.aborted) return
        watchdog = window.setTimeout(() => controller.abort(), WATCHDOG_MS)
        const frames = await loadFrameBank(src, controller.signal)
        if (controller.signal.aborted || frames.length === 0) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        context = ctx
        bank = { timestamps: frames.map((frame) => frame.ts), cache: createBitmapCache(frames) }
        if (duration === 0) duration = frames[frames.length - 1].ts / 1e6
      } catch {
        // Seeking stays the fallback: a failed chunk load, fetch or decode
        // leaves the canvas hidden and the video seeked.
      } finally {
        window.clearTimeout(watchdog)
      }
    }
    if (document.readyState === 'complete') void buildBank()
    else window.addEventListener('load', buildBank, { once: true })

    return () => {
      cancelAnimationFrame(raf)
      controller.abort()
      window.clearTimeout(watchdog)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.removeEventListener('load', buildBank)
      video.removeEventListener('loadedmetadata', readDuration)
      bank?.cache.dispose()
      setCanvasLive(false)
    }
  }, [src])

  return { trackRef, videoRef, canvasRef, progress, canvasLive }
}
