#!/usr/bin/env node
/**
 * Issue #41 browser evidence capture.
 *
 * Drives the production build of apps/web with Playwright Chromium and
 * records, per route / viewport / theme:
 *   - horizontal overflow (documentElement.scrollWidth vs viewport)
 *   - keyboard reachability (Tab walk) + focus-ring token check
 *   - reduced-motion scan (transition-duration / animation-duration)
 *   - greyscale distinguishability of status/verdict elements
 *   - contrast ratios (text 4.5:1, large text / UI boundaries 3:1)
 *   - footer presence on post-auth routes
 *   - visible text extraction for jargon review
 *   - full-page screenshots into ./screens/
 *
 * Re-run:
 *   cd apps/web && bun install && bun run build
 *   bunx playwright install chromium        # once
 *   bunx vite preview --port 4173           # or let this script spawn it
 *   node docs/verification/issue-41/capture.mjs
 *
 * Env: BASE_URL (default http://localhost:4173), KEEP_UNCOMMITTED_SHOTS=1 to
 * leave the 1920x1080 / 390x844 PNGs in screens/ instead of moving them out.
 *
 * Writes: screens/<route>-<viewport>-<theme>.png and results.json.
 */

import { createRequire } from 'node:module'
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ISSUE_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(ISSUE_DIR, '../../..')
const WEB_DIR = path.join(REPO_ROOT, 'apps/web')
const SCREENS_DIR = process.env.SCREENS_DIR ? path.resolve(process.env.SCREENS_DIR) : path.join(ISSUE_DIR, 'screens')
const RESULTS_PATH = path.join(ISSUE_DIR, process.env.RESULTS_NAME ?? 'results.json')
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173'

const require = createRequire(path.join(WEB_DIR, 'package.json'))
const playwright = require('playwright')
const BROWSER_NAME = process.env.BROWSER ?? 'chromium'

const ROUTES = [
  { slug: 'landing', path: '/', auth: false, ready: '.land-title' },
  { slug: 'auth', path: '/auth', auth: false, ready: '.auth-submit' },
  {
    slug: 'inbox',
    path: '/inbox',
    auth: true,
    ready: '.inbox-table, .inbox-error, .inbox-empty'
  },
  {
    slug: 'email',
    path: '/emails/email_001',
    auth: true,
    ready: '.attachment-preflight, .email-detail-error'
  },
  {
    slug: 'review',
    path: '/review',
    auth: true,
    ready: '.rq-table, .rq-empty, .rq-error'
  },
  {
    slug: 'graph',
    path: '/graph',
    auth: true,
    ready: '.control-graph'
  },
  {
    slug: 'evaluation',
    path: '/evaluation',
    auth: true,
    ready: '.eval-grid, .eval-error, .eval-loading'
  },
  {
    slug: 'ingest',
    path: '/ingest',
    auth: true,
    ready: '.ingest-drop, .drop-zone, .page'
  },
  {
    slug: 'settings',
    path: '/settings',
    auth: true,
    ready: '.settings-section'
  },
  {
    slug: 'judge',
    path: '/judge',
    auth: false,
    ready: '.judge-view'
  }
]

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 }
]

const THEMES = ['light', 'dark']
const COMMIT_VIEWPORT = '1440x900'

