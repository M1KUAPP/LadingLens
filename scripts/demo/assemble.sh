#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR=${DEMO_DIR:-"${TMPDIR:-/tmp}/averis-demo"}
FFMPEG=${DEMO_FFMPEG:-ffmpeg}
FFPROBE=${DEMO_FFPROBE:-ffprobe}
CAPTURE="$DEMO_DIR/capture.webm"
BEATS="$DEMO_DIR/beats.json"
OUTPUT="$DEMO_DIR/capture-joined.mp4"

fail() { printf '%s\n' "$*" >&2; exit 1; }
ffconcat_entry() {
  python3 - "$1" <<'PY'
import sys

path = sys.argv[1]
if any(ord(character) < 32 or ord(character) == 127 for character in path):
    raise SystemExit("ffconcat paths cannot contain control characters")
print("file '" + path.replace("\\", "\\\\").replace("'", "'\\''") + "'")
PY
}
command -v "$FFMPEG" >/dev/null || fail "ffmpeg is required"
command -v "$FFPROBE" >/dev/null || fail "ffprobe is required"
[[ -f "$CAPTURE" ]] || fail "capture.webm is required"
[[ -f "$BEATS" ]] || fail "beats.json is required"

probe_duration() {
  local duration
  duration=$("$FFPROBE" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$1")
  python3 - "$duration" <<'PY'
import math
import sys
try:
    value = float(sys.argv[1])
except ValueError:
    raise SystemExit(1)
if not math.isfinite(value) or value <= 0:
    raise SystemExit(1)
print(value)
PY
}

validate_media() {
  local details
  details=$("$FFPROBE" -v error -show_entries stream=codec_type,width,height,channels -of json "$1")
  python3 - "$details" <<'PY'
import json
import sys
streams = {stream.get("codec_type"): stream for stream in json.loads(sys.argv[1]).get("streams", [])}
video, audio = streams.get("video"), streams.get("audio")
if not video or not audio or not isinstance(video.get("width"), int) or video["width"] <= 0 or not isinstance(video.get("height"), int) or video["height"] <= 0 or not isinstance(audio.get("channels"), int) or audio["channels"] <= 0:
    raise SystemExit("input media must contain video and audio")
PY
}

validate_output() {
  local details
  details=$("$FFPROBE" -v error -show_entries stream=codec_type,codec_name,width,height,channels -of json "$1")
  python3 - "$details" <<'PY'
import json
import sys
streams = {stream.get("codec_type"): stream for stream in json.loads(sys.argv[1]).get("streams", [])}
video, audio = streams.get("video"), streams.get("audio")
if not video or not audio or (video.get("codec_name"), video.get("width"), video.get("height")) != ("h264", 1920, 1080) or (audio.get("codec_name"), audio.get("channels")) != ("aac", 2):
    raise SystemExit("assembled media validation failed")
PY
}

validate_media "$CAPTURE"
probe_duration "$CAPTURE" >/dev/null

normalize_capture="$DEMO_DIR/.capture-normalized.mp4"
trap 'rm -f "$normalize_capture" "$DEMO_DIR"/.slide-segment-*.mp4 "$DEMO_DIR"/.assemble-concat.txt' EXIT
"$FFMPEG" -y -i "$CAPTURE" -vf 'scale=1728:1080,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF4F7F4' \
  -r 25 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -ac 2 -b:a 128k "$normalize_capture"

slides=${DEMO_SLIDES:-}
if [[ -z "${slides//[[:space:]]/}" ]]; then
  mv "$normalize_capture" "$OUTPUT"
  validate_output "$OUTPUT"
  exit 0
fi

declare -A seen=()
slide_names=()
slide_seconds=()
for pair in $slides; do
  [[ "$pair" == *:* ]] || fail "DEMO_SLIDES entries must be name:seconds"
  name=${pair%%:*}
  seconds=${pair#*:}
  [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || fail "slide name is invalid"
  [[ "$seconds" =~ ^[1-9][0-9]*$ ]] || fail "slide seconds must be a positive integer"
  [[ -z ${seen[$name]+x} ]] || fail "slide name is duplicated"
  [[ -f "$DEMO_DIR/slide-$name.png" ]] || fail "missing slide-$name.png"
  seen[$name]=1
  slide_names+=("$name")
  slide_seconds+=("$seconds")
done

concat_list="$DEMO_DIR/.assemble-concat.txt"
ffconcat_entry "$normalize_capture" > "$concat_list"
for index in "${!slide_names[@]}"; do
  segment="$DEMO_DIR/.slide-segment-$index.mp4"
  "$FFMPEG" -y -loop 1 -t "${slide_seconds[$index]}" -i "$DEMO_DIR/slide-${slide_names[$index]}.png" \
    -f lavfi -t "${slide_seconds[$index]}" -i anullsrc=r=44100:cl=stereo \
    -vf 'scale=1920:1080' -r 25 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -ac 2 -b:a 128k -shortest "$segment"
  ffconcat_entry "$segment" >> "$concat_list"
done
"$FFMPEG" -y -f concat -safe 0 -i "$concat_list" -c copy "$OUTPUT"
validate_output "$OUTPUT"

python3 - "$BEATS" "$normalize_capture" "$FFPROBE" "${slide_names[@]}" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

beats_path = Path(sys.argv[1])
capture = Path(sys.argv[2])
ffprobe = sys.argv[3]
names = sys.argv[4:]
try:
    beats = json.loads(beats_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    raise SystemExit(f"could not read beats.json: {error}")
if not isinstance(beats, list):
    raise SystemExit("beats.json must contain a list")
duration = float(subprocess.check_output([
    ffprobe, "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", str(capture)
], text=True).strip())
start_ms = round(duration * 1000)
for index, name in enumerate(names):
    beats.append({"name": f"slide-{name}", "ms": start_ms})
    start_ms += round(float(subprocess.check_output([
        ffprobe, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(beats_path.parent / f".slide-segment-{index}.mp4")
    ], text=True).strip()) * 1000)
beats_path.write_text(json.dumps(beats, indent=2) + "\n", encoding="utf-8")
PY
