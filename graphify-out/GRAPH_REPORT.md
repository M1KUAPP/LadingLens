# Graph Report - averis (2026-09-18)

## Corpus Check

- 12 files · ~4,542 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .lock 1)

## Summary

- 78 nodes · 68 edges · 15 communities (9 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- Markdown style guide
- package.json
- Links
- Codeblocks
- Andrej Karpathy Skills
- Headings
- devDependencies
- .prettierrc.json
- Lists
- graphify.md
- rtk.md
- skills.md

## God Nodes (most connected - your core abstractions)

1. `Markdown style guide` - 15 edges
2. `Headings` - 6 edges
3. `Andrej Karpathy Skills` - 5 edges
4. `Codeblocks` - 5 edges
5. `Links` - 5 edges
6. `scripts` - 4 edges
7. `Code` - 4 edges
8. `Reference links` - 4 edges
9. `Table of contents` - 3 edges
10. `Lists` - 3 edges

## Surprising Connections (you probably didn't know these)

- None detected - all connections are within the same source files.

## Import Cycles

- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "Markdown style guide"

Cohesion: 0.13
Nodes (14): Better is better than best, Capitalization, Character line limit, Document layout, Exceptions, Images, Markdown style guide, Minimum viable documentation (+6 more)

### Community 1 - "package.json"

Cohesion: 0.18
Nodes (10): lint-staged, scripts, lint, lint:fix, prepare, @commitlint/cli, @commitlint/config-conventional, husky (+2 more)

### Community 2 - "Links"

Cohesion: 0.25
Nodes (8): Avoid relative paths unless within the same directory, Define reference links after their first use, Links, Reference links, Use explicit paths for links within Markdown, Use informative Markdown link titles, Use reference links for long links, Use reference links to reduce duplication

### Community 3 - "Codeblocks"

Cohesion: 0.25
Nodes (8): Code, Codeblocks, Declare the language, Escape newlines, Inline, Nest codeblocks within lists, Use code span for escaping, Use fenced code blocks instead of indented code blocks

### Community 4 - "Andrej Karpathy Skills"

Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 5 - "Headings"

Cohesion: 0.33
Nodes (6): Add spacing to headings, ATX-style headings, Capitalization of titles and headers, Headings, Use a single H1 heading, Use unique, complete names for headings

### Community 6 - "devDependencies"

Cohesion: 0.33
Nodes (6): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier

### Community 7 - ".prettierrc.json"

Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 8 - "Lists"

Cohesion: 0.67
Nodes (3): Lists, Nested list spacing, Use lazy numbering for long lists

## Knowledge Gaps

- **56 isolated node(s):** `$schema`, `printWidth`, `singleQuote`, `semi`, `trailingComma` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 64 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Markdown style guide` connect `Markdown style guide` to `Lists`, `Links`, `Codeblocks`, `Headings`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `Links` connect `Links` to `Markdown style guide`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `Code` connect `Codeblocks` to `Markdown style guide`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `$schema`, `printWidth`, `singleQuote` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Markdown style guide` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
