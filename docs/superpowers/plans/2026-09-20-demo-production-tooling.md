# Demo Production Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable, standalone demo-production toolkit with exact
approved narration presentation settings, a committed voice-reference input,
and sanitized editable pitch templates for the LadingLens preliminary build.

**Architecture:** `scripts/demo/` is an isolated capture-and-postproduction
pipeline. A configurable workflow module provides only future product-specific
browser choreography; the runner, timing, narration, subtitles, TTS, and muxing
remain generic. `docs/demo/` contains source-free editable templates whose
structure supports the locked five-minute LadingLens demonstration without
claiming that the prototype already implements it.

**Tech Stack:** Node.js 18+ and Playwright in a scratch directory; Python 3.11
standard library plus an isolated Chatterbox environment; Bash; FFmpeg/FFprobe
with libass; standalone HTML/CSS/JavaScript; Markdown; Git-tracked PCM WAV.

**Spec:**
[`docs/superpowers/specs/2026-09-19-demo-production-tooling-design.md`](/docs/superpowers/specs/2026-09-19-demo-production-tooling-design.md)

## Global Constraints

- Keep every demo artifact under `scripts/demo/` or `docs/demo/`; do not import
  it from `apps/` or `infra/`, and do not alter application package manifests,
  the Docker image, or runtime dependencies.
- Require an absolute HTTP(S) `DEMO_WEB` and `DEMO_WORKFLOW` before capture.
  Never retain a default hosted URL, persisted result identifier, selector,
  narration, or workflow from an earlier product.
- Use `${DEMO_DIR:-${TMPDIR:-/tmp}/averis-demo}` for outputs. Do not commit
  captures, render intermediates, model weights, virtual environments, caches,
  PDFs, slides, music, QR codes, photos, logos, or generated narration.
- Use `DEMO_TTS=chatterbox`, `CHATTERBOX_VARIANT=nano`, and `DEMO_SPEED=1.0` by
  default. The runner must never silently select a different voice engine.
- Keep `scripts/demo/assets/chatterbox-reference.wav` byte-identical to SHA-256
  `93c3309b33c1f68d98238df36033728920137f03a5a181a089112d1ddcd0ef81`.
- Preserve the exact subtitle and mix profile: Quicksand `10.5`, white
  `&H00FFFFFF`, backing `&H70101310`, `BorderStyle=3`, outline `0.75`, shadow
  `0`, alignment `2`, `MarginV=10`, spacing `0.2`, two lines of 36 characters,
  900 ms minimum card, 200 ms post-truncation floor, 260 ms speech gap,
  `loudnorm=I=-18:TP=-2:LRA=7`, optional `-17 dB` ducked music, and limiter
  `0.95`.
- Keep the 1440 by 900 capture, 1728 by 1080 scaling, `#F4F7F4` pillarbox,
  1920 by 1080 output, 25 fps, H.264 CRF 23, `yuv420p`, AAC, and fast-start.
  The default upper duration bound is 300 seconds and the lower bound is zero.
- Require `DEMO_SCRIPT` for narration until an Averis narration file exists.
  Do not add a product-specific script in this import.
- Preserve only neutral template structure. Every template fact, URL, metric,
  speaker identity, image, and asset reference must be an explicit editable
  bracketed prompt or a neutral explanation.
- Record the voice input's checksum, derivation, authorization basis, synthetic
  narration disclosure, and replacement-sample rules without a local filesystem
  path. Treat a public release as requiring a fresh maintainer rights review.
- Keep commit subjects, pull-request titles, and pull-request descriptions
  neutral; do not use any of the three restricted project names from the task
  brief in immediately visible Git metadata.

## File Structure

| Path                                | Responsibility                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `scripts/demo/contract.mjs`         | Validate the workflow module and audit ordered, complete capture beats.                            |
| `scripts/demo/motion.mjs`           | Provide deterministic constant-rate scrolling for future workflows.                                |
| `scripts/demo/record.mjs`           | Launch Playwright, invoke a supplied workflow, and promote video only after a complete beat audit. |
| `scripts/demo/workflow.example.mjs` | Define the future product-workflow interface without selectors or URLs.                            |
| `scripts/demo/manifest.py`          | Resolve narration rows against measured visual beats.                                              |
| `scripts/demo/schedule.py`          | Deconflict spoken segments and reject visual overruns.                                             |
| `scripts/demo/subtitles.py`         | Create timing-safe SRT cards from the resolved narration manifest.                                 |
| `scripts/demo/speak.py`             | Render cached Chatterbox segments using the committed reference input.                             |
| `scripts/demo/narrate.sh`           | Coordinate speech, scheduling, subtitles, mix, and final mux.                                      |
| `scripts/demo/assemble.sh`          | Normalize capture and optionally append rendered HTML slides.                                      |
| `scripts/demo/slides/render.mjs`    | Render requested HTML slides and enforce the subtitle-safe lower boundary.                         |
| `scripts/demo/assets/*`             | Track the approved reference WAV and its provenance/use policy.                                    |
| `scripts/demo/NOTICE.md`            | Distinguish adapted tooling attribution from the separately governed voice asset.                  |
| `scripts/demo/tests/*`              | Unit and source-contract tests that run without a prototype, model, or network.                    |
| `docs/demo/deck/*`                  | Editable 20-slide demo-day and 15-slide investor template structures.                              |
| `docs/demo/scripts/*`               | Editable talk-track, director, alternate-cut, and evidence-matrix formats.                         |
| `docs/demo/README.md`               | Explain template selection, claim verification, and how this tooling relates to the future demo.   |

