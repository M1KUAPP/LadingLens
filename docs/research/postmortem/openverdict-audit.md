# OpenVerdict audit

OpenVerdict is a decentralized adversarial AI jury protocol for factual
disputes, settled on Sui as immutable resolution certificates. This audit
reconstructs what the winning submission shipped, what an outsider can
recompute, and what could not be faked over a weekend.

## What shipped

| Surface                        | What it does                                                                                                                                                                                                                                                         | How an outsider reaches it                                                                                                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app (Next.js 16, React 19) | Landing page plus read-only console: claim board, live claim view with Chat/Graph toggle, jury roster and staking, browser verifier, submission desk, status page                                                                                                    | `https://openverdict.info` (landing), `https://app.openverdict.info` (`/claims`, `/verify`, `/agents`, `/fact-check`, `/status`); code in `app/`, `components/`                                                                                                                               |
| Public API                     | Open GET routes for claims, reports, run proofs, SSE event streams, agents, weather and gateway receipts; guarded public writes (`extract-claim`, `fact-checks`, `reexecute`, stake prepare/confirm)                                                                 | `curl https://app.openverdict.info/api/claims`; full reference in `docs/API.md`; handlers under `app/api/`                                                                                                                                                                                    |
| Public CLI `ov`                | The whole journey with no API key, wallet or database: `weather`, `board`, `agents`, `agent`, `extract`, `submit`, `status`, `watch`, `audit`, `trace`                                                                                                               | `git clone` + `pnpm install`, then `pnpm ov weather`; entry `scripts/ov.ts`, implementation `lib/ov/`                                                                                                                                                                                         |
| Operator CLI                   | Claim inspection, registry roster and diversity, agent republish and eligibility, fact-check start                                                                                                                                                                   | `pnpm cli -- --help`; `cli/src/index.ts` (commander); needs the operator key, so not a public surface                                                                                                                                                                                         |
| Agent skill                    | Whole-app navigation contract in the open Agent Skills format, with `references/` and two launchers that run the repository's own auditor and CLI                                                                                                                    | `npx skills add Marcussy34/OpenVerdict`, or fetch `https://app.openverdict.info/SKILL.md` (served from `skills/openverdict/SKILL.md` at request time by `app/SKILL.md/route.ts` via `lib/skill/files.ts`); symlinked into `.claude/skills/openverdict-audit` and `.agents/skills/openverdict` |
| Docs site                      | 14 technical pages generated from `docs/site/` Markdown at request time: trust model, audit guide, contracts, limits, cost, staking, glossary                                                                                                                        | `https://docs.openverdict.info`; route `app/docs/[[...slug]]/page.tsx`; same deployment as the app                                                                                                                                                                                            |
| On-chain contracts             | Eight Move modules (`agent_registry`, `claim`, `evidence`, `jury`, `settlement`, `demo_fact_checker`, `demo_binary_pool`, `display_meta`) plus the Seal policy `openverdict_seal::reveal_lock`; draw, commit-reveal, certificates and payout tickets enforced on Sui | Objects on SuiVision/Suiscan; current testnet package `0xee51ceb6...`, original `0xa9f3c2db...` (`docs/site/proof.md`); sources in `move/openverdict/`, `move/openverdict_seal/`                                                                                                              |
| Workers                        | Evidence, inference and resolution loops that drive live claims and relaunch voided attempts                                                                                                                                                                         | Not directly reachable; they run inside the one Railway container launched by `scripts/start-production.mjs`; their output is the public event stream at `GET /api/claims/<id>/events`                                                                                                        |
| `llms.txt`                     | Machine-readable audit recipe: the read routes, the third-party sources, the three recomputations                                                                                                                                                                    | `https://app.openverdict.info/llms.txt`; `public/llms.txt`                                                                                                                                                                                                                                    |

## Build metrics

All numbers computed with real commands in a clean read-only checkout.
Commit counts use committer dates in +0800, the repository's own timezone.

