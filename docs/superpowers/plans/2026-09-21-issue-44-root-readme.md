# Issue 44 Root README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A root `README.md` that meets issue #44's remaining README
criterion. It follows the team's README template, uses `[SCREENSHOT]`
placeholders that a follow-up issue fills, and has an Archify architecture
diagram in the LadingLens design-system palette.

**Architecture:** The README follows the template's section order and
anchors. The diagram's source is an Archify JSON specification. A small
export script gives Archify's delivered HTML the `docs/DESIGN.md` tokens
and fonts, then saves light and dark PNGs through the viewer's own PNG
export. The README shows them with a `<picture>` element.

**Tech Stack:** GitHub-flavoured Markdown with the template's inline HTML;
Archify 2.17 (`tt-a1i/archify`, installed locally, not vendored); Playwright
Chromium from `apps/web`'s dev dependencies; shields.io; contrib.rocks.

**Spec:** GitHub issue #44 (its README criteria and the `chaosiris`
reopening comment); the README template (sections: banner, name,
description, header links, badges, About The Project, Screenshots, How It
Works, Features, Architecture, Tech Stack, Getting Started, Prerequisites,
Installation, Roadmap, Team, License, Acknowledgments); research
`docs/research/build/root-readme.md`.

## Global Constraints

- `docs/references/markdown-style.md` does not apply to `README.md`; the
  user said so. The template's HTML blocks, `<details>` table of contents
  and back-to-top links stay as the template has them.
- Every screenshot slot is the literal text `[SCREENSHOT]`. This change
  adds no screenshot image. A follow-up issue lists every slot and what to
  capture.
- Facts come only from the research note and the documents it cites. A
  latency figure may appear only from the retained artifact
  `apps/api/scripts/benchmark-results/20260921T085704Z-4eb1401.json`,
  including its verdict that the 10-second target is not met. Never cite
  the historical Flash-Lite study, and never claim sub-10-second latency.
- Decision ownership, in meaning:
  - Gemini 3.5 Flash extracts only scanned or locally ambiguous documents.
  - Pinned `jev-1.13.0` makes the typed decisions: email category,
    document role and textual equivalence.
  - Deterministic Python owns parsing, normalisation, numbers, schema,
    state and persistence.
  - A named human owns consequential dispositions.
- Say plainly what is prepared (the seed baseline) and what is live
  (`/judge` uploads), and that the deployment is synthetic-data-only.
- Name environment variables only; never show a value that could be a
  secret.
- Repository files use relative links. The live service uses absolute
  URLs. The repository is `Averis-T010NG/LadingLens`.
- Verify the setup commands against this clean checkout and record the
  result in the pull request.

### Task 1: Architecture diagram source

**Files:**

- Create: `docs/readme/architecture.json`

Author an Archify `architecture` specification (`schema_version: 1`) with
`meta.quality_profile: "showcase"`, no `visual_preset`, no `subtitle`, and
at most 12 primary nodes. The main path runs from the browser through the
Cloud Run service to PostgreSQL. Short side branches reach Cloud Storage,
Gemini, Jev, Secret Manager and the deploy chain (GitHub Actions to
Artifact Registry to Cloud Run, with the migrate job). The nodes, edges
and boundary come from the research note's "Architecture diagram inputs":

- The GCP project boundary wraps the Cloud Run service, Cloud Storage,
  Secret Manager, Artifact Registry and the migrate job.
- PostgreSQL, both AI providers and GitHub Actions sit outside it.

Ruling during implementation: the migrate job was dropped from the
diagram. Its routes to Artifact Registry and PostgreSQL crossed other
nodes, and the viewer overflowed a 1440×900 screen. The README's
Architecture text describes the migration job instead.

- [ ] Write the specification.
- [ ] Run
      `node <archify>/bin/archify.mjs validate architecture docs/readme/architecture.json --quality showcase --json`.
      Expected: all 9 artifact checks pass, with 0 composition errors and
      0 warnings. Repair only the diagnosed subject until it passes.
- [ ] Run `deliver` into the scratchpad and `visual-check` the delivered
      HTML.
- [ ] Commit: `docs(readme): add the Archify architecture diagram source`.

### Task 2: Export in the LadingLens palette

**Files:**

- Create: `docs/readme/export-architecture.mjs`
- Create: `docs/readme/architecture-light.png`,
  `docs/readme/architecture-dark.png`

The script takes the delivered Archify HTML and inserts a stylesheet that
redefines Archify's theme variables for `[data-theme="light"]` and
`[data-theme="dark"]` from `docs/DESIGN.md`:

- Background and mask come from `surface/canvas`, the grid from
  `surface/sunken`, and panels from `surface/raised` with `border/default`.
- Text comes from `text/primary`, `text/secondary` and `text/tertiary`,
  and arrows from `text/tertiary`.
- The emphasis arrow is `brand/teal`, frontend is `brand/primary`, backend
  is `brand/teal`, and security is `brand/orange`.
- Data stores and managed services use the slate neutrals.

