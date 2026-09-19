# Demo Production Tooling Design

**Status:** Approved in chat on 19 September 2026.

This design ports the reusable parts of an existing demo-recording pipeline
into Averis before the prototype workflow exists. It also preserves the
structure of two pitch-deck formats and four production-script formats without
carrying another product's claims, branding, private links, or generated media.

[TOC]

## Goals

- Prepare `scripts/demo/` for a repeatable Playwright capture, synchronized
  Chatterbox narration, minimalist subtitles, and 1080p MP4 assembly.
- Preserve the source subtitle, voice-generation, and audio-mix profile exactly.
- Commit the approved 16-second reference clip used to clone the narration
  voice, while keeping model weights, environments, caches, and renders out of
  Git.
- Create editable pitch-deck and production-script templates under
  `docs/demo/` that preserve format and structure without importing stale
  product facts.
- Leave one narrow workflow interface for the future Averis end-to-end journey.
- Make incomplete configuration fail early with an actionable error instead of
  recording a misleading demo.

## Non-Goals

- Do not invent the Averis user journey before the prototype and product
  documents are finalized.
- Do not port the source product's selectors, routes, stored-result identifiers,
  narration copy, validation claims, or warm-up behavior.
- Do not commit PDFs, screenshots, QR codes, photos, logos, videos, background
  music, generated narration, model files, virtual environments, or caches.
- Do not add the demo tools to the application runtime or production container.
- Do not promise bit-identical synthesized output across hardware or dependency
  changes. The committed input profile and pinned dependencies make the result
  reproducible within the limits of the TTS runtime.

## Source Selection

The implementation will adapt portable source files instead of copying either
source directory wholesale.

The recording import includes the browser runner, capture contract, motion
helper, narration manifest, speech scheduler, subtitle generator, Chatterbox
renderer, video assembly, optional slide renderer, requirements, documentation,
and the generic tests for those units. The source product's `walk.mjs`,
`warmup.mjs`, `proof.mjs`, and `narration.txt` are excluded with their coupled
tests.

The pitch import keeps the structural ideas from both editable HTML decks, the
visual-prompt worksheet, and all four Markdown script formats. All generated or
personal assets are excluded, including the two PDFs, MP4, rendered slides,
B-roll images, QR codes, logo, and personal photo.

## Target Layout

```text
scripts/demo/
├── README.md
├── assemble.sh
├── assets/
│   ├── VOICE_USE.md
│   ├── chatterbox-reference.wav
│   └── media-manifest.json
├── chatterbox-requirements.txt
├── contract.mjs
├── manifest.py
├── motion.mjs
├── narrate.sh
├── record.mjs
├── schedule.py
├── slides/
│   └── render.mjs
├── speak.py
├── subtitles.py
├── workflow.example.mjs
└── tests/
    ├── motion.test.mjs
    ├── record-contract.test.mjs
    ├── test_manifest.py
    ├── test_narrate.py
    ├── test_schedule.py
    ├── test_speak_batch.py
    └── test_subtitles.py

docs/demo/
├── README.md
├── deck/
│   ├── demo-day-template.html
│   ├── investor-template.html
│   └── visual-prompts-template.md
└── scripts/
    ├── demo-day-template.md
    ├── demo-video-director-5min-template.md
    ├── demo-video-director-alt-template.md
    └── investor-evidence-template.md
```

The workflow and narration for a real recording are intentionally absent. They
will be added after the build phase establishes stable routes and selectors.

## Recording Architecture

`record.mjs` owns browser launch, a 1440 by 900 recording context, beat timing,
console-error collection, output cleanup, and capture finalization. It must not
know any product selectors or routes.

The runner requires both of these environment values:

- `DEMO_WEB`: the Averis base URL to record.
- `DEMO_WORKFLOW`: a path or file URL to an ECMAScript module that exports
  `workflow` and `requiredBeats`.

The workflow receives one object:

```javascript
const input = { page, web, mark, pause, filmed, motion }
```

`mark(name)` records a beat after the corresponding frame has settled.
`pause(ms)` performs an explicit Playwright wait. `filmed` is initialized from
`requiredBeats`; the workflow increments each entry only when that required
surface is visibly complete. `motion` exposes the generic constant-rate scroll
helper.