| Metric                            | Value                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total commits                     | 649 (`git rev-list --count HEAD`; 0 merges, one author)                                                                                                                              |
| Commits on or before 2026-09-05   | 643 (`git rev-list --count --until="2026-09-05T23:59:59+08:00" HEAD`)                                                                                                                |
| Commits on or before 2026-09-06   | 648 (`git rev-list --count --until="2026-09-06T23:59:59+08:00" HEAD`)                                                                                                                |
| First commit                      | 2026-08-26 23:16 +0800, `26c99eb` "docs: add OpenVerdict product specification"                                                                                                      |
| Last commit                       | 2026-09-12 12:08 +0800, `49db87b` (README screenshots)                                                                                                                               |
| Source files, `lib/`              | 218 files total, 200 `.ts`/`.tsx`                                                                                                                                                    |
| Source files, `app/`              | 53 files total, 51 `.ts`/`.tsx`                                                                                                                                                      |
| Source files, `cli/`              | 7 files total, 6 `.ts` + `bin.mjs`                                                                                                                                                   |
| Source files, `workers/`          | 8 files total, 7 `.ts` + `workers/README.md`                                                                                                                                         |
| Source files, `move/`             | 24 files total, 18 `.move` (9 sources, 9 test modules)                                                                                                                               |
| TypeScript lines, excluding tests | 78,961 across 298 `.ts`/`.tsx` files repo-wide (`find -name '*.ts' -o -name '*.tsx'`, minus `*.test.*`)                                                                              |
| Test code lines                   | 32,928 total: 28,738 TypeScript (90 `*.test.ts`) + 4,190 Move (9 `*_tests.move`)                                                                                                     |
| Test files                        | 99 (90 vitest files + 9 Move test modules)                                                                                                                                           |
| Vitest test cases                 | 1,034 `it()`/`test()` declarations plus 25 `it.each` sites; `README.md` and `docs/STATUS.md` claim 996, and `docs/site/limits.md` discloses that test counts drift between documents |
| Move test functions               | 105 test declarations (`grep -rE "^\s*#\[test(\]\|,)" move/`): 60 bare `#[test]` plus 45 `#[test, expected_failure(...)]`; the docs claim 93, same disclosed drift                   |
| Markdown documentation            | 1,252,030 bytes across 47 `.md` files repo-wide; `docs/` alone is 1,046,445 bytes across 40 files                                                                                    |
| Root `README.md`                  | 41,918 bytes                                                                                                                                                                         |

## The verifiable artifact

**What can be recomputed, and by what command.** Three recomputations decide
whether a claim's public record is intact, spelled out for HTTP-only readers
in `public/llms.txt` and `docs/site/audit-guide.md`:

1.  Vote commitment: `blake2b256(BCS(VotePreimageV1 {...}))`, implemented as
    `computeVoteCommitment` in `lib/protocol/commitment.ts` over the BCS
    layout `VotePreimageV1Bcs` in `lib/protocol/bcs.ts`, and it must equal
    the hash Sui stored before the reveal.
2.  Run hash: `blake2b256(BCS(RunRecordV1 {...}))` (`RunRecordV1Bcs` in
    `lib/protocol/bcs.ts`), recomputed in `recomputeRunProof`
    (`lib/verify/run-proof.ts:342`), and it must equal the run hash in the
    `RunApproval` on Sui.
3.  Truth score: `(sum + floor(N/2)) / N` over valid final-round reveals, in
    `computeTruthScoreBps` (`lib/protocol/truthScore.ts`), and it must equal
    the certificate's `truth_score_bps`; the evidence Merkle root is also
    rebuilt from the Walrus manifest (`buildEvidenceManifest` in
    `lib/evidence/manifest.ts`).

The command is `pnpm ov audit <claim id or link>` (or `pnpm audit:claim`),
which runs `lib/audit/audit-claim.ts`. It reads only public sources — the
app's API, Sui JSON-RPC, the Walrus aggregator and GonkaRouter's public
receipts — with no key, wallet or database.

The same recomputation runs in the browser at `/verify` (15 run-level
checks) with no install at all (`README.md`).

