# Landing hero media

The landing page plays a short ambient port film behind the hero. The clip is
generated externally and dropped into this directory; until it lands, the page
renders a token-derived branded background and the poster frame, so nothing
blocks on the media.

## Required files

- `ladinglens-port-loop.webm`
- `ladinglens-port-loop.mp4`
- `ladinglens-port-poster.webp`

## Approved generation prompt

> Create a seamless 8-10 second cinematic documentary-style background film
> for a B2B shipping-control web app. 16:9 landscape, 1920x1080 preferred.
> Dawn at a real modern container port: orderly container stacks, gantry
> cranes moving slowly, one cargo vessel alongside, subtle atmospheric haze,
> and restrained work lights. Use one continuous, stabilized camera move: a
> very slow lateral dolly from left to right with a slight forward push. Keep
> the left 42% of the frame calm, low-detail, and evenly exposed as negative
> space for live website text; concentrate cranes, containers, and vessel
> detail in the center-right. Palette: cool slate, steel blue, muted indigo,
> small teal signals, and sparse safety orange, natural rather than neon. The
> final frame must visually match the opening frame for a clean loop. No cuts,
> no zoom burst, no drone wobble, no dramatic storm, no people in unsafe
> areas, no accidents, no logos, no brand marks, no readable text, no
> numbers, no documents with legible writing, no UI overlays, no holograms,
> no futuristic interfaces, no AI imagery artifacts, no soundtrack.
> Photorealistic, credible logistics footage, calm and precise, with enough
> contrast for white or near-black HTML text after a soft gradient veil.

## Encoding

From the generator output (`source.mov` here), produce the three files:

```shell
ffmpeg -i source.mov -an -c:v libvpx-vp9 -b:v 0 -crf 34 -pix_fmt yuv420p \
  ladinglens-port-loop.webm
ffmpeg -i source.mov -an -c:v libx264 -crf 23 -preset slow \
  -movflags +faststart -pix_fmt yuv420p ladinglens-port-loop.mp4
ffmpeg -i ladinglens-port-loop.mp4 -frames:v 1 -c:v libwebp -quality 82 \
  ladinglens-port-poster.webp
```

Notes:

- The film plays muted, looped, and inline; strip audio (`-an`).
- `+faststart` moves the MP4 moov atom to the front so playback can start
  while the file streams.
- The poster is the first frame, so a refused or pending video shows the
  same picture.
- Do not commit the raw generator download. Commit only the three files
  above.
