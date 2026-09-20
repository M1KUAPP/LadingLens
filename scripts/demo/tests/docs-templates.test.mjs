import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../..', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const documentationPaths = [
  'docs/demo/README.md',
  'docs/demo/deck/demo-day-template.html',
  'docs/demo/deck/investor-template.html',
  'docs/demo/deck/visual-prompts-template.md',
  'docs/demo/scripts/demo-day-template.md',
  'docs/demo/scripts/demo-video-director-5min-template.md',
  'docs/demo/scripts/demo-video-director-alt-template.md',
  'docs/demo/scripts/investor-evidence-template.md'
]

const demoLabels = [
  'cover',
  'audience hook',
  'current-search problem',
  'product reveal',
  'product capabilities',
  'system architecture',
  'processing pipeline',
  'grounded evidence',
  'retrieval layer',
  'assistant interaction',
  'user persona',
  'data path',
  'technology stack',
  'data model',
  'outcome',
  'privacy',
  'manual entry',
  'deployment portability',
  'roadmap',
  'close'
]
const investorLabels = [
  'cover',
  'problem',
  'landscape',
  'product with optional video',
  'engine',
  'current state',
  'buyers',
  'business model',
  'expansion',
  'pilot',
  'stack appendix',
  'numbers appendix',
  'alternatives appendix',
  'investor FAQ',
  'close'
]
const labels = (source) => [...source.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1])
const restrictedContent = [
  /<img\b/i,
  /<audio\b/i,
  /<source\b/i,
  /\b(?:src|srcset|poster)\s*=/i,
  /assets\//i,
  /\bdata:/i,
  /base64/i,
  /(?:[a-z][a-z\d+.-]*:)?\/\//i,
  /\bwww\./i,
  /\b(?:mailto|tel|ftp|file):/i,
  /\.(?:pdf|mp4|webm|mp3|wav|ogg|m4a|aac|flac|png|jpe?g|gif|webp|svg)\b/i,
  /\bqr[-_ ]?\w+/i,
  /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/,
  /(?:[$€£¥]\s*\d|\b(?:USD|EUR|GBP|MYR)\s*\d|\b\d+(?:\.\d+)?\s*(?:%|percent\b)|\b\d[\d,.]*\s*(?:x\s+faster\b|documents?\b|minutes?\s+saved\b|customers?\b|users?\b|shipments?\b|emails?\b|accuracy\b|revenue\b|savings?\b|faster\b|cheaper\b))/i
]

const assertSanitized = (path, source) => {
  for (const pattern of restrictedContent) {
    assert.doesNotMatch(source, pattern, `${path} contains restricted content matching ${pattern}`)
  }
}

const slideOpeningTags = (source) =>
  [...source.matchAll(/<section class="slide(?: active)?"[^>]*>/g)].map((match) => match[0])

