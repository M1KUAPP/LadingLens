# Technical Requirements

How Averis is built: architecture, data model, AI pipeline, integrations,
deployment, and the non-functional requirements behind each choice.

Contents:

1.  [Jev Decision Layer (TypeSafe)](#jev-decision-layer-typesafe)

Only the Jev reference below is written so far; the other sections are
placeholders to be filled in.

## Jev Decision Layer (TypeSafe)

Technical reference for the TypeSafe API and its System One model Jev,
which we use as the decision layer of the pipeline: email classification,
field-equivalence judgments, document-type checks, and escalation to human
review. Gemini performs document extraction upstream; Jev only ever sees
text state and typed questions. Every fact below is taken from the
TypeSafe documentation, with the source page cited per subsection; where
the docs are silent, the entry says "Not documented".

### Overview

Source: https://docs.typesafe.ai/introduction.md,
https://docs.typesafe.ai/concepts/system-one.md,
https://docs.typesafe.ai/introduction/machine-learning-primer.md

TypeSafe is a hosted API whose models make fast, structured decisions that
software can consume directly. Jev is TypeSafe's flagship model and the
first "System One" model. A request sends a `state` (text or JSON) plus
typed `questions`; Jev returns typed answers and probability
distributions, never generated text.

The name comes from Kahneman's _Thinking, Fast and Slow_: System 1 is fast
and intuitive, System 2 slow and deliberate. A System One model supplies
"gut-check" judgments a knowledgeable person could make in seconds, while
ordinary code owns the workflow, deterministic rules, and side effects.

How it differs from a generative LLM:

| Property      | Generative LLM                        | Jev (System One)                                                                         |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Output        | Free text, parsed back into structure | Typed values and probabilities, no text generation                                       |
| Training      | RLHF (preference) / RLVR (reasoning)  | RLCD: reinforcement learning for calibrated decisions                                    |
| Explanations  | Can produce reasoning text            | None; answers constrained to the options you define                                      |
| Uncertainty   | Tends toward overconfident prose      | Calibrated probabilities; p=0.8 should be right ~80% of the time across many predictions |
| Workflow role | Agent decides next steps              | Code owns control flow; model supplies narrow judgments                                  |

Calibration is measured across groups of predictions and does not
guarantee any individual answer is correct. Jev evaluates every question
in a request independently and in parallel; most queries complete in
about 100 ms. Input is text only: strings, JSON objects, or arrays of
text; no image, audio, or video.

### Models and Versions

Source: https://docs.typesafe.ai/models.md

| Model ID     | Status                                               |
| ------------ | ---------------------------------------------------- |
| `jev-1.13.0` | Current versioned release; the only model documented |

| Alias         | Points to    | Meaning                                                                 |
| ------------- | ------------ | ----------------------------------------------------------------------- |
| `jev-latest`  | `jev-1.13.0` | Most recent stable release; SDK default; used throughout the docs       |
| `jev-preview` | `jev-1.13.0` | Most recent release incl. previews; currently identical to `jev-latest` |

The response `model` field reports the versioned ID that answered, so log
it per request. If confidence thresholds are tuned against one version,
pin that version ID rather than an alias, because aliases move when a new
release ships.

Jev is not fine-tuned per customer; the same RLCD-trained weights serve
every account. Domain behavior is shaped through `state`, `instructions`,
and `criteria` in the request. English is the primary training language;
other languages, including CJK scripts, are accepted but have lower
accuracy. `GET /v1/models` lists the names an account may send (currently
the aliases, each with `description` and `release_date`); versioned IDs
such as `jev-1.13.0` are accepted whether or not they appear in the list.

The cookbooks published in September 2026 ran against `jev-1.12`; the
jaggedness page applies to `jev-1.13` (reviewed 2026-09-17). Example code
in the docs also uses the shorthand `jev-1.13` and `jev` as model values;
the documented versioned ID is `jev-1.13.0`.

### Primitives

Source: https://docs.typesafe.ai/primitives.md

Three question types exist. A question defines one judgment; its answer is
the typed value that comes back, keyed under the question ID you chose.
All three types can be mixed in a single API call.

| Type   | What it answers         | Returns                                          |
| ------ | ----------------------- | ------------------------------------------------ |
| Choice | Which of these options? | `choice`, `probabilities`, `confidence`          |
| Score  | Which level?            | `score`, `legend`, `probabilities`, `confidence` |
| Noul   | Is this true?           | `noul` (0 to 1)                                  |

Every question has an ID (code-only, never sent to the model), a `type`,
and `instructions`. Choice and Score require `criteria`; Noul accepts
`criteria` optionally. `instructions` and `criteria` entries accept a
string, JSON object, or array; use objects when a description needs
separate fields such as `what`, `not_for`, and `examples`
(https://docs.typesafe.ai/primitives/advanced.md). To point a question at
part of a structured state, name it in `instructions` with a backticked
dot-and-index path such as `` `ticket.messages[0].text` ``.

Ask one narrow judgment per question — something a knowledgeable person
decides in a second. Split multi-factor judgments into separate questions
and combine the answers in code. Add an `other` / `none of the above`
option to a Choice when the list might not cover every input.

#### Choice

Source: https://docs.typesafe.ai/primitives/choice.md

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

#### Score

Source: https://docs.typesafe.ai/primitives/score.md

Purpose: rate the state along an ordered rubric of described levels —
for example severity, relevance, or (as in the entity-alignment cookbook)
"same product / maybe / different product". `criteria` is an ordered
array of 2 to 10 level descriptions, low end to high end.

Request fields: `type` = `"score"`; `instructions` = what to rate;
`criteria` = ordered array of level descriptions.

Response fields: `score` (probability-weighted mean of level numbers, may
fall between levels), `legend` (level number to description),
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

#### Noul

Source: https://docs.typesafe.ai/primitives/noul.md

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

#### Probability vs Confidence

Source: https://docs.typesafe.ai/confidence.md,
https://docs.typesafe.ai/primitives.md

`probabilities` is the model's distribution over your options (Choice) or
levels (Score); values sum to 1. It is the raw signal.

`confidence` is a separate 0–1 statistic TypeSafe computes from the shape
of that distribution: a single concentrated peak means high confidence,
probability spread across several outcomes means low confidence. It is
returned on every Choice and Score answer. The docs do not publish the
exact formula; they note you can compute your own measure from
`probabilities` instead.

Confidence describes the answer's distribution, not a guarantee of
correctness; calibration makes probabilities meaningful across many
predictions, not individually. A low-confidence Choice usually means no
option is a clear winner; a low-confidence Score usually means levels
overlap, the question measures more than one thing, or the state lacks
enough information. A Noul near 0.5 means yes and no have similar
probability — not "medium intensity".

The documented usage pattern is three bands: high confidence → act
automatically; medium → proceed with caution (confirm, flag, gather
more); low → do not act (route to a human, request clarification, or fall
back). Thresholds should scale with the risk of each action and be tuned
on your own data.

### HTTP API

Source: https://docs.typesafe.ai/api.md

#### Endpoint and Authentication

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

The API key is created in the console and read from `TYPESAFE_API_KEY`.
A second endpoint, `GET https://api.typesafe.ai/v1/models`, lists models
(https://docs.typesafe.ai/models.md). Documented cURL, verbatim from the
quickstart (https://docs.typesafe.ai/introduction/quickstart.md):

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

#### Request Envelope

Top-level body fields: `state` (string | object | array, required),
`model` (string, required, e.g. `"jev-latest"`), and `questions` (map of
question ID to question object, required). Each question carries `type`,
`instructions`, and a type-specific `criteria`:

| Question | `criteria` shape                                   | Required                       |
| -------- | -------------------------------------------------- | ------------------------------ |
| `choice` | `map<string, string                                | null>` of option → description | Yes |
| `score`  | Ordered array of ≥2 level descriptions             | Yes                            |
| `noul`   | `{"true": ..., "false": ...}` outcome descriptions | No                             |

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

Source: https://docs.typesafe.ai/primitives.md,
https://docs.typesafe.ai/patterns/fan-out.md

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

| Status                     | Meaning                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `401 Unauthorized`         | Missing or invalid API key                                           |
| `422 Unprocessable Entity` | Request body failed validation; the body details the offending field |
| `429 Too Many Requests`    | Rate limit exceeded; back off and retry after a short delay          |
| `529 Overloaded`           | TypeSafe temporarily overloaded; retry after a short delay           |

On `429` or `529`, retry with exponential backoff. The client SDKs retry
automatically and honor `Retry-After` / `retry-after-ms` headers. The
Python SDK additionally defines exceptions for 400, 403, 404, and generic
5xx responses (see Python SDK below).

#### Timeouts

No server-side timeout is documented. The Python SDK applies
`DEFAULT_TIMEOUT = 10.0` seconds per HTTP operation
(https://docs.typesafe.ai/sdk/python/api/constants.md) and accepts
`timeout` (seconds or `httpx2.Timeout`) per client and per call; expiry
raises `TypeSafeAPITimeoutError`
(https://docs.typesafe.ai/sdk/python/api/exceptions.md). Documented
latency expectation: most queries complete in about 100 ms
(https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md); the
use-case map cites ~150 ms
(https://docs.typesafe.ai/concepts/use-case-map.md).

### Python SDK

Source: https://docs.typesafe.ai/sdk/python.md,
https://docs.typesafe.ai/sdk/python/usage.md,
https://docs.typesafe.ai/sdk/python/api/clients/sync.md,
https://docs.typesafe.ai/sdk/python/api/types/questions.md,
https://docs.typesafe.ai/sdk/python/api/types/responses.md,
https://docs.typesafe.ai/sdk/python/api/retries.md,
https://docs.typesafe.ai/sdk/python/api/exceptions.md,
https://docs.typesafe.ai/sdk/python/api/constants.md,
https://docs.typesafe.ai/sdk/python/changelog.md

#### Install and Client Setup

```bash
pip install typesafe-sdk
# or
uv add typesafe-sdk
```

Requires Python >= 3.10. Latest documented release is v0.7.0
(2026-09-18), which moved serialization from `msgspec` to `pydantic`;
v0.5.7 (2026-09-14) was the initial public release. Source:
https://github.com/typesafe-ai/typesafe-sdk-python.

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

### Pricing, Rate Limits and Quotas

Source: https://docs.typesafe.ai/models.md,
https://docs.typesafe.ai/api.md

| Item        | Documented figure                                                               |
| ----------- | ------------------------------------------------------------------------------- |
| Price       | $42 per Btok / $0.042 per Mtok, charged per input token; output tokens are free |
| Rate limits | 250,000 tokens per second and 1,200 requests per minute                         |
| Context     | 64k tokens per request; 32k tokens for `state` plus the longest single question |
| Input       | Text only (string, JSON object, or array of text values)                        |

A Btok is a billion tokens and an Mtok a million tokens. Exceeding either
rate limit returns `429 Too Many Requests`; SDKs retry with backoff and
honor `retry-after`. The docs warn the limits adjust dynamically while
demand is high, and higher limits are available on custom or enterprise
plans (sales@typesafe.ai).

Not documented: any free tier, trial credit amount, per-account quota, or
monthly billing unit. (Our $5 credit comes from the hackathon, not the
docs.)

### Known Weak Spots

Source: https://docs.typesafe.ai/model-jaggedness/jev-1.13.md,
https://docs.typesafe.ai/models.md

The jaggedness page (applies to `jev-1.13`, reviewed 2026-09-17) lists
documented failure modes:

| #   | Failure mode                                                                                                                        | Documented mitigation                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Literal reading: answers the question written, not the one meant                                                                    | Write exact conditions; put boundary cases in criteria                                              |
| 2   | Math and numbers: unreliable counting, weak numeric calibration, poor numeric representations (hex, RGB, assembly)                  | Keep arithmetic and conversions in code; pass semantic buckets                                      |
| 3   | Date and time comparison: dates read as text, not ordered quantities                                                                | Extract components with questions; compare in code                                                  |
| 4   | Indirection: double negatives and multi-hop reasoning cost accuracy                                                                 | Write instructions directly; name the relevant state parts                                          |
| 5   | Large state full of irrelevant detail: context rot lowers accuracy                                                                  | Filter first; send only the fields the question needs                                               |
| 6   | Adversarial content: state is not treated as hostile by default                                                                     | Write precise prompts; test edge cases before deploying                                             |
| 7   | Contradictory instructions and criteria                                                                                             | Align criteria with the instruction in clear language                                               |
| 8   | Structural invariants not guaranteed: a Noul and an equivalent Choice are not comparable; a question and its negation can sum to ≠1 | Ask each decision one way; never carry thresholds across question types                             |
| 9   | Generation: not trained to produce text                                                                                             | Turn extraction into Choice over enumerated options; use a generative model if text is truly needed |

Additional documented limits: text input only; English is the primary
training language and non-English content (including CJK) has lower
accuracy; score outputs should not be interpolated to reconstruct exact
magnitudes between levels.

### Documented Patterns

Architecture patterns (Source: https://docs.typesafe.ai/patterns.md):

- **Speculative fan-out** — put every question the workflow might need,
  including ones whose answer matters only on some branches, into a
  single call; code decides which answers to use
  (https://docs.typesafe.ai/patterns/fan-out.md).
- **Confidence-gated routing** — treat confidence as a second axis:
  a floor below which nothing acts, plus per-action thresholds scaled to
  the cost of a wrong decision
  (https://docs.typesafe.ai/patterns/confidence-routing.md).
- **Composite scoring** — split a complex judgment into independent Score
  questions, normalize each to 0–1, and combine with weights owned by
  code (https://docs.typesafe.ai/patterns/composite-scoring.md).
- **Intent routing** — classify each request once and route to the
  cheapest adequate handler: deterministic code, a specialist LLM, or a
  human (https://docs.typesafe.ai/patterns/intent-routing.md).

Cookbooks (one request shape each, all under
https://docs.typesafe.ai/cookbooks/):

- **Parallel questions** — 13 questions over the GDPR article in one call
  vs one call each: same answers, 12.2x cheaper and 10.0x faster batched,
  because the state is billed once (parallel_questions.md).
- **Self-consistency: nouls** — repeats a 14-Noul rubric 15 times;
  TypeSafe's per-question probability std dev is 0.0102; maps the 0.30–0.70
  band to an explicit `uncertain` outcome for human review
  (consistency_noul_cookbook.md).
- **Self-consistency: choices** — same experiment over 8 Choice
  questions; requiring top probability ≥ 0.60 and abstaining otherwise
  raises agreement to 99.2% with 74.2% of answers still automatic
  (consistency_choice_cookbook.md).
- **Re-ranking** — BM25 builds a 30-passage shortlist per query, then one
  TypeSafe question per query–candidate pair reranks it; top-1 accuracy
  rose 5% → 18% and top-10 38% → 62% on CLERC (rerank_typesafe.md).
- **Line-by-line search** — a Choice question ranks 218 line IDs of a
  Terms-of-Service document against a query while a companion Noul asks
  whether the document contains an answer at all, because Choice must
  pick something even when nothing fits (semantic_find.md).
- **Structure recovery** — reconstructs Markdown from stripped text in
  two requests: pass 1 asks one Noul per adjacent line pair ("does this
  break split a sentence?"), pass 2 asks one Choice per merged block for
  its type plus speculative companion questions (autoformat.md).
- **Function calling** — maps natural-language requests to typed function
  calls by making the function name a Choice and each closed-set
  argument a Choice or Noul, each with confidence
  (function_calling.md).
- **Skill suggestion** — one request ranks all 182 agent skills and asks
  whether any is needed; a second re-reads the top three with full text
  and may reject all, cutting incorrect skill loads by over half
  (skill_suggestion.md).
- **Entity alignment** — decides which of 450 candidate record pairs
  describe the same product using a single 3-level Score (same / maybe →
  curator / different), so the middle outcome needs no fitted threshold;
  per-field match Nouls ride along for the curator
  (entity_alignment.md).
- **Classifying RAG passages** — one request per retrieved passage
  carrying four Nouls (relevant? usable evidence? contradicts the query?
  contains an injected instruction?) feeding a threshold router that
  keeps, flags, or drops each passage (classifying_rag_passages.md).
- **Double-checking citations** — a string match catches fabricated
  quotes, then a Choice judges whether the quote's context supports,
  contradicts, or says nothing about the claim; confidence ≥ 0.8 lets
  the verdict stand, else a human reviews (citation_check.md).
- **Guardrails for LLMs** — screens every message in and out of an LLM
  app with a battery of hazard Nouls plus a harm Score; thresholds in
  code decide pass, review, block, or support route
  (llm_guardrails.md).
- **SDE cascade** — a cheap model extracts structured data, per-field
  Noul verifiers return P(something is wrong) for each value, and only
  records that fire the gate escalate to a reasoning model — most of the
  quality at a fraction of the cost (sde_cascade.md).
- **Date extraction** — turns dates into closed sets (month, day, year,
  weekday, kind) answered by Choice questions; code assembles the date
  and does all calendar math, with a review gate at confidence 0.60
  (date_extraction_cookbook.md).
- **Pre-parsed value extraction** — a regex over-finds candidate spans,
  a Choice picks the requested one (with a `none` escape option), and
  code copies the verbatim span, so the model can never invent a value
  (pre_parsed_value_extraction_cookbook.md).
- **Hierarchical classification** — classifies into deep taxonomies by
  walking one Choice per level; a beam search keeps the best K paths by
  geometric-mean edge probability and explores them as parallel questions
  (hierarchical_classification.md).
- **Autoresearch feature discovery** — an LLM proposes TypeSafe
  questions, the answers become numeric features for a CatBoost
  regressor, and model errors feed the next proposal round; held-out
  RMSE fell to 1.77 after five rounds
  (autoresearch_feature_discovery.md).
- **Classification using confidence** — 75-way Choice over SEC filings;
  at a 0.9 confidence cutoff the confident half is right 90% of the time
  vs 40% for the rest, which fall back to the broader division label at
  no extra call (classification_using_confidence.md).

### Mapping to Averis

Sources for the question shapes: https://docs.typesafe.ai/primitives.md,
https://docs.typesafe.ai/patterns/confidence-routing.md,
https://docs.typesafe.ai/cookbooks/entity_alignment.md,
https://docs.typesafe.ai/cookbooks/sde_cascade.md.

| Our task                                                                                                        | Primitive                                       | How to phrase the question/options                                                                                                                                                                                               | How to use confidence                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email classification (5 categories)                                                                             | One `Choice` per email                          | `instructions`: "Which category best describes this email's request?"; `criteria` keys `BL_COMPARISON`, `SI_REQUEST`, `INVOICE_QUERY`, `GENERAL`, `SPAM` each with a one-line description of what it covers and what it does not | `confidence` below our floor → `NEEDS_REVIEW` instead of guessing; second-place `probabilities` > ~0.25 can flag ambiguous routing for logging       |
| Field equivalence: text fields (`shipper`, `consignee`, `notify_party`, `port_of_loading`, `port_of_discharge`) | One `Noul` per field                            | `"Do `si.<field>`and`bl.<field>`name the same <party/port>?" with`criteria.true`/`false` spelling out equivalence rules (case, punctuation, city+country vs city)                                                                | `noul` ≥ threshold → match; ≤ low threshold → defect; the band around 0.5 → that field escalates (the cookbook maps 0.30–0.70 to `uncertain`)        |
| Field equivalence: numeric fields (`container_count`, `gross_weight_kg`)                                        | Code first, `Noul` only if needed               | Jev is weak on math/numbers (jaggedness #2): normalize counts and weights to numbers in code and compare exactly; a `Noul` may judge semantic variants like "3 x 40ft" vs "three containers"                                     | Same Noul banding as above; never ask Jev to compute the difference                                                                                  |
| Document-type check (SI vs BL vs wrong document)                                                                | One `Choice` per attachment                     | `criteria`: `shipping_instruction`, `bill_of_lading`, `other_document` (the documented `other` escape hatch) with descriptions of each document's role                                                                           | `other_document` or low `confidence` → `NEEDS_REVIEW` with `wrong_doc_type`; mirrors the citation-check gate pattern                                 |
| `NEEDS_REVIEW` escalation                                                                                       | Confidence-gated routing over the answers above | Thresholds in code, not in prompts; `missing_attachment` and `unreadable` are deterministic code checks, `missing_value` is an absent-value check (deterministic or a "is `field` stated?" Noul)                                 | Per-action thresholds: auto-label needs a floor, auto-mismatch flag a higher one; the docs prescribe scaling thresholds to the stakes of each action |

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

| Stage                                         | Requests | Assumed input tokens each                       | Tokens     | Cost       |
| --------------------------------------------- | -------- | ----------------------------------------------- | ---------- | ---------- |
| Classification (all emails)                   | 520      | ~1,500 (email state + ~6 questions)             | 780,000    | $0.0328    |
| Comparison (the ~126 emails with attachments) | 126      | ~4,000 (SI+BL extracted fields + ~12 questions) | 504,000    | $0.0212    |
| **Total**                                     | 646      | —                                               | ~1.28 Mtok | **~$0.05** |

Even at ten times these token assumptions the run stays well under $1;
the $5 credit is not the constraint. The docs' own `usage` examples show
312–588 input tokens for small states, so our estimates are conservative.

### Open Questions

- The exact `confidence` formula is not published — the docs say only
  that it is computed from the spread of `probabilities`. Measure its
  distribution on our emails before fixing the `NEEDS_REVIEW` floor.
- The token budget is described two ways: 64k per request with 32k for
  `state` + longest question (models.md) vs "around 32,000 tokens" shared
  by `state` and all questions (primitives.md). Test a max-size payload.
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
- No model-version changelog is published (only SDK changelogs); watch
  `response.model` for an alias moving mid-hackathon, or pin the
  versioned ID.
