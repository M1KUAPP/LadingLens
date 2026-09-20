# AlaskanTuna Inbox Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver issue #36's inbox triage list and evaluation dashboard on a
typed, checked-in prepared fixture behind a seam that switches to the #30 API
without reshaping the pages.

**Architecture:** A `src/data/` seam owns domain types, the prepared fixture,
the byte-exact evaluator artifact, and integrity validation. Pages consume a
`useInboxDataset` hook that yields loading, error, and ready states; the ready
state renders only after the fixture validates exactly 520 contiguous IDs and
five evaluator keys per artifact record. All view controls reuse the in-house
Field, Menu, Button, Tooltip, StatusPill, and Scrollbar components.

**Tech Stack:** React 19, TypeScript 6, Vite 8 (`?raw` and `?url` imports),
Bun, React Router, Vitest, Testing Library, CSS custom properties.

**Spec:** `docs/DESIGN.md`, `docs/PRD.md`, `docs/TRD.md`,
`docs/research/ideation/demo-spine.md`, GitHub issues #36, #24, #30, #32.

## Global Constraints

- Use `LadingLens` as the product name. Normal UI copy uses shipping language;
  exact evaluator keys appear only inside deliberately opened downloads.
- Every colour, spacing, radius, elevation, motion, and focus value comes from
  `var(--token)` in `src/styles/tokens.css`; no component hardcodes a hex.
- Every ID, count, percentage, duration, and figure uses `type-data-*` classes
  with tabular numerals.
- Status meaning always pairs text with the in-house verdict glyph and token
  colour; never colour alone.
- No browser-native control ships. Selects use the in-house Field trigger plus
  Menu composite; scrolling uses the in-house Scrollbar.
- Secondary explanatory captions live only in the accessible Tooltip on its
  `i` trigger. Critical state and actions stay permanently visible.
- Loading shells never pre-draw a verdict; errors use `text/*` and `border/*`
  tokens, never `state/mismatch/*`.
- The prepared fixture is a dataset fixture, not live model output. Every page
  surfaces a visible `Prepared fixture` tag; no invented number is presented
  as live evaluation.
- No latency number ships while #32 is open. The latency panel renders only
  `Awaiting fresh Gemini 3.5 Flash benchmark` plus what will be measured.
- No visible em dash or en dash may ship in UI copy.
- `data/sdoc-hackathon-bundle/sample_submission.json` is copied byte-exact to
  `apps/web/src/data/sample-submission.json`; it is the only download
  artifact.
- Route-table wiring lands in the final commit so it does not collide with the
  #35 operator guard.
- Use test-first red, green, refactor cycles for behavior.

---

### Task 1: Typed domain seam, prepared fixture, and integrity validation

**Files:**

- Create: `apps/web/src/data/inbox-types.ts`
- Create: `apps/web/src/data/inbox-integrity.ts`
- Create: `apps/web/src/data/inbox-source.ts`
- Create: `apps/web/src/data/use-inbox-dataset.ts`
- Create: `apps/web/src/data/inbox-labels.ts`
- Create: `apps/web/src/data/inbox-fixture.json` (generated, checked in)
- Create: `apps/web/src/data/sample-submission.json` (byte-exact copy)
- Test: `apps/web/src/data/inbox-data.test.ts`

**Interfaces:**

- Produces: `InboxSource`, `InboxDataset`, `InboxRow`, `EvaluatorRecord`,
  `ReconciliationEntry`, `fixtureInboxSource`, `useInboxDataset(source)`,
  `validateInboxFixture`, `validateEvaluatorArtifact`, `summarizeInbox`,
  `EXPECTED_EMAIL_COUNT`, `expectedEmailIds()`, and the label maps
  `CATEGORY_LABEL`, `STATUS_LABEL`, `STATUS_KIND`, `REVIEW_REASON_LABEL`,
  `RECONCILIATION_LABEL`, `RECONCILIATION_KIND`.

- [ ] **Step 1: Write the failing data tests**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import artifactRaw from './sample-submission.json?raw'
import fixtureRaw from './inbox-fixture.json?raw'
import {
  EXPECTED_EMAIL_COUNT,
  expectedEmailIds,
  summarizeInbox,
  validateEvaluatorArtifact,
  validateInboxFixture
} from './inbox-integrity'
import type { InboxDataset } from './inbox-types'

function buildEmails(ids: string[]) {
  return ids.map((id) => ({
    email_id: id,
    sender: 'docs@example.com',
    subject: `Subject ${id}`,
    attachments: [`attachments/${id}_SI.txt`],
    outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
  }))
}

function buildArtifact(ids: string[]) {
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        category: 'GENERAL',
        status: 'OK',
        review_reason: null,
        has_defect: false,
        defect_fields: []
      }
    ])
  )
}