**What the auditor checks, and how many.** The checks are enumerable in
`lib/audit/audit-claim.ts` and itemized with expected/actual values in
`docs/site/trust-model.md`:

- `C1`–`C3` per seat per phase: the on-chain commitment equals the record,
  the commitment recomputes from the reveal's own transaction inputs, the
  reveal matches the report.
- `R1`–`R18` per revealed run: `R1`–`R15` come from `recomputeRunProof`
  (prompt, policy, system prompt, input, output and transcript hashes,
  citations, challenge search, both sides opened, citation sites,
  counter-evidence, opens per turn, run hash, Seal escrow, sealed core);
  `R16`–`R18` add on-chain approval, the provider's own receipt and Walrus
  reachability.
- `S1`–`S5` per claim: score recomputed, certificate on Sui, quorum rule,
  evidence root and manifest per phase (`S4` emits two rows), model families
  drawn versus the registry requirement.
- `D1`–`D3` on two-round claims only: debate transcript, transcript frozen
  in the phase-two evidence, table votes bound to the pinned prompt.

A one-round claim with five revealed runs produces on the order of 110
checks: `AGENTS.md` documents 110 of 110 for the reference claim
`0x273220b5...`, and `docs/site/proof.md` records 111 of 111 passing on
2026-09-05.

The count varies because the R numbers are sparse by design
(`docs/site/trust-model.md`): legacy bundles emit only a subset, and table
votes mark the research checks `SKIPPED`.

**Where the TypeScript/Move parity is enforced.** Two test files pin
identical byte arrays: `lib/protocol/parity.test.ts` (vitest) and
`move/openverdict/tests/parity_tests.move` (`sui move test`).

Six blake2b256/BCS vectors — three outcomes plus boundary confidences and a
128-byte salt — must serialize identically under `computeVoteCommitment`
(TypeScript) and `jury::compute_commitment`
(`move/openverdict/sources/jury.move:788`).

`scripts/gen-parity-vectors.ts` regenerates both sides, so a serialization
change on either side breaks exactly one suite.

On chain the same check is enforced live: `reveal_vote` aborts with
`E_COMMITMENT_MISMATCH` when the recomputed preimage differs from the stored
commitment (`move/openverdict/sources/jury.move:632`).

**What the project states it does not prove.** Quoted verbatim.

From `docs/site/trust-model.md`, the auditor's own summary:

> It does not prove:
>
> - that the model's reasoning is correct; that is what the evidence trail
>   and the sealed research are for, read them;
> - that the web sources are true;
> - that the operator could not have withheld a claim from the jury; a
>   withheld claim simply has no certificate.

The receipt gap, quoted in the same page from
`docs/superpowers/specs/2026-08-30-attested-inference-design.md`:

> What no reader can prove today is that the bytes in the record are the
> bytes the model received, or that the pages in the record are the pages
> the web returned. Both are attested only by the operator's engine, which
> is the party that built them.

From `AGENTS.md`, "What is public and recomputable":

> It does not prove the claim is true, and it does not prove byte for byte
> what the model received.

> Also not verifiable from public data: the salt or the sealed key before
> the reveal, anything inside GonkaRouter beyond the receipt fields, the
> operator's database, and who the person or organisation behind an account
> is.

From `README.md`, "Known limitations (V1, disclosed by design)":

> The run attestor and evidence freezer are single team-held capabilities,
> so the pipeline upstream of the commitment is trusted infrastructure

> Seal keys and salts sit in plaintext in the engine's Postgres on testnet

> Unaudited. Capped, team-funded demo value only.

## Distribution surface

A stranger can engage with this project at least eight distinct ways
without the team present. The hosted app is three hosts on one deployment —
`openverdict.info`, `app.openverdict.info`, `docs.openverdict.info` —
routed by `lib/web/host-routing.ts`.

A browser alone reaches the live board, a running claim, the jury roster
and the `/verify` recompute page.

The documented public API (`docs/API.md`, 985 lines covering every route,
status code and guard) lets a stranger drive the same data with `curl`.

