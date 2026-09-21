#!/usr/bin/env node
/**
 * Issue #41 deployed-build sanity check.
 *
 * Drives the public Cloud Run deployment with Playwright Chromium:
 *   1. Guest auth: /auth -> "Sign in as Guest" -> lands on /inbox.
 *   2. Public /judge: loads without auth shell, upload panel renders,
 *      a live SI+BL upload is attempted, and the PREPARED FALLBACK panel
 *      is confirmed labelled if the run fails.
 *   3. /settings Reset All: opens the confirm dialog, confirms, and
 *      verifies the success status. Guest-scoped by design.
 *
 * Run: node docs/verification/issue-41/deployed-check.mjs
 * Env: BASE_URL (default https://averis-222536409832.asia-southeast1.run.app)
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ISSUE_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(ISSUE_DIR, '../../..')
const WEB_DIR = path.join(REPO_ROOT, 'apps/web')
const BASE_URL = process.env.BASE_URL ?? 'https://averis-222536409832.asia-southeast1.run.app'
const ATTACH_DIR = path.join(REPO_ROOT, 'data/sdoc-hackathon-bundle/attachments')
const SI_FILE = path.join(ATTACH_DIR, 'email_377_SI.txt')
const BL_FILE = path.join(ATTACH_DIR, 'email_378_BL.txt')

const require = createRequire(path.join(WEB_DIR, 'package.json'))
const { chromium } = require('playwright')

const out = { baseUrl: BASE_URL, checkedAt: new Date().toISOString(), checks: {} }

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + String(err).slice(0, 200)))

  // 1. Guest auth on the deployed build.
  try {
    await page.goto(BASE_URL + '/auth', { waitUntil: 'networkidle', timeout: 30000 })
    await page.getByRole('button', { name: 'Sign in as Guest' }).click()
    await page.waitForURL('**/inbox', { timeout: 15000 })
    await page.waitForSelector('.inbox-table, .inbox-error, .inbox-empty', { timeout: 20000 })
    out.checks.guestAuth = { ok: true, landedOn: page.url() }
  } catch (e) {
    out.checks.guestAuth = { ok: false, error: String(e.message).slice(0, 300) }
  }

  // 2. Public /judge in a fresh context (no guest session) — must still render.
  {
    const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const pp = await pub.newPage()
    try {
      await pp.goto(BASE_URL + '/judge', { waitUntil: 'networkidle', timeout: 30000 })
      await pp.waitForSelector('.judge-view', { timeout: 15000 })
      // Policy fetch will 401 without a session; the page must degrade to a
      // visible error or the upload panel, not a blank screen.
      const bodyText = await pp.evaluate('document.body.innerText')
      out.checks.judgePublicNoSession = {
        ok: true,
        rendered: true,
        hasUploadOrError: /upload rules|Upload|could not|synthetic/i.test(bodyText)
      }
    } catch (e) {
      out.checks.judgePublicNoSession = { ok: false, error: String(e.message).slice(0, 300) }
    }
    await pub.close()
  }

  // 3. /judge live upload inside the guest session.
  try {
    await page.goto(BASE_URL + '/judge', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('.judge-view', { timeout: 15000 })
    // Wait for policy: either the upload form or the policy error.
    const uploadReady = await page
      .waitForSelector('input[type="file"]', { timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    out.checks.judgePolicy = { ok: uploadReady }
    if (uploadReady) {
      const inputs = await page.$$('input[type="file"]')
      // Slot order follows the UploadPanel layout: SI first, draft BL second.
      if (inputs.length >= 2) {
        await inputs[0].setInputFiles(SI_FILE)
        await inputs[1].setInputFiles(BL_FILE)
      } else {
        await inputs[0].setInputFiles([SI_FILE, BL_FILE])
      }
      await page.getByRole('checkbox', { name: /synthetic/i }).click()
      const submit = page.getByRole('button', { name: 'Check documents' })
      await submit.click()
      // Live Gemini extraction can take a while; wait up to 120s for a
      // terminal state (result, failure panel, or submit error).
      const terminal = await page
        .waitForSelector(
          '.judge-result, .judge-submit-error, .prepared-fallback-panel, .judge-failure, [role="alert"]',
          {
            timeout: 120000
          }
        )
        .catch(() => null)
      const fallbackLabelled = await page.locator('.prepared-fallback-panel').count()
      const bodyText = (await page.evaluate('document.body.innerText')).slice(0, 2000)
      out.checks.judgeLiveRun = {
        terminalReached: !!terminal,
        fallbackPanelShown: fallbackLabelled > 0,
        fallbackDisclosure: /PREPARED FALLBACK/i.test(bodyText),
        excerpt: bodyText.slice(0, 600)
      }
      await page.screenshot({ path: path.join(ISSUE_DIR, 'screens', 'judge-deployed-1440x900.png'), fullPage: true })
    }
  } catch (e) {
    out.checks.judgeLiveRun = { ok: false, error: String(e.message).slice(0, 300) }
  }

  // 4. /settings Reset All (guest-scoped).
  try {
    await page.goto(BASE_URL + '/settings', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('.settings-section', { timeout: 15000 })
    await page.getByRole('button', { name: 'Reset All' }).click()
    const dialog = page.locator('.confirm-dialog')
    await dialog.waitFor({ timeout: 8000 })
    await dialog.getByRole('button', { name: 'Reset all' }).click()
    await page.waitForSelector('.settings-reset-status', { timeout: 60000 })
    await page.waitForFunction(
      () => document.querySelector('.settings-reset-status')?.textContent?.includes('clean workspace'),
      { timeout: 60000 }
    )
    const status = await page.locator('.settings-reset-status').innerText()
    out.checks.resetAll = { ok: true, status: status.trim() }
  } catch (e) {
    out.checks.resetAll = { ok: false, error: String(e.message).slice(0, 300) }
  }

  out.consoleErrors = consoleErrors
  await context.close()
  await browser.close()

  console.log(JSON.stringify(out, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
