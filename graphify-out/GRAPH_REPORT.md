# Graph Report - land-69  (2026-09-21)

## Corpus Check
- 333 files · ~415,527 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3854 nodes · 12053 edges · 211 communities (187 shown, 24 thin omitted)
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 2809 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5e4a999`
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
- test_comparison.py
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
- react
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
- test_api_judge.py
- Legal defence and Q&A preparation
- InMemoryPrivateObjectStore
- Global Constraints
- observability.py
- dependencies
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- AccessibleGraphTable.tsx
- test_api_actions.py
- contracts.ts
- session.py
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- test_gemini.py
- JudgeView.tsx
- email-detail/types.ts
- seed_catalog.py
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
- test_formats.py
- _parse_docx
- _JevNotWired
- actions.py
- Domain.tsx
- plugins
- test_smoke_deployment.py
- JevEquivalenceClient
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Timeline
- End-to-end flow and state machine
- test_contracts.py
- test_deployment_hardening.py
- judge_routes.py
- JevFailureCode
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- judge.py
- load_speak
- test_models.py
- Demo-day script template
- .__init__
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- EvaluationPage.tsx
- JevDocumentRoleClient
- evidence.py
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
- JevClassification
- DocumentAnalysis
- test_a_judge_run_without_a_typesafe_key_fails_closed_as_unconfigured
- test_api_evidence.py
- Demo production templates
- narrate.sh
- AssembleIntegrationTest
- review-queue/seam.ts
- Investor evidence template
- AssetTests
- SubtitleTests
- NarrateContractTest
- workflow.example.mjs
- VOICE_USE.md
- NOTICE.md
- Issue 41 code audit
- ValueError
- test_api_reads.py
- capture.mjs
- test_api_session.py
- Controls.tsx
- JevProviderFailure
- contracts.py
- errors.py
- expanding_workbook
- deps.py
- reconciliation.py
- Results by route
- render_batch
- ReviewPage.tsx
- Product API
- API Contract
- _xlsx_document
- control-graph-css.test.ts
- Global Constraints
- Global Constraints
- GeminiExtractor
- test_normalization.py
- manifest.py
- Global Constraints
- schedule.py
- subtitles.py
- .locate
- PersistenceService
- web/package.json
- reconciliation_row
- GuestContext
- .validate_probability_distribution
- Submission
- _typesafe_sdk_retry_policy
- read_bundle
- UploadPanel.tsx
- ingestion.py
- CytoscapeCanvas.tsx
- Gate1Persistence
- GraphPage.tsx
- inbox.py
- API Contract (from #30)
- InboxSource
- seed_status
- _page_image
- LocalInbox
- build_seed_decisions.py
- CanvasBoundary
- model_validator

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 245 edges
2. `AuditContext` - 168 edges
3. `ComparedField` - 166 edges
4. `Category` - 144 edges
5. `InMemoryPrivateObjectStore` - 113 edges
6. `ReviewReason` - 96 edges
7. `EvaluatorOutput` - 96 edges
8. `JevProviderFailure` - 95 edges
9. `Status` - 87 edges
10. `SeedCatalog` - 83 edges

## Surprising Connections (you probably didn't know these)
- `CaseActionBody` --uses--> `ApiProblem`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/api/errors.py
- `CaseActionBody` --uses--> `AuditContext`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/persistence.py
- `CaseActionBody` --uses--> `ReviewActionInput`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/persistence.py
- `ExceptionActionBody` --uses--> `ApiProblem`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/api/errors.py
- `ExceptionActionBody` --uses--> `AuditContext`  [INFERRED]
  apps/api/app/api/actions.py → apps/api/app/persistence.py

## Import Cycles
- None detected.

## Communities (211 total, 24 thin omitted)

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
Nodes (29): GeminiDocument, grounded_extraction(), Merge local values with Gemini values anchored back in the source., _answer(), _field(), _generate(), _labelled(), _parsed() (+21 more)

### Community 19 - "test_comparison.py"
Cohesion: 0.14
Nodes (40): admit_pair(), _check(), _container_admission(), _corrupt(), _doc(), _drafts(), _jev_timeout(), _port_drafts() (+32 more)

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
Nodes (33): StatusPill(), ReconciliationExceptionActionType, ReviewAssignmentState, ASSIGNMENT_STATE_LABEL, custodyKind(), custodyLabel(), humanize(), isHeld() (+25 more)

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

### Community 30 - "react"
Cohesion: 0.08
Nodes (31): App(), KeyedRoutes(), ThemeSeed(), HeroFilm(), ConfirmDialog(), renderTable(), renderView(), AppShell() (+23 more)

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
Cohesion: 0.07
Nodes (27): devDependencies, jsdom, oxlint, playwright, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+19 more)

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

### Community 60 - "test_api_judge.py"
Cohesion: 0.16
Nodes (43): build_judge(), The judge service over the comparison pipeline and these providers., _anchored_text(), client(), _Equivalence, _gemini_reads_values_not_in_the_text(), _guest(), _pair() (+35 more)

### Community 61 - "Legal defence and Q&A preparation"
Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 62 - "InMemoryPrivateObjectStore"
Cohesion: 0.05
Nodes (131): compute_subject_key(), artifact_object_key(), GcsPrivateObjectStore, InMemoryPrivateObjectStore, private_object_key(), sha256_hex(), _validate_hash(), _validate_private_key() (+123 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "observability.py"
Cohesion: 0.13
Nodes (26): bind_request_context(), configure_event_logging(), emit_event(), install_observability(), BaseHTTPMiddleware, Exception, FastAPI, JSONResponse (+18 more)

### Community 65 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+10 more)

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
Cohesion: 0.18
Nodes (13): AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundaryProps, LazyCytoscapeCanvas, ViewMode, edges (+5 more)

### Community 72 - "test_api_actions.py"
Cohesion: 0.21
Nodes (38): _audit_events(), catalog(), client(), _copied_rows(), _guest(), _held_review(), _history(), _inbox_disposition() (+30 more)

### Community 73 - "contracts.ts"
Cohesion: 0.05
Nodes (58): AmbiguousReconciliation, CaseReviewAction, CaseReviewTarget, ExpectedShipment, MissingCaseReconciliation, ReconciliationBase, ReconciliationExceptionReviewAction, ReconciliationExceptionReviewTarget (+50 more)

### Community 74 - "session.py"
Cohesion: 0.33
Nodes (8): create_session(), get, GuestDep, post, Request, ServicesDep, read_session(), reset_session()

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.25
Nodes (18): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+10 more)

### Community 77 - "test_gemini.py"
Cohesion: 0.24
Nodes (15): generate(), Call Gemini, retrying once on the second key if the first is rate-limited., _client(), asyncio, _rate_limited(), test_falls_back_to_second_key_on_429(), test_no_keys_configured(), test_raises_when_every_key_is_rate_limited() (+7 more)

### Community 78 - "JudgeView.tsx"
Cohesion: 0.03
Nodes (95): ComparedField, FieldVerdictRecord, TxtProvenance, FailurePanel(), FailurePanelProps, BL_DOC, SI_DOC, GateSummary() (+87 more)

### Community 79 - "email-detail/types.ts"
Cohesion: 0.07
Nodes (34): Category, AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP, REFUSAL_EXPLANATIONS (+26 more)

### Community 80 - "seed_catalog.py"
Cohesion: 0.08
Nodes (57): _attachment_view(), _document_type(), email_detail_view(), field_verdict_view(), _held_review(), _held_review_evidence(), _history(), inbox_row() (+49 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "SeedCatalog"
Cohesion: 0.11
Nodes (33): The bundle bytes of one seed attachment; KeyError when unknown., SeedCatalog, _build(), catalog(), _decisions(), _ExplodingLock, _hash(), fixture (+25 more)

### Community 85 - "jev.py"
Cohesion: 0.17
Nodes (22): _answer_fields(), AsyncSystemOneClient, AttachmentLike, _call_batch(), ClassifiableEmail, _EmailState, _nonempty_string(), _parse_answer() (+14 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "test_health.py"
Cohesion: 0.12
Nodes (22): lifespan(), FastAPI, Response, Static files with fallback to index.html for client-side routes., Warm the shared seed catalog and close the live provider client. A broken…, SPAStaticFiles, _clean_seed_catalog_state(), _clean_settings() (+14 more)

### Community 90 - "Overlays.tsx"
Cohesion: 0.08
Nodes (23): addMonths(), ConfirmDialogProps, DatePicker(), DatePickerProps, Menu(), MenuItem(), MenuItemProps, MenuProps (+15 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.33
Nodes (13): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+5 more)

### Community 92 - "test_formats.py"
Cohesion: 0.07
Nodes (77): parse_document(), Parse a preflighted TXT, XLSX, DOCX, or digital PDF locally., _col(), _docx_document(), _docx_paragraph_document(), _docx_row_document(), _only(), _paragraph() (+69 more)

### Community 93 - "_parse_docx"
Cohesion: 0.10
Nodes (30): _below_label(), _cell_text(), _docx_below_label(), _docx_row_labels(), _head(), label_field(), _label_key(), _label_ranges() (+22 more)

### Community 95 - "actions.py"
Cohesion: 0.13
Nodes (24): CaseActionBody, ExceptionActionBody, _named_reviewer(), BaseModel, GuestDep, MaterializerDep, post, Request (+16 more)

### Community 96 - "Domain.tsx"
Cohesion: 0.07
Nodes (35): DropZone(), DropZoneProps, DropZoneRejectionReason, FieldRow(), FieldRowProps, formatCeiling(), ProvenanceAnchor(), ProvenanceAnchorProps (+27 more)

### Community 97 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "JevEquivalenceClient"
Cohesion: 0.17
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

### Community 104 - "test_contracts.py"
Cohesion: 0.11
Nodes (25): parametrize, _reconciliation_base(), test_ambiguous_subject_key_canonicalizes_both_candidate_sets(), test_enum_has_exact_canonical_values(), test_evaluator_output_canonicalizes_defect_field_order(), test_evaluator_output_rejects_duplicate_defect_fields(), test_evaluator_output_rejects_extra_keys(), test_evaluator_output_rejects_inconsistent_defect_flag() (+17 more)

### Community 105 - "test_deployment_hardening.py"
Cohesion: 0.18
Nodes (16): Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), do_run_migrations(), run_async_migrations(), run_migrations_online(), _read(), test_ci_runs_postgresql_tests_instead_of_skipping_them(), test_ci_runs_web_tests_before_building() (+8 more)

### Community 106 - "judge_routes.py"
Cohesion: 0.15
Nodes (22): create_run(), list_runs(), get, GuestDep, post, Request, Response, SeedCatalogDep (+14 more)

### Community 107 - "JevFailureCode"
Cohesion: 0.19
Nodes (24): JevCategoryClient, JevFailureCode, StrEnum, _answer(), _Attachment, _Email, _FakeChoice, _FakeRetryPolicy (+16 more)

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

### Community 113 - "judge.py"
Cohesion: 0.12
Nodes (24): ApiProblem, Exception, _already_succeeded(), _check_errors(), JudgeService, _latency_ms(), _message_bytes(), datetime (+16 more)

### Community 114 - "load_speak"
Cohesion: 0.21
Nodes (4): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests

### Community 115 - "test_models.py"
Cohesion: 0.17
Nodes (14): _check_constraint(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_expected_shipments_retain_typed_reconciliation_inputs(), test_idempotency_key_and_guest_generation_are_scoped(), test_receipt_uniqueness_uses_scoped_partial_indexes(), test_reconciliation_results_enforce_discriminated_outcome_shapes(), test_source_objects_are_content_addressed_and_private(), test_submission_evaluations_retain_success_or_safe_failure() (+6 more)

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "EvaluationPage.tsx"
Cohesion: 0.13
Nodes (3): EvaluationPage(), brokenSource, pendingSource

### Community 122 - "JevDocumentRoleClient"
Cohesion: 0.19
Nodes (18): JevDocumentRoleClient, Ask Jev which document each attachment is, judged only by its text., _answer(), _fake_sdk(), _FakeChoice, _FakeRetryPolicy, _FakeSystemOneClient, Any (+10 more)

### Community 123 - "evidence.py"
Cohesion: 0.24
Nodes (15): _content_disposition(), _file_response_headers(), inline_file_response(), get, GuestDep, Response, SeedCatalogDep, ServicesDep (+7 more)

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

### Community 137 - "JevClassification"
Cohesion: 0.14
Nodes (18): InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, _audit(), _FailingClassifier, _FakePersistence, _IncompleteClassifier, _load_organizer_inbox() (+10 more)

### Community 138 - "DocumentAnalysis"
Cohesion: 0.11
Nodes (36): band(), _check_values(), compare_fields(), comparison_output(), _deterministic_reason(), _diagnostic(), equivalence_questions(), FieldDraft (+28 more)

### Community 139 - "test_a_judge_run_without_a_typesafe_key_fails_closed_as_unconfigured"
Cohesion: 0.60
Nodes (6): _guest(), AsyncClient, asyncio, postgres, test_a_judge_run_without_a_typesafe_key_fails_closed_as_unconfigured(), test_the_prepared_fallback_still_works_without_a_typesafe_key()

### Community 140 - "test_api_evidence.py"
Cohesion: 0.43
Nodes (14): _guest_headers(), AsyncClient, asyncio, parametrize, postgres, GET /api/evidence/{id} and the judge artifact downloads. Expected bytes are…, test_downloads_require_a_guest_session(), test_evidence_bytes_match_the_bundle_file_with_inline_headers() (+6 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "review-queue/seam.ts"
Cohesion: 0.11
Nodes (21): ReviewHistoryEntry, PREPARED_FIXTURES, cloneRecord(), createPreparedEmailDetailService(), defaultEmailDetailService, EmailDetailService, CaseReviewActionInput, defaultReconciliationService (+13 more)

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "ValueError"
Cohesion: 0.44
Nodes (3): model_validator, Self, ValueError

### Community 157 - "test_api_reads.py"
Cohesion: 0.22
Nodes (23): catalog(), client(), _guest_headers(), AsyncClient, asyncio, fixture, parametrize, postgres (+15 more)

### Community 158 - "capture.mjs"
Cohesion: 0.16
Nodes (21): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+13 more)

### Community 159 - "test_api_session.py"
Cohesion: 0.36
Nodes (15): AsyncClient, asyncio, MonkeyPatch, parametrize, postgres, test_a_reset_during_a_request_is_reported_as_session_reset(), test_create_session_maps_a_database_failure_to_503(), test_create_session_returns_token_and_stores_only_its_hash() (+7 more)

### Community 160 - "Controls.tsx"
Cohesion: 0.06
Nodes (29): Button(), ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps (+21 more)

### Community 161 - "JevProviderFailure"
Cohesion: 0.12
Nodes (28): CachedExtraction, DocumentAnalyzer, _restamp(), JevProviderFailure, A provider failure with safe context for persistence and retry policy., _BrokenCache, _Cache, _Gemini (+20 more)

### Community 162 - "contracts.py"
Cohesion: 0.10
Nodes (60): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation, DocxProvenance (+52 more)

### Community 163 - "errors.py"
Cohesion: 0.22
Nodes (15): _api_problem_handler(), _http_exception_handler(), _inactive_workspace_handler(), install_api_errors(), NoStoreMiddleware, BaseHTTPMiddleware, FastAPI, JSONResponse (+7 more)

### Community 164 - "expanding_workbook"
Cohesion: 0.22
Nodes (8): test_an_archive_expanding_past_the_cap_is_too_large_before_it_is_inflated(), test_an_archive_within_the_cap_is_read_as_before(), test_an_archive_zipfile_cannot_read_is_no_container(), archive_with_an_undecodable_name(), expanding_workbook(), Uploads built in tests: a real workbook that expands far beyond its size., A valid XLSX whose one sheet repeats a row to about ``expanded_bytes``. It…, A ZIP whose entry name claims UTF-8 but is not, which ZipFile rejects with…

### Community 165 - "deps.py"
Cohesion: 0.10
Nodes (37): build_services(), get_judge(), get_materializer(), get_seed_catalog(), get_services(), Request, SeedCatalogDep, ServicesDep (+29 more)

### Community 166 - "reconciliation.py"
Cohesion: 0.09
Nodes (55): _candidate_component(), _canonical_timestamp(), _case_identifiers(), execute_gate_two(), expected_shipment_to_input(), ExpectedShipment, load_expected_shipments_csv(), _matching_namespaces() (+47 more)

### Community 167 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 168 - "render_batch"
Cohesion: 0.24
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 169 - "ReviewPage.tsx"
Cohesion: 0.22
Nodes (5): ReviewQueueView(), readTab(), ReviewPage(), ReviewTab, TABS

### Community 170 - "Product API"
Cohesion: 0.22
Nodes (8): Conventions, Evidence And Artifacts, Guest Sessions And Reset, Health And Readiness, Inbox And Case Review, Judge Uploads, Product API, Reconciliation And Exception Review

### Community 171 - "API Contract"
Cohesion: 0.18
Nodes (10): API Contract, Global Constraints, Issue 30 Product API Implementation Plan, Task 1: Error envelope, guest sessions, and reset, Task 2: Deterministic seed catalog and bundle packaging, Task 3: Inbox, detail, summary, and reconciliation reads, Task 4: Private evidence and artifact downloads, Task 5: Copy-on-write review actions for seed cases and exceptions (+2 more)

### Community 172 - "_xlsx_document"
Cohesion: 0.31
Nodes (9): _cell(), Parse a one-sheet workbook with these rows of cell values., test_xlsx_cells_before_a_rows_first_label_are_unlabelled(), test_xlsx_label_directly_before_another_label_has_no_value(), test_xlsx_label_skips_an_empty_spacer_cell_to_its_value(), test_xlsx_label_with_only_empty_cells_before_the_next_label_is_blank(), test_xlsx_row_with_two_label_value_pairs_reads_both(), test_xlsx_uncached_formula_past_a_spacer_is_still_the_value_cell() (+1 more)

### Community 174 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 27 Attachment Preflight and Extraction Implementation Plan, Task 1: Parser dependencies and deterministic preflight, Task 2: Local parsers with format-matched provenance, Task 3: Traced Gemini calls and fail-closed Gemini extraction, Task 4: Pinned Jev document-role decisions, Task 5: Persist role decisions and cache transcriptions, Task 6: Document analyzer that routes, caches, and fails closed

### Community 175 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Issue 28 Seven-Field Comparison Implementation Plan, Task 1: Deterministic normalization, Task 2: Pinned Jev semantic equivalence, Task 3: Pair admission, field verdicts, and evaluator mapping, Task 4: Persist comparison results and case review state, Task 5: Case review action service, Task 6: Comparison pipeline for BL-ready cases

### Community 176 - "GeminiExtractor"
Cohesion: 0.09
Nodes (46): APIError, ExtractedValue, ScannedPdfLocation, ScannedPdfProvenance, _call_failure(), ExtractionCache, ExtractionFailure, GeminiExtractor (+38 more)

### Community 177 - "test_normalization.py"
Cohesion: 0.17
Nodes (25): container_count(), gross_weight_kg(), is_placeholder(), locode(), normalize(), ComparedField, ValueError, Deterministic normalization of the seven compared values. Numbers are parsed… (+17 more)

### Community 178 - "manifest.py"
Cohesion: 0.52
Nodes (6): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), resolve_lines()

### Community 179 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Issue 40 Settings and Reset All Implementation Plan, Task 1: Product API client with a server-minted session, Task 2: Reset orchestration and remount key, Task 3: In-house confirmation dialog, Task 4: The /settings view with Reset All

### Community 180 - "schedule.py"
Cohesion: 0.60
Nodes (5): atomic_json_write(), deconflict(), main(), probe_duration_ms(), schedule()

### Community 181 - "subtitles.py"
Cohesion: 0.60
Nodes (5): main(), make_spans(), render_srt(), timestamp(), wrap_rows()

### Community 182 - ".locate"
Cohesion: 0.33
Nodes (5): _in_token(), Anchor a model-proposed value in this document, or return None. Only a whole-…, Index of the first whole-token occurrence of target in text, or -1., Whether text[index] exists and is a letter, digit, or apostrophe., _token_find()

### Community 183 - "PersistenceService"
Cohesion: 0.06
Nodes (234): structural_output(), Category, ComparedField, EvaluatorOutput, ExtractionResult, FieldVerdict, field_validator, StrEnum (+226 more)

### Community 184 - "web/package.json"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, preview, test (+2 more)

### Community 187 - "reconciliation_row"
Cohesion: 0.29
Nodes (7): get, GuestDep, MaterializerDep, SeedCatalogDep, read_reconciliation(), ReconciliationResult, reconciliation_row()

### Community 189 - "GuestContext"
Cohesion: 0.15
Nodes (17): GuestContext, guest_case_id(), guest_reconciliation_id(), UUID, Copy one seed reconciliation result into the guest workspace once. A run may…, This guest's copies of seed cases, keyed by seed email ID., This guest's reviewed seed exceptions, keyed by seed result ID., Copy one seed case into the guest workspace once; its ID there. (+9 more)

### Community 191 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 192 - "_typesafe_sdk_retry_policy"
Cohesion: 0.67
Nodes (3): fixture, MonkeyPatch, _typesafe_sdk_retry_policy()

### Community 193 - "read_bundle"
Cohesion: 0.20
Nodes (24): Validate and read an organizer inbox without inventing source timestamps., read_bundle(), _load_organizer_inbox(), MemoryInbox, _ooxml_bytes(), parametrize, _record(), test_attachment_receipt_preserves_bytes_hash_size_and_ordinal() (+16 more)

### Community 194 - "UploadPanel.tsx"
Cohesion: 0.15
Nodes (15): DropZoneRejection, extraFilesMessage(), formatCeiling(), formatFileSize(), humanize(), REJECTION_REASON_LABEL, rejectionMessage(), chooseFile() (+7 more)

### Community 195 - "ingestion.py"
Cohesion: 0.20
Nodes (12): BundleEmail, canonical_message_bytes(), BaseModel, field_validator, _receipt_input(), ReceivedEmail, _utc_received_at(), _validate_attachment_path() (+4 more)

### Community 196 - "CytoscapeCanvas.tsx"
Cohesion: 0.19
Nodes (11): buildStylesheet(), CytoscapeCanvas(), CytoscapeCanvasProps, KIND_SHAPE, readToken(), STATE_GLYPH, STATE_TOKEN, mocks (+3 more)

### Community 197 - "Gate1Persistence"
Cohesion: 0.29
Nodes (4): Gate1Classifier, Gate1Persistence, datetime, UUID

### Community 198 - "GraphPage.tsx"
Cohesion: 0.22
Nodes (8): ControlGraphView(), mocks, preparedControlGraph, REQUIRED_EMAILS, REQUIRED_KINDS, REQUIRED_SHIPMENTS, VALID_STATES, GraphPage()

### Community 199 - "inbox.py"
Cohesion: 0.44
Nodes (8): list_emails(), get, GuestDep, MaterializerDep, SeedCatalogDep, read_email(), read_summary(), gate_summary()

### Community 201 - "API Contract (from #30)"
Cohesion: 0.22
Nodes (8): API Contract (from #30), Global Constraints, Issue 39 Public Judge Flow Implementation Plan, Task 1: Typed judge client, Task 2: Upload panel with honest validation, Task 3: Live check lifecycle and result with evidence, Task 4: Failure disclosure, retry, and prepared fallback, Task 5: Gate summaries, downloads, links, and synthetic messaging

### Community 202 - "InboxSource"
Cohesion: 0.36
Nodes (6): _check_local_source_path(), InboxSource, _is_link(), Path, Protocol, _read_attachment()

### Community 203 - "seed_status"
Cohesion: 0.43
Nodes (7): The seed catalog's build state, without starting or waiting on one., seed_status(), MonkeyPatch, test_load_seed_catalog_records_a_failed_attempt_for_seed_status(), test_seed_status_is_building_before_a_catalog_exists(), test_seed_status_is_error_after_a_failed_build(), test_seed_status_is_ready_once_the_catalog_is_built()

### Community 204 - "_page_image"
Cohesion: 0.40
Nodes (5): _page_image(), Place a small grey PNG over rect on a PyMuPDF page., test_digital_cover_page_in_front_of_a_scanned_page_is_a_scan(), test_scanned_page_carrying_a_fax_header_line_is_a_scan(), test_text_rich_page_with_a_small_logo_stays_digital()

### Community 206 - "build_seed_decisions.py"
Cohesion: 0.39
Nodes (7): build_decisions(), header_role(), main(), Write the prepared seed decisions to app/seed/decisions-v1.json. Nothing here…, render_decisions(), scan_document(), test_committed_decisions_are_exactly_what_the_generator_writes()

## Knowledge Gaps
- **964 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+959 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ComparedField` connect `PersistenceService` to `JevClassification`, `DocumentAnalysis`, `test_submission.py`, `GeminiDocument`, `test_comparison.py`, `JevProviderFailure`, `contracts.py`, `deps.py`, `GeminiExtractor`, `test_normalization.py`, `test_api_judge.py`, `InMemoryPrivateObjectStore`, `build_seed_decisions.py`, `seed_catalog.py`, `SeedCatalog`, `jev.py`, `test_formats.py`, `JevEquivalenceClient`, `test_contracts.py`, `JevFailureCode`, `JevDocumentRoleClient`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `PersistenceService` connect `PersistenceService` to `DocumentAnalysis`, `test_api_evidence.py`, `GeminiDocument`, `test_api_reads.py`, `test_api_session.py`, `JevProviderFailure`, `deps.py`, `reconciliation.py`, `GeminiExtractor`, `test_api_judge.py`, `GuestContext`, `InMemoryPrivateObjectStore`, `ingestion.py`, `test_api_actions.py`, `seed_catalog.py`, `SeedCatalog`, `_JevNotWired`, `actions.py`, `judge.py`, `.__init__`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Category` connect `PersistenceService` to `JevProviderFailure`, `contracts.py`, `ingestion.py`, `JevEquivalenceClient`, `Gate1Persistence`, `deps.py`, `test_contracts.py`, `JevClassification`, `DocumentAnalysis`, `InboxSource`, `JevFailureCode`, `seed_catalog.py`, `judge.py`, `SeedCatalog`, `jev.py`, `JevDocumentRoleClient`, `test_api_judge.py`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 85 inferred relationships involving `PersistenceService` (e.g. with `_JevNotWired` and `Services`) actually correct?**
  _`PersistenceService` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `AuditContext` (e.g. with `CaseActionBody` and `ExceptionActionBody`) actually correct?**
  _`AuditContext` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 139 inferred relationships involving `ComparedField` (e.g. with `FieldDraft` and `PairAdmission`) actually correct?**
  _`ComparedField` has 139 INFERRED edges - model-reasoned connections that need verification._
- **Are the 125 inferred relationships involving `Category` (e.g. with `FieldDraft` and `PairAdmission`) actually correct?**
  _`Category` has 125 INFERRED edges - model-reasoned connections that need verification._