test('sanitized decks have the required structure and local controls', async () => {
  const [demoDay, investor] = await Promise.all([
    read('docs/demo/deck/demo-day-template.html'),
    read('docs/demo/deck/investor-template.html')
  ])

  assert.equal((demoDay.match(/<section class="slide/g) ?? []).length, 20)
  assert.equal((investor.match(/<section class="slide/g) ?? []).length, 15)
  assert.deepEqual(labels(demoDay), demoLabels)
  assert.deepEqual(labels(investor), investorLabels)

  for (const deck of [demoDay, investor]) {
    assert.match(deck, /customElements\.define\('deck-stage'/)
    assert.match(deck, /width="1920"/)
    assert.match(deck, /height="1080"/)
    assert.match(deck, /@page/)
    assert.match(deck, /contenteditable="true"/)
    assert.match(deck, /data-note='\{[^']+\}'/)
    assert.match(deck, /localStorage/)
    assert.match(deck, /touchstart/)
    assert.match(deck, /click/)
    assert.match(deck, /ArrowRight/)
    assert.match(deck, /PageDown/)
    assert.match(deck, /requestFullscreen/)
    const openingTags = slideOpeningTags(deck)
    assert.equal(openingTags.length, labels(deck).length)
    for (const tag of openingTags) {
      const notes = [...tag.matchAll(/\bdata-note=(['"])(.*?)\1/g)]
      assert.equal(notes.length, 1, `slide must have exactly one data-note attribute: ${tag}`)
      JSON.parse(notes[0][2])
    }
    assert.match(deck, /isEditableTarget\(target\)/)
    assert.match(deck, /target\.closest\(\s*'\[contenteditable="true"\], input, textarea, select/)
    assert.match(deck, /key\(event\) \{\s*if \(this\.isEditableTarget\(event\.target\)\) return/)
    assert.match(deck, /this\.swipeThreshold = 48/)
    assert.match(deck, /if \(Math\.abs\(delta\) < this\.swipeThreshold\) return/)
    assert.match(deck, /touchstart[\s\S]*this\.isEditableTarget\(event\.target\)/)
    assert.match(deck, /touchend[\s\S]*this\.isEditableTarget\(event\.target\)/)
  }

  assert.match(investor, /key === 'f' \|\| key === 'F'/)
  assert.match(investor, /\['v', 'V', ' ', 'Spacebar'\]/)
  assert.match(investor, /key === 'a' \|\| key === 'A'/)
  assert.match(investor, /key === 'b' \|\| key === 'B'/)
  assert.match(investor, /key === 'c' \|\| key === 'C'/)
  assert.match(investor, /key === 'q' \|\| key === 'Q'/)
  assert.match(investor, /key === 'r' \|\| key === 'R'/)
  assert.match(investor, /<video\b[^>]*><\/video>/)
  assert.match(investor, /this\.index === 3 && \['v', 'V', ' ', 'Spacebar'\]\.includes\(key\)/)
})

test('production formats contain editable prompt structures', async () => {
  const [director, alternate, evidence, prompts, demoScript, readme] = await Promise.all([
    read('docs/demo/scripts/demo-video-director-5min-template.md'),
    read('docs/demo/scripts/demo-video-director-alt-template.md'),
    read('docs/demo/scripts/investor-evidence-template.md'),
    read('docs/demo/deck/visual-prompts-template.md'),
    read('docs/demo/scripts/demo-day-template.md'),
    read('docs/demo/README.md')
  ])

  for (const block of ['TIME', 'ON SCREEN', 'VOICEOVER', 'PACE', 'EDITOR NOTE']) {
    assert.equal((director.match(new RegExp(`\\*\\*${block}:\\*\\*`, 'g')) ?? []).length, 7)
  }
  assert.equal((director.match(/^## Beat:/gm) ?? []).length, 7)
  assert.match(demoScript, /Alternate openings/)
  assert.match(demoScript, /Common route/)
  assert.match(demoScript, /Final talk track/)
  assert.match(demoScript, /Tiered Q&A/)
  assert.match(alternate, /Deck-to-video map/)
  assert.match(alternate, /Shot checklist/)
  assert.match(evidence, /Claim/)
  assert.match(evidence, /Fallback wording/)
  for (const card of ['Interface', 'Engine', 'Automation', 'Evidence', 'State', 'User', 'Partner', 'Pilot']) {
    assert.match(prompts, new RegExp(`${card} asset card`))
  }
  for (const authority of ['PRD.md', 'TRD.md', 'PRODUCT.md', 'demo-spine.md']) {
    assert.match(readme, new RegExp(authority.replace('.', '\\.')))
  }
  assert.match(readme, /synthetic data/i)
  assert.match(readme, /visibly labelled/i)
})

test('all documentation templates exclude fixed claims and external payloads', async () => {
  const documents = await Promise.all(documentationPaths.map(async (path) => [path, await read(path)]))

  for (const [path, source] of documents) {
    assertSanitized(path, source)
  }
})

test('sanitizer rejects inserted claims, identities, links, and payloads', () => {
  const mutations = [
    '10x faster',
    '500 documents',
    '30 minutes saved',
    '$500',
    '45%',
    'Jane Smith',
    '<video poster="clip.webm"></video>',
    'recording.webm',
    'voice.mp3',
    'portrait.png',
    'brief.PDF',
    '//example.test/path',
    'www.example.test',
    'https://example.test',
    'mailto:person@example.test',
    'data:image/png;base64,AAAA',
    '<source src="clip.webm">',
    '<video srcset="clip.webm"></video>',
    '[10x faster]',
    '[500 documents]',
    '[Jane Smith]',
    '[https://example.test/path]',
    '[data:image/png;base64,AAAA]',
    '[<video poster="clip.webm"></video>]',
    '[<source src="clip.webm">]'
  ]

  for (const mutation of mutations) {
    assert.throws(() => assertSanitized('mutation', mutation), `${mutation} must be rejected`)
  }
})