The `ov` CLI needs a clone and `pnpm install` but no key, wallet or
database, and covers the whole journey — weather, board, extract, submit,
status, watch, audit, trace (`scripts/ov.ts`, `lib/ov/`).

The agent skill turns distribution inside-out: `skills/openverdict/SKILL.md`
is served at `https://app.openverdict.info/SKILL.md` by
`app/SKILL.md/route.ts`, so "Set up this URL and take it from there" works
in any agent that can read a link.

`npx skills add Marcussy34/OpenVerdict` installs the same file into agents
that read the Agent Skills format.

The docs site renders 14 Markdown pages at request time, and
`public/llms.txt` is a seventh path: an agent with nothing but HTTP gets
the routes, the third-party sources and the three recomputations in one
fetch.

Underneath sits an eighth surface needing none of the team's code: the Sui
objects, Walrus blobs and GonkaRouter receipts are public on third-party
infrastructure (`docs/site/proof.md` links every one for a real claim).

The breadth matters because a judge with fifteen minutes picks the rung
that costs least: click a link, run one command, or paste one URL into
their own agent.

Every rung lands on the same recomputable record, so "it works" is
something the judge verifies rather than something the pitch asserts. Most
hackathon projects die at "trust the demo video"; this one is checkable
from a browser tab, a terminal or someone else's infrastructure.

## What made this hard to fake

1.  **Vote commitments must match byte-for-byte in two languages.** The
    blake2b256/BCS commitment is computed by `computeVoteCommitment`
    (`lib/protocol/commitment.ts`) and independently by
    `jury::compute_commitment` (`move/openverdict/sources/jury.move:788`).
    Six pinned vectors are asserted identically in
    `lib/protocol/parity.test.ts` and
    `move/openverdict/tests/parity_tests.move`, so a drift on either side
    fails a suite. A narrated demo cannot produce two implementations that
    agree on 32-byte hashes across six edge cases.

2.  **Settlement happened on a public chain with inspectable objects.** The
    reference claim `0x273220b5...` settled as NO with `truth_score_bps` 200
    under certificate `0x42954c91...`, and its finalize transaction minted
    five 1,900,000-MIST jury tickets plus one 500,000-MIST protocol fee
    ticket (`docs/site/proof.md`, `README.md`). `settlement.move` enforces
    payouts in Move (`PayoutTicket`, `finalize_claim`), and `reveal_vote`
    aborts on a mismatched commitment (`jury.move:632`), so the certificates
    are chain facts, not screenshots.

3.  **Sealed bundles open after the deadline without the operator.** Each
    run's plaintext is AES-256-GCM sealed before the commit and the key is
    escrowed under a Seal time-lock policy
    (`move/openverdict_seal/sources/reveal_lock.move`, 37 lines: a 73-byte
    identity of claim, seat, phase and reveal deadline; `seal_approve`
    asserts `clock >= deadline`). The escrow was proven live on claim #25,
    where a recovered key equalled the revealed key and a never-revealed
    seat's core opened the same way (`docs/STATUS.md`, Seal escrow entry).
    Faking this requires deploying a working Move policy and beating
    Mysten's key servers.

4.  **The auditor reads only sources the team does not control, and it
    fails closed.** `lib/audit/audit-claim.ts` fetches the public API, Sui
    JSON-RPC, the Walrus aggregator and GonkaRouter receipts — no database,
    no keys — and its exit code is `summary.failed > 0 ? 1 : 0` (line 2883).
    A source outage produces `UNAVAILABLE` with a manual URL, never `FAIL`,
    so the tool cannot launder a missing record into a pass. The reference
    claim audits 110 of 110 (`AGENTS.md`) or 111 of 111
    (`docs/site/proof.md`).

5.  **The live deployment carries dated operational history.** 648 of 649
    commits landed between 2026-08-26 and 2026-09-06 in one linear branch,
    and `docs/STATUS.md` is a dated incident log: Neon hitting its egress
    cap and being deleted the same afternoon, hosted-only bugs found and
    fixed the same night, GonkaRouter dropping Kimi on 2026-09-05 and the
    degraded-mode response documented as a runbook with real transaction
    ids (`docs/demo/runbook.md` section 4c). Preserved claim ids with
    certificate objects (`docs/site/proof.md`) give a judge concrete
    objects to open rather than a story to believe.

