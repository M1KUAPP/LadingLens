# Restructure Brief and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `docs/brief.md` to `docs/BRIEF.md`, move `docs/deployment.md` to `docs/references/deployment.md`, update all cross-references across the documentation, update the knowledge graph, and follow the complete branch -> PR -> review -> merge -> delete workflow.

**Architecture:** Standardized documentation taxonomy where root-level specifications use uppercase naming conventions (`BRIEF.md`, `DESIGN.md`, `PRD.md`, `PRODUCT.md`, `TRD.md`) and operational reference materials reside under `docs/references/` alongside other reference documents.

**Tech Stack:** Git, GitHub CLI (`gh`), Markdown, Graphify.

**Spec:** User request: "Rename @[docs/brief.md] to docs/BRIEF.md and move @[docs/deployment.md] to @[docs/references]. Follow this workflow: branch -> research -> plan -> implement -> create small and atomic commits -> push branch -> PR -> code review -> resolve -> (code review -> resolve loop) -> merge -> delete branch."

## Global Constraints

- Preserve all original file contents and semantics in `docs/BRIEF.md` and `docs/references/deployment.md`.
- Maintain surgical precision: only touch files that contain direct path references to the moved documents.
- Keep commits small, atomic, and compliant with Conventional Commits (`@commitlint/config-conventional`).
- Update Graphify knowledge graph (`graphify update .`) following documentation movements.
- Full verification before PR creation and before merging.

---

### Task 1: Rename `docs/brief.md` to `docs/BRIEF.md` and Update References

**Files:**

- Move: `docs/brief.md` -> `docs/BRIEF.md`
- Modify: `docs/PRD.md:224`
- Modify: `docs/research/README.md:62`
- Modify: `docs/research/ideation/demo-spine.md:195`
- Modify: `docs/research/ideation/positioning.md:45`
- Modify: `docs/research/postmortem/cekgu-audit.md:55`
- Modify: `docs/superpowers/plans/2026-09-20-chaosiris-issues.md:21,58,96`

**Interfaces:**

- Consumes: Existing `docs/brief.md`
- Produces: `docs/BRIEF.md` and updated link references across `docs/`

- [x] **Step 1: Move file using git mv**

```bash
git mv docs/brief.md docs/BRIEF.md
```

- [x] **Step 2: Update references in documentation files**

Update references in:

- `docs/PRD.md`: `/docs/brief.md` -> `/docs/BRIEF.md`
- `docs/research/README.md`: `/docs/brief.md` -> `/docs/BRIEF.md`
- `docs/research/ideation/demo-spine.md`: `/docs/brief.md` -> `/docs/BRIEF.md`
- `docs/research/ideation/positioning.md`: `/docs/brief.md` -> `/docs/BRIEF.md`
- `docs/research/postmortem/cekgu-audit.md`: `docs/brief.md` -> `docs/BRIEF.md`
- `docs/superpowers/plans/2026-09-20-chaosiris-issues.md`: `docs/brief.md` -> `docs/BRIEF.md`

- [x] **Step 3: Verify no stale references to `docs/brief.md` remain**

```bash
git grep -n "docs/brief\.md" ':!graphify-out'
```

Expected: No matches outside graphify-out.

- [x] **Step 4: Commit atomic changes for brief rename**

```bash
git add docs/BRIEF.md docs/PRD.md docs/research/ docs/superpowers/plans/2026-09-20-chaosiris-issues.md
git commit -m "docs(brief): rename docs/brief.md to docs/BRIEF.md and update references"
```

---

### Task 2: Move `docs/deployment.md` to `docs/references/deployment.md` and Update References

**Files:**

- Move: `docs/deployment.md` -> `docs/references/deployment.md`
- Modify: `docs/TRD.md:731`
- Modify: `docs/research/ideation/qa-defence.md:486`

**Interfaces:**

- Consumes: Existing `docs/deployment.md`
- Produces: `docs/references/deployment.md` and updated link references

- [x] **Step 1: Move file using git mv**

```bash
git mv docs/deployment.md docs/references/deployment.md
```

- [x] **Step 2: Update references in documentation files**

Update references in:

- `docs/TRD.md`: `docs/deployment.md` -> `docs/references/deployment.md`
- `docs/research/ideation/qa-defence.md`: `/docs/deployment.md` -> `/docs/references/deployment.md`

- [x] **Step 3: Verify no stale references to `docs/deployment.md` remain**

```bash
git grep -n "docs/deployment\.md" ':!graphify-out'
```

Expected: No matches outside graphify-out.

- [x] **Step 4: Commit atomic changes for deployment relocation**

```bash
git add docs/deployment.md docs/references/deployment.md docs/TRD.md docs/research/ideation/qa-defence.md
git commit -m "docs(deployment): move docs/deployment.md to docs/references and update references"
```

---

### Task 3: Update Knowledge Graph with Graphify

**Files:**

- Modify: `graphify-out/`

**Interfaces:**

- Consumes: Restructured documentation files in `docs/`
- Produces: Updated `graphify-out/graph.json` and associated graph artifacts

- [x] **Step 1: Run graphify update**

```bash
graphify update .
```

- [x] **Step 2: Verify graphify updated successfully**

```bash
git status --porcelain graphify-out/
```

Expected: `graphify-out/` shows modified files.

- [x] **Step 3: Commit atomic changes for graph update**

```bash
git add graphify-out/
git commit -m "chore(graphify): update knowledge graph for relocated documentation"
```

---

### Task 4: Push Branch, Create Pull Request, Code Review, Resolve, Merge, and Delete Branch

**Files:**

- Repository branches & GitHub Pull Request

- [x] **Step 1: Push feature branch to origin**

```bash
git push -u origin refactor/docs-brief-and-deployment
```

- [x] **Step 2: Create GitHub Pull Request**

```bash
gh pr create --base main --head refactor/docs-brief-and-deployment --title "docs: rename brief.md to BRIEF.md and move deployment.md to references" --body "..."
```

- [x] **Step 3: Dispatch Code Reviewer Subagent**

Invoke code review subagent evaluating diff between `origin/main` and `HEAD`.

- [x] **Step 4: Review findings and resolve (review-resolve loop)**

Address any issues identified by reviewer. Repeat until approved.

- [ ] **Step 5: Merge Pull Request**

```bash
gh pr merge <PR_NUMBER> --merge --auto (or git checkout main && git merge)
```

- [ ] **Step 6: Clean up feature branch**

```bash
git checkout main
git pull origin main
git branch -d refactor/docs-brief-and-deployment
git push origin --delete refactor/docs-brief-and-deployment
```
