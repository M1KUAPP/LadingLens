# OpenVerdict Product

OpenVerdict placed first in the GonkaRouter "AI for Society" track at
the MUBA Blockchain Hackathon 2026.

This file reconstructs what a judge saw, heard and felt in its
five-minute pitch, from the product's public face alone; paths are
relative to the OpenVerdict repository, and code internals are out of
scope by design.

## The One-Sentence Hook

The project repeats one self-description across at least five
surfaces. Verbatim:

> "OpenVerdict is a decentralized adversarial AI jury protocol for
> factual disputes where 5 jurors from 3 distinct model families on
> Gonka independently research, cast commit-reveal secret ballots, and

> cross-examine deadlocks in open debate until reaching a supermajority
> consensus." (README.md, opening paragraph)

> "A decentralized adversarial AI jury protocol for factual disputes."
> (public/llms.txt, first sentence)

> "OpenVerdict is a decentralized adversarial AI jury protocol for
> factual disputes: five juror seats drawn on-chain from three model
> families (DeepSeek, Kimi, MiniMax, all served through GonkaRouter)

> research a claim independently, cast commit-reveal secret ballots,
> and cross-examine each other when round one deadlocks." (AGENTS.md)

> "Decentralized adversarial AI jury for factual disputes where
> distinct models research, vote sealed, then debate to a
> supermajority. Verified on Gonka, settled on Sui."

> (landing page hero, components/landing/hero.tsx, shown in
> docs/assets/screenshots/landing.jpg)

The spoken stage version is deliberately different, and thinner on
jargon:

> "OpenVerdict is a decentralized verification protocol for factual
> claims. Independent AI models research a claim on Gonka's
> decentralized inference network, vote under commit-reveal, and Sui

> settles a verdict anyone can recompute. It is live on Sui testnet
> right now, and everything I show you is real chain state."
> (docs/demo/pitch-talk-track.md, slide 1)

And the shortest form, the tagline:

> "See how the verdict was reached." (README.md; also the pitch deck's
> title slide and the video script's closing line)

Why it makes a listener want more. The noun phrase is boring on
purpose: the talk track's naming rule fixes the top-level identity as
"decentralized verification protocol" and demotes jury and court to
"explanation-layer metaphors only" (docs/demo/pitch-talk-track.md).

A judge can repeat what it is after one hearing; the novelty sits in
the mechanism, which is what the demo exists to show. "Jury" does the
compression work, mapping the architecture onto a civic institution —
several deciders, evidence, secret ballots, a verdict.

The /learn page carries the same trick into plain speech: commit-reveal
becomes "Each juror seals its answer in an envelope nobody can open
yet" (app/learn/page.tsx).

The tail of the sentence is a dare, not a claim: "anyone can
recompute" invites the judge to check rather than trust, and the
product ships the checking tools.

It also sounds implausibly large for a hackathon build — five models,
a blockchain, cryptography — which creates the "prove it" pull the
demo then cashes in.

## The Stakes

The problem slide is headlined "Truth has no referee" and argues three
things (docs/demo/pitch-deck.html): outcomes worth money are decided by
a token vote, a private desk or a single model, none showing their
work.

The referees are also leaving: fact-checking is being wound down just
as AI makes convincing falsehoods cheap. And the obvious fix — ask
five AIs — fails on its own terms, because votes in editable server
logs cannot be rechecked.

Two dated public failures anchor the argument (docs/demo/
pitch-talk-track.md): Polymarket's Ukraine mineral-deal market,
resolved YES in March 2025 after whale-weighted UMA voting despite no
signed deal.

The second is Meta's 2025 shutdown of third-party fact-checking in
favour of crowd notes. Both verify as real, widely reported events
(the Polymarket market held roughly $7M; one UMA holder cast about a
quarter of the votes), and the talk track still says to re-check dates.

The beneficiary has two layers. The near one is pictureable — a trader
or DAO voter who lost money on a resolution they could not inspect;
the README names a prediction market as "the first economic consumer"
of the verdict (README.md, appendix).

The far beneficiary is diffuse: everyone reading a feed after the
referees leave. For an "AI for Society" judge the problem is largely
pre-believed — misinformation plus the retreat of fact-checking needs
no convincing — so problem minutes buy confirmation with receipts.

The one thing the pitch must teach is that a market resolves through
an oracle vote at all; the Polymarket story carries that load inside a
scandal. The compressed version: "The referee walked off the pitch
just as the flood started" (docs/demo/pitch-talk-track.md).

## The Demo Moment

The choreography is reconstructable to the second because the demo was
scripted (docs/demo/demo-script-3min.md). Six tabs are prepared; a
fresh claim — "Sui mainnet launched on 3 May 2023." — is submitted
live on camera to prove the system is real, then parked.

"A run takes about twelve minutes, so I will leave it working and show
you one that finished." The live claim keeps working on the second
screen while the pitch moves to a finished one.

The centerpiece is a completed two-round claim (the intermittent-
fasting verification). Pressing Play at 10x, then 30x, replays the
whole proceeding: committee draw, searches for and against, sealed
votes, the reveal.

Then the split jury's six-turn public debate over the frozen record, a
sealed table vote, and the UNRESOLVED certificate at truth score
21.25/100 (docs/assets/screenshots/jury-resolution.png).

The spoken track over the replay, verbatim (docs/demo/
demo-script-3min.md):

> "Each juror searches for and against, opens pages, quotes them, and
> seals its vote as a blake2b commitment on Sui. Nobody, not even the
> operator, can read a vote until every seat has sealed."

What the audience physically sees (docs/demo/runbook.md, §5, and the
screenshot): jurors seated clockwise around a courtroom ring, vote
chips ("NO 85%", "UNSURE 46%") appearing at reveal, a certificate
node closing the ring.

A debate dock quotes a real NEJM trial; a research trail names the
serving node per turn — model, devshard, vLLM fingerprint, latency,
tokens, gateway request id.

Then the proof beat: the certificate opens on SuiVision, the finalize
transaction on Suiscan, a work bundle on Walrus, a request id on
GonkaRouter's own receipts endpoint — all third-party sites, with the
line "Nothing here is our word for it."

A second finished claim shows "attempt 2 of 3" — a voided attempt left
public on purpose (docs/demo/demo-script-3min.md).

The single moment designed to land is the bloom at the reveal — "the
sealed trails bloom into the full record" (docs/demo/
video-script-2min.md) — where hidden research, ballots and debate
become one inspectable object wired to a certificate.