### Task 1: Create the Workflow-Neutral Capture Contract

**Files:**

- Create: `scripts/demo/contract.mjs`
- Create: `scripts/demo/motion.mjs`
- Create: `scripts/demo/record.mjs`
- Create: `scripts/demo/workflow.example.mjs`
- Create: `scripts/demo/tests/record-contract.test.mjs`
- Create: `scripts/demo/tests/motion.test.mjs`

**Interfaces:**

- Consumes: `DEMO_WEB`, `DEMO_WORKFLOW`, optional `DEMO_DIR`, and optional
  `DEMO_CHANNEL`.
- Produces: `validateWorkflowModule(module)`,
  `auditCapture(requiredBeats, beats, filmed)`, `scrollAt(page, options)`,
  a complete-run `capture.webm`, and `beats.json`.
- The workflow module exports:

  ```javascript
  export const requiredBeats = ['inbox-accounted', 'judge-comparison']

  export async function workflow({ page, web, mark, pause, filmed, motion }) {
    await page.goto(web, { waitUntil: 'networkidle' })
    mark('inbox-accounted')
    filmed['inbox-accounted'] += 1
    await pause(250)
    mark('judge-comparison')
    filmed['judge-comparison'] += 1
  }
  ```

- `requiredBeats` must be a non-empty array of unique non-blank strings.
  `workflow` must be a function. `auditCapture` returns
  `{ complete, missing, duplicated, unexpected, ordered, observed }`.

- [ ] **Step 1: Write the failing capture-contract tests**

  Create `scripts/demo/tests/record-contract.test.mjs` with explicit tests for
  malformed modules and capture ordering:

  ```javascript
  import assert from 'node:assert/strict'
  import test from 'node:test'

  import { auditCapture, validateWorkflowModule } from '../contract.mjs'

  test('workflow contract requires unique ordered beats and a workflow function', () => {
    assert.throws(() => validateWorkflowModule({ requiredBeats: ['one', 'one'], workflow() {} }), /unique/)
    assert.throws(() => validateWorkflowModule({ requiredBeats: ['one'] }), /workflow/)
  })

  test('capture audit rejects missing, duplicate, and unordered beats', () => {
    const required = ['one', 'two']
    const filmed = { one: 1, two: 1 }
    assert.equal(
      auditCapture(
        required,
        [
          { name: 'one', ms: 0 },
          { name: 'two', ms: 100 }
        ],
        filmed
      ).complete,
      true
    )
    assert.equal(auditCapture(required, [{ name: 'two', ms: 0 }], { two: 1 }).complete, false)
    assert.equal(
      auditCapture(
        required,
        [
          { name: 'one', ms: 0 },
          { name: 'two', ms: 100 },
          { name: 'unexpected', ms: 200 }
        ],
        filmed
      ).complete,
      false
    )
  })
  ```

- [ ] **Step 2: Run the capture-contract test and observe the missing-module failure**

  Run:

  ```bash
  rtk node --test scripts/demo/tests/record-contract.test.mjs
  ```

  Expected: failure because `contract.mjs` does not yet exist.

- [ ] **Step 3: Implement the pure contract and motion helpers**

  Add `validateWorkflowModule` and `auditCapture` with no browser dependency.
  Implement `scrollAt` as a request-animation-frame loop that advances a
  supplied CSS selector at constant pixels per second, returns after the target
  displacement, and restores suspended motion classes in a `finally` block.

  ```javascript
  export function auditCapture(requiredBeats, beats, filmed) {
    const observed = beats.map(({ name }) => name)
    const missing = requiredBeats.filter((name) => filmed[name] !== 1)
    const duplicated = requiredBeats.filter(
      (name) => observed.filter((observedName) => observedName === name).length !== 1
    )
    const ordered = requiredBeats.every((name, index) => observed[index] === name)
    const unexpected = observed.filter((name) => !requiredBeats.includes(name))
    return {
      complete: !missing.length && !duplicated.length && !unexpected.length && ordered,
      missing,
      duplicated,
      unexpected,
      ordered,
      observed
    }
  }
  ```

