# Issue 24 Contracts And Provider Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the strict Python contracts and approved provider settings
that every later backend pipeline issue imports.

**Architecture:** Pydantic models in `app/contracts.py` translate the locked
TRD pseudocode directly into runtime validation. Configuration remains in the
existing `Settings` object, but exposes only Gemini extraction, pinned Jev
decision, database, storage, and application settings; readiness reports only
the approved provider keys.

**Tech Stack:** Python 3.12, Pydantic 2, pydantic-settings, FastAPI, Pytest,
Ruff.

**Spec:** `docs/TRD.md` sections “Canonical enums and output contract,”
“Interface schemas,” and “Decision register”; `docs/PRD.md` sections “Decision
ownership” and “Evaluator contract”; GitHub issue #24.

## Global Constraints

- `Category` values are exactly `BL_COMPARISON`, `SI_REQUEST`,
  `INVOICE_QUERY`, `GENERAL`, and `SPAM`.
- `Status` values are exactly `OK`, `MISMATCH`, and `NEEDS_REVIEW`.
- `ReviewReason` values are exactly `wrong_doc_type`, `missing_attachment`,
  `unreadable`, and `missing_value`.
- `ComparedField` has exactly the seven TRD field values.
- `ReconciliationOutcome` has exactly the six TRD outcome values.
- Evaluator output has exactly five keys and `has_defect` equals
  `bool(defect_fields)`.
- Scanned-PDF provenance has `approximate: true` and no bounding box.
- Unreadable provenance has no location and a non-empty `parse_error`.
- Gemini defaults to `gemini-3.5-flash`; Jev is pinned to `jev-1.13.0`.
- OpenAI and Qwen are absent from runtime settings, provider invocation, and
  readiness output.
- No task changes the historical latency benchmark; issue #32 owns that work.

---

### Task 1: Canonical enums and exact evaluator output

**Files:**

- Create: `apps/api/app/contracts.py`
- Create: `apps/api/tests/test_contracts.py`

**Interfaces:**

- Consumes: The exact values in `docs/TRD.md:97-142`.
- Produces: `Category`, `Status`, `ReviewReason`, `ComparedField`,
  `ReconciliationOutcome`, `EvaluatorOutput`, and
  `serialize_evaluator_output(output)`.

- [ ] **Step 1: Write failing enum and evaluator tests**

  Add tests that assert every enum’s complete value set; reject unknown enum
  values and extra evaluator keys; reject inconsistent `has_defect`; and
  assert serialized output is exactly:

  ```python
  {
      "category": "BL_COMPARISON",
      "status": "MISMATCH",
      "review_reason": None,
      "has_defect": True,
      "defect_fields": ["consignee"],
  }
  ```

- [ ] **Step 2: Run the focused tests and observe RED**

  Run:
  `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_contracts.py -q`

  Expected: collection fails because `app.contracts` does not exist.

- [ ] **Step 3: Implement the minimal enum and evaluator models**

  Use `StrEnum`, a shared Pydantic base with `ConfigDict(extra="forbid")`, and
  this invariant:

  ```python
  @model_validator(mode="after")
  def defect_flag_matches_fields(self) -> Self:
      if self.has_defect is not bool(self.defect_fields):
          raise ValueError("has_defect must match whether defect_fields is non-empty")
      return self
  ```

  `serialize_evaluator_output` returns `output.model_dump(mode="json")`; it
  must not add metadata or omit any of the five fields.

- [ ] **Step 4: Run the focused tests and observe GREEN**

  Run the command from Step 2. Expected: all Task 1 tests pass.

- [ ] **Step 5: Run Ruff on the touched files**

  Run:
  `apps/api/.venv/Scripts/ruff.exe check apps/api/app/contracts.py apps/api/tests/test_contracts.py`

- [ ] **Step 6: Commit Task 1**

  ```shell
  git add apps/api/app/contracts.py apps/api/tests/test_contracts.py
  git commit -m "feat(api): add canonical evaluator contracts"
  ```

### Task 2: Format-specific provenance and comparison contracts

**Files:**

- Modify: `apps/api/app/contracts.py`
- Modify: `apps/api/tests/test_contracts.py`

**Interfaces:**

- Consumes: Task 1’s `ComparedField` and strict model base.
- Produces: `Provenance`, `ExtractedValue`, and `FieldVerdict` matching
  `docs/TRD.md:208-339`.