`workflow.example.mjs` documents this interface with a neutral, non-runnable
example. The runner validates the module shape, rejects an empty or duplicate
beat list, and exits before launching a browser if either required environment
value is missing. There is no default public URL, persisted result, or product
workflow.

Capture output lives outside the repository at
`${DEMO_DIR:-${TMPDIR:-/tmp}/averis-demo}`:

- `capture.webm`: raw Playwright video.
- `beats.json`: ordered, measured visual beats.
- `capture-joined.mp4`: normalized capture with optional pitch slides.
- `lines.json`, `seg/`, `narration.wav`, and `narration.srt`: narration
  intermediates.
- `demo.mp4`: final deliverable.

The generic contract rejects a recording when a required beat is missing,
duplicated, out of order, or not marked as filmed. Page and console errors are
reported for inspection but do not replace the workflow contract.

## Narration Data Flow

The future narration file uses the existing line format:

```text
beat-name | offset-ms | Words spoken and displayed for this beat.
```

The pipeline is:

```text
workflow module -> record.mjs -> capture.webm + beats.json
narration text + beats.json -> manifest.py -> lines.json
lines.json -> speak.py -> seg/*.wav
lines.json + seg/*.wav -> schedule.py -> collision-free timings
lines.json + timings -> subtitles.py -> narration.srt
capture + audio + subtitles -> narrate.sh -> demo.mp4
```

`manifest.py` rejects malformed narration rows, unknown beats, duplicate lines,
and offsets outside the capture. `schedule.py` preserves a 260 ms speech gap and
rejects speech that crosses the next visual boundary. Audio and subtitles share
the resolved `lines.json`, so spoken and displayed text cannot drift.

`assemble.sh` keeps slides optional. Without slides, it normalizes the raw
capture. With `DEMO_SLIDES="name:seconds ..."`, it verifies every rendered
slide, appends them in order, and extends `beats.json` with their start times.

Until an Averis narration file is added, `narrate.sh` requires an explicit
`DEMO_SCRIPT` path. It must not retain a default that points to an absent or
foreign `narration.txt`.

## Chatterbox Voice Profile

The approved reference clip is committed at
`scripts/demo/assets/chatterbox-reference.wav` and is the default
`CHATTERBOX_REF`. An explicit environment override remains available for local
experiments.

The committed clip has these verified properties:

- SHA-256:
  `93c3309b33c1f68d98238df36033728920137f03a5a181a089112d1ddcd0ef81`.
- Duration: exactly 16 seconds.
- Encoding: little-endian signed 16-bit PCM WAV.
- Audio: mono at 24 kHz.
- Size: 768,078 bytes.

This file is intentional voice-cloning input, not generated output. Its source
sample is covered by a TolongLabs maintainer attestation authorizing public and
commercial redistribution and voice synthesis without required attribution.
That grant names the exact source sample, not this derived checksum, and does
not assert an individual rightsholder.

`media-manifest.json` adds an exact entry for the derived WAV, including its
checksum, media properties, source-sample checksum, and deterministic FFmpeg
derivation: take 16 seconds from offset 4, apply high-pass 70 Hz, low-pass
10 kHz, and loudness normalization at `I=-20`, `TP=-2`, and `LRA=7`, then encode
mono 24 kHz signed 16-bit PCM. This closes the provenance gap between the
authorized source sample and the file committed here.

`VOICE_USE.md` records the Averis maintainer's 19 September 2026 instruction to
commit this exact derived checksum for the repository's dub profile. It does
not claim a broader sublicense for the derivative than that instruction and the
source authorization establish. Any public release outside this repository
requires a maintainer to confirm that the intended distribution remains within
those rights.

The notice also adapts the source responsible-use terms. It requires informed
permission for any replacement sample, prohibits deceptive or non-consensual
impersonation, and requires synthetic-narration disclosure when an audience
could reasonably mistake it for a real speaker. The README links to both files.

The runtime profile remains:

- `DEMO_TTS=chatterbox` for the supported path; there is no automatic Kokoro
  fallback.
- `CHATTERBOX_VARIANT=nano` by default, implemented with
  `ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)`.
- `DEMO_SPEED=1.0` by default.
- Chatterbox and Perth dependencies pinned to the same Git revisions as the
  source requirements.
- No explicit exaggeration, CFG weight, temperature, seed, or top-p; the pinned
  library defaults remain authoritative.
- MKLDNN disabled and the math scaled-dot-product-attention backend used during
  conditioning and generation. The base variant, if explicitly selected, also
  forces eager attention.
