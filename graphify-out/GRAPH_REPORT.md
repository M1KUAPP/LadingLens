# Graph Report - issue-39  (2026-09-21)

## Corpus Check
- 284 files · ~341,704 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 52 file(s) not represented in the graph (top: .css 33, (none) 12, .lock 3)

## Summary
- 2711 nodes · 5619 edges · 174 communities (150 shown, 16 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 447 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a782a5cf`
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
- test_submission.py
- Human Escalation Policy and Refusal Interface
- Shipping document verification
- Averis x Monash Hackathon 2026
- Demo Production Tooling Design
- generate
- MissingCasePeakCard.tsx
- Design
- Ten hard questions and answers
- Averis x Monash Hackathon 2026 participant handbook
- Field Provenance Across Attachment Formats
- compilerOptions
- JudgeView.tsx
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
- dependencies
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
- judge-api.test.ts
- Global Constraints
- api.ts
- web/package.json
- Data protection and cross-border answer
- Liability answer
- Evidentiary answer
- Fixes required before the final
- Sources
- CytoscapeCanvas.tsx
- Controls.tsx
- ReviewQueueTable.tsx
- capture.mjs
- Issue 31 Atomic Submission Run Plan
- smoke_deployment.py
- email-detail/types.ts
- test_persistence.py
- test_models.py
- test_storage.py
- The Views
- Global Constraints
- review-queue/seam.ts
- Results by route
- Motion
- Global Constraints
- test_health.py
- generate-inbox-fixture.py
- Overlays.tsx
- verify_gcp_controls.py
- contracts.ts
- contracts.py
- reconciliation.py
- get_settings
- ingestion.py
- .oxlintrc.json
- test_smoke_deployment.py
- Category
- review-queue-css.test.ts
- reconciliation-css.test.ts
- Timeline
- End-to-end flow and state machine
- ReconciliationView.test.tsx
- .dispatch
- vitest
- Settings
- test_gcp_controls.py
- record.mjs
- LadingLens preliminary pitch deck — superseded planning draft
- 20260921_0004_submission_runs.py
- Timed script
- test_migrations.py
- FakeRenderer
- scripts
- Demo-day script template
- speak.py
- Issue 33 Deployment Hardening Implementation Plan
- ManifestTests
- ScheduleTests
- react
- SDOC hackathon — delivery kit
- env.py
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
- PersistenceService
- test_deployment_hardening.py
- ReconciliationView.tsx
- reconciliation/seam.ts
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
- API Contract (from #30)
- manifest.py
- Global Constraints
- UploadPanel.tsx
- subtitles.py
- Domain.tsx
- UploadPanel.test.tsx
- JudgeView.test.tsx
- ReviewPage.tsx
- test_submission_persistence.py
- judge/types.ts
- devDependencies
- test_reconciliation_persistence.py
- persistence.py
- reconciliation/types.ts
- schedule.py
- GateSummary.tsx

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 114 edges
2. `vitest` - 51 edges
3. `InMemoryPrivateObjectStore` - 47 edges
4. `AuditContext` - 44 edges
5. `@testing-library/react` - 39 edges
6. `react` - 38 edges
7. `Base` - 36 edges
8. `build_submission_artifact()` - 32 edges
9. `Category` - 30 edges
10. `read_bundle()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `test_audit_event_has_no_cascading_target_foreign_key()` --uses--> `Base`  [INFERRED]
  apps/api/tests/test_models.py → apps/api/app/models.py
- `test_classification_metadata_supports_pending_and_ready_cases()` --uses--> `Base`  [INFERRED]
  apps/api/tests/test_models.py → apps/api/app/models.py
- `test_guest_workspace_can_reference_an_immutable_seed_workspace()` --uses--> `Base`  [INFERRED]
  apps/api/tests/test_models.py → apps/api/app/models.py
- `test_metadata_contains_required_and_support_tables()` --uses--> `Base`  [INFERRED]
  apps/api/tests/test_models.py → apps/api/app/models.py
- `test_settings_have_no_alternative_provider_fields()` --uses--> `Settings`  [INFERRED]
  apps/api/tests/test_provider_configuration.py → apps/api/app/config.py

## Import Cycles
- None detected.

## Communities (174 total, 16 thin omitted)

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
Cohesion: 0.08
Nodes (23): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+15 more)

