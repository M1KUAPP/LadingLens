# Graph Report - issue-32  (2026-09-21)

## Corpus Check
- 321 files · ~416,635 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 50 file(s) not represented in the graph (top: .css 31, (none) 12, .lock 3)

## Summary
- 4078 nodes · 10945 edges · 215 communities (184 shown, 20 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 1376 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2329fcd2`
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
- test_extraction.py
- GeminiCallError
- Design
- Ten hard questions and answers
- Averis x Monash Hackathon 2026 participant handbook
- Field Provenance Across Attachment Formats
- compilerOptions
- review-queue/seam.ts
- compilerOptions
- The Stakes of One Missed Document-Checking Email
- Canvas UI
- Jakub Krehel's interface skills
- test_integration_matrix.py
- Design research
- benchmark_latency.py
- Technical requirements
- Product requirements
- Research
- tsconfig.json
- gcp-setup.sh
- run_benchmark
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
- observability.py
- Legal defence and Q&A preparation
- test_pipeline.py
- Global Constraints
- sha256_hex
- web/package.json
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- CytoscapeCanvas.tsx
- test_benchmark_latency.py
- contracts.ts
- contracts.py
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- routes.tsx
- test_persistence.py
- email-detail/types.ts
- storage.py
- The Views
- Global Constraints
- SeedCatalog
- jev.py
- Motion
- Global Constraints
- test_health.py
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- _only
- test_contracts.py
- reconciliation.py
- seed_catalog.py
- read_bundle
- .oxlintrc.json
- test_smoke_deployment.py
- test_jev_equivalence.py
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Timeline
- End-to-end flow and state machine
- test_submission_bundle.py
- KeyAttempt
- errors.py
- test_jev.py
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- test_migrations.py
- FakeRenderer
- persistence.py
- Demo-day script template
- PersistenceService
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- test_normalization.py
- JevDocumentRoleClient
- test_reconciliation.py
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
- Category
- Base
- pipeline.py
- ReviewPage.tsx
- Demo production templates
- narrate.sh
- AssembleIntegrationTest
- test_failure_matrix.py
- Investor evidence template
- AssetTests
- SubtitleTests
- NarrateContractTest
- workflow.example.mjs
- VOICE_USE.md
- NOTICE.md
- Issue 41 code audit
- test_document_role_persistence.py
- evidence.py
- capture.mjs
- test_api_actions.py
- Preflight
- test_document_analyzer.py
- model_validator
- judge_routes.py
- AttachmentInput
- EvaluationPage.tsx
- SimpleNamespace
- Results by route
- speak.py
- test_api_judge.py
- deps.py
- API Contract
- ExtractionFailure
- vitest
- Global Constraints
- Global Constraints
- extraction.py
- judge.py
- manifest.py
- test_submission_persistence.py
- schedule.py
- subtitles.py
- DocumentRole
- test_formats.py
- test_comparison_persistence.py
- StageRecord
- test_api_wiring.py
- ApiProblem
- Submission
- demo-reset.ts
- JevRoleDecision
- Global Constraints
- test_api_reads.py
- ComparedField
- _docx_document
- ExpectedShipment
- ingestion.py
- JevEquivalence
- JevProviderFailure
- test_api_session.py
- parse_expected_shipments_csv
- Product API
- Global Constraints
- _xlsx_document
- _docx_paragraph_document
- ._receive
- .__init__
- materialize.py
- InMemoryPrivateObjectStore
- GeminiNotConfigured
- test_damaged_pdf_page_content_returns_corrupt_status

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 230 edges
2. `ComparedField` - 162 edges
3. `InMemoryPrivateObjectStore` - 117 edges
4. `AuditContext` - 86 edges
5. `DocumentRole` - 83 edges
6. `SeedCatalog` - 62 edges
7. `Category` - 59 edges
8. `ComparisonPipeline` - 58 edges
9. `JevProviderFailure` - 56 edges
10. `ReviewReason` - 50 edges

## Surprising Connections (you probably didn't know these)
- `test_provenance_rejects_bbox_for_scanned_pdf()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_provenance_rejects_location_for_unreadable_file()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_extracted_value_accepts_contract_fields_and_json_scalar()` --uses--> `ExtractedValue`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_field_verdict_accepts_deterministic_interactive_and_batch_results()` --uses--> `FieldVerdict`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `submit_case_action()` --uses--> `ApiProblem`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/api/errors.py

## Import Cycles
- None detected.

## Communities (215 total, 20 thin omitted)

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
Nodes (54): _submission_json(), build_submission_artifact(), EndToEndScore, _FrozenModel, _output_for_snapshot(), AsyncClient, BaseModel, model_validator (+46 more)

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

### Community 18 - "test_extraction.py"
Cohesion: 0.11
Nodes (34): ExtractionFailureCode, GeminiDocument, StrEnum, _answer(), _field(), _generate(), generate(), _labelled() (+26 more)

### Community 19 - "GeminiCallError"
Cohesion: 0.17
Nodes (17): GeminiCallError, Exception, A failed Gemini call with every key attempt that preceded it., The product's real GeminiExtractor, timing each labeled scan call and capturing…, _TimingGeminiExtractor, test_timing_gemini_extractor_http_status_is_none_on_success(), fake_generate_traced(), test_timing_gemini_extractor_records_http_status_on_failure() (+9 more)

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

### Community 25 - "review-queue/seam.ts"
Cohesion: 0.06
Nodes (44): CaseReviewTarget, ReconciliationExceptionActionType, ReconciliationExceptionReviewTarget, ReviewAssignment, ReviewAssignmentState, ReviewHistoryEntry, PREPARED_FIXTURES, cloneRecord() (+36 more)

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

### Community 30 - "test_integration_matrix.py"
Cohesion: 0.14
Nodes (36): Status, _audit(), _boom_generate(), _build_case(), _create_workspace(), _FakeEquivalence, _FakeGeminiResponse, _gemini_stub() (+28 more)

### Community 31 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "benchmark_latency.py"
Cohesion: 0.11
Nodes (27): get_settings(), _clients(), health(), get, JSONResponse, ready(), AdmissionRecord, artifact_path() (+19 more)

### Community 33 - "Technical requirements"
Cohesion: 0.14
Nodes (14): Canonical enums and output contract, Decision register, Deployment, security, and observability, Failure contract, Format routing and provenance, Interface schemas, Jev decision rules, Locked architecture and model ownership (+6 more)

### Community 34 - "Product requirements"
Cohesion: 0.13
Nodes (15): Decision ownership, Evaluator contract, Finals scope, Functional requirements, Goals and boundaries, Goals and measurable success, Human review and provenance, Non-goals (+7 more)

### Community 35 - "Research"
Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 38 - "run_benchmark"
Cohesion: 0.17
Nodes (32): PairAnalyzed, PairAnalyzer, Protocol, One trial's extraction stages. `analyses` is the product's real `(si, bl)`…, Run `warmup` discarded trials then `trials` measured ones, sequentially. Every…, run_benchmark(), _doc(), _FakeAnalyzer (+24 more)

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

### Community 60 - "observability.py"
Cohesion: 0.12
Nodes (27): bind_request_context(), configure_event_logging(), emit_event(), install_observability(), BaseHTTPMiddleware, Exception, FastAPI, JSONResponse (+19 more)

### Community 61 - "Legal defence and Q&A preparation"
Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 62 - "test_pipeline.py"
Cohesion: 0.18
Nodes (39): FieldVerdictRecord, ComparisonPipeline, Compare a BL_READY case's SI/draft-BL pair and record the verdict., _ambiguous_bl_case(), _audit(), _boom_generate(), _create_workspace(), _FakeEquivalence (+31 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "sha256_hex"
Cohesion: 0.27
Nodes (10): _canonical_json(), IdempotencyConflict, _payload_hash(), RuntimeError, receipt_request_hash(), SubmissionStageResult, sha256_hex(), SubmissionArtifact (+2 more)

### Community 65 - "web/package.json"
Cohesion: 0.04
Nodes (46): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+38 more)

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