describe('validateInboxFixture', () => {
  it('accepts the checked-in prepared fixture', () => {
    const result = validateInboxFixture(JSON.parse(fixtureRaw))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rows).toHaveLength(EXPECTED_EMAIL_COUNT)
  })

  it('rejects a fixture that is short of the expected range', () => {
    const result = validateInboxFixture({
      emails: buildEmails(expectedEmailIds().slice(0, 519)),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_520')
  })

  it('rejects a fixture with a gap in the ID range', () => {
    const result = validateInboxFixture({
      emails: buildEmails(expectedEmailIds().filter((id) => id !== 'email_300')),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_300')
  })

  it('rejects a fixture with a duplicate ID', () => {
    const result = validateInboxFixture({
      emails: buildEmails([...expectedEmailIds(), 'email_001']),
      reconciliation: []
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_001')
  })

  it('rejects a row with an invalid outcome value', () => {
    const emails = buildEmails(expectedEmailIds())
    emails[7] = { ...emails[7], outcome: { category: 'GENERAL', status: 'UNKNOWN', review_reason: null } }
    const result = validateInboxFixture({ emails, reconciliation: [] })
    expect(result.ok).toBe(false)
  })
})

describe('validateEvaluatorArtifact', () => {
  it('accepts the checked-in artifact', () => {
    const result = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.artifact)).toHaveLength(EXPECTED_EMAIL_COUNT)
    }
  })

  it('matches the bundled sample submission byte for byte', () => {
    const bundled = readFileSync(
      new URL(
        '../../../../data/sdoc-hackathon-bundle/sample_submission.json',
        import.meta.url
      ),
      'utf8'
    )
    expect(artifactRaw).toBe(bundled)
  })

  it('rejects a record carrying a sixth key', () => {
    const artifact = buildArtifact(expectedEmailIds())
    artifact['email_001'] = { ...artifact['email_001'], confidence: 0.9 }
    expect(validateEvaluatorArtifact(artifact).ok).toBe(false)
  })

  it('rejects has_defect true with empty defect_fields', () => {
    const artifact = buildArtifact(expectedEmailIds())
    artifact['email_010'] = { ...artifact['email_010'], has_defect: true }
    expect(validateEvaluatorArtifact(artifact).ok).toBe(false)
  })

  it('rejects an artifact missing an expected ID', () => {
    const artifact = buildArtifact(expectedEmailIds())
    delete artifact['email_520']
    const result = validateEvaluatorArtifact(artifact)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.join(' ')).toContain('email_520')
  })
})

describe('summarizeInbox', () => {
  it('derives coverage and outcome counts from the dataset', () => {
    const dataset: InboxDataset = {
      source: 'prepared-fixture',
      rows: [
        {
          email_id: 'email_001',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: { category: 'BL_COMPARISON', status: 'OK', review_reason: null }
        },
        {
          email_id: 'email_002',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: { category: 'GENERAL', status: 'OK', review_reason: null }
        },
        {
          email_id: 'email_003',
          sender: 'a@example.com',
          subject: 's',
          attachments: [],
          outcome: {
            category: 'BL_COMPARISON',
            status: 'NEEDS_REVIEW',
            review_reason: 'missing_attachment'
          }
        }
      ],
      artifact: {},
      artifactUrl: '/x.json',
      reconciliation: [
        {
          shipment_id: 'SYN-001',
          booking_reference: 'SYN-BK-001',
          lifecycle: 'BL_CHECK_REQUIRED',
          outcome: 'CASE_PRESENT',
          linked_email_id: 'email_001'
        },
        {
          shipment_id: 'SYN-042',
          booking_reference: 'SYN-BK-042',
          lifecycle: 'DRAFT_BL_EXPECTED',
          outcome: 'MISSING_CASE',
          linked_email_id: null
        }
      ]
    }
    const summary = summarizeInbox(dataset)
    expect(summary.received).toBe(3)
    expect(summary.accountedFor).toBe(3)
    expect(summary.lost).toBe(0)
    expect(summary.byCategory.BL_COMPARISON).toBe(2)
    expect(summary.comparisonRows).toBe(2)
    expect(summary.comparisonByStatus.NEEDS_REVIEW).toBe(1)
    expect(summary.heldReasons.missing_attachment).toBe(1)
    expect(summary.reconciliationByOutcome.MISSING_CASE).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

Run: `bun run test src/data/inbox-data.test.ts`

Expected: FAIL because the data modules do not exist.

- [ ] **Step 3: Create the domain types**

`apps/web/src/data/inbox-types.ts`:

```ts
export type Category =
  | 'BL_COMPARISON'
  | 'SI_REQUEST'
  | 'INVOICE_QUERY'
  | 'GENERAL'
  | 'SPAM'

export type CaseStatus = 'OK' | 'MISMATCH' | 'NEEDS_REVIEW'

export type ReviewReason =
  | 'wrong_doc_type'
  | 'missing_attachment'
  | 'unreadable'
  | 'missing_value'

export type ComparedField =
  | 'shipper'
  | 'consignee'
  | 'notify_party'
  | 'port_of_loading'
  | 'port_of_discharge'
  | 'container_count'
  | 'gross_weight_kg'

export type ReconciliationOutcome =
  | 'CASE_PRESENT'
  | 'DOCUMENT_MISSING'
  | 'MISSING_CASE'
  | 'UNMATCHED_CASE'
  | 'DUPLICATE_OR_AMBIGUOUS'
  | 'SOURCE_STALE'

export type EvaluatorRecord = {
  category: Category
  status: CaseStatus
  review_reason: ReviewReason | null
  has_defect: boolean
  defect_fields: ComparedField[]
}

export type InboxOutcome = {
  category: Category
  status: CaseStatus
  review_reason: ReviewReason | null
}

export type InboxRow = {
  email_id: string
  sender: string
  subject: string
  attachments: string[]
  outcome: InboxOutcome
}

export type ReconciliationEntry = {
  shipment_id: string
  booking_reference: string
  lifecycle: string
  outcome: ReconciliationOutcome
  linked_email_id: string | null
}

export type InboxDataset = {
  source: 'prepared-fixture'
  rows: InboxRow[]
  artifact: Record<string, EvaluatorRecord>
  artifactUrl: string
  reconciliation: ReconciliationEntry[]
}

export type InboxLoadResult =
  | { kind: 'ready'; dataset: InboxDataset }
  | { kind: 'error'; problems: string[] }

export interface InboxSource {
  load(): Promise<InboxLoadResult>
}
```

- [ ] **Step 4: Create the integrity validators and summary derivation**

`apps/web/src/data/inbox-integrity.ts`:

```ts
import type {
  Category,
  CaseStatus,
  ComparedField,
  EvaluatorRecord,
  InboxDataset,
  InboxOutcome,
  InboxRow,
  ReconciliationEntry,
  ReconciliationOutcome,
  ReviewReason
} from './inbox-types'

export const EXPECTED_EMAIL_COUNT = 520

export const CATEGORIES = [
  'BL_COMPARISON',
  'SI_REQUEST',
  'INVOICE_QUERY',
  'GENERAL',
  'SPAM'
] as const

export const CASE_STATUSES = ['OK', 'MISMATCH', 'NEEDS_REVIEW'] as const

export const REVIEW_REASONS = [
  'wrong_doc_type',
  'missing_attachment',
  'unreadable',
  'missing_value'
] as const

export const COMPARED_FIELDS = [
  'shipper',
  'consignee',
  'notify_party',
  'port_of_loading',
  'port_of_discharge',
  'container_count',
  'gross_weight_kg'
] as const

export const RECONCILIATION_OUTCOMES = [
  'CASE_PRESENT',
  'DOCUMENT_MISSING',
  'MISSING_CASE',
  'UNMATCHED_CASE',
  'DUPLICATE_OR_AMBIGUOUS',
  'SOURCE_STALE'
] as const

const EVALUATOR_KEYS = [
  'category',
  'status',
  'review_reason',
  'has_defect',
  'defect_fields'
] as const

export function expectedEmailIds(): string[] {
  return Array.from(
    { length: EXPECTED_EMAIL_COUNT },
    (_, index) => `email_${String(index + 1).padStart(3, '0')}`
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOutcome(value: unknown): value is InboxOutcome {
  if (!isRecord(value)) return false
  const keys = Object.keys(value).sort().join(',')
  return (
    keys === 'category,review_reason,status' &&
    CATEGORIES.includes(value.category as Category) &&
    CASE_STATUSES.includes(value.status as CaseStatus) &&
    (value.review_reason === null ||
      REVIEW_REASONS.includes(value.review_reason as ReviewReason))
  )
}

function isInboxRow(value: unknown): value is InboxRow {
  return (
    isRecord(value) &&
    typeof value.email_id === 'string' &&
    typeof value.sender === 'string' &&
    typeof value.subject === 'string' &&
    isStringList(value.attachments) &&
    isOutcome(value.outcome)
  )
}

function isReconciliationEntry(value: unknown): value is ReconciliationEntry {
  return (
    isRecord(value) &&
    typeof value.shipment_id === 'string' &&
    typeof value.booking_reference === 'string' &&
    typeof value.lifecycle === 'string' &&
    RECONCILIATION_OUTCOMES.includes(
      value.outcome as ReconciliationOutcome
    ) &&
    (value.linked_email_id === null ||
      typeof value.linked_email_id === 'string')
  )
}

export type FixtureRowsResult =
  | { ok: true; rows: InboxRow[]; reconciliation: ReconciliationEntry[] }
  | { ok: false; problems: string[] }

export function validateInboxFixture(raw: unknown): FixtureRowsResult {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.emails) ||
    !Array.isArray(raw.reconciliation)
  ) {
    return {
      ok: false,
      problems: ['The prepared fixture does not have the expected shape.']
    }
  }
  const problems: string[] = []
  const seen = new Set<string>()
  const rows: InboxRow[] = []
  for (const entry of raw.emails) {
    if (!isInboxRow(entry)) {
      problems.push('A prepared inbox row does not match the fixture shape.')
      continue
    }
    if (seen.has(entry.email_id)) {
      problems.push(`${entry.email_id} appears twice in the prepared fixture.`)
    }
    seen.add(entry.email_id)
    rows.push(entry)
  }
  const expected = expectedEmailIds()
  for (const id of expected.filter((id) => !seen.has(id))) {
    problems.push(`${id} is missing from the prepared fixture.`)
  }
  for (const id of [...seen].filter((id) => !expected.includes(id))) {
    problems.push(`${id} is outside the expected email_001 to email_520 range.`)
  }
  const reconciliation: ReconciliationEntry[] = []
  for (const entry of raw.reconciliation) {
    if (isReconciliationEntry(entry)) {
      reconciliation.push(entry)
    } else {
      problems.push('A prepared reconciliation row does not match the shape.')
    }
  }
  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, rows, reconciliation }
}

function isEvaluatorRecord(value: unknown): value is EvaluatorRecord {
  if (!isRecord(value)) return false
  const keys = Object.keys(value).sort().join(',')
  if (keys !== [...EVALUATOR_KEYS].sort().join(',')) return false
  const { category, status, review_reason, has_defect, defect_fields } = value
  return (
    CATEGORIES.includes(category as Category) &&
    CASE_STATUSES.includes(status as CaseStatus) &&
    (review_reason === null ||
      REVIEW_REASONS.includes(review_reason as ReviewReason)) &&
    typeof has_defect === 'boolean' &&
    Array.isArray(defect_fields) &&
    defect_fields.every((field) =>
      COMPARED_FIELDS.includes(field as ComparedField)
    ) &&
    has_defect === (defect_fields.length > 0)
  )
}

export type ArtifactResult =
  | { ok: true; artifact: Record<string, EvaluatorRecord> }
  | { ok: false; problems: string[] }

export function validateEvaluatorArtifact(raw: unknown): ArtifactResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      problems: ['The submission artifact is not keyed by email ID.']
    }
  }
  const problems: string[] = []
  const expected = expectedEmailIds()
  const keys = Object.keys(raw)
  for (const id of expected.filter((id) => !keys.includes(id))) {
    problems.push(`${id} is missing from the submission artifact.`)
  }
  for (const id of keys.filter((id) => !expected.includes(id))) {
    problems.push(`${id} is outside the expected email_001 to email_520 range.`)
  }
  const artifact: Record<string, EvaluatorRecord> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isEvaluatorRecord(value)) {
      problems.push(`${id} does not match the five-key evaluator shape.`)
      continue
    }
    artifact[id] = value
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, artifact }
}

export type InboxSummary = {
  received: number
  accountedFor: number
  lost: number
  byCategory: Record<Category, number>
  comparisonRows: number
  comparisonByStatus: Record<CaseStatus, number>
  heldReasons: Partial<Record<ReviewReason, number>>
  reconciliationByOutcome: Record<ReconciliationOutcome, number>
}

export function summarizeInbox(dataset: InboxDataset): InboxSummary {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category, 0])
  ) as Record<Category, number>
  const comparisonByStatus = Object.fromEntries(
    CASE_STATUSES.map((status) => [status, 0])
  ) as Record<CaseStatus, number>
  const heldReasons: Partial<Record<ReviewReason, number>> = {}
  let accountedFor = 0
  let comparisonRows = 0
  for (const row of dataset.rows) {
    accountedFor += 1
    byCategory[row.outcome.category] += 1
    if (row.outcome.review_reason) {
      const reason = row.outcome.review_reason
      heldReasons[reason] = (heldReasons[reason] ?? 0) + 1
    }
    if (row.outcome.category === 'BL_COMPARISON') {
      comparisonRows += 1
      comparisonByStatus[row.outcome.status] += 1
    }
  }
  const reconciliationByOutcome = Object.fromEntries(
    RECONCILIATION_OUTCOMES.map((outcome) => [outcome, 0])
  ) as Record<ReconciliationOutcome, number>
  for (const entry of dataset.reconciliation) {
    reconciliationByOutcome[entry.outcome] += 1
  }
  return {
    received: dataset.rows.length,
    accountedFor,
    lost: dataset.rows.length - accountedFor,
    byCategory,
    comparisonRows,
    comparisonByStatus,
    heldReasons,
    reconciliationByOutcome
  }
}
```

- [ ] **Step 5: Create the fixture source and the dataset hook**

`apps/web/src/data/inbox-source.ts`:

```ts
import artifactRaw from './sample-submission.json?raw'
import artifactUrl from './sample-submission.json?url'
import fixtureRaw from './inbox-fixture.json?raw'
import {
  validateEvaluatorArtifact,
  validateInboxFixture
} from './inbox-integrity'
import type { InboxLoadResult, InboxSource } from './inbox-types'

function loadPreparedFixture(): InboxLoadResult {
  try {
    const fixture = validateInboxFixture(JSON.parse(fixtureRaw))
    if (!fixture.ok) return { kind: 'error', problems: fixture.problems }
    const artifact = validateEvaluatorArtifact(JSON.parse(artifactRaw))
    if (!artifact.ok) return { kind: 'error', problems: artifact.problems }
    return {
      kind: 'ready',
      dataset: {
        source: 'prepared-fixture',
        rows: fixture.rows,
        artifact: artifact.artifact,
        artifactUrl,
        reconciliation: fixture.reconciliation
      }
    }
  } catch {
    return {
      kind: 'error',
      problems: ['The prepared inbox data could not be read.']
    }
  }
}

// Fixture mode is explicit: this source reads only the checked-in prepared
// dataset until the #30 product API provides the live inbox endpoints.
export const fixtureInboxSource: InboxSource = {
  load: () => Promise.resolve().then(loadPreparedFixture)
}
```

`apps/web/src/data/use-inbox-dataset.ts`:

```ts
import { useEffect, useState } from 'react'
import { fixtureInboxSource } from './inbox-source'
import type { InboxDataset, InboxSource } from './inbox-types'

export type InboxDatasetState =
  | { status: 'loading' }
  | { status: 'error'; problems: string[] }
  | { status: 'ready'; dataset: InboxDataset }

export function useInboxDataset(
  source: InboxSource = fixtureInboxSource
): InboxDatasetState {
  const [state, setState] = useState<InboxDatasetState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void source.load().then((result) => {
      if (cancelled) return
      setState(
        result.kind === 'ready'
          ? { status: 'ready', dataset: result.dataset }
          : { status: 'error', problems: result.problems }
      )
    })
    return () => {
      cancelled = true
    }
  }, [source])
  return state
}
```

- [ ] **Step 6: Create the shipping-language label maps**

`apps/web/src/data/inbox-labels.ts`:

```ts
import type { StatusKind } from '../components/ui/types'
import type {
  CaseStatus,
  Category,
  ReconciliationOutcome,
  ReviewReason
} from './inbox-types'

export const CATEGORY_LABEL: Record<Category, string> = {
  BL_COMPARISON: 'BL comparison',
  SI_REQUEST: 'SI request',
  INVOICE_QUERY: 'Invoice query',
  GENERAL: 'General',
  SPAM: 'Spam'
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  OK: 'OK',
  MISMATCH: 'Mismatch',
  NEEDS_REVIEW: 'Needs review'
}

export const STATUS_KIND: Record<CaseStatus, StatusKind> = {
  OK: 'match',
  MISMATCH: 'mismatch',
  NEEDS_REVIEW: 'held'
}

export const REVIEW_REASON_LABEL: Record<ReviewReason, string> = {
  wrong_doc_type: 'Wrong document type',
  missing_attachment: 'Missing attachment',
  unreadable: 'Unreadable file',
  missing_value: 'Missing value'
}

export const RECONCILIATION_LABEL: Record<ReconciliationOutcome, string> = {
  CASE_PRESENT: 'Case present',
  DOCUMENT_MISSING: 'Document missing',
  MISSING_CASE: 'Missing case',
  UNMATCHED_CASE: 'Unmatched case',
  DUPLICATE_OR_AMBIGUOUS: 'Duplicate or ambiguous',
  SOURCE_STALE: 'Source stale'
}

export const RECONCILIATION_KIND: Record<ReconciliationOutcome, StatusKind> = {
  CASE_PRESENT: 'match',
  DOCUMENT_MISSING: 'mismatch',
  MISSING_CASE: 'mismatch',
  UNMATCHED_CASE: 'held',
  DUPLICATE_OR_AMBIGUOUS: 'held',
  SOURCE_STALE: 'held'
}
```

- [ ] **Step 7: Generate the prepared fixture and copy the artifact**

Copy the artifact byte-exact:

```bash
cp data/sdoc-hackathon-bundle/sample_submission.json \
  apps/web/src/data/sample-submission.json
```

Generate `apps/web/src/data/inbox-fixture.json` from the bundle inbox metadata
with this script (run once; the fixture is checked in, not built at runtime):

```bash
python3 - <<'PY'
import json

base = 'data/sdoc-hackathon-bundle'
held = {
    'email_501': 'wrong_doc_type',
    'email_502': 'wrong_doc_type',
    'email_503': 'wrong_doc_type',
    'email_507': 'missing_attachment',
    'email_509': 'missing_attachment',
    'email_511': 'unreadable',
    'email_515': 'unreadable',
    'email_516': 'missing_value',
}
emails = []
for i in range(1, 521):
    eid = f'email_{i:03d}'
    meta = json.load(open(f'{base}/inbox/{eid}.json'))
    attachments = meta['attachments']
    if eid in held:
        outcome = {
            'category': 'BL_COMPARISON',
            'status': 'NEEDS_REVIEW',
            'review_reason': held[eid],
        }
    else:
        has_pair_doc = any(
            '_SI.' in a or '_BL.' in a for a in attachments
        )
        outcome = {
            'category': 'BL_COMPARISON' if has_pair_doc else 'GENERAL',
            'status': 'OK',
            'review_reason': None,
        }
    emails.append({
        'email_id': eid,
        'sender': meta.get('from', ''),
        'subject': meta.get('subject', ''),
        'attachments': attachments,
        'outcome': outcome,
    })

fixture = {
    'emails': emails,
    'reconciliation': [
        {
            'shipment_id': 'SYN-001',
            'booking_reference': 'SYN-BK-001',
            'lifecycle': 'BL_CHECK_REQUIRED',
            'outcome': 'CASE_PRESENT',
            'linked_email_id': 'email_001',
        },
        {
            'shipment_id': 'SYN-007',
            'booking_reference': 'SYN-BK-007',
            'lifecycle': 'BL_CHECK_REQUIRED',
            'outcome': 'CASE_PRESENT',
            'linked_email_id': 'email_004',
        },
        {
            'shipment_id': 'SYN-013',
            'booking_reference': 'SYN-BK-013',
            'lifecycle': 'DRAFT_BL_EXPECTED',
            'outcome': 'CASE_PRESENT',
            'linked_email_id': 'email_009',
        },
        {
            'shipment_id': 'SYN-021',
            'booking_reference': 'SYN-BK-021',
            'lifecycle': 'BL_CHECK_REQUIRED',
            'outcome': 'DOCUMENT_MISSING',
            'linked_email_id': 'email_507',
        },
        {
            'shipment_id': 'SYN-033',
            'booking_reference': 'SYN-BK-033',
            'lifecycle': 'BL_CHECK_REQUIRED',
            'outcome': 'UNMATCHED_CASE',
            'linked_email_id': 'email_013',
        },
        {
            'shipment_id': 'SYN-042',
            'booking_reference': 'SYN-BK-042',
            'lifecycle': 'DRAFT_BL_EXPECTED',
            'outcome': 'MISSING_CASE',
            'linked_email_id': None,
        },
    ],
}
with open('apps/web/src/data/inbox-fixture.json', 'w') as fh:
    json.dump(fixture, fh, indent=1)
    fh.write('\n')
PY
```

Expected prepared counts: 126 `BL_COMPARISON` rows, 394 `GENERAL` rows,
512 `OK`, 8 `NEEDS_REVIEW` (`missing_attachment` x2, `unreadable` x2,
`wrong_doc_type` x3, `missing_value` x1), 0 `MISMATCH`.

- [ ] **Step 8: Verify red became green**

Run: `bun run test src/data/inbox-data.test.ts`

Expected: PASS, all nine tests.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/data
git commit -m "feat(web): add typed inbox fixture seam and integrity validation"
```

### Task 2: In-house Select control

**Files:**

- Create: `apps/web/src/components/ui/Select.tsx`
- Create: `apps/web/src/components/ui/select.css`
- Test: `apps/web/src/components/ui/Select.test.tsx`

**Interfaces:**

- Consumes: `Field` (`type="select"`), `Menu`, `MenuItem`.
- Produces: `Select({ label, value, options, onChange })` where
  `options: { value: string; label: string }[]`.

- [ ] **Step 1: Write the failing interaction tests**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'all', label: 'All statuses' },
  { value: 'ok', label: 'OK' },
  { value: 'held', label: 'Needs review' }
]

describe('Select', () => {
  it('opens the in-house menu from the field trigger', async () => {
    const user = userEvent.setup()
    render(<Select label="Status" value="all" options={options} onChange={() => {}} />)
    await user.click(screen.getByRole('combobox', { name: 'Status All statuses' }))
    expect(screen.getByRole('listbox', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Needs review' })).toBeInTheDocument()
  })

  it('commits the chosen option through onChange and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select label="Status" value="all" options={options} onChange={onChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Status All statuses' }))
    await user.click(screen.getByRole('option', { name: 'Needs review' }))
    expect(onChange).toHaveBeenCalledWith('held')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Select label="Status" value="all" options={options} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox', { name: 'Status All statuses' })
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run tests and observe the missing-component failure**

Run: `bun run test src/components/ui/Select.test.tsx`

Expected: FAIL because `Select.tsx` does not exist.

- [ ] **Step 3: Implement the composite control**

`apps/web/src/components/ui/Select.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Field } from './Controls'
import { Menu, MenuItem } from './Overlays'
import './select.css'

export type SelectOption = {
  value: string
  label: string
}

export function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const triggerRef: RefObject<HTMLElement | null> = {
    get current() {
      return (
        wrapRef.current?.querySelector<HTMLElement>('.field-trigger') ?? null
      )
    }
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div className="select" ref={wrapRef}>
      <Field
        type="select"
        label={label}
        value={selected?.label ?? ''}
        expanded={open}
        controls={menuId}
        onOpen={() => setOpen((current) => !current)}
      />
      {open && (
        <div id={menuId}>
          <Menu
            label={label}
            triggerRef={triggerRef}
            onClose={() => setOpen(false)}
          >
            {options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                selected={option.value === value}
                onSelect={(next) => {
                  onChange(next)
                  setOpen(false)
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </div>
      )}
    </div>
  )
}
```

`apps/web/src/components/ui/select.css`:

```css
.select {
  position: relative;
}
```

- [ ] **Step 4: Verify interactions pass**

Run: `bun run test src/components/ui/Select.test.tsx && bun run lint`

Expected: tests pass and lint exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/Select.tsx \
  apps/web/src/components/ui/Select.test.tsx \
  apps/web/src/components/ui/select.css
git commit -m "feat(web): add in-house select control"
```

### Task 3: Inbox triage list page

**Files:**

- Create: `apps/web/src/pages/InboxPage.tsx`
- Create: `apps/web/src/pages/inbox-page.css`
- Test: `apps/web/src/pages/InboxPage.test.tsx`

**Interfaces:**

- Consumes: `useInboxDataset`, `InboxSource`, `InboxDataset`, `InboxRow`,
  `summarizeInbox`, `CATEGORIES`, `CASE_STATUSES`, label maps, `Select`,
  `Field`, `Button`, `StatusPill`, `Scrollbar`, `Tooltip`.
- Produces: `InboxPage({ source = fixtureInboxSource })`.

- [ ] **Step 1: Write the failing page tests**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixtureInboxSource } from '../data/inbox-source'
import type { InboxSource } from '../data/inbox-types'
import { InboxPage } from './InboxPage'

const pendingSource: InboxSource = { load: () => new Promise(() => {}) }
const brokenSource: InboxSource = {
  load: () =>
    Promise.resolve({
      kind: 'error',
      problems: ['email_520 is missing from the prepared fixture.']
    })
}

function renderInbox(source: InboxSource = fixtureInboxSource) {
  return render(
    <MemoryRouter>
      <InboxPage source={source} />
    </MemoryRouter>
  )
}

describe('InboxPage states', () => {
  it('shows a neutral loading shell without any verdict pill', () => {
    renderInbox(pendingSource)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('[data-status]')).toBeNull()
    expect(document.querySelector('.inbox-accounting')).toBeNull()
  })

  it('renders the accounting summary and artifact link only when complete', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent(
      '520 received / 520 accounted for / 0 lost'
    )
    const link = screen.getByRole('link', { name: /Download submission JSON/ })
    expect(link).toHaveAttribute('download', 'sample_submission.json')
    expect(link.getAttribute('href')).toContain('sample-submission.json')
    expect(screen.getByText('Prepared fixture')).toBeInTheDocument()
  })

  it('hides the summary and artifact link on an integrity error', async () => {
    renderInbox(brokenSource)
    await screen.findByRole('alert')
    expect(
      screen.getByText('email_520 is missing from the prepared fixture.')
    ).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Download submission JSON/ })
    ).not.toBeInTheDocument()
  })
})

