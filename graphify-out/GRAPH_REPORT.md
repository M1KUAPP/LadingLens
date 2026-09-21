# Graph Report - issue-28  (2026-09-21)

## Corpus Check
- 279 files · ~363,513 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 49 file(s) not represented in the graph (top: .css 30, (none) 12, .lock 3)

## Summary
- 3126 nodes · 7410 edges · 187 communities (159 shown, 19 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 812 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cec3cc8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Markdown style guide
- package.json
- MUBA Postmortem
- Andrej Karpathy Skills
- Monash x Averis Hackathon 2026 opening ceremony transcript
- Rules & Regulations
- .prettierrc.json
- SDOC hackathon — Docker server bundle
- graphify.md
- rtk.md
- skills.md
- submission.py
- Human Escalation Policy and Refusal Interface
- Shipping document verification
- Averis x Monash Hackathon 2026
- Demo Production Tooling Design
- _parse_pdf
- generate_traced
- Design
- Ten hard questions and answers
- Averis x Monash Hackathon 2026 participant handbook
- Field Provenance Across Attachment Formats
- compilerOptions
- test_pipeline.py
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
- test_comparison.py
- Legal defence and Q&A preparation
- formats.py
- Global Constraints
- ReviewQueueTable.tsx
- web/package.json
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- CytoscapeCanvas.tsx
- email-detail/types.ts
- test_extraction.py
- test_jev_equivalence.py
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- test_comparison_persistence.py
- InMemoryPrivateObjectStore
- Controls.tsx
- sha256_hex
- The Views
- Global Constraints
- contracts.ts
- ComparedField
- Motion
- Global Constraints
- test_health.py
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- review-queue/types.ts
- test_contracts.py
- reconciliation.py
- get_settings
- ingestion.py
- .oxlintrc.json
- test_smoke_deployment.py
- Category
- review-queue-css.test.ts
- vitest
- Timeline
- End-to-end flow and state machine
- JevRoleDecision
- EvaluationPage.tsx
- CaseReviewStatus
- Settings
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- test_migrations.py
- FakeRenderer
- test_models.py
- Demo-day script template
- PersistenceService
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- ReviewPage.tsx
- GeminiOutcome
- ParsedDocument
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
- detect_format
- test_deployment_hardening.py
- test_document_role_persistence.py
- parse_document
- Demo production templates
- narrate.sh
- AssembleIntegrationTest
- CachedExtraction
- Investor evidence template
- AssetTests
- SubtitleTests
- NarrateContractTest
- workflow.example.mjs
- VOICE_USE.md
- NOTICE.md
- Issue 41 code audit
- models.py
- test_submission_persistence.py
- JevFailureCode
- test_document_analyzer.py
- jev.py
- test_jev_document_roles.py
- capture.mjs
- _BrokenCache
- dependencies
- Results by route
- speak.py
- DocumentAnalyzer
- AsyncSystemOneClient
- reconciliation-css.test.ts
- .dispatch
- label_field
- Global Constraints
- Global Constraints
- manifest.py
- env.py
- schedule.py
- subtitles.py
- _page_image
- test_damaged_pdf_page_content_returns_corrupt_status
- JevProviderFailure
- SPAStaticFiles
- _quota_error
- Submission
- _typesafe_sdk_retry_policy

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 174 edges
2. `ComparedField` - 111 edges
3. `InMemoryPrivateObjectStore` - 83 edges
4. `AuditContext` - 66 edges
5. `JevProviderFailure` - 44 edges
6. `vitest` - 41 edges
7. `DocumentRole` - 40 edges
8. `Category` - 39 edges
9. `Base` - 37 edges
10. `ComparisonPipeline` - 36 edges

## Surprising Connections (you probably didn't know these)
- `test_provenance_rejects_bbox_for_scanned_pdf()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_provenance_rejects_location_for_unreadable_file()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_extracted_value_accepts_contract_fields_and_json_scalar()` --uses--> `ExtractedValue`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_field_verdict_accepts_deterministic_interactive_and_batch_results()` --uses--> `FieldVerdict`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_audit_event_has_no_cascading_target_foreign_key()` --uses--> `Base`  [INFERRED]
  apps/api/tests/test_models.py → apps/api/app/models.py

## Import Cycles
- None detected.

## Communities (187 total, 19 thin omitted)

### Community 0 - "Markdown style guide"
Cohesion: 0.05
Nodes (39): Add spacing to headings, ATX-style headings, Avoid relative paths unless within the same directory, Better is better than best, Capitalization, Capitalization of titles and headers, Character line limit, Code (+31 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, lint-staged, scripts (+9 more)

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
Cohesion: 0.11
Nodes (17): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+9 more)

### Community 7 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "SDOC hackathon — Docker server bundle"
Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 12 - "submission.py"
Cohesion: 0.09
Nodes (53): build_submission_artifact(), EndToEndScore, _FrozenModel, _output_for_snapshot(), BaseModel, model_validator, Self, StrEnum (+45 more)

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

### Community 18 - "_parse_pdf"
Cohesion: 0.22
Nodes (12): DigitalPdfLocation, DigitalPdfProvenance, _parse_pdf(), add(), provenance(), _pdf_block_label(), _pdf_label_part(), _pdf_lines() (+4 more)

### Community 19 - "generate_traced"
Cohesion: 0.19
Nodes (20): _clients(), GeminiNotConfigured, generate(), generate_traced(), RuntimeError, Call Gemini; only a 429 moves the same request to the second key. Pass a…, Call Gemini, retrying once on the second key if the first is rate-limited., _client() (+12 more)

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
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 25 - "test_pipeline.py"
Cohesion: 0.09
Nodes (55): Status, GeminiExtractor, RoleDecider, KeyAttempt, One Gemini call on one configured key, kept for the audit trail., JevEquivalence, ComparisonPipeline, EquivalenceJudge (+47 more)

### Community 26 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

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
Cohesion: 0.20
Nodes (18): bind_request_context(), configure_event_logging(), emit_event(), install_observability(), Emit one allowlisted JSON event suitable for Cloud Logging stdout capture., Attach safe domain identifiers for the terminal request event., Install one plain stdout handler that survives Uvicorn's log config., _safe_text() (+10 more)

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
Cohesion: 0.14
Nodes (14): devDependencies, jsdom, oxlint, playwright, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+6 more)

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

