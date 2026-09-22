import hashlib
import importlib.util
import os
import sys
import tempfile
import types
import unittest
import wave
from pathlib import Path
from unittest.mock import patch


DEMO = Path(__file__).resolve().parents[1]
SPEAK = DEMO / "speak.py"
REFERENCE = DEMO / "assets" / "chatterbox-reference.wav"
EXPECTED_SHA256 = "93c3309b33c1f68d98238df36033728920137f03a5a181a089112d1ddcd0ef81"


def load_speak(overrides=None):
    with patch.dict(os.environ, overrides or {}, clear=True):
        spec = importlib.util.spec_from_file_location("speak", SPEAK)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module


def fake_chatterbox_modules(initial_threads):
    fake_torch = types.ModuleType("torch")
    fake_torch.backends = types.SimpleNamespace(
        mkldnn=types.SimpleNamespace(enabled=True)
    )
    fake_torch.configured_threads = initial_threads
    fake_torch.set_num_threads = lambda value: setattr(
        fake_torch, "configured_threads", value
    )

    fake_chatterbox = types.ModuleType("chatterbox")
    fake_chatterbox.__path__ = []
    fake_turbo = types.ModuleType("chatterbox.tts_turbo")
    fake_turbo.ChatterboxTurboTTS = types.SimpleNamespace(
        from_pretrained=lambda **kwargs: types.SimpleNamespace(sr=24000)
    )
    return fake_torch, {
        "torch": fake_torch,
        "chatterbox": fake_chatterbox,
        "chatterbox.tts_turbo": fake_turbo,
    }


class FakeRenderer:
    sample_rate = 24000

    def __init__(self):
        self.prepared = 0
        self.rendered = []

    def prepare(self, reference):
        self.prepared += 1

    def render(self, text):
        self.rendered.append(text)
        return [0.0, 0.5, -0.5]


class NonFiniteRenderer(FakeRenderer):
    def render(self, text):
        return [float("nan")]