describe('InboxPage controls', () => {
  it('pages from email_001 through email_520 with a visible range', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    expect(
      screen.queryByRole('link', { name: 'email_520' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('1-50 of 520')).toBeInTheDocument()
    for (let page = 1; page < 11; page += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }))
    }
    expect(await screen.findByRole('link', { name: 'email_520' })).toBeInTheDocument()
    expect(screen.getByText('501-520 of 520')).toBeInTheDocument()
  })

  it('narrows the row set by ID search', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Search by ID' }),
      'email_512'
    )
    expect(await screen.findByRole('link', { name: 'email_512' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'email_001' })
    ).not.toBeInTheDocument()
  })

  it('filters by status and marks held rows on the held channel', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Needs review' }))
    expect(await screen.findByRole('link', { name: 'email_507' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /email_\d{3}/ })).toHaveLength(8)
    expect(
      document.querySelectorAll('.category-badge[data-channel="held"]')
    ).toHaveLength(8)
    expect(screen.getAllByText('Needs review')).toHaveLength(8)
    expect(screen.getAllByText('Missing attachment')).toHaveLength(2)
  })

  it('keeps routed rows on the neutral badge channel', async () => {
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    const badges = document.querySelectorAll(
      '.category-badge[data-channel="routed"]'
    )
    expect(badges.length).toBeGreaterThan(0)
    expect(document.querySelector('[data-channel="held"]')).toBeNull()
  })

  it('sorts the row set by ID in both directions', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Sort/ }))
    await user.click(screen.getByRole('option', { name: 'ID descending' }))
    expect(await screen.findByRole('link', { name: 'email_520' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'email_001' })
    ).not.toBeInTheDocument()
  })

  it('switches row density', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.click(screen.getByRole('combobox', { name: /Density/ }))
    await user.click(screen.getByRole('option', { name: 'Compact' }))
    expect(document.querySelector('.inbox-table')).toHaveAttribute(
      'data-density',
      'compact'
    )
  })

  it('shows an honest empty state when filters match nothing', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: 'email_001' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Search by ID' }),
      'zzz'
    )
    expect(
      await screen.findByText('No emails match the current filters.')
    ).toBeInTheDocument()
    expect(document.querySelector('.inbox-accounting')).toHaveTextContent(
      '520 received / 520 accounted for / 0 lost'
    )
  })
})
```

- [ ] **Step 2: Run tests and observe the missing-page failure**

Run: `bun run test src/pages/InboxPage.test.tsx`

Expected: FAIL because `InboxPage.tsx` does not exist.

- [ ] **Step 3: Implement the page**

`apps/web/src/pages/InboxPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import Download01Icon from '@hugeicons/core-free-icons/Download01Icon'
import { Button, Field } from '../components/ui/Controls'
import { Scrollbar, StatusPill } from '../components/ui/Domain'
import { Tooltip } from '../components/ui/Overlays'
import { Select } from '../components/ui/Select'
import {
  CASE_STATUSES,
  CATEGORIES,
  summarizeInbox
} from '../data/inbox-integrity'
import {
  CATEGORY_LABEL,
  REVIEW_REASON_LABEL,
  STATUS_KIND,
  STATUS_LABEL
} from '../data/inbox-labels'
import { fixtureInboxSource } from '../data/inbox-source'
import { useInboxDataset } from '../data/use-inbox-dataset'
import type {
  InboxDataset,
  InboxRow,
  InboxSource
} from '../data/inbox-types'
import './inbox-page.css'