### Community 72 - "test_benchmark_latency.py"
Cohesion: 0.08
Nodes (38): build_artifact(), _gemini_metadata(), _jev_metadata(), nearest_rank(), The nearest-rank quantile: rank = max(1, min(n, ceil(q * n))). Always an…, n/p50/p95/max per stage over non-warmup trials whose stage succeeded. Each…, Gemini run metadata. Never reads settings.gemini_api_key., Jev run metadata. Never reads settings.typesafe_api_key. (+30 more)

### Community 73 - "contracts.ts"
Cohesion: 0.06
Nodes (52): AmbiguousReconciliation, CaseReviewAction, ExpectedShipment, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationOutcome, ReconciliationResult (+44 more)

### Community 74 - "contracts.py"
Cohesion: 0.06
Nodes (74): _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation, DocxProvenance, DocxTableLocation, MissingCaseReconciliation, Provenance (+66 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.23
Nodes (19): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+11 more)

### Community 77 - "routes.tsx"
Cohesion: 0.10
Nodes (24): ThemeSeed(), HeroFilm(), Button(), AppShell(), SiteFooter(), SiteShell(), ensureGuestSession(), applyTheme() (+16 more)

### Community 78 - "test_persistence.py"
Cohesion: 0.20
Nodes (35): AuditEventRecord, CaseRecord, EmailReceipt, AttachmentInput, ReviewAssignmentInput, _audit_context(), _classification_probabilities(), _create_classification_case() (+27 more)

