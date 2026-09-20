import { createRequire } from 'node:module'
import { cp, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { auditCapture, validateWorkflowModule } from './contract.mjs'
import { scrollAt } from './motion.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function requireValue(name, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required.`)
  }
  return value.trim()
}

function validateWeb(value) {
  const web = requireValue('DEMO_WEB', value)
  let url
  try {
    url = new URL(web)
  } catch {
    throw new Error('DEMO_WEB must be an absolute HTTP(S) URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('DEMO_WEB must be an absolute HTTP(S) URL.')
  }
  return url.href
}

function isWithin(parent, child) {
  const path = relative(parent, child)
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

async function canonicalizePath(path) {
  const missing = []
  let ancestor = path

  while (true) {
    try {
      return resolve(await realpath(ancestor), ...missing)
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
        throw error
      }
      const parent = dirname(ancestor)
      if (parent === ancestor) {
        throw error
      }
      missing.unshift(basename(ancestor))
      ancestor = parent
    }
  }
}

async function resolveOutputDirectory(value) {
  if (value !== undefined && value.trim() === '') {
    throw new Error('DEMO_DIR cannot be empty.')
  }

  const scratchRoot = resolve(tmpdir())
  const output = resolve(value || resolve(scratchRoot, 'averis-demo'))
  if (output === parse(output).root) {
    throw new Error('DEMO_DIR cannot be the filesystem root.')
  }
  if (output === repositoryRoot || isWithin(repositoryRoot, output)) {
    throw new Error('DEMO_DIR must be outside the repository.')
  }
  if (output === scratchRoot || !isWithin(scratchRoot, output)) {
    throw new Error('DEMO_DIR must be contained in the scratch directory.')
  }

  const canonicalScratchRoot = await realpath(scratchRoot)
  const canonicalOutput = await canonicalizePath(output)
  if (
    canonicalOutput === canonicalScratchRoot ||
    !isWithin(canonicalScratchRoot, canonicalOutput)
  ) {
    throw new Error('DEMO_DIR must be contained in the scratch directory.')
  }
  return canonicalOutput
}

async function cleanOutputDirectory(output) {
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
}

async function moveFile(source, destination) {
  try {
    await rename(source, destination)
  } catch (error) {
    if (error.code !== 'EXDEV') {
      throw error
    }
    await cp(source, destination)
    await rm(source, { force: true })
  }
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack
  }
}

function resolvePlaywright(output) {
  const scratchRequire = createRequire(pathToFileURL(resolve(output, 'package.json')))
  const repositoryRequire = createRequire(import.meta.url)

  try {
    return scratchRequire.resolve('playwright')
  } catch {
    try {
      return repositoryRequire.resolve('playwright')
    } catch {
      throw new Error('Playwright is not installed in the scratch or repository directory.')
    }
  }
}

async function loadPlaywright(output) {
  const module = await import(pathToFileURL(resolvePlaywright(output)).href)
  const chromium = module.chromium || module.default?.chromium
  if (!chromium) {
    throw new Error('The resolved Playwright module does not provide Chromium.')
  }
  return chromium
}

export async function runCapture(environment = process.env) {
  const web = validateWeb(environment.DEMO_WEB)
  const workflowValue = requireValue('DEMO_WORKFLOW', environment.DEMO_WORKFLOW)
  const workflowUrl = pathToFileURL(resolve(workflowValue)).href
  const output = await resolveOutputDirectory(environment.DEMO_DIR)
  await cleanOutputDirectory(output)

  const errors = []
  const beats = []
  let filmed = {}
  let requiredBeats = []
  let audit = auditCapture(requiredBeats, beats, filmed)
  let failure
  let browser
  let context
  let page
  let video

  try {
    const workflowModule = validateWorkflowModule(await import(workflowUrl))
    requiredBeats = workflowModule.requiredBeats
    filmed = Object.fromEntries(requiredBeats.map((name) => [name, 0]))

    const chromium = await loadPlaywright(output)
    const launchOptions = { headless: true }
    if (environment.DEMO_CHANNEL?.trim()) {
      launchOptions.channel = environment.DEMO_CHANNEL.trim()
    }
    browser = await chromium.launch(launchOptions)
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: output, size: { width: 1440, height: 900 } }
    })
    page = await context.newPage()
    page.on('pageerror', (error) => errors.push({ type: 'pageerror', ...serializeError(error) }))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push({ type: 'console', message: message.text() })
      }
    })
    video = page.video()

    const startedAt = performance.now()
    const mark = (name) => beats.push({ name, ms: Math.round(performance.now() - startedAt) })
    await workflowModule.workflow({
      page,
      web,
      mark,
      pause: (milliseconds) => page.waitForTimeout(milliseconds),
      filmed,
      motion: { scrollAt }
    })
    audit = auditCapture(requiredBeats, beats, filmed)
    if (!audit.complete) {
      failure = new Error('Capture did not satisfy the workflow contract.')
    }
  } catch (error) {
    failure = error
    errors.push({ type: 'capture', ...serializeError(error) })
  } finally {
    try {
      await context?.close()
    } catch (error) {
      failure ||= error
      errors.push({ type: 'context-close', ...serializeError(error) })
    }
    try {
      await browser?.close()
    } catch (error) {
      failure ||= error
      errors.push({ type: 'browser-close', ...serializeError(error) })
    }
  }

  audit = auditCapture(requiredBeats, beats, filmed)

  let videoPath
  try {
    videoPath = await video?.path()
  } catch (error) {
    failure ||= error
    errors.push({ type: 'video', ...serializeError(error) })
  }

  if (!videoPath) {
    failure ||= new Error('Capture did not produce a video.')
    errors.push({ type: 'video', ...serializeError(failure) })
  }

  let complete = !failure && audit.complete
  try {
    if (videoPath) {
      await moveFile(videoPath, resolve(output, complete ? 'capture.webm' : 'failed-capture.webm'))
    }
  } catch (error) {
    failure ||= error
    errors.push({ type: 'video-move', ...serializeError(error) })
  }
  complete = !failure && audit.complete

  await writeFile(resolve(output, 'beats.json'), `${JSON.stringify(beats, null, 2)}\n`)
  if (!complete || errors.length > 0) {
    await writeFile(
      resolve(output, 'capture-errors.json'),
      `${JSON.stringify({ audit, errors }, null, 2)}\n`
    )
  }

  if (failure || !audit.complete) {
    process.exitCode = 1
    return { complete: false, output, audit, errors }
  }

  return { complete: true, output, audit, errors }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCapture().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