const PAGE_SIZE = 50

function CategoryBadge({ row }: { row: InboxRow }) {
  const held = row.outcome.status === 'NEEDS_REVIEW'
  return (
    <span
      className="category-badge"
      data-channel={held ? 'held' : 'routed'}
    >
      {CATEGORY_LABEL[row.outcome.category]}
    </span>
  )
}

function InboxRowView({ row }: { row: InboxRow }) {
  const outcome = row.outcome
  return (
    <tr>
      <td>
        <Link className="inbox-id type-data-md" to={`/emails/${row.email_id}`}>
          {row.email_id}
        </Link>
      </td>
      <td>
        <span className="inbox-subject">{row.subject}</span>
      </td>
      <td>
        <CategoryBadge row={row} />
      </td>
      <td>
        <span className="inbox-status-cell">
          <StatusPill status={STATUS_KIND[outcome.status]}>
            {STATUS_LABEL[outcome.status]}
          </StatusPill>
          {outcome.review_reason ? (
            <span className="inbox-reason type-data-sm">
              {REVIEW_REASON_LABEL[outcome.review_reason]}
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  )
}

function InboxLoading() {
  return (
    <div className="inbox-loading" role="status" aria-label="Loading inbox">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="inbox-skeleton-row" key={index}>
          <span className="inbox-skeleton-bar inbox-skeleton-bar--id" />
          <span className="inbox-skeleton-bar" />
          <span className="inbox-skeleton-bar inbox-skeleton-bar--badge" />
          <span className="inbox-skeleton-bar inbox-skeleton-bar--badge" />
        </div>
      ))}
      <span className="inbox-skeleton-note">Loading prepared inbox data.</span>
    </div>
  )
}

