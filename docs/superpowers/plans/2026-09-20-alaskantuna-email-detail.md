# AlaskanTuna Email Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the core email detail view with seven-field comparison, format-honest provenance jumps, attachment preflight, and human review actions against typed prepared seams while issues #24 and #30 remain open.

**Architecture:** Build focused domain modules under `apps/web/src/features/email-detail/` separated into typed domain models, async service seams, format-honest source evidence viewers, preflight lists, and held review cards. Keep case/review data behind typed async seams with explicit prepared labels, avoiding client-side parsing or classification.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS custom properties, Hugeicons glyphs, in-house LadingLens primitives (FieldRow, StatusPill, ProvenanceAnchor, Tooltip, Button, Scrollbar).

**Spec:** `docs/DESIGN.md`, `docs/TRD.md`, `docs/PRD.md`, `docs/research/ideation/provenance-spike.md`, and GitHub issue #37.

## Global Constraints

- Preserve the existing LadingLens design system and in-house primitives: FieldRow, StatusPill, ProvenanceAnchor, Tooltip, Button, Scrollbar, and Hugeicons glyphs.
- Serious B2B operator UI: concise shipping language, no internal implementation jargon, no decorative motion, no hardcoded hex, no visible em or en dash.
- Secondary explanation uses the accessible Tooltip on an i trigger; critical refusals and actions remain visible.
- Every compared field is one row: shipper, consignee, notify party, port of loading, port of discharge, container count, gross weight (kg). UI labels are human friendly; exact keys stay internal.
- Verdicts always use token color + glyph + 3px rail. Below 960px, SI stacks above draft BL without losing source labels, rail, or pill.
- The view and fixture data must be explicitly labelled prepared until #30 supplies live records. Do not perform parsing, comparison, or classification in the client.
- Keep case, source, and review access behind typed async seams replaceable by #30. A local stub may append review history for interaction tests but must never claim to mutate shared or live data.
- Structural refusal email_507 (missing draft BL) must show retained attachment evidence and reason with zero FieldRows.
- email_511 corrupt PDF gets no provenance anchor. Scanned PDF evidence is visibly Approximate; exact TXT, PDF, XLSX, and DOCX anchors preserve the documented coordinate shape.
- A semantic ambiguity fixture with probability strictly between 0.30 and 0.85 must render held review state and probability.
- The held review card uses indigo held tokens and pause-bars glyph, with reason, immutable source, evidence, diagnostic or probability, named owner, history, and approve, correct, reject actions.
- Exactly one primary action exists on the screen, reserved for sign-off.
- Put route-table wiring and route tests in a final separate commit to keep cleanly separable from concurrent #35 changes.

---

### Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures

**Files:**

- Create: `apps/web/src/features/email-detail/types.ts`
- Create: `apps/web/src/features/email-detail/seam.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_001.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_507.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_511.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_516.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_ambiguous.ts`
- Create: `apps/web/src/features/email-detail/fixtures/email_format_showcase.ts`
- Create: `apps/web/src/features/email-detail/fixtures/index.ts`
- Test: `apps/web/src/features/email-detail/seam.test.ts`

**Interfaces:**

- Produces: `EmailDetailRecord`, `FieldVerdictRecord`, `Provenance`, `CaseReviewActionInput`, `EmailDetailService`, `defaultEmailDetailService`, and prepared fixtures for `email_001`, `email_507`, `email_511`, `email_516`, and `email_ambiguous`.

- [ ] **Step 1: Write the failing seam and fixture test**

Create `apps/web/src/features/email-detail/seam.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createPreparedEmailDetailService } from './seam'

describe('PreparedEmailDetailService', () => {
  it('loads normal prepared case email_001 with seven field verdicts', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_001')
    expect(record).not.toBeNull()
    expect(record?.is_prepared).toBe(true)
    expect(record?.email_id).toBe('email_001')
    expect(record?.field_verdicts).toHaveLength(7)
    expect(record?.attachments).toHaveLength(2)
  })

  it('loads structural refusal email_507 with zero field verdicts and missing draft BL preflight', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_507')
    expect(record).not.toBeNull()
    expect(record?.review_reason).toBe('missing_attachment')
    expect(record?.field_verdicts).toHaveLength(0)
    expect(record?.attachments.some((a) => a.document_type === 'DRAFT_BL' && a.parse_state === 'MISSING')).toBe(true)
    expect(record?.retained_evidence).toBeDefined()
  })

  it('loads semantic ambiguity case with probability between 0.30 and 0.85', async () => {
    const service = createPreparedEmailDetailService()
    const record = await service.getEmailDetail('email_ambiguous')
    expect(record).not.toBeNull()
    expect(record?.status).toBe('NEEDS_REVIEW')
    const prob = record?.held_review?.probability
    expect(prob).toBeGreaterThan(0.3)
    expect(prob).toBeLessThan(0.85)
    expect(record?.held_review?.assigned_owner).toBeTruthy()
  })

  it('appends review history and updates disposition on review action without claiming live mutation', async () => {
    const service = createPreparedEmailDetailService()
    const updated = await service.submitReviewAction({
      case_id: 'case_001',
      action: 'APPROVE',
      rationale: 'Verified with shipper telephone confirmation',
      actor_id: 'operator_42'
    })
    expect(updated.held_review?.history.length).toBeGreaterThan(1)
    const latest = updated.held_review?.history.at(-1)
    expect(latest?.action).toBe('APPROVE')
    expect(latest?.note).toContain('Verified with shipper')
    expect(updated.is_prepared).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/seam.test.ts`