// Runs once per page inside the browser. Shared element descriptor.
const PAGE_HELPERS = `
function __desc(el) {
  if (!el || el === document.body) return 'body'
  if (el === document.documentElement) return 'html'
  const tag = el.tagName.toLowerCase()
  const id = el.id ? '#' + el.id : ''
  const cls = (el.className && typeof el.className === 'string')
    ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
    : ''
  const role = el.getAttribute && el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : ''
  const al = el.getAttribute && el.getAttribute('aria-label') ? '[aria-label="' + el.getAttribute('aria-label').slice(0, 30) + '"]' : ''
  const txt = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40)
  return (tag + id + cls + role + al + (txt ? ' "' + txt + '"' : '')).slice(0, 140)
}
function __parseColor(str) {
  if (!str) return null
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const m = str.match(/rgba?\\(([^)]+)\\)/)
  if (!m) return null
  const p = m[1].split(',').map((s) => parseFloat(s))
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
}
function __lum(c) {
  const f = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
}
function __contrast(a, b) {
  const la = __lum(a)
  const lb = __lum(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}
function __over(fg, bg) {
  const a = fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}
function __effBg(el) {
  const layers = []
  let node = el
  while (node && node.nodeType === 1) {
    const c = __parseColor(getComputedStyle(node).backgroundColor)
    if (c && c.a > 0) layers.push(c)
    node = node.parentElement
  }
  let base = { r: 255, g: 255, b: 255 }
  for (let i = layers.length - 1; i >= 0; i--) base = __over(layers[i], base)
  return base
}
function __fmt(c) {
  return 'rgba(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + (c.a !== undefined && c.a < 1 ? ', ' + c.a : '') + ')'
}
function __visible(el) {
  try {
    return !!(el && el.checkVisibility && el.checkVisibility({ checkVisibilityCSS: true }))
  } catch {
    return !!(el && el.getClientRects().length)
  }
}
function __normShadow(s) {
  if (!s || s === 'none') return null
  const layer = s.split(/,(?![^()]*\\))/)[0]
  const color = (layer.match(/rgba?\\([^)]*\\)/) || [null])[0]
  const nums = layer
    .replace(/rgba?\\([^)]*\\)/, '')
    .replace('inset', '')
    .trim()
    .split(/\\s+/)
    .map((v) => parseFloat(v))
    .filter((v) => !Number.isNaN(v))
  return { color, nums }
}
`

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

async function ensureServer() {
  if (await waitForServer(BASE_URL, 4)) return null
  if (!fs.existsSync(path.join(WEB_DIR, 'dist/index.html'))) {
    throw new Error('apps/web/dist missing. Run `bun run build` in apps/web first.')
  }
  console.log(`[capture] starting vite preview on ${BASE_URL}`)
  const proc = spawn('bunx', ['vite', 'preview', '--port', new URL(BASE_URL).port || '4173', '--strictPort'], {
    cwd: WEB_DIR,
    stdio: 'ignore'
  })
  if (!(await waitForServer(BASE_URL, 60))) {
    proc.kill()
    throw new Error('vite preview did not come up at ' + BASE_URL)
  }
  return proc
}

async function newPage(browser, { viewport, theme, auth, reducedMotion }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
  })
  await context.addInitScript(
    ({ theme, auth }) => {
      try {
        localStorage.setItem('ladinglens-theme', theme)
      } catch {
        /* storage unavailable */
      }
      if (auth) {
        try {
          sessionStorage.setItem(
            'ladinglens-guest-session',
            JSON.stringify({ id: 'guest-audit-41', issuedAt: '2026-09-20T00:00:00.000Z' })
          )
        } catch {
          /* storage unavailable */
        }
      }
    },
    { theme, auth }
  )
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300))
  })
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + String(err).slice(0, 300)))
  return { context, page, consoleErrors }
}

