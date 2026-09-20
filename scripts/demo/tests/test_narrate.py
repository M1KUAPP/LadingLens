import pathlib
import unittest


class NarrateContractTest(unittest.TestCase):
    def test_narration_filter_contract(self):
        demo = pathlib.Path(__file__).parents[1]
        script = (demo / "assemble.sh").read_text() + (demo / "narrate.sh").read_text()
        for value in (
            "DEMO_SCRIPT",
            "FontName=Quicksand,FontSize=10.5",
            "PrimaryColour=&H00FFFFFF",
            "BorderStyle=3,Outline=0.75,Shadow=0,Alignment=2,MarginV=10,Spacing=0.2",
            "loudnorm=I=-18:TP=-2:LRA=7",
            "scale=1728:1080,pad=1920:1080",
            "DEMO_MAX_DURATION:-300",
            "pan=stereo|c0=c0|c1=c0",
        ):
            self.assertIn(value, script)


if __name__ == "__main__":
    unittest.main()
