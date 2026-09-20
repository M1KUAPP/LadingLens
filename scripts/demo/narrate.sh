#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR=${DEMO_DIR:-"${TMPDIR:-/tmp}/averis-demo"}
DEMO_SCRIPT=${DEMO_SCRIPT:?DEMO_SCRIPT is required}
FFMPEG=${DEMO_FFMPEG:-ffmpeg}
FFPROBE=${DEMO_FFPROBE:-ffprobe}
DEMO_MAX_DURATION=${DEMO_MAX_DURATION:-300}
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SOURCE="$DEMO_DIR/capture-joined.mp4"

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
[[ -f "$SOURCE" ]] || fail "capture-joined.mp4 is required"
[[ -f "$DEMO_SCRIPT" ]] || fail "DEMO_SCRIPT must name a file"
[[ "$DEMO_MAX_DURATION" =~ ^[1-9][0-9]*$ ]] || fail "DEMO_MAX_DURATION must be a positive integer"

export DEMO_FFPROBE="$FFPROBE"
python3 "$SCRIPT_DIR/manifest.py" "$DEMO_DIR" "$DEMO_SCRIPT" "$SOURCE"
python3 - "$SCRIPT_DIR" "$DEMO_DIR" <<'PY'
import json
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import speak
demo = Path(sys.argv[2])
speak.render_batch(json.loads((demo / "lines.json").read_text(encoding="utf-8")), demo / "seg")
PY
python3 "$SCRIPT_DIR/schedule.py" "$DEMO_DIR"
python3 "$SCRIPT_DIR/subtitles.py" "$DEMO_DIR"

concat="$DEMO_DIR/.narration-concat.txt"
trap 'rm -f "$concat"' EXIT
find "$DEMO_DIR/seg" -maxdepth 1 -type f -name '*.wav' -print | sort -V | while IFS= read -r segment; do ffconcat_entry "$segment"; done > "$concat"
[[ -s "$concat" ]] || fail "narration segments are required"
"$FFMPEG" -y -f concat -safe 0 -i "$concat" -filter:a 'amix=inputs=1:normalize=0,loudnorm=I=-18:TP=-2:LRA=7' "$DEMO_DIR/narration.wav"

subtitle="subtitles=$DEMO_DIR/narration.srt:force_style='FontName=Quicksand,FontSize=10.5,PrimaryColour=&H00FFFFFF,BackColour=&H70101310,BorderStyle=3,Outline=0.75,Shadow=0,Alignment=2,MarginV=10,Spacing=0.2'"
if [[ -n ${DEMO_BGM:-} ]]; then
  [[ -f "$DEMO_BGM" ]] || fail "DEMO_BGM must name a file"
  "$FFMPEG" -y -stream_loop -1 -i "$SOURCE" -stream_loop -1 -i "$DEMO_BGM" -i "$DEMO_DIR/narration.wav" \
    -filter_complex "[1:a]volume=-17dB[music];[music][2:a]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500[ducked];[2:a][ducked]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[audio]" \
    -vf "$subtitle" -map 0:v:0 -map '[audio]' -r 25 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 192k -movflags +faststart -shortest "$DEMO_DIR/demo.mp4"
else
  "$FFMPEG" -y -stream_loop -1 -i "$SOURCE" -i "$DEMO_DIR/narration.wav" \
    -vf "$subtitle" -filter:a 'pan=stereo|c0=c0|c1=c0' -map 0:v:0 -map 1:a:0 -r 25 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -ac 2 -b:a 128k -movflags +faststart -shortest "$DEMO_DIR/demo.mp4"
fi

probe=$("$FFPROBE" -v error -show_entries stream=codec_type,codec_name,width,height,channels:format=duration -of json "$DEMO_DIR/demo.mp4")
python3 - "$probe" "$DEMO_MAX_DURATION" <<'PY'
import json
import math
import sys
data = json.loads(sys.argv[1])
streams = {stream.get("codec_type"): stream for stream in data.get("streams", [])}
video, audio = streams.get("video"), streams.get("audio")
duration = float(data.get("format", {}).get("duration", 0))
if not video or not audio or (video.get("codec_name"), video.get("width"), video.get("height")) != ("h264", 1920, 1080) or (audio.get("codec_name"), audio.get("channels")) != ("aac", 2) or not math.isfinite(duration) or not 0 < duration <= int(sys.argv[2]):
    raise SystemExit("final media validation failed")
PY
