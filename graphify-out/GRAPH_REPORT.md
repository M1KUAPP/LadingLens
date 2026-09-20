# Graph Report - issue-29-reconciliation  (2026-09-21)

## Corpus Check
- 160 files · ~184,266 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .css 18, (none) 12, .lock 3)

## Summary
- 1770 nodes · 3516 edges · 101 communities (89 shown, 12 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 392 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db3c16bf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PersistenceService
- reconciliation.py
- ingestion.py
- contracts.py
- conftest.py
- InboxPage.tsx
- MUBA Postmortem
- Markdown style guide
- storage.py
- Field Provenance Across Attachment Formats
- test_gate1.py
- email-detail/types.ts
- web/package.json
- vitest
- routes.tsx
- Domain.tsx
- Monash x Averis Hackathon 2026 opening ceremony transcript
- Overlays.tsx
- JevCategoryClient
- Controls.tsx
- jev.py
- SDOC hackathon — Docker server bundle
- Timeline
- main.py
- EmailDetailView.tsx
- compilerOptions
- config.py
- test_jev.py
- LandingPage.tsx
- AttachmentPreflightList.tsx
- Hackathon Brief
- design/README.md
- Rules & Regulations
- package.json
- test_migrations.py
- compilerOptions
- Five-minute preliminary run
- Human Escalation Policy and Refusal Interface
- generate
- Technical requirements
- Isocons
- Design
- Product requirements
- The Stakes of One Missed Document-Checking Email
- Demo Production Tooling Design
- HeldReviewCard.tsx
- or use the loader (stdlib only for the .txt path)
- Shipping document verification
- devDependencies
- Canvas UI
- ComparisonGrid.tsx
- BRIEF.md
- Jakub Krehel's interface skills
- react-router-dom
- MotionSites
- Ten hard questions and answers
- File Structure
- Product
- Design research
- Averis x Monash Hackathon 2026 participant handbook
- Jakub Antalik
- Legal defence and Q&A preparation
- Event timeline
- JevFailureCode
- pytest
- Hugeicons
- Iconsax
- Global Constraints
- EmailDetailView
- Deployment
- Global Constraints
- Global Constraints
- Issue 29 Expected-Shipment Reconciliation Plan
- .get_response
- .oxlintrc.json
- EvidenceViewer.tsx
- Andrej Karpathy Skills
- The Views
- Research
- Submission
- .prettierrc.json
- Landing hero media
- Select
- LadingLens positioning
- Motion
- Data protection and cross-border answer
- Liability answer
- tsconfig.json
- Evidentiary answer
- Fixes required before the final
- Sources
- gcp-setup.sh
- graphify.md
- rtk.md
- skills.md
- averis-api

## God Nodes (most connected - your core abstractions)
1. `PersistenceService` - 87 edges
2. `AuditContext` - 37 edges
3. `InMemoryPrivateObjectStore` - 33 edges
4. `Base` - 30 edges
5. `read_bundle()` - 27 edges
6. `Monash x Averis Hackathon 2026 opening ceremony transcript` - 27 edges
7. `Category` - 26 edges
8. `ReconciliationOutcome` - 23 edges
9. `ReconciliationResult` - 23 edges
10. `reconcile_shipments()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Verification matrix` --references--> `ReconciliationOutcome`  [INFERRED]
  docs/TRD.md → apps/api/app/contracts.py
- `Task 3: Add the Chatterbox Profile, Reference Asset, and Provenance Record` --references--> `generate()`  [INFERRED]
  docs/superpowers/plans/2026-09-20-demo-production-tooling.md → apps/api/app/gemini.py
- `Locked decisions` --references--> `CaseRecord`  [INFERRED]
  docs/superpowers/plans/2026-09-21-issue-29-reconciliation.md → apps/api/app/models.py
- `Task 2: Classification-ready persistence state` --references--> `ReceiptInput`  [INFERRED]
  docs/superpowers/plans/2026-09-20-issue-26-ingestion.md → apps/api/app/persistence.py
- `Final integration checklist` --references--> `AppShell()`  [INFERRED]
  docs/superpowers/plans/2026-09-20-alaskantuna-ux-shell-and-landing.md → apps/web/src/layout/AppShell.tsx

## Import Cycles
- None detected.

## Communities (101 total, 12 thin omitted)

### Community 0 - "PersistenceService"
Cohesion: 0.05
Nodes (125): ComparedField, ExtractionResult, StrEnum, ReconciliationResult, ReviewReason, Status, AuditEventRecord, Base (+117 more)

### Community 1 - "reconciliation.py"
Cohesion: 0.08
Nodes (71): ReconciliationOutcome, ExpectedShipmentBatchResult, ReconciliationRunWriteResult, _candidate_component(), _canonical_timestamp(), _case_identifiers(), CaseSnapshot, DocumentKind (+63 more)

### Community 2 - "ingestion.py"
Cohesion: 0.06
Nodes (55): AttachmentReceipt, BundleEmail, _canonical_message_bytes(), _check_local_source_path(), _detect_format(), _detect_ooxml_format(), Gate1Classifier, Gate1Persistence (+47 more)

### Community 3 - "contracts.py"
Cohesion: 0.06
Nodes (61): AmbiguousReconciliation, _canonical_hash(), _canonical_ids(), compute_subject_key(), _ContractModel, DigitalPdfLocation, DigitalPdfProvenance, DocxParagraphLocation (+53 more)

### Community 4 - "conftest.py"
Cohesion: 0.05
Nodes (41): alembic, alembic_config, do_run_migrations(), run_async_migrations(), run_migrations_online(), extract_both_docs_one_call(), extract_single_doc(), get_b64_image() (+33 more)

### Community 5 - "InboxPage.tsx"
Cohesion: 0.06
Nodes (31): apps_web_src_data_inbox_integrity, apps_web_src_data_inbox_integrity_case_statuses, apps_web_src_data_inbox_integrity_categories, apps_web_src_data_inbox_integrity_reconciliation_outcomes, apps_web_src_data_inbox_integrity_review_reasons, apps_web_src_data_inbox_integrity_summarizeinbox, apps_web_src_data_inbox_labels, apps_web_src_data_inbox_labels_category_label (+23 more)

### Community 6 - "MUBA Postmortem"
Cohesion: 0.04
Nodes (41): Build metrics, Cekgu audit, Gaps a judge could have noticed, The demo surface, Track requirements, What shipped, Where the effort went, Cekgu Product (+33 more)

### Community 7 - "Markdown style guide"
Cohesion: 0.05
Nodes (39): Add spacing to headings, ATX-style headings, Avoid relative paths unless within the same directory, Better is better than best, Capitalization, Capitalization of titles and headers, Character line limit, Code (+31 more)

### Community 8 - "storage.py"
Cohesion: 0.08
Nodes (23): async_sessionmaker, GcsPrivateObjectStore, private_object_key(), PrivateObjectStore, Client, Protocol, _validate_hash(), asyncio (+15 more)

### Community 9 - "Field Provenance Across Attachment Formats"
Cohesion: 0.06
Nodes (33): Caching and Precomputation Recommendations, Comparison of Extraction Strategies, Decision Layer Latency Benchmarks, Dual-Document Extraction in a Single Request, End-to-End Latency Profile, Executive Summary, Extraction Latency Benchmarks, Live Demo Feasibility Verdict (+25 more)

### Community 10 - "test_gate1.py"
Cohesion: 0.13
Nodes (20): Category, InboxIngestionService, Receipt an inbox before running fail-closed Gate 1 classification., JevClassification, BaseModel, model_validator, _audit(), _FakePersistence (+12 more)

### Community 11 - "email-detail/types.ts"
Cohesion: 0.11
Nodes (23): email001Fixture, email507Fixture, email511Fixture, email516Fixture, emailAmbiguousFixture, emailFormatShowcaseFixture, Category, DigitalPdfLocation (+15 more)

### Community 12 - "web/package.json"
Cohesion: 0.07
Nodes (28): dependencies, @fontsource-variable/archivo, @fontsource-variable/martian-mono, @hugeicons/core-free-icons, @hugeicons/react, react, react-dom, react-router-dom (+20 more)

### Community 13 - "vitest"
Cohesion: 0.17
Nodes (12): App(), options, AppRoutes(), renderAt(), Task 4: Implement the application shell and complete route map, ref_components_hero_film_css_raw, ref_evidence_viewer_css_raw, ref_landing_page_css_raw (+4 more)

### Community 14 - "routes.tsx"
Cohesion: 0.15
Nodes (21): Button(), Field(), clearGuestSession(), createGuestSession(), ensureGuestSession(), GuestSession, readGuestSession(), apps_web_src_pages_auth_page (+13 more)

### Community 15 - "Domain.tsx"
Cohesion: 0.11
Nodes (25): Checkbox(), DropZone(), onDrop(), takeFiles(), DropZoneProps, FieldRow(), FieldRowProps, formatCeiling() (+17 more)

### Community 16 - "Monash x Averis Hackathon 2026 opening ceremony transcript"
Cohesion: 0.07
Nodes (27): 00:00 Pre-show setup, 09:09 Waiting room, 11:36 Welcome and introductions, 13:36 Timeline, 14:12 About Averis, 15:15 Opening keynote, 17:28 Problem statement: shipping-document verification, 25:20 Q&A on the problem statement (+19 more)

### Community 17 - "Overlays.tsx"
Cohesion: 0.13
Nodes (19): addDays(), addMonths(), DatePicker(), onKeyDown(), DatePickerProps, Menu(), MenuItem(), MenuItemProps (+11 more)

### Community 18 - "JevCategoryClient"
Cohesion: 0.18
Nodes (22): JevCategoryClient, _answer(), _FakeSystemOneClient, Any, asyncio, parametrize, _response(), test_classifies_emails_as_bounded_choice_batches_with_pinned_requests() (+14 more)

### Community 19 - "Controls.tsx"
Cohesion: 0.11
Nodes (18): ButtonProps, CheckboxProps, CheckboxState, FieldControl(), FieldControlProps, FieldProps, FieldTriggerProps, TextFieldControl() (+10 more)

### Community 20 - "jev.py"
Cohesion: 0.17
Nodes (21): _answer_fields(), AsyncSystemOneClient, AttachmentLike, ClassifiableEmail, _EmailState, JevProviderFailure, _nonempty_string(), _parse_answer() (+13 more)

### Community 21 - "SDOC hackathon — Docker server bundle"
Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 22 - "Timeline"
Cohesion: 0.09
Nodes (22): Are there prizes?, Averis x Monash Hackathon 2026, Build period, Community and socials, Contact us, Do I need to know how to code?, Final pitch day, Frequently asked questions (+14 more)

### Community 23 - "main.py"
Cohesion: 0.14
Nodes (19): get_settings(), get_engine(), get_session(), AsyncEngine, AsyncSession, Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), health() (+11 more)

