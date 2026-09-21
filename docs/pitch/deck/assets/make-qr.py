"""Deck QRs: the two links on the closing slide, each with its own mark in the middle.

Adapted from Perch's docs/demo/assets/make-qr.py, same approach and tolerances.
Correction level H tolerates roughly 30 per cent damage, so a centre patch at 28
per cent of the width is well inside budget. The script decodes its own output
before writing and refuses to write a code it cannot read back, because a QR that
does not scan on a projector is worse than no QR at all.

The LadingLens mark is drawn here rather than loaded: it is the same geometry as
the brand mark in docs/brand - a ring broken into arcs, the closing arc teal. The
GitHub code carries GitHub's own mark instead, from github-mark.png beside this
file, because PIL cannot read SVG.

    python make-qr.py
"""

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

# The closing slide is dark, but the codes stay ink-on-paper: inverted QRs are a
# coin flip on cheap scanners, so each tile is a light square on the dark ground.
INK = (0x0C, 0x11, 0x15)
PAPER = (0xFB, 0xF8, 0xF2)
TEAL = (0x14, 0xB8, 0xA6)
INDIGO = (0x81, 0x8C, 0xF8)

QUIET = 4      # modules; 4 is the spec minimum
TARGET = 520   # px; the deck draws these around 210, and a PNG well over its
               # display size is paid for again inside the PDF
PATCH = 0.28   # knockout width as a fraction of the full image
LOGO = 0.225   # mark width as a fraction of the full image

HERE = Path(__file__).parent
TARGETS = [
    ("https://averis-222536409832.asia-southeast1.run.app/judge", "qr-judge.png", "lens"),
    ("https://github.com/Averis-T010NG/LadingLens", "qr-github.png", "github"),
]


def lens(side: int) -> Image.Image:
    """The LadingLens mark: a ring whose closing arc is teal, on the deck's ink tile."""
    s = side / 168.0
    img = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, side - 1, side - 1], radius=int(28 * s), fill=(*INK, 255))
    box = [42 * s, 42 * s, 126 * s, 126 * s]
    width = int(11 * s)
    d.arc(box, start=200, end=20, fill=(*INDIGO, 255), width=width)
    d.arc(box, start=20, end=110, fill=(*TEAL, 255), width=width)
    d.arc(box, start=110, end=200, fill=(*TEAL, 255), width=width)
    return img


def octocat(side: int) -> Image.Image:
    """GitHub's own mark on the same ink tile, so the pair reads as a pair."""
    s = side / 168.0
    img = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle(
        [0, 0, side - 1, side - 1], radius=int(28 * s), fill=(*INK, 255)
    )
    # The mark in this directory is already paper-white, which is what a dark
    # ink tile needs. Do not invert it: that was a bug, and it produced a black
    # octocat on a near-black tile that was invisible on the closing slide.
    glyph = Image.open(HERE / "github-mark.png").convert("RGBA")
    box = int(side * 0.66)
    glyph = glyph.resize((box, box), Image.LANCZOS)
    img.alpha_composite(glyph, ((side - box) // 2, (side - box) // 2))
    return img


MARKS = {"lens": lens, "github": octocat}


def build(url: str, out: str, mark: str) -> None:
    p = cv2.QRCodeEncoder_Params()
    p.correction_level = cv2.QRCodeEncoder_CORRECT_LEVEL_H
    m = cv2.QRCodeEncoder_create(p).encode(url)
    n = m.shape[0]

    padded = np.pad(m, QUIET, constant_values=255)
    scale = TARGET // padded.shape[0]
    big = np.kron(padded, np.ones((scale, scale), dtype=np.uint8))

    rgb = np.zeros((*big.shape, 3), dtype=np.uint8)
    rgb[big == 0] = INK
    rgb[big == 255] = PAPER
    img = Image.fromarray(rgb).convert("RGBA")
    w = img.size[0]

    # Square the knockout to the module grid so no edge cuts a module in half.
    patch = round(w * PATCH / scale) * scale
    x0 = (w - patch) // 2
    img.paste(Image.new("RGBA", (patch, patch), (*PAPER, 255)), (x0, x0))

    side = int(w * LOGO)
    img.alpha_composite(MARKS[mark](side), ((w - side) // 2, (w - side) // 2))

    check = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(check)
    if decoded != url:
        sys.exit(f"{out}: decoded to {decoded!r}, expected {url!r}. Not written.")

    img.convert("RGB").save(HERE / out, dpi=(300, 300))
    print(f"{out}: matrix {n}x{n} (v{(n - 17) // 4}), module {scale}px, image {w}px, decoded ok")


for url, out, mark in TARGETS:
    build(url, out, mark)
