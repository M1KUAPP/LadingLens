import importlib.util
import unittest
from pathlib import Path


SUBTITLES = Path(__file__).resolve().parents[1] / "subtitles.py"
SPEC = importlib.util.spec_from_file_location("subtitles", SUBTITLES)
subtitles = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(subtitles)


class SubtitleTests(unittest.TestCase):
    def test_balances_long_words_into_exact_safe_cards(self):
        spans = subtitles.make_spans(
            [{
                "ms": 1000,
                "dur_ms": 1800,
                "text": "Measured timing keeps every spoken word readable without rushed visual collisions.",
            }]
        )

        self.assertEqual(
            spans,
            [
                [1000, 1900, ["Measured timing keeps every spoken", "word readable without rushed visual"]],
                [1900, 2800, ["collisions."]],
            ],
        )
        self.assertTrue(all(len(row) <= 36 for _, _, rows in spans for row in rows))
        self.assertTrue(all(len(rows) <= 2 for _, _, rows in spans))

    def test_truncates_overlaps_and_discards_short_cards(self):
        spans = subtitles.make_spans(
            [
                {"ms": 0, "dur_ms": 1000, "text": "First card."},
                {"ms": 150, "dur_ms": 1000, "text": "Second card."},
            ]
        )

        self.assertEqual(spans, [[150, 1150, ["Second card."]]])
        self.assertTrue(all(current[1] <= following[0] for current, following in zip(spans, spans[1:])))


if __name__ == "__main__":
    unittest.main()
