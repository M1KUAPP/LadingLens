# Issue 77 Isolated Document-Role Decisions Implementation Plan

**Goal:** `/judge` (and every live pipeline run) classifies an SI and a
draft BL correctly, so a valid pair is admitted and compared.

**Architecture:** `JevDocumentRoleClient.decide` asks one pinned
`jev-1.13.0` question per document, with a `state` holding only that
document; results keep input order. The fix landed on `main` as `a8af310`
(one document per request, sequential calls) while this plan was in
flight, so this branch keeps that implementation and adds the research
record and the benchmark's per-document request ids.

**Spec:** GitHub issue #77; research
`docs/research/build/live-document-roles.md`.

## Global Constraints

- The decision stays content-only: no file names, no upload slots.
- Pinned model, `RetryPolicy(max_retries=0)`, the existing response
  validation, and the existing `JevRoleDecision` shape are unchanged.
- One provider failure fails the whole decision, as today.

### Task 1: One question per document

Tests (fake SystemOne client recording each `run`): two documents produce
two calls whose `state.documents` each hold exactly one document and whose
questions name only that document; results come back in input order; the
calls overlap (both in flight before either returns); a provider failure
on either call raises `JevProviderFailure`. Implement with an
`asyncio.TaskGroup` over per-document `_call_batch` calls, bounded by the
existing maximum batch size. Commit `fix(api): ask Jev about each document on its own`.

### Task 2: Live verification

Re-run the three-call probe from the research note through the fixed client
and record the answers in the PR.
