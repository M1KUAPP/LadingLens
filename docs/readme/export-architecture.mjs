#!/usr/bin/env node
/**
 * Exports the README architecture diagram in the LadingLens design system.
 *
 * Archify (https://github.com/tt-a1i/archify) renders architecture.json into
 * a standalone HTML viewer. This script restyles that viewer with the
 * docs/DESIGN.md colour tokens and the Archivo typeface, then saves the
 * viewer's own SVG export once per colour scheme.
 *
 * Archify's SVG export resolves every theme variable with getComputedStyle
 * and copies page rules whose selector starts with `svg`, `:root` or
 * `[data-theme`, so the overrides below reach the SVG. It embeds only the
 * #archify-fonts style element's text, so Archivo is appended there as a
 * data: URI. The export carries both themes and follows the viewer's
 * prefers-color-scheme; the README's <picture> picks the file instead, so
 * each file is pinned to its scheme with data-theme on its root <svg>.
 *
 * Re-run, from the repository root. `deliver` needs `meta.output`, so give
 * it a temporary copy rather than editing architecture.json:
 *   jq '.meta.output = "architecture.html"' docs/readme/architecture.json > /tmp/architecture.json
 *   node <archify>/bin/archify.mjs deliver architecture /tmp/architecture.json /tmp/architecture.html --quality showcase
 *   node docs/readme/export-architecture.mjs /tmp/architecture.html
 *
 * Needs apps/web's dependencies (`bun install`) and Playwright's Chromium
 * (`bunx playwright install chromium`, once).
 *
 * Writes: architecture-light.svg and architecture-dark.svg beside this file.
 */

import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const README_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(README_DIR, '../../apps/web')
const require = createRequire(path.join(WEB_DIR, 'package.json'))
const { chromium } = require('playwright')

