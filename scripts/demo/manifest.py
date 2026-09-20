#!/usr/bin/env python3
"""Resolve narration rows against measured visual beats."""

import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def probe_duration_ms(source):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(source),
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode or not result.stdout.strip():
        raise ValueError("could not measure source duration")
    try:
        duration = float(result.stdout.strip())
        if not math.isfinite(duration):
            raise ValueError
        duration_ms = round(duration * 1000)
    except (OverflowError, ValueError) as error:
        raise ValueError("could not measure source duration") from error
    if duration_ms <= 0:
        raise ValueError("could not measure source duration")
    return duration_ms


def load_beats(path):
    try:
        beats = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("could not read beats.json") from error
    if not isinstance(beats, list):
        raise ValueError("beats.json must contain a list")

    indexed = {}
    previous_ms = -1
    for beat in beats:
        if not isinstance(beat, dict) or not isinstance(beat.get("name"), str):
            raise ValueError("beat input is invalid")
        name = beat["name"].strip()
        ms = beat.get("ms")
        if not name or name != beat["name"] or not isinstance(ms, int) or isinstance(ms, bool):
            raise ValueError("beat input is invalid")
        if name in indexed:
            raise ValueError(f"beat '{name}' is duplicated")
        if ms <= previous_ms:
            raise ValueError("beat input is non-monotonic")
        indexed[name] = ms
        previous_ms = ms
    return beats, indexed


def parse_rows(path):
    rows = []
    seen = set()
    try:
        contents = path.read_text(encoding="utf-8")
    except OSError as error:
        raise ValueError("could not read narration script") from error
    for line_number, raw in enumerate(contents.splitlines(), start=1):
        row = raw.strip()
        if not row or row.startswith("#"):
            continue
        fields = [field.strip() for field in row.split("|")]
        if len(fields) != 3:
            raise ValueError(f"invalid narration row {line_number}")
        beat, offset_text, text = fields
        if not beat or not text:
            raise ValueError(f"invalid narration row {line_number}")
        try:
            offset = int(offset_text)
        except ValueError as error:
            raise ValueError(f"invalid offset on narration row {line_number}") from error
        key = (beat, offset)
        if key in seen:
            raise ValueError(f"duplicate narration row {line_number}")
        seen.add(key)
        rows.append((beat, offset, text))
    return rows


def resolve_lines(demo_dir, narration_script, source_video):
    beats, by_name = load_beats(demo_dir / "beats.json")
    duration_ms = probe_duration_ms(source_video)
    rows = parse_rows(narration_script)
    next_visual = {
        beat["name"]: beats[index + 1]["ms"] if index + 1 < len(beats) else duration_ms
        for index, beat in enumerate(beats)
    }
    lines = []
    for beat, offset, text in rows:
        if beat not in by_name:
            raise ValueError(f"beat '{beat}' never happened")
        start_ms = by_name[beat] + offset
        if start_ms < 0 or start_ms >= duration_ms:
            raise ValueError("offset exceeds source duration")
        lines.append(
            {"beat": beat, "ms": start_ms, "visual_end_ms": next_visual[beat], "text": text}
        )
    return sorted(lines, key=lambda line: line["ms"])


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


def main(argv):
    if len(argv) != 4:
        print("usage: manifest.py <demo-dir> <narration-script> <source-video>", file=sys.stderr)
        return 1
    demo_dir, narration_script, source_video = map(Path, argv[1:])
    try:
        lines = resolve_lines(demo_dir, narration_script, source_video)
        atomic_json_write(demo_dir / "lines.json", lines)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
