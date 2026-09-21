import { useEffect, useRef } from 'react'

// Painted at a quarter of the panel's size and scaled up by the browser: the
// sheen is smooth, so the saving costs nothing visible.
const RESOLUTION = 0.25
/** Minimum gap between paints, in ms: about 30fps, half of every 60Hz frame. */
const FRAME_MS = 33

type SilkCanvasProps = {
  className?: string
  speed?: number
  scale?: number
  rotation?: number
}

function hexToRgb(value: string): readonly [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The login-v3 silk: a slow sheen in the --silk-tint colour, after admincn's
 * canvas port of the pattern. It paints only while it has a size, and holds
 * one still frame under reduced motion.
 */
export function SilkCanvas({ className, speed = 10, scale = 1, rotation = 8 }: SilkCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    let context: CanvasRenderingContext2D | null = null
    let tint: readonly [number, number, number] | null = null
    let image: ImageData | null = null
    let elapsed = 0
    let last: number | null = null
    let painted: number | null = null
    let raf = 0

    const paint = () => {
      const { width, height } = canvas
      if (!context || !tint || !image || width === 0 || height === 0) return
      const data = image.data
      const phase = speed * elapsed
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const px = (x / width) * scale
          const py = (y / height) * scale
          const u = (cos * px - sin * py) * scale
          const v = (sin * px + cos * py) * scale + 0.03 * Math.sin(8 * u - phase)
          const sheen =
            0.6 +
            0.4 * Math.sin(5 * (u + v + Math.cos(3 * u + 5 * v) + 0.02 * phase) + Math.sin(20 * (u + v - 0.1 * phase)))
          const offset = (y * width + x) * 4
          data[offset] = tint[0] * sheen
          data[offset + 1] = tint[1] * sheen
          data[offset + 2] = tint[2] * sheen
          data[offset + 3] = 255
        }
      }
      context.putImageData(image, 0, 0)
    }

    const tick = (now: number) => {
      elapsed += (last === null ? 0.016 : Math.min((now - last) / 1000, 0.05)) * 0.1
      last = now
      if (painted === null || now - painted >= FRAME_MS) {
        painted = now
        paint()
      }
      raf = requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf)
      const width = Math.round(entry.contentRect.width * RESOLUTION)
      const height = Math.round(entry.contentRect.height * RESOLUTION)
      if (width === 0 || height === 0) return
      canvas.width = width
      canvas.height = height
      context ??= canvas.getContext('2d')
      tint ??= hexToRgb(getComputedStyle(canvas).getPropertyValue('--silk-tint'))
      image = context?.createImageData(width, height) ?? null
      if (still) {
        paint()
      } else {
        last = null
        painted = null
        raf = requestAnimationFrame(tick)
      }
    })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [speed, scale, rotation])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  )
}
