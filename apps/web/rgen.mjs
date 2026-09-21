// Render any slide deck's sections to PNG, whatever its shell.
//
//   node apps/web/rgen.mjs <deck.html> <outDir> [maxSlides] [scale]
//
// Pair it with docs/pitch/deck/build.py, which assembles the PDF and refuses
// blank pages. The pitch deck is rendered at scale 2.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'

const [deck, out, maxArg, scaleArg] = process.argv.slice(2)
const max = Number(maxArg ?? 99)
// Slides are 1920x1080 CSS px. A scale of 2 captures them at 3840x2160, which
// is what lets a downscaled diagram survive a zoom in the PDF.
const scale = Number(scaleArg ?? 1)
await mkdir(out, { recursive: true })

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale })
await p.goto(pathToFileURL(deck).href, { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

const sel = await p.evaluate(() => {
  for (const s of ['.slide', 'section.slide', 'section', '[data-label]']) {
    if (document.querySelectorAll(s).length > 1) return s
  }
  return 'section'
})
const n = Math.min(await p.evaluate((s) => document.querySelectorAll(s).length, sel), max)

for (let i = 1; i <= n; i++) {
  await p.evaluate(
    ({ s, k }) => {
      const all = [...document.querySelectorAll(s)]
      all.forEach((el, j) => {
        const on = j === k - 1
        el.toggleAttribute('data-active', on)
        el.style.display = on ? 'flex' : 'none'
        el.style.opacity = on ? '1' : '0'
        el.style.visibility = on ? 'visible' : 'hidden'
        el.style.position = 'absolute'
        el.style.inset = '0'
      })
      for (const id of ['deck', 'stage']) {
        const el = document.getElementById(id)
        if (el) el.style.transform = 'none'
      }
      document.querySelectorAll('[style*="scale"]').forEach((el) => {
        if (el.style.transform && el.style.transform.includes('scale')) el.style.transform = 'none'
      })
    },
    { s: sel, k: i }
  )
  await p.waitForTimeout(350)
  await p.screenshot({ path: `${out}/slide-${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: 1920, height: 1080 } })
}
await b.close()
console.log(`selector=${sel} slides=${n} scale=${scale}x`)
