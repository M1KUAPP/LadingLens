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

The current generator output pans continuously, so its first and last frames do
not match. The encoding commands below trim the final tenth of a second, then
dissolve the last second into a held opening frame. This makes the browser loop
return to the true opening frame without a hard cut.

From the generator output (`source.mp4` here), produce the three files:

```shell
ffmpeg -i source.mp4 -filter_complex \
  "[0:v]trim=duration=9.9,setpts=PTS-STARTPTS[base]; \
  [0:v]trim=start_frame=0:end_frame=1,loop=loop=-1:size=1:start=0, \
  trim=duration=1.1,setpts=PTS-STARTPTS[start]; \
  [base][start]xfade=transition=fade:duration=1:offset=8.9, \
  format=yuv420p[v]" -map "[v]" -an -c:v libvpx-vp9 -b:v 0 -crf 34 \
  -pix_fmt yuv420p ladinglens-port-loop.webm
ffmpeg -i source.mp4 -filter_complex \
  "[0:v]trim=duration=9.9,setpts=PTS-STARTPTS[base]; \
  [0:v]trim=start_frame=0:end_frame=1,loop=loop=-1:size=1:start=0, \
  trim=duration=1.1,setpts=PTS-STARTPTS[start]; \
  [base][start]xfade=transition=fade:duration=1:offset=8.9, \
  format=yuv420p[v]" -map "[v]" -an -c:v libx264 -crf 23 -preset slow \
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
