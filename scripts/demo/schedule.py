#!/usr/bin/env python3
"""Place narration segments without crossing visual boundaries."""

import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path


FFPROBE = os.environ.get("DEMO_FFPROBE", "ffprobe")


def probe_duration_ms(segment):
    result = subprocess.run(
        [
            FFPROBE,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(segment),
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode or not result.stdout.strip():
        raise ValueError(f"could not measure segment '{segment.name}'")
    try:
        duration = float(result.stdout.strip())
        if not math.isfinite(duration):
            raise ValueError
        duration_ms = round(duration * 1000)
    except (OverflowError, ValueError) as error:
        raise ValueError(f"could not measure segment '{segment.name}'") from error
    if duration_ms <= 0:
        raise ValueError(f"segment '{segment.name}' has no duration")
    return duration_ms


def deconflict(lines, durations, gap_ms=260):
    if len(lines) != len(durations):
        raise ValueError("lines and durations must have the same length")
    shifted = 0
    last_end_ms = None
    for line, duration in zip(lines, durations, strict=True):
        start_ms = line["ms"]
        if last_end_ms is not None and start_ms < last_end_ms + gap_ms:
            start_ms = last_end_ms + gap_ms
            shifted += 1
        line["ms"] = start_ms
        line["dur_ms"] = duration
        last_end_ms = start_ms + duration
    return shifted, last_end_ms if last_end_ms is not None else 0


def atomic_json_write(path, value):
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temporary, path)
    except BaseException:
        os.unlink(temporary)
        raise


def schedule(demo_dir):
    lines_path = demo_dir / "lines.json"
    try:
        lines = json.loads(lines_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("could not read lines.json") from error
    if not isinstance(lines, list):
        raise ValueError("lines.json must contain a list")

    segments = demo_dir / "seg"
    expected = [segments / f"{index}.wav" for index in range(len(lines))]
    actual = (
        sorted(segments.glob("*.wav"), key=lambda path: int(path.stem))
        if segments.is_dir()
        else []
    )
    if any(not segment.is_file() for segment in expected):
        raise ValueError("missing segment")
    if actual != expected:
        raise ValueError("segments must be ordered and match narration lines")
    durations = [probe_duration_ms(segment) for segment in expected]
    deconflict(lines, durations)
    for line in lines:
        if line["ms"] + line["dur_ms"] > line["visual_end_ms"]:
            raise ValueError(f"VISUAL OVERRUN for beat '{line.get('beat', '')}'")
    atomic_json_write(lines_path, lines)
    return lines


def main(argv):
    if len(argv) != 2:
        print("usage: schedule.py <demo-dir>", file=sys.stderr)
        return 1
    try:
        schedule(Path(argv[1]))
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