Expected: FAIL because `seam.ts` does not exist yet.

- [ ] **Step 3: Implement domain types, fixtures, and seam stub**

Create `apps/web/src/features/email-detail/types.ts`:
Define all contracts matching TRD.md:

- `ComparedField`: `'shipper' | 'consignee' | 'notify_party' | 'port_of_loading' | 'port_of_discharge' | 'container_count' | 'gross_weight_kg'`
- `Category`: `'BL_COMPARISON' | 'SI_REQUEST' | 'INVOICE_QUERY' | 'GENERAL' | 'SPAM'`
- `Status`: `'OK' | 'MISMATCH' | 'NEEDS_REVIEW'`
- `ReviewReason`: `'wrong_doc_type' | 'missing_attachment' | 'unreadable' | 'missing_value'`
- `DocumentType`: `'SI' | 'DRAFT_BL' | 'COMMERCIAL_INVOICE' | 'UNKNOWN'`
- `AttachmentParseState`: `'PARSED' | 'MISSING' | 'UNREADABLE' | 'REJECTED'`
- Format location schemas: `TxtLocation`, `DigitalPdfLocation`, `ScannedPdfLocation`, `DocxTableLocation`, `DocxParagraphLocation`, `DocxLocation`, `XlsxLocation`
- `Provenance` union, `ExtractedValue`, `FieldVerdictRecord`, `AttachmentPreflightItem`, `ReviewHistoryEntry`, `CaseReviewDetails`, `EmailDetailRecord`, `CaseReviewActionInput`.

Create fixtures in `apps/web/src/features/email-detail/fixtures/`:

- `email_001.ts`: Normal case with consignee mismatch, exact TXT anchors, 7 fields.
- `email_507.ts`: Structural refusal with missing draft BL, 1 SI attachment, zero FieldRows, retained SI evidence.
- `email_511.ts`: Unreadable corrupt PDF `email_511_BL.pdf`, parse error, no location anchor.
- `email_516.ts`: Missing value case.
- `email_ambiguous.ts`: Consignee semantic ambiguity with probability 0.68 (strictly between 0.30 and 0.85), held review card with owner "Marcus Vance".
- `email_format_showcase.ts`: Exact locations across TXT, Digital PDF, XLSX, DOCX table/paragraph, Scanned PDF (approximate), Corrupt (none).
- `index.ts`: Map of all fixtures.

Create `apps/web/src/features/email-detail/seam.ts`:
Implements `EmailDetailService` interface and `createPreparedEmailDetailService()` with in-memory map.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/seam.test.ts`
Expected: PASS (4 tests passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/types.ts \
  apps/web/src/features/email-detail/seam.ts \
  apps/web/src/features/email-detail/fixtures \
  apps/web/src/features/email-detail/seam.test.ts
git commit -m "feat(web): add email detail types, fixtures, and prepared service seam"
```

---

### Task 2: Implement Attachment Preflight List and Structural Refusals

**Files:**

- Create: `apps/web/src/features/email-detail/components/AttachmentPreflightList.tsx`
- Create: `apps/web/src/features/email-detail/components/attachment-preflight.css`
- Test: `apps/web/src/features/email-detail/components/AttachmentPreflightList.test.tsx`

**Interfaces:**

- Consumes: `AttachmentPreflightItem`, `ReviewReason` from `../types`.
- Produces: `<AttachmentPreflightList items={items} refusalReason={refusalReason} />`.

- [ ] **Step 1: Write the failing preflight test**

