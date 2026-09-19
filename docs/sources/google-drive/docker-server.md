---
url: 'https://drive.google.com/drive/folders/1ouOrFF6GMKvJDaX-asN8R6v467W7P8Df'
title: 'SDOC hackathon — Docker server bundle'
---

# SDOC hackathon — Docker server bundle

The organizer-side Docker distribution of the SDOC hackathon dataset
(`sdoc-hackathon-docker.zip`): a FastAPI inbox + scoring server (`server/`), the
`docker-compose.yml` wiring, and the `data_v2/` dataset. This capture transcribes
the bundle's three READMEs and the compose file verbatim, then extracts from the
code the HTTP endpoint table, the scoring formula and metrics, the environment
variables, the category/status/review_reason enums, the 7 compared fields, and
the full field-label synonym table. The private answer key that ships inside the
bundle is not included here. The kit itself is not in the repo: without the answer
key its `POST /submit` cannot score, and the data it serves is the same as
`data/sdoc-hackathon-bundle/`.

## docker/README.md

### SDOC Hackathon — Docker distribution (ORGANIZERS)

Self-contained. Unzip into a folder Docker can share (your home or Documents —
**not** `/tmp`, which Docker Desktop on macOS does not bind-mount), then run:

```bash
docker compose up --build
# serves on http://localhost:8080
```

> If `GET /health` shows `"emails": 0`, the bind mount is empty — you unzipped
> into a path Docker can't share. Move the folder under your home directory and
> retry.

- `GET  /emails`, `/emails/{id}`, `/attachments/{path}` — the inbox (no labels)
- `GET  /sample_submission` — the required output shape
- `POST /submit` — score a submission → scoreboard JSON

Ground truth (`data_v2/ground_truth.json`) is mounted privately at `/secrets`
and used only for scoring — it is never returned by any endpoint.

Score a submission from the terminal instead of over HTTP:

```bash
docker compose run --rm inbox python score_cli.py /path/inside/container.json
# or, without Docker:
cd server && python3 score_cli.py submission.json
```

This package includes the answer key. Do NOT hand it to participants — give
them the participant bundle (`sdoc-hackathon-bundle.zip`) instead.

Change the published port by editing `ports:` in `docker-compose.yml`
(default `8080:8000`).

## server/README.md

### SDOC hackathon — delivery kit

Two ways to get the `data_v2/` dataset into participants' hands. The dataset is
the same either way; the difference is whether ground truth stays private and
whether scoring is centralised.

|                           | **A. Static bundle**    | **B. Docker server**                   |
| ------------------------- | ----------------------- | -------------------------------------- |
| Setup for participants    | unzip, read files       | hit an HTTP URL                        |
| Ground truth              | withheld (you keep it)  | private on the server, never served    |
| Scoring                   | you run `score_cli.py`  | participants `POST /submit`, or you do |
| Needs uptime during event | no                      | yes                                    |
| Best when                 | open build / self-paced | scored competition                     |

You said ground truth is held until requested → **use both**: hand out the
static bundle so nobody is blocked, and (optionally) run the server for live
scoring.

---

#### A. Static bundle (hand this to participants)

```bash
cd server
python3 make_bundle.py --zip
# -> ../sdoc-hackathon-bundle/  and  ../sdoc-hackathon-bundle.zip
```

The bundle contains `inbox/`, `attachments/`, `sample_submission.json`,
`loader.py`, and a participant `README.md`. It **never** contains
`ground_truth.json` (the builder asserts this).

To score a returned submission:

```bash
python3 score_cli.py path/to/submission.json  # uses ../data_v2/ground_truth.json
python3 score_cli.py submission.json --json   # machine-readable
```

#### B. Docker server (`docker compose`)

```bash
docker compose up --build  # from the repo root; serves on http://localhost:8080
```