The script itself calls the debate "the strongest thirty seconds of
the demo" (docs/demo/demo-script-3min.md).

Verdict: narrated. A judge needs the voiceover to know that "SEALED
4/5" means nobody could peek; chips and hex ids do not explain
themselves.

But authenticity is self-evident on one click — real citations, an
explorer the team does not run. On-screen text does the summary:
"WHERE THE TABLE STANDS — Nobody changed their vote: 3 NO from the
first exchange to the last" (jury-resolution.png).

Belief is deferred from the stage to the judge's own click afterwards —
which is the product's thesis and its closing slide: "Don't trust it.
Recompute it." (docs/demo/pitch-deck.html)

## Perceived Difficulty

The hook sounds hard to build: to a non-expert it stacks multi-model
AI orchestration, a blockchain protocol and applied cryptography in
one sentence.

The written version reinforces it with specialist vocabulary:
commit-reveal, blake2b-256, Merkle root, Sui native randomness, Move,
Seal time-lock, zkLogin, devshard, BCS preimage (README.md,
public/llms.txt, docs/site/faq.md).

The difficulty that is visible: a courtroom-ring graph that replays an
entire verification; per-turn node fingerprints in the research trail
(served model, devshard, vLLM fingerprint, gateway request id —
jury-resolution.png).

Plus the hash-chain diagram on the trust-model page, the /verify
page's raw preimage fields, and the object count itself — five jurors,
two rounds, a dozen hashes and explorer links per claim
(docs/site/proof.md).

The difficulty that is real but invisible: the runbook records days
of deadline tuning so a slow juror (a Kimi seat needing ~350 seconds
of research room) fits inside on-chain commit windows
(docs/demo/runbook.md).

Around it: all-or-nothing void semantics, health probes that refuse
submissions while a family is down, hedged model calls, manifest
republishing — none of it visible behind a smooth 30x replay.

Two subtleties. Part of the perceived difficulty is presentational: a
judge cannot tell which of the fifteen browser checks was hard, so the
appearance of recomputability does the signalling.

And the disclosed gap — the engine executes runs today and "can halt
but cannot forge" (docs/demo/pitch-talk-track.md) — raises perceived
competence: the team can point at the exact edge of what their system
does not yet prove.

## What A Judge Could Do Themselves

