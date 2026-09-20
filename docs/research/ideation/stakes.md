# The Stakes of One Missed Document-Checking Email

One missed inbox message is not automatically a financial loss. One missed
message that asks staff to check a draft Bill of Lading (BL), however, can let
an error survive until a filing, loading or free-time deadline. At that point
the consequence can move from rework to an amendment fee, a customs fine,
daily demurrage, delayed payment or a rolled container.

Contents:

1.  [Action Summary](#action-summary)
1.  [Conclusion](#conclusion)
1.  [Five Supporting Data Points](#five-supporting-data-points)
1.  [What the Inbox Scale Means](#what-the-inbox-scale-means)
1.  [There May Be No Second Notification](#there-may-be-no-second-notification)
1.  [When the Missing Case Must Be Handled](#when-the-missing-case-must-be-handled)
1.  [Whether a Penalty Becomes a Reputation Crisis](#whether-a-penalty-becomes-a-reputation-crisis)
1.  [Business Effects Beyond the Penalty](#business-effects-beyond-the-penalty)
1.  [Evidence Strength and Safe Claims](#evidence-strength-and-safe-claims)
1.  [Issue 12 Q&A Stress Test](#issue-12-qa-stress-test)
1.  [Where the Second Gate Belongs](#where-the-second-gate-belongs)
1.  [Second-Gate Decision Rule](#second-gate-decision-rule)
1.  [Limits of the Evidence](#limits-of-the-evidence)
1.  [Candidate Opening Line](#candidate-opening-line)

## Action Summary

**Decision:** make Gate 2 an independent reconciliation between expected
shipments and email cases. Do not use another inbox classifier as the only
backup.

Build the following:

1.  Import active orders or bookings from an ERP, TMS, carrier feed or a
    clearly labelled synthetic `expected_shipments.csv` for the demo.
2.  Store the order or OC number, booking reference, lifecycle state, required
    documents, actual cutoff, owner and source freshness.
3.  Reconcile the shipment ledger against the case ledger and return
    `CASE_PRESENT`, `DOCUMENT_MISSING`, `MISSING_CASE`, `UNMATCHED_CASE`,
    `DUPLICATE_OR_AMBIGUOUS` or `SOURCE_STALE`.
4.  Start the missing-case clock only when the shipment reaches
    `DRAFT_BL_EXPECTED` or `BL_CHECK_REQUIRED`. Booking-specific cutoffs must
    override prototype defaults.
5.  Demonstrate one matched case, one case with a missing BL, and one expected
    shipment with no email at all.
6.  Route stale data and uncertain matches to review; never use them to clear a
    shipment.

**Limit:** the supplied bundle can demonstrate missing documents in received
emails, but it has no independent order ledger or authoritative timing data.
Without an external expected-shipment source, Averis can protect received mail
from misclassification but cannot detect an email that never arrived.

## Conclusion

The evidence supports a qualified **yes**: missing even one actionable BL
comparison email can be critical. The strongest Malaysia-specific example is
Maersk's warning that a BL or manifest amendment made within five days of
vessel arrival can attract a customs fine of up to **MYR 5,000**, plus a
**MYR 200** BL amendment fee. Delay can then add daily demurrage and detention.

The evidence does **not** support saying that every missed email creates a
critical loss. The loss depends on the email being actionable, the field at
risk, and whether a deadline is crossed. The product claim should therefore be:

> A single missed document-checking request can expose a shipment to material
> fees, delay, payment disruption or a missed sailing; Averis adds a second
> routing gate so an uncertain negative classification is never silently
> discarded.

There is an important refinement to that recommendation. A second email
classifier cannot discover an email that never reached the inbox or was
discarded upstream. The decisive second gate must therefore be an independent
**shipment-to-case reconciliation gate**. It starts from the list of active
bookings and containers, not from the list of received emails, and asks whether
each shipment has the expected case, SI, draft BL and tracking events.

## Five Supporting Data Points

1.  **Up to MYR 5,200 before delay charges.** Maersk Malaysia states that BL
    or manifest amendments made within five days of vessel arrival may incur a
    customs fine of up to **MYR 5,000**, borne by the consignee, plus a
    **MYR 200** BL amendment fee. Its tariff also lists a MYR 200 transport
    document amendment fee per amendment. This is the clearest local evidence
    that one late correction can create a four-figure consequence.

    Source: [Maersk Malaysia import procedures and charges](https://www.maersk.com/local-information/asia-pacific/malaysia/import).

2.  **MYR 80 to MYR 815 per container per day after free time.** The same
    Maersk Malaysia tariff lists combined import demurrage and detention from
    **MYR 80 to MYR 230 per day** for dry containers and **MYR 223 to
    MYR 815 per day** for reefer or special equipment, depending on container
    size and delay tier. These charges are not caused by every document error,
    but they are the direct time-dependent exposure if a missed request delays
    clearance or return beyond free time.

    Source: [Maersk Malaysia combined demurrage and detention tariff](https://www.maersk.com/local-information/asia-pacific/malaysia/import).

3.  **65% to 80% of documentary-credit presentations are initially refused.**
    The ICC Banking Commission estimates that this share of presentations is
    refused on first presentation. It says the result is at least delayed
    settlement or financing and increased bank fees. Common causes include
    conflicting data, missing documents, and incorrect ports of loading or
    discharge: fields that overlap directly with this challenge.

    Source: [ICC Technical Advisory Briefing No. 3, 27 June 2022](https://library.iccwbo.org/content/tfb/BRIEFINGS/20220627_TA_Briefing_No3_reducing_discrepancy_rates.pdf).

4.  **USD 15.4 billion in detention and demurrage was collected by nine
    carriers over five years.** The US Federal Maritime Commission reports
    that nine major ocean carriers collected roughly this amount between
    1 April 2020 and 31 March 2025. This does not assign those charges to
    documentation mistakes, but it establishes that delay charges are a large,
    recurring cost pool rather than a hypothetical edge case.

    Source: [US Federal Maritime Commission detention and demurrage data](https://www.fmc.gov/detention-and-demurrage/).

5.  **One weight-discrepancy dispute produced multiple direct expenses.** In
    _Stournaras Stylianos Monoprosopi EPE v Maersk A/S_ (7 October 2024), a
    dispute involving shipper-declared weights and actual verified weights on
    Bills of Lading ended with Maersk succeeding on a counterclaim for
    **AED 35,541.66** in invoices, **EUR 8,409.60** in cargo-destruction costs,
    and **EUR 5,420** in container demurrage. The case is not evidence that an
    ordinary typo always causes those losses; it is a dated public example of
    one document-data problem expanding into several cost categories.

    Source: [_Stournaras Stylianos Monoprosopi EPE v Maersk A/S_ [2024] EWHC 2494 (Comm)](https://www.bailii.org/ew/cases/EWHC/Comm/2024/2494.html).

There is also a non-price stop condition. The International Maritime
Organization states that verified gross mass is a condition for loading a
packed container. It warns that an unnoticed weight discrepancy can cause
incorrect stowage, collapsed container stacks or containers lost overboard.
This supports treating an unexplained weight discrepancy as high risk. It does
**not** prove that the challenge's `gross_weight_kg` field is the SOLAS
verified gross mass: a document may state cargo gross weight while VGM also
includes the container tare mass. The product must not describe the two as
identical unless the source document and carrier workflow establish that link.

Source: [IMO verification of packed-container gross mass](https://www.imo.org/en/ourwork/safety/pages/verification-of-the-gross-mass.aspx).

## What the Inbox Scale Means

The organisers say Averis staff may receive **2,000 emails per day**. The
synthetic bundle contains 126 document-bearing emails among 520 messages, or
**24.23%**. The bundle is not a measured production class distribution, but it
can illustrate the scale of false negatives:

| Combined recall | Illustrative missed document emails per day | Approximate frequency |
| --------------- | ------------------------------------------- | --------------------- |
| 99%             | 4.85                                        | Nearly five per day   |
| 99.9%           | 0.48                                        | About one every 2 days |
| 99.99%          | 0.05                                        | About 18 per year     |

The calculation is `2,000 x (126 / 520) x (1 - recall)`. It is a sensitivity
test, not a forecast. Production prevalence and measured recall must replace
the bundle ratio before this appears as a customer claim.

The important design implication is that **99.9% sounds excellent but is not a
safe stopping point at this volume**. A second gate is justified because the
cost of reviewing a small disagreement queue is bounded, while the tail loss
from one missed time-critical request can be much larger.

## There May Be No Second Notification

There is no dependable industry-wide interval after which a second warning
will arrive. The answer can be **never**.

The challenge bundle demonstrates the problem:

- `email_507` and `email_509` explicitly say that the draft BL is missing.
  Every booking, shipment and document reference in those messages occurs only
  once across all 520 inbox records. There is no targeted follow-up from which
  the system could recover either case.
- A keyword scan finds 18 messages containing reminder or follow-up language.
  Eleven are spam. The seven operational reminders merely say to submit SI
  and AED for “all pending shipments” and contain no shipment identifier that
  links them to `email_507` or `email_509`.
- A generic reminder can therefore be both real and operationally useless. If
  filtered as noise, it removes the final weak signal; if retained, it still
  does not identify the missing container.

Carrier practice does not create a safe fallback. Maersk's House Bill of
Lading terms state that failure to notify a party of the goods' arrival does
not make the carrier liable and does not relieve the merchant of its
obligations. A Maersk advisory tells customers to track cargo themselves
rather than rely on an arrival notice.

Source: [Maersk House Bill of Lading terms, clauses 4.2 and 24](https://terms.maersk.com/HBL).

Some routes do send a later signal, but its timing varies. CMA CGM's 2026
Gdansk import guide says its arrival notice is normally sent about eight days
before ETA, but only one to two days before ETA for a feeder vessel. That is an
arrival process, not a guaranteed repeat of the original BL-check request, and
it may be too late to correct an export-side document error cheaply.

Source: [CMA CGM Gdansk import process, 5 January 2026](https://www.cma-cgm.com/assets/public/documents/CMA%20CGM%20Import%20process.pdf).

DCSA describes the underlying industry problem directly: milestone data is
often exchanged inconsistently, late or not at all. Its Track and Trace
standard exists to provide on-demand visibility into load, discharge, gate,
transshipment, pickup and drop-off events.

Source: [DCSA Track and Trace standard](https://dcsa.org/standards/track-and-trace).

The product must therefore never promise “we will catch the second email.” It
should promise “we do not need a second email to know that a shipment has no
case.”

## When the Missing Case Must Be Handled

A missing case should be handled at the **first failed expectation**, not when
a later email happens to arrive and not when demurrage has started. The clock
must come from the booking and shipment schedule.

| Checkpoint | Initial product action | Why it cannot wait |
| ---------- | ---------------------- | ------------------ |
| Mail received but no case created | Alert within 5 minutes | Detects ingestion, parser and classifier failures while the original message is still available |
| Active booking has no matched case or required document | Reconcile continuously; warn at 24 hours before the earliest applicable cutoff and page an owner at 4 hours | Detects a never-received email by using a source outside the mailbox |
| SI, VGM or customs cutoff reached with a missing artifact | Hard escalation; do not mark the shipment ready | Some routes use a no-SI-no-load rule and roll the container to the next vessel |
| Expected load, departure, transshipment, discharge or gate event is absent | Open an exception as soon as the carrier event's agreed tolerance expires | This is how a physically missing or rolled container is detected without waiting for prose email |
| Free time is approaching expiry | Warn 48 hours before expiry and escalate until resolved | Once free time expires, exposure becomes a daily charge |

The 5-minute, 24-hour, 4-hour and 48-hour values are proposed prototype
defaults, not published Averis service levels. They must be made configurable
and validated with Averis operations. Booking-specific carrier cutoffs always
override them.

A route-specific Maersk example shows why the actual cutoff matters: its 2024
Israel policy requires SI at least 34 hours before vessel arrival at the
compliance load port. A late SI causes the cargo to be rolled to the next
available vessel, with the rolling cost borne by the origin customer.

Source: [Maersk no-SI-no-load policy, 10 September 2024](https://www.maersk.com/news/articles/2024/09/10/introduction-of-no-shipping-instructions-no-load-policy-for-the-import-cargo-arriving-in-israel).

To identify the actual missed case, the reconciliation service needs a
shipment ledger containing, where available:

- booking, container, BL, SI, purchase-order and internal shipment IDs;
- shipper, consignee, vessel, voyage, port pair and planned timestamps;
- required artifacts and their actual receipt times;
- carrier milestones such as gate-in, load, departure, transshipment,
  discharge and gate-out; and
- the responsible operations owner and the next hard cutoff.

Matching should use all available identifiers. A generic “pending shipments”
reminder with no identifier belongs in an unmatched-exceptions queue; it must
not be silently discarded or treated as proof that a specific case was found.

If Averis cannot provide a booking, TMS, ERP, carrier or terminal feed, the
system cannot reliably identify an email that never arrived. In that case the
product must say that it protects against inbox misclassification, not against
unknown missing shipments.

## Whether a Penalty Becomes a Reputation Crisis

A MYR 5,000 customs fine by itself is usually an operational incident, not
automatically a public reputation crisis. Reputation risk becomes material
when the incident is visible to a customer or regulator, repeats, causes a
missed sailing or stockout, touches a safety-critical field, or is handled
slowly or dishonestly.

The escalation path is:

```text
document miss
  -> missed cutoff, correction or hold
  -> customer delivery or payment failure
  -> SLA breach, complaint or regulatory scrutiny
  -> repeated/public failure
  -> reputation and contract-renewal risk
```

The fine is therefore a poor measure of reputation damage. Better leading
indicators are missed sailings, aged unresolved exceptions, repeat errors by
customer or lane, customer complaints, manual rework, and whether the customer
learned of the problem before Averis did.

General customer research shows the possible sensitivity but should not be
presented as an Averis-specific forecast. PwC found that 32% of surveyed
customers globally would stop doing business with a brand they loved after one
bad experience. The survey is cross-industry and mainly consumer-facing, so it
supports the direction of the risk rather than a 32% churn prediction for
shipping customers.

Source: [PwC Future of Customer Experience Survey 2017/18](https://www.pwc.com/us/en/advisory-services/publications/consumer-intelligence-series/pwc-consumer-intelligence-series-customer-experience.pdf).

## Business Effects Beyond the Penalty

The direct amendment fee or fine is only the smallest visible component. A
missed case can affect the business through:

1.  **Service and revenue.** A rolled or held container can breach a customer
    promise, threaten renewal and move future volume to another provider.
2.  **Cash conversion.** Discrepant trade documents can delay settlement or
    financing and add bank processing fees, as the ICC evidence above shows.
3.  **Inventory and production.** Late inputs create stockouts or force safety
    stock and expedite costs; late finished goods postpone revenue.
4.  **Operating capacity.** Staff must search mailboxes, contact carriers,
    amend documents, rebook freight, explain exceptions and defend invoices.
5.  **Legal and compliance exposure.** Maersk's terms place duties, taxes,
    fines, expenses and losses caused by incorrect or untimely declarations on
    the merchant, while failure to send an arrival notice does not remove the
    merchant's obligations.
6.  **Safety.** An unresolved weight discrepancy may affect stowage and loading
    when it concerns VGM. The challenge's `gross_weight_kg` must not be called
    VGM without verifying what the source document represents.

Research on 885 publicly announced supply-chain glitches found effects that
extended beyond the incident charge: affected firms had 6.92% lower sales
growth, 10.66% higher cost growth and 13.88% higher inventory growth relative
to controls, and the measures did not improve during the following two years.
Those are portfolio-level associations for material public disruptions, not
the expected effect of one missed email. They show why repeated operational
misses should be treated as a business-performance risk rather than a fee-only
problem.

Source: [Hendricks and Singhal, _Management Science_ 51(5), 2005](https://doi.org/10.1287/mnsc.1040.0353).

## Evidence Strength and Safe Claims

The argument is strongest when each source is used only for what it proves.

| Evidence | Strength | Safe use in a pitch | Claim to avoid |
| -------- | -------- | ------------------- | -------------- |
| Maersk Malaysia tariff and amendment rules | Strong, primary and Malaysia-specific | A late qualifying amendment can create a MYR 200 fee and a customs fine of up to MYR 5,000; delay can add published daily charges | Every missed email automatically costs MYR 5,200 |
| IMO VGM rule | Strong, primary international safety rule | VGM must be available for loading, and an unnoticed VGM error can create stowage risk | Every difference in the challenge's `gross_weight_kg` is a SOLAS VGM breach |
| ICC discrepancy briefing | Strong, primary industry guidance | Trade-document discrepancies frequently delay first presentation, settlement or financing | 65% to 80% of all Bills of Lading are wrong |
| FMC detention and demurrage data | Strong, regulator-collected aggregate | Delay charges are a large, recurring industry cost pool | Documentation errors caused all USD 15.4 billion |
| 2024 court judgment | Strong incident evidence | A weight-data dispute can produce several categories of direct expense | The awarded amounts are an average loss per error |
| Synthetic inbox calculations | Exact for the supplied bundle only | At the challenge's scale, a high apparent recall can still leave misses in a sensitivity analysis | 24.23% is Averis's production document-email prevalence |
| PwC and supply-chain studies | Credible contextual evidence | Customer experience and material disruptions can affect retention and operating performance beyond the immediate fee | One Averis email miss causes 32% churn or the published firm-level performance changes |

This framing makes the research defensible because it separates observed
facts, tariff exposure, incident examples and illustrative calculations.

## Issue 12 Q&A Stress Test

The research can defend the business-stakes and control-design part of a
judge's cross-examination. It cannot replace the separate legal, evidentiary,
privacy, rules and licensing work required by issue #12.

1.  **“Does one missed email always cost MYR 5,200?”** No. The amount is a
    conditional tariff exposure when a qualifying amendment is made inside the
    specified Malaysia window. The core claim is “can,” not “will.”
2.  **“Did you prove that 24.23% of Averis's real inbox needs document
    checking?”** No. That is the synthetic bundle's document-bearing share and
    is used only for sensitivity analysis.
3.  **“Why not just make the email classifier more accurate?”** Accuracy on
    received mail cannot detect a message that never arrived or was removed
    upstream. The shipment ledger supplies the independent expected-case list.
4.  **“What if the shipment feed is late or wrong?”** Gate 2 must expose feed
    freshness, source and last-event time. A stale feed is itself
    `NEEDS_REVIEW`; it must never silently clear a shipment.
5.  **“Why not run three AI models on every email?”** Repeated models can share
    the same blind spot and increase noise. Use mandatory independent
    reconciliation for completeness, then a third human or independent check
    only for amber and red cases.
6.  **“Is your gross-weight field legally the SOLAS VGM?”** Not necessarily.
    The system treats a discrepancy as high risk but must label it VGM only
    when the source and workflow prove that equivalence.
7.  **“Does a MYR 5,000 fine prove a reputation crisis?”** No. Reputation risk
    comes from customer-visible, repeated, safety-related or poorly handled
    failures. The fine is evidence of direct exposure, not a reputation metric.
8.  **“Who is legally liable if Averis misses a discrepancy?”** This research
    does not allocate legal liability. Operationally, the product records
    provenance and requires a named human decision owner for high-risk release;
    the legal answer remains part of issue #12.
9.  **“Does an Averis annotation amend the Bill of Lading or carry legal
    authority?”** This research does not establish that. The safe product
    position is that it is decision-support output until issue #12 confirms the
    evidentiary wording and required human authorization.
10.  **“Does this solve PDPA, cross-border processing, competition rules and
    licensing?”** No. Those are separate issue #12 deliverables. The current
    synthetic dataset reduces prototype data risk but says nothing about a
    production deployment's legal basis, processor contracts, data transfer,
    retention or access controls.

The last three answers are deliberately boundaries, not evasions. Claiming
that cost research answers legal or privacy questions would weaken the defence.

## Where the Second Gate Belongs

The decisive second gate belongs **between the independent shipment ledger and
the case ledger**, not merely after the five-way email classifier.

```text
Mailbox -> classify and extract identifiers -> case ledger
                                              |
Booking / TMS / ERP / carrier API -> shipment ledger
                                              |
                         Gate 2: reconcile every active shipment
                                              |
                    matched case      orphan or overdue shipment
                         |                         |
                 document checks             exception queue
```

An independent binary check on every non-`BL_COMPARISON` classification remains
valuable as an **email-intake safety filter**. It catches false-negative
classifications, but it cannot be the only second gate because it still starts
from received mail.

The intake filter should not simply repeat the same multiclass prompt.
Correlated systems repeat the same mistake. It should combine:

- a separate binary question: “Could this email be asking someone to check,
  verify, confirm, approve or amend a draft BL against an SI?”;
- deterministic signals such as SI/BL attachments, document filenames,
  shipment references, and check-or-confirm language; and
- a different prompt or model path from Gate 1 where feasible.

Any disagreement is an escalation, not an automatic `BL_COMPARISON` verdict.
The reconciliation gate separately catches shipments for which no usable email
case exists at all.

## Second-Gate Decision Rule

Use two independent rules rather than one arbitrary confidence number.

For received email:

```text
escalate when
P(actionable BL request | email) x plausible miss loss > review cost
```

For the shipment ledger:

```text
escalate when
an expected case, document or milestone is absent at its scheduled checkpoint
```

Until issue #10 measures calibrated probabilities on this dataset, Gate 2
should use these conservative rules:

1.  Every active shipment must have an owner, next cutoff and expected artifact
    list even when no related email has arrived.
2.  An SI or BL attachment is a hard trigger for the BL candidate or review
    queue, regardless of Gate 1's category.
3.  A missing counterpart document is `NEEDS_REVIEW` with
    `missing_attachment`; it is not a negative classification.
4.  Gate disagreement, unreadable content or a missing required field goes to
    human review.
5.  A non-BL email exits only when both intake checks agree and no hard trigger
    fires.
6.  Before a BL comparison is marked `OK`, separately verify the
    safety- and release-critical fields: `gross_weight_kg`, `consignee`,
    `port_of_loading`, and `port_of_discharge`.
7.  A shipment cannot close while its expected case, document or milestone is
    absent, even if the inbox contains no alert.

The exact probability threshold belongs in issue #10 after calibration. This
research supports the gate location and asymmetric treatment of false
negatives; it does not manufacture an unmeasured confidence cutoff.

## Limits of the Evidence

- Carrier tariffs show possible exposure, not the probability that a missed
  email will incur each charge.
- Demurrage can arise from congestion and operational causes unrelated to
  documents. It is included only as the time-dependent exposure when a
  document delay prevents clearance or return.
- The ICC figure concerns documentary-credit presentations, not every BL.
  It supports the prevalence and financial effect of inconsistent trade
  documents, not a production error rate for Averis.
- The court case involved alleged fraudulent weight data, so its amounts are
  an incident example rather than an average loss estimate.
- The synthetic challenge bundle cannot establish Averis's real category mix
  or financial loss distribution. Production validation needs actual inbox
  prevalence, missed-request incidents, review time, and charge records.
- Carrier notification and cutoff timings are route- and booking-specific.
  The cited 34-hour, eight-day and one-to-two-day examples are proof of
  variation, not universal service levels.
- The proposed operational alert intervals require validation with Averis.
  They are product defaults, not facts discovered in the supplied material.
- The customer-experience and supply-chain-performance studies are broad
  evidence of downstream risk, not estimates of Averis customer churn or the
  effect of one missed email.
- Detecting an email that never arrived requires an independent shipment or
  booking source. No inbox-only model can solve that blind spot.

## Candidate Opening Line

> One missed email may never produce a second warning; the next signal can be
> a rolled container or a MYR 5,000 customs fine. Averis reconciles every
> active shipment to a case before the deadline, instead of waiting for the
> reminder.