`data_v2/` is mounted read-only at `/data`; `ground_truth.json` is mounted
separately at `/secrets` and is only read server-side for scoring — it is not in
the served tree and has no public endpoint.

Endpoints:

| Method | Path                  | Purpose                                                |
| ------ | --------------------- | ------------------------------------------------------ |
| GET    | `/health`             | liveness + email count                                 |
| GET    | `/emails`             | all email records (no labels)                          |
| GET    | `/emails/{id}`        | one email                                              |
| GET    | `/attachments/{path}` | download an SI/BL file                                 |
| GET    | `/sample_submission`  | the required output shape                              |
| POST   | `/submit`             | score a submission → scoreboard JSON                   |
| GET    | `/ground_truth`       | **404 unless** `REVEAL_GT=1` (judge-only, token-gated) |

```bash
# participant scores themselves without ever seeing labels:
curl -s -X POST localhost:8080/submit \
  -H 'Content-Type: application/json' \
  --data-binary @submission.json | python3 -m json.tool
```

To let judges pull labels over HTTP, set in `docker-compose.yml`:
`REVEAL_GT: "1"` and `JUDGE_TOKEN: "<secret>"` (then send header
`X-Judge-Token: <secret>`).

Change the published port by editing the `ports:` mapping (default `8080:8000`).

---

#### Files

```
server/
├── app.py            FastAPI service (serve + score)
├── scoring.py        v2-aware scoring (shared by server + CLI)
├── score_cli.py      judges: score a submission from the terminal
├── loader.py         participants: one-import access (local or HTTP)
├── make_bundle.py    organizers: build the participant bundle (strips GT)
├── requirements.txt  fastapi + uvicorn
└── Dockerfile
docker-compose.yml    at repo root
```

#### Submission format

```json
{
  "email_001": {
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "review_reason": null,
    "has_defect": true,
    "defect_fields": ["consignee"]
  }
}
```

Every `email_id` must be present. See `data_v2/README.md` for the full schema,
categories, and how the dataset is
built.

#### Scoring model

`final_score = 0.30·stage1_macroF1 + 0.20·stage3_defectF1 + 0.50·end_to_end`.
End-to-end (defects routed _and_ flagged with the exact fields) is the headline.
The `NEEDS_REVIEW` edge cases are graded on a separate diagnostic reliability
axis (escalation precision/recall), so they don't distort the core leaderboard
unless you choose to weight them in.

## data_v2/README.md

Omitted on purpose. This organiser README documents how the labels are generated: the
category mix, the defect rate, and which emails are the review edge cases. That amounts to the answer key, which
the problem statement says participants do not receive.

## docker-compose.yml

```yaml
# SDOC hackathon inbox + scoring server.
#
#   docker compose up --build  # serve data + score submissions
#
# The dataset (data_v2/) is mounted read-only at /data. The ground truth is
# mounted SEPARATELY and privately at /secrets so it is never in the served
# /data tree and never exposed on an endpoint (scoring reads it server-side).
#
# To let judges pull labels over HTTP, set REVEAL_GT=1 and a JUDGE_TOKEN.
services:
  inbox:
    build: ./server
    ports:
      # host 8080 -> container 8000 (8000 often taken locally; change freely)
      - '8080:8000'
    volumes:
      # dataset served to participants (inbox + attachments + sample_submission)
      - ./data_v2:/data:ro
      # ground truth held privately — scoring only, never served
      - ./data_v2/ground_truth.json:/secrets/ground_truth.json:ro
    environment:
      DATA_DIR: /data
      GROUND_TRUTH: /secrets/ground_truth.json
      # REVEAL_GT: "1"            # uncomment to enable GET /ground_truth
      # JUDGE_TOKEN: "change-me"  # and require this token header
    restart: unless-stopped
```

## HTTP endpoints (server/app.py)

