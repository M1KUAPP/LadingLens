# Research

Working notes that feed the product and design decisions: reference material,
concept exploration, and what we learned from the last hackathon. Nothing here
is a specification. The specs are [PRODUCT.md](/docs/PRODUCT.md),
[PRD.md](/docs/PRD.md), [TRD.md](/docs/TRD.md) and
[DESIGN.md](/docs/DESIGN.md); research feeds them and then stops mattering.

Contents:

1.  [What Lives Here](#what-lives-here)
1.  [The Publishability Rule](#the-publishability-rule)
1.  [Scratch](#scratch)

## What Lives Here

| Directory     | Holds                                                           |
| ------------- | --------------------------------------------------------------- |
| `build/`      | Primary-source notes behind implementation decisions            |
| `design/`     | Visual reference suite: sites, icon sets, motion, video tooling |
| `ideation/`   | Concept exploration and differentiation work for this build     |
| `postmortem/` | What the MUBA 2026 entry lacked, audited against the winner     |

## The Publishability Rule

This repository goes public for judging, so **everything in `docs/research/`
is written to be read by a judge**. That is deliberate, not a constraint:
"Problem Statement Understanding" and "Innovation & Solution Approach" are 20
of the 100 preliminary points, and a reviewer who can see how the concept was
chosen has evidence for both.

Removing a file before submission does not unpublish it. `git rm` deletes it
from the working tree and leaves every byte in the history, reachable through
`git log -p` and the commit view on GitHub. Rewriting history to excise it
breaks every clone and every deployed image tag. So the decision about whether
a document can be public is made **before the first commit that contains it**,
not before submission.

Two consequences:

- A document that reflects well on the work stays, and gets polished rather
  than deleted. Prune for staleness, not for secrecy.
- A document that must not be public never enters git at all. It goes in
  [`scratch/`](#scratch).

## Scratch

`docs/research/scratch/` is untracked, listed in `.gitignore`, and is the only
place in this repository where uncommitted working material belongs. Use it
for anything whose disclosure would be a problem, and assume everything
outside it is permanent and public.

Two categories must never leave `scratch/`, and must never be committed in any
form, including summaries, counts, or derived tables:

- The organisers' answer key, and anything computed from reading it. The
  reasoning is in [evaluation.md](/docs/evaluation.md); the short version is
  that the blind set stays blind and our scoring goes through `POST /submit`.
- Notes about other teams that we would not say to their faces.

## See Also

- [Hackathon brief](/docs/BRIEF.md) — rules, rubric, dates and dataset.
- [Markdown style guide](/docs/references/markdown-style.md).