### Community 24 - "EmailDetailView.tsx"
Cohesion: 0.14
Nodes (15): apps_web_src_features_email_detail_email_detail, EmailDetailViewProps, STATUS_KIND_MAP, useEmailDetailRecord(), PREPARED_FIXTURES, cloneRecord(), createPreparedEmailDetailService(), defaultEmailDetailService (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 26 - "config.py"
Cohesion: 0.13
Nodes (13): Settings, _clients(), Client, test_approved_model_defaults(), test_settings_have_no_alternative_provider_fields(), BaseSettings, Final integration checklist, Issue 24 Contracts And Provider Configuration Implementation Plan (+5 more)

### Community 27 - "test_jev.py"
Cohesion: 0.11
Nodes (15): _Attachment, _Email, _FakeChoice, _FakeRetryPolicy, _ProviderError, Exception, fixture, MonkeyPatch (+7 more)

### Community 28 - "LandingPage.tsx"
Cohesion: 0.22
Nodes (14): ThemeSeed(), apps_web_src_components_hero_film, HeroFilm(), apps_web_src_layout_app_shell, AppShell(), applyTheme(), isTheme(), readTheme() (+6 more)

### Community 29 - "AttachmentPreflightList.tsx"
Cohesion: 0.13
Nodes (16): Tooltip(), apps_web_src_features_email_detail_components_attachment_preflight, AttachmentPreflightList(), AttachmentPreflightListProps, DOC_TYPE_LABEL, formatBytes(), PARSE_STATUS_MAP, PARSE_TEXT_MAP (+8 more)

### Community 30 - "Hackathon Brief"
Cohesion: 0.11
Nodes (19): At a Glance, Hackathon Brief, Judging, Key Dates, Loading the Data, Q&A Highlights, Rules That Matter, Sources (+11 more)

### Community 31 - "design/README.md"
Cohesion: 0.16
Nodes (8): Encoding for the page, Generating in Gemini, Landing video pipeline, Removing the watermark, See also, The agent's checklist, What Gemini outputs, Writing the prompt

### Community 32 - "Rules & Regulations"
Cohesion: 0.11
Nodes (17): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+9 more)