### Community 7 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "SDOC hackathon — Docker server bundle"
Cohesion: 0.12
Nodes (16): Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums, Environment variables, Field-label synonym table (data_v2/pools.py `LABELS`) (+8 more)

### Community 12 - "test_submission.py"
Cohesion: 0.09
Nodes (56): ComparedField, StrEnum, ReviewReason, build_submission_artifact(), EndToEndScore, _FrozenModel, _output_for_snapshot(), BaseModel (+48 more)

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
Cohesion: 0.18
Nodes (16): generate(), Call Gemini, retrying once on the second key if the first is rate-limited., _client(), asyncio, _rate_limited(), test_falls_back_to_second_key_on_429(), test_no_keys_configured(), test_raises_when_every_key_is_rate_limited() (+8 more)

### Community 19 - "MissingCasePeakCard.tsx"
Cohesion: 0.32
Nodes (4): VerdictHoldGlyph(), MissingCaseReconciliation, MissingCasePeakCard(), MissingCasePeakCardProps

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

### Community 25 - "JudgeView.tsx"
Cohesion: 0.13
Nodes (18): EvidenceViewer(), EvidenceViewerProps, renderLocationDetails(), Provenance, defaultJudgeApi, JudgeApiClient, classifyError(), documentRoleLabel() (+10 more)

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

### Community 38 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, cytoscape, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom (+1 more)

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

### Community 62 - "judge-api.test.ts"
Cohesion: 0.15
Nodes (19): createJudgeRun(), CreateJudgeRunInput, downloadArtifact(), getGateSummary(), getJudgePolicy(), getJudgeRun(), getPreparedFallback(), isUploadRejection() (+11 more)

### Community 63 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Guest Auth Implementation Plan, Final integration checklist, Global Constraints, Task 1: Add the guest-session seam, Task 2: Extend Field with autocomplete and email input, Task 3: Build the two-pane AuthPage, Task 4: Add the demo navigation guard and judge session init, Task 5: Run the full verification and self-review pass

### Community 64 - "api.ts"
Cohesion: 0.20
Nodes (14): TxtProvenance, SourceExcerpt(), SourceExcerptProps, abortInFlight(), API_SESSION_KEY, ApiError, apiFetch(), errorFrom() (+6 more)

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
Nodes (35): StatusKind, AccessibleGraphTable(), KIND_LABEL, nodeKey(), STATE_LABEL, CanvasBoundary, CanvasBoundaryProps, ControlGraphView() (+27 more)

### Community 72 - "Controls.tsx"
Cohesion: 0.07
Nodes (25): ButtonProps, Checkbox(), CheckboxProps, CheckboxState, Field(), FieldControlProps, FieldProps, FieldTriggerProps (+17 more)

### Community 73 - "ReviewQueueTable.tsx"
Cohesion: 0.13
Nodes (22): ASSIGNMENT_STATE_LABEL, custodyKind(), custodyLabel(), humanize(), isHeld(), itemIdentifier(), KIND_LABEL, reasonLabel() (+14 more)

### Community 74 - "capture.mjs"
Cohesion: 0.15
Nodes (22): authFlowCheck(), captureRoute(), captureStates(), { chromium }, ensureServer(), greyscaleCheck(), ISSUE_DIR, main() (+14 more)

### Community 75 - "Issue 31 Atomic Submission Run Plan"
Cohesion: 0.25
Nodes (7): Issue 31 Atomic Submission Run Plan, Locked decisions, Task 1: Exact artifact contract and serializer, Task 2: Durable staging and scoring schema, Task 3: Resumable atomic publication, Task 4: Organizer self-evaluation evidence, Task 5: Verification and truthful handoff

### Community 76 - "smoke_deployment.py"
Cohesion: 0.23
Nodes (19): Fetcher, _assert_no_redirect(), _check_artifact(), _check_artifact_record(), _check_spa(), CheckResult, fetch_url(), HttpResult (+11 more)

### Community 77 - "email-detail/types.ts"
Cohesion: 0.07
Nodes (33): AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP, REFUSAL_EXPLANATIONS, REFUSAL_TITLES (+25 more)

### Community 78 - "test_persistence.py"
Cohesion: 0.20
Nodes (34): ExtractionResult, AuditEventRecord, CaseRecord, ReviewAssignmentInput, InMemoryPrivateObjectStore, _audit_context(), _classification_probabilities(), _create_classification_case() (+26 more)