6.  **Model provenance is checked against the provider's own endpoint.**
    Every inference records the gateway request id, devshard id and system
    fingerprint, and check `R17` compares them to GonkaRouter's public
    receipts lookup (`lib/audit/audit-claim.ts:2040-2062`). The adapter
    refuses any base URL outside `gonkarouter.io`
    (`lib/gonka/adapter.ts:435-437`), sends `X-Gonka-No-Fallback: true` on
    every call, and treats a served model different from the manifest model
    as a provider error, never a vote. The receipts endpoint is third-party
    infrastructure a judge can query with no credentials.

7.  **The project enumerates its own holes with file names.**
    `docs/site/limits.md` lists what is not true: a single team-held
    attestor, plaintext salts in Postgres (`lib/storage/schema.ts` is
    named), slashing specified but not implemented, reputation counters
    that nothing updates, and "Unaudited". A fabricated submission does not
    ship an honest inventory of its weaknesses cross-referenced to source
    files.

## Engineering discipline

| Practice                             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testing strategy                     | 90 `*.test.ts` files (28,738 lines, ~1,034 `it()`/`test()` cases) covering `lib/`, `cli/`, `workers/` per `vitest.config.ts`; 9 `*_tests.move` modules with 105 test functions; `pnpm e2e:localnet` runs three full lifecycles plus a sponsored deposit on a fresh localnet (`scripts/localnet-e2e.ts`, 2,433 lines); `scripts/cockpit-demo.ts` leaves a finalized and a sealed claim for UI work                                      |
| Typechecking and linting             | `pnpm typecheck` (`tsc --noEmit`), `pnpm lint` (eslint with `eslint-config-next` core-web-vitals + typescript, `eslint.config.mjs`), `pnpm build`; all three named as required commands in `CLAUDE.md`                                                                                                                                                                                                                                 |
| Shared wire contract TypeScript/Move | `CLAUDE.md` hard rule: the u8 state/outcome codes in `lib/protocol/constants.ts` and the Move modules may never be renumbered on one side alone; six blake2b256/BCS parity vectors asserted in both `lib/protocol/parity.test.ts` and `move/openverdict/tests/parity_tests.move`; `scripts/gen-parity-vectors.ts` regenerates them                                                                                                     |
| Failure-closed behaviour             | Fourteen enumerated fail-closed rules in `docs/site/trust-model.md`; the adapter refuses non-GonkaRouter hosts (`lib/gonka/adapter.ts:435`); a run refuses to start unless every seat's manifest hashes equal its published document (`lib/engine/engine.ts:1692`, `:1697`); reveal aborts `E_COMMITMENT_MISMATCH` (`move/openverdict/sources/jury.move:632`); the one disclosed fail-open is the Seal escrow, which is insurance only |
| Deployment and hosting               | One `Dockerfile` container on Railway (`railway.json`, healthcheck `/api/status`) running the web app plus three workers via `scripts/start-production.mjs`, which exits the whole service if any child dies; Railway Postgres; three hosts routed by `lib/web/host-routing.ts`; full deploy and incident runbooks in `docs/demo/runbook.md`                                                                                           |
| Spec and doc drift control           | `docs/PRD.md` §1.1 records 24 dated amendments where the code corrected the spec, each numbered and sourced; `docs/STATUS.md` is a dated change log of what is and is not true yet; `docs/site/limits.md` carries an explicit "Documentation drift" section naming known inconsistencies between `README.md` and `docs/STATUS.md`                                                                                                      |
| Agent-facing documentation           | `AGENTS.md` (how an agent uses the product), `public/llms.txt` (HTTP-only audit recipe), `skills/openverdict/` in the open Agent Skills format; `docs/site/agents.md` renders `AGENTS.md` at request time so it cannot drift, and `app/SKILL.md/route.ts` serves the skill file from disk via `lib/skill/files.ts` so the URL and the installed file are identical                                                                     |
