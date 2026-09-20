# Chaosiris Ideation Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close issues #5 and #6 and make the three issue #14 documents a
single implementable contract for LadingLens.

**Architecture:** LadingLens is one product with two controls: an independent
shipment-to-case reconciliation control catches missing cases, while an
evidence-backed SI-to-BL comparison stage proves differences or refuses unsafe
automation. Gemini 3.5 Flash reads documents, deterministic code handles
structure and numbers, Jev 1.13.0 makes typed semantic decisions, and a named
human owns uncertain outcomes.

**Tech Stack:** Markdown, FastAPI, React + Vite + TypeScript, Gemini 3.5 Flash,
Jev 1.13.0, PostgreSQL, Google Cloud Run.

**Spec:** GitHub issues #5, #6, and #14; `docs/BRIEF.md`; accepted research in
`docs/research/ideation/`.

## Global Constraints

- Use `LadingLens` as the product name and `Averis` as the project/team name.
- Use Gemini 3.5 Flash for document extraction and Jev 1.13.0 for typed
  semantic decisions; deterministic code owns parsing, normalization, numeric
  comparison, schemas, and state transitions.
- Treat the Flash Lite latency study as historical evidence only. Do not apply
  its measured latency to Gemini 3.5 Flash.
- Preserve the exact submission statuses `OK`, `MISMATCH`, and
  `NEEDS_REVIEW`.
- Preserve the exact review reasons `wrong_doc_type`, `missing_attachment`,
  `unreadable`, and `missing_value`.
- Never claim that LadingLens amends a Bill of Lading, authorizes release,
  removes organizational liability, is production-ready, or is approved for
  real personal data on the current free-tier route.
- Promise provenance according to file capability: exact spans for TXT,
  bounding boxes for digital PDFs, cells for XLSX, structural cells for DOCX,
  approximate regions for scanned PDFs, and refusal for corrupt PDFs.
- Preliminary scope must include a clearly synthetic independent shipment
  ledger; a classifier alone cannot detect an email that never arrived.
- Every canonical requirement must name an implementation destination.
- Do not introduce decision-bearing `TBD` or `TODO` markers.

---

### Task 1: Lock Product Identity and Demo Spine

**Files:**

- Create: `docs/research/ideation/positioning.md`
- Create: `docs/research/ideation/demo-spine.md`

**Interfaces:**

- Consumes: `docs/BRIEF.md`, `docs/research/postmortem/README.md`,
  `docs/research/ideation/stakes.md`, and the global constraints.
- Produces: the authoritative product sentence, three pitch lines, five-minute
  timeline, named peak, and preliminary/finals cut used by Task 2.

- [x] **Step 1: Write the issue #5 identity**

  Use a maximum-25-word sentence that names the ordinary category,
  double-entry bookkeeping mechanism, evidence, and human sign-off. Follow it
  with exactly three pitch lines that explain the inbox risk, the two control
  gates, and the safe refusal boundary.

- [x] **Step 2: Verify the identity mechanically**

  Count the sentence words and confirm the file contains exactly three pitch
  bullets, with no unsupported performance or legal claims.

- [x] **Step 3: Write the issue #6 demonstration contract**

  Write a beat-by-beat timeline no longer than five minutes. Name the
  unmatched expected shipment as the peak moment, mark every beat live or
  preserved, state what a judge can verify unaided, and draw an explicit
  preliminary/finals cut.

- [x] **Step 4: Verify issue #5 and #6 acceptance criteria**

  Compare both files line by line with their GitHub issue bodies and run the
  Markdown checks defined in Task 4.

### Task 2: Write the Canonical Product Contract

**Files:**

- Modify: `docs/PRD.md`
- Modify: `docs/PRODUCT.md`

**Interfaces:**

- Consumes: Task 1 identity and demo contract, `docs/BRIEF.md`, and accepted
  research in `docs/research/ideation/`.
- Produces: the user-facing requirements, scope, workflow, proof points, and
  trust boundaries consumed by Task 3 and the implementation team.

- [x] **Step 1: Replace the PRD placeholder**

  Define the problem, users, goals, non-goals, two-gate workflow, preliminary
  scope, finals scope, functional requirements, exact evaluator contract,
  success measures, owners/destinations, and acceptance criteria.

- [x] **Step 2: Replace the PRODUCT placeholder**

  Define the product identity, personas, operating model, human review
  behavior, evidence experience, demo spine, proof points, voice, and safe
  claims without duplicating technical implementation detail.

- [x] **Step 3: Cross-check the two product documents**

  Confirm both use `LadingLens`, the same statuses and reasons, the same two
  gates, and the same preliminary/finals boundary.

### Task 3: Reconcile the Technical Contract

**Files:**

- Modify: `docs/TRD.md`

**Interfaces:**

- Consumes: Task 2 requirements and product behavior.
- Produces: implementable component ownership, interfaces, schemas, state
  machine, failures, model assignments, build order, and verification matrix.

- [x] **Step 1: Correct stale model and fallback decisions**

  Lock Gemini 3.5 Flash and Jev 1.13.0, distinguish current scaffold from the
  target build, remove unapproved model fallbacks, and quarantine the Flash
  Lite benchmark as non-transferable evidence.

- [x] **Step 2: Add implementable interfaces and data contracts**

  Specify the shipment ledger, case ledger, extraction/provenance union,
  comparison result, exact evaluator output, review action, audit event, and
  ownership of every interface.

- [x] **Step 3: Add state, failure, persistence, and deployment behavior**

  Specify fail-closed transitions, SHA-256 caching, idempotency, model/rule
  versioning, synthetic-only data policy, deployment shape, and an ordered
  preliminary build sequence.

- [x] **Step 4: Add the verification matrix**

  Map each requirement to a test destination covering all four attachment
  formats, scanned/corrupt files, Chinese labels, missing cases and documents,
  mismatches, review actions, exact output shape, and public demo smoke tests.

### Task 4: Verify, Review, and Publish

**Files:**

- Verify: all five files changed by Tasks 1 through 3.

**Interfaces:**

- Consumes: the complete documentation diff.
- Produces: review evidence, a committed branch, a pull request, and GitHub
  issue updates.

- [x] **Step 1: Run repository and documentation checks**

  Run the full API and web test suites, scan for trailing whitespace,
  decision-bearing placeholders, forbidden model names, inconsistent enums,
  broken relative links, and lines over the Markdown style limit.

- [x] **Step 2: Request independent review**

  Have a fresh reviewer audit the whole diff against issues #5, #6, and #14;
  correct every critical or important finding and re-run the checks.

- [x] **Step 3: Commit and push the branch**

  Commit only the five canonical deliverables and this execution plan, push
  `chaosiris-issues`, and open a pull request against `main`.

- [x] **Step 4: Update the GitHub issues**

  Close #5 and #6 with links to their delivered files. Comment on #14 with the
  PR and request the explicitly required `kymil4` and `DrxgClanPC` reviews;
  leave #14 open until those external review gates are satisfied.