### Community 79 - "test_models.py"
Cohesion: 0.17
Nodes (18): _check_constraint(), test_audit_event_has_no_cascading_target_foreign_key(), test_cases_retain_all_structural_diagnostics_as_an_array(), test_classification_metadata_supports_pending_and_ready_cases(), test_expected_shipments_retain_typed_reconciliation_inputs(), test_guest_workspace_can_reference_an_immutable_seed_workspace(), test_idempotency_key_and_guest_generation_are_scoped(), test_metadata_contains_required_and_support_tables() (+10 more)

### Community 80 - "test_storage.py"
Cohesion: 0.06
Nodes (22): async_sessionmaker, artifact_object_key(), GcsPrivateObjectStore, upload(), private_object_key(), PrivateObjectStore, Client, Protocol (+14 more)

### Community 81 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 82 - "Global Constraints"
Cohesion: 0.20
Nodes (9): AlaskanTuna Email Detail View Implementation Plan, Global Constraints, Task 1: Define canonical domain types, async service seam, and realistic prepared fixtures, Task 2: Implement Attachment Preflight List and Structural Refusals, Task 3: Implement Seven-Field Comparison Grid with In-house FieldRow and Rails, Task 4: Implement Format-Honest Evidence Viewer, Task 5: Implement Held Review Card with Single Primary Sign-off and Seam Actions, Task 6: Assemble the Email Detail View and Verify Required Acceptance Behaviors (+1 more)

### Community 83 - "review-queue/seam.ts"
Cohesion: 0.07
Nodes (26): ReviewHistoryEntry, PREPARED_FIXTURES, cloneRecord(), createPreparedEmailDetailService(), defaultEmailDetailService, EmailDetailService, CaseReviewActionInput, defaultReconciliationService (+18 more)

### Community 85 - "Results by route"
Cohesion: 0.14
Nodes (13): Auth, Email detail, Evaluation, Failures to fix, Graph, Inbox, Issue 41 browser evidence, Landing (+5 more)

### Community 86 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 87 - "Global Constraints"
Cohesion: 0.22
Nodes (8): AlaskanTuna Inbox Evaluation Implementation Plan, Final integration checklist, Global Constraints, Task 1: Typed domain seam, prepared fixture, and integrity validation, Task 2: In-house Select control, Task 3: Inbox triage list page, Task 4: Evaluation dashboard page, Task 5: Route wiring and acceptance pass

### Community 88 - "test_health.py"
Cohesion: 0.11
Nodes (11): Response, Static files with fallback to index.html for client-side routes., SPAStaticFiles, _clean_settings(), fixture, MonkeyPatch, test_ready_reports_database_failure_without_exception_text(), test_ready_with_reachable_database() (+3 more)

### Community 89 - "generate-inbox-fixture.py"
Cohesion: 0.67
Nodes (3): classify_email(), main(), Generate apps/web/src/data/inbox-fixture.json from data/sdoc-hackathon-bundle.…

### Community 90 - "Overlays.tsx"
Cohesion: 0.08
Nodes (23): KeyedRoutes(), addDays(), addMonths(), ConfirmDialog(), ConfirmDialogProps, DatePicker(), onKeyDown(), DatePickerProps (+15 more)

### Community 91 - "verify_gcp_controls.py"
Cohesion: 0.30
Nodes (14): _bindings(), ControlError, _gcloud_json(), main(), _members(), _parser(), Any, ArgumentParser (+6 more)

### Community 92 - "contracts.ts"
Cohesion: 0.14
Nodes (19): AmbiguousReconciliation, CaseReviewAction, CaseReviewTarget, ReconciliationBase, ReconciliationExceptionActionType, ReconciliationExceptionReviewAction, ReconciliationExceptionReviewTarget, ReconciliationOutcome (+11 more)

### Community 93 - "contracts.py"
Cohesion: 0.06
Nodes (60): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), compute_subject_key(), _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation (+52 more)

### Community 94 - "reconciliation.py"
Cohesion: 0.09
Nodes (66): ReconciliationOutcome, ExpectedShipmentBatchResult, ReconciliationRunWriteResult, _candidate_component(), _canonical_timestamp(), _case_identifiers(), CaseSnapshot, DocumentKind (+58 more)

### Community 95 - "get_settings"
Cohesion: 0.25
Nodes (11): get_settings(), get_engine(), get_session(), AsyncEngine, AsyncSession, _clients(), Client, health() (+3 more)