### Community 33 - "package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, lint-staged, scripts (+9 more)

### Community 34 - "test_migrations.py"
Cohesion: 0.35
Nodes (15): alembic_script, async_sessionmaker, asyncio, AsyncSession, parametrize, postgres, UUID, _seed_append_only_rows() (+7 more)

### Community 35 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 36 - "Five-minute preliminary run"
Cohesion: 0.12
Nodes (16): 0:00–0:30 — Account for the inbox, 0:30–1:00 — Show exact submission output, 1:00–1:40 — Prove a judge-supplied document comparison, 1:40–2:05 — Refuse an unsafe comparison, 2:05–2:35 — Load the independent expectation ledger, 2:35–3:55 — Peak: reveal the unmatched expected shipment, 3:55–4:50 — Close on ownership and the public route, Finals additions (+8 more)

### Community 37 - "Human Escalation Policy and Refusal Interface"
Cohesion: 0.12
Nodes (16): Decision Thresholds and Operating Bands, Empirical Jev Calibration and Probability Distribution, Executive Summary, Human Escalation Policy and Refusal Interface, Interactive Mode vs. Batch Submission Mode, Judge Experience and On-Screen Presentation, Mapping Signals to Review Reasons, Observations (+8 more)

### Community 38 - "generate"
Cohesion: 0.22
Nodes (14): generate(), Call Gemini, retrying once on the second key if the first is rate-limited., _client(), asyncio, _rate_limited(), test_falls_back_to_second_key_on_429(), test_no_keys_configured(), test_raises_when_every_key_is_rate_limited() (+6 more)

