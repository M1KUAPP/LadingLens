# Graph Report - land-61  (2026-09-20)

## Corpus Check
- 256 files · ~238,333 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2422 nodes · 5796 edges · 156 communities (134 shown, 22 thin omitted)
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 1216 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d16a807`
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
- test_submission.py
- Human Escalation Policy and Refusal Interface
- Shipping document verification
- Averis x Monash Hackathon 2026
- Demo Production Tooling Design
- generate
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
- observability.py
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
- AccessibleGraphTable.tsx
- EmailDetailView.tsx
- ReconciliationView.tsx
- typescript
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- email-detail/types.ts
- PersistenceService
- Domain.tsx
- InMemoryPrivateObjectStore
- The Views
- Global Constraints
- InboxPage.tsx
- @testing-library/jest-dom
- Motion
- Global Constraints
- test_health.py
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- contracts.ts
- contracts.py
- test_reconciliation.py
- get_settings
- ingestion.py
- plugins
- test_smoke_deployment.py
- JevProviderFailure
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Timeline
- End-to-end flow and state machine
- @types/react
- vitest
- control-graph-css.test.ts
- test_provider_configuration.py
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- postgres_session_factory
- load_speak
- test_models.py
- Demo-day script template
- ValueError
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- routes.tsx
- SDOC hackathon — delivery kit
- ReviewPage.tsx
- Visual prompts template
- LadingLens preliminary pitch narrative
- Demo recording toolkit
- docs-templates.test.mjs
- Five-minute demo video director template
- Alternate demo video director template
- Issue 25 PostgreSQL Persistence Implementation Plan
- render.mjs
- Issue 26 Bundle Ingestion and Jev Classification Plan
- Issue 29 Expected-Shipment Reconciliation Plan
- assemble.sh
- Global Constraints
- ReviewQueueTable.tsx
- test_deployment_hardening.py
- reconciliation/fixtures/prepared.ts
- csv.ts
- Demo production templates
- narrate.sh
- AssembleIntegrationTest
- ReconciliationOutcomeTable.tsx
- Investor evidence template
- AssetTests
- SubtitleTests
- NarrateContractTest
- workflow.example.mjs
- VOICE_USE.md
- NOTICE.md
- Issue 41 code audit

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 119 edges
2. `AuditContext` - 99 edges
3. `Category` - 98 edges
4. `ComparedField` - 66 edges
5. `ReceiptInput` - 64 edges
6. `EvaluatorOutput` - 62 edges
7. `PersistedReceipt` - 57 edges
8. `ReconciliationOutcome` - 56 edges
9. `ExpectedShipmentInput` - 53 edges
10. `AttachmentInput` - 51 edges

## Surprising Connections (you probably didn't know these)
- `BundleEmail` --uses--> `Category`  [INFERRED]
  apps/api/app/ingestion.py → apps/api/app/contracts.py
- `Gate1Classifier` --uses--> `Category`  [INFERRED]
  apps/api/app/ingestion.py → apps/api/app/contracts.py
- `Gate1Persistence` --uses--> `Category`  [INFERRED]
  apps/api/app/ingestion.py → apps/api/app/contracts.py
- `InboxIngestionService` --uses--> `Category`  [INFERRED]
  apps/api/app/ingestion.py → apps/api/app/contracts.py
- `InboxSource` --uses--> `Category`  [INFERRED]
  apps/api/app/ingestion.py → apps/api/app/contracts.py

## Import Cycles
- None detected.

## Communities (156 total, 22 thin omitted)

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
Cohesion: 0.12
Nodes (16): Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums, Environment variables, Field-label synonym table (data_v2/pools.py `LABELS`) (+8 more)

### Community 12 - "test_submission.py"
Cohesion: 0.16
Nodes (30): build_submission_artifact(), score_submission_artifact(), _scoring_client(), _complete_snapshots(), _field_snapshots(), _general_snapshot(), asyncio, parametrize (+22 more)

### Community 14 - "Human Escalation Policy and Refusal Interface"
Cohesion: 0.12
Nodes (16): Decision Thresholds and Operating Bands, Empirical Jev Calibration and Probability Distribution, Executive Summary, Human Escalation Policy and Refusal Interface, Interactive Mode vs. Batch Submission Mode, Judge Experience and On-Screen Presentation, Mapping Signals to Review Reasons, Observations (+8 more)

### Community 15 - "Shipping document verification"
Cohesion: 0.14
Nodes (13): Advanced stage, Context, Evaluating your own output, Expected result and extensions, Formatting your output for the self-evaluation, How to use the result, Shipping document verification, The loader (+5 more)

### Community 16 - "Averis x Monash Hackathon 2026"
Cohesion: 0.14
Nodes (13): Are there prizes?, Averis x Monash Hackathon 2026, Community and socials, Contact us, Do I need to know how to code?, Frequently asked questions, How are submissions judged?, Scoring rubric breakdown (+5 more)

### Community 17 - "Demo Production Tooling Design"
Cohesion: 0.13
Nodes (14): Acceptance Criteria, Chatterbox Voice Profile, Demo Production Tooling Design, Dependencies and Isolation, Error Handling, Goals, Narration Data Flow, Non-Goals (+6 more)

### Community 18 - "generate"
Cohesion: 0.17
Nodes (18): _clients(), generate(), Client, Call Gemini, retrying once on the second key if the first is rate-limited., _client(), asyncio, _rate_limited(), test_falls_back_to_second_key_on_429() (+10 more)

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
Cohesion: 0.20
Nodes (9): Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates, Prizes and awards, Problem statement, Submission (+1 more)

### Community 23 - "Field Provenance Across Attachment Formats"
Cohesion: 0.06
Nodes (33): Caching and Precomputation Recommendations, Comparison of Extraction Strategies, Decision Layer Latency Benchmarks, Dual-Document Extraction in a Single Request, End-to-End Latency Profile, Executive Summary, Extraction Latency Benchmarks, Live Demo Feasibility Verdict (+25 more)

### Community 24 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 25 - "review-queue/types.ts"
Cohesion: 0.09
Nodes (26): CaseReviewTarget, ReconciliationExceptionActionType, ReconciliationExceptionReviewTarget, ReviewAssignment, ReviewAssignmentState, ReviewHistoryEntry, PREPARED_FIXTURES, ACTION_LABEL (+18 more)

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

### Community 30 - "observability.py"
Cohesion: 0.13
Nodes (26): bind_request_context(), configure_event_logging(), emit_event(), install_observability(), Exception, JSONResponse, Response, Emit one allowlisted JSON event suitable for Cloud Logging stdout capture. (+18 more)

### Community 31 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "benchmark_latency.py"
Cohesion: 0.43
Nodes (7): extract_both_docs_one_call(), extract_single_doc(), get_b64_image(), main(), Path, run_jev_comparison(), stats()

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
Cohesion: 0.18
Nodes (10): Cost Guardrails, Deployment, How Deploys Work, Post-Deploy Smoke Check, Private Object Storage, Resource Names, Running Locally, Runtime Configuration (+2 more)

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
Cohesion: 0.17
Nodes (6): Evaluation criteria distribution — final round, Evaluation criteria distribution — preliminary round, Judging criteria, File descriptions, Folder files, Problem statement and datasets Drive folder

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

### Community 71 - "AccessibleGraphTable.tsx"
Cohesion: 0.07
Nodes (34): StatusKind, AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundary, CanvasBoundaryProps, ControlGraphView() (+26 more)

### Community 72 - "EmailDetailView.tsx"
Cohesion: 0.09
Nodes (21): EvidenceViewer(), EvidenceViewerProps, renderLocationDetails(), detectedFilesLabel(), EmailDetailView(), EmailDetailViewProps, STATUS_KIND_MAP, useEmailDetailRecord() (+13 more)

### Community 73 - "ReconciliationView.tsx"
Cohesion: 0.12
Nodes (17): ExpectedShipment, CsvImportSection(), CsvImportSectionProps, MissingCasePeakCardProps, PREPARED_RUN_ID, errorMessage(), LoadState, ReconciliationView() (+9 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.25
Nodes (18): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+10 more)

### Community 77 - "email-detail/types.ts"
Cohesion: 0.07
Nodes (36): VerdictHoldGlyph(), Category, ReviewReason, AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP (+28 more)

### Community 78 - "PersistenceService"
Cohesion: 0.11
Nodes (141): Category, ComparedField, EvaluatorOutput, ExtractionResult, FieldVerdict, field_validator, StrEnum, ReconciliationOutcome (+133 more)

### Community 79 - "Domain.tsx"
Cohesion: 0.06
Nodes (38): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps, FieldTriggerProps (+30 more)

### Community 80 - "InMemoryPrivateObjectStore"
Cohesion: 0.09
Nodes (52): artifact_object_key(), GcsPrivateObjectStore, InMemoryPrivateObjectStore, private_object_key(), Client, sha256_hex(), _validate_hash(), _validate_private_key() (+44 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "InboxPage.tsx"
Cohesion: 0.14
Nodes (8): Scrollbar(), ExpectedShipmentTableProps, FRESHNESS_KIND, FRESHNESS_LABEL, InboxBoard(), InboxPage(), brokenSource, pendingSource

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "test_health.py"
Cohesion: 0.15
Nodes (11): Response, Static files with fallback to index.html for client-side routes., SPAStaticFiles, _clean_settings(), fixture, MonkeyPatch, test_ready_reports_database_failure_without_exception_text(), test_ready_with_reachable_database() (+3 more)

### Community 90 - "Overlays.tsx"
Cohesion: 0.12
Nodes (18): addMonths(), DatePicker(), DatePickerProps, Menu(), MenuItem(), MenuItemProps, MenuProps, MONTH_NAMES (+10 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.33
Nodes (13): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+5 more)

### Community 92 - "contracts.ts"
Cohesion: 0.21
Nodes (16): AmbiguousReconciliation, CaseReviewAction, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationOutcome, ReconciliationResult, reconciliationResultProblems() (+8 more)

### Community 93 - "contracts.py"
Cohesion: 0.06
Nodes (52): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), compute_subject_key(), _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation (+44 more)

### Community 94 - "test_reconciliation.py"
Cohesion: 0.11
Nodes (41): _candidate_component(), _canonical_timestamp(), execute_gate_two(), expected_shipment_to_input(), load_expected_shipments_csv(), materialize_reconciliation_results(), parse_expected_shipments_csv(), _parse_utc_timestamp() (+33 more)

### Community 95 - "get_settings"
Cohesion: 0.32
Nodes (9): get_settings(), get_engine(), get_session(), AsyncEngine, AsyncSession, health(), JSONResponse, ready() (+1 more)

### Community 96 - "ingestion.py"
Cohesion: 0.07
Nodes (48): BundleEmail, _canonical_message_bytes(), _check_local_source_path(), _detect_format(), _detect_ooxml_format(), Gate1Classifier, Gate1Persistence, InboxSource (+40 more)

### Community 97 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "JevProviderFailure"
Cohesion: 0.06
Nodes (63): InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., _answer_fields(), AsyncSystemOneClient, AttachmentLike, ClassifiableEmail, _EmailState, JevCategoryClient (+55 more)

### Community 100 - "review-queue-css.test.ts"
Cohesion: 0.33
Nodes (5): css, cssFiles, dir, tsx, tsxFiles

### Community 101 - "reconciliation-css.test.ts"
Cohesion: 0.40
Nodes (4): combined, CSS_FILES, FEATURE_DIR, sheets

### Community 102 - "Timeline"
Cohesion: 0.22
Nodes (9): Build period, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced, Submission deadline (+1 more)

### Community 103 - "End-to-end flow and state machine"
Cohesion: 0.67
Nodes (3): Atomic evaluator-submission runs, End-to-end flow and state machine, Structural reason precedence

### Community 107 - "test_provider_configuration.py"
Cohesion: 0.32
Nodes (4): Settings, test_approved_model_defaults(), test_unapproved_model_or_data_policy_is_rejected(), BaseSettings

### Community 108 - "test_gcp_controls.py"
Cohesion: 0.43
Nodes (6): parametrize, _secret_policies(), test_accepts_exact_private_least_privilege_controls(), test_rejects_extra_runtime_secret_or_object_admin(), test_rejects_unsafe_effective_controls(), _validate()

### Community 109 - "record.mjs"
Cohesion: 0.14
Nodes (15): auditCapture(), validateWorkflowModule(), scrollAt(), canonicalizePath(), cleanOutputDirectory(), isWithin(), loadPlaywright(), moveFile() (+7 more)

### Community 110 - "LadingLens preliminary pitch deck — superseded planning draft"
Cohesion: 0.08
Nodes (23): A live demo must stay honest, Absence is not an inbox category, Documents do not share one shape, Evidence-backed comparison, Finals and production path, Gate 1 — Account for received mail, Gate 2 — Reconcile expected shipments, LadingLens preliminary pitch deck — superseded planning draft (+15 more)

### Community 112 - "Timed script"
Cohesion: 0.10
Nodes (19): 0:00-0:30 - Slide 1 - The human capacity problem, 0:30-1:00 - Slide 2 - The cost of one miss, 1:00-1:30 - Slide 3 - Designed for the daily workload, 1:30-2:05 - Slide 4 - The mandatory second gate, 2:05-2:30 - Slide 5 - Inspectable accuracy, 2:30-2:45 - Slide 6 - Failure and decision ownership, 2:45-3:35 - Slide 7 - Find the case the inbox cannot see, 3:35-4:05 - Slide 8 - The honest implementation boundary (+11 more)

### Community 113 - "postgres_session_factory"
Cohesion: 0.21
Nodes (31): _async_database_url(), postgres_engine(), postgres_session(), postgres_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, fixture (+23 more)

### Community 114 - "load_speak"
Cohesion: 0.21
Nodes (4): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests

### Community 115 - "test_models.py"
Cohesion: 0.17
Nodes (14): _check_constraint(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_expected_shipments_retain_typed_reconciliation_inputs(), test_idempotency_key_and_guest_generation_are_scoped(), test_receipt_uniqueness_uses_scoped_partial_indexes(), test_reconciliation_results_enforce_discriminated_outcome_shapes(), test_source_objects_are_content_addressed_and_private(), test_submission_evaluations_retain_success_or_safe_failure() (+6 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "ValueError"
Cohesion: 0.05
Nodes (47): _expected_shipment_values(), Any, AsyncSession, Category, datetime, ReconciliationResult, RuntimeError, UUID (+39 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "routes.tsx"
Cohesion: 0.09
Nodes (29): App(), ThemeSeed(), HeroFilm(), Button(), caseItems, exceptionItems, renderTable(), renderView() (+21 more)

### Community 122 - "SDOC hackathon — delivery kit"
Cohesion: 0.29
Nodes (7): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Files, Scoring model, SDOC hackathon — delivery kit, server/README.md, Submission format

### Community 123 - "ReviewPage.tsx"
Cohesion: 0.24
Nodes (4): readTab(), ReviewPage(), ReviewTab, TABS

### Community 124 - "Visual prompts template"
Cohesion: 0.20
Nodes (9): Automation asset card, Engine asset card, Evidence asset card, Interface asset card, Partner asset card, Pilot asset card, State asset card, User asset card (+1 more)

### Community 125 - "LadingLens preliminary pitch narrative"
Cohesion: 0.20
Nodes (9): Claims boundary, Engineering evidence requests, LadingLens preliminary pitch narrative, Narrative rule, One-sentence identity, Pitch route, Publication gate, Submission description (+1 more)

### Community 126 - "Demo recording toolkit"
Cohesion: 0.20
Nodes (9): Add optional slides, Capture and assemble, Demo recording toolkit, Inspect delivery, Prepare isolated narration dependencies, Prepare scratch-only Playwright, Render narration and optional music, Supply approved inputs (+1 more)

### Community 127 - "docs-templates.test.mjs"
Cohesion: 0.20
Nodes (5): demoLabels, documentationPaths, investorLabels, restrictedContent, root

### Community 128 - "Five-minute demo video director template"
Cohesion: 0.22
Nodes (8): Beat: account for the inbox, Beat: close on ownership and the public route, Beat: load the independent expectation source, Beat: refuse an unsafe comparison, Beat: reveal an unmatched expected item, Beat: run a fresh synthetic comparison, Beat: show the exact output, Five-minute demo video director template

### Community 129 - "Alternate demo video director template"
Cohesion: 0.22
Nodes (8): Alternate demo video director template, Deck-to-video map, Deliberate inspection, Director blocks, Evidence-first open, Narrative pacing, Resolution and close, Shot checklist

### Community 130 - "Issue 25 PostgreSQL Persistence Implementation Plan"
Cohesion: 0.22
Nodes (8): Issue 25 PostgreSQL Persistence Implementation Plan, Locked decisions, Task 1: Dependencies, test harness, and migration skeleton, Task 2: Canonical ORM schema and initial migration, Task 3: Private object storage and idempotent receipt persistence, Task 4: Reconciliation keys, append-only review operations, and guest reset, Task 5: Extraction cache and submission-run foundations, Task 6: Final verification and review

### Community 131 - "render.mjs"
Cohesion: 0.36
Nodes (6): deckTemplateDirectory, lowestMeaningfulFloor(), parseSlides(), renderSlides(), scriptDirectory, SUBTITLE_TOP

### Community 132 - "Issue 26 Bundle Ingestion and Jev Classification Plan"
Cohesion: 0.25
Nodes (7): Issue 26 Bundle Ingestion and Jev Classification Plan, Locked decisions, Task 1: Strict loader-compatible bundle reader, Task 2: Classification-ready persistence state, Task 3: Pinned Jev Choice client, Task 4: End-to-end Gate 1 orchestration, Task 5: Final verification and review

### Community 133 - "Issue 29 Expected-Shipment Reconciliation Plan"
Cohesion: 0.25
Nodes (7): Issue 29 Expected-Shipment Reconciliation Plan, Locked decisions, Task 1: Synthetic ledger fixture and strict parser, Task 2: Deterministic six-outcome engine, Task 3: Durable shipment and outcome invariants, Task 4: Reconciliation exception review, Task 5: End-to-end verification and review

### Community 134 - "assemble.sh"
Cohesion: 0.43
Nodes (7): fail(), ffconcat_entry(), probe_duration(), seen, assemble.sh script, validate_media(), validate_output()

### Community 136 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Final integration checklist, Global Constraints, Issue 24 Contracts And Provider Configuration Implementation Plan, Task 1: Canonical enums and exact evaluator output, Task 2: Format-specific provenance and comparison contracts, Task 3: Lock approved runtime provider configuration

### Community 137 - "ReviewQueueTable.tsx"
Cohesion: 0.27
Nodes (14): StatusPill(), ASSIGNMENT_STATE_LABEL, custodyKind(), custodyLabel(), humanize(), isHeld(), itemIdentifier(), KIND_LABEL (+6 more)

### Community 138 - "test_deployment_hardening.py"
Cohesion: 0.21
Nodes (13): Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), do_run_migrations(), run_async_migrations(), run_migrations_online(), _read(), test_ci_runs_postgresql_tests_instead_of_skipping_them(), test_deploy_fails_closed_on_remote_storage_and_iam_controls() (+5 more)

### Community 139 - "reconciliation/fixtures/prepared.ts"
Cohesion: 0.18
Nodes (7): ExpectedShipmentTable(), MissingCasePeakCard(), EXPECTED_SHIPMENTS_CSV, parsed, PREPARED_DATASET_LABEL, PREPARED_EXPECTED_SHIPMENTS, PREPARED_RECONCILIATION_RESULTS

### Community 140 - "csv.ts"
Cohesion: 0.22
Nodes (11): EXPECTED_SHIPMENTS_CSV_HEADER, parseExpectedShipmentsCsv(), REQUIRED_DOCUMENTS, SOURCE_FRESHNESS, stableHash(), deriveReconciliationResults(), PREPARED_AMBIGUOUS_CASES, PREPARED_CASE_LINKS (+3 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "ReconciliationOutcomeTable.tsx"
Cohesion: 0.27
Nodes (6): caseSide(), OUTCOME_OPTIONS, ReconciliationOutcomeTable(), ReconciliationOutcomeTableProps, shipmentSide(), OUTCOMES

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

## Knowledge Gaps
- **856 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+851 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Category` connect `PersistenceService` to `ingestion.py`, `JevProviderFailure`, `contracts.py`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `react` connect `routes.tsx` to `plugins`, `AccessibleGraphTable.tsx`, `EmailDetailView.tsx`, `ReconciliationView.tsx`, `ReviewQueueTable.tsx`, `email-detail/types.ts`, `Domain.tsx`, `ReconciliationOutcomeTable.tsx`, `InboxPage.tsx`, `review-queue/types.ts`, `Overlays.tsx`, `ReviewPage.tsx`, `EvaluationPage.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `PersistenceService` connect `PersistenceService` to `InMemoryPrivateObjectStore`, `ValueError`, `test_reconciliation.py`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `PersistenceService` (e.g. with `Category` and `ComparedField`) actually correct?**
  _`PersistenceService` has 43 INFERRED edges - model-reasoned connections that need verification._
- **Are the 58 inferred relationships involving `AuditContext` (e.g. with `AttachmentReceipt` and `BundleEmail`) actually correct?**
  _`AuditContext` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `Category` (e.g. with `AttachmentReceipt` and `BundleEmail`) actually correct?**
  _`Category` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `ValueError` (e.g. with `_canonical_ids()` and `compute_subject_key()`) actually correct?**
  _`ValueError` has 85 INFERRED edges - model-reasoned connections that need verification._