Create `apps/web/src/features/email-detail/components/AttachmentPreflightList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttachmentPreflightList } from './AttachmentPreflightList'
import type { AttachmentPreflightItem } from '../types'

describe('AttachmentPreflightList', () => {
  const normalItems: AttachmentPreflightItem[] = [
    {
      attachment_id: 'att_si_1',
      file_name: 'email_001_SI.txt',
      detected_format: 'txt',
      document_type: 'SI',
      parse_state: 'PARSED',
      byte_size: 1420
    },
    {
      attachment_id: 'att_bl_1',
      file_name: 'email_001_BL.txt',
      detected_format: 'txt',
      document_type: 'DRAFT_BL',
      parse_state: 'PARSED',
      byte_size: 1510
    }
  ]

  it('renders preflight list before field comparison with document types and parse states', () => {
    render(<AttachmentPreflightList items={normalItems} />)
    expect(screen.getByRole('region', { name: 'Attachment preflight' })).toBeInTheDocument()
    expect(screen.getByText('email_001_SI.txt')).toBeInTheDocument()
    expect(screen.getByText('Shipping instruction')).toBeInTheDocument()
    expect(screen.getByText('email_001_BL.txt')).toBeInTheDocument()
    expect(screen.getByText('Draft bill of lading')).toBeInTheDocument()
    expect(screen.getAllByText('Parsed')).toHaveLength(2)
  })

  it('displays structural refusal notice when draft bill of lading is missing', () => {
    const missingBlItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_si_507',
        file_name: 'email_507_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED',
        byte_size: 1280
      },
      {
        attachment_id: 'att_missing_bl',
        file_name: 'Draft BL required',
        detected_format: 'unknown',
        document_type: 'DRAFT_BL',
        parse_state: 'MISSING',
        error: 'Draft bill of lading attachment not found in email'
      }
    ]
    render(<AttachmentPreflightList items={missingBlItems} refusalReason="missing_attachment" />)
    expect(screen.getByText(/Refusal: Missing required draft bill of lading/i)).toBeInTheDocument()
    expect(screen.getByText('Missing')).toBeInTheDocument()
  })

  it('displays wrong document type refusal when an unexpected file is received', () => {
    const wrongDocItems: AttachmentPreflightItem[] = [
      {
        attachment_id: 'att_si_501',
        file_name: 'email_501_SI.txt',
        detected_format: 'txt',
        document_type: 'SI',
        parse_state: 'PARSED'
      },
      {
        attachment_id: 'att_inv_501',
        file_name: 'email_501_BL.txt',
        detected_format: 'txt',
        document_type: 'COMMERCIAL_INVOICE',
        parse_state: 'REJECTED',
        error: 'Attachment is a commercial invoice, not a draft bill of lading'
      }
    ]
    render(<AttachmentPreflightList items={wrongDocItems} refusalReason="wrong_doc_type" />)
    expect(screen.getByText(/Refusal: Wrong document type/i)).toBeInTheDocument()
    expect(screen.getByText('Commercial invoice')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/components/AttachmentPreflightList.test.tsx`
Expected: FAIL because `AttachmentPreflightList.tsx` does not exist yet.

- [ ] **Step 3: Implement AttachmentPreflightList**

Create `apps/web/src/features/email-detail/components/AttachmentPreflightList.tsx`:

- Renders an accessible preflight section with an informative `Tooltip` on an `i` trigger.
- Maps `DocumentType` to concise shipping labels: "Shipping instruction", "Draft bill of lading", "Commercial invoice", "Unknown".
- Renders each file's detected format, document type, byte size, and parse state pill.
- When `refusalReason` is present, renders a prominent refusal banner with shipping-friendly explanation.

Create `apps/web/src/features/email-detail/components/attachment-preflight.css`:

- Token-first CSS using `--surface-raised`, `--border-default`, `--state-held-*`, `--state-mismatch-*`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/components/AttachmentPreflightList.test.tsx`
Expected: PASS (3 tests passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/components/AttachmentPreflightList.tsx \
  apps/web/src/features/email-detail/components/attachment-preflight.css \
  apps/web/src/features/email-detail/components/AttachmentPreflightList.test.tsx
git commit -m "feat(web): add attachment preflight list component and tests"
```

---

### Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails

**Files:**

- Create: `apps/web/src/features/email-detail/components/ComparisonGrid.tsx`
- Create: `apps/web/src/features/email-detail/components/comparison-grid.css`
- Test: `apps/web/src/features/email-detail/components/ComparisonGrid.test.tsx`

**Interfaces:**