function InboxError({ problems }: { problems: string[] }) {
  return (
    <div className="inbox-error" role="alert">
      <h2 className="type-heading-sm">
        The prepared inbox data could not be verified
      </h2>
      <p>
        No accounting summary or submission artifact is shown until the
        prepared data verifies.
      </p>
      <ul className="inbox-error-list">
        {problems.map((problem) => (
          <li className="type-data-sm" key={problem}>
            {problem}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InboxBoard({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable'
  )
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [query, category, status, direction])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return dataset.rows
      .filter((row) => {
        if (term && !row.email_id.toLowerCase().includes(term)) return false
        if (category !== 'all' && row.outcome.category !== category) {
          return false
        }
        if (status !== 'all' && row.outcome.status !== status) return false
        return true
      })
      .sort((a, b) => {
        const first = Number(a.email_id.slice(6))
        const second = Number(b.email_id.slice(6))
        return direction === 'asc' ? first - second : second - first
      })
  }, [dataset.rows, query, category, status, direction])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  return (
    <>
      <div className="inbox-summary">
        <span className="inbox-fixture-tag">Prepared fixture</span>
        <p className="inbox-accounting">
          <span className="type-data-md">{summary.received}</span> received
          {' / '}
          <span className="type-data-md">{summary.accountedFor}</span>{' '}
          accounted for
          {' / '}
          <span className="type-data-md">{summary.lost}</span> lost
        </p>
        <a
          className="inbox-download"
          href={dataset.artifactUrl}
          download="sample_submission.json"
        >
          <HugeiconsIcon icon={Download01Icon} size={16} aria-hidden="true" />
          Download submission JSON
        </a>
      </div>
      <div className="inbox-controls">
        <div className="inbox-search">
          <Field
            type="search"
            label="Search by ID"
            value={query}
            placeholder="email_001"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)
            }
          />
        </div>
        <Select
          label="Category"
          value={category}
          options={[
            { value: 'all', label: 'All categories' },
            ...CATEGORIES.map((value) => ({
              value,
              label: CATEGORY_LABEL[value]
            }))
          ]}
          onChange={setCategory}
        />
        <Select
          label="Status"
          value={status}
          options={[
            { value: 'all', label: 'All statuses' },
            ...CASE_STATUSES.map((value) => ({
              value,
              label: STATUS_LABEL[value]
            }))
          ]}
          onChange={setStatus}
        />
        <Select
          label="Sort"
          value={direction}
          options={[
            { value: 'asc', label: 'ID ascending' },
            { value: 'desc', label: 'ID descending' }
          ]}
          onChange={(next) => setDirection(next as 'asc' | 'desc')}
        />
        <Select
          label="Density"
          value={density}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' }
          ]}
          onChange={(next) => setDensity(next as 'comfortable' | 'compact')}
        />
      </div>
      {pageRows.length === 0 ? (
        <p className="inbox-empty">No emails match the current filters.</p>
      ) : (
        <>
          <div className="inbox-scroll">
            <Scrollbar label="Inbox emails">
              <table className="inbox-table" data-density={density}>
                <thead>
                  <tr>
                    <th scope="col" className="type-data-xs">
                      ID
                    </th>
                    <th scope="col" className="type-data-xs">
                      Subject
                    </th>
                    <th scope="col" className="type-data-xs">
                      Category
                    </th>
                    <th scope="col" className="type-data-xs">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <InboxRowView key={row.email_id} row={row} />
                  ))}
                </tbody>
              </table>
            </Scrollbar>
          </div>
          <nav className="inbox-pagination" aria-label="Inbox pages">
            <Button
              variant="secondary"
              disabled={current <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
              Previous
            </Button>
            <span className="inbox-range type-data-sm">
              {start + 1}-{start + pageRows.length} of {filtered.length}
            </span>
            <Button
              variant="secondary"
              disabled={current >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
          </nav>
        </>
      )}
    </>
  )
}