### Community 60 - "test_comparison.py"
Cohesion: 0.08
Nodes (76): admit_pair(), band(), _check_values(), compare_fields(), _deterministic_reason(), _diagnostic(), equivalence_questions(), FieldDraft (+68 more)

### Community 61 - "Legal defence and Q&A preparation"
Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 62 - "formats.py"
Cohesion: 0.11
Nodes (40): DocxParagraphLocation, DocxProvenance, DocxTableLocation, Provenance, _ProvenanceIdentity, TxtLocation, TxtProvenance, UnreadableProvenance (+32 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "ReviewQueueTable.tsx"
Cohesion: 0.20
Nodes (17): ReviewAssignmentState, ASSIGNMENT_STATE_LABEL, custodyKind(), custodyLabel(), humanize(), isHeld(), itemIdentifier(), KIND_LABEL (+9 more)

### Community 65 - "web/package.json"
Cohesion: 0.08
Nodes (23): name, private, scripts, build, dev, lint, preview, test (+15 more)

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

### Community 71 - "CytoscapeCanvas.tsx"
Cohesion: 0.06
Nodes (34): AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundary, CanvasBoundaryProps, ControlGraphView(), LazyCytoscapeCanvas (+26 more)

### Community 72 - "email-detail/types.ts"
Cohesion: 0.04
Nodes (77): DropZone(), onDrop(), takeFiles(), DropZoneProps, FieldRow(), FieldRowProps, formatCeiling(), ProvenanceAnchor() (+69 more)

### Community 73 - "test_extraction.py"
Cohesion: 0.10
Nodes (40): ExtractionFailure, ExtractionFailureCode, GeminiDocument, GeminiField, GeminiFields, grounded_extraction(), BaseModel, Exception (+32 more)

### Community 74 - "test_jev_equivalence.py"
Cohesion: 0.15
Nodes (21): EquivalenceQuestion, JevEquivalenceClient, One batched Noul request: is each textual SI/BL pair the same thing?, _Client, _fake_sdk(), _FakeNoul, _FakeRetryPolicy, _ok() (+13 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.23
Nodes (19): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+11 more)

### Community 77 - "test_comparison_persistence.py"
Cohesion: 0.11
Nodes (54): comparison_output(), structural_output(), _ContractModel, ExtractedValue, ExtractionResult, FieldVerdict, MissingCaseReconciliation, BaseModel (+46 more)

### Community 78 - "InMemoryPrivateObjectStore"
Cohesion: 0.20
Nodes (34): AuditEventRecord, CaseRecord, EmailReceipt, ReviewAssignmentInput, InMemoryPrivateObjectStore, _audit_context(), _classification_probabilities(), _create_classification_case() (+26 more)

### Community 79 - "Controls.tsx"
Cohesion: 0.09
Nodes (18): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, FieldControlProps, FieldProps, FieldTriggerProps, CalendarGlyph() (+10 more)

### Community 80 - "sha256_hex"
Cohesion: 0.07
Nodes (22): async_sessionmaker, artifact_object_key(), GcsPrivateObjectStore, private_object_key(), PrivateObjectStore, Protocol, sha256_hex(), _validate_hash() (+14 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "contracts.ts"
Cohesion: 0.07
Nodes (46): AmbiguousReconciliation, CaseReviewAction, ExpectedShipment, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationResult, reconciliationResultProblems() (+38 more)

### Community 85 - "ComparedField"
Cohesion: 0.11
Nodes (47): ComparedField, _docx_document(), _only(), _parse(), _pdf_document(), parametrize, A one-page digital PDF with each text on its own baseline, 28pt apart., Parse a python-docx document built in memory. (+39 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "test_health.py"
Cohesion: 0.15
Nodes (5): _clean_settings(), fixture, MonkeyPatch, test_ready_reports_database_failure_without_exception_text(), test_ready_with_reachable_database()

### Community 89 - "generate-inbox-fixture.py"
Cohesion: 0.67
Nodes (3): classify_email(), main(), Generate apps/web/src/data/inbox-fixture.json from data/sdoc-hackathon-bundle.…

### Community 90 - "Overlays.tsx"
Cohesion: 0.06
Nodes (31): Field(), addDays(), addMonths(), DatePicker(), onKeyDown(), DatePickerProps, Menu(), MenuItem() (+23 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.30
Nodes (14): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+6 more)

### Community 92 - "review-queue/types.ts"
Cohesion: 0.06
Nodes (38): CaseReviewTarget, ReconciliationExceptionActionType, ReconciliationExceptionReviewTarget, ReviewAssignment, ReviewHistoryEntry, email001Fixture, email507Fixture, email511Fixture (+30 more)

### Community 93 - "test_contracts.py"
Cohesion: 0.09
Nodes (37): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), compute_subject_key(), EvaluatorOutput, field_validator, model_validator, Self (+29 more)

### Community 94 - "reconciliation.py"
Cohesion: 0.09
Nodes (66): ReconciliationOutcome, ExpectedShipmentBatchResult, ReconciliationRunWriteResult, _candidate_component(), _canonical_timestamp(), _case_identifiers(), CaseSnapshot, DocumentKind (+58 more)

### Community 95 - "get_settings"
Cohesion: 0.32
Nodes (9): get_settings(), get_engine(), get_session(), AsyncEngine, AsyncSession, health(), JSONResponse, ready() (+1 more)

### Community 96 - "ingestion.py"
Cohesion: 0.07
Nodes (48): AttachmentReceipt, BundleEmail, _canonical_message_bytes(), _check_local_source_path(), Gate1Persistence, Gate1RunSummary, InboxSource, _is_link() (+40 more)

### Community 97 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "Category"
Cohesion: 0.12
Nodes (20): Category, StrEnum, Gate1Classifier, InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, _audit(), _FakePersistence (+12 more)

### Community 100 - "review-queue-css.test.ts"
Cohesion: 0.33
Nodes (5): css, cssFiles, dir, tsx, tsxFiles

### Community 101 - "vitest"
Cohesion: 0.07
Nodes (33): App(), ThemeSeed(), HeroFilm(), Button(), options, css, renderView(), AppShell() (+25 more)

### Community 102 - "Timeline"
Cohesion: 0.22
Nodes (9): Build period, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced, Submission deadline (+1 more)

### Community 103 - "End-to-end flow and state machine"
Cohesion: 0.67
Nodes (3): Atomic evaluator-submission runs, End-to-end flow and state machine, Structural reason precedence

### Community 104 - "JevRoleDecision"
Cohesion: 0.22
Nodes (4): JevRoleDecision, BaseModel, model_validator, _role_decision()

### Community 105 - "EvaluationPage.tsx"
Cohesion: 0.13
Nodes (3): EvaluationPage(), brokenSource, pendingSource

### Community 106 - "CaseReviewStatus"
Cohesion: 0.18
Nodes (14): CaseReviewStatus, CaseReviewService, Any, UUID, ValueError, Named-reviewer dispositions for cases held for review., ReviewRejected, _Persistence (+6 more)

### Community 107 - "Settings"
Cohesion: 0.36
Nodes (5): Settings, test_approved_model_defaults(), test_settings_have_no_alternative_provider_fields(), test_unapproved_model_or_data_policy_is_rejected(), BaseSettings

### Community 108 - "test_gcp_controls.py"
Cohesion: 0.35
Nodes (10): parametrize, _secret_policies(), test_accepts_exact_private_least_privilege_controls(), test_rejects_any_unapproved_runtime_storage_role(), test_rejects_broadened_private_prefix_conditions(), test_rejects_extra_runtime_secret_or_object_admin(), test_rejects_project_level_runtime_access(), test_rejects_unapproved_runtime_role_on_an_approved_secret() (+2 more)

### Community 109 - "record.mjs"
Cohesion: 0.14
Nodes (15): auditCapture(), validateWorkflowModule(), scrollAt(), canonicalizePath(), cleanOutputDirectory(), isWithin(), loadPlaywright(), moveFile() (+7 more)

### Community 110 - "LadingLens preliminary pitch deck — superseded planning draft"
Cohesion: 0.08
Nodes (23): A live demo must stay honest, Absence is not an inbox category, Documents do not share one shape, Evidence-backed comparison, Finals and production path, Gate 1 — Account for received mail, Gate 2 — Reconcile expected shipments, LadingLens preliminary pitch deck — superseded planning draft (+15 more)

### Community 112 - "Timed script"
Cohesion: 0.10
Nodes (19): 0:00-0:30 - Slide 1 - The human capacity problem, 0:30-1:00 - Slide 2 - The cost of one miss, 1:00-1:30 - Slide 3 - Designed for the daily workload, 1:30-2:05 - Slide 4 - The mandatory second gate, 2:05-2:30 - Slide 5 - Inspectable accuracy, 2:30-2:45 - Slide 6 - Failure and decision ownership, 2:45-3:35 - Slide 7 - Find the case the inbox cannot see, 3:35-4:05 - Slide 8 - The honest implementation boundary (+11 more)

### Community 113 - "test_migrations.py"
Cohesion: 0.16
Nodes (34): _async_database_url(), postgres_engine(), postgres_session(), postgres_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, fixture (+26 more)

### Community 114 - "FakeRenderer"
Cohesion: 0.20
Nodes (6): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests, factory(), factory()

### Community 115 - "test_models.py"
Cohesion: 0.12
Nodes (23): _created_at_column(), datetime, UUID, _uuid_column(), _check_constraint(), test_audit_event_has_no_cascading_target_foreign_key(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_classification_metadata_supports_pending_and_ready_cases() (+15 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "PersistenceService"
Cohesion: 0.09
Nodes (34): serialize_evaluator_output(), AuditContext, CachedExtractionEntry, CacheWriteResult, _canonical_json(), CaseDocuments, CaseReviewActionRecord, _default_audit_writer() (+26 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "ReviewPage.tsx"
Cohesion: 0.15
Nodes (10): errorMessage(), ReconciliationView(), handleImportCsv(), handleRerun(), readTab(), ReviewPage(), onTabKeyDown(), selectTab() (+2 more)

### Community 122 - "GeminiOutcome"
Cohesion: 0.19
Nodes (8): APIError, _call_failure(), GeminiOutcome, _per_day_quota(), Whether a 429 names a per-day quota; per-minute ones are rate limits. Every…, GeminiCallError, Exception, A failed Gemini call with every key attempt that preceded it.

### Community 123 - "ParsedDocument"
Cohesion: 0.20
Nodes (8): _in_token(), ParsedDocument, Fields a local parse cannot settle: an absent label, a conflict, or a value it…, Anchor a model-proposed value in this document, or return None. Only a whole-…, Index of the first whole-token occurrence of target in text, or -1., Whether text[index] exists and is a letter, digit, or apostrophe., _squash(), _token_find()

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

### Community 137 - "detect_format"
Cohesion: 0.50
Nodes (5): detect_format(), _detect_ooxml_format(), Identify the container from magic bytes and structure, never a name., test_detect_format_rejects_control_characters_in_text(), DetectedFormat

### Community 138 - "test_deployment_hardening.py"
Cohesion: 0.35
Nodes (10): _read(), test_ci_runs_postgresql_tests_instead_of_skipping_them(), test_ci_runs_web_tests_before_building(), test_deploy_fails_closed_on_remote_storage_and_iam_controls(), test_deploy_uses_only_approved_runtime_provider_secrets(), test_deployer_can_read_project_iam_for_fail_closed_verification(), test_gcp_setup_reconciles_wif_to_the_canonical_repository(), test_gcp_setup_uses_exact_secret_grants_and_rehardens_bucket() (+2 more)

### Community 139 - "test_document_role_persistence.py"
Cohesion: 0.20
Nodes (24): PersistenceExtractionCache, The extraction cache backed by the workspace-scoped PostgreSQL table., EmailAttachment, AttachmentInput, DocumentRoleDecisionInput, receipt_request_hash(), ReceiptInput, UUID (+16 more)

### Community 140 - "parse_document"
Cohesion: 0.25
Nodes (8): parse_document(), PreflightError, ValueError, Raised when a caller parses a document whose preflight did not pass., Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally., test_local_extraction_keeps_local_anchors(), Test that block labels followed by colons are parsed correctly., test_pdf_block_label_with_colon_extracts_correct_value()

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "CachedExtraction"
Cohesion: 0.47
Nodes (3): CachedExtraction, A cache keyed, like the real table, by content hash and version., _VersionedCache

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "models.py"
Cohesion: 0.15
Nodes (33): Base, ClassificationAttempt, DocumentRoleDecisionRecord, _enum(), ExpectedShipmentRecord, ExtractionCache, GuestSession, IngestionRequest (+25 more)

### Community 157 - "test_submission_persistence.py"
Cohesion: 0.23
Nodes (25): FieldVerdictRecord, SubmissionRun, SubmissionRunRecord, CaseInput, _audit(), _manifest_hash(), asyncio, parametrize (+17 more)

### Community 158 - "JevFailureCode"
Cohesion: 0.18
Nodes (24): JevCategoryClient, JevFailureCode, StrEnum, _answer(), _Attachment, _Email, _FakeChoice, _FakeRetryPolicy (+16 more)

### Community 159 - "test_document_analyzer.py"
Cohesion: 0.25
Nodes (18): _Cache, _Gemini, _input(), asyncio, parametrize, _Roles, test_a_local_parser_change_misses_cached_ambiguous_results(), test_ambiguous_local_document_is_grounded_not_relabelled_as_scan() (+10 more)

### Community 160 - "jev.py"
Cohesion: 0.19
Nodes (22): _answer_fields(), AttachmentLike, _call_batch(), ClassifiableEmail, _EmailState, _nonempty_string(), _parse_answer(), _parse_noul() (+14 more)

### Community 161 - "test_jev_document_roles.py"
Cohesion: 0.17
Nodes (19): JevDocumentRoleClient, Ask Jev which document each attachment is, judged only by its text., RoleDocument, _answer(), _fake_sdk(), _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient (+11 more)

### Community 162 - "capture.mjs"
Cohesion: 0.15
Nodes (22): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+14 more)

### Community 164 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+1 more)

### Community 165 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 166 - "speak.py"
Cohesion: 0.22
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 167 - "DocumentAnalyzer"
Cohesion: 0.31
Nodes (8): AttachmentInput, DocumentAnalyzer, _name(), Preflight, _preflight_pdf(), result(), Exception, Hash, size, and identify bytes; reject unsupported or corrupt files.

### Community 169 - "reconciliation-css.test.ts"
Cohesion: 0.40
Nodes (4): combined, CSS_FILES, FEATURE_DIR, sheets

### Community 170 - ".dispatch"
Cohesion: 0.22
Nodes (9): Exception, JSONResponse, Response, _request_id(), _safe_unhandled_error(), StructuredRequestLoggingMiddleware, BaseHTTPMiddleware, Request (+1 more)

### Community 171 - "label_field"
Cohesion: 0.53
Nodes (6): label_field(), _label_key(), A label as the field patterns read it: NFKC, lower case, CJK removed,…, test_label_field_aligns_labels_by_meaning(), test_label_patterns_map_the_bundle_label_keys_as_recorded(), recording_label_field()

### Community 172 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 27 Attachment Preflight and Extraction Implementation Plan, Task 1: Parser dependencies and deterministic preflight, Task 2: Local parsers with format-matched provenance, Task 3: Traced Gemini calls and fail-closed Gemini extraction, Task 4: Pinned Jev document-role decisions, Task 5: Persist role decisions and cache transcriptions, Task 6: Document analyzer that routes, caches, and fails closed

### Community 173 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 28 Seven-Field Comparison Implementation Plan, Task 1: Deterministic normalization, Task 2: Pinned Jev semantic equivalence, Task 3: Pair admission, field verdicts, and evaluator mapping, Task 4: Persist comparison results and case review state, Task 5: Case review action service, Task 6: Comparison pipeline for BL-ready cases

### Community 174 - "manifest.py"
Cohesion: 0.43
Nodes (7): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), Resolve narration rows against measured visual beats., resolve_lines()

### Community 175 - "env.py"
Cohesion: 0.31
Nodes (7): Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), do_run_migrations(), run_async_migrations(), run_migrations_online(), __aenter__(), Connection

### Community 176 - "schedule.py"
Cohesion: 0.48
Nodes (6): atomic_json_write(), deconflict(), main(), probe_duration_ms(), Place narration segments without crossing visual boundaries., schedule()

### Community 177 - "subtitles.py"
Cohesion: 0.48
Nodes (6): main(), make_spans(), Generate compact, non-overlapping SRT subtitle cards., render_srt(), timestamp(), wrap_rows()

### Community 178 - "_page_image"
Cohesion: 0.40
Nodes (5): _page_image(), Place a small grey PNG over rect on a PyMuPDF page., test_digital_cover_page_in_front_of_a_scanned_page_is_a_scan(), test_scanned_page_carrying_a_fax_header_line_is_a_scan(), test_text_rich_page_with_a_small_logo_stays_digital()

### Community 180 - "JevProviderFailure"
Cohesion: 0.27
Nodes (6): JevProviderFailure, A provider failure with safe context for persistence and retry policy., _FailingClassifier, _FailingEquivalence, _FailingRoleDecider, Raises instead of deciding, like a Jev role-decision provider failure.

### Community 181 - "SPAStaticFiles"
Cohesion: 0.33
Nodes (6): Response, Static files with fallback to index.html for client-side routes., SPAStaticFiles, test_spa_fallback_never_masks_unknown_api_routes(), Scope, StaticFiles

### Community 183 - "_quota_error"
Cohesion: 0.67
Nodes (3): _quota_error(), A Gemini 429 body; every quota's message says "exceeded your quota"., ClientError

### Community 184 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 186 - "_typesafe_sdk_retry_policy"
Cohesion: 0.67
Nodes (3): fixture, MonkeyPatch, _typesafe_sdk_retry_policy()

## Knowledge Gaps
- **908 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+903 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1316 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ComparedField` connect `ComparedField` to `test_document_role_persistence.py`, `submission.py`, `parse_document`, `_parse_pdf`, `test_pipeline.py`, `models.py`, `test_submission_persistence.py`, `test_document_analyzer.py`, `jev.py`, `label_field`, `test_comparison.py`, `formats.py`, `test_extraction.py`, `test_jev_equivalence.py`, `test_comparison_persistence.py`, `test_contracts.py`, `Category`, `CaseReviewStatus`, `PersistenceService`, `ParsedDocument`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `PersistenceService` connect `PersistenceService` to `Category`, `CaseReviewStatus`, `test_document_role_persistence.py`, `submission.py`, `test_comparison_persistence.py`, `InMemoryPrivateObjectStore`, `test_comparison.py`, `sha256_hex`, `ComparedField`, `test_submission_persistence.py`, `test_pipeline.py`, `models.py`, `test_contracts.py`, `reconciliation.py`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `get_settings()` connect `get_settings` to `.dispatch`, `Settings`, `generate_traced`, `test_health.py`, `observability.py`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 77 inferred relationships involving `PersistenceService` (e.g. with `PersistenceExtractionCache` and `Category`) actually correct?**
  _`PersistenceService` has 77 INFERRED edges - model-reasoned connections that need verification._
- **Are the 84 inferred relationships involving `ComparedField` (e.g. with `_check_values()` and `compare_fields()`) actually correct?**
  _`ComparedField` has 84 INFERRED edges - model-reasoned connections that need verification._
- **Are the 69 inferred relationships involving `InMemoryPrivateObjectStore` (e.g. with `test_case_review_action_closes_the_case_assignment()` and `test_case_review_action_leaves_an_already_resolved_assignment_alone()`) actually correct?**
  _`InMemoryPrivateObjectStore` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `AuditContext` (e.g. with `PersistenceExtractionCache` and `Gate1Persistence`) actually correct?**
  _`AuditContext` has 8 INFERRED edges - model-reasoned connections that need verification._