| Method | Path                  | Purpose                                                                  | Request                                                                    | Response                                                                                                                                |
| ------ | --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`             | Liveness probe; also reports inbox size and whether scoring is available | none                                                                       | `{"status": "ok", "emails": <count of inbox/email_*.json>, "scoring_available": <ground_truth.json mounted>}`                           |
| GET    | `/`                   | API index listing the public endpoints                                   | none                                                                       | `{"service": "SDOC Hackathon Inbox", "endpoints": {...}, "note": "Ground truth is private. Score yourself via POST /submit."}`          |
| GET    | `/emails`             | List all email records (no labels)                                       | none                                                                       | JSON array of `{email_id, from, subject, body, attachments}`, sorted by id                                                              |
| GET    | `/emails/{email_id}`  | One email record                                                         | path param `email_id`                                                      | the email record JSON; `404` "no such email" if missing                                                                                 |
| GET    | `/attachments/{path}` | Download an SI/BL attachment                                             | path param `path` (relative to the attachments dir)                        | `FileResponse` file bytes; `404` if missing or resolves outside the attachments dir (path traversal is refused)                         |
| GET    | `/sample_submission`  | The exact output shape to produce                                        | none                                                                       | contents of `data_v2/sample_submission.json`; `404` if not found                                                                        |
| POST   | `/submit`             | Score a submission against the private ground truth → scoreboard JSON    | JSON body `{email_id: {category, status, has_defect, defect_fields, ...}}` | the scoreboard from `scoring.score_all` (see Scoring); `400` if body is not a JSON object; `503` if ground truth not mounted            |
| GET    | `/ground_truth`       | Judge-only: return the labels; disabled by default                       | optional header `X-Judge-Token: <token>`                                   | the ground truth JSON; `404` unless `REVEAL_GT=1`; `403` "bad judge token" when `JUDGE_TOKEN` is set and the header is missing or wrong |

## Scoring (server/scoring.py)

`scoring.py` is shared by the server (`POST /submit`) and the judge CLI
(`score_cli.py`). A submission is a JSON object keyed by `email_id`; each record
carries `category`, `status`, `review_reason`, `has_defect`, `defect_fields`
(and optionally `decided_by`, read only for the `rule_pct` diagnostic).

Default weights (`DEFAULT_WEIGHTS`):

```python
{"stage1": 0.30, "stage3": 0.20, "end_to_end": 0.50}
```

Scoring formula (`score_all`):

```python
final = (weights["stage1"] * s1["macro_f1"]
         + weights["stage3"] * s3["defect_f1"]
         + weights["end_to_end"] * e2e["rate"])
```

i.e. `final_score = 0.30·stage1_macroF1 + 0.20·stage3_defectF1 + 0.50·end_to_end_rate`.

Shared precision/recall/F1 helper (`prf`):

```python
p = tp / (tp + fp) if (tp + fp) else 0.0
r = tp / (tp + fn) if (tp + fn) else 0.0
f = 2 * p * r / (p + r) if (p + r) else 0.0
```

### Stage 1 — email classification (`score_stage1`)

Scope: every email in the ground truth. The predicted category defaults to
`"GENERAL"` when the submission omits an email or the key.

| Metric      | Definition                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accuracy`  | `correct / len(truth)` (0.0 if empty)                                                                                                                                             |
| `per`       | per-category `{tp, fp, fn}` counters over the 5 `CATEGORIES`; a wrong prediction increments `fn` for the actual class and `fp` for the predicted class                            |
| `confusion` | confusion matrix `actual → predicted → n`                                                                                                                                         |
| `macro_f1`  | mean of the per-category F1 over the 5 `CATEGORIES`                                                                                                                               |
| `rule_pct`  | `rule_hits / rule_total` over submission records that carry a `decided_by` key; a record counts as a rule hit when `decided_by == "rule"` (`None` when no record carries the key) |

### Stage 3 — defect detection (`score_stage3`)

