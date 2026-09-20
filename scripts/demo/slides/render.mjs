import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SUBTITLE_TOP = 852
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const deckTemplateDirectory = resolve(scriptDirectory, '../../../docs/demo/deck')

export function lowestMeaningfulFloor(textBottoms, mediaBottoms) {
  const bottoms = [...textBottoms, ...mediaBottoms].filter(Number.isFinite)
  if (!bottoms.length) throw new Error('slide is effectively empty.')
  return Math.max(...bottoms)
}

function parseSlides(value) {
  if (!value || !value.trim()) return []
  const seen = new Set()
  return value.trim().split(/\s+/).map((pair) => {
    const [name, seconds, ...extra] = pair.split(':')
    if (!name || extra.length || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name) || !/^[1-9]\d*$/.test(seconds) || seen.has(name)) {
      throw new Error('DEMO_SLIDES entries must have unique name:positive-seconds pairs.')
    }
    seen.add(name)
    return { name, seconds: Number(seconds) }
  })
}

async function defaultLoadPlaywright() {
  const require = createRequire(import.meta.url)
  let location
  try { location = require.resolve('playwright') } catch { throw new Error('Playwright is not installed.') }
  const module = await import(pathToFileURL(location).href)
  if (!module.chromium) throw new Error('The resolved Playwright module does not provide Chromium.')
  return module.chromium
}

export async function renderSlides(environment = process.env, dependencies = {}) {
  const slides = parseSlides(environment.DEMO_SLIDES)
  if (!slides.length) return []
  if (!environment.DEMO_DIR?.trim() || !environment.DEMO_SLIDE_DIR?.trim()) {
    throw new Error('DEMO_DIR and DEMO_SLIDE_DIR are required when rendering slides.')
  }
  const output = resolve(environment.DEMO_DIR)
  const pages = resolve(environment.DEMO_SLIDE_DIR)
  if (pages === deckTemplateDirectory) throw new Error('The deck template is not a slide render input.')
  const loadPlaywright = dependencies.loadPlaywright || defaultLoadPlaywright
  const chromium = await loadPlaywright()
  let browser
  let context
  try {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
    const results = []
    for (const slide of slides) {
      const pagePath = resolve(pages, `${slide.name}.html`)
      await access(pagePath)
      const page = await context.newPage()
      await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'networkidle' })
      const content = await page.evaluate(async () => {
        await document.fonts.ready
        if (!document.fonts.check('10.5px Quicksand')) throw new Error('Quicksand is unavailable.')
        const visible = (node) => {
          for (let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement; element; element = element.parentElement) {
            const style = getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden') return false
          }
          return true
        }
        const textBottoms = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent.trim() || !visible(node)) continue
          const range = document.createRange()
          range.selectNodeContents(node)
          textBottoms.push(...[...range.getClientRects()].map((rect) => rect.bottom))
        }
        const mediaBottoms = [...document.body.querySelectorAll('img, svg, canvas, video')]
          .filter(visible)
          .map((node) => node.getBoundingClientRect().bottom)
        return { textBottoms, mediaBottoms }
      })
      const floor = lowestMeaningfulFloor(content.textBottoms, content.mediaBottoms)
      if (!Number.isFinite(floor) || floor > SUBTITLE_TOP) throw new Error(`slide '${slide.name}' has a subtitle collision.`)
      await page.screenshot({ path: resolve(output, `slide-${slide.name}.png`), type: 'png' })
      await page.close()
      results.push({ ...slide, floor })
    }
    return results
  } finally {
    await context?.close()
    await browser?.close()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderSlides().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