- [ ] **Step 4: Implement the runner and interface example**

  In `record.mjs`, reject absent `DEMO_WEB` or `DEMO_WORKFLOW` before resolving
  Playwright. Resolve the workflow path with `pathToFileURL(resolve(value))`,
  validate it, initialize `filmed` from `requiredBeats`, collect page/console
  errors, and always close the context/browser in `finally`. Before deleting an
  old output directory, reject an empty directory, filesystem root, repository
  root, or repository-contained `DEMO_DIR`; only a resolved scratch directory
  may be cleaned recursively. Promote a video to `capture.webm` only when the
  workflow did not throw and the audit completes. On any failure, retain
  `beats.json` and `capture-errors.json` plus a raw `failed-capture.webm` for
  diagnosis, then set `process.exitCode = 1`. This prevents a partial recording
  from being narrated as a successful demo. Use a scratch-local Playwright
  installation first and a repository-local one only as a fallback; do not add
  Playwright to either `package.json`.

  Write `workflow.example.mjs` using the exact interface above, but make it
  throw `Error('Define a product workflow before recording.')` before any
  page interaction so it cannot be mistaken for a real capture path.

- [ ] **Step 5: Add and run motion coverage**

  Create a small fake page in `motion.test.mjs` that records calls to
  `page.evaluate`, then assert the helper requests the expected displacement
  and clears its temporary style state when the promise rejects.

  Run:

  ```bash
  rtk node --test scripts/demo/tests/record-contract.test.mjs scripts/demo/tests/motion.test.mjs
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit the self-contained capture foundation**

  ```bash
  rtk git add scripts/demo/contract.mjs scripts/demo/motion.mjs scripts/demo/record.mjs \
    scripts/demo/workflow.example.mjs scripts/demo/tests/record-contract.test.mjs \
    scripts/demo/tests/motion.test.mjs
  rtk git commit -m "feat(demo): add configurable capture foundation"
  ```

### Task 2: Add Measured Narration Timing and Minimalist Subtitle Generation

**Files:**

- Create: `scripts/demo/manifest.py`
- Create: `scripts/demo/schedule.py`
- Create: `scripts/demo/subtitles.py`
- Create: `scripts/demo/tests/test_manifest.py`
- Create: `scripts/demo/tests/test_schedule.py`
- Create: `scripts/demo/tests/test_subtitles.py`

**Interfaces:**

- Consumes: `beats.json`, an explicit narration script, a source-video path,
  `lines.json`, and `seg/<index>.wav` files.
- Produces: resolved `lines.json` entries containing `beat`, `ms`,
  `visual_end_ms`, `text`, and later `dur_ms`; produces `narration.srt`.
- `deconflict(lines, durations, gap_ms=260)` mutates line start times and
  returns `(shifted, last_end_ms)`.

- [ ] **Step 1: Write failing manifest and scheduling tests**

  Use temporary directories and wave-generated silent segments. Include the
  following assertions:

  ```python
  self.assertEqual(
      lines[0],
      {"beat": "inbox", "ms": 1100, "visual_end_ms": 5000, "text": "Account every message."},
  )
  self.assertIn("beat 'missing' never happened", result.stderr)
  self.assertIn("offset exceeds source duration", result.stderr)
  self.assertEqual(result.returncode, 1)
  self.assertIn("VISUAL OVERRUN", result.stderr)
  ```

- [ ] **Step 2: Run the new Python tests and confirm they fail before implementation**

  Run:

  ```bash
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_*.py'
  ```

  Expected: import or file-not-found failures for the three new modules.

- [ ] **Step 3: Implement strict narration-manifest resolution**

  Parse non-empty, non-comment rows only as exactly three pipe-separated
  fields. Reject an invalid row, a non-integer offset, an empty text field,
  duplicate `(beat, offset)` rows, unknown beats, and non-monotonic or duplicate
  beat input. Invoke it as `manifest.py <demo-dir> <narration-script>