- Consumes: `FieldVerdictRecord`, `ExtractedValue`, `Provenance` from `../types`, and `FieldRow`, `ProvenanceAnchor` from `../../../components/ui/Domain`.
- Produces: `<ComparisonGrid verdicts={verdicts} onSelectProvenance={(prov, val) => void} />`.

- [ ] **Step 1: Write the failing comparison grid test**

Create `apps/web/src/features/email-detail/components/ComparisonGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonGrid } from './ComparisonGrid'
import { email001Fixture } from '../fixtures/email_001'

describe('ComparisonGrid', () => {
  it('renders exactly seven FieldRows with human friendly labels and source labels', () => {
    render(<ComparisonGrid verdicts={email001Fixture.field_verdicts} />)
    const expectedLabels = [
      'Shipper',
      'Consignee',
      'Notify party',
      'Port of loading',
      'Port of discharge',
      'Container count',
      'Gross weight (kg)'
    ]
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Shipping instruction')).toHaveLength(7)
    expect(screen.getAllByText('Draft bill of lading')).toHaveLength(7)
  })

  it('exposes mismatch and held rows via accessible text, glyph, and rail attribute', () => {
    render(<ComparisonGrid verdicts={email001Fixture.field_verdicts} />)
    const consigneeRow = screen.getByText('Consignee').closest('.field-row')
    expect(consigneeRow).toHaveAttribute('data-status', 'mismatch')
    expect(consigneeRow?.querySelector('.field-row-rail')).toBeInTheDocument()
    expect(screen.getByLabelText('Mismatch')).toBeInTheDocument()
  })

  it('triggers provenance selection when an extracted value anchor is activated', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ComparisonGrid verdicts={email001Fixture.field_verdicts} onSelectProvenance={onSelect} />)
    const shipperButtons = screen.getAllByRole('button', { name: /PT\. INDAH KIAT/i })
    await user.click(shipperButtons[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0].format).toBe('txt')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/components/ComparisonGrid.test.tsx`
Expected: FAIL because `ComparisonGrid.tsx` does not exist yet.

- [ ] **Step 3: Implement ComparisonGrid**

Create `apps/web/src/features/email-detail/components/ComparisonGrid.tsx`:

- Maps canonical keys to human-friendly labels:
  - `shipper`: "Shipper"
  - `consignee`: "Consignee"
  - `notify_party`: "Notify party"
  - `port_of_loading`: "Port of loading"
  - `port_of_discharge`: "Port of discharge"
  - `container_count`: "Container count"
  - `gross_weight_kg`: "Gross weight (kg)"
- Renders in-house `FieldRow` for each of the seven fields.
- Formats left and right using `ProvenanceAnchor`:
  - `kind="exact"` for standard readable TXT/PDF/XLSX/DOCX.
  - `kind="approximate"` for scanned PDF.
  - `kind="none"` for unreadable or corrupt sources.
- Calls `onSelectProvenance(extractedValue.provenance, displayValue)` on jump.

Create `apps/web/src/features/email-detail/components/comparison-grid.css`:

- Provides styling for the comparison container, headers, and alignment.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/components/ComparisonGrid.test.tsx`
Expected: PASS (3 tests passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/components/ComparisonGrid.tsx \
  apps/web/src/features/email-detail/components/comparison-grid.css \
  apps/web/src/features/email-detail/components/ComparisonGrid.test.tsx
git commit -m "feat(web): add seven-field comparison grid with provenance anchors"
```

---

### Task 4: Implement Format-Honest Evidence Viewer

**Files:**

- Create: `apps/web/src/features/email-detail/components/EvidenceViewer.tsx`
- Create: `apps/web/src/features/email-detail/components/evidence-viewer.css`
- Test: `apps/web/src/features/email-detail/components/EvidenceViewer.test.tsx`

**Interfaces:**

- Consumes: `Provenance`, `ExtractedValue` from `../types`, `Scrollbar` from `../../../components/ui/Domain`.
- Produces: `<EvidenceViewer activeProvenance={prov} valueText={val} />`.

- [ ] **Step 1: Write the failing evidence viewer test**

