# Archived preliminary proposal deck

Superseded material, kept for provenance. Nothing here is submitted, and
nothing here should be rehearsed from.

The submitted deck is
[docs/pitch/deck/ladinglens-deck.html](../deck/ladinglens-deck.html), with its
narration in
[docs/pitch/deck/ladinglens-script.md](../deck/ladinglens-script.md).

| File | What it was |
| --- | --- |
| [preliminary-deck.html](preliminary-deck.html) | The ten-slide proposal deck |
| [preliminary-deck.md](preliminary-deck.md) | Its source outline |
| [preliminary-script.md](preliminary-script.md) | Its 4:50 narration |

## Why it was replaced

The proposal deck was written before the build landed, and it says so on its
own slides: the shell was described as shipped while the product workflows
were still proposed, and the speed and accuracy slide instructed the presenter
to keep `MEASUREMENT PENDING` on screen.

None of that is true any more. The service is deployed, `/judge` runs live
against the real providers, and the run has measured numbers — including the
one that missed its target. The replacement deck states those outright, so the
two decks contradict each other on the single question a judge cares most
about: what is actually built.

The argument survived the rewrite. The blind spot, the two gates, the
`SYN-042` reveal and the judge-verifiable close all come from
[demo-spine.md](../../research/ideation/demo-spine.md) and
[pitch-narrative.md](../pitch-narrative.md), and both remain current.

## What changed

| | Archived | Submitted |
| --- | --- | --- |
| Slides | 10 | 13 |
| Runtime | 4:50 | 4:43 |
| Build claim | Shell shipped, workflows proposed | Deployed, with a public judge path |
| Numbers | `MEASUREMENT PENDING` | 520 / 457 / 46 / 17, and 25.6 s p95 |
| Close | Spoken call to action | Two QR codes, scannable from a projection |