### Community 96 - "ingestion.py"
Cohesion: 0.07
Nodes (50): AttachmentReceipt, BundleEmail, _canonical_message_bytes(), _check_local_source_path(), _detect_format(), _detect_ooxml_format(), Gate1Classifier, Gate1Persistence (+42 more)

### Community 97 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 98 - "test_smoke_deployment.py"
Cohesion: 0.33
Nodes (9): _artifact(), parametrize, _responses(), test_smoke_checks_every_public_and_private_surface(), test_smoke_rejects_html_masquerading_as_artifact_api(), test_smoke_rejects_invalid_artifact_values(), test_smoke_rejects_judge_redirect_to_auth(), test_smoke_rejects_public_or_unknown_private_object() (+1 more)

### Community 99 - "Category"
Cohesion: 0.06
Nodes (64): Category, InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., _answer_fields(), AsyncSystemOneClient, AttachmentLike, ClassifiableEmail, _EmailState (+56 more)

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

### Community 104 - "ReconciliationView.test.tsx"
Cohesion: 0.27
Nodes (6): ReconciliationResult, emptyService(), failingService(), pendingService(), readyService(), ReconciliationService

### Community 105 - ".dispatch"
Cohesion: 0.22
Nodes (9): Exception, JSONResponse, Response, _request_id(), _safe_unhandled_error(), StructuredRequestLoggingMiddleware, BaseHTTPMiddleware, Request (+1 more)

### Community 106 - "vitest"
Cohesion: 0.12
Nodes (17): App(), options, css, caseItems, exceptionItems, renderTable(), clearGuestSession(), createGuestSession() (+9 more)

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
Cohesion: 0.18
Nodes (32): _async_database_url(), postgres_engine(), postgres_session(), postgres_session_factory(), async_sessionmaker, AsyncEngine, AsyncSession, fixture (+24 more)

### Community 114 - "FakeRenderer"
Cohesion: 0.20
Nodes (6): FakeRenderer, load_speak(), NonFiniteRenderer, SpeakBatchTests, factory(), factory()

### Community 115 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 116 - "Demo-day script template"
Cohesion: 0.14
Nodes (13): Alternate openings, Architecture, Artifact opening, Boundary and risk, Common route, Demo-day script template, Final talk track, Immediate answers (+5 more)

### Community 117 - "speak.py"
Cohesion: 0.22
Nodes (9): _cache_key(), ChatterboxRenderer, _lines_text(), Render approved Chatterbox narration into cached PCM WAV segments., Render line dictionaries, using content-addressed cached WAV segments., Lazy Chatterbox adapter so tests never import or load a model., render_batch(), validate_configuration() (+1 more)

### Community 118 - "Issue 33 Deployment Hardening Implementation Plan"
Cohesion: 0.25
Nodes (7): Issue 33 Deployment Hardening Implementation Plan, Task 1: Pin the deployed provider and data policy, Task 2: Quarantine legacy secrets and enforce private storage, Task 3: Add safe structured request logging, Task 4: Make routing and database readiness honest, Task 5: Add a fail-closed deployment smoke runner, Task 6: Verify, review, publish, and report remaining gates

### Community 121 - "react"
Cohesion: 0.09
Nodes (27): ThemeSeed(), HeroFilm(), Button(), ArtifactKey, DemoArtifacts(), DemoArtifactsProps, AppShell(), SiteFooter() (+19 more)

### Community 122 - "SDOC hackathon — delivery kit"
Cohesion: 0.29
Nodes (7): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Files, Scoring model, SDOC hackathon — delivery kit, server/README.md, Submission format

### Community 123 - "env.py"
Cohesion: 0.31
Nodes (7): Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), do_run_migrations(), run_async_migrations(), run_migrations_online(), __aenter__(), Connection

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

### Community 137 - "PersistenceService"
Cohesion: 0.14
Nodes (24): serialize_evaluator_output(), AuditContext, _canonical_json(), _expected_shipment_values(), IdempotencyConflict, _payload_hash(), PersistenceService, Any (+16 more)

