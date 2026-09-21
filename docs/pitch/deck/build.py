"""Assemble ladinglens-deck.pdf from rendered slides, refusing blank pages.

    node apps/web/rgen.mjs docs/pitch/deck/ladinglens-deck.html <out>
    python docs/pitch/deck/build.py <out>

A CSS mistake can paint the whole deck a single colour while every layout
check still passes - deckcheck.mjs measures geometry, not paint. That shipped
once, and the only symptom was the PDF dropping from 3 MB to 187 KB. So the
last thing before the PDF exists is a look at the pixels: a slide whose
colours collapse to almost nothing is a render failure, not a design.
"""

import sys
from pathlib import Path

from PIL import Image

MIN_COLOURS = 2000  # a real slide runs to tens of thousands; black was 2
DPI = 144
OUT = Path(__file__).parent / "ladinglens-deck.pdf"


def main(folder: str) -> int:
    files = sorted(Path(folder).glob("slide-*.png"))
    if not files:
        sys.exit(f"no slide-*.png in {folder}")

    pages, blank = [], []
    for f in files:
        im = Image.open(f).convert("RGB")
        # getcolors returns None once an image passes maxcolors, so None is the
        # healthy answer here and a list means the slide is nearly one flat tone.
        counted = im.getcolors(maxcolors=MIN_COLOURS)
        if counted is not None:
            blank.append(f"{f.name}: only {len(counted)} distinct colours")
        pages.append(im)

    if blank:
        sys.exit("blank or near-blank renders, PDF not written:\n  " + "\n  ".join(blank))

    pages[0].save(
        OUT, save_all=True, append_images=pages[1:], resolution=DPI, quality=88, optimize=True
    )
    print(f"{OUT.name}: {len(pages)} pages, {OUT.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))
