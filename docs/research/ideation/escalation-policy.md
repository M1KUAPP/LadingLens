# Human Escalation Policy and Refusal Interface

This document formalizes the `NEEDS_REVIEW` escalation policy, defines the
underlying decision thresholds using empirical data from the Jev decision
layer, details the trigger conditions for all four `review_reason` codes, and
specifies the on-screen presentation for the judge during demonstrations.

Contents:

1.  [Executive Summary](#executive-summary)
1.  [Empirical Jev Calibration and Probability Distribution](#empirical-jev-calibration-and-probability-distribution)
1.  [Decision Thresholds and Operating Bands](#decision-thresholds-and-operating-bands)
1.  [Mapping Signals to Review Reasons](#mapping-signals-to-review-reasons)
    1.  [Reason: Missing Attachment](#reason-missing-attachment)
    1.  [Reason: Unreadable Attachment](#reason-unreadable-attachment)
    1.  [Reason: Wrong Document Type](#reason-wrong-document-type)
    1.  [Reason: Missing Required Value](#reason-missing-required-value)
1.  [Judge Experience and On-Screen Presentation](#judge-experience-and-on-screen-presentation)
    1.  [The Danger of Silent Guesses](#the-danger-of-silent-guesses)
    1.  [Three-Component Visual Anatomy](#three-component-visual-anatomy)
1.  [Recommended Demo Exhibits](#recommended-demo-exhibits)
1.  [System Architecture and Data Model Integration](#system-architecture-and-data-model-integration)

## Executive Summary

The organizers of the hackathon highlighted that reliability and transparent
human-in-the-loop review are critical criteria for winning solutions. In
previous competitions, teams that claimed their AI "never guesses" stumbled
because their systems silently failed or showed unconvincing metrics such as
"Unverified: 0".

Averis takes the opposite stance: **we actively showcase intelligent refusal**.
When automation encounters ambiguity, corruption, or missing documents, it
refuses to guess, halts the automated pipeline, and presents the human operator
with a calibrated explanation, confidence metric, and side-by-side evidence.

This document sets the policy for when and how Averis escalates to human review,
supported by real experiments against the Jev (`jev-1.13.0`) model and analysis
of the 520-email hackathon dataset.

## Empirical Jev Calibration and Probability Distribution

Using the live TypeSafe Jev API (`https://api.typesafe.ai/v1/systemone`), we ran
representative field-equivalence tests on actual shipping entities and party
names found in the dataset.

Because Jev is trained via Reinforcement Learning for Calibrated Decisions
(RLCD), its `noul` score represents a well-behaved probability $P(\text{Match})$
rather than arbitrary model confidence:

| Scenario Tested        | Entity 1 (SI)                                          | Entity 2 (BL)                                              | Jev $P(\text{Match})$ | Classification |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | --------------------- | -------------- |
| Exact match            | `ASIA PACIFIC PAPERBOARD TRADING PTE LTD`              | `ASIA PACIFIC PAPERBOARD TRADING PTE LTD`                  | `0.98`                | Match          |
| Punctuation / Case     | `AL GURG STATIONERY L.L.C.`                            | `al gurg stationery llc`                                   | `0.97`                | Match          |
| Address Expansion      | `ROXCEL TRADING GMBH, OPERNRING 3-5`                   | `ROXCEL TRADING GMBH, OPERNRING 3-5, 1010 VIENNA, AUSTRIA` | `0.96`                | Match          |
| Typo / Phonetic        | `TOYOTA TSUSHO CORPORATION`                            | `TOYOTO TSUSHO COPRORATION`                                | `0.69`                | Uncertain      |
| Agency / Principal     | `APRIL FINE PAPER TRADING ON BEHALF OF ROXCEL TRADING` | `ROXCEL TRADING GMBH`                                      | `0.54`                | Uncertain      |
| Corporate Suffix       | `ACME LOGISTICS LLC`                                   | `ACME LOGISTICS LTD`                                       | `0.25`                | Mismatch       |
| Subsidiary / Affiliate | `PETRONAS CHEMICALS MARKETING (LABUAN) LTD`            | `PETRONAS CHEMICALS DERIVATIVES SDN BHD`                   | `0.10`                | Mismatch       |
| Completely Different   | `MEDITERRANEAN SHIPPING COMPANY`                       | `MAERSK LINE A/S`                                          | `0.01`                | Mismatch       |

### Observations

1.  **Clear Separability**: Definite matches score $\ge 0.96$; complete
    mismatches score $\le 0.10$.
2.  **Uncertainty Cluster**: Ambiguities involving typos ($0.69$) and legal
    representation ("on behalf of", $0.54$) fall squarely in the mid-range
    ($0.30 - 0.85$).
3.  **Strict Legal Sensitivity**: Jev distinguishes between distinct legal
    entities with the same stem name (`LLC` vs `LTD`, scoring $0.25$).

## Decision Thresholds and Operating Bands

Based on empirical data, three operational bands govern automatic decisions
versus human escalation:

```text
  0.00 ─────────────── 0.30 ──────────────────────── 0.85 ─────────────── 1.00
 [    Auto-Mismatch    ] [        NEEDS_REVIEW        ] [     Auto-Match     ]
   Defect Identified        Escalate to Human Auditor       Verified Correct
```

1.  **Auto-Match Band ($P \ge 0.85$)**:
    The system confirms the fields match. Automated processing continues without
    human intervention.
2.  **Escalation Band ($0.30 < P < 0.85$)**:
    The system identifies an ambiguous discrepancy. It flags the case as
    `NEEDS_REVIEW`, logs the exact score, and halts downstream dispatch until a
    human reviewer resolves the ambiguity.
3.  **Auto-Mismatch Band ($P \le 0.30$)**:
    The system confirms a clear discrepancy. Depending on the field (e.g.,
    critical fields like Container Number or Gross Weight), it either halts
    with an alert or records a definite defect for immediate correction.

## Mapping Signals to Review Reasons

The system classifies every escalated case into one of four standard
`review_reason` codes:

### Reason: Missing Attachment

- **Code**: `missing_attachment`
- **Signal**:
  1.  An incoming email is classified as `BL_COMPARISON` (or `SI_REQUEST`), but
      contains 0 or only 1 relevant attachment file.
  2.  Deterministic rule: `len(attachments) < 2` or failure to detect both
      document roles (one SI and one BL) among the attachments.
- **Example in Dataset**: `email_507` and `email_509` (email contains an SI text
  file, but the draft BL was never attached).

### Reason: Unreadable Attachment

- **Code**: `unreadable`
- **Signal**:
  1.  File parser raises an unrecoverable exception on read (e.g.,
      `pymupdf.FileDataError`, `zipfile.BadZipFile`).
  2.  Zero-byte or truncated file size (e.g. <1 KB corrupted PDF).
  3.  Image resolution or contrast below legibility threshold where OCR/Vision
      returns fewer than 10 total characters or explicitly reports illegibility.
- **Example in Dataset**: `email_511_BL.pdf` (775 bytes, corrupt header) and
  `email_515_BL.pdf` (765 bytes, corrupt structure).

### Reason: Wrong Document Type

- **Code**: `wrong_doc_type`
- **Signal**:
  1.  An attached file fails document-type classification via Jev or regex
      headers.
  2.  Specific detection of commercial auxiliary documents: Commercial Invoice,
      Packing List, Certificate of Origin, or Booking Confirmation.
  3.  Jev document-type `choice` confidence < 0.70 or choice is
      `other_document`.
- **Example in Dataset**:
  - `email_501`: Second attachment is a Commercial Invoice
    (`email_501_BL.txt`).
  - `email_502`: Second attachment is a Packing List (`email_502_BL.txt`).
  - `email_503`: Second attachment is a Certificate of Origin
    (`email_503_BL.txt`).

### Reason: Missing Required Value

- **Code**: `missing_value`
- **Signal**:
  1.  A mandatory comparison field is absent, blank, or contains placeholders
      such as `N/A`, `TBA`, `TBD`, `_______`, or `AS PER ATTACHED`.
  2.  Mandatory fields evaluated: `bl_number`, `shipper`, `consignee`,
      `port_of_loading`, `port_of_discharge`, `gross_weight_kg`,
      `container_count`.
- **Example in Dataset**: `email_516` (Gross Weight marked `N/A` and Net Weight
  marked `_______ MTS`).

## Judge Experience and On-Screen Presentation

### The Danger of Silent Guesses

When automated systems encounter missing or ambiguous data, naive LLM pipelines
hallucinate or quietly pass default values. Judges are keenly observant of this
vulnerability. Presenting a crisp, justified refusal proves system integrity.

### Three-Component Visual Anatomy

When a case enters `NEEDS_REVIEW`, the UI presents a structured, three-part
review card:

```text
+-----------------------------------------------------------------------------+
| [!] NEEDS REVIEW: Potential Consignee Mismatch                              |
+-----------------------------------------------------------------------------+
| REASON: Ambiguous Entity Equivalence (Score: 0.54)                          |
|                                                                             |
| [=================== 54% ===================]   Uncertainty Band [0.30-0.85]|
| 0% (Different)                                               100% (Identical|
|                                                                             |
| EXPLANATION:                                                                |
| Shipping Instruction lists 'ROXCEL TRADING GMBH', but Draft Bill of Lading  |
| designates 'APRIL FINE PAPER TRADING ON BEHALF OF ROXCEL TRADING'.           |
| Possible agent/principal relationship requiring confirmation.               |
|                                                                             |
| [ View SI Document ] [ View BL Document ]   [ Accept Match ] [ Mark Defect ]|
+-----------------------------------------------------------------------------+
```

The three components are:

1.  **The Status Banner and Categorical Reason**:
    A high-contrast banner with the badge `NEEDS REVIEW` and the explicit reason
    tag (`missing_attachment`, `unreadable`, `wrong_doc_type`, or
    `missing_value`).
2.  **The Calibrated Visual Metric**:
    For probabilistic evaluations, a horizontal probability gauge showing
    the exact percentage and highlighting the active decision band
    (Green/Amber/Red). For deterministic failures (e.g., unreadable file),
    an error diagnostic box showing file metadata (file size, MIME type,
    error string).
3.  **The Actionable Plain-Language Sentence**:
    A concise 1–2 sentence description detailing the exact discrepancy or
    defect, along with side-by-side snippets from the source documents and dual
    action buttons (`Accept / Override` vs. `Flag as Defect`).

## Recommended Demo Exhibits

To demonstrate this policy on stage during the final presentation, use these
concrete examples from the hackathon bundle:

1.  **Demo Exhibit A (Missing Attachment)**:
    - **Source**: `email_507` or `email_509`.
    - **Display**: System identifies `BL_COMPARISON` intent, detects that only
      `email_507_SI.txt` is present, and immediately raises:
      `Status: NEEDS_REVIEW`
      `Reason: missing_attachment`
      `Detail: Missing draft B/L attachment`.
2.  **Demo Exhibit B (Unreadable File)**:
    - **Source**: `email_511` or `email_515`.
    - **Display**: System attempts to parse `email_511_BL.pdf` (775 bytes),
      catches corrupt file exception, and displays:
      `Status: NEEDS_REVIEW`
      `Reason: unreadable`
      `Detail: Malformed or unreadable PDF stream`.
3.  **Demo Exhibit C (Wrong Document Type)**:
    - **Source**: `email_501` (Commercial Invoice) or `email_503`
      (Certificate of Origin).
    - **Display**: System classifies `email_501_BL.txt` as `commercial_invoice`,
      preventing invalid comparison:
      `Status: NEEDS_REVIEW`
      `Reason: wrong_doc_type`
      `Detail: Attached file is a Commercial Invoice, not a Bill of Lading`.
4.  **Demo Exhibit D (Missing Value)**:
    - **Source**: `email_516` (`email_516_SI.txt`).
    - **Display**: System detects unpopulated fields:
      `Status: NEEDS_REVIEW`
      `Reason: missing_value`
      `Detail: Gross Weight is 'N/A' in Shipping Instruction`.

## System Architecture and Data Model Integration

The database models in `apps/api/app/db.py` will persist review states via an
enumerated type:

```python
import enum
from sqlalchemy import Column, Enum, Float, String, JSON

class ReviewReason(str, enum.Enum):
    NONE = "none"
    WRONG_DOC_TYPE = "wrong_doc_type"
    MISSING_ATTACHMENT = "missing_attachment"
    UNREADABLE = "unreadable"
    MISSING_VALUE = "missing_value"
    AMBIGUOUS_MATCH = "ambiguous_match"

class ComparisonStatus(str, enum.Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    NEEDS_REVIEW = "needs_review"
```

This ensures full auditability, zero silent data loss, and seamless dashboard
filtering for human operators.