| Action | What it takes | What they see |
| --- | --- | --- |
| Open the landing page | a phone browser, openverdict.info | The "Jury Resolution" hero over a live globe, plus a "Latest verdict" card showing a real claim and its score (landing.jpg) |
| Open the claim board | one click to app.openverdict.info/claims | Every claim ever submitted, newest first, with state and score (AGENTS.md) |
| Press Play on a settled claim | one click, replay at up to 30x | The whole proceeding re-run: draw, searches, sealed votes, reveals, debate, certificate (docs/demo/runbook.md) |
| Click a certificate or transaction | one click from the claim page inspector | The same object on SuiVision or Suiscan — third-party explorers, not the team's site (docs/demo/demo-script-3min.md) |
| Open a GonkaRouter receipt | one click, no login | The gateway's own record of one model call: model, devshard, timing (docs/site/proof.md) |
| Open a Walrus blob | one click | The raw JSON work bundle: the exact prompt, transcript and citations (docs/site/proof.md) |
| Paste a claim link into /verify | the "Audit a verdict" page, one paste | Fifteen checks recomputed in their own browser, no account (app/verify/page.tsx, docs/site/faq.md) |
| Submit their own claim | one sentence at /fact-check, no wallet, free tier | A live jury forming on the judge's own words inside a minute; verdict about twelve minutes later (docs/site/faq.md) |
| Hand SKILL.md to their own agent | one line: "Set up https://app.openverdict.info/SKILL.md" | The agent self-configures and can audit a verdict end to end in about ten seconds (AGENTS.md) |
| Call the public API | one unauthenticated GET | The same raw JSON the console renders (public/llms.txt) |

## The Transferable Recipe

1.  **Lead with a problem the judge already believes, anchored by a
    dated public failure.**

    OpenVerdict never had to convince the room that misinformation
    matters; it attached to a pre-believed problem using two dated,
    verifiable scandals as receipts (docs/demo/pitch-talk-track.md).
    A dated failure turns "this matters" into evidence.

2.  **Name the category plainly; put the novelty in the mechanism.**

    The stage identity is the unremarkable "decentralized verification
    protocol"; jury and court are demoted to the explanation layer by
    an explicit naming rule (docs/demo/pitch-talk-track.md). A judge
    can repeat what it is after one hearing.

3.  **Compress the architecture into an institution everyone knows.**

    Jury, sealed ballot, cross-examination, certificate each map to a
    courtroom counterpart, so the pitch needs no vocabulary lesson
    (README.md). /learn translates commit-reveal as "an envelope
    nobody can open yet" (app/learn/page.tsx).

4.  **Prove liveness, then prove the record — never fake the wait.**

    The demo submits a real claim on camera, then switches to a
    finished one because a verdict takes twelve minutes, saying so out
    loud (docs/demo/demo-script-3min.md). Naming the delay reframes it
    as a cost of the property being sold.

5.  **Make the demo moment a state change, not a dashboard.**

    The designed beat is sealed trails blooming into the full public
    record at the reveal (docs/demo/video-script-2min.md): hidden work
    becomes inspectable. A replay control compresses ten minutes into
    thirty seconds without faking any of it.

6.  **Put third-party receipts on screen, not your own assurances.**

    Every artifact links out to infrastructure the team does not run —
    explorers, blob storage, an inference gateway's receipts — so
    "everything on this page is a link a judge can click"
    (docs/site/proof.md). Corroboration beats self-claims.

7.  **Hand the judge the tools to disprove you, and make it the
    close.**

    "Don't trust it. Recompute it." is the pitch's thesis and final
    slide (docs/demo/pitch-deck.html); the /verify page, audit CLI and
    agent skill make the dare executable from the judge's seat.
    Inviting scrutiny converts skepticism into engagement.

8.  **Exhibit honest failure as a feature, on the record.**

    The demo shows an UNRESOLVED verdict and a claim settled on
    "attempt 2 of 3" after a public void; even a refused submission is
    a scripted beat (docs/demo/demo-script-3min.md). Declining to fake
    an answer is a stronger exhibit than a flawless run.

9.  **Let the artifact keep pitching after you leave the room.**

    The landing page shows a live "Latest verdict" card — currently an
    honest UNRESOLVED result, not a cherry-picked YES (landing.jpg) —
    and one line ("Set up .../SKILL.md and take it from there") turns
    the judge's own agent into a re-pitching vector (AGENTS.md).
