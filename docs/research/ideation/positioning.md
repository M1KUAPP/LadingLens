# LadingLens positioning

LadingLens is a shipping inbox-control system using double-entry bookkeeping
to reconcile expected shipments with cases and verify SI-to-BL decisions
against source evidence for human sign-off.

- Inbox risk: Averis can miss a time-critical document-check request in a
  mixed inbox, and a never-arrived email cannot be found by classifying mail
  alone.
- Two control gates: Gate 1 accounts for every received email; Gate 2
  independently reconciles expected shipments to the case ledger. Valid SI/BL
  pairs receive evidence comparison within the same workflow.
- Safe refusal and ownership: LadingLens returns `NEEDS_REVIEW` when evidence
  is incomplete or uncertain; a named human resolves the case and owns the
  sign-off.

## Outsider restatement test

After one explanation, an outsider should be able to say: “It checks that each
received email is accounted for, expected shipments are independently
reconciled to cases, then the Shipping Instruction is checked against the draft
Bill of Lading using evidence from both; uncertain work goes to a person.” If
they describe only an email classifier or a document scanner, explain the two
gates again.

## Why this resists a thin wrapper

The product's core is a pair of connected controls, not a prompt wrapped around
a model. Gate 1 accounts for every received email; Gate 2 independently
reconciles the expected-shipment ledger to the case ledger and can reveal a
case that never arrived. In the same workflow, SI/BL evidence comparison
validates document identity, compares the SI reference with the draft BL, and
keeps field evidence attached to the result; it does not wait for Gate 2 and
is not a third gate. Deterministic code owns structure, normalization, numbers,
schemas, and state transitions. Gemini 3.5 Flash extracts document content,
Jev 1.13.0 makes typed semantic decisions, and a human owns unresolved
decisions and sign-off.

This positioning makes no claim that the report amends a BL or authorizes
release. Historical Flash Lite latency measurements are not Flash measurements
and are not used as a product claim.

## Source links

- [Project brief](/docs/BRIEF.md)
- [Missed-case stakes and reconciliation gate](/docs/research/ideation/stakes.md)
- [Provenance findings](/docs/research/ideation/provenance-spike.md)
