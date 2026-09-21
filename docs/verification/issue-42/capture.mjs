// Issue 42 acceptance capture driver.
//
// Walks the deployed preliminary build as a first-time user and captures the
// screenshots referenced by browser-evidence.md. Requires a fresh synthetic
// SI/BL pair on disk (files/uat_si.txt, files/uat_bl.txt — not committed;
// any unseen synthetic pair works).
//
//   PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright bun run capture.mjs
//
// Environment: BASE_URL (default the deployed Cloud Run URL), OUT (default
// ./screens). Read-only against the app except for one judge run and one
// Reset All inside a throwaway guest session.

import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'https://averis-222536409832.asia-southeast1.run.app'
const OUT = new URL('./screens/', import.meta.url).pathname
const SI = new URL('./files/uat_si.txt', import.meta.url).pathname
const BL = new URL('./files/uat_bl.txt', import.meta.url).pathname

const shot = (page, name, fullPage = true) =>
  page.screenshot({ path: `${OUT}${name}.png`, fullPage })

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.setDefaultTimeout(25000)

// auth -> guest sign-in -> inbox counts
await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' })
await shot(page, 'auth-two-pane')
await page.getByRole('button', { name: /guest/i }).first().click()
await page.waitForURL(/\/inbox/)
await page.waitForFunction(() => /520/.test(document.body.innerText), { timeout: 30000 })
await shot(page, 'inbox-520-counts')

// email_507 refusal
await page.goto(`${BASE}/emails/email_507`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/507/', { timeout: 20000 })
await shot(page, 'email-507-refusal')

// /judge live check with the fresh pair (also proves no-account reachability
// in a storage-empty context — run this file in a fresh context to verify)
await page.goto(`${BASE}/judge`, { waitUntil: 'networkidle' })
await page.waitForSelector('.drop-zone-input', { state: 'attached' })
await shot(page, 'judge-upload')
await page.locator('input.drop-zone-input').first().setInputFiles(SI)
await page.waitForSelector(`text=/uat_si/`)
// the filled slot's DropZone unmounts; the remaining input is the BL slot
await page.locator('input.drop-zone-input').first().setInputFiles(BL)
await page.waitForSelector(`text=/uat_bl/`)
await page.locator('[role=checkbox]').first().click()
await page.getByRole('button', { name: /check documents/i }).click()
await page.waitForSelector('.judge-result, [role=alert]', { timeout: 240000 })
await shot(page, 'judge-live-result')
await page.locator('.judge-result [class*=value], .judge-result a, .judge-result td button').first().click()
await page.waitForTimeout(1200)
await shot(page, 'judge-evidence-click')

// review queue + reconciliation (SYN-042 peak, CSV import)
await page.goto(`${BASE}/review`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/SYN-042|Review queue/', { timeout: 25000 })
await shot(page, 'review-queue')
await page.locator('button, [role=tab]').filter({ hasText: /reconciliation/i }).first().click()
await page.waitForSelector('text=/MISSING CASE/i', { timeout: 20000 })
await shot(page, 'reconciliation-missing-case')

// tooltips: hover, focus, click on any .tooltip-trigger
await page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle' })
await page.waitForSelector('.tooltip-trigger')
const trig = page.locator('.tooltip-trigger').first()
await trig.hover()
await page.waitForSelector('[role=tooltip]')
await shot(page, 'tooltip-hover')
await page.mouse.move(5, 5)
await trig.focus()
await page.waitForSelector('[role=tooltip]')
await shot(page, 'tooltip-focus')

// settings reset
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /reset all/i }).click()
await page.waitForTimeout(500)
await shot(page, 'settings-reset-dialog')
await page.getByRole('button', { name: /reset|confirm/i }).last().click()
await page.waitForTimeout(2500)
await shot(page, 'settings-reset-done')

await browser.close()
console.log('captures written to', OUT)