<source-video>` and measure the source duration with `ffprobe`; reject a
  resolved start at or beyond that duration. Resolve each row against the
  recorded beat and the next visual beat, sort by measured `ms`, and atomically
  write UTF-8 `lines.json` only after all rows validate.

- [ ] **Step 4: Implement scheduling and subtitle behavior**

  Measure segment durations with `ffprobe`, treating an absent probe result or
  zero-length segment as fatal; require exactly one ordered segment per
  narration line; enforce a 260 ms gap; reject a line that crosses its
  `visual_end_ms`; and retain measured `dur_ms` in `lines.json`. In
  `subtitles.py`, retain `MAX_CHARS = 36`, `MAX_LINES = 2`, and
  `MIN_CARD_MS = 900`; balance word-wrap lines rather than splitting words;
  truncate a card at the next card start; and discard sub-200 ms cards.

  ```python
  for current, following in zip(spans, spans[1:], strict=False):
      if current[1] > following[0]:
          current[1] = following[0]
  spans = [span for span in spans if span[1] - span[0] >= 200]
  ```

- [ ] **Step 5: Prove exact wrapping and non-overlap behavior**

  Extend `test_subtitles.py` to assert every generated row is at most 36
  characters, every cue has at most two rows, adjacent cues do not overlap,
  and a long input produces the exact expected balanced cards. Run:

  ```bash
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_manifest.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_schedule.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_subtitles.py'
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit the timing and subtitle core**

  ```bash
  rtk git add scripts/demo/manifest.py scripts/demo/schedule.py scripts/demo/subtitles.py \
    scripts/demo/tests/test_manifest.py scripts/demo/tests/test_schedule.py \
    scripts/demo/tests/test_subtitles.py
  rtk git commit -m "feat(demo): add beat-synchronized narration timing"
  ```

### Task 3: Add the Chatterbox Profile, Reference Asset, and Provenance Record

**Files:**

- Create: `scripts/demo/chatterbox-requirements.txt`
- Create: `scripts/demo/speak.py`
- Create: `scripts/demo/assets/chatterbox-reference.wav`
- Create: `scripts/demo/assets/media-manifest.json`
- Create: `scripts/demo/assets/VOICE_USE.md`
- Create: `scripts/demo/NOTICE.md`
- Create: `scripts/demo/tests/test_speak_batch.py`
- Create: `scripts/demo/tests/test_assets.py`

**Interfaces:**

- Consumes: `DEMO_TTS`, `CHATTERBOX_HOME`, `CHATTERBOX_REF`,
  `CHATTERBOX_VARIANT`, `DEMO_SPEED`, and `CHATTERBOX_CACHE`.
- Produces: `render_batch(lines, output_dir, renderer_factory=...)`, PCM signed
  16-bit WAV segments, and a cache key based on variant, reference SHA-256,
  speed, and text.
- Default reference path is the tracked `assets/chatterbox-reference.wav`;
  `CHATTERBOX_REF` overrides it.

- [ ] **Step 1: Write failing tests for the exact TTS profile and media record**

  Add assertions that do not load a model:

  ```python
  self.assertEqual(speak.TTS, "chatterbox")
  self.assertEqual(speak.CB_VARIANT, "nano")
  self.assertEqual(speak.SPEED, 1.0)
  self.assertEqual(hashlib.sha256(reference.read_bytes()).hexdigest(), EXPECTED_SHA256)
  self.assertEqual(params.framerate, 24000)
  self.assertEqual(params.nchannels, 1)
  self.assertEqual(params.sampwidth, 2)
  self.assertEqual(params.nframes, 384000)
  ```

  Assert the requirements contain both reviewed Git revisions, Torch 2.6.0,
  Torchaudio 2.6.0, and `setuptools<81`. Assert the media manifest names the
  WAV SHA-256, source-sample SHA-256, derivation settings, maintainer-directed
  repository-use scope, and synthetic-narration disclosure document.

- [ ] **Step 2: Run the TTS/provenance tests and confirm the baseline failure**

  Run:

  ```bash
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_speak_batch.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_assets.py'
  ```

  Expected: failures because the renderer, manifest, and tracked WAV do not
  yet exist.

- [ ] **Step 3: Copy and verify the exact reference WAV**

  Copy only `/home/user/.local/share/layak-demo/chatterbox/reference.wav` to
  `scripts/demo/assets/chatterbox-reference.wav`. Do not copy its directory,
  cache, virtual environment, or any generated segment. Immediately verify:

  ```bash
  rtk sha256sum scripts/demo/assets/chatterbox-reference.wav
  rtk ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels,bits_per_sample \
    -of json scripts/demo/assets/chatterbox-reference.wav
  ```

  Expected: the global-constraint SHA-256; 16 seconds; `pcm_s16le`; 24,000 Hz;
  mono; 16-bit; 768,078 bytes.

