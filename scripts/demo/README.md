# Demo recording toolkit

This directory contains reusable capture, assembly, slide, and synthetic
narration tooling. It is an operator toolkit, not a finished demo: no real
workflow, narration file, prototype route, product selector or record ID, or
generated media is supplied yet. The toolkit is not imported into apps/.

## System prerequisites

Install Node.js, npm, Python 3.11, `uv`, `ffmpeg`, and `ffprobe`. Chromium also
needs the operating-system libraries required by Playwright. Optional slide
rendering requires the Quicksand font. Keep all downloaded packages, model
files, browser binaries, source material, and generated output outside the
repository.

## Prepare scratch-only Playwright

Use a scratch parent so `record.mjs` can clean its run directory without
deleting Playwright. The recorder resolves the package from the run directory
and then walks up to this scratch installation.

```shell
REPO_ROOT=$(git rev-parse --show-toplevel)
DEMO_TOOLS=${TMPDIR:-/tmp}/demo-toolkit
mkdir -p "$DEMO_TOOLS"
cd "$DEMO_TOOLS"
npm init -y
npm install --save-exact playwright
npx playwright install chromium
```

Do not install Playwright or its browser cache into the repository for a
recording run.

## Prepare isolated narration dependencies

Create a Python 3.11 environment outside the repository. The requirements pin
the Chatterbox sources and runtime packages used by the renderer. Install the
CPU wheels first so a recording-only workstation does not download unused CUDA
packages.

```shell
REPO_ROOT=$(git rev-parse --show-toplevel)
DEMO_VOICE_TOOLS=${XDG_DATA_HOME:-$HOME/.local/share}/averis-demo/voice
uv venv --python 3.11 "$DEMO_VOICE_TOOLS/.venv"
uv pip install --python "$DEMO_VOICE_TOOLS/.venv/bin/python" \
  --index-url https://download.pytorch.org/whl/cpu \
  torch==2.6.0 torchaudio==2.6.0
uv pip install --python "$DEMO_VOICE_TOOLS/.venv/bin/python" \
  -r "$REPO_ROOT/scripts/demo/chatterbox-requirements.txt"
```

Activate that environment before narration so the `python3` calls in the shell
pipeline stay isolated:

```shell
. "$DEMO_VOICE_TOOLS/.venv/bin/activate"
```

The renderer limits PyTorch to half of the visible logical CPUs by default.
Set `CHATTERBOX_THREADS` to a positive integer only when a preflight shows that
another limit performs better on the recording host. A four-thread limit has
been smoke-tested on an eight-CPU host.

## Supply approved inputs

Future operators must provide two reviewed scratch files:

- `DEMO_WORKFLOW` names an `.mjs` module implementing the recording contract.
  `workflow.example.mjs` is only a deliberately non-running shape and must not
  be used as a product workflow.
- `DEMO_SCRIPT` names a narration file whose non-comment rows use
  `beat | offset-milliseconds | text`. Every beat must be emitted by the
  workflow and present in `beats.json`.

`DEMO_WEB` must be the operator-approved absolute HTTP(S) prototype address.
Do not commit that address or either input. Use only synthetic inputs approved
for recording; do not expose production, customer, personal, or secret data.

## Capture and assemble

Run the commands from the repository root. Keep `DEMO_DIR` below the operating
system scratch directory; the recorder rejects repository paths and clears the
selected run directory before capture.

```shell
REPO_ROOT=$(git rev-parse --show-toplevel)
DEMO_TOOLS=${TMPDIR:-/tmp}/demo-toolkit
DEMO_DIR="$DEMO_TOOLS/run"

DEMO_WEB="$APPROVED_PROTOTYPE_ADDRESS" \
DEMO_WORKFLOW="$DEMO_TOOLS/workflow.mjs" \
DEMO_DIR="$DEMO_DIR" \
node "$REPO_ROOT/scripts/demo/record.mjs"

DEMO_DIR="$DEMO_DIR" bash "$REPO_ROOT/scripts/demo/assemble.sh"
```

The capture must complete its required beats without browser or console errors
before assembly. Preserve `beats.json` beside the captured media because the
narration schedule is derived from those measured events.

## Add optional slides

Slides are optional. Put operator-authored HTML slide files in a scratch
directory, one `<name>.html` file for each `name:seconds` entry. Do not point
the renderer at the editable templates under `docs/demo/deck`.

```shell
DEMO_SLIDES='opening:4 closing:5' \
DEMO_DIR="$DEMO_DIR" \
DEMO_SLIDE_DIR="$DEMO_TOOLS/slides" \
node "$REPO_ROOT/scripts/demo/slides/render.mjs"

DEMO_SLIDES='opening:4 closing:5' \
DEMO_DIR="$DEMO_DIR" \
bash "$REPO_ROOT/scripts/demo/assemble.sh"
```

Slide names must be unique and their durations must be positive whole seconds.
Rendering rejects slides whose meaningful content enters the subtitle area.

## Render narration and optional music

Review `assets/VOICE_USE.md` before using the reference voice. The included
`CHATTERBOX_REF` is tracked and must remain tracked. Set `DEMO_TTS=chatterbox`
explicitly, and disclose synthetic narration whenever it could be mistaken for
a real speaker.

```shell
. "$DEMO_VOICE_TOOLS/.venv/bin/activate"
DEMO_DIR="$DEMO_DIR" \
DEMO_SCRIPT="$DEMO_TOOLS/narration.txt" \
DEMO_TTS=chatterbox \
CHATTERBOX_REF="$REPO_ROOT/scripts/demo/assets/chatterbox-reference.wav" \
HF_HOME="${HF_HOME:-$HOME/.cache/huggingface}" \
CHATTERBOX_HOME="$DEMO_VOICE_TOOLS/chatterbox" \
bash "$REPO_ROOT/scripts/demo/narrate.sh"
```

Chatterbox uses zero-shot conditioning from the tracked reference WAV; there is
no separately trained voice checkpoint to copy. The requirements pin the source
and runtime packages, not the remote Hugging Face model snapshot. `HF_HOME`
keeps downloaded model files outside the repository, while `CHATTERBOX_HOME`
holds the generated narration cache. Prewarm the model cache while online and
retain both directories before relying on offline rendering. The reference
checksum and audio format are enforced by the demo tests.

Music is optional. To add it, set `DEMO_BGM` to an approved, locally stored
audio file outside the repository before running `narrate.sh`. Confirm the
license, performer permissions, and distribution rights for every added asset.
Do not infer broader voice-use rights from repository access: replacement voice
material requires informed permission, and public release requires a fresh
rights review under `assets/VOICE_USE.md`.

## Inspect delivery

The scripts perform structural probes, but an operator must inspect the final
delivery before release:

```shell
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_type,codec_name,width,height,channels \
  -of json "$DEMO_DIR/demo.mp4"
```

Watch the entire file at normal speed and with headphones. Confirm the first
and last frames, every required workflow beat, slide order, subtitle timing and
safe area, narration intelligibility, music ducking, absence of private data,
and the approved duration. Verify that the final video is 1920 by 1080, uses
H.264 video and stereo AAC audio, and contains no browser or capture errors.

No end-to-end capture is claimed until an approved prototype address, real
workflow, narration file, and synthetic inputs are supplied and the resulting
delivery passes this inspection.