### Community 39 - "Technical requirements"
Cohesion: 0.12
Nodes (16): Atomic evaluator-submission runs, Canonical enums and output contract, Decision register, Deployment, security, and observability, End-to-end flow and state machine, Failure contract, Format routing and provenance, Jev decision rules (+8 more)

### Community 40 - "Isocons"
Cohesion: 0.13
Nodes (15): upload(), An icon's panel, Isocons, See also, Styling controls, The catalogue, The exported SVG, Why it fits (+7 more)

### Community 41 - "Design"
Cohesion: 0.13
Nodes (15): Acceptance, Accessibility, App Layout, Colour, Components, Dark Mode, Decisions, Design (+7 more)

### Community 42 - "Product requirements"
Cohesion: 0.13
Nodes (15): Decision ownership, Evaluator contract, Finals scope, Functional requirements, Goals and boundaries, Goals and measurable success, Human review and provenance, Non-goals (+7 more)

### Community 43 - "The Stakes of One Missed Document-Checking Email"
Cohesion: 0.13
Nodes (15): Action Summary, Business Effects Beyond the Penalty, Candidate Opening Line, Conclusion, Evidence Strength and Safe Claims, Five Supporting Data Points, Issue 12 Q&A Stress Test, Limits of the Evidence (+7 more)

### Community 44 - "Demo Production Tooling Design"
Cohesion: 0.13
Nodes (14): Acceptance Criteria, Chatterbox Voice Profile, Demo Production Tooling Design, Dependencies and Isolation, Error Handling, Goals, Narration Data Flow, Non-Goals (+6 more)

### Community 45 - "HeldReviewCard.tsx"
Cohesion: 0.15
Nodes (10): VerdictHoldGlyph(), apps_web_src_features_email_detail_components_held_review_card, ACTIONABLE_DISPOSITIONS, HeldReviewCard(), HeldReviewCardProps, REVIEW_REASON_LABELS, SETTLED_STATUS, CaseReviewDetails (+2 more)

### Community 46 - "or use the loader (stdlib only for the .txt path)"
Cohesion: 0.14
Nodes (13): Attachment text layout (SI vs BL labels), `attachments/` inventory, Bundle contents, class `Inbox` (the only public class), `inbox/` email record schema, loader.py, look at one email + its documents, `__main__` demo (+5 more)

### Community 47 - "Shipping document verification"
Cohesion: 0.14
Nodes (13): Advanced stage, Context, Evaluating your own output, Expected result and extensions, Formatting your output for the self-evaluation, How to use the result, Shipping document verification, The loader (+5 more)

### Community 48 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, jsdom, oxlint, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node, @types/react (+5 more)

### Community 49 - "Canvas UI"
Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 50 - "ComparisonGrid.tsx"
Cohesion: 0.20
Nodes (11): apps_web_src_features_email_detail_components_comparison_grid, ComparisonGrid(), ComparisonGridProps, FIELD_HUMAN_LABELS, FIELD_ORDER, renderValueAnchor(), resolveProvenanceKind(), VERDICT_STATUS_MAP (+3 more)