- [ ] **Step 4: Implement the renderer and pinned requirements**

  Set `TTS = os.environ.get("DEMO_TTS", "chatterbox")` and use the tracked
  reference default. Fail if `DEMO_TTS` is not `chatterbox`; never create a
  synthetic fallback. For nano, use:

  ```python
  from chatterbox.tts_turbo import ChatterboxTurboTTS

  self.model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)
  ```

  Disable MKLDNN before importing Chatterbox, use the math SDPA context around
  `prepare_conditionals()` and `generate()`, prepare the reference once per
  batch, reject non-finite audio, resample only when `DEMO_SPEED` differs from
  1.0, save PCM signed 16-bit output, and reuse cached segments when all keys
  already exist. Retain optional explicit `base` and `turbo` variants only if
  they preserve the specified eager/base attention guard.

- [ ] **Step 5: Add provenance and responsible-use documentation**

  Write `media-manifest.json` with the exact WAV facts, the source-sample SHA
  `45c67e4a89783bc46d9a1819deae7a5e80d19193af50e26123e89d6e73b71f6e`, and this
  derivation record: offset 4 seconds, duration 16 seconds, high-pass 70 Hz,
  low-pass 10 kHz, `loudnorm=I=-20:TP=-2:LRA=7`, 24 kHz mono PCM signed 16-bit.
  Record that those fields identify provenance but do not themselves assert a
  broader license for the derivative. In `VOICE_USE.md`, record the
  19 September 2026 maintainer instruction to include this checksum; state that
  replacing it needs informed permission, synthetic narration must be disclosed
  when it could be mistaken for a real speaker, deceptive impersonation is
  prohibited, and public release needs a fresh rights review. Add `NOTICE.md`
  to identify the portable tooling as adapted team tooling under the repository
  MIT license and to state that the voice asset has a separate use notice.

- [ ] **Step 6: Run the isolated renderer tests**

  Run:

  ```bash
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_speak_batch.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_assets.py'
  ```

  Expected: all tests pass without downloading a model or connecting to a
  service.

- [ ] **Step 7: Commit the voice profile and evidence**

  ```bash
  rtk git add scripts/demo/chatterbox-requirements.txt scripts/demo/speak.py \
    scripts/demo/assets scripts/demo/NOTICE.md scripts/demo/tests/test_speak_batch.py \
    scripts/demo/tests/test_assets.py
  rtk git commit -m "feat(demo): add versioned narration voice profile"
  ```

### Task 4: Add Assembly, Muxing, and Optional Slide Rendering

**Files:**

- Create: `scripts/demo/assemble.sh`
- Create: `scripts/demo/narrate.sh`
- Create: `scripts/demo/slides/render.mjs`
- Create: `scripts/demo/tests/test_narrate.py`
- Create: `scripts/demo/tests/test_assemble.py`
- Create: `scripts/demo/tests/slide-render-contract.test.mjs`

**Interfaces:**

- Consumes: captured video/beat files, `DEMO_SCRIPT`, optional `DEMO_SLIDES`,
  optional `DEMO_SLIDE_DIR`, optional `DEMO_BGM`, `DEMO_FFMPEG`, and
  `DEMO_FFPROBE`.
- Produces: `capture-joined.mp4`, optional `slide-<name>.png`, `narration.wav`,
  `narration.srt`, and `demo.mp4` in `DEMO_DIR`.
- `DEMO_SLIDES` uses `name:seconds` pairs. `DEMO_SLIDE_DIR` points to future
  standalone slide HTML; `docs/demo/deck/` is a presentation template and is
  not a render input. Slide rendering fails if page content crosses y-coordinate 852.

- [ ] **Step 1: Write failing source-contract tests for exact assembly settings**

  In `test_narrate.py`, read the shell scripts and assert the concrete strings:

  ```python
  self.assertIn("DEMO_SCRIPT", script)
  self.assertIn("FontName=Quicksand,FontSize=10.5", script)
  self.assertIn("PrimaryColour=&H00FFFFFF", script)
  self.assertIn("BorderStyle=3,Outline=0.75,Shadow=0,Alignment=2,MarginV=10,Spacing=0.2", script)
  self.assertIn("loudnorm=I=-18:TP=-2:LRA=7", script)
  self.assertIn("scale=1728:1080,pad=1920:1080", script)
  self.assertIn("DEMO_MAX_DURATION:-300", script)
  self.assertIn("pan=stereo|c0=c0|c1=c0", script)
  ```

  In `test_assemble.py`, use a color/video and silent-audio FFmpeg fixture to
  assert 1920 by 1080 H.264/AAC output, stereo audio, a non-zero signal, and
  a burned subtitle stream. Render a two-line cue with `MarginV=10` and inspect
  the resulting frame to confirm the plate starts at or below y-coordinate 852.
  In `slide-render-contract.test.mjs`, assert that `SUBTITLE_TOP` equals 852,
  rendering exits cleanly when `DEMO_SLIDES` is empty, and the renderer reports
  a collision when its DOM-floor measurement exceeds the boundary.