### Community 79 - "email-detail/types.ts"
Cohesion: 0.03
Nodes (84): DropZone(), onDrop(), takeFiles(), DropZoneProps, FieldRow(), FieldRowProps, formatCeiling(), ProvenanceAnchor() (+76 more)

### Community 80 - "storage.py"
Cohesion: 0.08
Nodes (17): artifact_object_key(), GcsPrivateObjectStore, private_object_key(), _validate_hash(), _validate_private_key(), _validate_sha256(), asyncio, test_artifact_object_key_is_isolated_and_content_addressed() (+9 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "SeedCatalog"
Cohesion: 0.05
Nodes (76): get_seed_catalog(), Settings, load_seed_catalog(), The bundle bytes of one seed attachment; KeyError when unknown., The process-wide seed catalog, built once on first use. A build that fails is…, The seed catalog's build state, without starting or waiting on one., seed_status(), SeedCatalog (+68 more)

### Community 85 - "jev.py"
Cohesion: 0.16
Nodes (23): _answer_fields(), AsyncSystemOneClient, AttachmentLike, _call_batch(), ClassifiableEmail, _EmailState, _nonempty_string(), _parse_answer() (+15 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "test_health.py"
Cohesion: 0.07
Nodes (25): lifespan(), FastAPI, Response, Static files with fallback to index.html for client-side routes., Warm the shared seed catalog and close the live provider client. A broken…, SPAStaticFiles, _clean_seed_catalog_state(), _clean_settings() (+17 more)

### Community 89 - "generate-inbox-fixture.py"
Cohesion: 0.67
Nodes (3): classify_email(), main(), Generate apps/web/src/data/inbox-fixture.json from data/sdoc-hackathon-bundle.…

### Community 90 - "Overlays.tsx"
Cohesion: 0.05
Nodes (42): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps, FieldTriggerProps (+34 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.30
Nodes (14): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+6 more)

### Community 92 - "_only"
Cohesion: 0.17
Nodes (26): _only(), _pdf_document(), parametrize, A one-page digital PDF with each text on its own baseline, 28pt apart., test_blank_pdf_block_label_does_not_take_a_label_line_as_its_value(), test_blank_pdf_block_label_does_not_take_a_label_line_below_it(), test_blank_pdf_block_label_does_not_take_a_section_header_as_its_value(), test_blank_pdf_block_label_takes_a_value_line_opened_by_a_label_phrase() (+18 more)

### Community 93 - "test_contracts.py"
Cohesion: 0.11
Nodes (36): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), compute_subject_key(), EvaluatorOutput, field_validator, ReconciliationResult, serialize_evaluator_output() (+28 more)

### Community 94 - "reconciliation.py"
Cohesion: 0.14
Nodes (27): _candidate_component(), _canonical_timestamp(), execute_gate_two(), expected_shipment_to_input(), _FrozenModel, GateTwoExecution, load_expected_shipments_csv(), materialize_reconciliation_results() (+19 more)

### Community 95 - "seed_catalog.py"
Cohesion: 0.17
Nodes (26): band(), comparison_output(), _deterministic_reason(), equivalence_questions(), FieldDraft, needs_interactive_review(), Admit a valid SI/draft-BL pair and compare its seven fields. The SI is the…, resolve_verdicts() (+18 more)

### Community 96 - "read_bundle"
Cohesion: 0.16
Nodes (26): Validate and read an organizer inbox without inventing source timestamps., read_bundle(), _load_organizer_inbox(), LocalInbox, MemoryInbox, _ooxml_bytes(), parametrize, Path (+18 more)

### Community 97 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "test_jev_equivalence.py"
Cohesion: 0.15
Nodes (20): JevEquivalenceClient, One batched Noul request: is each textual SI/BL pair the same thing?, _Client, _fake_sdk(), _FakeNoul, _FakeRetryPolicy, _ok(), Any (+12 more)

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

### Community 104 - "test_submission_bundle.py"
Cohesion: 0.17
Nodes (28): GuestSession, ReconciliationResultRecord, ReconciliationRun, ReviewAssignmentRecord, Workspace, _audit(), _create_case(), _create_workspace() (+20 more)

### Community 105 - "KeyAttempt"
Cohesion: 0.10
Nodes (18): KeyAttempt, One Gemini call on one configured key, kept for the audit trail., FailingRoleDecider, rate_limited_then_succeeded_scan(), Shared PostgreSQL fixtures for building BL_READY comparison cases.…, Raises instead of deciding, like a Jev role-decision provider timeout., A scan read that only succeeds after the second key., _answer_not_in_the_text() (+10 more)

### Community 106 - "errors.py"
Cohesion: 0.20
Nodes (17): _api_problem_handler(), _http_exception_handler(), _inactive_workspace_handler(), install_api_errors(), NoStoreMiddleware, BaseHTTPMiddleware, FastAPI, JSONResponse (+9 more)

### Community 107 - "test_jev.py"
Cohesion: 0.16
Nodes (25): JevCategoryClient, _answer(), _Attachment, _Email, _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient, _ProviderError (+17 more)

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
Nodes (37): _async_database_url(), postgres_engine(), postgres_session(), postgres_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, fixture (+29 more)

### Community 114 - "FakeRenderer"
Cohesion: 0.20
Nodes (6): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests, factory(), factory()

### Community 115 - "persistence.py"
Cohesion: 0.09
Nodes (33): ClassificationAttempt, _created_at_column(), DocumentRoleDecisionRecord, _enum(), ExpectedShipmentRecord, ExtractionCache, IngestionRequest, JudgeRunRecord (+25 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "PersistenceService"
Cohesion: 0.11
Nodes (26): AuditContext, _expected_shipment_values(), ExpectedShipmentInput, ExpectedShipmentWriteResult, _judge_attempt_payload(), PersistenceService, Any, AsyncSession (+18 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "test_normalization.py"
Cohesion: 0.17
Nodes (24): container_count(), gross_weight_kg(), is_placeholder(), locode(), normalize(), ValueError, Deterministic normalization of the seven compared values. Numbers are parsed…, A present value that cannot be compared, such as a non-number. (+16 more)

### Community 122 - "JevDocumentRoleClient"
Cohesion: 0.16
Nodes (19): JevDocumentRoleClient, Ask Jev which document each attachment is, judged only by its text., RoleDocument, _answer(), _fake_sdk(), _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient (+11 more)

### Community 123 - "test_reconciliation.py"
Cohesion: 0.27
Nodes (20): ReconciliationOutcome, ExpectedShipmentBatchResult, ReconciliationRunWriteResult, DocumentKind, Reconcile exact identifiers without choosing winners in conflicts., reconcile_shipments(), _case(), asyncio (+12 more)

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

### Community 137 - "Category"
Cohesion: 0.11
Nodes (22): Category, StrEnum, InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, model_validator, _audit(), _FakePersistence (+14 more)

### Community 138 - "Base"
Cohesion: 0.21
Nodes (20): Base, _check_constraint(), test_audit_event_has_no_cascading_target_foreign_key(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_classification_metadata_supports_pending_and_ready_cases(), test_expected_shipments_retain_typed_reconciliation_inputs(), test_guest_workspace_can_reference_an_immutable_seed_workspace(), test_idempotency_key_and_guest_generation_are_scoped() (+12 more)

### Community 139 - "pipeline.py"
Cohesion: 0.19
Nodes (17): _check_values(), compare_fields(), _diagnostic(), PairAdmission, An UNREADABLE diagnostic for one attachment, with its provenance., unreadable_document(), _values(), DocumentAnalysis (+9 more)

### Community 140 - "ReviewPage.tsx"
Cohesion: 0.13
Nodes (11): errorMessage(), ReconciliationView(), handleImportCsv(), handleRerun(), ReviewQueueView(), readTab(), ReviewPage(), onTabKeyDown() (+3 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "test_failure_matrix.py"
Cohesion: 0.13
Nodes (29): GeminiExtractor, FailingEquivalence, Raises instead of judging, like a Jev equivalence provider timeout., _always_hangs(), _audit(), _both_keys_rate_limited(), _create_workspace(), _FakeGeminiResponse (+21 more)

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "test_document_role_persistence.py"
Cohesion: 0.44
Nodes (15): EmailAttachment, _decision(), asyncio, parametrize, postgres, _receipt(), test_cache_entry_round_trips_transcription(), test_extraction_event_for_another_workspace_content_hash_writes_nothing() (+7 more)

### Community 157 - "evidence.py"
Cohesion: 0.23
Nodes (15): _content_disposition(), _file_response_headers(), inline_file_response(), get, GuestDep, Response, SeedCatalogDep, ServicesDep (+7 more)

### Community 158 - "capture.mjs"
Cohesion: 0.15
Nodes (22): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+14 more)

### Community 159 - "test_api_actions.py"
Cohesion: 0.17
Nodes (48): Services, _audit_events(), catalog(), client(), _copied_rows(), _guest(), _held_review(), _history() (+40 more)

### Community 160 - "Preflight"
Cohesion: 0.19
Nodes (13): detect_format(), _detect_ooxml_format(), _expands_past_cap(), _name(), Preflight, _preflight_pdf(), result(), Exception (+5 more)

### Community 161 - "test_document_analyzer.py"
Cohesion: 0.14
Nodes (27): DocumentAnalyzer, _BrokenCache, _Cache, _CancelObservingGemini, _Gemini, _input(), asyncio, AttachmentInput (+19 more)

### Community 163 - "judge_routes.py"
Cohesion: 0.18
Nodes (19): create_run(), list_runs(), get, GuestDep, post, Request, Response, SeedCatalogDep (+11 more)

### Community 164 - "AttachmentInput"
Cohesion: 0.11
Nodes (18): AttachmentInput, _scan(), _BundleDirectory, _case_snapshot(), _classified_case(), BaseModel, Path, Answers that stand in for the providers when the seed is built. ``categories``… (+10 more)

### Community 165 - "EvaluationPage.tsx"
Cohesion: 0.13
Nodes (3): EvaluationPage(), brokenSource, pendingSource

### Community 166 - "SimpleNamespace"
Cohesion: 0.16
Nodes (23): generate(), generate_traced(), Call Gemini; only a 429 moves the same request to the second key. Pass a…, Call Gemini, retrying once on the second key if the first is rate-limited., Total/prompt/candidates token counts from a response's usage_metadata. None…, _token_usage(), test_gemini_resolved_endpoint_reads_the_constructed_clients_base_url(), test_token_usage_extracts_known_fields_from_a_fake_response() (+15 more)

### Community 167 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 168 - "speak.py"
Cohesion: 0.22
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 169 - "test_api_judge.py"
Cohesion: 0.15
Nodes (46): JevFailureCode, StrEnum, _anchored_text(), client(), _Equivalence, _gemini_reads_values_not_in_the_text(), _GeminiResponse, _guest() (+38 more)

### Community 170 - "deps.py"
Cohesion: 0.09
Nodes (21): build_judge(), build_services(), get_judge(), get_materializer(), get_services(), _JevNotWired, Request, SeedCatalogDep (+13 more)

### Community 171 - "API Contract"
Cohesion: 0.18
Nodes (10): API Contract, Global Constraints, Issue 30 Product API Implementation Plan, Task 1: Error envelope, guest sessions, and reset, Task 2: Deterministic seed catalog and bundle packaging, Task 3: Inbox, detail, summary, and reconciliation reads, Task 4: Private evidence and artifact downloads, Task 5: Copy-on-write review actions for seed cases and exceptions (+2 more)

### Community 172 - "ExtractionFailure"
Cohesion: 0.10
Nodes (15): APIError, _call_failure(), ExtractionFailure, GeminiOutcome, _per_day_quota(), Exception, Whether a 429 names a per-day quota; per-minute ones are rate limits. Every…, A fail-closed extraction outcome that must surface as retry or review. (+7 more)

### Community 173 - "vitest"
Cohesion: 0.11
Nodes (18): App(), KeyedRoutes(), options, css, renderView(), clearGuestSession(), createGuestSession(), GuestSession (+10 more)

### Community 174 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 27 Attachment Preflight and Extraction Implementation Plan, Task 1: Parser dependencies and deterministic preflight, Task 2: Local parsers with format-matched provenance, Task 3: Traced Gemini calls and fail-closed Gemini extraction, Task 4: Pinned Jev document-role decisions, Task 5: Persist role decisions and cache transcriptions, Task 6: Document analyzer that routes, caches, and fails closed

### Community 175 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 28 Seven-Field Comparison Implementation Plan, Task 1: Deterministic normalization, Task 2: Pinned Jev semantic equivalence, Task 3: Pair admission, field verdicts, and evaluator mapping, Task 4: Persist comparison results and case review state, Task 5: Case review action service, Task 6: Comparison pipeline for BL-ready cases

### Community 176 - "extraction.py"
Cohesion: 0.10
Nodes (25): ExtractedValue, ExtractionResult, ScannedPdfLocation, ScannedPdfProvenance, CachedExtraction, ExtractionCache, GeminiField, GeminiFields (+17 more)

### Community 177 - "judge.py"
Cohesion: 0.14
Nodes (20): _check_errors(), JudgeService, _latency_ms(), datetime, Protocol, UUID, Live judge runs over an uploaded synthetic SI/draft-BL pair. An upload is…, Report a reset or an unexpected failure of a check in the envelope. (+12 more)

### Community 178 - "manifest.py"
Cohesion: 0.43
Nodes (7): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), Resolve narration rows against measured visual beats., resolve_lines()

### Community 179 - "test_submission_persistence.py"
Cohesion: 0.23
Nodes (24): SubmissionRun, SubmissionRunRecord, CaseInput, _audit(), _manifest_hash(), asyncio, parametrize, postgres (+16 more)

### Community 180 - "schedule.py"
Cohesion: 0.48
Nodes (6): atomic_json_write(), deconflict(), main(), probe_duration_ms(), Place narration segments without crossing visual boundaries., schedule()

### Community 181 - "subtitles.py"
Cohesion: 0.48
Nodes (6): main(), make_spans(), Generate compact, non-overlapping SRT subtitle cards., render_srt(), timestamp(), wrap_rows()

### Community 182 - "DocumentRole"
Cohesion: 0.20
Nodes (37): admit_pair(), ReviewReason, DocumentRole, _check(), _container_admission(), _corrupt(), _doc(), _jev_timeout() (+29 more)

### Community 183 - "test_formats.py"
Cohesion: 0.09
Nodes (31): PreflightError, ValueError, Raised when a caller parses a document whose preflight did not pass., _page_image(), _parse(), Place a small grey PNG over rect on a PyMuPDF page., _read(), test_an_archive_expanding_past_the_cap_is_too_large_before_it_is_inflated() (+23 more)

### Community 184 - "test_comparison_persistence.py"
Cohesion: 0.24
Nodes (33): structural_output(), ReviewActionInput, build_bl_ready_case(), UUID, Persist the given SI/BL attachments and classify the case BL_READY. Defaults to…, _audit_context(), _case_assignment_states(), _create_workspace() (+25 more)

### Community 185 - "StageRecord"
Cohesion: 0.14
Nodes (10): LiveAnalyzer, The pipeline status end_to_end and the TrialRecord both report. Derived from…, Times the product's real `JevDocumentRoleClient.decide()` call., Drives the product's real `DocumentAnalyzer` for one SI/draft-BL pair., analyzer_factory(), StageRecord, _TimingRoleDecider, _trial_status() (+2 more)

### Community 187 - "test_api_wiring.py"
Cohesion: 0.19
Nodes (15): _clean_settings(), client(), _guest(), AsyncClient, asyncio, fixture, MonkeyPatch, postgres (+7 more)

### Community 190 - "ApiProblem"
Cohesion: 0.19
Nodes (12): ApiProblem, Exception, create_session(), get, GuestDep, post, Request, ServicesDep (+4 more)

### Community 191 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 192 - "demo-reset.ts"
Cohesion: 0.12
Nodes (23): defaultEmailDetailService, defaultReviewQueueService, abortInFlight(), API_SESSION_KEY, ApiError, apiFetch(), apiJson(), errorFrom() (+15 more)

### Community 193 - "JevRoleDecision"
Cohesion: 0.16
Nodes (8): JevRoleDecision, BaseModel, _DecidedRoles, Document roles read from the decisions, never presented as Jev output., _role_decision(), _role_decision(), Document-role decisions read only from the seed decisions' content-hash map., _SeedRoles

### Community 194 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 32 Live-Path Benchmark and Test Matrix Implementation Plan, Task 1: Read scanned attachments concurrently, Task 2: Rewrite the benchmark script, Task 3: Dataset edge-case integration matrix, Task 4: Provider failure matrix, Task 5: Mocked 520-email run publishes a valid artifact, Task 6: Live measurement and retained artifact

### Community 195 - "test_api_reads.py"
Cohesion: 0.05
Nodes (82): CaseActionBody, ExceptionActionBody, _named_reviewer(), BaseModel, GuestDep, MaterializerDep, post, Request (+74 more)

### Community 196 - "ComparedField"
Cohesion: 0.15
Nodes (20): ComparedField, _label_key(), parse_document(), Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally., A label as the field patterns read it: NFKC, lower case, CJK removed,…, test_local_extraction_keeps_local_anchors(), Shipper merged across A1:B1 with its value in C1, a gross weight formula saved…, Test that block labels followed by colons are parsed correctly. (+12 more)

### Community 197 - "_docx_document"
Cohesion: 0.18
Nodes (14): _col(), _docx_document(), _docx_row_document(), Parse a DOCX whose one-row table has one cell per text., Parse a python-docx document built in memory., test_docx_cells_before_a_rows_first_label_are_unlabelled(), test_docx_full_width_label_above_a_row_with_a_later_label_stays_blank(), test_docx_full_width_label_followed_by_a_label_row_stays_blank() (+6 more)

### Community 198 - "ExpectedShipment"
Cohesion: 0.27
Nodes (11): _case_identifiers(), CaseSnapshot, ExpectedShipment, _matching_namespaces(), _normalize_identifier(), model_validator, Self, _require_unique_inputs() (+3 more)

### Community 199 - "ingestion.py"
Cohesion: 0.11
Nodes (21): AttachmentReceipt, _check_local_source_path(), Gate1Classifier, Gate1Persistence, Gate1RunSummary, InboxSource, _is_link(), _PendingClassification (+13 more)

### Community 200 - "JevEquivalence"
Cohesion: 0.25
Nodes (5): EquivalenceQuestion, JevEquivalence, EquivalenceJudge, No Jev equivalence answer was ever recorded in the seed decisions file…, _SeedEquivalence

### Community 201 - "JevProviderFailure"
Cohesion: 0.22
Nodes (3): JevProviderFailure, A provider failure with safe context for persistence and retry policy., _FailingClassifier

### Community 202 - "test_api_session.py"
Cohesion: 0.09
Nodes (40): get_engine(), get_session(), get_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn() (+32 more)

### Community 203 - "parse_expected_shipments_csv"
Cohesion: 0.38
Nodes (10): parse_expected_shipments_csv(), Parse a complete synthetic ledger or reject it without partial output., _csv_text(), parametrize, test_parser_rejects_duplicate_shipment_ids_atomically(), test_parser_rejects_invalid_typed_cells(), test_parser_rejects_unknown_or_missing_columns(), test_parser_returns_typed_immutable_rows_with_a_canonical_hash() (+2 more)

### Community 204 - "Product API"
Cohesion: 0.22
Nodes (8): Conventions, Evidence And Artifacts, Guest Sessions And Reset, Health And Readiness, Inbox And Case Review, Judge Uploads, Product API, Reconciliation And Exception Review

### Community 205 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Issue 40 Settings and Reset All Implementation Plan, Task 1: Product API client with a server-minted session, Task 2: Reset orchestration and remount key, Task 3: In-house confirmation dialog, Task 4: The /settings view with Reset All

### Community 206 - "_xlsx_document"
Cohesion: 0.31
Nodes (9): _cell(), Parse a one-sheet workbook with these rows of cell values., test_xlsx_cells_before_a_rows_first_label_are_unlabelled(), test_xlsx_label_directly_before_another_label_has_no_value(), test_xlsx_label_skips_an_empty_spacer_cell_to_its_value(), test_xlsx_label_with_only_empty_cells_before_the_next_label_is_blank(), test_xlsx_row_with_two_label_value_pairs_reads_both(), test_xlsx_uncached_formula_past_a_spacer_is_still_the_value_cell() (+1 more)

### Community 208 - "_docx_paragraph_document"
Cohesion: 0.40
Nodes (6): _docx_paragraph_document(), _paragraph(), Parse a DOCX with one body paragraph per text ("\\n" is a line break)., test_docx_blank_paragraph_label_does_not_take_a_label_paragraph_below_it(), test_docx_blank_paragraph_label_takes_its_value_from_the_next_paragraph(), test_docx_paragraph_with_an_unknown_label_before_a_colon_goes_to_gemini()

### Community 209 - "._receive"
Cohesion: 0.50
Nodes (4): _message_bytes(), Receive the pair as an email whose category the uploader declared., The upload as a message: its file names and hashes, canonical JSON., _Upload

### Community 211 - "materialize.py"
Cohesion: 0.15
Nodes (19): GuestContext, BundleEmail, canonical_message_bytes(), BaseModel, field_validator, guest_case_id(), guest_reconciliation_id(), _message_bytes() (+11 more)

### Community 213 - "GeminiNotConfigured"
Cohesion: 0.67
Nodes (3): GeminiNotConfigured, RuntimeError, _unconfigured()

## Knowledge Gaps
- **941 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+936 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1581 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PersistenceService` connect `PersistenceService` to `Category`, `pipeline.py`, `submission.py`, `test_failure_matrix.py`, `test_document_role_persistence.py`, `test_integration_matrix.py`, `test_api_actions.py`, `test_api_judge.py`, `deps.py`, `extraction.py`, `judge.py`, `test_submission_persistence.py`, `test_comparison_persistence.py`, `test_pipeline.py`, `sha256_hex`, `test_api_reads.py`, `ComparedField`, `test_api_session.py`, `test_persistence.py`, `.__init__`, `materialize.py`, `SeedCatalog`, `test_contracts.py`, `reconciliation.py`, `seed_catalog.py`, `test_submission_bundle.py`, `KeyAttempt`, `persistence.py`, `test_reconciliation.py`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `ComparedField` connect `ComparedField` to `Category`, `pipeline.py`, `submission.py`, `test_extraction.py`, `test_document_role_persistence.py`, `test_integration_matrix.py`, `test_document_analyzer.py`, `AttachmentInput`, `run_benchmark`, `test_api_judge.py`, `extraction.py`, `test_submission_persistence.py`, `DocumentRole`, `test_formats.py`, `test_comparison_persistence.py`, `test_pipeline.py`, `test_api_reads.py`, `_docx_document`, `JevEquivalence`, `test_benchmark_latency.py`, `contracts.py`, `_xlsx_document`, `_docx_paragraph_document`, `SeedCatalog`, `jev.py`, `_only`, `test_contracts.py`, `seed_catalog.py`, `test_jev_equivalence.py`, `KeyAttempt`, `persistence.py`, `PersistenceService`, `test_normalization.py`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `DocumentRole` connect `DocumentRole` to `test_document_analyzer.py`, `JevRoleDecision`, `AttachmentInput`, `run_benchmark`, `test_benchmark_latency.py`, `test_api_judge.py`, `test_submission_bundle.py`, `extraction.py`, `test_failure_matrix.py`, `SeedCatalog`, `jev.py`, `test_comparison_persistence.py`, `test_pipeline.py`, `JevDocumentRoleClient`, `test_integration_matrix.py`, `seed_catalog.py`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 96 inferred relationships involving `PersistenceService` (e.g. with `build_judge()` and `Services`) actually correct?**
  _`PersistenceService` has 96 INFERRED edges - model-reasoned connections that need verification._
- **Are the 127 inferred relationships involving `ComparedField` (e.g. with `_check_values()` and `compare_fields()`) actually correct?**
  _`ComparedField` has 127 INFERRED edges - model-reasoned connections that need verification._
- **Are the 93 inferred relationships involving `InMemoryPrivateObjectStore` (e.g. with `services()` and `client()`) actually correct?**
  _`InMemoryPrivateObjectStore` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `AuditContext` (e.g. with `submit_exception_action()` and `PersistenceExtractionCache`) actually correct?**
  _`AuditContext` has 12 INFERRED edges - model-reasoned connections that need verification._