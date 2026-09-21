# Graph Report - postauth-structure  (2026-09-21)

## Corpus Check
- 347 files · ~442,322 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4210 nodes · 13454 edges · 222 communities (196 shown, 26 thin omitted)
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 3197 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bea5ca14`
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
- GeminiDocument
- judge-api.test.ts
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
- KeyAttempt
- Technical requirements
- Product requirements
- Research
- tsconfig.json
- gcp-setup.sh
- test_benchmark_latency.py
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
- test_migrations.py
- Legal defence and Q&A preparation
- GeminiExtractor
- Global Constraints
- SeedCatalog
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- ControlGraphView.tsx
- main
- contracts.ts
- formats.py
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- react
- ComparedField
- email-detail/types.ts
- storage.py
- The Views
- Global Constraints
- seed_catalog.py
- jev.py
- Motion
- Global Constraints
- get_settings
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- test_formats.py
- test_contracts.py
- ReconciliationResult
- DocumentRole
- read_bundle
- plugins
- test_smoke_deployment.py
- JevEquivalenceClient
- review-queue-css.test.ts
- JudgeView.tsx
- Timeline
- End-to-end flow and state machine
- ingestion.py
- _CrashingRoleDecider
- Controls.tsx
- JevFailureCode
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- PersistenceService
- load_speak
- deps.py
- Demo-day script template
- AuditContext
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- contracts.py
- JevDocumentRoleClient
- CaseReviewService
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
- JevProviderFailure
- test_models.py
- select_structural_review_reason
- _parse_docx
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
- InMemoryPrivateObjectStore
- test_deployment_hardening.py
- capture.mjs
- test_api_actions.py
- test_api_evidence.py
- DocumentAnalyzer
- TxtLocation
- judge_routes.py
- test_api_reads.py
- UploadPanel.tsx
- gemini.py
- Results by route
- render_batch
- test_api_judge.py
- ParsedDocument
- API Contract
- devDependencies
- control-graph-css.test.ts
- Global Constraints
- Global Constraints
- ExtractionResult
- ApiProblem
- manifest.py
- _seed_complete_general_cases
- schedule.py
- subtitles.py
- test_comparison.py
- Preflight
- AccessibleGraphTable.tsx
- CytoscapeCanvas.test.tsx
- ValueError
- CytoscapeCanvas.tsx
- session.py
- Submission
- errors.py
- .validate_probability_distribution
- Global Constraints
- SeedEmail
- build_seed_decisions.py
- .__init__
- dependencies
- test_reconciliation_persistence.py
- EvaluationPage.tsx
- API Contract (from #30)
- Services
- Post-auth structure
- Product API
- Global Constraints
- LadingLens architecture
- Demo runbook
- web/package.json
- AI in LadingLens
- _created_at_column
- LocalInbox
- Cloud deployment
- Third-party notices
- .__init__
- Global Constraints
- build_judge
- _TitleRoles
- _enum
- reconciliation-css.test.ts
- .__init__

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 275 edges
2. `AuditContext` - 184 edges
3. `ComparedField` - 179 edges
4. `Category` - 156 edges
5. `InMemoryPrivateObjectStore` - 138 edges
6. `JevProviderFailure` - 107 edges
7. `ReviewReason` - 99 edges
8. `EvaluatorOutput` - 96 edges
9. `DocumentRole` - 92 edges
10. `Status` - 90 edges

## Surprising Connections (you probably didn't know these)
- `CaseActionBody` --uses--> `ApiProblem`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/api/errors.py
- `CaseActionBody` --uses--> `ReconciliationOutcome`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/contracts.py
- `CaseActionBody` --uses--> `AuditContext`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/persistence.py
- `CaseActionBody` --uses--> `ReviewActionInput`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/persistence.py
- `ExceptionActionBody` --uses--> `ApiProblem`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/api/errors.py

## Import Cycles
- None detected.

## Communities (222 total, 26 thin omitted)

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
Cohesion: 0.11
Nodes (17): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+9 more)

### Community 7 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "SDOC hackathon — Docker server bundle"
Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 12 - "test_submission.py"
Cohesion: 0.16
Nodes (30): build_submission_artifact(), AsyncClient, score_submission_artifact(), _scoring_client(), _complete_snapshots(), _field_snapshots(), _general_snapshot(), asyncio (+22 more)

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

### Community 18 - "GeminiDocument"
Cohesion: 0.12
Nodes (31): GeminiDocument, _answer(), _field(), _generate(), _labelled(), _parsed(), asyncio, ClientError (+23 more)

### Community 19 - "judge-api.test.ts"
Cohesion: 0.09
Nodes (32): SourceExcerpt(), SourceExcerptProps, createJudgeRun(), CreateJudgeRunInput, defaultJudgeApi, downloadArtifact(), getGateSummary(), getJudgePolicy() (+24 more)

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

### Community 25 - "review-queue/seam.ts"
Cohesion: 0.07
Nodes (42): StatusPill(), CaseReviewTarget, ReconciliationExceptionActionType, ReconciliationExceptionReviewTarget, ReviewAssignment, ReviewAssignmentState, ReviewHistoryEntry, PREPARED_FIXTURES (+34 more)

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

### Community 30 - "test_integration_matrix.py"
Cohesion: 0.16
Nodes (32): _audit(), _boom_generate(), _build_case(), _create_workspace(), _gemini_stub(), _matching_scan_generate(), _new_case(), asyncio (+24 more)

### Community 31 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "KeyAttempt"
Cohesion: 0.07
Nodes (44): DocumentAnalysis, KeyAttempt, One Gemini call on one configured key, kept for the audit trail., EquivalenceQuestion, JevEquivalence, ComparisonRun, EquivalenceJudge, _model_version() (+36 more)

### Community 33 - "Technical requirements"
Cohesion: 0.14
Nodes (14): Canonical enums and output contract, Decision register, Deployment, security, and observability, Failure contract, Format routing and provenance, Interface schemas, Jev decision rules, Locked architecture and model ownership (+6 more)

### Community 34 - "Product requirements"
Cohesion: 0.13
Nodes (15): Decision ownership, Evaluator contract, Finals scope, Functional requirements, Goals and boundaries, Goals and measurable success, Human review and provenance, Non-goals (+7 more)

### Community 35 - "Research"
Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 38 - "test_benchmark_latency.py"
Cohesion: 0.08
Nodes (64): build_artifact(), nearest_rank(), PairAnalyzed, The nearest-rank quantile: rank = max(1, min(n, ceil(q * n))). Always an…, n/p50/p95/max per stage over non-warmup trials whose stage succeeded. Each…, Assemble the full JSON-serializable artifact for one benchmark run. `completed`…, One trial's extraction stages. `analyses` is the product's real `(si, bl)`…, The pipeline status end_to_end and the TrialRecord both report. Derived from… (+56 more)

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

### Community 60 - "test_migrations.py"
Cohesion: 0.10
Nodes (53): bind_request_context(), configure_event_logging(), emit_event(), install_observability(), BaseHTTPMiddleware, Exception, FastAPI, JSONResponse (+45 more)

### Community 61 - "Legal defence and Q&A preparation"
Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 62 - "GeminiExtractor"
Cohesion: 0.13
Nodes (46): GeminiExtractor, ComparisonPipeline, RoleDecider, Compare a BL_READY case's SI/draft-BL pair and record the verdict., rate_limited_then_succeeded_scan(), A scan read that only succeeds after the second key., _ambiguous_bl_case(), _audit() (+38 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "SeedCatalog"
Cohesion: 0.11
Nodes (33): The bundle bytes of one seed attachment; KeyError when unknown., SeedCatalog, _build(), catalog(), _decisions(), _ExplodingLock, _hash(), fixture (+25 more)

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

### Community 71 - "ControlGraphView.tsx"
Cohesion: 0.18
Nodes (7): CanvasBoundary, CanvasBoundaryProps, ControlGraphView(), LazyCytoscapeCanvas, mocks, ViewMode, GraphPage()

### Community 72 - "main"
Cohesion: 0.17
Nodes (13): _clients(), _gemini_metadata(), _gemini_resolved_endpoint(), _git_short_sha(), _jev_metadata(), main(), _parse_args(), Gemini run metadata. Never reads settings.gemini_api_key. (+5 more)

### Community 73 - "contracts.ts"
Cohesion: 0.06
Nodes (53): AmbiguousReconciliation, CaseReviewAction, ExpectedShipment, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationOutcome, ReconciliationResult (+45 more)

### Community 74 - "formats.py"
Cohesion: 0.15
Nodes (25): DocxProvenance, Provenance, _cell_text(), _docx_cell(), _docx_paragraph(), _fixed_anchor(), _head(), _open_xlsx() (+17 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.19
Nodes (24): AuthorizedFetcher, Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url() (+16 more)

### Community 77 - "react"
Cohesion: 0.06
Nodes (45): App(), KeyedRoutes(), ThemeSeed(), HeroFilm(), ConfirmDialog(), renderTable(), renderView(), AppShell() (+37 more)

### Community 78 - "ComparedField"
Cohesion: 0.26
Nodes (96): Category, ComparedField, EvaluatorOutput, FieldVerdict, field_validator, StrEnum, ReconciliationOutcome, ReviewReason (+88 more)

### Community 79 - "email-detail/types.ts"
Cohesion: 0.05
Nodes (48): AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP, REFUSAL_EXPLANATIONS, REFUSAL_TITLES (+40 more)

### Community 80 - "storage.py"
Cohesion: 0.18
Nodes (18): artifact_object_key(), GcsPrivateObjectStore, private_object_key(), sha256_hex(), _validate_hash(), _validate_private_key(), _validate_sha256(), asyncio (+10 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "seed_catalog.py"
Cohesion: 0.08
Nodes (37): Settings, _case_snapshot(), _classified_case(), _in_cooldown(), load_seed_catalog(), _now(), Category, datetime (+29 more)

### Community 85 - "jev.py"
Cohesion: 0.17
Nodes (22): _answer_fields(), AsyncSystemOneClient, AttachmentLike, _call_batch(), ClassifiableEmail, _EmailState, _nonempty_string(), _parse_answer() (+14 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "get_settings"
Cohesion: 0.07
Nodes (50): build_services(), get_settings(), get_engine(), get_session(), get_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession (+42 more)

### Community 90 - "Overlays.tsx"
Cohesion: 0.09
Nodes (24): addMonths(), ConfirmDialogProps, DatePicker(), DatePickerProps, Menu(), MenuItem(), MenuItemProps, MenuProps (+16 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.33
Nodes (13): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+5 more)

### Community 92 - "test_formats.py"
Cohesion: 0.05
Nodes (96): parse_document(), Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally., _cell(), _col(), _docx_document(), _docx_paragraph_document(), _docx_row_document(), _only() (+88 more)

### Community 93 - "test_contracts.py"
Cohesion: 0.10
Nodes (28): _canonical_hash(), _canonical_ids(), compute_subject_key(), parametrize, _reconciliation_base(), test_ambiguous_subject_key_canonicalizes_both_candidate_sets(), test_enum_has_exact_canonical_values(), test_evaluator_output_canonicalizes_defect_field_order() (+20 more)

### Community 94 - "ReconciliationResult"
Cohesion: 0.08
Nodes (65): ReconciliationResult, ExpectedShipmentInput, _candidate_component(), _canonical_timestamp(), _case_identifiers(), CaseSnapshot, DocumentKind, execute_gate_two() (+57 more)

### Community 95 - "DocumentRole"
Cohesion: 0.07
Nodes (43): FieldDraft, ExtractionFailure, GeminiOutcome, Exception, A fail-closed extraction outcome that must surface as retry or review., DocumentRole, JevRoleDecision, BaseModel (+35 more)

### Community 96 - "read_bundle"
Cohesion: 0.20
Nodes (24): Validate and read an organizer inbox without inventing source timestamps., read_bundle(), _load_organizer_inbox(), MemoryInbox, _ooxml_bytes(), parametrize, _record(), test_attachment_receipt_preserves_bytes_hash_size_and_ordinal() (+16 more)

### Community 97 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.24
Nodes (16): _artifact(), _authorized(), MonkeyPatch, parametrize, _responses(), _session_responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_fails_closed_on_a_bad_session_mint() (+8 more)

### Community 99 - "JevEquivalenceClient"
Cohesion: 0.15
Nodes (20): JevEquivalenceClient, One batched Noul request: is each textual SI/BL pair the same thing?, _Client, _fake_sdk(), _FakeNoul, _FakeRetryPolicy, _ok(), Any (+12 more)

### Community 100 - "review-queue-css.test.ts"
Cohesion: 0.33
Nodes (5): css, cssFiles, dir, tsx, tsxFiles

### Community 101 - "JudgeView.tsx"
Cohesion: 0.04
Nodes (70): Category, ComparedField, ComparisonGrid(), ComparisonGridProps, FIELD_HUMAN_LABELS, FIELD_ORDER, renderValueAnchor(), resolveProvenanceKind() (+62 more)

### Community 102 - "Timeline"
Cohesion: 0.22
Nodes (9): Build period, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced, Submission deadline (+1 more)

### Community 103 - "End-to-end flow and state machine"
Cohesion: 0.67
Nodes (3): Atomic evaluator-submission runs, End-to-end flow and state machine, Structural reason precedence

### Community 104 - "ingestion.py"
Cohesion: 0.12
Nodes (19): BundleEmail, canonical_message_bytes(), _check_local_source_path(), Gate1Classifier, Gate1Persistence, InboxSource, _is_link(), BaseModel (+11 more)

### Community 105 - "_CrashingRoleDecider"
Cohesion: 0.13
Nodes (12): FailingRoleDecider, Shared PostgreSQL fixtures for building BL_READY comparison cases.…, Raises instead of deciding, like a Jev role-decision provider timeout., _answer_not_in_the_text(), _CrashingRoleDecider, _FakeGeminiResponse, Raises a non-provider error for the attachments listed in crash_on., A schema-valid GeminiDocument JSON for a scanned SI/BL page. (+4 more)

### Community 106 - "Controls.tsx"
Cohesion: 0.04
Nodes (47): Button(), ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps (+39 more)

### Community 107 - "JevFailureCode"
Cohesion: 0.14
Nodes (25): JevCategoryClient, JevFailureCode, StrEnum, _answer(), _Attachment, _FakeRetryPolicy, _Email, _FakeChoice (+17 more)

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

### Community 113 - "PersistenceService"
Cohesion: 0.21
Nodes (38): PersistenceService, _async_database_url(), postgres_engine(), postgres_session(), postgres_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession (+30 more)

### Community 114 - "load_speak"
Cohesion: 0.21
Nodes (4): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests

### Community 115 - "deps.py"
Cohesion: 0.10
Nodes (20): get_judge(), get_materializer(), get_seed_catalog(), get_services(), _JevNotWired, Request, SeedCatalogDep, ServicesDep (+12 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "AuditContext"
Cohesion: 0.08
Nodes (35): serialize_evaluator_output(), AuditContext, _canonical_json(), _case_review_status(), _default_audit_writer(), _exception_state(), _expected_shipment_values(), _judge_attempt_payload() (+27 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "contracts.py"
Cohesion: 0.19
Nodes (25): AmbiguousReconciliation, _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation, DocxTableLocation, MissingCaseReconciliation, _ProvenanceIdentity (+17 more)

### Community 122 - "JevDocumentRoleClient"
Cohesion: 0.21
Nodes (17): JevDocumentRoleClient, Ask Jev which document each attachment is, judged only by its text., _answer(), _fake_sdk(), _FakeChoice, _FakeSystemOneClient, Any, asyncio (+9 more)

### Community 123 - "CaseReviewService"
Cohesion: 0.15
Nodes (16): CaseActionBody, ExceptionActionBody, BaseModel, CaseReviewService, Any, UUID, ValueError, Named-reviewer dispositions for cases held for review. (+8 more)

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

### Community 137 - "JevProviderFailure"
Cohesion: 0.13
Nodes (20): InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, JevProviderFailure, A provider failure with safe context for persistence and retry policy., _audit(), _FailingClassifier, _FakePersistence (+12 more)

### Community 138 - "test_models.py"
Cohesion: 0.17
Nodes (14): _check_constraint(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_expected_shipments_retain_typed_reconciliation_inputs(), test_idempotency_key_and_guest_generation_are_scoped(), test_receipt_uniqueness_uses_scoped_partial_indexes(), test_reconciliation_results_enforce_discriminated_outcome_shapes(), test_source_objects_are_content_addressed_and_private(), test_submission_evaluations_retain_success_or_safe_failure() (+6 more)

### Community 140 - "_parse_docx"
Cohesion: 0.20
Nodes (15): _below_label(), _docx_below_label(), _docx_row_labels(), label_field(), _label_key(), _parse_docx(), _pdf_below_label(), _pdf_label_part() (+7 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "test_failure_matrix.py"
Cohesion: 0.14
Nodes (28): FailingEquivalence, Raises instead of judging, like a Jev equivalence provider timeout., _always_hangs(), _audit(), _both_keys_rate_limited(), _create_workspace(), _FakeGeminiResponse, _FakeRoleDecider (+20 more)

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "InMemoryPrivateObjectStore"
Cohesion: 0.35
Nodes (15): InMemoryPrivateObjectStore, _decision(), asyncio, parametrize, postgres, _receipt(), test_cache_entry_round_trips_transcription(), test_extraction_event_for_another_workspace_content_hash_writes_nothing() (+7 more)

### Community 157 - "test_deployment_hardening.py"
Cohesion: 0.18
Nodes (16): Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), do_run_migrations(), run_async_migrations(), run_migrations_online(), _read(), test_ci_runs_postgresql_tests_instead_of_skipping_them(), test_ci_runs_web_tests_before_building() (+8 more)

### Community 158 - "capture.mjs"
Cohesion: 0.16
Nodes (21): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+13 more)

### Community 159 - "test_api_actions.py"
Cohesion: 0.17
Nodes (47): guest_case_id(), _audit_events(), client(), _copied_rows(), _guest(), _held_review(), _history(), _inbox_disposition() (+39 more)

### Community 160 - "test_api_evidence.py"
Cohesion: 0.33
Nodes (17): catalog(), client(), _guest_headers(), AsyncClient, asyncio, fixture, parametrize, postgres (+9 more)

### Community 161 - "DocumentAnalyzer"
Cohesion: 0.14
Nodes (29): DocumentAnalyzer, _BrokenCache, _Cache, _CancelObservingGemini, _Gemini, _input(), asyncio, AttachmentInput (+21 more)

### Community 162 - "TxtLocation"
Cohesion: 0.43
Nodes (3): model_validator, Self, TxtLocation

### Community 163 - "judge_routes.py"
Cohesion: 0.10
Nodes (37): _content_disposition(), _file_response_headers(), inline_file_response(), get, GuestDep, Response, SeedCatalogDep, ServicesDep (+29 more)

### Community 164 - "test_api_reads.py"
Cohesion: 0.23
Nodes (22): catalog(), client(), _guest_headers(), AsyncClient, asyncio, fixture, parametrize, postgres (+14 more)

### Community 165 - "UploadPanel.tsx"
Cohesion: 0.14
Nodes (16): DropZoneRejection, extraFilesMessage(), formatCeiling(), formatFileSize(), humanize(), REJECTION_REASON_LABEL, rejectionMessage(), chooseFile() (+8 more)

### Community 166 - "gemini.py"
Cohesion: 0.14
Nodes (26): generate(), generate_traced(), Call Gemini; only a 429 moves the same request to the second key. Pass a…, Call Gemini, retrying once on the second key if the first is rate-limited., Total/prompt/candidates token counts from a response's usage_metadata. None…, _token_usage(), test_gemini_resolved_endpoint_reads_the_constructed_clients_base_url(), test_token_usage_extracts_known_fields_from_a_fake_response() (+18 more)

### Community 167 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 168 - "render_batch"
Cohesion: 0.24
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 169 - "test_api_judge.py"
Cohesion: 0.16
Nodes (43): _anchored_text(), client(), _Equivalence, _gemini_reads_values_not_in_the_text(), _guest(), _pair(), AsyncClient, asyncio (+35 more)

### Community 170 - "ParsedDocument"
Cohesion: 0.16
Nodes (12): _in_token(), _label_ranges(), ParsedDocument, _pdf_block_label(), ComparedField, Fields a local parse cannot settle: an absent label, a conflict, or an…, Anchor a model-proposed value in this document, or return None. Only a whole-…, Index of the first whole-token occurrence of target in text, or -1. (+4 more)

### Community 171 - "API Contract"
Cohesion: 0.18
Nodes (10): API Contract, Global Constraints, Issue 30 Product API Implementation Plan, Task 1: Error envelope, guest sessions, and reset, Task 2: Deterministic seed catalog and bundle packaging, Task 3: Inbox, detail, summary, and reconciliation reads, Task 4: Private evidence and artifact downloads, Task 5: Copy-on-write review actions for seed cases and exceptions (+2 more)

### Community 172 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, jsdom, oxlint, playwright, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+19 more)

### Community 174 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 27 Attachment Preflight and Extraction Implementation Plan, Task 1: Parser dependencies and deterministic preflight, Task 2: Local parsers with format-matched provenance, Task 3: Traced Gemini calls and fail-closed Gemini extraction, Task 4: Pinned Jev document-role decisions, Task 5: Persist role decisions and cache transcriptions, Task 6: Document analyzer that routes, caches, and fails closed

### Community 175 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 28 Seven-Field Comparison Implementation Plan, Task 1: Deterministic normalization, Task 2: Pinned Jev semantic equivalence, Task 3: Pair admission, field verdicts, and evaluator mapping, Task 4: Persist comparison results and case review state, Task 5: Case review action service, Task 6: Comparison pipeline for BL-ready cases

### Community 176 - "ExtractionResult"
Cohesion: 0.12
Nodes (36): APIError, ExtractedValue, ExtractionResult, ScannedPdfLocation, ScannedPdfProvenance, AttachmentInput, CachedExtraction, _call_failure() (+28 more)

### Community 177 - "ApiProblem"
Cohesion: 0.13
Nodes (26): ApiProblem, Exception, GuestContext, _already_succeeded(), _check_errors(), JudgeService, _latency_ms(), _message_bytes() (+18 more)

### Community 178 - "manifest.py"
Cohesion: 0.52
Nodes (6): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), resolve_lines()

### Community 179 - "_seed_complete_general_cases"
Cohesion: 0.35
Nodes (16): _audit(), _manifest_hash(), asyncio, parametrize, postgres, UUID, _seed_complete_general_cases(), _snapshots() (+8 more)

### Community 180 - "schedule.py"
Cohesion: 0.60
Nodes (5): atomic_json_write(), deconflict(), main(), probe_duration_ms(), schedule()

### Community 181 - "subtitles.py"
Cohesion: 0.60
Nodes (5): main(), make_spans(), render_srt(), timestamp(), wrap_rows()

### Community 182 - "test_comparison.py"
Cohesion: 0.05
Nodes (120): admit_pair(), band(), _check_values(), compare_fields(), comparison_output(), _deterministic_reason(), _diagnostic(), equivalence_questions() (+112 more)

### Community 183 - "Preflight"
Cohesion: 0.18
Nodes (13): detect_format(), _detect_ooxml_format(), _expands_past_cap(), _name(), _open_docx(), Preflight, _preflight_pdf(), Exception (+5 more)

### Community 184 - "AccessibleGraphTable.tsx"
Cohesion: 0.22
Nodes (11): AccessibleGraphTable(), EDGE_KIND_LABEL, KIND_LABEL, nodeKey(), STATE_LABEL, edges, nodes, ControlGraph (+3 more)

### Community 185 - "CytoscapeCanvas.test.tsx"
Cohesion: 0.21
Nodes (7): mocks, TOKEN_MAP, preparedControlGraph, REQUIRED_EMAILS, REQUIRED_KINDS, REQUIRED_SHIPMENTS, VALID_STATES

### Community 187 - "ValueError"
Cohesion: 0.44
Nodes (3): model_validator, Self, ValueError

### Community 189 - "CytoscapeCanvas.tsx"
Cohesion: 0.27
Nodes (9): buildStylesheet(), CytoscapeCanvas(), CytoscapeCanvasProps, KIND_SHAPE, readToken(), STATE_GLYPH, STATE_TOKEN, toElements() (+1 more)

### Community 190 - "session.py"
Cohesion: 0.33
Nodes (8): create_session(), get, GuestDep, post, Request, ServicesDep, read_session(), reset_session()

### Community 191 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 192 - "errors.py"
Cohesion: 0.22
Nodes (15): _api_problem_handler(), _http_exception_handler(), _inactive_workspace_handler(), install_api_errors(), NoStoreMiddleware, BaseHTTPMiddleware, FastAPI, JSONResponse (+7 more)

### Community 194 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 32 Live-Path Benchmark and Test Matrix Implementation Plan, Task 1: Read scanned attachments concurrently, Task 2: Rewrite the benchmark script, Task 3: Dataset edge-case integration matrix, Task 4: Provider failure matrix, Task 5: Mocked 520-email run publishes a valid artifact, Task 6: Live measurement and retained artifact

### Community 195 - "SeedEmail"
Cohesion: 0.09
Nodes (41): _named_reviewer(), GuestDep, MaterializerDep, post, Request, SeedCatalogDep, ServicesDep, Review actions on seed cases and reconciliation exceptions. A guest's first… (+33 more)

### Community 196 - "build_seed_decisions.py"
Cohesion: 0.39
Nodes (7): build_decisions(), header_role(), main(), Write the prepared seed decisions to app/seed/decisions-v1.json. Nothing here…, render_decisions(), scan_document(), test_committed_decisions_are_exactly_what_the_generator_writes()

### Community 198 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+10 more)

### Community 199 - "test_reconciliation_persistence.py"
Cohesion: 0.38
Nodes (16): _audit(), _create_case(), _create_workspace(), _missing_case(), asyncio, postgres, ReconciliationResult, UUID (+8 more)

### Community 200 - "EvaluationPage.tsx"
Cohesion: 0.08
Nodes (9): PageHead(), PageHeadProps, EvaluationPage(), brokenSource, pendingSource, readTab(), ReviewPage(), ReviewTab (+1 more)

### Community 201 - "API Contract (from #30)"
Cohesion: 0.22
Nodes (8): API Contract (from #30), Global Constraints, Issue 39 Public Judge Flow Implementation Plan, Task 1: Typed judge client, Task 2: Upload panel with honest validation, Task 3: Live check lifecycle and result with evidence, Task 4: Failure disclosure, retry, and prepared fallback, Task 5: Gate summaries, downloads, links, and synthetic messaging

### Community 202 - "Services"
Cohesion: 0.21
Nodes (19): Services, GuestSessions, client(), AsyncClient, asyncio, fixture, MonkeyPatch, parametrize (+11 more)

### Community 203 - "Post-auth structure"
Cohesion: 0.29
Nodes (6): Applying it per page, Navigation and flow, Page frame, Post-auth structure, Shell, States

### Community 204 - "Product API"
Cohesion: 0.22
Nodes (8): Conventions, Evidence And Artifacts, Guest Sessions And Reset, Health And Readiness, Inbox And Case Review, Judge Uploads, Product API, Reconciliation And Exception Review

### Community 205 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Issue 40 Settings and Reset All Implementation Plan, Task 1: Product API client with a server-minted session, Task 2: Reset orchestration and remount key, Task 3: In-house confirmation dialog, Task 4: The /settings view with Reset All

### Community 206 - "LadingLens architecture"
Cohesion: 0.14
Nodes (13): `apps/api/app/*`, `apps/web/src/*`, Data model, Decision ownership, Evidence comparison: SI to draft BL, Gate 1: every email is accounted for, Gate 2: the expected-shipment ledger, Guest sessions, the seed baseline, and Reset All (+5 more)

### Community 208 - "Demo runbook"
Cohesion: 0.14
Nodes (13): Backend setup, Demo runbook, Environment variables, Five-minute demo script, Frontend setup, Full container, Guest-only entry, Local setup (+5 more)

### Community 209 - "web/package.json"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, preview, test (+2 more)

### Community 210 - "AI in LadingLens"
Cohesion: 0.15
Nodes (12): AI in LadingLens, Limitations and production gates, Measured latency, Models and pinned versions, Prepared baseline versus live provider calls, Prompt and schema version registry, See also, The extraction route: when Gemini reads a document (+4 more)

### Community 211 - "_created_at_column"
Cohesion: 0.40
Nodes (5): _created_at_column(), datetime, UUID, _uuid_column(), Mapped

### Community 213 - "Cloud deployment"
Cohesion: 0.22
Nodes (8): Cloud deployment, Cost guardrails, Data and storage, Data policy and residency, Deployed service, Identity and secrets, Observability, See also

### Community 214 - "Third-party notices"
Cohesion: 0.22
Nodes (8): API dependencies, Fonts and icons, PyMuPDF licensing, Repository licence, Sources and verification, Synthetic dataset, Third-party notices, Web dependencies

### Community 216 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Global Constraints, Issue 44 Architecture, Cloud, and AI Documentation Implementation Plan, Task 1: Architecture overview, Task 2: AI documentation, Task 3: Cloud documentation, Task 4: Demo runbook, Task 5: Third-party notices

### Community 217 - "build_judge"
Cohesion: 0.50
Nodes (4): build_judge(), RoleDecider, The judge service over the comparison pipeline and these providers., EquivalenceJudge

### Community 220 - "reconciliation-css.test.ts"
Cohesion: 0.40
Nodes (4): combined, CSS_FILES, FEATURE_DIR, sheets

## Knowledge Gaps
- **1027 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+1022 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PersistenceService` connect `PersistenceService` to `test_failure_matrix.py`, `GeminiDocument`, `InMemoryPrivateObjectStore`, `test_integration_matrix.py`, `test_api_actions.py`, `KeyAttempt`, `DocumentAnalyzer`, `test_api_evidence.py`, `test_api_reads.py`, `test_api_judge.py`, `ExtractionResult`, `ApiProblem`, `_seed_complete_general_cases`, `test_comparison.py`, `GeminiExtractor`, `.__init__`, `test_reconciliation_persistence.py`, `Services`, `ComparedField`, `seed_catalog.py`, `.__init__`, `get_settings`, `build_judge`, `_TitleRoles`, `ReconciliationResult`, `DocumentRole`, `_CrashingRoleDecider`, `deps.py`, `AuditContext`, `CaseReviewService`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `ComparedField` connect `ComparedField` to `JevProviderFailure`, `test_submission.py`, `test_failure_matrix.py`, `GeminiDocument`, `InMemoryPrivateObjectStore`, `test_integration_matrix.py`, `KeyAttempt`, `DocumentAnalyzer`, `test_benchmark_latency.py`, `test_api_judge.py`, `ParsedDocument`, `ExtractionResult`, `test_comparison.py`, `Preflight`, `GeminiExtractor`, `SeedCatalog`, `SeedEmail`, `build_seed_decisions.py`, `formats.py`, `seed_catalog.py`, `jev.py`, `_TitleRoles`, `test_formats.py`, `test_contracts.py`, `ReconciliationResult`, `DocumentRole`, `JevEquivalenceClient`, `_CrashingRoleDecider`, `JevFailureCode`, `PersistenceService`, `AuditContext`, `contracts.py`, `JevDocumentRoleClient`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `AuditContext` connect `AuditContext` to `JevProviderFailure`, `test_failure_matrix.py`, `GeminiDocument`, `InMemoryPrivateObjectStore`, `test_integration_matrix.py`, `KeyAttempt`, `DocumentAnalyzer`, `ExtractionResult`, `ApiProblem`, `_seed_complete_general_cases`, `test_comparison.py`, `GeminiExtractor`, `SeedEmail`, `test_reconciliation_persistence.py`, `Services`, `ComparedField`, `get_settings`, `ReconciliationResult`, `DocumentRole`, `ingestion.py`, `_CrashingRoleDecider`, `PersistenceService`, `deps.py`, `CaseReviewService`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 95 inferred relationships involving `PersistenceService` (e.g. with `_JevNotWired` and `Services`) actually correct?**
  _`PersistenceService` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 107 inferred relationships involving `AuditContext` (e.g. with `CaseActionBody` and `ExceptionActionBody`) actually correct?**
  _`AuditContext` has 107 INFERRED edges - model-reasoned connections that need verification._
- **Are the 149 inferred relationships involving `ComparedField` (e.g. with `FieldDraft` and `PairAdmission`) actually correct?**
  _`ComparedField` has 149 INFERRED edges - model-reasoned connections that need verification._
- **Are the 135 inferred relationships involving `Category` (e.g. with `FieldDraft` and `PairAdmission`) actually correct?**
  _`Category` has 135 INFERRED edges - model-reasoned connections that need verification._