export function InboxPage({
  source = fixtureInboxSource
}: {
  source?: InboxSource
}) {
  const state = useInboxDataset(source)
  return (
    <div className="inbox-view">
      <header className="inbox-head">
        <h1 className="type-heading-lg">Inbox</h1>
        <Tooltip label="Where this inbox data comes from">
          This is a prepared dataset fixture while the product API is still
          being built.
        </Tooltip>
      </header>
      {state.status === 'loading' ? <InboxLoading /> : null}
      {state.status === 'error' ? (
        <InboxError problems={state.problems} />
      ) : null}
      {state.status === 'ready' ? (
        <InboxBoard dataset={state.dataset} />
      ) : null}
    </div>
  )
}
```

`apps/web/src/pages/inbox-page.css`:

```css
.inbox-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.inbox-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.inbox-head h1 {
  margin: 0;
}

.inbox-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-5);
  padding: var(--spacing-4) var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
}

.inbox-fixture-tag {
  padding: 0 var(--spacing-2);
  border: 1px solid var(--state-neutral-border);
  border-radius: var(--radius-sm);
  background: var(--state-neutral-fill);
  color: var(--state-neutral-text);
  font: var(--type-label-sm);
  letter-spacing: var(--type-label-sm-tracking);
  text-transform: uppercase;
  white-space: nowrap;
}

.inbox-accounting {
  margin: 0;
  color: var(--text-secondary);
  font: var(--type-body-md);
  letter-spacing: var(--type-body-md-tracking);
}

.inbox-accounting .type-data-md {
  color: var(--text-primary);
}

.inbox-download {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  height: 36px;
  margin-left: auto;
  padding: 0 var(--spacing-5);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  text-decoration: none;
  font: var(--type-label-md);
  letter-spacing: var(--type-label-md-tracking);
  white-space: nowrap;
}

.inbox-download:hover {
  background: var(--surface-hover);
}

.inbox-download:focus-visible {
  box-shadow: var(--focus-ring);
  outline: none;
}

.inbox-controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.inbox-controls .field {
  min-width: 160px;
}

.inbox-search {
  flex: 1 1 220px;
}

.inbox-scroll .scrollbar-viewport {
  max-height: 60vh;
}

.inbox-table {
  width: 100%;
  border-collapse: collapse;
}

.inbox-table th {
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--border-default);
  color: var(--text-tertiary);
  text-align: left;
}

.inbox-table td {
  padding: var(--spacing-3);
  border-bottom: 1px solid var(--border-default);
  vertical-align: middle;
}

.inbox-table[data-density='compact'] td {
  padding: var(--spacing-1) var(--spacing-3);
}

.inbox-id {
  color: var(--text-primary);
  text-decoration: none;
}

.inbox-id:hover {
  text-decoration: underline;
}

.inbox-id:focus-visible {
  box-shadow: var(--focus-ring);
  outline: none;
}

.inbox-subject {
  display: block;
  max-width: 34rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.category-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border: 1px solid;
  border-radius: var(--radius-sm);
  font: var(--type-label-sm);
  letter-spacing: var(--type-label-sm-tracking);
  text-transform: uppercase;
  white-space: nowrap;
}

.category-badge[data-channel='routed'] {
  background: var(--state-neutral-fill);
  border-color: var(--state-neutral-border);
  color: var(--state-neutral-text);
}

.category-badge[data-channel='held'] {
  background: var(--state-held-fill);
  border-color: var(--state-held-border);
  color: var(--state-held-text);
}

.inbox-status-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  white-space: nowrap;
}

.inbox-reason {
  color: var(--text-tertiary);
}

.inbox-empty {
  margin: 0;
  padding: var(--spacing-6);
  border: 1px solid var(--state-neutral-border);
  border-radius: var(--radius-md);
  background: var(--state-neutral-fill);
  color: var(--state-neutral-text);
  text-align: center;
}

.inbox-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-4);
}

.inbox-pagination .button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}

.inbox-range {
  color: var(--text-secondary);
}

.inbox-loading {
  display: flex;
  flex-direction: column;
}

.inbox-skeleton-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-3);
  border-bottom: 1px solid var(--border-default);
}

.inbox-skeleton-bar {
  height: 12px;
  flex: 1;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.inbox-skeleton-bar--id {
  max-width: 90px;
}

.inbox-skeleton-bar--badge {
  max-width: 110px;
}

.inbox-skeleton-note {
  padding: var(--spacing-3);
  color: var(--text-secondary);
  font: var(--type-body-sm);
  letter-spacing: var(--type-body-sm-tracking);
}

.inbox-error {
  padding: var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--text-secondary);
}

.inbox-error h2 {
  margin: 0 0 var(--spacing-2);
  color: var(--text-primary);
}

.inbox-error p {
  margin: 0 0 var(--spacing-3);
}

.inbox-error-list {
  margin: 0;
  padding-left: var(--spacing-5);
  color: var(--text-tertiary);
}
```

- [ ] **Step 4: Verify the page tests pass**

Run: `bun run test src/pages/InboxPage.test.tsx`

Expected: PASS, all nine tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/InboxPage.tsx \
  apps/web/src/pages/InboxPage.test.tsx apps/web/src/pages/inbox-page.css
git commit -m "feat(web): add inbox triage list page"
```

### Task 4: Evaluation dashboard page

**Files:**

- Create: `apps/web/src/pages/EvaluationPage.tsx`
- Create: `apps/web/src/pages/evaluation-page.css`
- Test: `apps/web/src/pages/EvaluationPage.test.tsx`

**Interfaces:**

- Consumes: `useInboxDataset`, `summarizeInbox`, `CATEGORIES`,
  `CASE_STATUSES`, `REVIEW_REASONS`, label maps, `StatusPill`, `Tooltip`.
- Produces: `EvaluationPage({ source = fixtureInboxSource })`.

- [ ] **Step 1: Write the failing page tests**