async function measurePage(page) {
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = {}
    // ---- horizontal overflow ----
    const vw = window.innerWidth
    const doc = document.documentElement
    const over = []
    const scrollers = []
    const clippedByAncestor = (el) => {
      let n = el.parentElement
      while (n) {
        const ox = getComputedStyle(n).overflowX
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
          const nr = n.getBoundingClientRect()
          const r = el.getBoundingClientRect()
          if (r.right <= nr.right + 1 && r.left >= nr.left - 1) return true
        }
        n = n.parentElement
      }
      return false
    }
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (el.scrollWidth > el.clientWidth + 1) {
        scrollers.push({ el: __desc(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })
      }
      if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el)) {
        over.push({ el: __desc(el), right: Math.round(r.right), left: Math.round(r.left), width: Math.round(r.width) })
      }
    }
    out.overflow = { viewportW: vw, docScrollW: doc.scrollWidth, excess: doc.scrollWidth - vw, offenders: over.slice(0, 30), internalScrollers: scrollers.slice(0, 30) }

    // ---- footer ----
    const footers = [...document.querySelectorAll('footer, [role="contentinfo"]')].map((f) => ({
      el: __desc(f), visible: __visible(f)
    }))
    out.footers = footers

    // ---- focus ring token ----
    out.focusRingToken = getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim()

    // ---- contrast ----
    const textFindings = []
    let scanned = 0
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const raw = node.nodeValue
      if (!raw || !raw.trim()) continue
      const el = node.parentElement
      if (!el || el.closest('svg')) continue
      if (!__visible(el)) continue
      const cs = getComputedStyle(el)
      if (parseFloat(cs.fontSize) === 0) continue
      const fg = __parseColor(cs.color)
      if (!fg) continue
      const bg = __effBg(el)
      const fgFlat = fg.a < 1 ? __over(fg, bg) : fg
      const ratio = __contrast(fgFlat, bg)
      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      const floor = large ? 3 : 4.5
      scanned++
      if (ratio + 0.005 < floor) {
        textFindings.push({
          el: __desc(el), text: raw.trim().replace(/\\s+/g, ' ').slice(0, 50),
          fg: __fmt(fgFlat), bg: __fmt(bg), ratio: Math.round(ratio * 100) / 100,
          size, weight, large, floor
        })
      }
    }
    // placeholder text
    for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      if (!__visible(el)) continue
      const cs = getComputedStyle(el, '::placeholder')
      const fg = __parseColor(cs.color)
      if (!fg) continue
      const bg = __effBg(el)
      const fgFlat = fg.a < 1 ? __over(fg, bg) : fg
      const ratio = __contrast(fgFlat, bg)
      scanned++
      if (ratio + 0.005 < 4.5) {
        textFindings.push({
          el: __desc(el) + ' ::placeholder', text: '(placeholder) ' + (el.getAttribute('placeholder') || ''),
          fg: __fmt(fgFlat), bg: __fmt(bg), ratio: Math.round(ratio * 100) / 100,
          size: parseFloat(getComputedStyle(el).fontSize), weight: 400, large: false, floor: 4.5
        })
      }
    }
    // UI boundaries: borders on interactive elements vs surrounding surface
    const boundaryFindings = []
    const INTERACTIVE = 'a[href], button, input, select, textarea, [role="tab"], [role="combobox"], [role="button"], [role="checkbox"], [tabindex]'
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      if (!__visible(el)) continue
      const cs = getComputedStyle(el)
      const surround = __effBg(el.parentElement || el)
      const sides = ['Top', 'Right', 'Bottom', 'Left']
      for (const side of sides) {
        const w = parseFloat(cs['border' + side + 'Width'])
        const st = cs['border' + side + 'Style']
        if (!w || st === 'none' || st === 'hidden') continue
        const bc = __parseColor(cs['border' + side + 'Color'])
        if (!bc || bc.a === 0) continue
        const bcFlat = bc.a < 1 ? __over(bc, surround) : bc
        const ratio = __contrast(bcFlat, surround)
        if (ratio + 0.005 < 3) {
          boundaryFindings.push({
            el: __desc(el), side: side.toLowerCase(), border: __fmt(bcFlat), surround: __fmt(surround),
            ratio: Math.round(ratio * 100) / 100, width: w
          })
        }
      }
    }
    out.contrast = { scannedTextNodes: scanned, textFailures: textFindings, boundaryFailures: boundaryFindings }

    // ---- dedupe-ish: collapse identical element+ratio findings ----
    const sig = (f) => f.el + '|' + f.fg + '|' + f.bg
    const seen = new Set()
    out.contrast.textFailures = textFindings.filter((f) => (seen.has(sig(f)) ? false : seen.add(sig(f))))

    // ---- visible text ----
    out.innerText = document.body.innerText

    // ---- motion baseline (normal context) ----
    const moving = []
    const addMoving = (el, cs, pseudo) => {
      const td = cs.transitionDuration
      const ad = cs.animationDuration
      const nonZero = (v) => v.split(',').some((x) => x.trim() !== '0s')
      if (nonZero(td) || nonZero(ad)) {
        moving.push({ el: __desc(el) + (pseudo || ''), transitionDuration: td, animationDuration: ad })
      }
    }
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      addMoving(el, cs, '')
      addMoving(el, getComputedStyle(el, '::before'), '::before')
      addMoving(el, getComputedStyle(el, '::after'), '::after')
    }
    out.motion = moving
    return out
  })()`)
}

async function tabWalk(page, cap = 250) {
  // Tag every plausibly-focusable element first.
  const focusableCount = await page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex], [role="tab"], [role="button"], [role="link"], [role="checkbox"], [role="combobox"], [role="option"], [role="menuitem"]'
    let i = 0
    let visible = 0
    for (const el of document.querySelectorAll(sel)) {
      el.setAttribute('data-audit-i', String(i++))
      if (__visible(el)) visible++
    }
    // roving-tabindex items (intentionally -1): record separately
    const roving = [...document.querySelectorAll('[tabindex="-1"]')].filter(__visible).map((el) => __desc(el))
    window.__auditRoving = roving
    return { total: i, visible }
  })()`)

  const seq = []
  let trap = null
  let sameCount = 0
  let prev = null
  let bodyCount = 0
  for (let step = 0; step < cap; step++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(`(() => {
      ${PAGE_HELPERS}
      const el = document.activeElement
      if (!el || el === document.body) return { body: true }
      const cs = getComputedStyle(el)
      return {
        body: false,
        i: el.getAttribute('data-audit-i'),
        el: __desc(el),
        focusVisible: el.matches(':focus-visible'),
        boxShadow: cs.boxShadow,
        outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        tag: el.tagName.toLowerCase()
      }
    })()`)
    if (info.body) {
      bodyCount++
      if (bodyCount >= 3) break
      continue
    }
    bodyCount = 0
    if (prev !== null && info.i === prev) {
      sameCount++
      if (sameCount >= 8) {
        trap = info.el
        break
      }
    } else {
      sameCount = 0
    }
    if (seq.length > 2 && info.i === seq[0].i) {
      seq.push({ ...info, wrapped: true })
      break
    }
    seq.push(info)
    prev = info.i
  }

  const roving = await page.evaluate(`window.__auditRoving || []`)
  const reachedIdx = new Set(seq.map((s) => s.i).filter((v) => v !== null && v !== undefined))
  const unreached = await page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const out = []
    for (const el of document.querySelectorAll('[data-audit-i]')) {
      if (!__visible(el)) continue
      out.push({ i: el.getAttribute('data-audit-i'), el: __desc(el), tabIndex: el.tabIndex })
    }
    return out
  })()`)
  const missing = unreached.filter((u) => !reachedIdx.has(u.i))
  return { focusableTagged: focusableCount, sequence: seq, trap, roving, unreached: missing }
}

async function greyscaleCheck(page) {
  await page.addStyleTag({ content: 'html{filter:grayscale(1) !important}' })
  return page.evaluate(`(() => {
    ${PAGE_HELPERS}
    const groups = new Map()
    const flagged = []
    const els = [...document.querySelectorAll('[data-status], [data-outcome], .status-pill, .category-badge, .field-row, .attachment-preflight-refusal, .missing-case-peak, .eval-count-row, [data-channel], [data-kind]')]
    for (const el of els) {
      if (!__visible(el)) continue
      const status = el.getAttribute('data-status') || el.getAttribute('data-outcome') || el.getAttribute('data-channel') || el.getAttribute('data-kind') || ''
      const text = (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
      const glyphs = el.querySelectorAll('svg').length
      const rail = !!el.querySelector('[class*="rail" i]')
      const key = el.tagName + '|' + (el.className || '') + '|' + status
      const g = groups.get(key) || { el: __desc(el), status, count: 0, text, glyphs, rail }
      g.count++
      groups.set(key, g)
      if (!text && glyphs === 0 && !rail) {
        flagged.push({ el: __desc(el), status })
      }
    }
    return { groups: [...groups.values()], flagged }
  })()`)
}

async function captureRoute(browser, route, viewport, theme) {
  const { context, page, consoleErrors } = await newPage(browser, {
    viewport,
    theme,
    auth: route.auth,
    reducedMotion: false
  })
  const rec = { route: route.slug, path: route.path, viewport: viewport.name, theme }
  try {
    await page.goto(BASE_URL + route.path, { waitUntil: 'networkidle', timeout: 30000 })
    try {
      await page.waitForSelector(route.ready, { timeout: 10000 })
    } catch {
      rec.readyTimeout = true
    }
    if (route.slug === 'graph') {
      // The cytoscape canvas hydrates after the shell; give it a bounded wait.
      try {
        await page.waitForSelector('.graph-canvas canvas, .graph-table table, .control-graph-fallback-note', {
          timeout: 8000
        })
      } catch {
        rec.graphRenderTimeout = true
      }
    }
    await page.waitForTimeout(350)

    const shotName = `${route.slug}-${viewport.name}-${theme}.png`
    const shotPath = path.join(SCREENS_DIR, shotName)
    await page.screenshot({ path: shotPath, fullPage: true })
    rec.screenshot = `screens/${shotName}`
    rec.screenshotBytes = fs.statSync(shotPath).size

    const measured = await measurePage(page)
    rec.overflow = measured.overflow
    rec.footers = measured.footers
    rec.focusRingToken = measured.focusRingToken
    rec.contrast = measured.contrast
    rec.motionNormal = measured.motion
    rec.innerText = measured.innerText

    rec.tab = await tabWalk(page)
    rec.greyscale = await greyscaleCheck(page)
    rec.consoleErrors = consoleErrors
  } catch (err) {
    rec.error = String(err && err.message ? err.message : err).slice(0, 500)
  } finally {
    await context.close()
  }
  return rec
}

async function motionOnly(browser, route, viewport, theme) {
  const { context, page } = await newPage(browser, {
    viewport,
    theme,
    auth: route.auth,
    reducedMotion: true
  })
  const rec = { route: route.slug, viewport: viewport.name, theme }
  try {
    await page.goto(BASE_URL + route.path, { waitUntil: 'networkidle', timeout: 30000 })
    try {
      await page.waitForSelector(route.ready, { timeout: 10000 })
    } catch {
      rec.readyTimeout = true
    }
    await page.waitForTimeout(250)
    const m = await measurePage(page)
    rec.motionReduced = m.motion
  } catch (err) {
    rec.error = String(err && err.message ? err.message : err).slice(0, 500)
  } finally {
    await context.close()
  }
  return rec
}

async function captureStates(browser, scratchDir) {
  // State captures at 1440x900 in both themes; screenshots go to scratch only.
  const states = []
  const viewport = VIEWPORTS[1]
  for (const theme of THEMES) {
    // inbox empty state via impossible search
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/inbox', { waitUntil: 'networkidle' })
        await page.waitForSelector('.inbox-table', { timeout: 10000 })
        await page.fill('.inbox-search input', 'zzz-no-such-email')
        await page.waitForSelector('.inbox-empty', { timeout: 5000 })
        const m = await measurePage(page)
        const shot = path.join(scratchDir, `inbox-empty-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        states.push({
          state: 'inbox-empty',
          theme,
          ok: true,
          text: (await page.locator('.inbox-empty').innerText()).trim(),
          overflowExcess: m.overflow.excess
        })
      } catch (e) {
        states.push({ state: 'inbox-empty', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // inbox loading state via delayed fixture chunk
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.route('**/assets/inbox-fixture-*.js', async (r) => {
          await new Promise((res) => setTimeout(res, 2500))
          await r.continue()
        })
        await page.goto(BASE_URL + '/inbox', { waitUntil: 'commit' })
        await page.waitForSelector('.inbox-loading', { timeout: 8000 })
        const shot = path.join(scratchDir, `inbox-loading-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        states.push({ state: 'inbox-loading', theme, ok: true, note: 'skeleton rendered' })
      } catch (e) {
        states.push({ state: 'inbox-loading', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // inbox error state via failed fixture chunk
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.route('**/assets/inbox-fixture-*.js', (r) => r.fulfill({ status: 500, body: 'x' }))
        await page.goto(BASE_URL + '/inbox', { waitUntil: 'networkidle' })
        await page.waitForSelector('.inbox-error', { timeout: 8000 })
        const shot = path.join(scratchDir, `inbox-error-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        const txt = await page.locator('.inbox-error').innerText()
        states.push({ state: 'inbox-error', theme, ok: true, text: txt.trim().slice(0, 300) })
      } catch (e) {
        states.push({ state: 'inbox-error', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // email held state (email_507 has held_review + NEEDS_REVIEW)
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/emails/email_507', { waitUntil: 'networkidle' })
        await page.waitForSelector('.attachment-preflight, .email-detail-error, .held-review', {
          timeout: 10000
        })
        await page.waitForTimeout(300)
        const shot = path.join(scratchDir, `email-held-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        const held = await page.locator('.held-review, [class*="held"]').count()
        const m = await measurePage(page)
        states.push({
          state: 'email-held',
          theme,
          ok: true,
          heldEls: held,
          overflowExcess: m.overflow.excess,
          text: (await page.evaluate('document.body.innerText')).slice(0, 600)
        })
      } catch (e) {
        states.push({ state: 'email-held', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // email error state (unknown id)
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/emails/email_999', { waitUntil: 'networkidle' })
        await page.waitForSelector('.email-detail-error', { timeout: 10000 })
        const shot = path.join(scratchDir, `email-error-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        const txt = await page.locator('.email-detail-error').innerText()
        states.push({ state: 'email-error', theme, ok: true, text: txt.trim().slice(0, 200) })
      } catch (e) {
        states.push({ state: 'email-error', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // review reconciliation tab (queue is the default; capture the second tab)
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/review?tab=reconciliation', { waitUntil: 'networkidle' })
        await page.waitForSelector('.recon-outcomes-table, .recon-error, .recon-loading', { timeout: 10000 })
        await page.waitForTimeout(300)
        const shot = path.join(scratchDir, `review-reconciliation-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        const m = await measurePage(page)
        const t = await tabWalk(page)
        states.push({
          state: 'review-reconciliation',
          theme,
          ok: true,
          overflowExcess: m.overflow.excess,
          overflowOffenders: m.overflow.offenders.slice(0, 10),
          innerText: m.innerText,
          focusableReached: t.sequence.length,
          trap: t.trap,
          unreached: t.unreached.slice(0, 15),
          contrastFailures: m.contrast.textFailures.slice(0, 20),
          focusRingToken: m.focusRingToken
        })
      } catch (e) {
        states.push({ state: 'review-reconciliation', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // graph table view (accessible alternative to the canvas)
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/graph', { waitUntil: 'networkidle' })
        await page.waitForSelector('.control-graph', { timeout: 10000 })
        await page.getByRole('button', { name: 'Table view' }).click()
        await page.waitForSelector('.graph-table table', { timeout: 8000 })
        const shot = path.join(scratchDir, `graph-table-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        const m = await measurePage(page)
        const t = await tabWalk(page)
        states.push({
          state: 'graph-table',
          theme,
          ok: true,
          overflowExcess: m.overflow.excess,
          overflowOffenders: m.overflow.offenders.slice(0, 10),
          innerText: m.innerText,
          focusableReached: t.sequence.length,
          trap: t.trap,
          unreached: t.unreached.slice(0, 15),
          contrastFailures: m.contrast.textFailures.slice(0, 20)
        })
      } catch (e) {
        states.push({ state: 'graph-table', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
    // review queue item detail (open the Inspect detail -> held/exception states)
    {
      const { context, page } = await newPage(browser, { viewport, theme, auth: true, reducedMotion: false })
      try {
        await page.goto(BASE_URL + '/review', { waitUntil: 'networkidle' })
        await page.waitForSelector('.rq-table', { timeout: 10000 })
        const inspect = page.getByRole('button', { name: /^Inspect / }).first()
        await inspect.click()
        await page.waitForSelector('.rq-detail', { timeout: 8000 })
        const shot = path.join(scratchDir, `review-detail-${theme}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        states.push({
          state: 'review-detail',
          theme,
          ok: true,
          text: (await page.locator('.rq-detail').innerText()).trim().slice(0, 500)
        })
      } catch (e) {
        states.push({ state: 'review-detail', theme, ok: false, error: String(e.message).slice(0, 200) })
      } finally {
        await context.close()
      }
    }
  }
  return states
}

async function authFlowCheck(browser) {
  const { context, page } = await newPage(browser, {
    viewport: VIEWPORTS[1],
    theme: 'light',
    auth: false,
    reducedMotion: false
  })
  try {
    await page.goto(BASE_URL + '/auth', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Sign in as Guest' }).click()
    await page.waitForURL('**/inbox', { timeout: 8000 })
    const session = await page.evaluate(`sessionStorage.getItem('ladinglens-guest-session') !== null`)
    return { ok: true, landedOn: page.url(), sessionWritten: session }
  } catch (e) {
    return { ok: false, error: String(e.message).slice(0, 300) }
  } finally {
    await context.close()
  }
}

async function main() {
  fs.mkdirSync(SCREENS_DIR, { recursive: true })
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue41-'))
  console.log(`[capture] scratch dir: ${scratchDir}`)

  const server = await ensureServer()
  const browser = await playwright[BROWSER_NAME].launch()
  const browserVersion = browser.version()
  console.log(`[capture] ${BROWSER_NAME} ${browserVersion}`)

  const results = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    browser: `${BROWSER_NAME} ${browserVersion} (Playwright headless)`,
    commit: null,
    routes: [],
    states: [],
    authFlow: null
  }
  try {
    results.commit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim()
  } catch {
    /* leave null */
  }

  results.authFlow = await authFlowCheck(browser)

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        process.stdout.write(`[capture] ${route.slug} ${viewport.name} ${theme} ... `)
        const rec = await captureRoute(browser, route, viewport, theme)
        const m = await motionOnly(browser, route, viewport, theme)
        rec.motionReduced = m.motionReduced
        results.routes.push(rec)
        console.log(`done (excess=${rec.overflow ? rec.overflow.excess : 'ERR'})`)
      }
    }
  }

  console.log('[capture] capturing states')
  results.states = await captureStates(browser, scratchDir)

  await browser.close()
  if (server) server.kill()

  // Jargon scan over collected innerText.
  const SNAKE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g
  const SCREAM = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g
  for (const rec of results.routes) {
    const text = rec.innerText || ''
    const hits = new Map()
    const addHits = (re, kind) => {
      for (const match of text.matchAll(re)) {
        const start = Math.max(0, match.index - 40)
        const ctx = text
          .slice(start, match.index + match[0].length + 40)
          .replace(/\s+/g, ' ')
          .trim()
        const key = match[0]
        const prev = hits.get(key) || { string: match[0], kind, count: 0, example: ctx }
        prev.count++
        hits.set(key, prev)
      }
    }
    addHits(SNAKE, 'snake_case')
    addHits(SCREAM, 'SCREAMING_SNAKE')
    rec.jargonCandidates = [...hits.values()].sort((a, b) => a.string.localeCompare(b.string))
    delete rec.innerText
  }
  for (const st of results.states) {
    if (!st.innerText) continue
    const text = st.innerText
    const hits = new Map()
    for (const re of [SNAKE, SCREAM]) {
      for (const match of text.matchAll(re)) {
        const start = Math.max(0, match.index - 40)
        const ctx = text
          .slice(start, match.index + match[0].length + 40)
          .replace(/\s+/g, ' ')
          .trim()
        const prev = hits.get(match[0]) || { string: match[0], count: 0, example: ctx }
        prev.count++
        hits.set(match[0], prev)
      }
    }
    st.jargonCandidates = [...hits.values()].sort((a, b) => a.string.localeCompare(b.string))
    delete st.innerText
  }

  // Move uncommitted screenshot sizes out of the committed set.
  const keepRe = new RegExp(`-${COMMIT_VIEWPORT}-(light|dark)\\.png$`)
  const moved = []
  for (const f of fs.readdirSync(SCREENS_DIR)) {
    if (!f.endsWith('.png')) continue
    if (!keepRe.test(f)) {
      const from = path.join(SCREENS_DIR, f)
      const to = path.join(scratchDir, 'screens', f)
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.copyFileSync(from, to)
      fs.unlinkSync(from)
      moved.push(f)
    }
  }
  if (process.env.KEEP_UNCOMMITTED_SHOTS === '1') {
    for (const f of moved) {
      fs.copyFileSync(path.join(scratchDir, 'screens', f), path.join(SCREENS_DIR, f))
    }
    console.log(`[capture] kept ${moved.length} uncommitted shots in screens/`)
  } else {
    console.log(`[capture] ${moved.length} non-${COMMIT_VIEWPORT} shots moved to ${scratchDir}/screens`)
  }

  results.scratchDir = scratchDir
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
  console.log(`[capture] wrote ${RESULTS_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