### Community 51 - "BRIEF.md"
Cohesion: 0.17
Nodes (6): Evaluation criteria distribution — final round, Evaluation criteria distribution — preliminary round, Judging criteria, File descriptions, Folder files, Problem statement and datasets Drive folder

### Community 52 - "Jakub Krehel's interface skills"
Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 53 - "react-router-dom"
Cohesion: 0.20
Nodes (8): apps_web_src_index, apps_web_src_layout_site_shell, SiteFooter(), SiteShell(), apps_web_src_styles_base, apps_web_src_styles_tokens, react-dom, react-router-dom

### Community 54 - "MotionSites"
Cohesion: 0.18
Nodes (11): Animated backgrounds, How a prompt is written, Layered parallax hero, MotionSites, Scroll-scrubbed video, See also, The free lessons, Three.js scroll scene (+3 more)

### Community 55 - "Ten hard questions and answers"
Cohesion: 0.18
Nodes (11): 10. Are you compliant with every competition rule today?, 1. Who is liable when Averis misses a discrepancy?, 2. Is "human in the loop" just a disclaimer that shifts blame?, 3. Does one missed email really cost MYR 5,200?, 4. What finds a shipment if the email never arrives?, 5. Does an Averis annotation legally amend the Bill of Lading?, 6. Can the report be relied on as evidence?, 7. How is sending real shipping documents to the AI PDPA-compliant? (+3 more)

### Community 56 - "File Structure"
Cohesion: 0.18
Nodes (10): Demo Production Tooling Implementation Plan, File Structure, Final Integration Checklist, Global Constraints, Task 1: Create the Workflow-Neutral Capture Contract, Task 2: Add Measured Narration Timing and Minimalist Subtitle Generation, Task 3: Add the Chatterbox Profile, Reference Asset, and Provenance Record, Task 4: Add Assembly, Muxing, and Optional Slide Rendering (+2 more)

### Community 57 - "Product"
Cohesion: 0.20
Nodes (10): Decision ownership, Demonstration and proof, Evidence experience, Identity and pitch, One control loop, People and workflow, Product, Product principles (+2 more)

### Community 58 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 59 - "Averis x Monash Hackathon 2026 participant handbook"
Cohesion: 0.20
Nodes (9): Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates, Prizes and awards, Problem statement, Submission (+1 more)

### Community 60 - "Jakub Antalik"
Cohesion: 0.22
Nodes (9): Jakub Antalik, Libraries.dev, See also, Selected work, The customisation panel, The drawer, The page, Transitions.dev (+1 more)

### Community 61 - "Legal defence and Q&A preparation"
Cohesion: 0.22
Nodes (7): Action summary, Claims the team must not make, Competition rules audit, Current repository reality, Executive answer, Legal defence and Q&A preparation, Repository licence decision

### Community 62 - "Event timeline"
Cohesion: 0.22
Nodes (9): Build period, Event timeline, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced (+1 more)

### Community 63 - "JevFailureCode"
Cohesion: 0.32
Nodes (3): JevFailureCode, StrEnum, _FailingClassifier

### Community 64 - "pytest"
Cohesion: 0.25
Nodes (5): _clean_settings(), fixture, MonkeyPatch, fastapi_testclient, pytest

### Community 65 - "Hugeicons"
Cohesion: 0.25
Nodes (8): An icon's page, Browsing and search, For agents, Getting icons without an account, Hugeicons, See also, The free style, Why it fits

### Community 66 - "Iconsax"
Cohesion: 0.25
Nodes (8): An icon's panel, Browsing and configuring, Free against Pro, Iconsax, See also, The free set, Where the browser lives, Why it is the alternative

### Community 67 - "Global Constraints"
Cohesion: 0.25
Nodes (7): AlaskanTuna UX Shell And Landing Implementation Plan, Final integration checklist, Global Constraints, Task 1: Install the route, font, icon, and test foundations, Task 2: Implement tokens, typography, and theme persistence, Task 5: Adapt the Perch landing structure to LadingLens, Task 6: Run the acceptance, performance, and regression pass

### Community 68 - "EmailDetailView"
Cohesion: 0.29
Nodes (6): detectedFilesLabel(), EmailDetailView(), handleSelectProvenance(), revealEvidence(), EmailDetailPage(), Task 7: Route Integration and Route Guard Verification (Final Separate Commit)

### Community 69 - "Deployment"
Cohesion: 0.29
Nodes (6): API Keys, Cost Guardrails, Deployment, How Deploys Work, Resource Names, Running Locally

