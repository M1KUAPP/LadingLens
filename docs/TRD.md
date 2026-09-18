# Technical Requirements

Averis classifies shipping-operations emails and checks draft Bills of
Lading against Shipping Instructions. This document records the tech
stack, the architecture, and the planned AI pipeline, including a full
reference for Jev, the decision-layer model.

Contents:

1.  [Tech Stack](#tech-stack)
1.  [Architecture](#architecture)
1.  [Jev Decision Layer](#jev-decision-layer)

## Tech Stack

Status: Live means in use today, Provisioned means created but unused by
code, Planned means not built yet. Versions come from
`apps/api/pyproject.toml`, `apps/web/package.json`, and `Dockerfile`.

### Backend

| Component       | Choice                  | Version      | Status | Why                                  |
| --------------- | ----------------------- | ------------ | ------ | ------------------------------------ |
| Language        | Python                  | 3.12         | Live   | `requires-python`, Docker base image |
| Framework       | FastAPI                 | >=0.115      | Live   | Async API; also serves the SPA       |
| Server          | Uvicorn                 | >=0.30       | Live   | ASGI server; container entrypoint    |
| Package manager | uv                      | 0.11.26      | Live   | Lockfile installs; pinned in Docker  |
| Settings        | pydantic-settings       | >=2.4        | Live   | Env-var config in `app/config.py`    |
| ORM             | SQLAlchemy (asyncio)    | >=2.0        | Live   | Async engine and sessions            |
| DB driver       | asyncpg                 | >=0.30       | Live   | Postgres driver for Neon             |
| AI SDK          | google-genai            | >=2.24.0     | Live   | Official Gemini client library       |
| Linter          | ruff                    | >=0.8        | Live   | Check and format gates in CI (dev)   |
| Tests           | pytest + pytest-asyncio | >=8.3, >=1.4 | Live   | API test suite in CI (dev)           |

### Frontend

| Component       | Choice                | Version | Status  | Why                               |
| --------------- | --------------------- | ------- | ------- | --------------------------------- |
| UI library      | React                 | ^19.2.8 | Live    | SPA for the review interface      |
| Build tool      | Vite                  | ^8.3.0  | Live    | Dev server and bundler            |
| Language        | TypeScript            | ~6.0.2  | Live    | Typed frontend code               |
| Vite plugin     | @vitejs/plugin-react  | ^6.1.1  | Live    | React support in Vite             |
| Linter          | oxlint                | ^1.81.0 | Live    | `bun run lint` (dev)              |
| Package manager | Bun                   | 1       | Live    | Installs and builds in CI/Docker  |
| Serving         | FastAPI `StaticFiles` | -       | Live    | Same container serves API and SPA |
| Graph view      | Cytoscape.js          | -       | Planned | Entity graph visualisation        |

- The planned graph view draws nodes and edges for emails, shipments,
  parties, ports, documents, and mismatches.
- `SPAStaticFiles` falls back to `index.html`, so client-side routes
  work inside the same container.

### Data

| Component    | Choice                        | Version | Status      | Why                                 |
| ------------ | ----------------------------- | ------- | ----------- | ----------------------------------- |
| Database     | Neon serverless Postgres      | 18      | Live        | App connects; no schema yet         |
| Object store | Google Cloud Storage          | -       | Provisioned | Private docs bucket; unused by code |
| Dataset      | `data/sdoc-hackathon-bundle/` | -       | Live        | 520 emails; read via `loader.py`    |

- Neon project `averis`, region `aws-ap-southeast-1` (Singapore).
- Bucket `muba-m1ku-averis-docs`: uniform bucket-level access and
  public-access prevention; the runtime service account has
  `objectAdmin`.
- `loader.py` is the organisers' stdlib-only helper; it reads the local
  bundle or their HTTP server.

### AI

| Component           | Choice                         | Version      | Status  | Why                                  |
| ------------------- | ------------------------------ | ------------ | ------- | ------------------------------------ |
| Decision layer      | Jev (TypeSafe)                 | `jev-1.13.0` | Planned | Typed judgments; key set, no client  |
| Model alias         | `jev-latest`                   | -            | Planned | SDK default; points to 1.13.0        |
| Extraction          | Gemini `gemini-3.5-flash-lite` | -            | Live    | Client wired; extraction not built   |
| Extraction fallback | `GEMINI_API_KEY_2`             | -            | Live    | Second-project key; used on HTTP 429 |
| Second opinion      | OpenAI                         | -            | Planned | Fallback model; key set, no client   |
| Reserve             | DashScope / ModelScope (Qwen)  | -            | Reserve | Not wired                            |

- `apps/api/app/gemini.py` builds one client per configured key and
  retries on the second key only when the first returns HTTP 429.
- Both Gemini keys are free tier; quota is per GCP project, so the second
  key comes from a different project (Flash allows only 20 req/day).

### Cloud and Delivery

| Component       | Choice                          | Version | Status  | Why                                  |
| --------------- | ------------------------------- | ------- | ------- | ------------------------------------ |
| Hosting         | Cloud Run `averis`              | -       | Live    | One container, scales to zero        |
| Registry        | Artifact Registry `averis`      | -       | Live    | Keeps the 5 newest images            |
| Secrets         | Secret Manager `averis-*`       | -       | Live    | Synced from GitHub secrets on deploy |
| CI              | GitHub Actions `ci.yml`         | -       | Live    | ruff, pytest, bun build on PRs       |
| CD              | GitHub Actions `deploy.yml`     | -       | Live    | Build, push, deploy on main          |
| GCP auth        | Workload Identity Federation    | -       | Live    | Pool `github-averis`; no SA keys     |
| Budget          | Billing budget `averis-monthly` | RM30/mo | Live    | Alerts at 50/90/100%; no cap         |
| Bulk processing | Cloud Tasks + worker service    | -       | Planned | Batch pipeline for the finals        |

- Cloud Run runs in `asia-southeast1`, project `muba-m1ku`: max 2
  instances, 1 vCPU, 1 GiB memory, concurrency 40, timeout 300 s.
- The WIF OIDC condition allows only repo `Averis-T010NG/Averis` on
  `refs/heads/main`; there are no service-account keys.
- `deploy.yml` skips pushes that touch only docs or Markdown files.
- The budget alert emails the billing account's admins; it does not stop
  spend.

### Environment Variables

Declared in `apps/api/app/config.py`; documented in
`apps/api/.env.example`.

| Name               | Purpose                           | Required?                  |
| ------------------ | --------------------------------- | -------------------------- |
| `DATABASE_URL`     | Neon Postgres connection string   | Yes, for readiness         |
| `GEMINI_API_KEY`   | Primary Gemini key                | Yes, for extraction        |
| `GEMINI_API_KEY_2` | Second-project key on 429         | No                         |
| `GEMINI_MODEL`     | Extraction model name             | No; defaults to flash-lite |
| `TYPESAFE_API_KEY` | Jev API key                       | No; not wired yet          |
| `OPENAI_API_KEY`   | OpenAI API key                    | No; not wired yet          |
| `GCS_BUCKET`       | Docs bucket name                  | No; unused so far          |
| `APP_VERSION`      | Version reported by `/api/health` | No; deploy sets git SHA    |
| `WEB_DIST`         | Path to the built frontend        | No; set in Dockerfile      |

## Architecture

Averis ships as one Cloud Run container: FastAPI answers the API and
serves the built React SPA. The same process reaches out to Neon for
persistence, GCS for documents, and the AI providers for extraction and
decisions. GitHub Actions builds the image, pushes it to Artifact
Registry, and rolls it out on every merge to `main`.

```text
Browser
   |
   v
Cloud Run "averis": FastAPI (API + static React SPA)
   |---> Neon Postgres
   |---> GCS bucket
   |---> Gemini (extraction)
   |---> Jev (decision layer)
   `---> OpenAI (fallback)

GitHub Actions --build--> Artifact Registry --deploy--> Cloud Run
```

Planned processing pipeline:

1.  **Classify** each email into the five categories with one Jev Choice.
1.  **Extract** SI and BL fields from attachments with Gemini for
    `BL_COMPARISON` emails.
1.  **Normalise** the extracted values in code: casing, dates, weights,
    container counts.
1.  **Compare** field by field — exact numeric checks in code, Jev Nouls
    for text equivalence — with the SI as reference.
1.  **Escalate** to `NEEDS_REVIEW` on low confidence or missing,
    unreadable, or wrong-type documents.

Operations are covered in [deployment.md](deployment.md); the challenge
and dataset are described in [brief.md](brief.md).

## Jev Decision Layer

Technical reference for the TypeSafe API and its System One model Jev,
which we use as the decision layer of the pipeline: email classification,
field-equivalence judgments, document-type checks, and escalation to
human review. Gemini performs document extraction upstream; Jev only ever
sees text state and typed questions. Every fact below is taken from the
TypeSafe documentation, with the source pages cited per subsection; where
the docs are silent, the entry says "Not documented".

### Overview

Source: [introduction][ts-intro], [System One][ts-system-one],
[ML primer][ts-ml-primer], [models][ts-models].

TypeSafe is a hosted API whose models make fast, structured decisions
that software can consume directly. Jev is TypeSafe's flagship model and
the first "System One" model. A request sends a `state` (text or JSON)
plus typed `questions`; Jev returns typed answers and probability
distributions, never generated text.

The name comes from Kahneman's _Thinking, Fast and Slow_: System 1 is
fast and intuitive, System 2 slow and deliberate. A System One model
supplies "gut-check" judgments a knowledgeable person could make in
seconds, while ordinary code owns the workflow, deterministic rules, and
side effects.

How it differs from a generative LLM:

| Property      | Generative LLM                        | Jev (System One)                     |
| ------------- | ------------------------------------- | ------------------------------------ |
| Output        | Free text, parsed back into structure | Typed values and probabilities       |
| Training      | RLHF (preference) / RLVR (reasoning)  | RLCD: RL for calibrated decisions    |
| Explanations  | Can produce reasoning text            | None; answers constrained to options |
| Uncertainty   | Tends toward overconfident prose      | Calibrated probabilities             |
| Workflow role | Agent decides next steps              | Code owns flow; model judges         |

- Calibration means p=0.8 answers should be right ~80% of the time across
  many predictions; it guarantees nothing about any single answer.
- Every question in a request is evaluated independently and in parallel;
  most queries complete in about 100 ms.
- Input is text only: strings, JSON objects, or arrays of text — no
  image, audio, or video.

Models and versions:

| Model ID     | Status                                               |
| ------------ | ---------------------------------------------------- |
| `jev-1.13.0` | Current versioned release; the only model documented |

| Alias         | Points to    | Meaning                                           |
| ------------- | ------------ | ------------------------------------------------- |
| `jev-latest`  | `jev-1.13.0` | Most recent stable release; SDK default           |
| `jev-preview` | `jev-1.13.0` | Latest incl. previews; same as `jev-latest` today |

- The response `model` field reports the versioned ID that answered; log
  it per request.
- If confidence thresholds are tuned against one version, pin that
  version ID rather than an alias: aliases move when a new release ships.
- Jev is not fine-tuned per customer; the same RLCD-trained weights serve
  every account. Domain behavior is shaped through `state`,
  `instructions`, and `criteria` in the request.
- English is the primary training language; other languages, including
  CJK scripts, are accepted but have lower accuracy.
- `GET /v1/models` lists the names an account may send (currently the
  aliases, each with `description` and `release_date`); versioned IDs
  such as `jev-1.13.0` are accepted whether or not they appear.
- The September 2026 cookbooks ran against `jev-1.12`; the jaggedness
  page applies to `jev-1.13` (reviewed 2026-09-17). Doc examples also use
  `jev-1.13` and `jev` as model values; the documented versioned ID is
  `jev-1.13.0`.

[ts-intro]: https://docs.typesafe.ai/introduction.md
[ts-system-one]: https://docs.typesafe.ai/concepts/system-one.md
[ts-ml-primer]: https://docs.typesafe.ai/introduction/machine-learning-primer.md
[ts-models]: https://docs.typesafe.ai/models.md

### Primitives

Source: [primitives][ts-primitives].

Three question types exist. A question defines one judgment; its answer
is the typed value that comes back, keyed under the question ID you
chose. All three types can be mixed in a single API call.

| Type   | What it answers         | Returns                                          |
| ------ | ----------------------- | ------------------------------------------------ |
| Choice | Which of these options? | `choice`, `probabilities`, `confidence`          |
| Noul   | Is this true?           | `noul` (0 to 1)                                  |
| Score  | Which level?            | `score`, `legend`, `probabilities`, `confidence` |

Every question has an ID (code-only, never sent to the model), a `type`,
and `instructions`. Choice and Score require `criteria`; Noul accepts
`criteria` optionally. `instructions` and `criteria` entries accept a
string, JSON object, or array; use objects when a description needs
separate fields such as `what`, `not_for`, and `examples` ([advanced
primitives][ts-prim-advanced]). To point a question at part of a
structured state, name it in `instructions` with a dot-and-index path
wrapped in backticks, such as `ticket.messages[0].text`.

- Ask one narrow judgment per question — something a knowledgeable
  person decides in a second. Split multi-factor judgments into separate
  questions and combine the answers in code.
- Add an `other` / `none of the above` option to a Choice when the list
  might not cover every input.

[ts-primitives]: https://docs.typesafe.ai/primitives.md
[ts-prim-advanced]: https://docs.typesafe.ai/primitives/advanced.md

#### Choice

Source: [choice primitive][ts-choice].

Purpose: select one option from a fixed, unordered set (routing,
classification, entity matching). A Choice accepts up to 255 options.

Request fields: `type` = `"choice"`; `instructions` = the question;
`criteria` = a map of option name to description (`null` allowed when the
name is self-explanatory). Option names and descriptions are both sent to
the model, so write descriptions that separate the options.

Response fields: `choice` (highest-probability option), `probabilities`
(distribution over every option, sums to 1), `confidence` (0–1, derived
from how peaked the distribution is).

Documented example — request:

```json
{
  "state": "My running shoes arrived in the wrong size. Can I swap them for a size 10?",
  "model": "jev-latest",
  "questions": {
    "department": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {
        "returns": "Exchanges, refunds, wrong or damaged items",
        "shipping": "Delivery status, delays, lost packages",
        "billing": "Charges, invoices, payment problems"
      }
    }
  }
}
```

Documented example — response:

```json
{
  "model": "jev-latest",
  "answers": {
    "department": {
      "type": "choice",
      "choice": "returns",
      "confidence": 1.0,
      "probabilities": {
        "shipping": 0.0,
        "returns": 1.0,
        "billing": 0.0
      }
    }
  },
  "usage": {
    "input_tokens": 330,
    "output_tokens": 34
  }
}
```

[ts-choice]: https://docs.typesafe.ai/primitives/choice.md

#### Noul

Source: [noul primitive][ts-noul].

Purpose: evaluate a yes/no question or statement. `noul` is the
probability that the answer is yes: near 1 strong yes, near 0 strong no,
near 0.5 uncertain. Phrase instructions so that a high value means "yes".

Request fields: `type` = `"noul"`; `instructions` = the yes/no question
or statement; `criteria` = optional `{"true": ..., "false": ...}`
descriptions pinning down what each outcome means when the boundary is
subtle.

Response fields: `noul` only. There is no separate `confidence` — the
value itself is P(yes), and a value near 0.5 is the uncertainty signal.
Code usually thresholds it into a boolean.

Documented example — request and response:

```json
{
  "state": "I have asked three times now. Can I please just talk to a real person?",
  "questions": {
    "is_human_escalation": {
      "type": "noul",
      "instructions": "Is the customer asking for a human agent?"
    },
    "is_repeat_contact": {
      "type": "noul",
      "instructions": "Has the customer contacted support about this before?",
      "criteria": {
        "true": "Mentions a prior attempt, ticket, or that they have asked before",
        "false": "No sign of any previous contact"
      }
    }
  }
}
```

```json
{
  "model": "jev-latest",
  "answers": {
    "is_human_escalation": {
      "type": "noul",
      "noul": 0.99
    },
    "is_repeat_contact": {
      "type": "noul",
      "noul": 0.93
    }
  },
  "usage": {
    "input_tokens": 360,
    "output_tokens": 39
  }
}
```

[ts-noul]: https://docs.typesafe.ai/primitives/noul.md

#### Score

Source: [score primitive][ts-score].

Purpose: rate the state along an ordered rubric of described levels —
for example severity, relevance, or (as in the entity-alignment cookbook)
"same product / maybe / different product". `criteria` is an ordered
array of 2 to 10 level descriptions, low end to high end.

Request fields: `type` = `"score"`; `instructions` = what to rate;
`criteria` = ordered array of level descriptions.

Response fields: `score` (probability-weighted mean of level numbers,
may fall between levels), `legend` (level number to description),
`probabilities` (per-level distribution, sums to 1), `confidence`.

Levels describe concrete situations, not degrees: "Broken or degraded
feature, but workaround exists" works; "Moderately severe" and bare
numbers do not. Each level is judged independently — the model does not
see the level's number or its neighbours.

Documented example — request criteria and response:

```json
{
  "bug_severity": {
    "type": "score",
    "instructions": "How severe is the reported issue?",
    "criteria": [
      "Cosmetic; no impact to functionality",
      "Broken or degraded feature, but workaround exists",
      "Blocking issue; no workaround exists"
    ]
  }
}
```

```json
{
  "model": "jev-latest",
  "answers": {
    "bug_severity": {
      "type": "score",
      "score": 1.3,
      "confidence": 0.54,
      "legend": {
        "0": "Cosmetic; no impact to functionality",
        "1": "Broken or degraded feature, but workaround exists",
        "2": "Blocking issue; no workaround exists"
      },
      "probabilities": {
        "0": 0.0,
        "1": 0.7,
        "2": 0.3
      }
    }
  },
  "usage": {
    "input_tokens": 332,
    "output_tokens": 18
  }
}
```

[ts-score]: https://docs.typesafe.ai/primitives/score.md

#### Probability and Confidence

Source: [confidence][ts-confidence], [primitives][ts-primitives].

`probabilities` is the model's distribution over your options (Choice)
or levels (Score); values sum to 1. It is the raw signal.

`confidence` is a separate 0–1 statistic TypeSafe computes from the
shape of that distribution: a single concentrated peak means high
confidence, probability spread across several outcomes means low
confidence. It is returned on every Choice and Score answer. The docs do
not publish the exact formula; they note you can compute your own measure
from `probabilities` instead.

Confidence describes the answer's distribution, not a guarantee of
correctness; calibration makes probabilities meaningful across many
predictions, not individually. A low-confidence Choice usually means no
option is a clear winner; a low-confidence Score usually means levels
overlap, the question measures more than one thing, or the state lacks
enough information. A Noul near 0.5 means yes and no have similar
probability — not "medium intensity".

The documented usage pattern is three bands: high confidence → act
automatically; medium → proceed with caution (confirm, flag, gather
more); low → do not act (route to a human, request clarification, or
fall back). Thresholds should scale with the risk of each action and be
tuned on your own data.

[ts-confidence]: https://docs.typesafe.ai/confidence.md

### HTTP API

Source: [API reference][ts-api].

[ts-api]: https://docs.typesafe.ai/api.md

#### Endpoint and Authentication

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

The API key is created in the console and read from `TYPESAFE_API_KEY`.
A second endpoint, `GET https://api.typesafe.ai/v1/models`, lists models
(see [models][ts-models]). Documented cURL, verbatim from the
[quickstart][ts-quickstart]:

```bash
curl -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
  {
    "state": "Hi, I've been trying to connect my Stripe account for 3 days and it keeps failing. I'm losing sales. Please help ASAP.",
    "model": "jev-latest",
    "questions": {
      "urgency": {
        "type": "noul",
        "instructions": "Does this message express urgency?"
      }
    }
  }
EOF
```

[ts-quickstart]: https://docs.typesafe.ai/introduction/quickstart.md

#### Request Envelope

Top-level body fields: `state` (string | object | array, required),
`model` (string, required, e.g. `"jev-latest"`), and `questions` (map of
question ID to question object, required). Each question carries `type`,
`instructions`, and a type-specific `criteria`:

| Question | `criteria` shape                                   | Required |
| -------- | -------------------------------------------------- | -------- |
| `choice` | Map of option name to description; `null` allowed  | Yes      |
| `score`  | Ordered array of ≥2 level descriptions             | Yes      |
| `noul`   | `{"true": ..., "false": ...}` outcome descriptions | No       |

Minimal documented request:

```json
{
  "state": "Help! My payouts have been failing for 3 days.",
  "model": "jev-latest",
  "questions": {
    "is_urgent": {
      "type": "noul",
      "instructions": "Does this convey urgency?"
    }
  }
}
```

#### Batching Questions in One Request

Source: [primitives][ts-primitives], [fan-out][ts-fan-out].

The `questions` map is the batching mechanism: every question in the map
is evaluated independently and in parallel against the same `state`.
Question types mix freely. Adding questions barely changes response time;
each extra question costs only its own tokens. Speculative questions —
whose answers only matter on some code paths — go in the same call and
code ignores what it does not need.

Limits: a Choice accepts up to 255 options; the question count is bounded
only by the request token budget, which state and questions share. The
Models page documents 64k tokens per request and 32k tokens for `state`
plus the single longest question; the primitives page describes the
shared budget as "around 32,000 tokens, roughly 150,000 characters" —
see Open Questions.

A second request is only needed when an earlier answer is required to
build the next state or option set (fetch evidence, create the objects
being classified, choose the next options).

[ts-fan-out]: https://docs.typesafe.ai/patterns/fan-out.md

#### Response Envelope

```json
{
  "model": "jev-latest",
  "answers": {
    "is_urgent": {
      "type": "noul",
      "noul": 0.92
    }
  },
  "usage": { "input_tokens": 312, "output_tokens": 48 }
}
```

`model` echoes the model that answered; `answers` holds one answer per
question under the request's own IDs; `usage` reports `input_tokens` and
`output_tokens`. Answer shapes per type are covered under Primitives.

#### Errors and Status Codes

| Status                     | Meaning                                        |
| -------------------------- | ---------------------------------------------- |
| `401 Unauthorized`         | Missing or invalid API key                     |
| `422 Unprocessable Entity` | Body failed validation; details name the field |
| `429 Too Many Requests`    | Rate limit exceeded; back off and retry        |
| `529 Overloaded`           | TypeSafe temporarily overloaded; retry shortly |

On `429` or `529`, retry with exponential backoff. The client SDKs retry
automatically and honor `Retry-After` / `retry-after-ms` headers. The
Python SDK additionally defines exceptions for 400, 403, 404, and generic
5xx responses (see Python SDK below).

#### Timeouts

No server-side timeout is documented. The Python SDK applies
`DEFAULT_TIMEOUT = 10.0` seconds per HTTP operation ([constants][ts-constants])
and accepts `timeout` (seconds or `httpx2.Timeout`) per client and per
call; expiry raises `TypeSafeAPITimeoutError` ([exceptions][ts-exceptions]).
Documented latency expectation: most queries complete in about 100 ms
([how to build][ts-how-to-build]); the use-case map cites ~150 ms
([use-case map][ts-use-case-map]).

[ts-constants]: https://docs.typesafe.ai/sdk/python/api/constants.md
[ts-exceptions]: https://docs.typesafe.ai/sdk/python/api/exceptions.md
[ts-how-to-build]: https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md
[ts-use-case-map]: https://docs.typesafe.ai/concepts/use-case-map.md

### Python SDK

Source: [SDK docs][ts-sdk], [usage][ts-sdk-usage], [sync
client][ts-sdk-sync], [question types][ts-sdk-questions], [response
types][ts-sdk-responses], [retries][ts-sdk-retries],
[exceptions][ts-exceptions], [constants][ts-constants],
[changelog][ts-sdk-changelog].

[ts-sdk]: https://docs.typesafe.ai/sdk/python.md
[ts-sdk-usage]: https://docs.typesafe.ai/sdk/python/usage.md
[ts-sdk-sync]: https://docs.typesafe.ai/sdk/python/api/clients/sync.md
[ts-sdk-questions]: https://docs.typesafe.ai/sdk/python/api/types/questions.md
[ts-sdk-responses]: https://docs.typesafe.ai/sdk/python/api/types/responses.md
[ts-sdk-retries]: https://docs.typesafe.ai/sdk/python/api/retries.md
[ts-sdk-changelog]: https://docs.typesafe.ai/sdk/python/changelog.md
[ts-sdk-github]: https://github.com/typesafe-ai/typesafe-sdk-python

#### Install and Client Setup

```bash
pip install typesafe-sdk
# or
uv add typesafe-sdk
```

Requires Python >= 3.10. Latest documented release is v0.7.0
(2026-09-18), which moved serialization from `msgspec` to `pydantic`;
v0.5.7 (2026-09-14) was the initial public release
([GitHub][ts-sdk-github]).

Environment variables: `TYPESAFE_API_KEY` (required — the same variable
we already provision), `TYPESAFE_BASE_URL` (default
`https://api.typesafe.ai`), `TYPESAFE_DEFAULT_MODEL` (default
`jev-latest`), `TYPESAFE_LOG_LEVEL`.

Two clients exist: `TypeSafeClient` (sync) and `AsyncTypeSafeClient`,
both context managers. Constructor options: `api_key`, `model`, `retry`
(`RetryPolicy`), `timeout`, `headers`, `transport`, `http_client`,
`base_url`; explicit options override environment variables.

#### Asking Questions

`client.system_one(state, questions, *, model=None, retry=None,
timeout=None, extra_headers=None, extra_body=None, response_model=None)`.
`questions` is a nonempty mapping of IDs to `Noul`, `Choice`, `Score`
objects or raw question dictionaries; objects and dicts may be mixed.
`NoulCriteria(true=..., false=...)` supplies Noul outcome descriptions.
`extra_body` shallow-merges additional request fields (forward
compatibility), and `response_model` accepts a Pydantic model for typed
responses. `client.models.list()` returns available models.

Documented example, verbatim from the quickstart:

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

client = TypeSafeClient()

ticket = "Hi, I've been trying to connect my Stripe account for 3 days and it keeps failing. I'm losing sales. Please help ASAP."

response = client.system_one(
    state=ticket,
    questions={
        "department": Choice(
            instructions="Which team should handle this",
            criteria={
                "billing": "Payment or subscription issues",
                "technical": "Bugs or integration problems",
                "sales": "Pricing or account questions",
            },
        ),
        "frustration": Score(
            instructions="How frustrated the customer appears",
            criteria=[
                "Calm, just stating facts",
                "Frustrated but civil",
                "Very angry, strong language",
            ],
        ),
        "is_urgent": Noul(
            instructions="The message conveys urgency or time-sensitivity",
        ),
    },
)

print(response.answers["department"].choice)  # "billing"
print(response.answers["frustration"].score)  # 1.035
print(response.answers["is_urgent"].noul)     # 0.999
```

#### Responses and Errors

`SystemOneResponse` carries `model`, `usage` (`input_tokens`,
`output_tokens`), `answers` (all answers keyed by question ID), and
filtered views `nouls`, `choices`, `scores`. `request_id` exposes the
`x-typesafe-request-id` header and `raw_http_response` the underlying
`httpx2.Response`. Answer models: `NoulAnswer.noul`; `ChoiceAnswer`
(`.choice`, `.probabilities`, `.confidence`); `ScoreAnswer` (`.score`,
`.confidence`, `.legend`, `.probabilities` — the SDK keys `legend` and
`probabilities` by integer level, not string).

Exception hierarchy: `TypeSafeError` (base) → `TypeSafeAPIError`
(`.status`, `.body`, `.headers`, `.endpoint`, `.request_id`) with
subclasses `TypeSafeBadRequestError` (400), `TypeSafeAuthenticationError`
(401), `TypeSafePermissionDeniedError` (403), `TypeSafeNotFoundError`
(404), `TypeSafeUnprocessableEntityError` (422), `TypeSafeRateLimitError`
(429, adds `.retry_after_ms`), `TypeSafeInternalServerError` (5xx), plus
`TypeSafeAPIResponseValidationError` (`.field_path`). Connection
failures raise `TypeSafeAPIConnectionError`; timeouts raise
`TypeSafeAPITimeoutError` (`.timeout`).

`RetryPolicy` defaults: `max_retries=2`, `backoff_initial=0.5`,
`backoff_max=5.0`, `backoff_jitter=0.25`,
`http_statuses={408, 429, *range(500, 600)}`,
`respect_retry_after=True`, `api_connection_error=True`,
`api_timeout_error=True`, `timeout=30.0` (total retry budget per call,
seconds). Pass `RetryPolicy(max_retries=0)` to disable retries.

### Pricing and Limits

Source: [models][ts-models], [API reference][ts-api].

| Item        | Documented figure                                            |
| ----------- | ------------------------------------------------------------ |
| Price       | $42 per Btok / $0.042 per Mtok input; output tokens are free |
| Rate limits | 250,000 tokens per second; 1,200 requests per minute         |
| Context     | 64k tokens per request; 32k for `state` + longest question   |
| Input       | Text only (string, JSON object, or array of text)            |

- A Btok is a billion tokens and an Mtok a million tokens.
- Exceeding either rate limit returns `429 Too Many Requests`; SDKs
  retry with backoff and honor `retry-after`.
- The docs warn the limits adjust dynamically while demand is high;
  higher limits are available on custom or enterprise plans
  (sales@typesafe.ai).

Not documented: any free tier, trial credit amount, per-account quota,
or monthly billing unit. (Our $5 credit comes from the hackathon, not
the docs.)

### Known Weak Spots

Source: [jaggedness][ts-jaggedness], [models][ts-models].

The jaggedness page (applies to `jev-1.13`, reviewed 2026-09-17) lists
documented failure modes:

| #   | Failure mode                                            | Documented mitigation                          |
| --- | ------------------------------------------------------- | ---------------------------------------------- |
| 1   | Literal reading: answers the question written           | Exact conditions; boundary cases in criteria   |
| 2   | Math and numbers: unreliable counting, weak calibration | Arithmetic and conversions stay in code        |
| 3   | Dates read as text, not ordered quantities              | Extract components; compare in code            |
| 4   | Indirection: double negatives, multi-hop reasoning      | Direct instructions; name relevant state parts |
| 5   | Large state full of irrelevant detail                   | Filter first; send only needed fields          |
| 6   | Adversarial content not treated as hostile              | Precise prompts; test edge cases               |
| 7   | Contradictory instructions and criteria                 | Align criteria with the instruction            |
| 8   | No structural invariants across question types          | One decision, one question shape               |
| 9   | Generation: not trained to produce text                 | Choice over options, or a generative model     |

- Row 2 also covers poor numeric representations such as hex, RGB, and
  assembly; pass semantic buckets instead of raw values.
- Row 8 means a Noul and an equivalent Choice are not comparable, and a
  question and its negation can sum to ≠1; never carry thresholds across
  question types.
- Additional documented limits: text input only; English is the primary
  training language and non-English content (including CJK) has lower
  accuracy; score outputs should not be interpolated to reconstruct
  exact magnitudes between levels.

[ts-jaggedness]: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md

### Documented Patterns

Source: [patterns][ts-patterns] and the cookbook pages linked per row.

| Pattern                                         | What it does                                      | Use for Averis? |
| ----------------------------------------------- | ------------------------------------------------- | --------------- |
| [Speculative fan-out][ts-fan-out]               | All branch questions in one call                  | Yes             |
| [Confidence-gated routing][pat-conf]            | Confidence floor plus per-action thresholds       | Yes             |
| [Composite scoring][pat-composite]              | Weighted mix of independent Score questions       | Maybe           |
| [Intent routing][pat-intent]                    | Classify once; route to cheapest handler          | Maybe           |
| [Parallel questions][cb-parallel]               | 13 questions, one call: 12.2x cheaper, 10x faster | Yes             |
| [Self-consistency: nouls][cb-cons-noul]         | 15 repeats; maps 0.30–0.70 to `uncertain`         | Yes             |
| [Self-consistency: choices][cb-cons-choice]     | ≥0.60 top prob: 99.2% agreement, 74.2% auto       | Maybe           |
| [Re-ranking][cb-rerank]                         | Per-pair rerank: top-1 5%→18%, top-10 38%→62%     | Maybe           |
| [Line-by-line search][cb-find]                  | Choice ranks 218 lines; Noul guards empty docs    | Maybe           |
| [Structure recovery][cb-autoformat]             | Two passes rebuild Markdown from plain text       | No              |
| [Function calling][cb-func]                     | Name a Choice; closed-set args Choice/Noul        | No              |
| [Skill suggestion][cb-skill]                    | Ranks 182 skills; second pass may reject all      | No              |
| [Entity alignment][cb-entity]                   | 3-level Score over 450 pairs; maybe → curator     | Yes             |
| [Classifying RAG passages][cb-rag]              | Four Nouls per passage feed a threshold router    | Maybe           |
| [Double-checking citations][cb-citation]        | String match + context Choice; ≥0.8 stands        | Maybe           |
| [Guardrails for LLMs][cb-guard]                 | Hazard Nouls plus harm Score gate LLM I/O         | No              |
| [SDE cascade][cb-sde]                           | Per-field Noul verifiers gate escalation          | Yes             |
| [Date extraction][cb-date]                      | Closed-set Choices; code does calendar math       | Maybe           |
| [Pre-parsed extraction][cb-preparsed]           | Choice picks among regex spans; `none` escape     | Yes             |
| [Hierarchical classification][cb-hier]          | One Choice per level; beam search by probability  | No              |
| [Autoresearch features][cb-autoresearch]        | Answers become CatBoost features; RMSE 1.77       | No              |
| [Classification using confidence][cb-classconf] | 75-way Choice; ≥0.9 half right 90% vs 40%         | Yes             |

Details the cells compress:

- Speculative fan-out: put every question the workflow might need,
  including ones whose answer matters only on some branches, into a
  single call; code decides which answers to use.
- Confidence-gated routing: a floor below which nothing acts, plus
  per-action thresholds scaled to the cost of a wrong decision.
- Composite scoring: split a complex judgment into independent Score
  questions, normalize each to 0–1, combine with weights owned by code.
- Intent routing: the cheapest adequate handler is deterministic code,
  a specialist LLM, or a human.
- Parallel questions ran 13 questions over a GDPR article; batched vs
  one call each gave the same answers — the state is billed once per
  request.
- Self-consistency nouls repeated a 14-Noul rubric 15 times; TypeSafe's
  per-question probability std dev was 0.0102, and the 0.30–0.70 band
  maps to an explicit `uncertain` outcome for human review.
- Self-consistency choices ran the same experiment over 8 Choice
  questions; abstaining below top probability 0.60 raised agreement to
  99.2% with 74.2% of answers still automatic.
- Re-ranking built a BM25 30-passage shortlist per query and asked one
  question per query–candidate pair on the CLERC benchmark.
- Line-by-line search adds a companion Noul ("does the document contain
  an answer at all?") because a Choice must pick something even when
  nothing fits; the document was a Terms of Service.
- Structure recovery: pass 1 asks one Noul per adjacent line pair ("does
  this break split a sentence?"); pass 2 asks one Choice per merged
  block for its type plus speculative companion questions.
- Function calling maps natural-language requests to typed calls: the
  function name is a Choice and each closed-set argument a Choice or
  Noul, each with confidence.
- Skill suggestion's second request re-reads the top three with full
  text and may reject all, cutting incorrect skill loads by over half.
- Entity alignment's middle outcome needs no fitted threshold; per-field
  match Nouls ride along for the curator.
- The RAG Nouls ask: relevant? usable evidence? contradicts the query?
  contains an injected instruction? The router keeps, flags, or drops.
- Citation check's string match catches fabricated quotes; the Choice
  judges whether the quote's context supports, contradicts, or says
  nothing about the claim; below 0.8 a human reviews.
- Guardrails screens every message in and out of an LLM app; thresholds
  in code decide pass, review, block, or support route.
- SDE cascade: a cheap model extracts structured data, per-field Nouls
  return P(something is wrong), and only records that fire the gate
  reach a reasoning model — most of the quality at a fraction of cost.
- Date extraction turns dates into closed sets (month, day, year,
  weekday, kind); code assembles the date and does all calendar math,
  with a review gate at confidence 0.60.
- Pre-parsed extraction: a regex over-finds candidate spans, the Choice
  picks the requested one with a `none` escape option, and code copies
  the verbatim span, so the model can never invent a value.
- Hierarchical classification keeps the best K paths by geometric-mean
  edge probability and explores them as parallel questions.
- Autoresearch: an LLM proposes TypeSafe questions, the answers become
  numeric features for a CatBoost regressor, and model errors feed the
  next proposal round; held-out RMSE fell to 1.77 after five rounds.
- Confidence classification ran over SEC filings; below the 0.9 cutoff
  answers fall back to the broader division label at no extra call.

[ts-patterns]: https://docs.typesafe.ai/patterns.md
[pat-conf]: https://docs.typesafe.ai/patterns/confidence-routing.md
[pat-composite]: https://docs.typesafe.ai/patterns/composite-scoring.md
[pat-intent]: https://docs.typesafe.ai/patterns/intent-routing.md
[cb-parallel]: https://docs.typesafe.ai/cookbooks/parallel_questions.md
[cb-cons-noul]: https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook.md
[cb-cons-choice]: https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook.md
[cb-rerank]: https://docs.typesafe.ai/cookbooks/rerank_typesafe.md
[cb-find]: https://docs.typesafe.ai/cookbooks/semantic_find.md
[cb-autoformat]: https://docs.typesafe.ai/cookbooks/autoformat.md
[cb-func]: https://docs.typesafe.ai/cookbooks/function_calling.md
[cb-skill]: https://docs.typesafe.ai/cookbooks/skill_suggestion.md
[cb-entity]: https://docs.typesafe.ai/cookbooks/entity_alignment.md
[cb-rag]: https://docs.typesafe.ai/cookbooks/classifying_rag_passages.md
[cb-citation]: https://docs.typesafe.ai/cookbooks/citation_check.md
[cb-guard]: https://docs.typesafe.ai/cookbooks/llm_guardrails.md
[cb-sde]: https://docs.typesafe.ai/cookbooks/sde_cascade.md
[cb-date]: https://docs.typesafe.ai/cookbooks/date_extraction_cookbook.md
[cb-preparsed]: https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md
[cb-hier]: https://docs.typesafe.ai/cookbooks/hierarchical_classification.md
[cb-autoresearch]: https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md
[cb-classconf]: https://docs.typesafe.ai/cookbooks/classification_using_confidence.md

### How Averis Uses Jev

Source: [primitives][ts-primitives], [confidence routing][pat-conf],
[entity alignment][cb-entity], [SDE cascade][cb-sde].

| Task                                | Primitive                    | Question shape                        | Confidence use               |
| ----------------------------------- | ---------------------------- | ------------------------------------- | ---------------------------- |
| Email classification (5 categories) | One `Choice` per email       | Five category keys + descriptions     | Below floor → `NEEDS_REVIEW` |
| Text field equivalence              | One `Noul` per field         | "Same party/port?" + true/false rules | Mid band escalates           |
| Numeric fields                      | Code first, `Noul` if needed | Exact compare in code                 | Same banding                 |
| Document-type check                 | One `Choice` per attachment  | SI / BL / `other_document`            | Low conf → `wrong_doc_type`  |
| `NEEDS_REVIEW` escalation           | Confidence-gated routing     | Thresholds in code, not prompts       | Per-action thresholds        |

- Classification `instructions`: "Which category best describes this
  email's request?"; `criteria` keys `BL_COMPARISON`, `SI_REQUEST`,
  `INVOICE_QUERY`, `GENERAL`, `SPAM`, each with a one-line description
  of what it covers and what it does not. A second-place probability
  above ~0.25 flags ambiguous routing for logging.
- Text fields: `shipper`, `consignee`, `notify_party`,
  `port_of_loading`, `port_of_discharge`. The Noul asks whether
  `si.<field>` and `bl.<field>` name the same party or port, with
  `criteria.true`/`false` spelling out equivalence rules (case,
  punctuation, city+country vs city). `noul` at or above the threshold
  means match; at or below a low threshold means defect; the band around
  0.5 escalates that field — the self-consistency cookbook maps
  0.30–0.70 to `uncertain`.
- Numeric fields (`container_count`, `gross_weight_kg`): Jev is weak on
  math and numbers (jaggedness #2), so code normalizes and compares
  exactly. A Noul may still judge semantic variants like "3 x 40ft" vs
  "three containers", but Jev never computes the difference.
- Document-type `criteria`: `shipping_instruction`, `bill_of_lading`,
  `other_document` (the documented `other` escape hatch), with
  descriptions of each document's role. `other_document` or low
  confidence → `NEEDS_REVIEW` with `wrong_doc_type`; this mirrors the
  citation-check gate pattern.
- Escalation: thresholds live in code, not prompts. `missing_attachment`
  and `unreadable` are deterministic code checks; `missing_value` is an
  absent-value check (deterministic or a "is the field stated?" Noul).
  Auto-label needs a confidence floor; an auto-mismatch flag needs a
  higher one — the docs prescribe scaling thresholds to the stakes of
  each action.

Batching to protect the $5 credit: `state` is billed once per request, so
every question over the same content goes in one call — the parallel-
questions cookbook shows separate calls re-bill the state each time
(12.2x more expensive there). Concretely: one request per email carries
the classification Choice plus speculative doc-type Choices (when
attachments exist) and, for `BL_COMPARISON` emails, a second request
whose state holds Gemini's extracted SI/BL fields carrying all seven
field Nouls plus escalation questions. Irrelevant answers are simply
ignored by code; speculative questions cost only their own tokens.

Cost estimate for one 520-email run (documented price: $0.042 per Mtok
input, output free; token counts below are our assumptions, not
documented figures — verify against `usage.input_tokens` on a pilot):

| Stage                                     | Requests | Assumed input tokens each                       | Tokens     | Cost       |
| ----------------------------------------- | -------- | ----------------------------------------------- | ---------- | ---------- |
| Classification (all emails)               | 520      | ~1,500 (email state + ~6 questions)             | 780,000    | $0.0328    |
| Comparison (~126 emails with attachments) | 126      | ~4,000 (SI+BL extracted fields + ~12 questions) | 504,000    | $0.0212    |
| **Total**                                 | 646      | —                                               | ~1.28 Mtok | **~$0.05** |

Even at ten times these token assumptions the run stays well under $1;
the $5 credit is not the constraint. The docs' own `usage` examples show
312–588 input tokens for small states, so our estimates are conservative.

### Open Questions

- The exact `confidence` formula is not published — the docs say only
  that it is computed from the spread of `probabilities`. Measure its
  distribution on our emails before fixing the `NEEDS_REVIEW` floor.
- The token budget is described two ways: 64k per request with 32k for
  `state` + longest question (models.md) vs "around 32,000 tokens"
  shared by `state` and all questions (primitives.md). Test a max-size
  payload.
- Cookbook numbers for batching differ between pages: the cookbook says
  12.2x cheaper / 10.0x faster; the primitives page cites 11.5x / 9.6x.
  Either way batching is clearly correct; do not quote a figure in the
  TRD without rechecking.
- Docs examples use `jev`, `jev-1.13`, and `jev-1.13.0` as `model`
  values while the models table lists only `jev-1.13.0` plus the
  `jev-latest` / `jev-preview` aliases. Confirm which strings the API
  accepts on day one; consider pinning `jev-1.13.0` since we tune
  thresholds.
- Whether question text is billed as input tokens is implied (extra
  questions "cost tokens") but the split is not documented — check
  `usage.input_tokens` with and without extra questions.
- CJK accuracy is documented as lower; Gemini's extracted field values
  may carry Chinese labels (`Consignee (收货人)`). Test field-equivalence
  Nouls on Chinese-containing values early.
- Attachments could contain adversarial or spam-like text; jaggedness
  notes `state` is not treated as hostile. Test that spam/phishing-style
  bodies do not steer the classification Choice.
- A question and its negation need not sum to 1, and Noul probabilities
  are not comparable to Choice probabilities for the same decision. Pick
  one question shape per judgment and do not mix thresholds.
- Server-side behavior on timeouts and concurrency limits (vs the
  documented 1,200 req/min and 250k tok/s rate limits, which may change
  dynamically) is not documented. 520 sequential calls is trivially
  within limits, but retry/failure behavior on a bulk run should be
  observed.