- [ ] **Step 2: Run the contract tests before implementation**

  Run:

  ```bash
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_narrate.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_assemble.py'
  rtk node --test scripts/demo/tests/slide-render-contract.test.mjs
  ```

  Expected: file-not-found failures.

- [ ] **Step 3: Implement safe capture assembly**

  Write `assemble.sh` with `set -euo pipefail`. Require `ffmpeg`, `ffprobe`,
  `capture.webm`, and `beats.json`. With empty `DEMO_SLIDES`, normalize only to
  the 1920 by 1080 canvas. With slides, validate non-blank unique identifiers
  and positive integer seconds, verify every `slide-<name>.png`, append them
  in declared order, and extend `beats.json` using measured segment duration.
  Preserve every existing beat rather than deleting a magic final beat. Never
  source a deck asset from outside `DEMO_DIR`.

- [ ] **Step 4: Implement narration/mux orchestration**

  Require `DEMO_SCRIPT` explicitly, run manifest with the selected source
  video, then speak/schedule/subtitles in that order, and fail on absent input
  or an invalid duration. Preserve the exact no-music and ducked-music mix
  paths from the spec. The no-music path must duplicate mono narration to
  stereo before AAC 128 kbit/s; the music path must use 44.1 kHz stereo AAC
  192 kbit/s, `volume=-17dB`, side-chain compression threshold `0.03`, ratio
  `6`, attack `30`, release `500`,
  `amix=inputs=2:duration=longest:normalize=0`, and `alimiter=limit=0.95`.
  After muxing, use `ffprobe` to reject a missing video/audio stream, wrong
  dimensions, non-H.264 video, non-AAC audio, non-stereo audio, or duration
  outside 0 to 300 seconds.

- [ ] **Step 5: Implement optional slide screenshots**

  Resolve Playwright as Task 1 does. Resolve standalone pages from
  `DEMO_SLIDE_DIR` with `pathToFileURL`, never relative string concatenation.
  For each requested slide, wait for fonts, screenshot a 1920 by 1080 page,
  calculate the lowest meaningful content box, and exit nonzero on a missing
  page, effectively empty page, or floor above 852. Verify Quicksand through
  `document.fonts.check('10.5px Quicksand')`, fail instead of silently accepting
  a substituted font, and close context/browser in `finally`.

- [ ] **Step 6: Run shell and contract checks**

  Run:

  ```bash
  rtk bash -n scripts/demo/assemble.sh scripts/demo/narrate.sh
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_narrate.py'
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_assemble.py'
  rtk node --test scripts/demo/tests/slide-render-contract.test.mjs
  ```

  Expected: all checks pass without a browser recording.

- [ ] **Step 7: Commit postproduction tooling**

  ```bash
  rtk git add scripts/demo/assemble.sh scripts/demo/narrate.sh scripts/demo/slides/render.mjs \
    scripts/demo/tests/test_narrate.py scripts/demo/tests/test_assemble.py \
    scripts/demo/tests/slide-render-contract.test.mjs
  rtk git commit -m "feat(demo): add portable video assembly tooling"
  ```

### Task 5: Create Sanitized Pitch and Production-Script Templates

**Files:**

- Create: `docs/demo/README.md`
- Create: `docs/demo/deck/demo-day-template.html`
- Create: `docs/demo/deck/investor-template.html`
- Create: `docs/demo/deck/visual-prompts-template.md`
- Create: `docs/demo/scripts/demo-day-template.md`
- Create: `docs/demo/scripts/demo-video-director-5min-template.md`
- Create: `docs/demo/scripts/demo-video-director-alt-template.md`
- Create: `docs/demo/scripts/investor-evidence-template.md`
- Create: `scripts/demo/tests/docs-templates.test.mjs`

**Interfaces:**

- Consumes: human-entered bracketed prompts and future verified LadingLens
  artifacts only.
- Produces: two browser-presentable 1920 by 1080 HTML decks and four editable
  Markdown production formats.
- The demo-day deck has exactly 20 slides. The investor deck has exactly 15
  slides; its appendices and FAQ are slides 11 through 14.