### Community 70 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Chaosiris Ideation Lock Implementation Plan, Global Constraints, Task 1: Lock Product Identity and Demo Spine, Task 2: Write the Canonical Product Contract, Task 3: Reconcile the Technical Contract, Task 4: Verify, Review, and Publish

### Community 71 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Global Constraints, Restructure Brief and Deployment Implementation Plan, Task 1: Rename `docs/brief.md` to `docs/BRIEF.md` and Update References, Task 2: Move `docs/deployment.md` to `docs/references/deployment.md` and Update References, Task 3: Update Knowledge Graph with Graphify, Task 4: Push Branch, Create Pull Request, Code Review, Resolve, Merge, and Delete Branch

### Community 72 - "Issue 29 Expected-Shipment Reconciliation Plan"
Cohesion: 0.29
Nodes (6): Issue 29 Expected-Shipment Reconciliation Plan, Locked decisions, Task 2: Deterministic six-outcome engine, Task 3: Durable shipment and outcome invariants, Task 4: Reconciliation exception review, Task 5: End-to-end verification and review

### Community 73 - ".get_response"
Cohesion: 0.33
Nodes (5): Static files with fallback to index.html for client-side routes., SPAStaticFiles, Response, Scope, StaticFiles

### Community 74 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 75 - "EvidenceViewer.tsx"
Cohesion: 0.40
Nodes (5): apps_web_src_features_email_detail_components_evidence_viewer, EvidenceViewer(), EvidenceViewerProps, renderLocationDetails(), Provenance

### Community 76 - "Andrej Karpathy Skills"
Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 77 - "The Views"
Cohesion: 0.33
Nodes (6): The Email Detail View, The Evaluation Dashboard, The Graph View, The Human Review Flow, The Inbox List, The Views

### Community 78 - "Research"
Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 79 - "Submission"
Cohesion: 0.33
Nodes (6): First Part: Team Details, Google Forms Submission Structure, Second Part: Project Details, Submission, Submission Components, Submission Information

### Community 80 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 81 - "Landing hero media"
Cohesion: 0.40
Nodes (4): Approved generation prompt, Encoding, Landing hero media, Required files

### Community 83 - "LadingLens positioning"
Cohesion: 0.40
Nodes (4): LadingLens positioning, Outsider restatement test, Source links, Why this resists a thin wrapper

### Community 85 - "Motion"
Cohesion: 0.50
Nodes (4): Motion, Motion Rules, Motion Tokens, Reduced Motion

### Community 86 - "Data protection and cross-border answer"
Cohesion: 0.50
Nodes (4): Data protection and cross-border answer, Production PDPA checklist, The judge-ready answer, Why the current Gemini route is a production blocker

### Community 87 - "Liability answer"
Cohesion: 0.50
Nodes (4): Liability answer, The judge-ready answer, When Averis misses a real discrepancy, When Averis raises a false positive

### Community 89 - "Evidentiary answer"
Cohesion: 0.67
Nodes (3): Conditions for operational reliance, Evidentiary answer, Status of the Averis output

### Community 90 - "Fixes required before the final"
Cohesion: 0.67
Nodes (3): Fixes required before the final, Recommended control sequence, Release blockers

### Community 91 - "Sources"
Cohesion: 0.67
Nodes (3): Internal and competition sources, Legal, privacy and provider sources, Sources

## Knowledge Gaps
- **648 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+643 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 861 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InboxSource` connect `ingestion.py` to `Domain.tsx`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `Task 3: Inbox triage list page` connect `Domain.tsx` to `ingestion.py`, `Select`, `AttachmentPreflightList.tsx`, `routes.tsx`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `upload()` connect `Isocons` to `storage.py`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `PersistenceService` (e.g. with `Category` and `ComparedField`) actually correct?**
  _`PersistenceService` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `AuditContext` (e.g. with `Gate1Persistence` and `InboxIngestionService`) actually correct?**
  _`AuditContext` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `InMemoryPrivateObjectStore` (e.g. with `test_audit_failure_rolls_back_receipt_and_idempotency_row()` and `test_audit_failure_rolls_back_reconciliation_review_and_cache()`) actually correct?**
  _`InMemoryPrivateObjectStore` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `Base` (e.g. with `_check_constraint()` and `test_audit_event_has_no_cascading_target_foreign_key()`) actually correct?**
  _`Base` has 9 INFERRED edges - model-reasoned connections that need verification._