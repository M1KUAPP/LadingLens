# Graph Report - issue-32  (2026-09-21)

## Corpus Check
- 303 files · ~390,580 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 49 file(s) not represented in the graph (top: .css 30, (none) 12, .lock 3)

## Summary
- 3639 nodes · 9230 edges · 208 communities (176 shown, 21 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 1130 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba00ff39`
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
- contracts.ts
- compilerOptions
- The Stakes of One Missed Document-Checking Email
- Canvas UI
- Jakub Krehel's interface skills
- Domain.tsx
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
- test_integration_matrix.py
- web/package.json
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- CytoscapeCanvas.tsx
- test_benchmark_latency.py
- ReconciliationView.tsx
- formats.py
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- routes.tsx
- InMemoryPrivateObjectStore
- email-detail/types.ts
- storage.py
- The Views
- Global Constraints
- test_seed_catalog.py
- jev.py
- Motion
- Global Constraints
- get_settings
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- ComparedField
- test_contracts.py
- reconciliation.py
- CaseReviewService
- read_bundle
- .oxlintrc.json
- test_smoke_deployment.py
- test_jev_equivalence.py
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Timeline
- End-to-end flow and state machine
- test_reconciliation_persistence.py
- KeyAttempt
- ApiProblem
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
- test_jev_document_roles.py
- TrialRecord
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
- test_deployment_hardening.py
- DocumentRole
- test_api_evidence.py
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
- test_api_reads.py
- capture.mjs
- ingestion.py
- Preflight
- test_document_analyzer.py
- contracts.py
- errors.py
- _BundleDirectory
- devDependencies
- SimpleNamespace
- Results by route
- speak.py
- ReviewPage.tsx
- deps.py
- API Contract
- ExtractionFailure
- vitest
- Global Constraints
- Global Constraints
- extraction.py
- _FakePersistence
- manifest.py
- test_submission_persistence.py
- schedule.py
- subtitles.py
- dependencies
- detect_format
- test_api_session.py
- StageRecord
- JevProviderFailure
- Submission
- _CrashingRoleDecider
- test_submission_bundle.py
- Global Constraints
- Gate1Persistence
- .locate
- model_validator
- _BrokenCache
- LocalInbox
- _quota_error
- AsyncSystemOneClient
- _typesafe_sdk_retry_policy
- label_field
- BundleEmail
- _token_usage
- .validate_probability_distribution
- test_damaged_pdf_page_content_returns_corrupt_status

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 207 edges
2. `ComparedField` - 128 edges
3. `InMemoryPrivateObjectStore` - 108 edges
4. `DocumentRole` - 78 edges
5. `AuditContext` - 75 edges
6. `Category` - 55 edges
7. `ComparisonPipeline` - 51 edges
8. `JevProviderFailure` - 50 edges
9. `ReviewReason` - 44 edges
10. `vitest` - 41 edges

## Surprising Connections (you probably didn't know these)
- `test_provenance_rejects_bbox_for_scanned_pdf()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_provenance_rejects_location_for_unreadable_file()` --uses--> `Provenance`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_extracted_value_accepts_contract_fields_and_json_scalar()` --uses--> `ExtractedValue`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `test_field_verdict_accepts_deterministic_interactive_and_batch_results()` --uses--> `FieldVerdict`  [INFERRED]
  apps/api/tests/test_contracts.py → apps/api/app/contracts.py
- `Services` --uses--> `PersistenceService`  [INFERRED]
  apps/api/app/api/deps.py → apps/api/app/persistence.py

## Import Cycles
- None detected.

## Communities (208 total, 21 thin omitted)

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
Nodes (53): _submission_json(), build_submission_artifact(), EndToEndScore, _FrozenModel, _output_for_snapshot(), AsyncClient, BaseModel, model_validator (+45 more)

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
Cohesion: 0.12
Nodes (34): ExtractionFailureCode, GeminiDocument, grounded_extraction(), ExtractedValue, StrEnum, Merge local values with Gemini values anchored back in the source., scan_extraction(), _answer() (+26 more)

### Community 19 - "GeminiCallError"
Cohesion: 0.20
Nodes (14): GeminiCallError, Exception, A failed Gemini call with every key attempt that preceded it., The product's real GeminiExtractor, timing each labeled scan call and capturing…, _TimingGeminiExtractor, test_timing_gemini_extractor_http_status_is_none_on_success(), test_timing_gemini_extractor_records_http_status_on_failure(), fake_generate_traced() (+6 more)

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

### Community 25 - "contracts.ts"
Cohesion: 0.06
Nodes (50): StatusPill(), CaseReviewAction, CaseReviewTarget, ReconciliationBase, ReconciliationExceptionActionType, ReconciliationExceptionReviewAction, ReconciliationExceptionReviewTarget, ReconciliationOutcome (+42 more)

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

### Community 30 - "Domain.tsx"
Cohesion: 0.05
Nodes (39): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, FieldControlProps, FieldProps, FieldTriggerProps, DropZone() (+31 more)

### Community 31 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "benchmark_latency.py"
Cohesion: 0.08
Nodes (33): AdmissionRecord, artifact_path(), EquivalenceJudge, _gemini_metadata(), _gemini_resolved_endpoint(), _git_short_sha(), _jev_metadata(), _jev_resolved_endpoint() (+25 more)

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
Cohesion: 0.19
Nodes (29): PairAnalyzed, One trial's extraction stages. `analyses` is the product's real `(si, bl)`…, Run `warmup` discarded trials then `trials` measured ones, sequentially. Every…, run_benchmark(), _doc(), _FakeAnalyzer, _FakeClock, _FakeEquivalence (+21 more)

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
Cohesion: 0.17
Nodes (37): FieldVerdictRecord, ComparisonPipeline, Compare a BL_READY case's SI/draft-BL pair and record the verdict., _audit(), _boom_generate(), _create_workspace(), _FakeEquivalence, _FakeRoleDecider (+29 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "test_integration_matrix.py"
Cohesion: 0.17
Nodes (31): Status, _audit(), _boom_generate(), _build_case(), _create_workspace(), _FakeEquivalence, _gemini_stub(), _new_case() (+23 more)

### Community 65 - "web/package.json"
Cohesion: 0.11
Nodes (17): name, private, type, version, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, jsdom (+9 more)

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
Nodes (34): StatusKind, AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundary, CanvasBoundaryProps, ControlGraphView() (+26 more)

### Community 72 - "test_benchmark_latency.py"
Cohesion: 0.15
Nodes (24): build_artifact(), nearest_rank(), The nearest-rank quantile: rank = max(1, min(n, ceil(q * n))). Always an…, n/p50/p95/max per stage over non-warmup trials whose stage succeeded. Each…, Assemble the full JSON-serializable artifact for one benchmark run. `completed`…, summarize(), _check(), _end_to_end_only() (+16 more)

### Community 73 - "ReconciliationView.tsx"
Cohesion: 0.05
Nodes (50): Tooltip(), AmbiguousReconciliation, ExpectedShipment, MissingCaseReconciliation, ReconciliationResult, reconciliationResultProblems(), RequiredDocument, SourceFreshness (+42 more)

### Community 74 - "formats.py"
Cohesion: 0.08
Nodes (52): DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation, DocxProvenance, DocxTableLocation, Provenance, TxtLocation, TxtProvenance (+44 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.23
Nodes (19): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+11 more)

### Community 77 - "routes.tsx"
Cohesion: 0.08
Nodes (23): ThemeSeed(), HeroFilm(), Button(), AppShell(), SiteFooter(), SiteShell(), applyTheme(), isTheme() (+15 more)

### Community 78 - "InMemoryPrivateObjectStore"
Cohesion: 0.20
Nodes (34): AuditEventRecord, CaseRecord, EmailReceipt, ReviewAssignmentInput, InMemoryPrivateObjectStore, _audit_context(), _classification_probabilities(), _create_classification_case() (+26 more)

### Community 79 - "email-detail/types.ts"
Cohesion: 0.04
Nodes (63): Category, ComparedField, AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP (+55 more)

### Community 80 - "storage.py"
Cohesion: 0.08
Nodes (16): artifact_object_key(), GcsPrivateObjectStore, private_object_key(), _validate_hash(), _validate_private_key(), _validate_sha256(), asyncio, test_artifact_object_key_is_isolated_and_content_addressed() (+8 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "test_seed_catalog.py"
Cohesion: 0.10
Nodes (34): The bundle bytes of one seed attachment; KeyError when unknown., SeedCatalog, _build(), catalog(), _decisions(), _ExplodingLock, _hash(), fixture (+26 more)

### Community 85 - "jev.py"
Cohesion: 0.22
Nodes (20): _answer_fields(), _call_batch(), ClassifiableEmail, _EmailState, _nonempty_string(), _parse_answer(), _parse_noul(), _parse_probability_distribution() (+12 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "get_settings"
Cohesion: 0.08
Nodes (28): get_settings(), health(), lifespan(), FastAPI, get, JSONResponse, Response, Warm the shared seed catalog so the first request never pays the build. (+20 more)

### Community 89 - "generate-inbox-fixture.py"
Cohesion: 0.67
Nodes (3): classify_email(), main(), Generate apps/web/src/data/inbox-fixture.json from data/sdoc-hackathon-bundle.…

### Community 90 - "Overlays.tsx"
Cohesion: 0.07
Nodes (23): Field(), addDays(), addMonths(), DatePicker(), onKeyDown(), DatePickerProps, Menu(), MenuItem() (+15 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.30
Nodes (14): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+6 more)

### Community 92 - "ComparedField"
Cohesion: 0.09
Nodes (60): ComparedField, parse_document(), PreflightError, ValueError, Raised when a caller parses a document whose preflight did not pass., Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally., _docx_document(), _only() (+52 more)

### Community 93 - "test_contracts.py"
Cohesion: 0.10
Nodes (36): _canonical_hash(), _canonical_ids(), compute_subject_key(), EvaluatorOutput, field_validator, ReconciliationResult, serialize_evaluator_output(), parametrize (+28 more)

### Community 94 - "reconciliation.py"
Cohesion: 0.08
Nodes (70): ReconciliationOutcome, ExpectedShipmentBatchResult, ReconciliationRunWriteResult, _candidate_component(), _canonical_timestamp(), _case_identifiers(), CaseSnapshot, DocumentKind (+62 more)

### Community 95 - "CaseReviewService"
Cohesion: 0.17
Nodes (13): CaseReviewService, Any, UUID, ValueError, Named-reviewer dispositions for cases held for review., ReviewRejected, _Persistence, asyncio (+5 more)

### Community 96 - "read_bundle"
Cohesion: 0.20
Nodes (24): Validate and read an organizer inbox without inventing source timestamps., read_bundle(), _load_organizer_inbox(), MemoryInbox, _ooxml_bytes(), parametrize, _record(), test_attachment_receipt_preserves_bytes_hash_size_and_ordinal() (+16 more)

### Community 97 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "test_jev_equivalence.py"
Cohesion: 0.15
Nodes (21): EquivalenceQuestion, JevEquivalenceClient, One batched Noul request: is each textual SI/BL pair the same thing?, _Client, _fake_sdk(), _FakeNoul, _FakeRetryPolicy, _ok() (+13 more)

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

### Community 104 - "test_reconciliation_persistence.py"
Cohesion: 0.27
Nodes (19): ReconciliationResultRecord, ReconciliationRun, ReviewAssignmentRecord, ExpectedShipmentInput, Persist a complete immutable run, or roll the whole run back., _audit(), _create_case(), _create_workspace() (+11 more)

### Community 105 - "KeyAttempt"
Cohesion: 0.12
Nodes (15): KeyAttempt, One Gemini call on one configured key, kept for the audit trail., FailingRoleDecider, rate_limited_then_succeeded_scan(), Shared PostgreSQL fixtures for building BL_READY comparison cases.…, Raises instead of deciding, like a Jev role-decision provider timeout., A scan read that only succeeds after the second key., _FakeGeminiResponse (+7 more)

### Community 106 - "ApiProblem"
Cohesion: 0.14
Nodes (21): ApiProblem, Exception, _content_disposition(), get, GuestDep, Response, SeedCatalogDep, ServicesDep (+13 more)

### Community 107 - "test_jev.py"
Cohesion: 0.19
Nodes (22): JevCategoryClient, _answer(), _Attachment, _Email, _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient, _ProviderError (+14 more)

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

### Community 115 - "persistence.py"
Cohesion: 0.07
Nodes (49): Base, ClassificationAttempt, _created_at_column(), DocumentRoleDecisionRecord, _enum(), ExpectedShipmentRecord, ExtractionCache, IngestionRequest (+41 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "PersistenceService"
Cohesion: 0.11
Nodes (25): AuditContext, _canonical_json(), _expected_shipment_values(), IdempotencyConflict, _payload_hash(), PersistenceService, Any, async_sessionmaker (+17 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "test_normalization.py"
Cohesion: 0.21
Nodes (20): container_count(), gross_weight_kg(), is_placeholder(), normalize(), ValueError, Deterministic normalization of the seven compared values. Numbers are parsed…, A present value that cannot be compared, such as a non-number., text_key() (+12 more)

### Community 122 - "test_jev_document_roles.py"
Cohesion: 0.18
Nodes (18): JevDocumentRoleClient, Ask Jev which document each attachment is, judged only by its text., _answer(), _fake_sdk(), _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient, Any (+10 more)

### Community 123 - "TrialRecord"
Cohesion: 0.15
Nodes (9): TrialRecord, _fake_main_environment(), Reproduces the reported bug: the committed artifact's started_at_utc (and file…, test_main_stamps_started_at_utc_with_the_runs_start_not_its_finish(), test_main_still_writes_the_artifact_when_git_is_unavailable(), test_main_succeeds_normally_when_the_run_completes(), test_main_writes_a_partial_artifact_with_completed_false_when_interrupted(), fake_run_live() (+1 more)

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
Cohesion: 0.16
Nodes (18): Category, StrEnum, InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, BaseModel, _audit(), _IncompleteClassifier (+10 more)

### Community 138 - "test_deployment_hardening.py"
Cohesion: 0.13
Nodes (24): get_engine(), get_session(), get_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn() (+16 more)

### Community 139 - "DocumentRole"
Cohesion: 0.06
Nodes (114): admit_pair(), band(), _check_values(), compare_fields(), comparison_output(), _deterministic_reason(), _diagnostic(), equivalence_questions() (+106 more)

### Community 140 - "test_api_evidence.py"
Cohesion: 0.43
Nodes (13): _guest_headers(), AsyncClient, asyncio, parametrize, postgres, GET /api/evidence/{id} and the judge artifact downloads. Expected bytes are…, test_downloads_require_a_guest_session(), test_evidence_bytes_match_the_bundle_file_with_inline_headers() (+5 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "test_failure_matrix.py"
Cohesion: 0.11
Nodes (30): GeminiExtractor, FailingEquivalence, Raises instead of judging, like a Jev equivalence provider timeout., _always_hangs(), _audit(), _both_keys_rate_limited(), _create_workspace(), _FakeGeminiResponse (+22 more)

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "test_document_role_persistence.py"
Cohesion: 0.26
Nodes (22): EmailAttachment, GuestSession, AttachmentInput, DocumentRoleDecisionInput, receipt_request_hash(), ReceiptInput, _decision(), asyncio (+14 more)

### Community 157 - "test_api_reads.py"
Cohesion: 0.11
Nodes (44): get, GuestDep, SeedCatalogDep, read_reconciliation(), _attachment_view(), _document_type(), email_detail_view(), _field_verdict_view() (+36 more)

### Community 158 - "capture.mjs"
Cohesion: 0.15
Nodes (22): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+14 more)

### Community 159 - "ingestion.py"
Cohesion: 0.15
Nodes (16): AttachmentReceipt, _check_local_source_path(), Gate1Classifier, Gate1RunSummary, InboxSource, _is_link(), _PendingClassification, datetime (+8 more)

### Community 160 - "Preflight"
Cohesion: 0.28
Nodes (8): AttachmentInput, _scan(), _name(), Preflight, _preflight_pdf(), result(), Exception, Hash, size, and identify bytes; reject unsupported or corrupt files.

### Community 161 - "test_document_analyzer.py"
Cohesion: 0.20
Nodes (24): DocumentAnalyzer, _Cache, _CancelObservingGemini, _Gemini, _input(), asyncio, AttachmentInput, parametrize (+16 more)

### Community 162 - "contracts.py"
Cohesion: 0.27
Nodes (11): AmbiguousReconciliation, _ContractModel, MissingCaseReconciliation, _ProvenanceIdentity, BaseModel, ReconciliationBase, ScannedPdfLocation, ScannedPdfProvenance (+3 more)

### Community 163 - "errors.py"
Cohesion: 0.15
Nodes (20): _api_problem_handler(), _http_exception_handler(), install_api_errors(), NoStoreMiddleware, BaseHTTPMiddleware, FastAPI, JSONResponse, Request (+12 more)

### Community 164 - "_BundleDirectory"
Cohesion: 0.40
Nodes (3): _BundleDirectory, Path, The organiser bundle on disk, read in email-id order.

### Community 165 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, jsdom, oxlint, playwright, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+6 more)

### Community 166 - "SimpleNamespace"
Cohesion: 0.15
Nodes (26): _clients(), GeminiNotConfigured, generate(), generate_traced(), RuntimeError, Call Gemini; only a 429 moves the same request to the second key. Pass a…, Call Gemini, retrying once on the second key if the first is rate-limited., test_gemini_resolved_endpoint_reads_the_constructed_clients_base_url() (+18 more)

### Community 167 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 168 - "speak.py"
Cohesion: 0.22
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 169 - "ReviewPage.tsx"
Cohesion: 0.13
Nodes (11): errorMessage(), ReconciliationView(), handleImportCsv(), handleRerun(), ReviewQueueView(), readTab(), ReviewPage(), onTabKeyDown() (+3 more)

### Community 170 - "deps.py"
Cohesion: 0.11
Nodes (18): build_services(), get_seed_catalog(), get_services(), Request, ServicesDep, require_guest(), Services, Settings (+10 more)

### Community 171 - "API Contract"
Cohesion: 0.18
Nodes (10): API Contract, Global Constraints, Issue 30 Product API Implementation Plan, Task 1: Error envelope, guest sessions, and reset, Task 2: Deterministic seed catalog and bundle packaging, Task 3: Inbox, detail, summary, and reconciliation reads, Task 4: Private evidence and artifact downloads, Task 5: Copy-on-write review actions for seed cases and exceptions (+2 more)

### Community 172 - "ExtractionFailure"
Cohesion: 0.09
Nodes (15): APIError, _call_failure(), ExtractionFailure, GeminiOutcome, _per_day_quota(), Exception, Whether a 429 names a per-day quota; per-minute ones are rate limits. Every…, A fail-closed extraction outcome that must surface as retry or review. (+7 more)

### Community 173 - "vitest"
Cohesion: 0.13
Nodes (14): App(), options, css, mocks, renderView(), clearGuestSession(), createGuestSession(), ensureGuestSession() (+6 more)

### Community 174 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 27 Attachment Preflight and Extraction Implementation Plan, Task 1: Parser dependencies and deterministic preflight, Task 2: Local parsers with format-matched provenance, Task 3: Traced Gemini calls and fail-closed Gemini extraction, Task 4: Pinned Jev document-role decisions, Task 5: Persist role decisions and cache transcriptions, Task 6: Document analyzer that routes, caches, and fails closed

### Community 175 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 28 Seven-Field Comparison Implementation Plan, Task 1: Deterministic normalization, Task 2: Pinned Jev semantic equivalence, Task 3: Pair admission, field verdicts, and evaluator mapping, Task 4: Persist comparison results and case review state, Task 5: Case review action service, Task 6: Comparison pipeline for BL-ready cases

### Community 176 - "extraction.py"
Cohesion: 0.10
Nodes (23): ExtractionResult, CachedExtraction, ExtractionCache, GeminiField, GeminiFields, local_extraction(), _ordered(), PersistenceExtractionCache (+15 more)

### Community 177 - "_FakePersistence"
Cohesion: 0.29
Nodes (4): _FakePersistence, Category, UUID, _SuccessCall

### Community 178 - "manifest.py"
Cohesion: 0.43
Nodes (7): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), Resolve narration rows against measured visual beats., resolve_lines()

### Community 179 - "test_submission_persistence.py"
Cohesion: 0.28
Nodes (22): SubmissionRun, SubmissionRunRecord, CaseInput, _audit(), _manifest_hash(), asyncio, parametrize, postgres (+14 more)

### Community 180 - "schedule.py"
Cohesion: 0.48
Nodes (6): atomic_json_write(), deconflict(), main(), probe_duration_ms(), Place narration segments without crossing visual boundaries., schedule()

### Community 181 - "subtitles.py"
Cohesion: 0.48
Nodes (6): main(), make_spans(), Generate compact, non-overlapping SRT subtitle cards., render_srt(), timestamp(), wrap_rows()

### Community 182 - "dependencies"
Cohesion: 0.12
Nodes (15): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+7 more)

### Community 183 - "detect_format"
Cohesion: 0.50
Nodes (5): detect_format(), _detect_ooxml_format(), Identify the container from magic bytes and structure, never a name., test_detect_format_rejects_control_characters_in_text(), DetectedFormat

### Community 184 - "test_api_session.py"
Cohesion: 0.29
Nodes (16): client(), AsyncClient, asyncio, fixture, MonkeyPatch, postgres, test_create_session_maps_a_database_failure_to_503(), test_create_session_returns_token_and_stores_only_its_hash() (+8 more)

### Community 185 - "StageRecord"
Cohesion: 0.29
Nodes (6): The pipeline status end_to_end and the TrialRecord both report. Derived from…, Times the product's real `JevDocumentRoleClient.decide()` call., StageRecord, _TimingRoleDecider, _trial_status(), test_timing_gemini_extractor_key_attempts_default_to_empty()

### Community 190 - "JevProviderFailure"
Cohesion: 0.20
Nodes (6): JevFailureCode, JevProviderFailure, StrEnum, A provider failure with safe context for persistence and retry policy., test_timing_role_decider_records_http_status_on_failure(), _FailingClassifier

### Community 191 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 192 - "_CrashingRoleDecider"
Cohesion: 0.33
Nodes (4): _CrashingRoleDecider, Raises a non-provider error for the attachments listed in crash_on., A schema-valid GeminiDocument JSON for a scanned SI/BL page., _scan_json()

### Community 193 - "test_submission_bundle.py"
Cohesion: 0.17
Nodes (12): _audit(), _load_bundle_inbox(), asyncio, postgres, A mocked-provider run over the full 520-email bundle publishes a valid…, Document-role decisions read only from the seed decisions' content-hash map., No Jev equivalence answer was ever recorded in the seed decisions file…, The bundle's own loader.py, exactly as the organiser bundle ships it. (+4 more)

### Community 194 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 32 Live-Path Benchmark and Test Matrix Implementation Plan, Task 1: Read scanned attachments concurrently, Task 2: Rewrite the benchmark script, Task 3: Dataset edge-case integration matrix, Task 4: Provider failure matrix, Task 5: Mocked 520-email run publishes a valid artifact, Task 6: Live measurement and retained artifact

### Community 195 - "Gate1Persistence"
Cohesion: 0.43
Nodes (3): Gate1Persistence, UUID, PersistedReceipt

### Community 196 - ".locate"
Cohesion: 0.33
Nodes (5): _in_token(), Anchor a model-proposed value in this document, or return None. Only a whole-…, Index of the first whole-token occurrence of target in text, or -1., Whether text[index] exists and is a letter, digit, or apostrophe., _token_find()

### Community 200 - "_quota_error"
Cohesion: 0.67
Nodes (3): ClientError, _quota_error(), A Gemini 429 body; every quota's message says "exceeded your quota".

### Community 201 - "AsyncSystemOneClient"
Cohesion: 0.33
Nodes (3): AsyncSystemOneClient, AttachmentLike, Protocol

### Community 202 - "_typesafe_sdk_retry_policy"
Cohesion: 0.67
Nodes (3): fixture, MonkeyPatch, _typesafe_sdk_retry_policy()

### Community 203 - "label_field"
Cohesion: 0.70
Nodes (5): label_field(), _label_key(), A label as the field patterns read it: NFKC, lower case, CJK removed,…, test_label_patterns_map_the_bundle_label_keys_as_recorded(), recording_label_field()

### Community 204 - "BundleEmail"
Cohesion: 0.40
Nodes (4): BundleEmail, _canonical_message_bytes(), BaseModel, field_validator

### Community 205 - "_token_usage"
Cohesion: 0.40
Nodes (4): Total/prompt/candidates token counts from a response's usage_metadata. None…, _token_usage(), test_token_usage_extracts_known_fields_from_a_fake_response(), test_token_usage_is_none_when_response_has_no_usage_metadata()

## Knowledge Gaps
- **922 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+917 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1458 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PersistenceService` connect `PersistenceService` to `Category`, `DocumentRole`, `submission.py`, `test_api_evidence.py`, `test_failure_matrix.py`, `test_document_role_persistence.py`, `test_api_reads.py`, `deps.py`, `extraction.py`, `test_submission_persistence.py`, `test_api_session.py`, `test_pipeline.py`, `test_integration_matrix.py`, `test_submission_bundle.py`, `InMemoryPrivateObjectStore`, `get_settings`, `ComparedField`, `test_contracts.py`, `reconciliation.py`, `CaseReviewService`, `test_reconciliation_persistence.py`, `KeyAttempt`, `persistence.py`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `ComparedField` connect `ComparedField` to `Category`, `DocumentRole`, `submission.py`, `test_extraction.py`, `test_document_role_persistence.py`, `test_api_reads.py`, `test_document_analyzer.py`, `contracts.py`, `run_benchmark`, `extraction.py`, `test_submission_persistence.py`, `test_pipeline.py`, `test_integration_matrix.py`, `_CrashingRoleDecider`, `.locate`, `test_benchmark_latency.py`, `formats.py`, `label_field`, `test_seed_catalog.py`, `jev.py`, `test_contracts.py`, `test_jev_equivalence.py`, `KeyAttempt`, `persistence.py`, `PersistenceService`, `test_normalization.py`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `JevProviderFailure` connect `JevProviderFailure` to `benchmark_latency.py`, `test_document_analyzer.py`, `test_jev_equivalence.py`, `run_benchmark`, `test_benchmark_latency.py`, `Category`, `KeyAttempt`, `DocumentRole`, `test_jev.py`, `extraction.py`, `test_failure_matrix.py`, `jev.py`, `StageRecord`, `test_jev_document_roles.py`, `test_pipeline.py`, `ingestion.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 87 inferred relationships involving `PersistenceService` (e.g. with `Services` and `PersistenceExtractionCache`) actually correct?**
  _`PersistenceService` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 94 inferred relationships involving `ComparedField` (e.g. with `_check_values()` and `compare_fields()`) actually correct?**
  _`ComparedField` has 94 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `InMemoryPrivateObjectStore` (e.g. with `client()` and `client()`) actually correct?**
  _`InMemoryPrivateObjectStore` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 58 inferred relationships involving `DocumentRole` (e.g. with `admit_pair()` and `DocumentAnalyzer`) actually correct?**
  _`DocumentRole` has 58 INFERRED edges - model-reasoned connections that need verification._