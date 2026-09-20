import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest


ROOT = pathlib.Path(__file__).parents[1]


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg is required")
class AssembleIntegrationTest(unittest.TestCase):
    def test_joins_capture_to_h264_aac_canvas_and_preserves_beats(self):
        with tempfile.TemporaryDirectory() as temporary:
            demo_dir = pathlib.Path(temporary)
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=1440x900:d=1",
                "-f", "lavfi", "-i", "sine=f=440:r=44100:d=1", "-c:v", "libvpx-vp9",
                "-c:a", "libopus", str(demo_dir / "capture.webm")
            ], check=True, capture_output=True)
            (demo_dir / "beats.json").write_text(json.dumps([{"name": "opening", "ms": 50}]))
            environment = os.environ | {"DEMO_DIR": str(demo_dir)}
            result = subprocess.run([str(ROOT / "assemble.sh")], env=environment, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            probe = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries",
                "stream=codec_name,codec_type,width,height,channels:format=duration",
                "-of", "json", str(demo_dir / "capture-joined.mp4")
            ], text=True, capture_output=True, check=True)
            data = json.loads(probe.stdout)
            self.assertGreater(float(data["format"]["duration"]), 0)
            streams = {stream["codec_type"]: stream for stream in data["streams"]}
            self.assertEqual((streams["video"]["codec_name"], streams["video"]["width"], streams["video"]["height"]), ("h264", 1920, 1080))
            self.assertEqual((streams["audio"]["codec_name"], streams["audio"]["channels"]), ("aac", 2))
            self.assertEqual(json.loads((demo_dir / "beats.json").read_text()), [{"name": "opening", "ms": 50}])

    def test_appends_slide_from_a_directory_with_spaces_and_an_apostrophe(self):
        with tempfile.TemporaryDirectory(prefix="demo's media ") as temporary:
            demo_dir = pathlib.Path(temporary)
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=1440x900:d=1",
                "-f", "lavfi", "-i", "sine=f=440:r=44100:d=1", "-c:v", "libvpx-vp9",
                "-c:a", "libopus", str(demo_dir / "capture.webm")
            ], check=True, capture_output=True)
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=green:s=1920x1080:d=1",
                "-frames:v", "1", str(demo_dir / "slide-intro.png")
            ], check=True, capture_output=True)
            (demo_dir / "beats.json").write_text(json.dumps([{"name": "opening", "ms": 50}]))
            result = subprocess.run(
                [str(ROOT / "assemble.sh")],
                env=os.environ | {"DEMO_DIR": str(demo_dir), "DEMO_SLIDES": "intro:1"},
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((demo_dir / "capture-joined.mp4").is_file())


if __name__ == "__main__":
    unittest.main()