- Output saved as signed 16-bit PCM at the model sample rate.
- A content-addressed cache key derived from variant, reference-file hash,
  speed, and narration text.

`CHATTERBOX_HOME` defaults to
`~/.local/share/averis-demo/chatterbox` and contains only the virtual
environment, model cache, and generated speech cache. Those files are never
committed.

## Subtitle and Video Profile

The imported profile remains exact:

- Font family `Quicksand`, size `10.5`, spacing `0.2`.
- White primary color `&H00FFFFFF`.
- Opaque per-line backing via `BorderStyle=3`.
- Backing color `&H70101310`, outline `0.75`, and shadow `0`.
- Bottom-center alignment `2` with vertical margin `10`.
- At most 36 characters per line and two lines per card.
- Minimum card duration of 900 ms.
- Cards shorter than 200 ms after truncation are dropped.
- Speech gap of 260 ms.
- Source viewport and recording size of 1440 by 900.
- Output canvas of 1920 by 1080, with the capture scaled to 1728 by 1080 and
  pillarboxed using `#F4F7F4`.
- Output frame rate of 25 fps, H.264 CRF `23`, and the `slow` preset.
- Optional slide content must end above y-coordinate 852 to leave room for the
  subtitle plate.

Narration-only audio uses `amix` without normalization followed by EBU R128
normalization at `I=-18`, `TP=-2`, and `LRA=7`. The final no-music path uses AAC
at 128 kbit/s. The optional music path converts to 44.1 kHz stereo AAC at
192 kbit/s, applies `-17 dB` by default, ducks at threshold `0.03`, ratio `6`,
attack `30`, and release `500`, then mixes without normalization and limits at
`0.95`.

The final video is H.264, `yuv420p`, AAC, 1920 by 1080, and fast-start enabled.
The runner holds the last frame when narration slightly outlives the capture.
The default maximum duration is 300 seconds, matching the current event's
five-minute limit; there is no product-specific minimum. Both bounds remain
explicitly configurable for later submission formats.

The inherited y-coordinate 852 was measured against an older subtitle margin.
The implementation must retain it for layout compatibility and verify it by
rendering a two-line cue with the actual margin `10` before relying on the
collision test.

## Pitch Template Design

The deck templates preserve layout mechanics, not source copy.

`demo-day-template.html` contains exactly 20 slides in this order: cover,
audience hook, current-search problem, product reveal, product capabilities,
system architecture, processing pipeline, grounded evidence, retrieval layer,
assistant interaction, user persona, data path, technology stack, data model,
outcome, privacy, manual entry, deployment portability, roadmap, and close. It
keeps the 1920 by 1080 `deck-stage`, print-to-PDF rules, editable text surfaces,
slide labels, keyboard navigation, and speaker-oriented pacing cues.

`investor-template.html` contains exactly 15 slides total: cover, problem,
landscape, product with optional video, engine, current state, buyers, business
model, expansion, pilot, stack appendix, numbers appendix, alternatives
appendix, investor FAQ, and close. Appendices and FAQ are slides 11 through 14,
not additions beyond the 15-slide total.

The investor template preserves slide counters, viewport scaling, print CSS,
local position memory, speaker-note data, arrow/page/space navigation, appendix
shortcuts `A`, `B`, and `C`, FAQ shortcut `Q`, reset shortcut `R`, and
fullscreen shortcut `F`. On slide 4, `V` or Space toggles the demo video. It
also preserves the evidence-matrix pattern without copying claims or private
links.

Both templates use obvious bracketed prompts such as `[Product Name]` and
`[Verified Metric]`. They contain no base64 media, third-party tracking,
embedded personal data, product logo, QR target, stale URL, or unverified
statistic.

The four script templates preserve these distinct structures:

- Demo-day talk track with slide purpose, spoken copy, timing, and transition.
- Five-minute director script with exact `TIME`, `ON SCREEN`, `VOICEOVER`,
  `PACE`, and `EDITOR NOTE` blocks.
- Alternate director script for a second narrative cut.
- Investor evidence matrix mapping each claim to proof, source, confidence, and
  fallback wording.

`visual-prompts-template.md` preserves the image-planning workflow while using
neutral prompts and asset slots. `docs/demo/README.md` explains which template
to choose and states that every bracketed prompt must be replaced and every
claim verified before export.

