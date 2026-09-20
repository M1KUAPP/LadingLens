# Legal defence and Q&A preparation

This document gives the answers the team can defend, the answers it cannot
yet defend, and the controls required before the stronger answers become true.
It was checked against the repository and public sources on 20 September 2026.

This is product and competition risk analysis, not Malaysian legal advice.
Averis should have its counsel and data protection officer approve a production
deployment, its contracts, and its privacy assessment.

Contents:

1.  [Action summary](#action-summary)
1.  [Executive answer](#executive-answer)
1.  [Current repository reality](#current-repository-reality)
1.  [Fixes required before the final](#fixes-required-before-the-final)
1.  [Liability answer](#liability-answer)
1.  [Evidentiary answer](#evidentiary-answer)
1.  [Data protection and cross-border answer](#data-protection-and-cross-border-answer)
1.  [Competition rules audit](#competition-rules-audit)
1.  [Repository licence decision](#repository-licence-decision)
1.  [Ten hard questions and answers](#ten-hard-questions-and-answers)
1.  [Claims the team must not make](#claims-the-team-must-not-make)
1.  [Sources](#sources)

## Action summary

Present Averis as a human-controlled comparison and shipment-completeness
system. Do not describe it as an autonomous decision-maker, legal amendment
service or production-ready product.

Complete these actions before judging:

1.  Implement the scored classify, extract, normalise and compare path.
2.  Build a review queue with source evidence, explicit approval or correction,
    named ownership and an audit history.
3.  Add the independent shipment-to-case reconciliation gate described in
    [the stakes research](stakes.md).
4.  Keep real shipping documents off the current free Gemini route. Use only
    synthetic data until the processor, transfer and regional controls are
    approved.
5.  Add the root `README.md`, a functional public demo, the required deck and
    a video safely below five minutes.
6.  Resolve the pre-window Layerhand research with the organisers and do not
    rely on it in the submission.
7.  Keep the implemented MIT licence and preserve separate terms and notices
    for any third-party material.

Use three boundaries in Q&A:

- The deploying organisation remains accountable; the model is not the
  accountable party.
- An Averis report does not amend a BL or guarantee legal admissibility.
- Singapore application hosting does not prove where every inference request
  is processed.

The current repository is not production ready. The sections below provide the
legal, operational and evidentiary justification for these actions.

## Executive answer

The defensible position is:

> Averis is a human-controlled document-comparison and completeness system,
> not an autonomous freight forwarder and not a legal amendment service. It
> preserves the source SI and BL, shows every material difference beside its
> evidence, reconciles active shipments against cases through an independent
> second gate, and requires a named operator to resolve uncertain or high-risk
> cases. The deploying organisation remains accountable for the service; the
> model never becomes the accountable party.

That is the **target design**, not the state of the current code. Today the
repository is an infrastructure scaffold. The team should answer a judge with
that distinction rather than describe planned controls as shipped controls.

Three boundaries make the defence credible:

1.  Averis output does not amend a Bill of Lading. A carrier-authorised process
    must issue any actual correction or replacement.
2.  Human review does not transfer organisational liability to an employee.
    The reviewer owns the operational decision; the deploying organisation
    owns the system, policy, training and monitoring.
3.  Synthetic data makes the hackathon demo low-risk. It does not make the
    present free-tier Gemini route suitable for real shipping documents.

## Current repository reality

The following is what a judge can verify in the repository today:

- Cloud Run, Artifact Registry, Secret Manager, Workload Identity Federation,
  Neon Postgres and a private Google Cloud Storage bucket are documented.
- The Gemini client is wired, but `docs/TRD.md` says extraction is not built.
- The API exposes health and readiness routes. The React application displays
  readiness; it does not yet classify, extract, compare or review documents.
- There is no implemented human-review queue, approval control, audit trail,
  shipment-to-case reconciliation gate or production data-governance flow.
- Both configured Gemini keys are documented as free-tier keys.
- The supplied dataset is synthetic.
- The repository is private and has no root `README.md`; an MIT licence is now
  included following unanimous contributor approval.

The safe answer to “is this production ready?” is therefore **no**. The
prototype's value is the proposed control architecture and the working subset
the team completes before judging, not a claim of present production safety.

## Fixes required before the final

### Release blockers

1.  **Build the scored path.** Implement email classification, SI and BL
    extraction, deterministic normalisation and field comparison, visible
    failures, and retry behaviour. The current readiness page cannot support
    the core product claim.
2.  **Build human review as a workflow.** A review item needs the source
    excerpts, side-by-side values, reason for escalation, confidence or rule
    outcome, an owner, and explicit approve, correct and reject actions.
3.  **Prevent silent release.** `NEEDS_REVIEW`, missing documents, unreadable
    documents, gate disagreement, stale shipment data and high-risk field
    differences must not be auto-cleared.
4.  **Add an audit record.** Store source identifiers and hashes, extracted
    values, rule and model versions, timestamps, reviewer identity, corrections
    and the final disposition. Preserve the original SI and BL unchanged.
5.  **Add the independent second gate.** Reconcile a booking, TMS, ERP or
    carrier shipment list against the case ledger. An inbox-only second model
    cannot find an email that never arrived.
6.  **Keep real data off the free Gemini route.** Use synthetic data until a
    production processor, contract, transfer assessment, retention policy and
    eligible regional configuration have been approved.
7.  **Make the submission compliant.** Add a root `README.md` with setup
    instructions, publish a functional prototype, keep the video below five
    minutes, and resolve the pre-window research concern described below.

### Recommended control sequence

```text
Mailbox -> receipt log -> classify and extract -> compare -> case ledger
                                                       |
Booking / TMS / ERP / carrier feed -> shipment ledger  |
                         |                             |
                         `-> Gate 2: reconcile <-------'
                                      |
                           clear / review / overdue
                                      |
                       named human approval for risk
```

Gate 2 is independent because its expected-shipment list comes from outside
the inbox. A third gate is warranted only for red cases, such as a proposed
release with unresolved weight, consignee, port or missing-document risk. It
should be a human or a genuinely different authoritative check, not a third
copy of the same prompt.

## Liability answer

### The judge-ready answer

> The model is never the accountable party. Averis, as the organisation
> operating the service, owns the controls and monitoring, while a named
> operations reviewer owns the release decision for uncertain or high-risk
> cases; ultimate legal liability still depends on the customer, carrier and
> service contracts and the applicable law.

This avoids two bad extremes: claiming that AI assumes liability, and using
“human in the loop” as a disclaimer that pushes all responsibility onto an
employee.

### When Averis misses a real discrepancy

The system should create a detectable incident rather than hide the miss:

1.  Block automatic release for unresolved critical fields and missing
    evidence.
2.  Preserve the sources, system decision and reviewer action.
3.  Notify the case owner and follow the correction or carrier-amendment path.
4.  Measure the miss, investigate whether the control failed, and update the
    rule or training process under change control.
5.  Apply the customer contract, incident plan and applicable law to any
    remediation. Do not promise a universal liability allocation in the demo.

### When Averis raises a false positive

A false positive should delay only the affected case, not silently alter or
cancel a shipment. The reviewer sees the two source values, records an override
with a reason, and the team monitors review precision, queue age and repeat
causes so that the safety gate does not become operational noise.

The organisation remains accountable for threshold design, staffing and
service levels. A reviewer is accountable for following the approved process,
but does not become personally liable merely by clicking an approval button.

## Evidentiary answer

An ocean Bill of Lading may perform three functions: receipt for goods,
evidence of the contract of carriage, and, for a negotiable BL, a document of
title. Not every transport document is negotiable, and it is safer to say that
a BL **evidences** the contract rather than to say every BL is itself the whole
contract.

### Status of the Averis output

> An Averis annotation is a separate comparison report. It is not an
> endorsement, amendment, replacement Bill of Lading, document of title or
> legal opinion, and it never changes the carrier-issued source document.

If a discrepancy needs correction, an authorised person must use the carrier's
formal amendment or re-issuance workflow. Averis may prepare the evidence for
that decision, but cannot confer carrier authority on its own output.

### Conditions for operational reliance

The report becomes a useful operational and audit record only when it includes:

- the immutable source documents or stable source references and hashes;
- the exact source excerpt or page for every compared value;
- the extraction, normalisation and comparison result separately;
- the rule, prompt and model versions and the processing time;
- uncertainty and failure states, rather than a guessed value;
- the reviewer's identity, decision, time and correction reason; and
- access control, retention, export and tamper-evident history.

Those controls can support authenticity, reproducibility and weight. They do
not guarantee legal admissibility or make the report conclusive evidence; that
depends on the forum, governing law, contract, authenticity and integrity of
the particular record.

UNCITRAL's electronic-transferable-record framework illustrates why the line
matters: functional equivalence for an electronic document of title requires a
reliable method for identifying the authoritative record, exclusive control
and integrity. A comparison report does not satisfy those functions merely
because it displays information from a BL.

## Data protection and cross-border answer

### The judge-ready answer

> The hackathon uses synthetic data. In production, we would treat names,
> signatures, email addresses and other identifiable shipment information as
> personal data, document every processor and transfer, minimise what leaves
> Averis, and keep real documents off an unpaid inference service. Singapore
> hosting is a location choice, not proof that every AI request remains in
> Singapore.

Malaysia's Personal Data Protection Act 2010 applies to personal data processed
in commercial transactions. Section 129 regulates transfers out of Malaysia,
and the Commissioner's current guidance requires the controller to identify an
available transfer condition and informs the assessment of comparable or
adequate protection, due diligence and transfer safeguards.

The current architecture creates more than one potential transfer:

- Cloud Run and Neon are documented in Singapore;
- documents may be placed in Google Cloud Storage; and
- the API-key Gemini Developer API is a separate external inference route.

A service being called **from** Singapore does not establish where that service
stores or processes the request. Each destination, subprocessor and feature
must be assessed.

### Why the current Gemini route is a production blocker

Google's Gemini API terms say that for unpaid services Google may use submitted
content and responses to improve products, human reviewers may process inputs
and outputs, and users must not submit personal, sensitive or confidential
information. The repository explicitly documents both Gemini keys as free
tier, so real SI, BL and email content must not use that route.

Paid Gemini API terms say prompts and responses are not used to improve Google
products and are processed under Google's data-processing addendum. That is an
important contractual improvement, but it does not by itself prove a Singapore
processing boundary.

For production, prefer an approved Google Cloud enterprise path with:

1.  a data-processing agreement and reviewed subprocessors;
2.  a selected regional endpoint and a model and feature that are expressly
    eligible for the required data-location commitment;
3.  no global endpoint or unsupported grounding, logging or preview feature;
4.  prompt and response logging disabled or regionally controlled where
    possible, with an approved exception for any required abuse monitoring;
5.  minimal fields or redacted documents rather than whole mailboxes; and
6.  a tested fallback that fails closed rather than sends data to an
    unapproved provider.

Google Cloud lists generative AI services among services that can be configured
for data location, subject to its service terms and feature exclusions. The
team must verify the exact model, endpoint and features used. It should not turn
that general listing into a blanket “all data stays in Singapore” claim.

### Production PDPA checklist

Before processing real data, Averis should:

1.  Map the personal data, purpose, controller, processors, destinations,
    access paths, retention and deletion.
2.  Confirm the lawful processing basis, provide the required notice, and
    disclose the cross-border processing and recipient categories.
3.  Select and document a section 129 transfer condition. Complete a transfer
    impact assessment where relying on comparable law or adequate protection,
    or use documented due diligence and contractual safeguards where
    applicable.
4.  Put processor security, confidentiality, incident, subprocessor, deletion
    and audit duties in contracts.
5.  Encrypt data in transit and at rest, use least privilege, separate tenants,
    scan uploads, rotate secrets and test deletion and access requests.
6.  Set short, purpose-based retention and do not retain prompts, outputs or
    source files merely because storage is available.
7.  Perform a data protection impact assessment and retain human authority over
    operational decisions.
8.  Establish a breach runbook. The Commissioner's current guideline requires
    qualifying breaches to be notified as soon as practicable and no later
    than 72 hours from occurrence.
9.  Check whether a data protection officer is mandatory. The Commissioner
    lists thresholds including more than 20,000 data subjects, more than 10,000
    subjects' sensitive or financial data, or regular and systematic
    monitoring.

The exact transfer ground and DPO requirement depend on Averis's real data and
operations. The team should say “we have a deployment checklist and a blocked
production gate,” not “the architecture is already PDPA-certified.”

## Competition rules audit

The audit uses the repository copy of the official rules. The organisers may
change the rules, so the team must also recheck the official communication
channel before submission.

| Requirement                     | Current finding                                                                                                               | Risk and required action                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI is a key component           | Gemini client exists; core AI workflow is not implemented                                                                     | **High.** Ship and demonstrate actual AI classification or extraction. A configured key is not meaningful integration.                                                                      |
| Meaningful cloud use            | Cloud Run, registry, secrets and database are live                                                                            | **Medium.** Show the working workflow running in cloud, not only health checks and deployment infrastructure.                                                                               |
| Work inside official duration   | Git history starts on 18 September, but `docs/research/design/README.md` says its Layerhand research was read on 16 September | **High.** Do not use pre-window output in the submission; recreate necessary work during the window and ask the organisers how preparatory research should be treated.                      |
| Original work and no plagiarism | Sources are generally cited, but unrelated Layerhand material remains in the tree                                             | **High.** Remove unrelated submission content, preserve attribution, and explain any reused third-party assets and licences. Deletion does not erase history, so do not conceal the timing. |
| Preliminary prototype           | Code exists, but the product flow does not                                                                                    | **High.** Implement a judge-usable classify, compare and review path before recording.                                                                                                      |
| Final working prototype         | Not met today                                                                                                                 | **Critical for finals.** A readiness screen is not the promised product.                                                                                                                    |
| Clear README and setup          | No root `README.md` exists                                                                                                    | **Fail today.** Add setup, architecture, demo, limitations, data and licence sections.                                                                                                      |
| Public functional demo          | Deployment infrastructure exists; product functionality is absent                                                             | **Fail today.** Publish and test an unauthenticated judge path using synthetic data.                                                                                                        |
| Video at most five minutes      | No final video was verified                                                                                                   | Record to about 4:40–4:50 and reject an export over 5:00; each extra 30 seconds costs one mark.                                                                                             |
| Slides and documentation        | Research and technical docs exist; final public deck was not verified                                                         | Publish a deck covering architecture, implementation, challenges and roadmap.                                                                                                               |
| Team eligibility and size       | Not verifiable from the repository                                                                                            | Obtain a team attestation against the eligibility and two-to-five-member rules.                                                                                                             |
| Repository licence              | MIT is implemented with unanimous contributor approval                                                                        | Preserve required third-party terms, notices and attribution.                                                                                                                               |

The largest rules threat is not legal wording. It is describing planned AI,
review and reconciliation as if they are already a working prototype.

## Repository licence decision

**Decision: MIT is implemented.** Every contributor confirmed approval, and
the root `LICENSE` grants the MIT terms under `Copyright (c) 2026 Averis
contributors`. MIT is short and permissive, requires preservation of its
copyright and licence notice, and disclaims warranty and liability. It is
compatible with the rules' statement that participants retain IP while giving
organisers a separate non-exclusive, royalty-free promotional licence.

The MIT grant covers team-authored software and associated documentation.
Organiser-provided data and documents, trademarks, logos, fonts, icons and any
other third-party material remain subject to their respective terms. Preserve
their notices and attribution, and do not imply that Averis relicensed material
it does not own.

## Ten hard questions and answers

Each answer is limited to what the evidence supports. The “unlock” is the
minimum fix required before the team can use the stronger answer in a demo.

### 1. Who is liable when Averis misses a discrepancy?

**Answer:** Treat Averis like aircraft automation: redundant systems can warn,
cross-check and reduce workload, but the pilot in command still owns the final
operational decision. Likewise, a named Averis reviewer owns the high-risk
release decision, while the deploying organisation remains accountable for
the system, procedures, training and monitoring; legal liability may still be
shared according to the cause, contracts and applicable law.

**Unlock:** implement the approval policy, named decision ownership, audit
trail and contractual review before production.

### 2. Is "human in the loop" just a disclaimer that shifts blame?

**Answer:** No. Averis is a semi-automated assistant that simplifies routine
comparison and asks staff to intervene when an alert or uncertain result needs
judgment; it does not replace the operator's role. As with aircraft or
spacecraft automation, the organisation owns the automation and safety
process, while the authorised human retains final control.

A rare failure can still be material, but the team must not compare a shipping
document miss directly with an aircraft crash or quote an unmeasured `0.001%`
failure rate. The defensible point is that low-frequency, high-consequence
exceptions justify human review and shared organisational accountability.

**Unlock:** build a real review queue and prohibit silent or automatic
clearance of uncertain and high-risk cases.

### 3. Does one missed email really cost MYR 5,200?

**Answer:** Not automatically; the cited MYR 5,000 customs fine and MYR 200
amendment fee are conditional Malaysia tariff exposures from the research, not
an estimate of the total loss from every miss. A missed case may also create
delay, rework, payment disruption, customer dissatisfaction and renewal or
reputation risk, but those effects depend on the incident and cannot be reduced
to one universal amount.

The honest claim is that one missed case **can** become materially more costly
than its amendment fee, not that every miss costs MYR 5,200 or causes a
reputation crisis.

### 4. What finds a shipment if the email never arrives?

**Answer:** The mandatory second gate starts from an independent list of active
orders or bookings and compares it with the cases processed from email. If the
two lists do not tally when a BL-check case becomes due, Averis alerts the
responsible person before the cutoff.

The system should identify where evidence indicates the failure occurred, but
it must not automatically blame the sender: the cause could be non-sending,
mail delivery, ingestion, classification, matching or a stale booking feed.
Early detection makes the exception manageable; it does not make the missing
case harmless.

**Unlock:** implement a signed synthetic CSV for the demo, with source
freshness and audit history, then replace it with an authenticated ERP, TMS or
carrier feed.

### 5. Does an Averis annotation legally amend the Bill of Lading?

**Answer:** No; it is a separate comparison report and the source BL remains
unchanged. Averis does not assume authority or permission; even when a user is
authorised to request a correction, the carrier's authorised process must issue
the actual amended or replacement BL.

### 6. Can the report be relied on as evidence?

**Answer:** It can support an operational decision or audit when the source,
integrity, versions, timestamps and human sign-off are preserved, but Averis
does not guarantee admissibility or conclusive legal effect. **Unlock:** add
source hashes, versioned decisions, append-only history and an evidence export.

### 7. How is sending real shipping documents to the AI PDPA-compliant?

**Answer:** It is not approved on the current free-tier route; the demo uses
synthetic data. **Unlock:** minimise the data and complete notice, processor
contracts, section 129 transfer analysis, security, retention, impact assessment
and provider approval before real documents are enabled.

### 8. Does Singapore hosting mean the AI data stays in Singapore?

**Answer:** No; Cloud Run and database regions do not prove the inference
service's processing location. We will claim regional processing only for the
exact contracted service, model, endpoint and features covered by the
provider's data-location terms.

### 9. Will the second gate create a review queue full of noise?

**Answer:** It may if it is tuned badly, so Averis must show escalation recall,
escalation precision, queue age and override causes rather than quote accuracy
alone. **Unlock:** run held-out tests, publish the confusion matrix and set
thresholds from measured loss and review capacity.

### 10. Are you compliant with every competition rule today?

**Answer:** No: cloud infrastructure and the MIT licence exist, but the core
product, root README, public functional demo and final video are not complete,
and pre-window Layerhand research needs organiser clarification. The team
should present those as a dated completion checklist, not give a false blanket
yes.

## Claims the team must not make

- “Averis is 100% accurate” or “Averis cannot miss an email.”
- “Two or three AI models guarantee correctness.”
- “Every missed email costs MYR 5,200.”
- “The challenge's `gross_weight_kg` is always the SOLAS VGM.”
- “The Averis report amends the BL” or “is legally binding evidence.”
- “Human approval removes Averis's responsibility.”
- “Singapore hosting proves all inference stays in Singapore.”
- “The free Gemini API is safe for confidential production documents.”
- “Synthetic test data proves the production system is PDPA-compliant.”
- “The AI, second gate, audit trail and review system are live” until the
  code and demo show them.

## Sources

### Internal and competition sources

- [Hackathon rules and regulations](/docs/sources/google-docs/rules-and-regulations.md)
- [Technical requirements](/docs/TRD.md)
- [Deployment notes](/docs/references/deployment.md)
- [Missed-email stakes and second-gate research](stakes.md)
- [Organiser problem statement](/docs/sources/google-drive/problem-statement.md)

### Legal, privacy and provider sources

- [Malaysia Personal Data Protection Commissioner FAQ](https://www.pdp.gov.my/ppdpv1/en/faq/)
- [Malaysia cross-border transfer guideline](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-guidelines-on-cross-border-transfer-of-personal-data-cbpdt/)
- [Malaysia data-breach notification guideline](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-guidelines-on-data-breach-notification-dbn/)
- [Malaysia Personal Data Protection Amendment Act 2024 page](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/)
- [Google Gemini API additional terms](https://ai.google.dev/gemini-api/terms)
- [Google Cloud services with data residency](https://cloud.google.com/terms/data-residency)
- [Vertex AI zero data retention and training restriction](https://cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention)
- [IMO Bill of Lading functions](https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/1498.pdf)
- [UNCITRAL Model Law on Electronic Transferable Records](https://uncitral.un.org/en/texts/ecommerce/modellaw/electronic_transferable_records)
- [GitHub guidance on repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [MIT licence summary and text](https://choosealicense.com/licenses/mit/)