Create `apps/web/src/features/email-detail/components/EvidenceViewer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvidenceViewer } from './EvidenceViewer'
import type { Provenance } from '../types'

describe('EvidenceViewer', () => {
  it('renders format-honest coordinates for TXT line and column span', () => {
    const prov: Provenance = {
      attachment_id: 'att_1',
      file_name: 'email_001_SI.txt',
      format: 'txt',
      location: { kind: 'txt', line: 12, start_col: 9, end_col: 48 }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="BALL & DOGGETT AUSTRALIA PTY LTD" />)
    expect(screen.getByText('email_001_SI.txt')).toBeInTheDocument()
    expect(screen.getByText(/Line 12, columns 9 to 48/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Source text preview' })).toBeInTheDocument()
  })

  it('renders digital PDF page and bounding box coordinates', () => {
    const prov: Provenance = {
      attachment_id: 'att_2',
      file_name: 'email_002_BL.pdf',
      format: 'digital_pdf',
      location: { kind: 'digital_pdf', page: 1, bbox: [72.0, 140.0, 280.0, 165.0], approximate: false }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="SGSIN" />)
    expect(screen.getByText('email_002_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Page 1/)).toBeInTheDocument()
    expect(screen.getByText(/72.0, 140.0, 280.0, 165.0/)).toBeInTheDocument()
  })

  it('renders scanned PDF as visibly approximate with named region', () => {
    const prov: Provenance = {
      attachment_id: 'att_3',
      file_name: 'email_512_BL.pdf',
      format: 'scanned_pdf',
      location: { kind: 'scanned_pdf', page: 1, approximate: true, region: 'party' }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="CONSIGNEE DATA" />)
    expect(screen.getByText('email_512_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText('Approximate')).toBeInTheDocument()
    expect(screen.getByText(/Region: party/i)).toBeInTheDocument()
  })

  it('renders spreadsheet sheet and cell coordinates for XLSX', () => {
    const prov: Provenance = {
      attachment_id: 'att_4',
      file_name: 'email_005_SI.xlsx',
      format: 'xlsx',
      location: { kind: 'xlsx', sheet: 'S.I.', cell: 'B5' }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="BALL & DOGGETT" />)
    expect(screen.getByText('email_005_SI.xlsx')).toBeInTheDocument()
    expect(screen.getByText(/Sheet S\.I\., Cell B5/)).toBeInTheDocument()
  })

  it('renders table coordinates for DOCX', () => {
    const prov: Provenance = {
      attachment_id: 'att_5',
      file_name: 'email_008_BL.docx',
      format: 'docx',
      location: { kind: 'docx_table', table_index: 0, row_index: 1, col_index: 1 }
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="BALL & DOGGETT" />)
    expect(screen.getByText('email_008_BL.docx')).toBeInTheDocument()
    expect(screen.getByText(/Table 0, row 1, column 1/i)).toBeInTheDocument()
  })

  it('renders refusal and no coordinates for corrupted file', () => {
    const prov: Provenance = {
      attachment_id: 'att_6',
      file_name: 'email_511_BL.pdf',
      format: 'pdf',
      parse_error: 'corrupted_file'
    }
    render(<EvidenceViewer activeProvenance={prov} valueText="Unreadable" />)
    expect(screen.getByText('email_511_BL.pdf')).toBeInTheDocument()
    expect(screen.getByText('No source anchor')).toBeInTheDocument()
    expect(screen.getByText(/Attachment corrupted or unreadable/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/components/EvidenceViewer.test.tsx`
Expected: FAIL because `EvidenceViewer.tsx` does not exist yet.

- [ ] **Step 3: Implement EvidenceViewer**

Create `apps/web/src/features/email-detail/components/EvidenceViewer.tsx`:

- Formats each format honestly:
  - TXT: Line, column span (Unicode code points), scrollable preview using `Scrollbar`.
  - Digital PDF: Page, bounding box `[x0, y0, x1, y1]`, visual coordinates display.
  - Scanned PDF: Visibly `Approximate` badge, Page, and Region name.
  - XLSX: Sheet name and Cell address.
  - DOCX: Table/row/column or paragraph index.
  - Unreadable: Parse error explanation, "No source anchor" badge, refusal indication.
- Avoids en or em dashes in formatted copy.

Create `apps/web/src/features/email-detail/components/evidence-viewer.css`:

- Token-first CSS for the viewer panel, preview canvas, and coordinate pills.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/components/EvidenceViewer.test.tsx`
Expected: PASS (6 tests passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/components/EvidenceViewer.tsx \
  apps/web/src/features/email-detail/components/evidence-viewer.css \
  apps/web/src/features/email-detail/components/EvidenceViewer.test.tsx
git commit -m "feat(web): add format-honest evidence viewer component"
```

---

### Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions

**Files:**

- Create: `apps/web/src/features/email-detail/components/HeldReviewCard.tsx`
- Create: `apps/web/src/features/email-detail/components/held-review-card.css`
- Test: `apps/web/src/features/email-detail/components/HeldReviewCard.test.tsx`

**Interfaces:**