```tsx
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fixtureInboxSource } from '../data/inbox-source'
import type { InboxSource } from '../data/inbox-types'
import { EvaluationPage } from './EvaluationPage'

const pendingSource: InboxSource = { load: () => new Promise(() => {}) }
const brokenSource: InboxSource = {
  load: () =>
    Promise.resolve({
      kind: 'error',
      problems: ['The prepared inbox data could not be read.']
    })
}

function renderEvaluation(source: InboxSource = fixtureInboxSource) {
  return render(
    <MemoryRouter>
      <EvaluationPage source={source} />
    </MemoryRouter>
  )
}

describe('EvaluationPage states', () => {
  it('shows a neutral loading shell without any verdict pill', () => {
    renderEvaluation(pendingSource)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(document.querySelector('[data-status]')).toBeNull()
  })

  it('hides all derived figures on an integrity error', async () => {
    renderEvaluation(brokenSource)
    await screen.findByRole('alert')
    expect(
      screen.queryByText('Classification coverage')
    ).not.toBeInTheDocument()
    expect(document.querySelector('[data-status]')).toBeNull()
  })
})

describe('EvaluationPage fixture reporting', () => {
  it('derives classification coverage and outcome counts from the fixture', async () => {
    renderEvaluation()
    const coverage = await screen.findByRole('region', {
      name: 'Classification coverage'
    })
    expect(
      within(coverage).getByText(/520 of 520 fixture emails carry a category/)
    ).toBeInTheDocument()
    expect(within(coverage).getByText('BL comparison')).toBeInTheDocument()
    expect(within(coverage).getByText('126')).toBeInTheDocument()
    expect(within(coverage).getByText('General')).toBeInTheDocument()
    expect(within(coverage).getByText('394')).toBeInTheDocument()
  })

  it('reports comparison outcomes from the fixture', async () => {
    renderEvaluation()
    const section = await screen.findByRole('region', {
      name: 'Comparison outcomes'
    })
    expect(
      within(section).getByText(/126 BL comparison emails processed/)
    ).toBeInTheDocument()
    expect(within(section).getByText('OK')).toBeInTheDocument()
    expect(within(section).getByText('118')).toBeInTheDocument()
    expect(within(section).getByText('Needs review')).toBeInTheDocument()
    expect(within(section).getByText('8')).toBeInTheDocument()
    expect(within(section).getByText('Missing attachment')).toBeInTheDocument()
    expect(within(section).getByText('Wrong document type')).toBeInTheDocument()
    expect(within(section).getByText('Unreadable file')).toBeInTheDocument()
    expect(within(section).getByText('Missing value')).toBeInTheDocument()
  })

  it('reports reconciliation outcomes including the missing case exhibit', async () => {
    renderEvaluation()
    const section = await screen.findByRole('region', {
      name: 'Reconciliation outcomes'
    })
    expect(
      within(section).getByText(/6 synthetic shipments reconciled/)
    ).toBeInTheDocument()
    expect(within(section).getByText('SYN-042')).toBeInTheDocument()
    expect(within(section).getByText('Missing case')).toBeInTheDocument()
    expect(within(section).getByText('Case present')).toBeInTheDocument()
    expect(within(section).getByText('Document missing')).toBeInTheDocument()
    expect(within(section).getByText('Unmatched case')).toBeInTheDocument()
  })

  it('labels the whole dashboard as a prepared fixture', async () => {
    renderEvaluation()
    await screen.findByRole('region', { name: 'Classification coverage' })
    expect(screen.getByText('Prepared fixture')).toBeInTheDocument()
  })
})

describe('EvaluationPage latency panel', () => {
  it('shows the awaiting benchmark state with no latency figure', async () => {
    renderEvaluation()
    const section = await screen.findByRole('region', {
      name: 'End-to-end latency'
    })
    expect(
      within(section).getByText('Awaiting fresh Gemini 3.5 Flash benchmark.')
    ).toBeInTheDocument()
    expect(within(section).queryByText(/\d+\s*(ms|s|seconds|minutes)/i)).toBeNull()
    expect(screen.queryByText(/flash lite/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests and observe the missing-page failure**

Run: `bun run test src/pages/EvaluationPage.test.tsx`

Expected: FAIL because `EvaluationPage.tsx` does not exist.

- [ ] **Step 3: Implement the page**

`apps/web/src/pages/EvaluationPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { StatusPill } from '../components/ui/Domain'
import { Tooltip } from '../components/ui/Overlays'
import {
  CATEGORIES,
  CASE_STATUSES,
  REVIEW_REASONS,
  summarizeInbox
} from '../data/inbox-integrity'
import {
  CATEGORY_LABEL,
  RECONCILIATION_KIND,
  RECONCILIATION_LABEL,
  REVIEW_REASON_LABEL,
  STATUS_KIND,
  STATUS_LABEL
} from '../data/inbox-labels'
import { fixtureInboxSource } from '../data/inbox-source'
import { useInboxDataset } from '../data/use-inbox-dataset'
import type { InboxDataset, InboxSource } from '../data/inbox-types'
import './evaluation-page.css'

function EvaluationLoading() {
  return (
    <div className="eval-loading" role="status" aria-label="Loading evaluation">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="eval-skeleton-card" key={index}>
          <span className="eval-skeleton-bar eval-skeleton-bar--title" />
          <span className="eval-skeleton-bar" />
          <span className="eval-skeleton-bar" />
          <span className="eval-skeleton-bar" />
        </div>
      ))}
      <span className="eval-skeleton-note">
        Loading prepared evaluation data.
      </span>
    </div>
  )
}

