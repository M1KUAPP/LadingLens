import json
import unittest
from pathlib import Path


DEMO = Path(__file__).resolve().parents[1]
ASSETS = DEMO / "assets"
EXPECTED_SHA256 = "93c3309b33c1f68d98238df36033728920137f03a5a181a089112d1ddcd0ef81"
SOURCE_SHA256 = "45c67e4a89783bc46d9a1819deae7a5e80d19193af50e26123e89d6e73b71f6e"


class AssetTests(unittest.TestCase):
    def test_requirements_are_pinned_for_the_profile(self):
        requirements = (DEMO / "chatterbox-requirements.txt").read_text(encoding="utf-8")

        for requirement in (
            "5de7a54aa4e5e2baadb0182dde554908b48b85c2",
            "ff1c8ac55a976971245cdd53c18d6131ca00d993",
            "torch==2.6.0",
            "torchaudio==2.6.0",
            "setuptools<81",
        ):
            self.assertIn(requirement, requirements)

    def test_manifest_and_use_notice_identify_the_asset_scope(self):
        manifest = json.loads((ASSETS / "media-manifest.json").read_text(encoding="utf-8"))
        entry = manifest["chatterbox-reference.wav"]

        self.assertEqual(entry["sha256"], EXPECTED_SHA256)
        self.assertEqual(entry["source_sample_sha256"], SOURCE_SHA256)
        self.assertEqual(entry["derivation"]["offset_seconds"], 4)
        self.assertEqual(entry["derivation"]["duration_seconds"], 16)
        self.assertEqual(entry["derivation"]["high_pass_hz"], 70)
        self.assertEqual(entry["derivation"]["low_pass_hz"], 10000)
        self.assertEqual(entry["derivation"]["loudnorm"], "I=-20:TP=-2:LRA=7")
        self.assertEqual(entry["use_scope"], "maintainer-directed repository use")
        self.assertEqual(entry["synthetic_narration_disclosure"], "VOICE_USE.md")
        self.assertIn("do not themselves assert a broader license", entry["provenance_note"])


if __name__ == "__main__":
    unittest.main()