### Community 138 - "test_deployment_hardening.py"
Cohesion: 0.35
Nodes (10): _read(), test_ci_runs_postgresql_tests_instead_of_skipping_them(), test_ci_runs_web_tests_before_building(), test_deploy_fails_closed_on_remote_storage_and_iam_controls(), test_deploy_uses_only_approved_runtime_provider_secrets(), test_deployer_can_read_project_iam_for_fail_closed_verification(), test_gcp_setup_reconciles_wif_to_the_canonical_repository(), test_gcp_setup_uses_exact_secret_grants_and_rehardens_bucket() (+2 more)

### Community 139 - "ReconciliationView.tsx"
Cohesion: 0.12
Nodes (15): Tooltip(), CsvImportSection(), CsvImportSectionProps, ExpectedShipmentTable(), ExpectedShipmentTableProps, FRESHNESS_KIND, FRESHNESS_LABEL, EXPECTED_SHIPMENTS_CSV (+7 more)

### Community 140 - "reconciliation/seam.ts"
Cohesion: 0.21
Nodes (13): reconciliationResultProblems(), parseExpectedShipmentsCsv(), stableHash(), parsed, PREPARED_DATASET_LABEL, PREPARED_EXPECTED_SHIPMENTS, PREPARED_RUN_ID, deriveReconciliationResults() (+5 more)

### Community 141 - "Demo production templates"
Cohesion: 0.40
Nodes (4): Claim authorities, Demo production templates, Demonstration policy, Template index

### Community 142 - "narrate.sh"
Cohesion: 0.60
Nodes (4): DEMO_FFPROBE, fail(), ffconcat_entry(), narrate.sh script

### Community 144 - "ReconciliationOutcomeTable.tsx"
Cohesion: 0.24
Nodes (7): caseSide(), OUTCOME_OPTIONS, ReconciliationOutcomeTable(), ReconciliationOutcomeTableProps, shipmentSide(), OUTCOMES, PREPARED_RECONCILIATION_RESULTS

### Community 145 - "Investor evidence template"
Cohesion: 0.50
Nodes (3): Claim disposition, Investor evidence template, Review prompts

### Community 155 - "Issue 41 code audit"
Cohesion: 0.29
Nodes (6): Focus ring, Greyscale safety, Issue 41 code audit, Open findings, Reduced motion, Tabular numerals