- Consumes: `CaseReviewDetails`, `CaseReviewActionInput` from `../types`, `Button` from `../../../components/ui/Controls`, `VerdictHoldGlyph` from `../../../components/ui/Icons`.
- Produces: `<HeldReviewCard review={review} onAction={(action) => Promise<void>} />`.

- [ ] **Step 1: Write the failing held review card test**

Create `apps/web/src/features/email-detail/components/HeldReviewCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HeldReviewCard } from './HeldReviewCard'
import type { CaseReviewDetails } from '../types'

describe('HeldReviewCard', () => {
  const sampleReview: CaseReviewDetails = {
    case_id: 'case_ambig_01',
    email_id: 'email_ambiguous',
    status: 'NEEDS_REVIEW',
    review_reason: undefined,
    probability: 0.68,
    assigned_owner: 'Marcus Vance',
    disposition: 'IN_REVIEW',
    immutable_source: {
      email_id: 'email_ambiguous',
      sender: 'docs@pacificshipping.com',
      subject: 'SI and Draft BL for OC 5RSG-0089',
      received_at: '2026-09-18T14:32:00Z',
      message_hash: '3f7b2c91...'
    },
    evidence_summary: 'Consignee naming differs between legal entity and trading name',
    history: [
      {
        id: 'hist_1',
        timestamp: '2026-09-18T14:32:05Z',
        actor: 'System',
        action: 'CREATED',
        note: 'Escalated from semantic equivalence evaluation'
      }
    ]
  }

  it('renders in state/held tokens with the pause-bars glyph, reason, and probability', () => {
    render(<HeldReviewCard review={sampleReview} onAction={vi.fn()} />)
    const card = screen.getByRole('region', { name: 'Review custody' })
    expect(card).toHaveAttribute('data-status', 'held')
    expect(screen.getByLabelText('Held')).toBeInTheDocument()
    expect(screen.getByText(/Probability: 0\.68/)).toBeInTheDocument()
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument()
    expect(screen.getByText(sampleReview.evidence_summary)).toBeInTheDocument()
  })

  it('has exactly one primary button reserved for sign-off', () => {
    render(<HeldReviewCard review={sampleReview} onAction={vi.fn()} />)
    const primaryButtons = screen.getAllByRole('button').filter((btn) => btn.classList.contains('button--primary'))
    expect(primaryButtons).toHaveLength(1)
    expect(primaryButtons[0]).toHaveTextContent('Approve sign-off')
  })

  it('submits approve action through callback', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    render(<HeldReviewCard review={sampleReview} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: 'Approve sign-off' }))
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APPROVE'
      })
    )
  })

  it('allows entering correction rationale and submitting correct action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn().mockResolvedValue(undefined)
    render(<HeldReviewCard review={sampleReview} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: 'Correct values' }))
    const rationaleInput = screen.getByLabelText('Review rationale')
    await user.type(rationaleInput, 'BL amended to match SI exactly')
    await user.click(screen.getByRole('button', { name: 'Submit correction' }))
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CORRECT',
        rationale: expect.stringContaining('BL amended')
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/components/HeldReviewCard.test.tsx`
Expected: FAIL because `HeldReviewCard.tsx` does not exist yet.

- [ ] **Step 3: Implement HeldReviewCard**

Create `apps/web/src/features/email-detail/components/HeldReviewCard.tsx`:

- Renders container with `data-status="held"`.
- Displays `VerdictHoldGlyph` with label "Held".
- Displays reason, immutable source metadata, evidence summary.
- Displays probability when present (e.g. "Probability: 0.68").
- Displays assigned owner.
- Displays review audit history list.
- Action buttons:
  - Exactly one `variant="primary"`: "Approve sign-off".
  - Secondary: "Correct values", opening rationale field and non-primary submit.
  - Secondary/ghost: "Reject with reason".

Create `apps/web/src/features/email-detail/components/held-review-card.css`:

- Token-first CSS using `--state-held-fill`, `--state-held-border`, `--state-held-text`, `--state-held-solid`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/components/HeldReviewCard.test.tsx`
Expected: PASS (4 tests passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/components/HeldReviewCard.tsx \
  apps/web/src/features/email-detail/components/held-review-card.css \
  apps/web/src/features/email-detail/components/HeldReviewCard.test.tsx
git commit -m "feat(web): add held review card with single primary sign-off action"
```

---

### Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors

**Files:**

- Create: `apps/web/src/features/email-detail/EmailDetailView.tsx`
- Create: `apps/web/src/features/email-detail/email-detail.css`
- Test: `apps/web/src/features/email-detail/EmailDetailView.test.tsx`

**Interfaces:**