function EvaluationError({ problems }: { problems: string[] }) {
  return (
    <div className="eval-error" role="alert">
      <h2 className="type-heading-sm">
        The prepared evaluation data could not be verified
      </h2>
      <p>No evaluation figures are shown until the prepared data verifies.</p>
      <ul className="eval-error-list">
        {problems.map((problem) => (
          <li className="type-data-sm" key={problem}>
            {problem}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvaluationBoard({ dataset }: { dataset: InboxDataset }) {
  const summary = summarizeInbox(dataset)
  return (
    <div className="eval-board">
      <span className="eval-fixture-tag">Prepared fixture</span>
      <div className="eval-sections">
        <section
          className="eval-section"
          aria-labelledby="eval-coverage"
        >
          <div className="eval-section-head">
            <h2 className="type-heading-sm" id="eval-coverage">
              Classification coverage
            </h2>
            <Tooltip label="About classification coverage">
              Share of prepared fixture emails carrying a category from the
              evaluator contract.
            </Tooltip>
          </div>
          <p className="eval-lead">
            <span className="type-data-md">{summary.received}</span> of{' '}
            <span className="type-data-md">{summary.received}</span> fixture
            emails carry a category.
          </p>
          <ul className="eval-rows">
            {CATEGORIES.map((category) => (
              <li className="eval-row" key={category}>
                <span className="eval-row-label">
                  {CATEGORY_LABEL[category]}
                </span>
                <span className="type-data-md">
                  {summary.byCategory[category]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section
          className="eval-section"
          aria-labelledby="eval-comparison"
        >
          <div className="eval-section-head">
            <h2 className="type-heading-sm" id="eval-comparison">
              Comparison outcomes
            </h2>
            <Tooltip label="About comparison outcomes">
              Prepared outcomes for the SI to draft BL comparison emails in
              the fixture.
            </Tooltip>
          </div>
          <p className="eval-lead">
            <span className="type-data-md">{summary.comparisonRows}</span> BL
            comparison emails processed.
          </p>
          <ul className="eval-rows">
            {CASE_STATUSES.map((status) => (
              <li className="eval-row" key={status}>
                <StatusPill status={STATUS_KIND[status]}>
                  {STATUS_LABEL[status]}
                </StatusPill>
                <span className="type-data-md">
                  {summary.comparisonByStatus[status]}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="eval-subhead type-label-sm">Held reasons</h3>
          <ul className="eval-rows">
            {REVIEW_REASONS.map((reason) => (
              <li className="eval-row" key={reason}>
                <span className="eval-row-label">
                  {REVIEW_REASON_LABEL[reason]}
                </span>
                <span className="type-data-md">
                  {summary.heldReasons[reason] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section
          className="eval-section"
          aria-labelledby="eval-reconciliation"
        >
          <div className="eval-section-head">
            <h2 className="type-heading-sm" id="eval-reconciliation">
              Reconciliation outcomes
            </h2>
            <Tooltip label="About reconciliation outcomes">
              Synthetic expected shipments checked independently against the
              prepared inbox cases.
            </Tooltip>
          </div>
          <p className="eval-lead">
            <span className="type-data-md">
              {dataset.reconciliation.length}
            </span>{' '}
            synthetic shipments reconciled.
          </p>
          {dataset.reconciliation.length === 0 ? (
            <p className="eval-empty">No prepared reconciliation entries.</p>
          ) : (
            <ul className="eval-rows">
              {dataset.reconciliation.map((entry) => (
                <li className="eval-row" key={entry.shipment_id}>
                  <span className="eval-shipment">
                    <span className="type-data-md">{entry.shipment_id}</span>
                    <span className="eval-booking type-data-sm">
                      {entry.booking_reference}
                    </span>
                  </span>
                  <StatusPill status={RECONCILIATION_KIND[entry.outcome]}>
                    {RECONCILIATION_LABEL[entry.outcome]}
                  </StatusPill>
                  {entry.linked_email_id ? (
                    <Link
                      className="eval-case type-data-sm"
                      to={`/emails/${entry.linked_email_id}`}
                    >
                      {entry.linked_email_id}
                    </Link>
                  ) : (
                    <span className="eval-case eval-case--none type-data-sm">
                      No linked case
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="eval-section"
          aria-labelledby="eval-latency"
        >
          <div className="eval-section-head">
            <h2 className="type-heading-sm" id="eval-latency">
              End-to-end latency
            </h2>
            <Tooltip label="What the latency benchmark will measure">
              The p95 end-to-end time of the locked Gemini 3.5 Flash path on
              the scanned SI and draft BL pair, evaluated against the
              published preliminary target.
            </Tooltip>
          </div>
          <p className="eval-pending">
            Awaiting fresh Gemini 3.5 Flash benchmark.
          </p>
        </section>
      </div>
    </div>
  )
}

export function EvaluationPage({
  source = fixtureInboxSource
}: {
  source?: InboxSource
}) {
  const state = useInboxDataset(source)
  return (
    <div className="eval-view">
      <header className="eval-head">
        <h1 className="type-heading-lg">Evaluation</h1>
        <Tooltip label="Where this evaluation data comes from">
          These figures come from a prepared dataset fixture while the
          product API is still being built.
        </Tooltip>
      </header>
      {state.status === 'loading' ? <EvaluationLoading /> : null}
      {state.status === 'error' ? (
        <EvaluationError problems={state.problems} />
      ) : null}
      {state.status === 'ready' ? (
        <EvaluationBoard dataset={state.dataset} />
      ) : null}
    </div>
  )
}
```

`apps/web/src/pages/evaluation-page.css`:

```css
.eval-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.eval-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.eval-head h1 {
  margin: 0;
}

.eval-board {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.eval-fixture-tag {
  align-self: flex-start;
  padding: 0 var(--spacing-2);
  border: 1px solid var(--state-neutral-border);
  border-radius: var(--radius-sm);
  background: var(--state-neutral-fill);
  color: var(--state-neutral-text);
  font: var(--type-label-sm);
  letter-spacing: var(--type-label-sm-tracking);
  text-transform: uppercase;
}

.eval-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-6);
}

.eval-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
}

.eval-section-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.eval-section-head h2 {
  margin: 0;
}

.eval-lead {
  margin: 0;
  color: var(--text-secondary);
}

.eval-lead .type-data-md {
  color: var(--text-primary);
}

.eval-rows {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.eval-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid var(--border-default);
}

.eval-row:last-child {
  border-bottom: none;
}

.eval-row > :last-child {
  margin-left: auto;
}

.eval-row-label {
  color: var(--text-secondary);
}

.eval-subhead {
  margin: var(--spacing-2) 0 0;
  color: var(--text-tertiary);
}

.eval-shipment {
  display: flex;
  flex-direction: column;
}

.eval-booking {
  color: var(--text-tertiary);
}

.eval-case {
  color: var(--text-secondary);
}

.eval-case--none {
  color: var(--text-tertiary);
}

.eval-empty {
  margin: 0;
  padding: var(--spacing-4);
  border: 1px solid var(--state-neutral-border);
  border-radius: var(--radius-md);
  background: var(--state-neutral-fill);
  color: var(--state-neutral-text);
}

.eval-pending {
  margin: 0;
  padding: var(--spacing-5);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  color: var(--text-secondary);
}

.eval-loading {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-6);
}

.eval-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
}

.eval-skeleton-bar {
  height: 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.eval-skeleton-bar--title {
  max-width: 40%;
}

.eval-skeleton-note {
  color: var(--text-secondary);
  font: var(--type-body-sm);
  letter-spacing: var(--type-body-sm-tracking);
}

.eval-error {
  padding: var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--text-secondary);
}

.eval-error h2 {
  margin: 0 0 var(--spacing-2);
  color: var(--text-primary);
}

.eval-error p {
  margin: 0 0 var(--spacing-3);
}

.eval-error-list {
  margin: 0;
  padding-left: var(--spacing-5);
  color: var(--text-tertiary);
}
```

- [ ] **Step 4: Verify the page tests pass**

Run: `bun run test src/pages/EvaluationPage.test.tsx`

Expected: PASS, all six tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/EvaluationPage.tsx \
  apps/web/src/pages/EvaluationPage.test.tsx \
  apps/web/src/pages/evaluation-page.css
git commit -m "feat(web): add evaluation dashboard page"
```

### Task 5: Route wiring and acceptance pass

**Files:**

- Modify: `apps/web/src/routing/routes.tsx`
- Modify: `apps/web/src/routing/routes.test.tsx`

**Interfaces:**

- Consumes: `InboxPage`, `EvaluationPage`.
- Produces: `/inbox` and `/evaluation` render the real pages inside
  `AppShell`; all other routes keep their placeholders.

This task is deliberately last and separate so it does not collide with the
operator guard that issue #35 is establishing in the same route table. Do not
implement auth or touch the `/auth` or `/judge` entries.

- [ ] **Step 1: Write the failing route assertions**

Append to `apps/web/src/routing/routes.test.tsx`:

```tsx
describe('inbox and evaluation routes', () => {
  it('renders the inbox accounting summary at /inbox', async () => {
    renderAt('/inbox', <App />)
    expect(
      await screen.findByText('520 received', { exact: false })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Product views' })
    ).toBeInTheDocument()
  })

  it('renders the awaiting benchmark state at /evaluation', async () => {
    renderAt('/evaluation', <App />)
    expect(
      await screen.findByText('Awaiting fresh Gemini 3.5 Flash benchmark.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Product views' })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and observe the placeholder failure**

Run: `bun run test src/routing/routes.test.tsx`

Expected: FAIL because `/inbox` and `/evaluation` still render
`PlaceholderView` copy.

- [ ] **Step 3: Wire the real pages**

In `apps/web/src/routing/routes.tsx`, add the imports:

```ts
import { EvaluationPage } from '../pages/EvaluationPage'
import { InboxPage } from '../pages/InboxPage'
```

Replace the `/inbox` route element with:

```tsx
<Route
  path="/inbox"
  element={
    <AppShell title="Inbox">
      <InboxPage />
    </AppShell>
  }
/>
```

Replace the `/evaluation` route element with:

```tsx
<Route
  path="/evaluation"
  element={
    <AppShell title="Evaluation">
      <EvaluationPage />
    </AppShell>
  }
/>
```

Leave every other route exactly as it is.

- [ ] **Step 4: Verify routes pass**

Run: `bun run test src/routing/routes.test.tsx`

Expected: PASS, including the pre-existing shell assertions.

- [ ] **Step 5: Run the full suite**

Run:

```bash
bun run test
bun run lint
bun run build
```

Expected: all exit 0.

- [ ] **Step 6: Scan for forbidden characters and copy slips**

```bash
grep -rnP '[\x{2013}\x{2014}]' apps/web/src apps/web/index.html || true
```

Expected: no matches in UI copy.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routing/routes.tsx apps/web/src/routing/routes.test.tsx
git commit -m "feat(web): wire inbox and evaluation routes"
```

## Final integration checklist

- [ ] Issue #36 acceptance criteria trace to code or a named test.
- [ ] `520 received / 520 accounted for / 0 lost` renders only after
  integrity validates all 520 IDs and artifact records.
- [ ] The download link exposes the byte-exact five-key artifact.
- [ ] Every figure derives from the typed fixture; the latency panel shows
  only the awaiting-benchmark state.
- [ ] Fixture mode is explicit in code (`fixtureInboxSource`,
  `source: 'prepared-fixture'`) and visible in UI (`Prepared fixture` tag).
- [ ] No new dependency, no native select, no hardcoded hex, no visible
  em/en dash.
- [ ] Tests, lint, and build pass from `apps/web`.
