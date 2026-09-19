---
url: 'https://drive.google.com/drive/folders/1ouOrFF6GMKvJDaX-asN8R6v467W7P8Df'
title: 'SDOC hackathon participant dataset bundle'
---

# SDOC hackathon participant dataset bundle

This document describes the contents of `sdoc-hackathon-bundle.zip`, the standalone participant dataset distributed
through the official "Problem Statement and Datasets" Google Drive folder for the Averis x Monash Hackathon 2026. The
bundle's `README.md` is transcribed verbatim below; the loader API, submission format, email record schema, and
attachment inventory are documented with short excerpts. The dataset records themselves are not reproduced. The
bundle's files live in the repo at `data/sdoc-hackathon-bundle/`.

## Bundle contents

| Path                     | Description                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `README.md`              | Participant guide: task definition, quick start, submission shape, scoring           |
| `loader.py`              | Stdlib-only helper module exposing the `Inbox` class (local folder or HTTP server)   |
| `sample_submission.json` | Template submission keyed by `email_id`; 520 identical placeholder entries           |
| `inbox/`                 | 520 JSON email records, `email_001.json` through `email_520.json` (contiguous)       |
| `attachments/`           | 250 files named `email_<NNN>_<SIDE>.<ext>`, referenced by each email's `attachments` |

## README.md (verbatim)

````markdown
# SDOC Hackathon — participant bundle

Build a pipeline that reads this inbox and, for each email, decides:

1. **category** — one of `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`,
   `GENERAL`, `SPAM`.
2. for `BL_COMPARISON` emails, compare the **Shipping Instruction (SI)** against
   the **draft Bill of Lading (BL)** attachments and report the outcome:
   - `status`: `OK` (all 7 fields match), `MISMATCH` (≥1 field differs), or
     `NEEDS_REVIEW` (you cannot decide — unreadable/missing/wrong document).
   - `has_defect` + `defect_fields` when it's a `MISMATCH`.
   - `review_reason` when it's `NEEDS_REVIEW`
     (`wrong_doc_type` | `missing_attachment` | `unreadable` | `missing_value`).

The 7 compared fields: **shipper, consignee, notify_party, port_of_loading,
port_of_discharge, container_count, gross_weight_kg**. Note the SI and BL often
_label the same field differently_ (`Port of Loading` vs `Load Port`) — align by
meaning, not by header text.

## Quick start

```bash
# look at one email + its documents
cat inbox/email_004.json
cat attachments/email_004_SI.txt
cat attachments/email_004_BL.txt

# or use the loader (stdlib only for the .txt path)
python3 -c "from loader import Inbox; ib=Inbox('.'); print(len(ib.emails()),'emails')"
```

```python
from loader import Inbox
inbox = Inbox(".")  # this folder  (or a server URL)
submission = {}
for email in inbox:
    eid = email["email_id"]
    # ... your classify + extract + compare pipeline ...
    submission[eid] = {
        "category": "BL_COMPARISON",
        "status": "MISMATCH",
        "review_reason": None,
        "has_defect": True,
        "defect_fields": ["consignee"],
    }
import json; json.dump(submission, open("submission.json", "w"), indent=2)
```

Match **`sample_submission.json`** exactly (every email_id present).

## Scoring

You don't have the ground truth. Either:

- the organizers run `score_cli.py submission.json` for you, **or**
- if they gave you the HTTP server URL:
  ```python
  inbox = Inbox("http://<host>:8080")
  print(inbox.submit(submission)["final_score"])
  ```

Final score = 50% end-to-end (defects caught all the way through) + 30% Stage-1
macro-F1 + 20% Stage-3 defect-F1. `NEEDS_REVIEW` handling is reported as a
separate reliability axis.
````

## loader.py

Stdlib-only module (`import json, os, urllib.request`; `from pathlib import Path`) giving one-import access to the
inbox. The same `Inbox` API works against a local folder containing `inbox/` + `attachments/` or against the HTTP
evaluation server; only the plain-text `.txt` attachment path is dependency-free — reading PDF/DOCX/XLSX attachments
is left to the participant's pipeline via `read_bytes()`.

### Module docstring (verbatim)

