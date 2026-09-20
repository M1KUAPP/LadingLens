# Graph Report - feat-alaskantuna-review-reconciliation-graph (2026-09-20)

## Corpus Check

- 180 files · ~171,899 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1336 nodes · 1961 edges · 107 communities (95 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `3a432ea3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- Markdown style guide
- devDependencies
- MUBA Postmortem
- Andrej Karpathy Skills
- Monash x Averis Hackathon 2026 opening ceremony transcript
- Rules & Regulations
- .prettierrc.json
- SDOC hackathon — Docker server bundle
- graphify.md
- rtk.md
- skills.md
- contracts.ts
- Human Escalation Policy and Refusal Interface
- Shipping document verification
- Timeline
- Demo Production Tooling Design
- get_settings
- dependencies
- Design
- Ten hard questions and answers
- Averis x Monash Hackathon 2026 participant handbook
- Field Provenance Across Attachment Formats
- compilerOptions
- review-queue/types.ts
- compilerOptions
- The Stakes of One Missed Document-Checking Email
- Canvas UI
- Jakub Krehel's interface skills
- routes.tsx
- Design research
- benchmark_latency.py
- Technical requirements
- Product requirements
- Research
- tsconfig.json
- gcp-setup.sh
- devDependencies
- averis-api
- or use the loader (stdlib only for the .txt path)
- Five-minute preliminary run
- Iconsax
- Product
- Global Constraints
- LadingLens positioning
- Hugeicons
- Hackathon Brief
- Isocons
- Its Hover
- MotionSites
- Deployment
- File Structure
- Global Constraints
- Global Constraints
- BRIEF.md
- Jakub Antalik
- Event timeline
- Landing video pipeline
- Landing hero media
- EvaluationPage.tsx
- Legal defence and Q&A preparation
- Global Constraints
- scripts
- web/package.json
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- ui/types.ts
- EmailDetailView.tsx
- reconciliation/seam.ts
- typescript
- Domain.tsx
- EvidenceViewer.tsx
- email-detail/types.ts
- ComparisonGrid.tsx
- Controls.tsx
- index.ts
- The Views
- Global Constraints
- ReconciliationView.tsx
- @testing-library/jest-dom
- Motion
- Global Constraints
- reconciliation/fixtures/prepared.ts
- generate-inbox-fixture.py
- Overlays.tsx
- AttachmentPreflightList.tsx
- csv.ts
- Select.tsx
- InboxPage.tsx
- ReconciliationOutcomeTable.tsx
- plugins
- HeldReviewCard.tsx
- ExpectedShipmentTable.tsx
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Judging criteria
- End-to-end flow and state machine
- @types/react
- vitest
- control-graph-css.test.ts

## God Nodes (most connected - your core abstractions)

1. `react` - 30 edges
2. `Monash x Averis Hackathon 2026 opening ceremony transcript` - 27 edges
3. `compilerOptions` - 18 edges
4. `Design` - 17 edges
5. `Tooltip()` - 15 edges
6. `compilerOptions` - 15 edges
7. `Technical requirements` - 15 edges
8. `Markdown style guide` - 15 edges
9. `The Stakes of One Missed Document-Checking Email` - 15 edges
10. `StatusPill()` - 14 edges

## Surprising Connections (you probably didn't know these)

- `createPreparedReviewQueueService()` --calls--> `createPreparedEmailDetailService()` [EXTRACTED]
  apps/web/src/features/review-queue/seam.ts → apps/web/src/features/email-detail/seam.ts
- `renderView()` --calls--> `renderAt()` [EXTRACTED]
  apps/web/src/features/review-queue/ReviewQueueView.test.tsx → apps/web/src/test/render.tsx
- `exception()` --references--> `PREPARED_REVIEW_QUEUE_ITEMS` [EXTRACTED]
  apps/web/src/features/review-queue/components/ReconciliationActionPanel.test.tsx → apps/web/src/features/review-queue/fixtures/review_queue.ts
- `renderTable()` --calls--> `renderAt()` [EXTRACTED]
  apps/web/src/features/review-queue/components/ReviewQueueTable.test.tsx → apps/web/src/test/render.tsx
- `ItemCell()` --calls--> `itemIdentifier()` [EXTRACTED]
  apps/web/src/features/review-queue/components/ReviewQueueTable.tsx → apps/web/src/features/review-queue/components/item-labels.ts

## Import Cycles

- None detected.

## Communities (107 total, 12 thin omitted)

### Community 0 - "Markdown style guide"

Cohesion: 0.05
Nodes (39): Add spacing to headings, ATX-style headings, Avoid relative paths unless within the same directory, Better is better than best, Capitalization, Capitalization of titles and headers, Character line limit, Code (+31 more)

### Community 1 - "devDependencies"

Cohesion: 0.11
Nodes (17): @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, devDependencies, @commitlint/cli, @commitlint/config-conventional, husky (+9 more)

### Community 3 - "MUBA Postmortem"

Cohesion: 0.04
Nodes (41): Build metrics, Cekgu audit, Gaps a judge could have noticed, The demo surface, Track requirements, What shipped, Where the effort went, Cekgu Product (+33 more)

### Community 4 - "Andrej Karpathy Skills"

Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 5 - "Monash x Averis Hackathon 2026 opening ceremony transcript"

Cohesion: 0.07
Nodes (27): 00:00 Pre-show setup, 09:09 Waiting room, 11:36 Welcome and introductions, 13:36 Timeline, 14:12 About Averis, 15:15 Opening keynote, 17:28 Problem statement: shipping-document verification, 25:20 Q&A on the problem statement (+19 more)

### Community 6 - "Rules & Regulations"

Cohesion: 0.08
Nodes (23): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+15 more)

### Community 7 - ".prettierrc.json"

Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "SDOC hackathon — Docker server bundle"

Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 12 - "contracts.ts"

Cohesion: 0.18
Nodes (17): AmbiguousReconciliation, CaseReviewAction, CaseReviewTarget, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationExceptionReviewTarget, ReconciliationOutcome (+9 more)

### Community 14 - "Human Escalation Policy and Refusal Interface"

Cohesion: 0.12
Nodes (16): Decision Thresholds and Operating Bands, Empirical Jev Calibration and Probability Distribution, Executive Summary, Human Escalation Policy and Refusal Interface, Interactive Mode vs. Batch Submission Mode, Judge Experience and On-Screen Presentation, Mapping Signals to Review Reasons, Observations (+8 more)

### Community 15 - "Shipping document verification"

Cohesion: 0.14
Nodes (13): Advanced stage, Context, Evaluating your own output, Expected result and extensions, Formatting your output for the self-evaluation, How to use the result, Shipping document verification, The loader (+5 more)

### Community 16 - "Timeline"

Cohesion: 0.09
Nodes (22): Are there prizes?, Averis x Monash Hackathon 2026, Build period, Community and socials, Contact us, Do I need to know how to code?, Final pitch day, Frequently asked questions (+14 more)

### Community 17 - "Demo Production Tooling Design"

Cohesion: 0.13
Nodes (14): Acceptance Criteria, Chatterbox Voice Profile, Demo Production Tooling Design, Dependencies and Isolation, Error Handling, Goals, Narration Data Flow, Non-Goals (+6 more)

### Community 18 - "get_settings"

Cohesion: 0.08
Nodes (34): get_settings(), Settings, get_engine(), get_session(), Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), _clients(), generate() (+26 more)

### Community 19 - "dependencies"

Cohesion: 0.11
Nodes (18): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+10 more)

### Community 20 - "Design"

Cohesion: 0.13
Nodes (15): Acceptance, Accessibility, App Layout, Colour, Components, Dark Mode, Decisions, Design (+7 more)

### Community 21 - "Ten hard questions and answers"

Cohesion: 0.18
Nodes (11): 10. Are you compliant with every competition rule today?, 1. Who is liable when Averis misses a discrepancy?, 2. Is "human in the loop" just a disclaimer that shifts blame?, 3. Does one missed email really cost MYR 5,200?, 4. What finds a shipment if the email never arrives?, 5. Does an Averis annotation legally amend the Bill of Lading?, 6. Can the report be relied on as evidence?, 7. How is sending real shipping documents to the AI PDPA-compliant? (+3 more)

### Community 22 - "Averis x Monash Hackathon 2026 participant handbook"

Cohesion: 0.22
Nodes (9): Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates, Prizes and awards, Problem statement, Submission (+1 more)

### Community 23 - "Field Provenance Across Attachment Formats"

Cohesion: 0.06
Nodes (33): Caching and Precomputation Recommendations, Comparison of Extraction Strategies, Decision Layer Latency Benchmarks, Dual-Document Extraction in a Single Request, End-to-End Latency Profile, Executive Summary, Extraction Latency Benchmarks, Live Demo Feasibility Verdict (+25 more)

### Community 24 - "compilerOptions"

Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 25 - "review-queue/types.ts"

Cohesion: 0.08
Nodes (39): StatusPill(), ReconciliationExceptionActionType, ReviewAssignmentState, ReviewHistoryEntry, PREPARED_FIXTURES, ASSIGNMENT_STATE_LABEL, custodyKind(), custodyLabel() (+31 more)

### Community 26 - "compilerOptions"

Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 27 - "The Stakes of One Missed Document-Checking Email"

Cohesion: 0.13
Nodes (15): Action Summary, Business Effects Beyond the Penalty, Candidate Opening Line, Conclusion, Evidence Strength and Safe Claims, Five Supporting Data Points, Issue 12 Q&A Stress Test, Limits of the Evidence (+7 more)

### Community 28 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 29 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 30 - "routes.tsx"

Cohesion: 0.07
Nodes (31): App(), ThemeSeed(), HeroFilm(), Button(), renderTable(), renderView(), AppShell(), SiteFooter() (+23 more)

### Community 31 - "Design research"

Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "benchmark_latency.py"

Cohesion: 0.43
Nodes (7): extract_both_docs_one_call(), extract_single_doc(), get_b64_image(), main(), run_jev_comparison(), stats(), Path

### Community 33 - "Technical requirements"

Cohesion: 0.14
Nodes (14): Canonical enums and output contract, Decision register, Deployment, security, and observability, Failure contract, Format routing and provenance, Interface schemas, Jev decision rules, Locked architecture and model ownership (+6 more)

### Community 34 - "Product requirements"

Cohesion: 0.13
Nodes (15): Decision ownership, Evaluator contract, Finals scope, Functional requirements, Goals and boundaries, Goals and measurable success, Human review and provenance, Non-goals (+7 more)

### Community 35 - "Research"

Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 38 - "devDependencies"

Cohesion: 0.12
Nodes (17): devDependencies, jsdom, oxlint, @testing-library/react, @testing-library/user-event, @types/node, @types/react-dom, vite (+9 more)

### Community 40 - "or use the loader (stdlib only for the .txt path)"

Cohesion: 0.14
Nodes (13): Attachment text layout (SI vs BL labels), `attachments/` inventory, Bundle contents, class `Inbox` (the only public class), `inbox/` email record schema, loader.py, look at one email + its documents, `__main__` demo (+5 more)

### Community 41 - "Five-minute preliminary run"

Cohesion: 0.12
Nodes (16): 0:00–0:30 — Account for the inbox, 0:30–1:00 — Show exact submission output, 1:00–1:40 — Prove a judge-supplied document comparison, 1:40–2:05 — Refuse an unsafe comparison, 2:05–2:35 — Load the independent expectation ledger, 2:35–3:55 — Peak: reveal the unmatched expected shipment, 3:55–4:50 — Close on ownership and the public route, Finals additions (+8 more)

### Community 42 - "Iconsax"

Cohesion: 0.25
Nodes (8): An icon's panel, Browsing and configuring, Free against Pro, Iconsax, See also, The free set, Where the browser lives, Why it is the alternative

### Community 43 - "Product"

Cohesion: 0.20
Nodes (10): Decision ownership, Demonstration and proof, Evidence experience, Identity and pitch, One control loop, People and workflow, Product, Product principles (+2 more)

### Community 44 - "Global Constraints"

Cohesion: 0.29
Nodes (6): Chaosiris Ideation Lock Implementation Plan, Global Constraints, Task 1: Lock Product Identity and Demo Spine, Task 2: Write the Canonical Product Contract, Task 3: Reconcile the Technical Contract, Task 4: Verify, Review, and Publish

### Community 45 - "LadingLens positioning"

Cohesion: 0.40
Nodes (4): LadingLens positioning, Outsider restatement test, Source links, Why this resists a thin wrapper

### Community 46 - "Hugeicons"

Cohesion: 0.25
Nodes (8): An icon's page, Browsing and search, For agents, Getting icons without an account, Hugeicons, See also, The free style, Why it fits

### Community 47 - "Hackathon Brief"

Cohesion: 0.11
Nodes (19): At a Glance, Hackathon Brief, Judging, Key Dates, Loading the Data, Q&A Highlights, Rules That Matter, Sources (+11 more)

### Community 48 - "Isocons"

Cohesion: 0.29
Nodes (7): An icon's panel, Isocons, See also, Styling controls, The catalogue, The exported SVG, Why it fits

### Community 49 - "Its Hover"

Cohesion: 0.29
Nodes (7): Examples, How an icon is built, Its Hover, See also, The library, Using it without React, What it covers

### Community 50 - "MotionSites"

Cohesion: 0.18
Nodes (11): Animated backgrounds, How a prompt is written, Layered parallax hero, MotionSites, Scroll-scrubbed video, See also, The free lessons, Three.js scroll scene (+3 more)

### Community 51 - "Deployment"

Cohesion: 0.29
Nodes (6): API Keys, Cost Guardrails, Deployment, How Deploys Work, Resource Names, Running Locally

### Community 52 - "File Structure"

Cohesion: 0.18
Nodes (10): Demo Production Tooling Implementation Plan, File Structure, Final Integration Checklist, Global Constraints, Task 1: Create the Workflow-Neutral Capture Contract, Task 2: Add Measured Narration Timing and Minimalist Subtitle Generation, Task 3: Add the Chatterbox Profile, Reference Asset, and Provenance Record, Task 4: Add Assembly, Muxing, and Optional Slide Rendering (+2 more)

### Community 53 - "Global Constraints"

Cohesion: 0.29
Nodes (6): Global Constraints, Restructure Brief and Deployment Implementation Plan, Task 1: Rename `docs/brief.md` to `docs/BRIEF.md` and Update References, Task 2: Move `docs/deployment.md` to `docs/references/deployment.md` and Update References, Task 3: Update Knowledge Graph with Graphify, Task 4: Push Branch, Create Pull Request, Code Review, Resolve, Merge, and Delete Branch

### Community 54 - "Global Constraints"

Cohesion: 0.20
Nodes (9): AlaskanTuna UX Shell And Landing Implementation Plan, Final integration checklist, Global Constraints, Task 1: Install the route, font, icon, and test foundations, Task 2: Implement tokens, typography, and theme persistence, Task 3: Build the in-house component contracts, Task 4: Implement the application shell and complete route map, Task 5: Adapt the Perch landing structure to LadingLens (+1 more)

### Community 55 - "BRIEF.md"

Cohesion: 0.22
Nodes (3): File descriptions, Folder files, Problem statement and datasets Drive folder

### Community 56 - "Jakub Antalik"

Cohesion: 0.22
Nodes (9): Jakub Antalik, Libraries.dev, See also, Selected work, The customisation panel, The drawer, The page, Transitions.dev (+1 more)

### Community 57 - "Event timeline"

Cohesion: 0.22
Nodes (9): Build period, Event timeline, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced (+1 more)

### Community 58 - "Landing video pipeline"

Cohesion: 0.25
Nodes (8): Encoding for the page, Generating in Gemini, Landing video pipeline, Removing the watermark, See also, The agent's checklist, What Gemini outputs, Writing the prompt

### Community 59 - "Landing hero media"

Cohesion: 0.40
Nodes (4): Approved generation prompt, Encoding, Landing hero media, Required files

### Community 60 - "EvaluationPage.tsx"

Cohesion: 0.13
Nodes (3): EvaluationPage(), brokenSource, pendingSource

### Community 61 - "Legal defence and Q&A preparation"

Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 63 - "Global Constraints"

Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "scripts"

Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 65 - "web/package.json"

Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 66 - "Data protection and cross-border answer"

Cohesion: 0.50
Nodes (4): Data protection and cross-border answer, Production PDPA checklist, The judge-ready answer, Why the current Gemini route is a production blocker

### Community 67 - "Liability answer"

Cohesion: 0.50
Nodes (4): Liability answer, The judge-ready answer, When Averis misses a real discrepancy, When Averis raises a false positive

### Community 68 - "Evidentiary answer"

Cohesion: 0.67
Nodes (3): Conditions for operational reliance, Evidentiary answer, Status of the Averis output

### Community 69 - "Fixes required before the final"

Cohesion: 0.67
Nodes (3): Fixes required before the final, Recommended control sequence, Release blockers

### Community 70 - "Sources"

Cohesion: 0.67
Nodes (3): Internal and competition sources, Legal, privacy and provider sources, Sources

### Community 71 - "ui/types.ts"

Cohesion: 0.06
Nodes (35): FieldKind, StatusKind, AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundary, CanvasBoundaryProps (+27 more)

### Community 72 - "EmailDetailView.tsx"

Cohesion: 0.18
Nodes (10): detectedFilesLabel(), EmailDetailView(), EmailDetailViewProps, STATUS_KIND_MAP, useEmailDetailRecord(), cloneRecord(), createPreparedEmailDetailService(), defaultEmailDetailService (+2 more)

### Community 73 - "reconciliation/seam.ts"

Cohesion: 0.23
Nodes (10): ExpectedShipment, ReconciliationResult, PREPARED_RUN_ID, emptyService(), failingService(), pendingService(), readyService(), createPreparedReconciliationService() (+2 more)

### Community 75 - "Domain.tsx"

Cohesion: 0.18
Nodes (12): DropZone(), DropZoneProps, FieldRow(), FieldRowProps, formatCeiling(), ProvenanceAnchor(), ProvenanceAnchorProps, Scrollbar() (+4 more)

### Community 76 - "EvidenceViewer.tsx"

Cohesion: 0.53
Nodes (4): EvidenceViewer(), EvidenceViewerProps, renderLocationDetails(), Provenance

### Community 77 - "email-detail/types.ts"

Cohesion: 0.11
Nodes (17): Category, DigitalPdfLocation, DigitalPdfProvenance, DocxLocation, DocxParagraphLocation, DocxProvenance, DocxTableLocation, ImmutableEmailSource (+9 more)

### Community 78 - "ComparisonGrid.tsx"

Cohesion: 0.24
Nodes (10): ComparedField, ComparisonGrid(), ComparisonGridProps, FIELD_HUMAN_LABELS, FIELD_ORDER, renderValueAnchor(), resolveProvenanceKind(), VERDICT_STATUS_MAP (+2 more)

### Community 79 - "Controls.tsx"

Cohesion: 0.10
Nodes (16): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps, FieldTriggerProps (+8 more)

### Community 80 - "index.ts"

Cohesion: 0.26
Nodes (7): email001Fixture, email507Fixture, email511Fixture, email516Fixture, emailAmbiguousFixture, emailFormatShowcaseFixture, EmailDetailRecord

### Community 81 - "The Views"

Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"

Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "ReconciliationView.tsx"

Cohesion: 0.20
Nodes (9): Tooltip(), CsvImportSection(), CsvImportSectionProps, EXPECTED_SHIPMENTS_CSV, errorMessage(), LoadState, ReconciliationView(), ReconciliationViewProps (+1 more)

### Community 86 - "Motion"

Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"

Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "reconciliation/fixtures/prepared.ts"

Cohesion: 0.20
Nodes (7): VerdictHoldGlyph(), MissingCasePeakCard(), MissingCasePeakCardProps, parsed, PREPARED_DATASET_LABEL, PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECONCILIATION_RESULTS

### Community 90 - "Overlays.tsx"

Cohesion: 0.21
Nodes (12): addMonths(), DatePicker(), DatePickerProps, MenuItemProps, MenuProps, MONTH_NAMES, pad2(), parseIso() (+4 more)

### Community 92 - "AttachmentPreflightList.tsx"

Cohesion: 0.19
Nodes (11): AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP, REFUSAL_EXPLANATIONS, REFUSAL_TITLES (+3 more)

### Community 93 - "csv.ts"

Cohesion: 0.22
Nodes (11): EXPECTED_SHIPMENTS_CSV_HEADER, parseExpectedShipmentsCsv(), REQUIRED_DOCUMENTS, SOURCE_FRESHNESS, stableHash(), deriveReconciliationResults(), PREPARED_AMBIGUOUS_CASES, PREPARED_CASE_LINKS (+3 more)

### Community 94 - "Select.tsx"

Cohesion: 0.22
Nodes (5): Menu(), MenuItem(), Select(), SelectOption, options

### Community 95 - "InboxPage.tsx"

Cohesion: 0.22
Nodes (4): InboxBoard(), InboxPage(), brokenSource, pendingSource

### Community 96 - "ReconciliationOutcomeTable.tsx"

Cohesion: 0.27
Nodes (6): caseSide(), OUTCOME_OPTIONS, ReconciliationOutcomeTable(), ReconciliationOutcomeTableProps, shipmentSide(), OUTCOMES

### Community 97 - "plugins"

Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 98 - "HeldReviewCard.tsx"

Cohesion: 0.31
Nodes (7): ReviewReason, ACTIONABLE_DISPOSITIONS, HeldReviewCard(), HeldReviewCardProps, REVIEW_REASON_LABELS, SETTLED_STATUS, CaseReviewDetails

### Community 99 - "ExpectedShipmentTable.tsx"

Cohesion: 0.33
Nodes (5): SourceFreshness, ExpectedShipmentTable(), ExpectedShipmentTableProps, FRESHNESS_KIND, FRESHNESS_LABEL

### Community 100 - "review-queue-css.test.ts"

Cohesion: 0.33
Nodes (5): css, cssFiles, dir, tsx, tsxFiles

### Community 101 - "reconciliation-css.test.ts"

Cohesion: 0.40
Nodes (4): combined, CSS_FILES, FEATURE_DIR, sheets

### Community 102 - "Judging criteria"

Cohesion: 0.50
Nodes (3): Evaluation criteria distribution — final round, Evaluation criteria distribution — preliminary round, Judging criteria

### Community 103 - "End-to-end flow and state machine"

Cohesion: 0.67
Nodes (3): Atomic evaluator-submission runs, End-to-end flow and state machine, Structural reason precedence

## Knowledge Gaps

- **711 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+706 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `routes.tsx` to `ReconciliationOutcomeTable.tsx`, `plugins`, `HeldReviewCard.tsx`, `ui/types.ts`, `EmailDetailView.tsx`, `Domain.tsx`, `EvidenceViewer.tsx`, `Controls.tsx`, `ReconciliationView.tsx`, `review-queue/types.ts`, `Overlays.tsx`, `EvaluationPage.tsx`, `Select.tsx`, `InboxPage.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `CanvasStub()` connect `dependencies` to `ui/types.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `web/package.json`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `$schema`, `printWidth`, `singleQuote` to the rest of the system?**
  _711 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Markdown style guide` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `MUBA Postmortem` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