const ARCHIVO = path.join(WEB_DIR, 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2')

// docs/DESIGN.md "Colour" tokens mapped onto Archify's theme variables.
const THEMES = {
  light: {
    '--bg': '#FFFFFF', // surface/canvas
    '--mask': '#FFFFFF', // surface/canvas
    '--grid': '#F1F5F9', // surface/sunken
    '--panel': '#F8FAFB', // surface/raised
    '--panel-border': '#CBD5E1', // border/default
    '--text': '#0F172A', // text/primary
    '--text-muted': '#334155', // text/secondary
    '--text-dim': '#64748B', // text/tertiary
    '--text-faint': '#64748B', // text/tertiary
    '--arrow': '#64748B', // text/tertiary
    '--arrow-emphasis': '#0D9488', // brand/teal
    '--frontend-fill': '#E0E7FF', // state/held/fill
    '--frontend-stroke': '#4F46E5', // brand/primary
    '--backend-fill': '#CCFBF1', // state/match/fill
    '--backend-stroke': '#0D9488', // brand/teal
    '--database-fill': '#F1F5F9', // surface/sunken
    '--database-stroke': '#334155', // text/secondary
    '--cloud-fill': '#F8FAFB', // surface/raised
    '--cloud-stroke': '#64748B', // text/tertiary
    '--security-fill': '#FFF7ED', // state/mismatch/text
    '--security-stroke': '#C2410C', // brand/orange
    '--messagebus-fill': '#FFF7ED', // state/mismatch/text
    '--messagebus-stroke': '#C2410C', // brand/orange
    '--external-fill': '#FFFFFF', // surface/canvas
    '--external-stroke': '#64748B', // border/strong, dashed below
    '--region-fill': 'rgba(100, 116, 139, 0.04)' // text/tertiary, faint
  },
  dark: {
    '--bg': '#0C1115',
    '--mask': '#0C1115',
    '--grid': '#1C2630',
    '--panel': '#141D24',
    '--panel-border': '#28353F',
    '--text': '#E7EEF3',
    '--text-muted': '#B2C0CB',
    '--text-dim': '#8593A0',
    '--text-faint': '#8593A0',
    '--arrow': '#8593A0',
    '--arrow-emphasis': '#14B8A6',
    '--frontend-fill': '#1E1B4B',
    '--frontend-stroke': '#818CF8',
    '--backend-fill': '#0C2F2B',
    '--backend-stroke': '#14B8A6',
    '--database-fill': '#1C2630',
    '--database-stroke': '#B2C0CB',
    '--cloud-fill': '#141D24',
    '--cloud-stroke': '#8593A0',
    '--security-fill': 'rgba(234, 88, 12, 0.14)', // brand/orange, tinted
    '--security-stroke': '#EA580C',
    '--messagebus-fill': 'rgba(234, 88, 12, 0.14)',
    '--messagebus-stroke': '#EA580C',
    '--external-fill': '#0C1115',
    '--external-stroke': '#72829A',
    '--region-fill': 'rgba(133, 147, 160, 0.05)'
  }
}

function declarations(vars) {
  return Object.entries(vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ')
}

const tokenCss = [
  `:root, [data-theme="dark"] { ${declarations(THEMES.dark)} }`,
  `[data-theme="light"] { ${declarations(THEMES.light)} }`,
  'svg .c-region { fill: var(--region-fill); }',
  // External services share the slate neutrals, so a dashed outline marks them.
  'svg .c-external { stroke-dasharray: 5 4; }',
  "svg, svg text { font-family: 'Archivo Variable', Archivo, system-ui, sans-serif; }"
].join('\n')

const archivoFace = `
@font-face { font-family: 'Archivo Variable'; font-style: normal; font-weight: 100 900; font-display: block;
  src: url(data:font/woff2;base64,${fs.readFileSync(ARCHIVO).toString('base64')}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
`

function restyle(html) {
  const fontsOpen = '<style id="archify-fonts">'
  const at = html.indexOf(fontsOpen)
  const close = html.indexOf('</style>', at)
  if (at < 0 || close < 0) throw new Error('No #archify-fonts style element: is this an Archify HTML file?')
  const withFont = html.slice(0, close) + archivoFace + html.slice(close)
  return withFont.replace('</head>', `<style id="ladinglens-tokens">\n${tokenCss}\n</style>\n</head>`)
}

async function exportSvg(browser, pageUrl, colorScheme, outFile) {
  const context = await browser.newContext({
    colorScheme,
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()
  await page.goto(pageUrl)
  await page.evaluate(() => document.fonts.ready)
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (theme !== colorScheme) throw new Error(`Viewer opened in ${theme} theme, expected ${colorScheme}`)

  await page.click('#btn-export')
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-menu [data-format="svg"]')])
  const exported = fs.readFileSync(await download.path(), 'utf8')

  // Pin the dual-theme export to one scheme: the export's own
  // svg[data-theme="..."] rules outrank its prefers-color-scheme default.
  const root = exported.match(/<svg\b[^>]*>/)
  if (!root) throw new Error('No <svg> element in the export')
  if (/\sdata-theme=/.test(root[0])) throw new Error('The exported <svg> is already pinned to a theme')
  // .editorconfig: no trailing whitespace (the export's CSS has some), and a
  // final newline.
  const pinned = exported.replace(/<svg\b/, `<svg data-theme="${colorScheme}"`).replace(/[ \t]+$/gm, '')
  fs.writeFileSync(outFile, pinned.endsWith('\n') ? pinned : `${pinned}\n`)
  await context.close()
}

const input = process.argv[2]
if (!input) {
  console.error('Usage: node docs/readme/export-architecture.mjs <archify-delivered.html>')
  process.exit(2)
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladinglens-architecture-'))
const styled = path.join(workDir, 'architecture.html')
fs.writeFileSync(styled, restyle(fs.readFileSync(input, 'utf8')))

const browser = await chromium.launch()
try {
  for (const scheme of ['light', 'dark']) {
    const outFile = path.join(README_DIR, `architecture-${scheme}.svg`)
    await exportSvg(browser, `file://${styled}`, scheme, outFile)
    console.log(`wrote ${path.relative(process.cwd(), outFile)}`)
  }
} finally {
  await browser.close()
  fs.rmSync(workDir, { recursive: true, force: true })
}