## Dependencies and Isolation

Playwright remains a demo-only Node dependency. The README documents installing
it in `DEMO_DIR`, with local module resolution only as a fallback. System Chrome
may be selected with `DEMO_CHANNEL=chrome`; otherwise maintainers can install
Playwright Chromium.

Chatterbox stays in a dedicated Python 3.11 virtual environment under
`CHATTERBOX_HOME`. The repository contains only the pinned requirements and the
reference WAV. The requirements retain Chatterbox commit
`5de7a54aa4e5e2baadb0182dde554908b48b85c2`, Perth commit
`ff1c8ac55a976971245cdd53c18d6131ca00d993`, `torch==2.6.0`,
`torchaudio==2.6.0`, and `setuptools<81`.

`ffmpeg` and `ffprobe` with libass, Bash, Python 3.11, Node.js 18 or newer,
`uv`, and Quicksand are documented prerequisites. Verification must reject a
missing Quicksand installation instead of allowing libass to substitute a
different font silently.

The application package manifests, Docker image, API dependencies, and web
bundle remain unchanged. Demo code is never imported from `apps/` or `infra/`.

## Error Handling

The tools fail closed when a missing input could yield a plausible but incorrect
deliverable:

- `record.mjs` rejects missing URL/workflow configuration and an invalid
  workflow contract before browser launch.
- Capture exits nonzero for workflow exceptions or an incomplete beat audit.
- Narration rejects malformed lines, unknown beats, unavailable speech input,
  non-finite model output, overlapping speech, and lines that outlive their
  visual boundary.
- Assembly rejects missing capture, beat, slide, `ffmpeg`, or `ffprobe` inputs.
- Slide rendering rejects missing HTML, nearly empty output, or content crossing
  the subtitle safety boundary.
- Final verification rejects missing streams, wrong codec or dimensions, and a
  duration outside the configured minimum and maximum.

No tool silently falls back to source-product URLs, selectors, scripts, cached
results, or a different voice engine.

## Testing and Verification

The imported tests will be adapted before implementation code is accepted.
They cover:

- Workflow-module validation and exact required-beat auditing.
- Constant-rate motion behavior.
- Narration parsing and beat resolution.
- Speech-gap scheduling and next-visual-boundary rejection.
- Subtitle wrapping, line-count, duration, and exact libass style settings.
- A rendered two-line subtitle confirming the y-coordinate 852 safety boundary
  with margin `10`.
- Chatterbox batch caching, default committed reference resolution, runtime
  re-execution, PCM output, and invalid input handling without loading the real
  model.
- Required FFmpeg mix, scaling, codec, and duration flags by script inspection.
- A small FFmpeg integration fixture confirming 1920 by 1080 H.264/AAC output,
  stereo audio, a non-silent signal, and burned subtitles.
- Absence of foreign URLs, product selectors, product copy, private links, and
  generated pitch assets in the imported tree.
- Reference WAV checksum and media properties.
- Media-manifest completeness, source-derivation fields, and synthetic-voice
  disclosure.

Verification runs the Node tests, Python unit tests, shell syntax checks, the
repository's focused format checks, a secret scan, and a final Git diff review.
An end-to-end capture is deferred until an Averis workflow and stable prototype
exist; the README labels that limitation explicitly.

## Acceptance Criteria

- `scripts/demo/` contains only the portable pipeline, generic workflow
  interface, exact approved presentation profile, tests, and committed reference
  clip.
- `docs/demo/` contains editable, sanitized structure templates and no generated
  media.
- The reference WAV matches the documented SHA-256 and media properties.
- The media manifest and voice-use notice record the derivation, authorization
  basis, usage limits, and disclosure requirement without a local filesystem
  path.
- Commit subjects, pull-request titles, and pull-request descriptions remain
  neutral and exclude the three restricted project names supplied in the task
  brief.
- No source-product URL, stored identifier, selector, narration, claim, brand
  asset, personal asset, or private link enters the new directories.
- All unit and contract tests pass without requiring a built Averis prototype,
  downloaded model, or live network access.
- The README states exactly what remains to be supplied after the prototype is
  ready: `DEMO_WEB`, a workflow module, required beats, narration text, and any
  optional slides or background music.
- The repository graph is updated only if the incremental update is trustworthy;
  generated graph changes are excluded if they would shrink or corrupt the
  existing corpus representation.