- Consumes: `EmailDetailService`, `AttachmentPreflightList`, `ComparisonGrid`, `EvidenceViewer`, `HeldReviewCard`.
- Produces: `<EmailDetailView emailId={id} service={service} />`.

- [ ] **Step 1: Write the failing comprehensive acceptance test covering all 7 required TDD behaviors**

Create `apps/web/src/features/email-detail/EmailDetailView.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EmailDetailView } from './EmailDetailView'
import { createPreparedEmailDetailService } from './seam'

describe('EmailDetailView acceptance behaviors', () => {
  it('1. A normal prepared case renders the attachment preflight list before exactly seven FieldRows with human-friendly labels and source labels', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    // Explicit prepared record badge
    expect(await screen.findByText('PREPARED RECORD')).toBeInTheDocument()

    // Preflight appears before grid
    const preflightRegion = screen.getByRole('region', { name: 'Attachment preflight' })
    const comparisonRegion = screen.getByRole('region', { name: 'Field comparison' })
    expect(preflightRegion.compareDocumentPosition(comparisonRegion)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    // Exactly seven FieldRows
    const rows = screen.getAllByRole('generic').filter((el) => el.classList?.contains('field-row'))
    expect(rows).toHaveLength(7)

    const expectedLabels = [
      'Shipper',
      'Consignee',
      'Notify party',
      'Port of loading',
      'Port of discharge',
      'Container count',
      'Gross weight (kg)'
    ]
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('2. Mismatch/held rows expose status via accessible text/glyph and semantic rail, not color only', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    await screen.findByText('Consignee')
    const row = screen.getByText('Consignee').closest('.field-row')!
    expect(row).toHaveAttribute('data-status', 'mismatch')
    expect(row.querySelector('.field-row-rail')).toBeInTheDocument()
    expect(within(row).getByLabelText('Mismatch')).toBeInTheDocument()
    expect(within(row).getByText('Mismatch')).toBeInTheDocument()
  })

  it('3. Provenance actions open/jump to format-honest evidence for TXT line/column, digital PDF page/bbox, XLSX sheet/cell, DOCX table/paragraph, scanned approximate region, and corrupt none', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_format_showcase" service={service} />)

    await screen.findByText('PREPARED RECORD')

    // TXT line/col
    const txtBtn = screen.getByRole('button', { name: /TXT_VALUE/ })
    await user.click(txtBtn)
    expect(screen.getByText(/Line 10, columns 5 to 25/)).toBeInTheDocument()

    // Scanned approximate
    const scanBtn = screen.getByRole('button', { name: /SCAN_VALUE/ })
    await user.click(scanBtn)
    expect(screen.getByText('Approximate')).toBeInTheDocument()
    expect(screen.getByText(/Region: cargo/i)).toBeInTheDocument()

    // Corrupt none
    expect(screen.getByText('No source anchor')).toBeInTheDocument()
  })

  it('4. email_507 shows missing attachment refusal and retained SI evidence with zero FieldRows', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_507" service={service} />)

    await screen.findByText('PREPARED RECORD')
    expect(screen.getByText(/Refusal: Missing required draft bill of lading/i)).toBeInTheDocument()
    expect(screen.getByText('Retained shipping instruction evidence')).toBeInTheDocument()

    // Zero FieldRows
    const rows = screen.queryAllByRole('generic').filter((el) => el.classList?.contains('field-row'))
    expect(rows).toHaveLength(0)
  })

  it('5. Ambiguity probability in the interactive band appears in a held review card with a named owner', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('PREPARED RECORD')
    const card = screen.getByRole('region', { name: 'Review custody' })
    expect(card).toBeInTheDocument()
    expect(within(card).getByText(/Probability: 0\.68/)).toBeInTheDocument()
    expect(within(card).getByText('Marcus Vance')).toBeInTheDocument()
  })

  it('6. Approve/correct/reject go through the review seam and refresh the rendered history/owner; exactly one primary button is present', async () => {
    const user = userEvent.setup()
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_ambiguous" service={service} />)

    await screen.findByText('PREPARED RECORD')

    // Exactly one primary button on the entire screen
    const primaryButtons = screen.getAllByRole('button').filter((b) => b.classList.contains('button--primary'))
    expect(primaryButtons).toHaveLength(1)
    expect(primaryButtons[0]).toHaveTextContent('Approve sign-off')

    // Submit approve
    await user.click(primaryButtons[0])
    expect(await screen.findByText(/Review sign-off recorded/i)).toBeInTheDocument()
  })

  it('7. Mobile-compatible markup preserves both source labels for each FieldRow', async () => {
    const service = createPreparedEmailDetailService()
    render(<EmailDetailView emailId="email_001" service={service} />)

    await screen.findByText('PREPARED RECORD')
    const consigneeRow = screen.getByText('Consignee').closest('.field-row')!
    const siSource = within(consigneeRow).getByText('Shipping instruction')
    const blSource = within(consigneeRow).getByText('Draft bill of lading')
    expect(siSource).toBeInTheDocument()
    expect(blSource).toBeInTheDocument()
    expect(siSource).toHaveClass('field-row-source')
    expect(blSource).toHaveClass('field-row-source')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/features/email-detail/EmailDetailView.test.tsx`
