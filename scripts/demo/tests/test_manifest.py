import json
import os
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path


DEMO = Path(__file__).resolve().parents[1]
MANIFEST = DEMO / "manifest.py"


def write_silence(path, milliseconds):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8000)
        output.writeframes(b"\0\0" * (milliseconds * 8))


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.demo_dir = Path(self.temporary.name)
        self.source = self.demo_dir / "source.wav"
        write_silence(self.source, 7000)
        (self.demo_dir / "beats.json").write_text(
            json.dumps([
                {"name": "inbox", "ms": 1000},
                {"name": "compare", "ms": 5000},
            ]),
            encoding="utf-8",
        )

    def tearDown(self):
        self.temporary.cleanup()

    def run_manifest(self, script, environment=None):
        narration = self.demo_dir / "narration.txt"
        narration.write_text(script, encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(MANIFEST), str(self.demo_dir), str(narration), str(self.source)],
            text=True,
            capture_output=True,
            check=False,
            env=environment,
        )

    def test_resolves_and_sorts_lines_against_visual_beats(self):
        result = self.run_manifest(
            "compare | 20 | Compare the result.\n"
            "# narration comments are ignored\n"
            "inbox | 100 | Account every message.\n"
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        lines = json.loads((self.demo_dir / "lines.json").read_text(encoding="utf-8"))
        self.assertEqual(
            lines[0],
            {"beat": "inbox", "ms": 1100, "visual_end_ms": 5000, "text": "Account every message."},
        )
        self.assertEqual(lines[1]["visual_end_ms"], 7000)

    def test_rejects_unknown_beat_without_writing_lines(self):
        result = self.run_manifest("missing | 100 | Never resolve this.\n")

        self.assertEqual(result.returncode, 1)
        self.assertIn("beat 'missing' never happened", result.stderr)
        self.assertFalse((self.demo_dir / "lines.json").exists())

    def test_rejects_start_at_or_after_source_duration(self):
        result = self.run_manifest("compare | 2000 | Too late.\n")

        self.assertEqual(result.returncode, 1)
        self.assertIn("offset exceeds source duration", result.stderr)

    def test_rejects_ambiguous_whitespace_in_beat_names(self):
        (self.demo_dir / "beats.json").write_text(
            json.dumps([{"name": " inbox", "ms": 1000}]), encoding="utf-8"
        )
        result = self.run_manifest("inbox | 100 | Do not normalize a recorded beat.\n")

        self.assertEqual(result.returncode, 1)
        self.assertIn("beat input is invalid", result.stderr)

    def test_rejects_non_finite_source_duration(self):
        probe_dir = self.demo_dir / "probe"
        probe_dir.mkdir()
        probe = probe_dir / "ffprobe"
        probe.write_text("#!/bin/sh\nprintf 'inf\\n'\n", encoding="utf-8")
        probe.chmod(0o755)
        environment = {**os.environ, "PATH": f"{probe_dir}:{os.environ['PATH']}"}

        result = self.run_manifest("inbox | 100 | Never resolve this.\n", environment)

        self.assertEqual(result.returncode, 1)
        self.assertIn("could not measure source duration", result.stderr)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