- [ ] **Step 1: Write failing structural-template tests**

  Create `docs-templates.test.mjs` that reads all template files and asserts
  their structure without a network request:

  ```javascript
  assert.equal((demoDay.match(/<section class="slide/g) ?? []).length, 20)
  assert.equal((investor.match(/<section class="slide/g) ?? []).length, 15)
  assert.match(demoDay, /customElements\.define\('deck-stage'/)
  assert.match(investor, /key === 'f' \|\| key === 'F'/)
  assert.match(investor, /\['v', 'V', ' ', 'Spacebar'\]/)
  assert.match(director, /\*\*TIME:\*\*/)
  assert.match(director, /\*\*ON SCREEN:\*\*/)
  assert.match(director, /\*\*VOICEOVER:\*\*/)
  assert.match(director, /\*\*PACE:\*\*/)
  assert.match(director, /\*\*EDITOR NOTE:\*\*/)
  ```

  Parse `data-label` values and compare them to the full ordered 20-role and
  15-role arrays stated in Steps 3 and 4. Also assert one `deck-stage` design
  width of 1920 and height of 1080, print CSS, `contenteditable` prompts,
  speaker-note JSON, local slide storage, touch/click controls, and every
  investor shortcut. Add a deny-list scan for `<img`, `<audio`, media `src=`,
  `assets/`, `data:`, `base64`, external URLs, `.pdf`, `.mp4`, QR filenames,
  fixed personal names, and numeric claims. Keep source-copy detection as a
  human diff review rather than embedding source-product wording in tests.

- [ ] **Step 2: Run the template test and observe the missing-template failure**

  Run:

  ```bash
  rtk node --test scripts/demo/tests/docs-templates.test.mjs
  ```

  Expected: file-not-found failures.

- [ ] **Step 3: Implement the 20-slide demo-day deck**

  Build an editable, self-contained `deck-stage` custom element with viewport
  scaling, print CSS that emits one 1920 by 1080 slide per page, slide labels,
  local position persistence, fullscreen, arrow/page/space navigation,
  touch/click controls, and valid speaker-note JSON. Use exactly this role
  sequence: cover, audience hook, current-search problem, product reveal,
  product capabilities, system architecture, processing pipeline, grounded
  evidence, retrieval layer, assistant interaction, user persona, data path,
  technology stack, data model, outcome, privacy, manual entry, deployment
  portability, roadmap, close. Each slide contains only bracketed prompts and
  neutral supporting text.

- [ ] **Step 4: Implement the 15-slide investor deck**

  Build the same self-contained base mechanics with this exact sequence: cover,
  problem, landscape, product with optional video, engine, current state,
  buyers, business model, expansion, pilot, stack appendix, numbers appendix,
  alternatives appendix, investor FAQ, close. Implement Appendix shortcuts
  `A`, `B`, `C`; FAQ `Q`; reset `R`; fullscreen `F`; number jump; and video
  toggle `V` or Space only on slide 4. Add a video element with neither `src`
  nor poster; an unconfigured toggle reports a visible status rather than
  fetching a resource. Do not embed a video or a video URL.

- [ ] **Step 5: Implement the four script formats and README**

  Make all four Markdown files concrete templates with headings and prompt
  fields, not blank skeletons. The demo-day format includes alternate openings,
  a common route, final talk track, architecture, live-demo allocation, and
  tiered Q&A. The five-minute director template repeats exact `TIME`,
  `ON SCREEN`, `VOICEOVER`, `PACE`, and `EDITOR NOTE` blocks for the five-minute
  LadingLens beats. The alternate cut changes narrative pacing and includes a
  deck-to-video map and shot checklist. The evidence matrix maps claim, proof,
  source, confidence, spokesperson, and fallback wording. The visual-prompt
  format contains reusable interface, engine, automation, evidence, state,
  user, partner, and pilot asset cards. The README points to `PRD.md`, `TRD.md`,
  `PRODUCT.md`, and `demo-spine.md` as the claim authorities; it also states
  that bracketed prompts require verification, the preliminary run uses
  synthetic data, and a provider fallback must be visibly labelled and verbally
  disclosed.

- [ ] **Step 6: Run structural, content, and formatting tests**

  Run:

  ```bash
  rtk node --test scripts/demo/tests/docs-templates.test.mjs
  rtk bunx prettier@3.9.8 --check docs/demo scripts/demo/README.md
  ```

  Expected: tests pass and all Markdown/HTML follows repository formatting.

- [ ] **Step 7: Commit templates independently**

  ```bash
  rtk git add docs/demo scripts/demo/tests/docs-templates.test.mjs
  rtk git commit -m "docs(demo): add editable pitch and production templates"
  ```

### Task 6: Document the Toolkit and Run the Cross-Cutting Release Gate

**Files:**

