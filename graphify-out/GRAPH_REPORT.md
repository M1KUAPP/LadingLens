# Graph Report - Averis  (2026-09-20)

## Corpus Check
- 73 files · ~114,978 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 791 nodes · 798 edges · 53 communities (47 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `662c8072`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Markdown style guide
- devDependencies
- Codeblocks
- Andrej Karpathy Skills
- Shipping document verification
- Rules and regulations
- .prettierrc.json
- Shipping document verification
- graphify.md
- rtk.md
- skills.md
- Monash x Averis Hackathon 2026 opening ceremony transcript
- Timeline
- Event timeline
- Averis x Monash Hackathon 2026 participant handbook
- Rules & Regulations
- SDOC hackathon — Docker server bundle
- Monash x Averis Hackathon 2026 opening ceremony
- Problem statement and datasets Drive folder
- Shipping document verification
- Field Provenance Across Attachment Formats
- compilerOptions
- Hackathon Brief
- compilerOptions
- The Stakes of One Missed Document-Checking Email
- Canvas UI
- Jakub Krehel's interface skills
- MotionSites
- Design research
- benchmark_latency.py
- Product requirements
- plugins
- Research
- tsconfig.json
- gcp-setup.sh
- Jakub Antalik
- averis-api
- brief.md
- Five-minute preliminary run
- Iconsax
- Technical requirements
- Global Constraints
- LadingLens positioning
- Hugeicons
- Landing video pipeline
- Isocons
- Its Hover
- or use the loader (stdlib only for the .txt path)
- File Structure

## God Nodes (most connected - your core abstractions)
1. `Monash x Averis Hackathon 2026 opening ceremony transcript` - 27 edges
2. `compilerOptions` - 18 edges
3. `Design` - 17 edges
4. `compilerOptions` - 15 edges
5. `Technical requirements` - 15 edges
6. `Markdown style guide` - 15 edges
7. `The Stakes of One Missed Document-Checking Email` - 15 edges
8. `Demo Production Tooling Design` - 14 edges
9. `Legal defence and Q&A preparation` - 13 edges
10. `get_settings()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `health()` --calls--> `get_settings()`  [EXTRACTED]
  apps/api/app/main.py → apps/api/app/config.py
- `test_no_keys_configured()` --calls--> `generate()`  [EXTRACTED]
  apps/api/tests/test_gemini.py → apps/api/app/gemini.py
- `get_engine()` --calls--> `get_settings()`  [EXTRACTED]
  apps/api/app/db.py → apps/api/app/config.py
- `_clients()` --calls--> `get_settings()`  [EXTRACTED]
  apps/api/app/gemini.py → apps/api/app/config.py
- `generate()` --calls--> `get_settings()`  [EXTRACTED]
  apps/api/app/gemini.py → apps/api/app/config.py

## Import Cycles
- None detected.

## Communities (53 total, 6 thin omitted)

### Community 0 - "Markdown style guide"
Cohesion: 0.05
Nodes (39): Add spacing to headings, ATX-style headings, Avoid relative paths unless within the same directory, Better is better than best, Capitalization, Capitalization of titles and headers, Character line limit, Code (+31 more)

### Community 1 - "devDependencies"
Cohesion: 0.11
Nodes (17): @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, devDependencies, @commitlint/cli, @commitlint/config-conventional, husky (+9 more)

### Community 3 - "Codeblocks"
Cohesion: 0.04
Nodes (41): Build metrics, Cekgu audit, Gaps a judge could have noticed, The demo surface, Track requirements, What shipped, Where the effort went, Cekgu Product (+33 more)

### Community 4 - "Andrej Karpathy Skills"
Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 5 - "Shipping document verification"
Cohesion: 0.07
Nodes (27): 00:00 Pre-show setup, 09:09 Waiting room, 11:36 Welcome and introductions, 13:36 Timeline, 14:12 About Averis, 15:15 Opening keynote, 17:28 Problem statement: shipping-document verification, 25:20 Q&A on the problem statement (+19 more)

### Community 6 - "Rules and regulations"
Cohesion: 0.08
Nodes (23): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+15 more)

### Community 7 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "Shipping document verification"
Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 14 - "Monash x Averis Hackathon 2026 opening ceremony transcript"
Cohesion: 0.12
Nodes (16): Decision Thresholds and Operating Bands, Empirical Jev Calibration and Probability Distribution, Executive Summary, Human Escalation Policy and Refusal Interface, Interactive Mode vs. Batch Submission Mode, Judge Experience and On-Screen Presentation, Mapping Signals to Review Reasons, Observations (+8 more)

### Community 15 - "Timeline"
Cohesion: 0.14
Nodes (13): Advanced stage, Context, Evaluating your own output, Expected result and extensions, Formatting your output for the self-evaluation, How to use the result, Shipping document verification, The loader (+5 more)

### Community 16 - "Event timeline"
Cohesion: 0.09
Nodes (22): Are there prizes?, Averis x Monash Hackathon 2026, Build period, Community and socials, Contact us, Do I need to know how to code?, Final pitch day, Frequently asked questions (+14 more)

### Community 17 - "Averis x Monash Hackathon 2026 participant handbook"
Cohesion: 0.13
Nodes (14): Acceptance Criteria, Chatterbox Voice Profile, Demo Production Tooling Design, Dependencies and Isolation, Error Handling, Goals, Narration Data Flow, Non-Goals (+6 more)

### Community 18 - "Rules & Regulations"
Cohesion: 0.08
Nodes (31): get_settings(), Settings, get_engine(), get_session(), Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN.      asyncpg rejec, _to_asyncpg_dsn(), _clients(), generate() (+23 more)

### Community 19 - "SDOC hackathon — Docker server bundle"
Cohesion: 0.07
Nodes (29): dependencies, react, react-dom, devDependencies, oxlint, @types/node, @types/react, @types/react-dom (+21 more)

### Community 20 - "Monash x Averis Hackathon 2026 opening ceremony"
Cohesion: 0.08
Nodes (25): Acceptance, Accessibility, App Layout, Colour, Components, Dark Mode, Decisions, Design (+17 more)

### Community 21 - "Problem statement and datasets Drive folder"
Cohesion: 0.06
Nodes (35): 10. Are you compliant with every competition rule today?, 1. Who is liable when Averis misses a discrepancy?, 2. Is "human in the loop" just a disclaimer that shifts blame?, 3. Does one missed email really cost MYR 5,200?, 4. What finds a shipment if the email never arrives?, 5. Does an Averis annotation legally amend the Bill of Lading?, 6. Can the report be relied on as evidence?, 7. How is sending real shipping documents to the AI PDPA-compliant? (+27 more)

### Community 22 - "Shipping document verification"
Cohesion: 0.29
Nodes (6): API Keys, Cost Guardrails, Deployment, How Deploys Work, Resource Names, Running Locally

### Community 23 - "Field Provenance Across Attachment Formats"
Cohesion: 0.06
Nodes (33): Caching and Precomputation Recommendations, Comparison of Extraction Strategies, Decision Layer Latency Benchmarks, Dual-Document Extraction in a Single Request, End-to-End Latency Profile, Executive Summary, Extraction Latency Benchmarks, Live Demo Feasibility Verdict (+25 more)

### Community 24 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 25 - "Hackathon Brief"
Cohesion: 0.11
Nodes (19): At a Glance, Hackathon Brief, Judging, Key Dates, Loading the Data, Q&A Highlights, Rules That Matter, Sources (+11 more)

### Community 26 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 27 - "The Stakes of One Missed Document-Checking Email"
Cohesion: 0.12
Nodes (15): Action Summary, Business Effects Beyond the Penalty, Candidate Opening Line, Conclusion, Evidence Strength and Safe Claims, Five Supporting Data Points, Issue 12 Q&A Stress Test, Limits of the Evidence (+7 more)

### Community 28 - "Canvas UI"
Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 29 - "Jakub Krehel's interface skills"
Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 30 - "MotionSites"
Cohesion: 0.18
Nodes (11): Animated backgrounds, How a prompt is written, Layered parallax hero, MotionSites, Scroll-scrubbed video, See also, The free lessons, Three.js scroll scene (+3 more)

### Community 31 - "Design research"
Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 32 - "benchmark_latency.py"
Cohesion: 0.43
Nodes (7): extract_both_docs_one_call(), extract_single_doc(), get_b64_image(), main(), run_jev_comparison(), stats(), Path

### Community 33 - "Product requirements"
Cohesion: 0.07
Nodes (25): Decision ownership, Evaluator contract, Finals scope, Functional requirements, Goals and boundaries, Goals and measurable success, Human review and provenance, Non-goals (+17 more)

### Community 34 - "plugins"
Cohesion: 0.15
Nodes (10): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, ReadyResponse, oxc, react (+2 more)

### Community 35 - "Research"
Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 38 - "Jakub Antalik"
Cohesion: 0.22
Nodes (9): Jakub Antalik, Libraries.dev, See also, Selected work, The customisation panel, The drawer, The page, Transitions.dev (+1 more)

### Community 40 - "brief.md"
Cohesion: 0.06
Nodes (24): Evaluation criteria distribution — final round, Evaluation criteria distribution — preliminary round, Judging criteria, Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates (+16 more)

### Community 41 - "Five-minute preliminary run"
Cohesion: 0.12
Nodes (16): 0:00–0:30 — Account for the inbox, 0:30–1:00 — Show exact submission output, 1:00–1:40 — Prove a judge-supplied document comparison, 1:40–2:05 — Refuse an unsafe comparison, 2:05–2:35 — Load the independent expectation ledger, 2:35–3:55 — Peak: reveal the unmatched expected shipment, 3:55–4:50 — Close on ownership and the public route, Finals additions (+8 more)

### Community 42 - "Iconsax"
Cohesion: 0.25
Nodes (8): An icon's panel, Browsing and configuring, Free against Pro, Iconsax, See also, The free set, Where the browser lives, Why it is the alternative

### Community 43 - "Technical requirements"
Cohesion: 0.12
Nodes (17): Atomic evaluator-submission runs, Canonical enums and output contract, Decision register, Deployment, security, and observability, End-to-end flow and state machine, Failure contract, Format routing and provenance, Interface schemas (+9 more)

### Community 44 - "Global Constraints"
Cohesion: 0.29
Nodes (6): Chaosiris Ideation Lock Implementation Plan, Global Constraints, Task 1: Lock Product Identity and Demo Spine, Task 2: Write the Canonical Product Contract, Task 3: Reconcile the Technical Contract, Task 4: Verify, Review, and Publish

### Community 45 - "LadingLens positioning"
Cohesion: 0.40
Nodes (4): LadingLens positioning, Outsider restatement test, Source links, Why this resists a thin wrapper

### Community 46 - "Hugeicons"
Cohesion: 0.25
Nodes (8): An icon's page, Browsing and search, For agents, Getting icons without an account, Hugeicons, See also, The free style, Why it fits

### Community 47 - "Landing video pipeline"
Cohesion: 0.25
Nodes (8): Encoding for the page, Generating in Gemini, Landing video pipeline, Removing the watermark, See also, The agent's checklist, What Gemini outputs, Writing the prompt

### Community 48 - "Isocons"
Cohesion: 0.29
Nodes (7): An icon's panel, Isocons, See also, Styling controls, The catalogue, The exported SVG, Why it fits

### Community 49 - "Its Hover"
Cohesion: 0.29
Nodes (7): Examples, How an icon is built, Its Hover, See also, The library, Using it without React, What it covers

### Community 51 - "or use the loader (stdlib only for the .txt path)"
Cohesion: 0.14
Nodes (13): Attachment text layout (SI vs BL labels), `attachments/` inventory, Bundle contents, class `Inbox` (the only public class), `inbox/` email record schema, loader.py, look at one email + its documents, `__main__` demo (+5 more)

### Community 52 - "File Structure"
Cohesion: 0.18
Nodes (10): Demo Production Tooling Implementation Plan, File Structure, Final Integration Checklist, Global Constraints, Task 1: Create the Workflow-Neutral Capture Contract, Task 2: Add Measured Narration Timing and Minimalist Subtitle Generation, Task 3: Add the Chatterbox Profile, Reference Asset, and Provenance Record, Task 4: Add Assembly, Muxing, and Optional Slide Rendering (+2 more)

## Knowledge Gaps
- **547 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+542 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Monash x Averis Hackathon 2026 opening ceremony transcript` connect `Shipping document verification` to `brief.md`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `SDOC hackathon — Docker server bundle` connect `Shipping document verification` to `brief.md`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `printWidth`, `singleQuote` to the rest of the system?**
  _547 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Markdown style guide` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Codeblocks` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Shipping document verification` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._