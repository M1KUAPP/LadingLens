# Graph Report - averis (2026-09-20)

## Corpus Check

- 67 files · ~63,818 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 10, .lock 3, .example 1)

## Summary

- 683 nodes · 703 edges · 48 communities (38 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `90e96930`
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
- Human Escalation Policy and Refusal Interface
- Shipping document verification
- Timeline
- Averis x Monash Hackathon 2026 participant handbook
- get_settings
- web/package.json
- Design
- Jev Decision Layer
- Tech Stack
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
- Hugeicons
- .oxlintrc.json
- Research
- tsconfig.json
- gcp-setup.sh
- averis-api
- or use the loader (stdlib only for the .txt path)
- Jakub Antalik
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- .get_response
- Event timeline

## God Nodes (most connected - your core abstractions)

1. `Monash x Averis Hackathon 2026 opening ceremony transcript` - 27 edges
2. `compilerOptions` - 18 edges
3. `Design` - 16 edges
4. `compilerOptions` - 15 edges
5. `Markdown style guide` - 15 edges
6. `The Stakes of One Missed Document-Checking Email` - 14 edges
7. `get_settings()` - 12 edges
8. `Jakub Krehel's interface skills` - 12 edges
9. `Rules & Regulations` - 12 edges
10. `SDOC hackathon — Docker server bundle` - 12 edges

## Surprising Connections (you probably didn't know these)

- `get_engine()` --calls--> `get_settings()` [EXTRACTED]
  apps/api/app/db.py → apps/api/app/config.py
- `_clients()` --calls--> `get_settings()` [EXTRACTED]
  apps/api/app/gemini.py → apps/api/app/config.py
- `generate()` --calls--> `get_settings()` [EXTRACTED]
  apps/api/app/gemini.py → apps/api/app/config.py
- `health()` --calls--> `get_settings()` [EXTRACTED]
  apps/api/app/main.py → apps/api/app/config.py
- `ready()` --calls--> `get_settings()` [EXTRACTED]
  apps/api/app/main.py → apps/api/app/config.py

## Import Cycles

- None detected.

## Communities (48 total, 6 thin omitted)

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

Cohesion: 0.05
Nodes (33): Evaluation criteria distribution — final round, Evaluation criteria distribution — preliminary round, Judging criteria, File descriptions, Folder files, Problem statement and datasets Drive folder, 00:00 Pre-show setup, 09:09 Waiting room (+25 more)

### Community 6 - "Rules & Regulations"

Cohesion: 0.08
Nodes (23): AI Usage Requirement, Averis x Monash Hackathon Rules and Regulations, Awards, Data Protection and Privacy, Data Sharing and Consent, Eligibility, Evaluation Criteria Breakdown for Final Round, Evaluation Criteria Breakdown for Preliminary Round (+15 more)

### Community 7 - ".prettierrc.json"

Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "SDOC hackathon — Docker server bundle"

Cohesion: 0.09
Nodes (23): A. Static bundle (hand this to participants), B. Docker server (`docker compose`), Bundle tooling (server/), data_v2/README.md, docker-compose.yml, docker/README.md, End-to-end — the headline metric (`score_end_to_end`), Enums (+15 more)

### Community 14 - "Human Escalation Policy and Refusal Interface"

Cohesion: 0.12
Nodes (16): Decision Thresholds and Operating Bands, Empirical Jev Calibration and Probability Distribution, Executive Summary, Human Escalation Policy and Refusal Interface, Interactive Mode vs. Batch Submission Mode, Judge Experience and On-Screen Presentation, Mapping Signals to Review Reasons, Observations (+8 more)

### Community 15 - "Shipping document verification"

Cohesion: 0.14
Nodes (13): Advanced stage, Context, Evaluating your own output, Expected result and extensions, Formatting your output for the self-evaluation, How to use the result, Shipping document verification, The loader (+5 more)

### Community 16 - "Timeline"

Cohesion: 0.09
Nodes (22): Are there prizes?, Averis x Monash Hackathon 2026, Build period, Community and socials, Contact us, Do I need to know how to code?, Final pitch day, Frequently asked questions (+14 more)

### Community 17 - "Averis x Monash Hackathon 2026 participant handbook"

Cohesion: 0.20
Nodes (9): Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates, Prizes and awards, Problem statement, Submission (+1 more)

### Community 18 - "get_settings"

Cohesion: 0.09
Nodes (29): get_settings(), Settings, get_engine(), get_session(), Convert a postgres:// URL (e.g. from Neon) to an asyncpg DSN. asyncpg rejects…, _to_asyncpg_dsn(), _clients(), generate() (+21 more)

### Community 19 - "web/package.json"

Cohesion: 0.06
Nodes (31): dependencies, react, react-dom, devDependencies, oxlint, @types/node, @types/react, @types/react-dom (+23 more)

### Community 20 - "Design"

Cohesion: 0.08
Nodes (24): Acceptance, Accessibility, App Layout, Colour, Dark Mode, Decisions, Design, Do And Do Not (+16 more)

### Community 21 - "Jev Decision Layer"

Cohesion: 0.09
Nodes (23): Asking Questions, Batching Questions in One Request, Choice, Documented Patterns, Endpoint and Authentication, Errors and Status Codes, How Averis Uses Jev, HTTP API (+15 more)

### Community 22 - "Tech Stack"

Cohesion: 0.09
Nodes (17): API Keys, Cost Guardrails, Deployment, How Deploys Work, Resource Names, Running Locally, Product Requirements, Product (+9 more)

### Community 23 - "Field Provenance Across Attachment Formats"

Cohesion: 0.06
Nodes (33): Caching and Precomputation Recommendations, Comparison of Extraction Strategies, Decision Layer Latency Benchmarks, Dual-Document Extraction in a Single Request, End-to-End Latency Profile, Executive Summary, Extraction Latency Benchmarks, Live Demo Feasibility Verdict (+25 more)

### Community 24 - "compilerOptions"

Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 25 - "Hackathon Brief"

Cohesion: 0.11
Nodes (19): At a Glance, Hackathon Brief, Judging, Key Dates, Loading the Data, Q&A Highlights, Rules That Matter, Sources (+11 more)

### Community 26 - "compilerOptions"

Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 27 - "The Stakes of One Missed Document-Checking Email"

Cohesion: 0.13
Nodes (14): Business Effects Beyond the Penalty, Candidate Opening Line, Conclusion, Evidence Strength and Safe Claims, Five Supporting Data Points, Issue 12 Q&A Stress Test, Limits of the Evidence, Second-Gate Decision Rule (+6 more)

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

### Community 33 - "Hugeicons"

Cohesion: 0.25
Nodes (8): An icon's page, Browsing and search, For agents, Getting icons without an account, Hugeicons, See also, The free style, Why it fits

### Community 34 - ".oxlintrc.json"

Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 35 - "Research"

Cohesion: 0.33
Nodes (5): Research, Scratch, See Also, The Publishability Rule, What Lives Here

### Community 40 - "or use the loader (stdlib only for the .txt path)"

Cohesion: 0.14
Nodes (13): Attachment text layout (SI vs BL labels), `attachments/` inventory, Bundle contents, class `Inbox` (the only public class), `inbox/` email record schema, loader.py, look at one email + its documents, `__main__` demo (+5 more)

### Community 41 - "Jakub Antalik"

Cohesion: 0.22
Nodes (9): Jakub Antalik, Libraries.dev, See also, Selected work, The customisation panel, The drawer, The page, Transitions.dev (+1 more)

### Community 42 - "Iconsax"

Cohesion: 0.25
Nodes (8): An icon's panel, Browsing and configuring, Free against Pro, Iconsax, See also, The free set, Where the browser lives, Why it is the alternative

### Community 43 - "Landing video pipeline"

Cohesion: 0.25
Nodes (8): Encoding for the page, Generating in Gemini, Landing video pipeline, Removing the watermark, See also, The agent's checklist, What Gemini outputs, Writing the prompt

### Community 44 - "Isocons"

Cohesion: 0.29
Nodes (7): An icon's panel, Isocons, See also, Styling controls, The catalogue, The exported SVG, Why it fits

### Community 45 - "Its Hover"

Cohesion: 0.29
Nodes (7): Examples, How an icon is built, Its Hover, See also, The library, Using it without React, What it covers

### Community 46 - ".get_response"

Cohesion: 0.40
Nodes (5): Static files with fallback to index.html for client-side routes., SPAStaticFiles, Response, Scope, StaticFiles

### Community 47 - "Event timeline"

Cohesion: 0.22
Nodes (9): Build period, Event timeline, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced (+1 more)

## Knowledge Gaps

- **477 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+472 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 508 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Technical Requirements` connect `Tech Stack` to `Jev Decision Layer`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Design` connect `Design` to `Tech Stack`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `$schema`, `printWidth`, `singleQuote` to the rest of the system?**
  _477 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Markdown style guide` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `MUBA Postmortem` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Monash x Averis Hackathon 2026 opening ceremony transcript` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