### Community 156 - "API Contract (from #30)"
Cohesion: 0.22
Nodes (8): API Contract (from #30), Global Constraints, Issue 39 Public Judge Flow Implementation Plan, Task 1: Typed judge client, Task 2: Upload panel with honest validation, Task 3: Live check lifecycle and result with evidence, Task 4: Failure disclosure, retry, and prepared fallback, Task 5: Gate summaries, downloads, links, and synthetic messaging

### Community 157 - "manifest.py"
Cohesion: 0.43
Nodes (7): atomic_json_write(), load_beats(), main(), parse_rows(), probe_duration_ms(), Resolve narration rows against measured visual beats., resolve_lines()

### Community 158 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Issue 40 Settings and Reset All Implementation Plan, Task 1: Product API client with a server-minted session, Task 2: Reset orchestration and remount key, Task 3: In-house confirmation dialog, Task 4: The /settings view with Reset All

### Community 159 - "UploadPanel.tsx"
Cohesion: 0.29
Nodes (9): formatCeiling(), formatFileSize(), humanize(), REJECTION_REASON_LABEL, rejectionMessage(), UploadPanelProps, UploadSlot(), UploadSlotProps (+1 more)

### Community 160 - "subtitles.py"
Cohesion: 0.48
Nodes (6): main(), make_spans(), Generate compact, non-overlapping SRT subtitle cards., render_srt(), timestamp(), wrap_rows()

### Community 162 - "Domain.tsx"
Cohesion: 0.08
Nodes (29): DropZone(), onDrop(), takeFiles(), DropZoneProps, FieldRow(), FieldRowProps, formatCeiling(), ProvenanceAnchor() (+21 more)

### Community 163 - "UploadPanel.test.tsx"
Cohesion: 0.22
Nodes (5): chooseFile(), POLICY, slotInput(), UploadPanel(), JudgePolicy

### Community 164 - "JudgeView.test.tsx"
Cohesion: 0.13
Nodes (17): BL_DOC, chooseFile(), CONSIGNEE_FIELD, CONSIGNEE_SI_PROVENANCE, createFakeApi(), FALLBACK, file(), GATE_SUMMARY (+9 more)

### Community 165 - "ReviewPage.tsx"
Cohesion: 0.16
Nodes (7): ReviewQueueView(), readTab(), ReviewPage(), onTabKeyDown(), selectTab(), ReviewTab, TABS

### Community 166 - "test_submission_persistence.py"
Cohesion: 0.23
Nodes (25): FieldVerdictRecord, SubmissionRun, SubmissionRunRecord, CaseInput, _audit(), _manifest_hash(), asyncio, parametrize (+17 more)

### Community 167 - "judge/types.ts"
Cohesion: 0.10
Nodes (24): Category, ComparedField, FieldVerdictRecord, FailurePanel(), FailurePanelProps, BL_DOC, SI_DOC, PreparedFallbackPanel() (+16 more)

### Community 168 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, jsdom, oxlint, playwright, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+6 more)

### Community 169 - "test_reconciliation_persistence.py"
Cohesion: 0.25
Nodes (21): _receipt_input(), ReconciliationResultRecord, ReconciliationRun, ReviewAssignmentRecord, ExpectedShipmentInput, ReceiptInput, ReviewActionInput, _audit() (+13 more)

### Community 170 - "persistence.py"
Cohesion: 0.10
Nodes (33): Status, Base, ClassificationAttempt, _created_at_column(), EmailAttachment, EmailReceipt, _enum(), ExpectedShipmentRecord (+25 more)

### Community 171 - "reconciliation/types.ts"
Cohesion: 0.33
Nodes (7): ExpectedShipment, RequiredDocument, SourceFreshness, EXPECTED_SHIPMENTS_CSV_HEADER, REQUIRED_DOCUMENTS, SOURCE_FRESHNESS, CsvImportError

### Community 172 - "schedule.py"
Cohesion: 0.48
Nodes (6): atomic_json_write(), deconflict(), main(), probe_duration_ms(), Place narration segments without crossing visual boundaries., schedule()

### Community 173 - "GateSummary.tsx"
Cohesion: 0.33
Nodes (7): GateSummary(), GateSummaryProps, reconciliationLabel(), SOURCE_LABEL, statusLabel(), SUMMARY, GateSummary

## Knowledge Gaps
- **953 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+948 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1272 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `api.ts`, `web/package.json`, `Domain.tsx`, `ReviewPage.tsx`, `CytoscapeCanvas.tsx`, `Controls.tsx`, `judge/types.ts`, `vitest`, `ReconciliationView.tsx`, `ReviewQueueTable.tsx`, `GateSummary.tsx`, `ReconciliationOutcomeTable.tsx`, `review-queue/seam.ts`, `JudgeView.tsx`, `Overlays.tsx`, `EvaluationPage.tsx`, `UploadPanel.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `ReconciliationView.tsx`, `reconciliation/seam.ts`, `ReconciliationOutcomeTable.tsx`, `MissingCasePeakCard.tsx`, `JudgeView.tsx`, `Domain.tsx`, `UploadPanel.test.tsx`, `JudgeView.test.tsx`, `ReviewPage.tsx`, `judge/types.ts`, `GateSummary.tsx`, `EvaluationPage.tsx`, `judge-api.test.ts`, `api.ts`, `web/package.json`, `CytoscapeCanvas.tsx`, `Controls.tsx`, `review-queue/seam.ts`, `Overlays.tsx`, `contracts.ts`, `review-queue-css.test.ts`, `reconciliation-css.test.ts`, `ReconciliationView.test.tsx`, `react`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `PersistenceService` connect `PersistenceService` to `Category`, `test_submission_persistence.py`, `test_reconciliation_persistence.py`, `persistence.py`, `test_submission.py`, `test_persistence.py`, `test_storage.py`, `contracts.py`, `reconciliation.py`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `PersistenceService` (e.g. with `Category` and `ComparedField`) actually correct?**
  _`PersistenceService` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `ValueError` (e.g. with `_canonical_ids()` and `compute_subject_key()`) actually correct?**
  _`ValueError` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `InMemoryPrivateObjectStore` (e.g. with `test_audit_failure_rolls_back_receipt_and_idempotency_row()` and `test_audit_failure_rolls_back_reconciliation_review_and_cache()`) actually correct?**
  _`InMemoryPrivateObjectStore` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `AuditContext` (e.g. with `Gate1Persistence` and `InboxIngestionService`) actually correct?**
  _`AuditContext` has 5 INFERRED edges - model-reasoned connections that need verification._