It sets Archivo on diagram text and appends Archivo's `@font-face` to
`#archify-fonts` as a `data:` URI from `@fontsource-variable/archivo`. That
is where Archify's export reads fonts from.

For each colour scheme, the script opens the page in Playwright Chromium,
loaded from `apps/web`'s `node_modules` the way
`docs/verification/issue-41/capture.mjs` does. It clicks `#btn-export`,
then `[data-format="png"]`. It halves the 4× export to 2× in the browser
and writes the PNG. The script's header gives the two regeneration
commands.

- [ ] Write the script and run it.
- [ ] Open both PNGs. Labels must be legible, with no clipped text, and
      both themes must use the palette.
- [ ] Commit: `docs(readme): export the architecture diagram in the
  LadingLens palette`.

### Task 3: README

**Files:**

- Create: `README.md`

Follow the template section by section:

- **Header.** A banner in a `<picture>` element: `docs/brand/lockup-dark.svg`
  for dark, `docs/brand/lockup-colour.svg` by default. Then
  `<h3>LadingLens</h3>` and the one-line description.
- **Header links.** "Live Demo »" goes to the Cloud Run URL. Then "Judge
  Mode" (`/judge`) and "Demo Runbook" (`docs/demo-runbook.md`).
- **Badges.** Reference-style shields.io `for-the-badge` badges:
  - React, TypeScript, Vite, Bun
  - Python, FastAPI, PostgreSQL
  - Gemini, TypeSafe Jev (label only, with no logo)
  - Cloud Run (`googlecloud` logo), Docker, GitHub Actions
- **About The Project.** The problem, the two gates and evidence
  comparison, human sign-off, the hackathon context, and limitations:
  synthetic data only, guest-only entry, the live-path latency verdict,
  and fail-closed provider errors with a labelled prepared fallback.
- **Screenshots.** A two-column table of `[SCREENSHOT]` cells: Landing,
  Inbox, Case evidence, Review queue, Control graph, Evaluation.
- **How It Works.** Numbered steps, each with a `[SCREENSHOT]` where
  named:
  1. Guest entry (`/auth`), with a screenshot.
  2. Gate 1 triage.
  3. Evidence comparison, with a screenshot.
  4. Human sign-off, with a screenshot.
  5. Gate 2 reconciliation, with a screenshot.
  6. Judge mode (`/judge`), with a screenshot.
  7. Reset All (`/settings`), with a screenshot.
- **Features.** Only the shipped features the research note verifies.
- **Architecture.**
  - The diagram, as a light/dark `<picture>` with alt text.
  - A decision-ownership table.
  - Links to `docs/architecture.md`, `docs/ai.md`, `docs/cloud.md` and
    `docs/references/api.md`.
- **Tech Stack.** Frontend, backend, AI, data, cloud and tooling, with
  pinned versions where the manifests pin them.
- **Getting Started.**
  - Prerequisites: uv, Bun, PostgreSQL 16 (with a `postgres:16`
    `docker run` line), and Docker for the full image.
  - Installation: clone, backend, migrate, frontend, full container,
    and tests. Say that the seed baseline loads at startup, and give
    the command that regenerates it. Add the environment-variable table
    (names only), and link `docs/demo-runbook.md` for the full
    walkthrough.
- **Roadmap.** Open issues for `Averis-T010NG/LadingLens`.
- **Team.** contrib.rocks for `Averis-T010NG/LadingLens`.
- **License.** MIT, plus third-party notices with the PyMuPDF AGPL-3.0
  note.
- **Acknowledgments.** shields.io, contrib.rocks, Archify, the hackathon
  organisers (MUMTEC, GDG on Campus, Averis), Google Gemini, TypeSafe and
  Hugeicons.

- [ ] Write the README.
- [ ] Check every relative link and image path exists. Check every
      table-of-contents anchor matches a heading. Check every badge URL
      returns 200.
- [ ] Render through `gh api markdown` with `mode=gfm` and confirm that
      `picture`, `details` and `align` survive.
- [ ] Commit: `docs: add the root README`.

### Task 4: Verify the setup against a clean checkout

- [ ] In this worktree, follow the README exactly against a scratch
      database:
  - `uv sync`, then `alembic upgrade head`
  - `uvicorn`, then `GET /api/health` and `/api/health/ready`
  - `bun install` and `bun run dev`, then the dev server answers
  - `docker build` of the root Dockerfile
- [ ] Fix any README step that fails or needs insider knowledge, and
      record the results for the pull request.

### Task 5: Screenshots issue and graph

- [ ] Create an unassigned issue listing every `[SCREENSHOT]` slot. For
      each, give the route, the state to capture, the target file under
      `docs/readme/screenshots/`, and the capture size. Explain how to
      swap a slot for a light/dark `<picture>`. Use the labels
      `documentation`, `prelims`, `area:design`, `priority:p1` and
      `phase:submit`, and the milestone "Prelims submission".
- [ ] Run `graphify update .` and commit
      `chore(graphify): refresh the knowledge graph`.