```text
loader.py — one-import access to the SDOC hackathon inbox (participants).

Works two ways with the same API:

  # A) local files (static bundle):
  from loader import Inbox
  inbox = Inbox("data")                 # folder with inbox/ + attachments/
  for email in inbox:
      print(email["email_id"], email["subject"])
      for path in email["attachments"]:
          text = inbox.read_text(path)  # SI/BL .txt content

  # B) the HTTP server (docker):
  inbox = Inbox("http://localhost:8080")
  ...                                   # identical loop

No third-party dependencies for the plain-text path (only stdlib). Reading
PDF/DOCX/XLSX attachments is up to your pipeline — see read_bytes().

You do NOT have ground truth. Produce a submission dict shaped like
sample_submission.json and either score it with score_cli.py (if organizers
gave you a ground_truth.json) or POST it to the server's /submit.
```

### class `Inbox` (the only public class)

`Inbox(source)` — constructor. `source` is a local folder path (the bundle root, containing `inbox/`, `attachments/`
and `sample_submission.json`) or an `http://` / `https://` base URL of the evaluation server. It stores `source` with
any trailing `/` stripped and sets `self.is_http` when the source starts with `http://` or `https://`; every method
then branches between filesystem reads and HTTP GETs.

- `emails()` — docstring: `"Return the list of email records (dicts)."`
  Local: parses every `inbox/email_*.json` under the source folder, sorted by filename. HTTP: `GET /emails`. Returns a
  list of email record dicts.
- `__iter__()` — no docstring.
  Returns `iter(self.emails())`, so `for email in inbox:` works.
- `get(email_id)` — no docstring. `email_id` is the record id such as `"email_004"`.
  Local: parses `inbox/<email_id>.json`. HTTP: `GET /emails/<email_id>`. Returns one email record dict.
- `read_bytes(att_path)` — docstring: `"Raw bytes of an attachment. att_path is the string exactly as it appears in
email['attachments'] (e.g. 'attachments/email_004_SI.txt')."`
  Local: returns the raw bytes of `Path(source) / att_path`. HTTP: `GET /<att_path>` (leading `/` stripped).
- `read_text(att_path, encoding="utf-8")` — no docstring.
  Returns `read_bytes(att_path).decode(encoding, errors="replace")`; the `.txt` SI/BL reading path.
- `submit(submission)` — docstring: `"POST a submission to the server and return the scoreboard. HTTP only."`
  Raises `RuntimeError("submit() needs an HTTP source; run the docker server")` for a local source. Otherwise POSTs
  the JSON-serialized submission to `<source>/submit` with `Content-Type: application/json` and returns the parsed
  JSON scoreboard.
- `sample_submission()` — no docstring.
  Local: parses `sample_submission.json` in the source folder. HTTP: `GET /sample_submission`. Returns the submission
  template dict.
- `_get_json(path)` — private helper. `urllib.request.urlopen(source + path)`; parses the response body as JSON.
- `_get_bytes(path)` — private helper. `urllib.request.urlopen(source + path)`; returns the raw response bytes.

### `__main__` demo

Running `python3 loader.py [source]` (default source `"data"`) is a tiny smoke test against a local bundle: it prints
the number of emails loaded, how many have attachments, and — for the first email with attachments — each attachment
path with a 60-character single-line head of its `.txt` content, or `(binary)` for non-`.txt` files.

## Submission format (`sample_submission.json`)

A submission is a single JSON object keyed by `email_id` with one entry for every email in the inbox (the template
contains all 520 ids, `email_001` … `email_520`). Each entry has exactly five keys:

| Key             | Type             | Allowed values / meaning                                                                 |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `category`      | string           | One of `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL`, `SPAM`                 |
| `status`        | string           | `OK` (all 7 fields match), `MISMATCH` (≥1 field differs), `NEEDS_REVIEW` (cannot decide) |
| `review_reason` | string or null   | Reason when `NEEDS_REVIEW` (values below); `null` otherwise                              |
| `defect_fields` | array of strings | Fields that differ when `status` is `MISMATCH` (e.g. `["consignee"]`)                    |
| `has_defect`    | boolean          | `true` when the email is a `MISMATCH`                                                    |

`review_reason` allowed values: `wrong_doc_type`, `missing_attachment`, `unreadable`, `missing_value`. `defect_fields`
entries are drawn from the 7 compared fields — `shipper`, `consignee`, `notify_party`, `port_of_loading`,
`port_of_discharge`, `container_count`, `gross_weight_kg` (see the README above). In the shipped template every one of
the 520 entries carries the same placeholder values shown below.

First 2 entries of `sample_submission.json` (verbatim):

```json
  "email_001": {
    "category": "GENERAL",
    "status": "OK",
    "review_reason": null,
    "defect_fields": [],
    "has_defect": false
  },
  "email_002": {
    "category": "GENERAL",
    "status": "OK",
    "review_reason": null,
    "defect_fields": [],
    "has_defect": false
  },
```