Expected: FAIL because `EmailDetailView.tsx` does not exist yet.

- [ ] **Step 3: Implement EmailDetailView and Page Styling**

Create `apps/web/src/features/email-detail/EmailDetailView.tsx`:

- Accepts `emailId` and optional `service` (defaults to `defaultEmailDetailService`).
- Loads `EmailDetailRecord` asynchronously via `service.getEmailDetail(emailId)`.
- Renders:
  - Page header: `h1` "Email detail", email subject/metadata, and "PREPARED RECORD" badge.
  - Secondary explanation using `Tooltip` on `i` triggers.
  - `<AttachmentPreflightList />`.
  - For structural refusals (like `email_507`): Displays refusal notice and retained SI evidence without rendering any FieldRows.
  - For standard/held comparison: `<ComparisonGrid />` with exactly 7 `FieldRow`s and active provenance selection state.
  - `<EvidenceViewer />` displaying format-honest evidence.
  - `<HeldReviewCard />` when status is `NEEDS_REVIEW` or review data exists. Handles review actions through `service.submitReviewAction(...)`.

Create `apps/web/src/features/email-detail/email-detail.css`:

- Token-first CSS for detail layout, side-by-side or stacked grid, prepared badge, retained evidence box.
- Checks that no hex codes, em dashes, or en dashes exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/features/email-detail/EmailDetailView.test.tsx`
Expected: PASS (all 7 acceptance behaviors passing).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/email-detail/EmailDetailView.tsx \
  apps/web/src/features/email-detail/email-detail.css \
  apps/web/src/features/email-detail/EmailDetailView.test.tsx
git commit -m "feat(web): build email detail view with seven-field comparison and evidence"
```

---

### Task 7: Route Integration and Route Guard Verification (Final Separate Commit)

**Files:**

- Modify: `apps/web/src/routing/routes.tsx`
- Modify: `apps/web/src/routing/routes.test.tsx`

**Interfaces:**

- Consumes: `<EmailDetailView />` in `apps/web/src/routing/routes.tsx`.
- Produces: Route `/emails/:emailId` rendering the complete `EmailDetailView` within `AppShell`.

- [ ] **Step 1: Write the failing route integration test**

Update `apps/web/src/routing/routes.test.tsx` to assert that navigating to `/emails/email_001` renders the actual `EmailDetailView` components (preflight, FieldRows, prepared badge) rather than the previous placeholder copy.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/routing/routes.test.tsx`
Expected: FAIL because placeholder is still wired.

- [ ] **Step 3: Wire EmailDetailView into routes.tsx**

In `apps/web/src/routing/routes.tsx`:
Replace the placeholder in `EmailDetailPage` with:

```tsx
function EmailDetailPage() {
  const { emailId } = useParams()
  return (
    <AppShell title="Email detail">
      <EmailDetailView emailId={emailId ?? 'email_001'} />
    </AppShell>
  )
}
```

Do not touch auth or other routes to prevent any collision with concurrent issue #35.

- [ ] **Step 4: Run all web tests, lint, and build**

Run:

```bash
bun run test
bun run lint
bun run build
```

Expected: All tests pass, lint is clean, build succeeds.

- [ ] **Step 5: Verify no en-dash (U+2013) or em-dash (U+2014) in visible copy**

Scan all touched files:

```bash
python3 -c "
import sys, glob
chars = {'\u2013': 'en-dash', '\u2014': 'em-dash'}
files = glob.glob('apps/web/src/features/email-detail/**/*', recursive=True) + ['apps/web/src/routing/routes.tsx']
found = False
for f in files:
    try:
        content = open(f).read()
        for c, name in chars.items():
            if c in content:
                print(f'Found {name} in {f}')
                found = True
    except Exception:
        pass
if not found:
    print('Clean: No en-dash or em-dash found.')
"
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routing/routes.tsx apps/web/src/routing/routes.test.tsx
git commit -m "feat(web): wire email detail view into application routes"
```