class SpeakBatchTests(unittest.TestCase):
    def test_renderer_limits_cpu_threads_to_half_visible_cpus(self):
        fake_torch, modules = fake_chatterbox_modules(initial_threads=8)
        with (
            patch.object(os, "sched_getaffinity", create=True, return_value=set(range(8))),
            patch("os.cpu_count", return_value=8),
        ):
            speak = load_speak()
        with patch.dict(sys.modules, modules):
            speak.ChatterboxRenderer()

        self.assertEqual(fake_torch.configured_threads, 4)

    def test_renderer_limits_cpu_threads_to_process_affinity(self):
        fake_torch, modules = fake_chatterbox_modules(initial_threads=64)
        with (
            patch.object(os, "sched_getaffinity", create=True, return_value={0, 1}),
            patch("os.cpu_count", return_value=64),
        ):
            speak = load_speak()
        with patch.dict(sys.modules, modules):
            speak.ChatterboxRenderer()

        self.assertEqual(fake_torch.configured_threads, 1)

    def test_renderer_honors_explicit_cpu_thread_limit(self):
        fake_torch, modules = fake_chatterbox_modules(initial_threads=8)
        with (
            patch.object(os, "sched_getaffinity", create=True, return_value=set(range(8))),
            patch("os.cpu_count", return_value=8),
        ):
            speak = load_speak({"CHATTERBOX_THREADS": "3"})
        with patch.dict(sys.modules, modules):
            speak.ChatterboxRenderer()

        self.assertEqual(fake_torch.configured_threads, 3)

    def test_non_integer_thread_limit_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "CHATTERBOX_THREADS"):
            load_speak({"CHATTERBOX_THREADS": "many"})

    def test_profile_defaults_and_reference_are_exact(self):
        speak = load_speak()

        self.assertEqual(speak.TTS, "chatterbox")
        self.assertEqual(speak.CB_VARIANT, "nano")
        self.assertEqual(speak.SPEED, 1.0)
        self.assertEqual(speak.DEFAULT_REFERENCE, REFERENCE)
        self.assertEqual(hashlib.sha256(REFERENCE.read_bytes()).hexdigest(), EXPECTED_SHA256)
        with wave.open(str(REFERENCE), "rb") as wav:
            params = wav.getparams()
        self.assertEqual(params.framerate, 24000)
        self.assertEqual(params.nchannels, 1)
        self.assertEqual(params.sampwidth, 2)
        self.assertEqual(params.nframes, 384000)

    def test_render_batch_writes_pcm_and_reuses_complete_cache(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache_dir = Path(temporary) / "cache"
            speak = load_speak({"CHATTERBOX_CACHE": str(cache_dir)})
            renderer = FakeRenderer()
            output_dir = Path(temporary) / "segments"
            lines = [{"text": "First."}, {"text": "Second."}]
            first = speak.render_batch(lines, output_dir, renderer_factory=lambda: renderer)
            second = speak.render_batch(
                lines, output_dir, renderer_factory=lambda: self.fail("cache miss")
            )

            self.assertEqual(first, second)
            self.assertEqual(renderer.prepared, 1)
            self.assertEqual(renderer.rendered, ["First.", "Second."])
            with wave.open(str(output_dir / "0.wav"), "rb") as wav:
                self.assertEqual(wav.getparams()[:3], (1, 2, 24000))

    def test_invalid_engine_variant_speed_and_reference_fail_before_factory(self):
        with tempfile.TemporaryDirectory() as temporary:
            missing = Path(temporary) / "missing.wav"
            cases = (
                ({"DEMO_TTS": "other"}, "DEMO_TTS"),
                ({"CHATTERBOX_VARIANT": "other"}, "CHATTERBOX_VARIANT"),
                ({"CHATTERBOX_THREADS": "0"}, "CHATTERBOX_THREADS"),
                ({"DEMO_SPEED": "0"}, "DEMO_SPEED"),
                ({"CHATTERBOX_REF": str(missing)}, "CHATTERBOX_REF"),
            )
            for overrides, message in cases:
                with self.subTest(overrides=overrides):
                    speak = load_speak(overrides)
                    called = False

                    def factory():
                        nonlocal called
                        called = True
                        return FakeRenderer()

                    with self.assertRaisesRegex(ValueError, message):
                        speak.render_batch([], Path(temporary) / "out", factory)
                    self.assertFalse(called)

    def test_malformed_reference_fails_before_factory(self):
        with tempfile.TemporaryDirectory() as temporary:
            malformed = Path(temporary) / "malformed.wav"
            malformed.write_text("not a wav", encoding="utf-8")
            speak = load_speak({"CHATTERBOX_REF": str(malformed)})
            called = False

            def factory():
                nonlocal called
                called = True
                return FakeRenderer()

            with self.assertRaisesRegex(ValueError, "supported PCM WAV"):
                speak.render_batch([], Path(temporary) / "out", factory)
            self.assertFalse(called)

    def test_rejects_non_finite_renderer_audio(self):
        with tempfile.TemporaryDirectory() as temporary:
            speak = load_speak({"CHATTERBOX_CACHE": str(Path(temporary) / "cache")})
            with self.assertRaisesRegex(ValueError, "non-finite"):
                speak.render_batch(
                    [{"text": "Unsafe."}],
                    Path(temporary) / "out",
                    renderer_factory=NonFiniteRenderer,
                )

    def test_partial_cache_renders_only_missing_segment(self):
        with tempfile.TemporaryDirectory() as temporary:
            cache_dir = Path(temporary) / "cache"
            speak = load_speak({"CHATTERBOX_CACHE": str(cache_dir)})
            cache_dir.mkdir()
            digest = hashlib.sha256(REFERENCE.read_bytes()).hexdigest()
            first = cache_dir / f"{speak._cache_key('First.', digest)}.wav"
            speak._write_pcm_wav(first, [0.25], 24000)
            renderer = FakeRenderer()

            speak.render_batch(
                [{"text": "First."}, {"text": "Second."}],
                Path(temporary) / "out",
                renderer_factory=lambda: renderer,
            )

            self.assertEqual(renderer.prepared, 1)
            self.assertEqual(renderer.rendered, ["Second."])

    def test_cache_key_changes_for_variant_reference_speed_and_text(self):
        reference_sha = "a" * 64
        default = load_speak()._cache_key("Text", reference_sha)
        variant = load_speak({"CHATTERBOX_VARIANT": "turbo"})._cache_key(
            "Text", reference_sha
        )
        speed = load_speak({"DEMO_SPEED": "1.25"})._cache_key("Text", reference_sha)
        text = load_speak()._cache_key("Other", reference_sha)
        reference = load_speak()._cache_key("Text", "b" * 64)

        self.assertEqual(len({default, variant, speed, text, reference}), 5)


if __name__ == "__main__":
    unittest.main()
