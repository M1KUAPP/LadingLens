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
 * decoded frame bank drawn to the canvas once it is ready; until then, or
 * without WebCodecs, the video element is seeked instead. It is never played.
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
          const bitmap = bank.cache.get(index)
          if (bitmap) {
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
            if (!painted) {
              painted = true
              setCanvasLive(true)
            }
          }
        } else if (!video.seeking && Math.abs(video.currentTime - current) > 0.01) {
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
      const { canBuildFrameBank, createBitmapCache, loadFrameBank } = await import('./frame-bank')
      if (controller.signal.aborted || !(await canBuildFrameBank())) return
      watchdog = window.setTimeout(() => controller.abort(), WATCHDOG_MS)
      try {
        const frames = await loadFrameBank(src, controller.signal)
        const ctx = canvas.getContext('2d')
        if (controller.signal.aborted || frames.length === 0 || !ctx) return
        context = ctx
        bank = { timestamps: frames.map((frame) => frame.ts), cache: createBitmapCache(frames) }
        if (duration === 0) duration = frames[frames.length - 1].ts / 1e6
      } catch {
        // Seeking stays the fallback: without a bank the canvas never shows.
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
    }
  }, [src])

  return { trackRef, videoRef, canvasRef, progress, canvasLive }
}