Scope: ground-truth emails with `category == "BL_COMPARISON"` and
`status != "NEEDS_REVIEW"` (counted as `doc_total`). NEEDS_REVIEW cases are
excluded — they are graded on the reliability axis, not as match/mismatch.
A prediction only counts as a defect flag when it is also routed:
`routed = sub.category == "BL_COMPARISON"`, `pred_defect = bool(has_defect) and
routed`, and `pred_fields` is the submitted `defect_fields` set when routed,
else the empty set.

| Metric             | Definition                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defect_precision` | `tp / (tp + fp)` at email level (gold `has_defect` vs `pred_defect`)                                                                               |
| `defect_recall`    | `tp / (tp + fn)` at email level                                                                                                                    |
| `defect_f1`        | `2·p·r / (p + r)` at email level                                                                                                                   |
| `field_f1`         | F1 over field-level counts: `f_tp = \|pred_fields ∩ gold_fields\|`, `f_fp = \|pred_fields − gold_fields\|`, `f_fn = \|gold_fields − pred_fields\|` |
| `exact_match_rate` | fraction of `doc_total` where `pred_fields == gold_fields`                                                                                         |
| `doc_total`        | number of comparable `BL_COMPARISON` ground-truth emails                                                                                           |

### Reliability — human-review axis (`score_reliability`, diagnostic)

For gold `NEEDS_REVIEW` cases the correct behaviour is to escalate, not to
report a clean pass or invent a defect. Credit is given when the submission
marks `status == "NEEDS_REVIEW"`; `esc_correct` counts escalations that were
genuinely needed.

| Metric                 | Definition                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `escalation_recall`    | `esc_tp / gold_review` — of the gold NEEDS_REVIEW cases, how many the submission escalated         |
| `escalation_precision` | `esc_correct / pred_review` — of everything the submission escalated, how much genuinely needed it |
| `escalation_f1`        | harmonic mean of escalation precision and recall                                                   |
| `gold_review`          | count of ground-truth `NEEDS_REVIEW` emails                                                        |
| `pred_review`          | count of submission `NEEDS_REVIEW` emails                                                          |
| `per_reason`           | for each of the 4 `REVIEW_REASONS`: `{total, caught}` — gold count vs how many were escalated      |

### End-to-end — the headline metric (`score_end_to_end`)

Scope: ground-truth emails with `category == "BL_COMPARISON"` and
`has_defect == true` (counted as `total`). A doc email with a planted defect
only "succeeds" if the pipeline (a) routed it to `BL_COMPARISON` **and** (b)
flagged the **exact** defect fields.

| Metric    | Definition                                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| `success` | count where `routed and flagged and set(sub.defect_fields) == set(truth.defect_fields)` |
| `total`   | number of ground-truth defect emails                                                    |
| `rate`    | `success / total` (0.0 if `total == 0`)                                                 |

`score_all` returns `{stage1: {accuracy, macro_f1, rule_pct, per, confusion},
stage3, reliability, end_to_end, weights, final_score, n_emails}`.

## Environment variables

Read by `server/app.py` (defaults shown; `docker-compose.yml` sets the first
two and comments out the last two):

| Variable       | Default                      | Effect                                                                                             |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATA_DIR`     | `/data`                      | where `data_v2/` is mounted (read-only); serves `inbox/`, `attachments/`, `sample_submission.json` |
| `GROUND_TRUTH` | `/secrets/ground_truth.json` | private ground-truth path, mounted separately and read only server-side for scoring                |
| `REVEAL_GT`    | `"0"`                        | `"1"` enables `GET /ground_truth` (default off)                                                    |
| `JUDGE_TOKEN`  | unset                        | if set, `GET /ground_truth` requires header `X-Judge-Token: <token>`                               |

## Enums