- Create: `scripts/demo/README.md`
- Modify: `.gitignore`
- Modify: `scripts/demo/tests/docs-templates.test.mjs`

**Interfaces:**

- Documents the installation and invocation boundary for future operators.
- Prevents capture outputs and temporary test material from appearing in Git.

- [ ] **Step 1: Write failing documentation and ignore-policy assertions**

  Extend the docs-template test to require all of these README concepts:

  ```javascript
  for (const text of [
    'DEMO_WEB',
    'DEMO_WORKFLOW',
    'DEMO_SCRIPT',
    'DEMO_TTS=chatterbox',
    'CHATTERBOX_REF',
    'VOICE_USE.md',
    'synthetic narration',
    'not imported into apps/'
  ]) {
    assert.match(readme, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  ```

  Add assertions that `.gitignore` excludes `scripts/demo/.cache/`,
  `scripts/demo/output/`, `scripts/demo/*.mp4`, `scripts/demo/*.webm`, and
  `scripts/demo/seg/` while not excluding the tracked reference WAV.

- [ ] **Step 2: Run the documentation test and observe the intended failure**

  Run:

  ```bash
  rtk node --test scripts/demo/tests/docs-templates.test.mjs
  ```

  Expected: README and ignore-policy assertion failures.

- [ ] **Step 3: Write the operator README and narrowly extend ignores**

  Document scratch-only Playwright installation, system prerequisites, isolated
  Python 3.11/`uv` Chatterbox installation, the exact command environment for a
  future capture, optional slide/mix flow, delivery inspection, asset rights,
  and the explicit boundary that a real workflow/narration file is not supplied
  yet. Add only the listed demo-output ignore rules; do not add a broad media
  or `scripts/` ignore that would hide tracked templates or the voice input.

- [ ] **Step 4: Run focused quality checks**

  Run:

  ```bash
  rtk node --test scripts/demo/tests/*.test.mjs
  rtk python3 -m unittest discover -s scripts/demo/tests -p 'test_*.py'
  rtk bash -n scripts/demo/assemble.sh scripts/demo/narrate.sh
  rtk bunx prettier@3.9.8 --check scripts/demo docs/demo .gitignore
  rtk git diff --check
  ```

  Expected: every focused demo test and syntax/format check passes.

- [ ] **Step 5: Run final source, metadata, and asset verification**

  Run:

  ```bash
  rtk rg -n 'https?://|data:|\.pdf|\.mp4|qr-|base64' docs/demo scripts/demo
  rtk sha256sum scripts/demo/assets/chatterbox-reference.wav
  rtk ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels,bits_per_sample \
    -of json scripts/demo/assets/chatterbox-reference.wav
  rtk git diff --check
  rtk git status --short
  ```

  Inspect every hit from the first command. The only permitted URLs are package
  provenance links in `chatterbox-requirements.txt`; no external URL, encoded
  asset, generated media, source-product fact, private link, or old selector
  may remain in the imported template/tooling content. Verify commit and PR
  metadata separately against the restricted-name policy before opening the
  integration PR.

- [ ] **Step 6: Update the knowledge graph cautiously**

  Run:

  ```bash
  rtk graphify update .
  rtk git diff -- graphify-out
  ```

  Keep graph output only if the incremental update is additive and accurately
  represents the new toolkit. If it attempts a broad shrink, corruption, or
  unrelated rewrite, restore only the generated graph files and document the
  reason in the PR verification note.

- [ ] **Step 7: Commit the release guidance and verification gate**

  ```bash
  rtk git add .gitignore scripts/demo/README.md scripts/demo/tests/docs-templates.test.mjs
  rtk git commit -m "docs(demo): document recording workflow"
  ```

## Final Integration Checklist

- [ ] All six task commits are present and each has a neutral Conventional
      Commit subject.
- [ ] The committed WAV hash, duration, codec, sample rate, channels, bit
      depth, and size match the global constraints.
- [ ] No prototype workflow, narration text, live URL, stored record ID,
      personal asset, generated media, or stale factual claim was imported.
- [ ] The 20-slide and 15-slide HTML counts, keyboard behavior, script
      headings, and content deny-list tests pass.
- [ ] The application CI commands remain green:

  ```bash
  rtk bash -lc 'cd apps/api && uv run ruff check && uv run ruff format --check && uv run pytest'
  rtk bash -lc 'cd apps/web && bun run build'
  ```

- [ ] The integration PR title, description, and commit subjects contain none
      of the restricted names from the task brief.
- [ ] The PR body calls out that no end-to-end capture is claimed until an
      Averis workflow, narration file, prototype route, and approved synthetic
      inputs exist.
