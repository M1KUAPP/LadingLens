import json
import os
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path


DEMO = Path(__file__).resolve().parents[1]
SCHEDULE = DEMO / "schedule.py"


def write_silence(path, milliseconds):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8000)
        output.writeframes(b"\0\0" * (milliseconds * 8))


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.demo_dir = Path(self.temporary.name)
        (self.demo_dir / "seg").mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def run_schedule(self, lines, durations, environment=None):
        (self.demo_dir / "lines.json").write_text(json.dumps(lines), encoding="utf-8")
        for index, duration in enumerate(durations):
            write_silence(self.demo_dir / "seg" / f"{index}.wav", duration)
        return subprocess.run(
            [sys.executable, str(SCHEDULE), str(self.demo_dir)],
            text=True,
            capture_output=True,
            check=False,
            env=environment,
        )

    def test_applies_gap_and_retains_measured_durations(self):
        result = self.run_schedule(
            [
                {"beat": "one", "ms": 1000, "visual_end_ms": 4000, "text": "First."},
                {"beat": "two", "ms": 1100, "visual_end_ms": 5000, "text": "Second."},
            ],
            [500, 600],
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        lines = json.loads((self.demo_dir / "lines.json").read_text(encoding="utf-8"))
        self.assertEqual(lines[0]["dur_ms"], 500)
        self.assertEqual(lines[1]["ms"], 1760)
        self.assertEqual(lines[1]["dur_ms"], 600)

    def test_rejects_speech_that_crosses_visual_boundary(self):
        result = self.run_schedule(
            [{"beat": "one", "ms": 1000, "visual_end_ms": 1200, "text": "Too long."}],
            [500],
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("VISUAL OVERRUN", result.stderr)

    def test_rejects_missing_segment(self):
        result = self.run_schedule(
            [{"beat": "one", "ms": 1000, "visual_end_ms": 4000, "text": "Missing."}],
            [],
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("missing segment", result.stderr)

    def test_accepts_ordered_double_digit_segment_indexes(self):
        lines = [
            {"beat": str(index), "ms": index * 1000, "visual_end_ms": 20_000, "text": "Line."}
            for index in range(11)
        ]
        result = self.run_schedule(lines, [100] * 11)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_non_finite_segment_duration(self):
        probe_dir = self.demo_dir / "probe"
        probe_dir.mkdir()
        probe = probe_dir / "ffprobe"
        probe.write_text("#!/bin/sh\nprintf 'nan\\n'\n", encoding="utf-8")
        probe.chmod(0o755)
        environment = {**os.environ, "PATH": f"{probe_dir}:{os.environ['PATH']}"}
        result = self.run_schedule(
            [{"beat": "one", "ms": 1000, "visual_end_ms": 4000, "text": "Bad."}],
            [500],
            environment,
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("could not measure segment '0.wav'", result.stderr)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
