"""Render approved Chatterbox narration into cached PCM WAV segments."""

import hashlib
import json
import math
import os
import shutil
import wave
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_REFERENCE = SCRIPT_DIR / "assets" / "chatterbox-reference.wav"
TTS = os.environ.get("DEMO_TTS", "chatterbox")
CB_VARIANT = os.environ.get("CHATTERBOX_VARIANT", "nano")
SPEED = float(os.environ.get("DEMO_SPEED", "1.0"))
CHATTERBOX_HOME = Path(
    os.environ.get("CHATTERBOX_HOME", "~/.local/share/averis-demo/chatterbox")
).expanduser()
REFERENCE = Path(os.environ.get("CHATTERBOX_REF", DEFAULT_REFERENCE))
CACHE_DIR = Path(os.environ.get("CHATTERBOX_CACHE", CHATTERBOX_HOME / "cache"))
APPROVED_VARIANTS = {"nano", "turbo", "base"}


def validate_configuration():
    if TTS != "chatterbox":
        raise ValueError("DEMO_TTS must be chatterbox")
    if CB_VARIANT not in APPROVED_VARIANTS:
        raise ValueError("CHATTERBOX_VARIANT must be nano, turbo, or base")
    if not math.isfinite(SPEED) or SPEED <= 0:
        raise ValueError("DEMO_SPEED must be a positive finite number")
    if not REFERENCE.is_file():
        raise ValueError("CHATTERBOX_REF must name an existing WAV file")
    try:
        with wave.open(str(REFERENCE), "rb") as reference:
            params = reference.getparams()
    except (EOFError, OSError, wave.Error) as error:
        raise ValueError("CHATTERBOX_REF must name a supported PCM WAV file") from error
    if (
        params.comptype != "NONE"
        or params.nchannels != 1
        or params.sampwidth != 2
        or params.framerate <= 0
        or params.nframes <= 0
    ):
        raise ValueError("CHATTERBOX_REF must name a supported PCM WAV file")


class ChatterboxRenderer:
    """Lazy Chatterbox adapter so tests never import or load a model."""

    def __init__(self):
        validate_configuration()
        import torch

        torch.backends.mkldnn.enabled = False
        self.torch = torch
        if CB_VARIANT == "nano":
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            self.model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)
        elif CB_VARIANT == "turbo":
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            self.model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=False)
        else:
            from chatterbox.tts import ChatterboxTTS

            self.model = ChatterboxTTS.from_pretrained(
                device="cpu", attn_implementation="eager"
            )
        self.sample_rate = self.model.sr

    def _math_attention(self):
        attention = self.torch.nn.attention
        return attention.sdpa_kernel(attention.SDPBackend.MATH)

    def prepare(self, reference):
        with self._math_attention():
            self.model.prepare_conditionals(wav_fpath=str(reference))

    def render(self, text):
        with self._math_attention():
            audio = self.model.generate(text)
        if not self.torch.isfinite(audio).all():
            raise ValueError("model returned non-finite audio")
        if SPEED != 1.0:
            target_rate = round(self.sample_rate / SPEED)
            audio = self.torch.nn.functional.interpolate(
                audio.reshape(1, 1, -1), size=round(audio.numel() / SPEED), mode="linear",
                align_corners=False,
            ).reshape(-1)
        if not self.torch.isfinite(audio).all():
            raise ValueError("speed conversion returned non-finite audio")
        return audio.detach().cpu().flatten().tolist()


def _cache_key(text, reference_sha256):
    payload = {
        "reference_sha256": reference_sha256,
        "speed": SPEED,
        "text": text,
        "variant": CB_VARIANT,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def _write_pcm_wav(path, samples, sample_rate):
    frames = bytearray()
    for sample in samples:
        if not math.isfinite(float(sample)):
            raise ValueError("renderer returned non-finite audio")
        value = max(-1.0, min(1.0, float(sample)))
        frames.extend(int(round(value * 32767)).to_bytes(2, "little", signed=True))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(frames)


def _lines_text(lines):
    texts = []
    for line in lines:
        text = line.get("text") if isinstance(line, dict) else None
        if not isinstance(text, str) or not text.strip():
            raise ValueError("each narration line needs non-empty text")
        texts.append(text)
    return texts


def render_batch(lines, output_dir, renderer_factory=ChatterboxRenderer):
    """Render line dictionaries, using content-addressed cached WAV segments."""
    validate_configuration()
    texts = _lines_text(lines)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    reference_sha256 = hashlib.sha256(REFERENCE.read_bytes()).hexdigest()
    cached = [CACHE_DIR / f"{_cache_key(text, reference_sha256)}.wav" for text in texts]
    if all(path.is_file() for path in cached):
        for index, source in enumerate(cached):
            shutil.copyfile(source, output_dir / f"{index}.wav")
        return [output_dir / f"{index}.wav" for index in range(len(texts))]

    renderer = renderer_factory()
    renderer.prepare(REFERENCE)
    for text, cache_path in zip(texts, cached):
        if not cache_path.is_file():
            _write_pcm_wav(cache_path, renderer.render(text), renderer.sample_rate)
    for index, source in enumerate(cached):
        shutil.copyfile(source, output_dir / f"{index}.wav")
    return [output_dir / f"{index}.wav" for index in range(len(texts))]


if __name__ == "__main__":
    raise SystemExit("Import speak.py and call render_batch(lines, output_dir).")
