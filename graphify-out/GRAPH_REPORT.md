# Graph Report - averis  (2026-09-19)

## Corpus Check
- 20 files · ~10,152 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .lock 1)

## Summary
- 188 nodes · 170 edges · 22 communities (16 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `464af4d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Markdown style guide
- package.json
- Links
- Codeblocks
- Andrej Karpathy Skills
- Shipping document verification
- Rules and regulations
- .prettierrc.json
- Shipping document verification
- graphify.md
- rtk.md
- skills.md
- Averis x Monash Hackathon 2026
- Event timeline
- Averis x Monash Hackathon 2026 participant handbook
- Timeline
- Submission procedure
- Monash x Averis Hackathon 2026 opening ceremony
- Problem statement and datasets Drive folder

## God Nodes (most connected - your core abstractions)
1. `Markdown style guide` - 15 edges
2. `Rules and regulations` - 10 edges
3. `Event timeline` - 9 edges
4. `Timeline` - 9 edges
5. `Averis x Monash Hackathon 2026` - 7 edges
6. `Averis x Monash Hackathon 2026 participant handbook` - 7 edges
7. `Headings` - 6 edges
8. `Shipping document verification` - 6 edges
9. `Frequently asked questions` - 6 edges
10. `Shipping document verification` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "Markdown style guide"
Cohesion: 0.08
Nodes (23): Add spacing to headings, ATX-style headings, Better is better than best, Capitalization, Capitalization of titles and headers, Character line limit, Document layout, Exceptions (+15 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, lint-staged, scripts (+9 more)

### Community 2 - "Links"
Cohesion: 0.25
Nodes (8): Avoid relative paths unless within the same directory, Define reference links after their first use, Links, Reference links, Use explicit paths for links within Markdown, Use informative Markdown link titles, Use reference links for long links, Use reference links to reduce duplication

### Community 3 - "Codeblocks"
Cohesion: 0.25
Nodes (8): Code, Codeblocks, Declare the language, Escape newlines, Inline, Nest codeblocks within lists, Use code span for escaping, Use fenced code blocks instead of indented code blocks

### Community 4 - "Andrej Karpathy Skills"
Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 5 - "Shipping document verification"
Cohesion: 0.12
Nodes (16): Advanced stage, Context and problem overview, Evaluating your own output, Example comparison, Expected result and extensions, Formatting your output for the self-evaluation, How to run it, How to use the result (+8 more)

### Community 6 - "Rules and regulations"
Cohesion: 0.12
Nodes (16): AI usage requirement, Awards, Data protection and privacy, Data sharing and consent, Eligibility, Evaluation criteria distribution, Final round criteria, Intellectual property (+8 more)

### Community 7 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "Shipping document verification"
Cohesion: 0.12
Nodes (16): Advanced stage, Context and problem overview, Evaluating your own output, Example comparison, Expected result and extensions, Formatting your output for the self-evaluation, How to run it, How to use the result (+8 more)

### Community 15 - "Averis x Monash Hackathon 2026"
Cohesion: 0.14
Nodes (13): Are there prizes?, Averis x Monash Hackathon 2026, Community and socials, Contact us, Do I need to know how to code?, Frequently asked questions, How are submissions judged?, Scoring rubric breakdown (+5 more)

### Community 16 - "Event timeline"
Cohesion: 0.20
Nodes (9): Build period, Event timeline, Final pitch day, Judging period, Opening ceremony, Registration closes, Registration opens, Results announced (+1 more)

### Community 17 - "Averis x Monash Hackathon 2026 participant handbook"
Cohesion: 0.20
Nodes (9): Averis x Monash Hackathon 2026 participant handbook, Conclusion, Event timeline, Introduction, Key dates, Prizes and awards, Problem statement, Submission (+1 more)

### Community 18 - "Timeline"
Cohesion: 0.22
Nodes (9): Build period, Final pitch day, Judging period, Timeline, Opening ceremony, Registration closes, Registration opens, Results announced (+1 more)

### Community 19 - "Submission procedure"
Cohesion: 0.33
Nodes (6): Google Forms submission structure, Mandatory submission components, Part 1: Team details, Part 2: Project details, Submission details, Submission procedure

### Community 20 - "Monash x Averis Hackathon 2026 opening ceremony"
Cohesion: 0.40
Nodes (4): Broadcast details, Monash x Averis Hackathon 2026 opening ceremony, Transcript, Video recording

### Community 21 - "Problem statement and datasets Drive folder"
Cohesion: 0.50
Nodes (3): File descriptions, Folder files, Problem statement and datasets Drive folder

## Knowledge Gaps
- **131 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 147 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Markdown style guide` connect `Markdown style guide` to `Links`, `Codeblocks`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Links` connect `Links` to `Markdown style guide`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Code` connect `Codeblocks` to `Markdown style guide`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `printWidth`, `singleQuote` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Markdown style guide` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Shipping document verification` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._