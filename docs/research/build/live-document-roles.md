# Live document-role decisions

Research for issue #77: why the public `/judge` flow classified both halves
of a valid SI/draft-BL pair as `SI`, and what fixes it.

Contents:

1.  [Finding](#finding)
1.  [Evidence](#evidence)
1.  [Implications for LadingLens](#implications-for-ladinglens)

## Finding

`JevDocumentRoleClient` asked about every attachment of a request in one
pinned `jev-1.13.0` call: the shared `state` held all documents, and each
`Choice` question was told to judge "the text under this question's name".
The model does not keep the documents apart. With the pair together, each
answer is close to a coin flip and follows whichever document comes first;
asked about one document alone, the model is certain. The seed baseline
never exposed this because its roles are prepared by a header rule, not
decided by Jev, so `/judge` was the first path to call the role decision
live on a real draft Bill of Lading.

## Evidence

Three live calls on 2026-09-21 through the product's own client, using the
bundle's `email_001_SI.txt` and `email_001_BL.txt` unchanged:

| Request                  | SI answer              | Draft BL answer             |
| ------------------------ | ---------------------- | --------------------------- |
| Both, SI first           | `SI` (0.48 vs 0.44)    | `DRAFT_BL` (0.46 vs 0.44)   |
| Draft BL alone           | —                      | `DRAFT_BL` (1.00)           |
| Both, draft BL first     | `DRAFT_BL` (0.61)      | `DRAFT_BL` (0.61)           |

The live `/judge` runs in the issue returned `SI` for both documents,
which is the same failure with the order tipping it the other way. The
first live benchmark run
([`live-path-latency-method.md`](live-path-latency-method.md)) is
consistent with it: its equivalence stage was skipped in every trial.

## Implications for LadingLens

- Ask about each document in its own call, with a `state` that holds only
  that document, and run the calls concurrently so a pair still costs
  about one round trip.
- Keep the decision content-only and pinned: file names and upload slots
  stay out of the question, as the TRD requires for document roles.
- The category client batches emails the same way. Gate 1's deployed
  inbox uses prepared categories, so the demo is not affected, but live
  batch classification should be probed the same way before it is
  trusted.