Scoring (per the README): `score_cli.py submission.json` run by the organizers, or
`inbox.submit(submission)["final_score"]` against the HTTP server. Final score = 50% end-to-end (defects caught all
the way through) + 30% Stage-1 macro-F1 + 20% Stage-3 defect-F1; `NEEDS_REVIEW` handling is reported as a separate
reliability axis.

## `inbox/` email record schema

`inbox/` holds 520 JSON files, `email_001.json` through `email_520.json`. Every record has exactly these five keys
(the `email_id` always matches the filename without `.json`):

| Key           | Type             | Description                                                                      |
| ------------- | ---------------- | -------------------------------------------------------------------------------- |
| `email_id`    | string           | Record id, `email_<NNN>`; also the submission key and attachment filename prefix |
| `from`        | string           | Sender address                                                                   |
| `subject`     | string           | Email subject line                                                               |
| `body`        | string           | Plain-text email body with `\n` line breaks                                      |
| `attachments` | array of strings | Bundle-relative attachment paths; empty for most emails                          |

Example record `inbox/email_004.json` (body cut to 5 lines):

```json
{
  "email_id": "email_004",
  "from": "docs@vitalsolutions.sg",
  "subject": "REQUEST BL DRAFT _ PO 26067_ COATED IVORY BOARD__138MT",
  "body": "Hi Mitchelle,\n\nAttached are the SI and draft BL for OC 5ALT-01226 (COATED IVORY BOARD). Please check the details and confirm.\n\nBest Regards,\n…",
  "attachments": ["attachments/email_004_SI.txt", "attachments/email_004_BL.txt"]
}
```

## `attachments/` inventory

250 files, every name matching `email_<NNN>_<SIDE>.<ext>` where `<NNN>` is the zero-padded email number, `<SIDE>` is
`SI` (Shipping Instruction — the reference document) or `BL` (draft Bill of Lading — the document being checked), and
`<ext>` is `txt`, `pdf`, `docx`, or `xlsx`. Every file is referenced by exactly the matching email's `attachments`
list, and every listed path exists on disk. 126 of the 520 emails carry attachments; 124 of those have both an SI
and a BL, while `email_507` and `email_509` list an SI attachment only.

| Side  | `.txt` | `.pdf` | `.docx` | `.xlsx` | Total |
| ----- | ------ | ------ | ------- | ------- | ----- |
| SI    | 98     | 13     | 0       | 15      | 126   |
| BL    | 94     | 15     | 8       | 7       | 124   |
| Total | 192    | 28     | 8       | 22      | 250   |

## Attachment text layout (SI vs BL labels)

The `.txt` attachments lay fields out as `Label: value` lines under an `====`-rule header, and the SI and BL use
different labels for the same compared fields (e.g. the SI's `Consignee (Non-Negotiable)` vs the BL's
`To the Order of`, `Total Containers` vs `Container Count`, `Gross Wt (kgs)` vs `Gross Weight (KG)`).

Excerpt of `attachments/email_004_SI.txt`:

```text
SHIPPING INSTRUCTION
========================================

Shipper: APRIL FAR EAST (M) SDN BHD
  TOWER 2, AVENUE 5, LEVEL 6; BANGSAR SOUTH CITY, NO. 8 JALAN KERINCHI; 59200 KUALA LUMPUR, MALAYSIA
Consignee (Non-Negotiable): EAST BRIGHT FZ-LLC
  RAKEZ AMENITY CENTER; AL HAMRA INDUSTRIAL ZONE, RAK, UAE
Notify: EAST BRIGHT FZ-LLC
Port of Loading (POL): NANTONG, CHINA (CNNTG)
POD: KARACHI, PAKISTAN (PKKHI)
Total Containers: 6 x 40'HC
Gross Wt (kgs): 131,058 KG
```

Excerpt of `attachments/email_004_BL.txt`:

```text
BILL OF LADING (DRAFT)
========================================

SHIPPER: APRIL FAR EAST (M) SDN BHD
  TOWER 2, AVENUE 5, LEVEL 6; BANGSAR SOUTH CITY, NO. 8 JALAN KERINCHI; 59200 KUALA LUMPUR, MALAYSIA
To the Order of: UAB NOVAKOPA
  RAKEZ AMENITY CENTER; AL HAMRA INDUSTRIAL ZONE, RAK, UAE
Notify Party: UAB NOVAKOPA
Port of Loading (POL): NANTONG, CHINA (CNNTG)
POD: KARACHI, PAKISTAN (PKKHI)
Container Count: 6 x 40'HC
Gross Weight (KG): 131,058 KG
```
