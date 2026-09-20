#!/usr/bin/env python3
"""Generate compact, non-overlapping SRT subtitle cards."""

import json
import math
import sys
from pathlib import Path


MAX_CHARS = 36
MAX_LINES = 2
MIN_CARD_MS = 900


def wrap_rows(text):
    words = text.split()
    rows = []
    current = ""
    for word in words:
        if len(word) > MAX_CHARS:
            raise ValueError("a subtitle word exceeds the character limit")
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > MAX_CHARS:
            rows.append(current)
            current = word
        else:
            current = candidate
    if current:
        rows.append(current)
    return rows


def make_spans(lines):
    spans = []
    for line in lines:
        rows = wrap_rows(line["text"])
        cards = [rows[index : index + MAX_LINES] for index in range(0, len(rows), MAX_LINES)]
        if not cards:
            continue
        card_ms = max(MIN_CARD_MS, math.ceil(line["dur_ms"] / len(cards)))
        start_ms = line["ms"]
        for card in cards:
            spans.append([start_ms, start_ms + card_ms, card])
            start_ms += card_ms
    for current, following in zip(spans, spans[1:], strict=False):
        if current[1] > following[0]:
            current[1] = following[0]
    return [span for span in spans if span[1] - span[0] >= 200]


def timestamp(milliseconds):
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def render_srt(spans):
    cards = []
    for index, (start_ms, end_ms, rows) in enumerate(spans, start=1):
        cards.append(f"{index}\n{timestamp(start_ms)} --> {timestamp(end_ms)}\n{'\\n'.join(rows)}")
    return "\n\n".join(cards) + ("\n" if cards else "")


def main(argv):
    if len(argv) != 2:
        print("usage: subtitles.py <demo-dir>", file=sys.stderr)
        return 1
    demo_dir = Path(argv[1])
    try:
        lines = json.loads((demo_dir / "lines.json").read_text(encoding="utf-8"))
        (demo_dir / "narration.srt").write_text(render_srt(make_spans(lines)), encoding="utf-8")
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