- [ ] **Step 1: Write failing provenance tests**

  Add valid construction tests for TXT, digital PDF, scanned PDF, DOCX table,
  DOCX paragraph, XLSX, and unreadable branches. Add rejection tests proving:

  ```python
  scanned_pdf_with_bbox_is_invalid = {
      "attachment_id": "att-1",
      "file_name": "scan.pdf",
      "format": "scanned_pdf",
      "location": {
          "kind": "scanned_pdf",
          "page": 1,
          "approximate": True,
          "region": "cargo",
          "bbox": [0, 0, 1, 1],
      },
  }

  unreadable_with_location_is_invalid = {
      "attachment_id": "att-2",
      "file_name": "broken.pdf",
      "format": "pdf",
      "parse_error": "parser rejected object stream",
      "location": {"kind": "digital_pdf", "page": 1},
  }
  ```

  Also reject `parse_error=""` and scanned PDF `approximate=False`.

- [ ] **Step 2: Run the focused tests and observe RED**

  Run the Task 1 test command. Expected: imports or construction fail because
  the provenance and field models are not implemented.

- [ ] **Step 3: Implement strict location and provenance branches**

  Define one strict model per location and provenance shape. Use Pydantic
  `Tag` plus a callable `Discriminator`: `parse_error` selects the unreadable
  branch, otherwise `format` selects the successful branch. Represent the
  non-empty parse error with `StringConstraints(strip_whitespace=True,
  min_length=1)`. Do not define `bbox` on scanned locations or `location` on
  unreadable provenance; `extra="forbid"` enforces both “never” fields.

- [ ] **Step 4: Implement `ExtractedValue` and `FieldVerdict`**

  Match the TRD field names exactly. Use `Literal` for deterministic,
  interactive, and batch result values; use `str | int | float | None` for a
  normalized JSON number-or-string value.

- [ ] **Step 5: Run focused tests and Ruff and observe GREEN**

  Run the Task 1 test and Ruff commands. Expected: all pass.

- [ ] **Step 6: Commit Task 2**

  ```shell
  git add apps/api/app/contracts.py apps/api/tests/test_contracts.py
  git commit -m "feat(api): validate extraction provenance contracts"
  ```

### Task 3: Lock approved runtime provider configuration

**Files:**

- Modify: `apps/api/app/config.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/tests/test_health.py`
- Modify: `apps/api/tests/test_gemini.py`
- Create: `apps/api/tests/test_provider_configuration.py`

**Interfaces:**

- Consumes: Existing `Settings`, Gemini wrapper, and readiness response.
- Produces: `GEMINI_MODEL=gemini-3.5-flash`,
  `JEV_MODEL=jev-1.13.0`, and readiness keys `gemini`, `gemini_2`, and
  `typesafe` only.

- [ ] **Step 1: Write failing configuration tests**

  Assert a clean `Settings(_env_file=None)` defaults to `gemini-3.5-flash`
  and `jev-1.13.0`; its model fields contain neither `openai` nor `qwen`;
  `.env.example` has the approved model values and no alternative provider;
  and every Python file under `apps/api/app/` contains neither `openai` nor
  `qwen` (case-insensitive). Update readiness expectations to the three
  approved key names.

- [ ] **Step 2: Add a failing Gemini default-model test**

  Patch `_clients()` with a fake client, call `generate("hi")` without a
  model override, and assert the client receives
  `model="gemini-3.5-flash"`.

- [ ] **Step 3: Run the configuration tests and observe RED**

  Run:

  ```shell
  apps/api/.venv/Scripts/python.exe -m pytest \
    apps/api/tests/test_provider_configuration.py \
    apps/api/tests/test_health.py \
    apps/api/tests/test_gemini.py -q
  ```

  Expected: failures show Flash Lite and OpenAI runtime exposure.

- [ ] **Step 4: Make the minimal configuration changes**

  Set `gemini_model: str = "gemini-3.5-flash"`, add
  `jev_model: Literal["jev-1.13.0"] = "jev-1.13.0"`, remove
  `openai_api_key`, remove the readiness `openai` entry, and mirror those
  settings in `.env.example`.

- [ ] **Step 5: Run all API verification**

  Run from `apps/api/`:

  ```shell
  .venv/Scripts/python.exe -m pytest -q
  .venv/Scripts/ruff.exe check .
  ```

  Expected: all tests and Ruff pass. Baseline Starlette/httpx warnings may
  remain until their upstream compatibility migration is scheduled.

- [ ] **Step 6: Commit Task 3**

  ```shell
  git add apps/api/app/config.py apps/api/app/main.py apps/api/.env.example \
    apps/api/tests/test_health.py apps/api/tests/test_gemini.py \
    apps/api/tests/test_provider_configuration.py
  git commit -m "fix(api): lock approved provider configuration"
  ```

## Final integration checklist

- [ ] Run the full API test suite and Ruff from a clean worktree.
- [ ] Confirm `git diff --check` reports no whitespace errors.
- [ ] Update the Graphify AST index with `graphify update .` when the CLI is
  available; if unavailable, record that tooling limitation instead of
  modifying generated graph files by hand.
- [ ] Review the complete issue #24 diff against every acceptance criterion.
