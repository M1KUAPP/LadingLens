# Shipping document verification

A shipping operations challenge to automate document verification from email
inbox to discrepancy report. Participants build an automated system to classify
emails, extract shipment details from Shipping Instructions and Bills of
Lading, detect discrepancies, and escalate ambiguous cases to human reviewers.

Contents:

1.  [Context and problem overview](#context-and-problem-overview)
    1.  [Operational context](#operational-context)
    1.  [The problems](#the-problems)
1.  [System capabilities](#system-capabilities)
1.  [Expected result and extensions](#expected-result-and-extensions)
    1.  [What the comparison covers](#what-the-comparison-covers)
    1.  [Advanced stage](#advanced-stage)
1.  [Working with the data](#working-with-the-data)
    1.  [Two ways to access the data](#two-ways-to-access-the-data)
    1.  [The loader](#the-loader)
1.  [Evaluating your own output](#evaluating-your-own-output)
    1.  [Formatting your output for the self-evaluation](#formatting-your-output-for-the-self-evaluation)
    1.  [How to run it](#how-to-run-it)
    1.  [How to use the result](#how-to-use-the-result)

## Context and problem overview

### Operational context

A shipping operations team receives different kinds of messages in the same
inbox: requests to check documents, prepare new shipping instructions, answer
invoice questions, and share operational updates. Spam arrives alongside them.

For a document-checking request, the team compares a **Shipping Instruction
(SI)**, which contains the intended shipment details, with a **draft Bill of
Lading (BL)**. The SI is the reference for this check. The goal is to catch
incorrect details before the draft is finalized.

### The problems

- **Finding the right emails takes time.** Staff must read each message and
  decide what action it needs. A document request that is overlooked never
  reaches the checking step.
- **Manual comparison is repetitive and easy to get wrong.** Names, ports,
  quantities, and weight must be checked across two documents. A missed
  discrepancy can lead to corrections, delays, and additional work.
- **The same information can look different.** One document may say "Port of
  Loading" while the other says "Load Port." The system needs to recognize that
  these refer to the same field.

## System capabilities

Starting from the inbox, the system should produce a clear result for each
email. While the workflow design is flexible, the system should generally be
able to:

- **Classify**: Tell different kinds of messages apart, including
  document-comparison requests, new SI requests, invoice queries, general
  messages, and spam.
- **Extract data**: For comparison requests, read the SI and BL attachments and
  identify the corresponding shipment fields.
- **Compare**: Check the values and surface any mismatched fields, showing the
  SI and BL values side by side.
- **Ask for help**: When it cannot complete the task on its own, escalate to a
  person (human-in-the-loop) with relevant context, rather than guessing or
  failing silently.

The starting version uses JSON email records and plain-text attachments. Other
email categories only need to be classified; only document-comparison requests
continue to the checking step. The approach used to achieve these capabilities
is left to the participant.

## Expected result and extensions

### What the comparison covers

Check seven fields: **shipper**, **consignee**, **notify party**, **port of
loading**, **port of discharge**, **container count**, and **gross weight in
kilograms**.

The report should make it easy to see which email was checked, whether a
mismatch was found, and exactly what needs attention. If all seven fields
match, report "No mismatch detected."

#### Example comparison

The SI lists 3 containers and 22,000 kg. The BL lists 4 containers and 22,000
kg. If the other fields agree, flag only the container count and show:
`SI: 3 / BL: 4`.

### Advanced stage

Classifying emails, extracting fields from plain text, and comparing values are
the basic, common expectations. Once that works, participants are encouraged to
attempt a more advanced solution using the provided sample data, which includes
more realistic documents and harder decisions:

- **PDF and Word attachments**: Replace plain-text attachments with PDFs and
  Word documents. Extract information from tables and different page layouts.
- **Scanned documents**: Use image-only PDFs or scanned pages. You can use
  optical character recognition (OCR), a vision-capable LLM, or both to read
  and compare content.
- **Messier inputs**: Introduce varied field labels, formatting differences,
  misleading email subjects, or missing attachments. The system must distinguish
  a real discrepancy from a reading or formatting issue.
- **Reliability and human review**: When a document is unreadable, a required
  value is missing, or the result is uncertain, send the case for review with
  source evidence and reason. Let a person confirm or correct it, then update
  the report. Handle processing failures visibly and allow retries.

**Accuracy** means identifying the right requests and the right discrepancies
without creating false alarms. The **reliability** challenge considers what
happens when the system cannot make a dependable decision, including when human
input is needed.

## Working with the data

The dataset contains inbox records in JSON, together with the SI and BL
attachments referenced by those emails. The answer key is not included. You can
check your result using the self-evaluation endpoint.

### Two ways to access the data

- **Static bundle**: A ZIP file containing `inbox/`, `attachments/`,
  `sample_submission.json`, and a helper file called `loader.py`. Extract the
  ZIP and read the files directly. No service needs to be started.
- **Local server (Docker)**: Run `docker compose up --build` to access the same
  dataset over HTTP at `http://localhost:8080`. No database or additional setup
  is required.

### The loader

The included `loader.py` provides the same interface for both options. Point it
to either the extracted data folder or the local server:

```python
from loader import Inbox

inbox = Inbox("data")  # or Inbox("http://localhost:8080")

for email in inbox:
    # reads each email record
    text = inbox.read_text(path)  # returns text from an SI or BL attachment
```

Start with one email and its two attachments to see how records are connected.
The participant guide included with the data explains access options and fields
in detail.

## Evaluating your own output

To help gauge how well your system performs, the local server includes an
optional self-evaluation endpoint. Submit your result and the server compares it
with a private reference set, returning a scoreboard. The reference answers are
not included in the response.

### Formatting your output for the self-evaluation

The self-evaluation requires output in one agreed shape: a single JSON object
keyed by `email_id`, following the format in `sample_submission.json`. Include
every email in the dataset. For document-comparison requests, report category,
whether a mismatch was found, and fields that differ. This shape is only
required if you choose to use the self-evaluation.

### How to run it

With the local server running, send formatted output to `POST /submit` or call
`inbox.submit(...)` through the loader. The response contains the evaluation
result without exposing reference answers.

### How to use the result

The scoreboard helps find problems during development. It is not the final
assessment and does not cover every aspect of a complete solution:

- Check where the system classified an email incorrectly or missed a document
  mismatch.
- Review cases where input was incomplete or uncertain. A score cannot fully
  assess whether the system requested human review at the right time or
  provided enough context.
- If your result differs from the reference, check the source documents before
  changing it. If your decision is reasonable, record the reason.
- Submit output as often as needed while developing to improve accuracy, and
  separately test system behavior when information is missing, unclear, or
  unreadable.