| Field                              | Values                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `category` (`CATEGORIES`)          | `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL`, `SPAM`             |
| `status`                           | `OK`, `MISMATCH`, `NEEDS_REVIEW`                                              |
| `review_reason` (`REVIEW_REASONS`) | `null`, `wrong_doc_type`, `missing_attachment`, `unreadable`, `missing_value` |
| `has_defect`                       | `bool` (true iff `status == MISMATCH`)                                        |
| `defect_fields`                    | list of field names drawn from the 7 compared fields                          |

## The 7 compared fields

`COMPARE_FIELDS` in `data_v2/pools.py` — the fields the pipeline compares
between SI and BL, and the only valid `defect_fields` values:

`shipper`, `consignee`, `notify_party`, `port_of_loading`, `port_of_discharge`,
`container_count`, `gross_weight_kg`.

## Field-label synonym table (data_v2/pools.py `LABELS`)

The SI and BL render the same field with different labels; the extractor must
normalise them. The first seven entries are the compared fields; the remaining
five are also rendered on the documents but are not compared.

| Field               | Labels used across renders                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `shipper`           | `Shipper`, `Shipper/Exporter`, `Shipper (Principal or Seller)`, `SHIPPER`                     |
| `consignee`         | `Consignee`, `Consignee (Non-Negotiable)`, `CONSIGNEE`, `To the Order of`                     |
| `notify_party`      | `Notify Party`, `Notify`, `Notify Party/Intermediate Consignee`, `NOTIFY PARTY`               |
| `port_of_loading`   | `Port of Loading`, `Port of Loading (POL)`, `Load Port`, `POL`, `PORT OF LOADING`             |
| `port_of_discharge` | `Port of Discharge`, `Port of Discharge (POD)`, `Discharge Port`, `POD`, `PORT OF DISCHARGE`  |
| `container_count`   | `No. of Containers`, `Total Containers`, `No. of Containers or Packages`, `Container Count`   |
| `gross_weight_kg`   | `Gross Weight (KG)`, `Gross Wt (kgs)`, `Gross Weight毛重(KGS)`, `GROSS WEIGHT`                |
| `vessel`            | `Vessel`, `Ocean Vessel`, `Vessel Name`, `Export Carrier (vessel, voyage)`                    |
| `voyage`            | `Voyage No.`, `Voy.`, `Voy. No`, `Voyage`                                                     |
| `commodity`         | `Commodity`, `Description of Goods`, `Description`, `Kinds of Packages; Description of Goods` |
| `booking`           | `Booking Reference`, `Booking No.`, `Booking Ref`, `BOOKING NO.`                              |
| `bl_no`             | `B/L No.`, `BL No.`, `Bill of Lading No.`, `B/L NUMBER`                                       |

## Bundle tooling (server/)

| Script                  | Role                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.py`                | FastAPI service (`SDOC Hackathon Inbox`, version 2.0) — serve + score; run by uvicorn on container port 8000                                                                                                                    |
| `scoring.py`            | v2-aware scoring, shared by server + CLI                                                                                                                                                                                        |
| `score_cli.py`          | judge CLI: `python score_cli.py submission.json [--ground-truth PATH] [--weights FILE.json] [--json]`; prints a bar-chart scoreboard or machine-readable JSON                                                                   |
| `loader.py`             | participant helper: `Inbox(source)` works identically on a local folder or the HTTP server (`emails()`, `get(id)`, `read_text/read_bytes(path)`, `sample_submission()`, `submit(submission)`)                                   |
| `make_bundle.py`        | builds the participant bundle (`inbox/`, `attachments/`, `sample_submission.json`, `loader.py`, participant README); asserts `ground_truth*` never leaks in                                                                     |
| `make_docker_bundle.py` | builds this organizer distribution (`docker-compose.yml`, `server/`, `data_v2/` incl. the private key); asserts the key is present                                                                                              |
| `Dockerfile`            | `python:3.12-slim`, `pip install -r requirements.txt` (`fastapi>=0.110,<1.0`, `uvicorn[standard]>=0.27,<1.0`), `EXPOSE 8000`, healthcheck on `GET /health`, `CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]` |
