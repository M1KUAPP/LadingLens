# Scroll-Scrubbed Video Research

Primary-source findings for the landing page's scroll-scrubbed hero, adapted
from the MotionSites "Vectrus Energy" prompt: a 500vh track whose sticky scene
scrubs a video from a WebCodecs frame bank, with a `video.currentTime`
fallback. Sources were read, and the prompt's clip measured, on 21–22
September 2026.

Contents:

1.  [mp4box.js](#mp4boxjs)
1.  [WebCodecs VideoDecoder](#webcodecs-videodecoder)
1.  [Canvas encoding and ImageBitmap](#canvas-encoding-and-imagebitmap)
1.  [The currentTime seeking fallback](#the-currenttime-seeking-fallback)
1.  [CSS for the sticky scene](#css-for-the-sticky-scene)
1.  [jsdom and Vitest](#jsdom-and-vitest)
1.  [Asset terms](#asset-terms)
1.  [Implications for LadingLens](#implications-for-ladinglens)
1.  [See also](#see-also)

## mp4box.js

**Versions.** On 21 September 2026 the registry's `latest` tag is 2.4.1
(19 June 2026) and a stale `next` tag points at 1.0.0 [npm: mp4box][npm].
The prompt's `^0.5.2` resolves to 0.5.4 (19 March 2025), the last 0.x on npm
[npm: mp4box][npm]. The TypeScript rewrite shipped as v0.6.0 on GitHub only
[mp4box.js v0.6.0][v060]; 1.0.0 made discarding `mdat` data the default
[mp4box.js v1.0.0][v100]; 2.0.0 removed `MP4BoxStream` and made `DataStream`
big-endian by default [mp4box.js v2.0.0][v200]. 2.4.0 could not be installed
because of broken import paths, fixed in 2.4.1 [mp4box.js changelog][changelog].

**Packaging.** 0.5.4 is a CommonJS script: `main` is `dist/mp4box.all.js`,
which assigns `exports.createFile`, `exports.DataStream` and the rest, with no
ESM build and no type declarations [mp4box 0.5.4 on npm][npm054]. 2.4.1 is
`"type": "module"` with an `exports` map (`import` to `.mjs`, `require` to
`.cjs`, types in `.d.mts`/`.d.cts`) and no runtime dependencies [npm:
mp4box][npm]. Its legacy `main` and `types` fields name files the tarball does
not contain, so only resolvers that read `exports` find it; the web app's
`moduleResolution: "bundler"` does. The README's form is
`import * as MP4Box from 'mp4box'` [mp4box.js README][readme].

We checked this locally: TypeScript 6.0.3 with `apps/web/tsconfig.app.json`'s
options type-checks a demuxer written against 2.4.1, Vite 8.3.0 builds it, and
a dynamic `import()` splits it into its own 181 kB (41 kB gzip) chunk. 0.5.4
also bundles under Vite 8 through CommonJS interop, but only with a
hand-written `.d.ts`, which is why the prompt asks for `mp4box.d.ts`.

**The W3C sample.** `demuxer_mp4.js` in the W3C WebCodecs samples, last
changed 27 October 2025, runs on a vendored build dated 19-03-2022, which is
0.5.2 [W3C sample: demuxer_mp4.js][w3c-demuxer] [W3C sample: vendored
mp4box][w3c-vendored]. Its flow [W3C sample: demuxer_mp4.js][w3c-demuxer]:

1.  `MP4Box.createFile()`, then each fetched chunk is copied into an
    `ArrayBuffer`, given `buffer.fileStart = offset`, and passed to
    `appendBuffer()`.
1.  `onReady(info)` builds `{codec, codedWidth, codedHeight, description}`
    from `info.videoTracks[0]`, then calls `setExtractionOptions(track.id)`
    and `start()`.
1.  The description is the `avcC` (or `hvcC`, `vpcC`, `av1C`) box written
    into `new DataStream(undefined, 0, DataStream.BIG_ENDIAN)` and returned as
    `new Uint8Array(stream.buffer, 8)`, which drops the 8-byte box header.
1.  `onSamples(id, user, samples)` wraps each sample as an `EncodedVideoChunk`
    with `type: sample.is_sync ? "key" : "delta"`,
    `timestamp: 1e6 * sample.cts / sample.timescale`, the same for `duration`,
    and `data: sample.data`.
1.  `flush()` runs at end of stream; the last commit added it to "Ensure
    samples are flushed after demuxing finishes".

`setExtractionOptions` takes `nbSamples`, default 1000 samples per `onSamples`
call; fewer are held until more data arrives [mp4box.js README][readme].

**What changed from 0.5.4 to 2.4.1**, read from both tarballs' code and the
2.4.1 source [mp4box.js createFile][createfile] [mp4box.js
ISOFile][isofile]:

| API                    | 0.5.4                                                            | 2.4.1                                                                                           |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Import                 | `require('mp4box')`, untyped                                     | Named ESM exports, typed                                                                        |
| `createFile()` default | Keeps `mdat` bytes                                               | `keepMdatData = false`; `setExtractionOptions` then warns "samples will not be extracted"       |
| Endianness             | `DataStream.BIG_ENDIAN` (the boolean `false`)                    | `Endianness.BIG_ENDIAN` (enum, `1`); `DataStream.BIG_ENDIAN` is `undefined`                     |
| `appendBuffer` input   | `ArrayBuffer` with `fileStart = 0`                               | Typed `MP4BoxBuffer`; `MP4BoxBuffer.fromArrayBuffer(buf, 0)` copies the bytes                   |
| Callbacks and control  | `onReady`, `onSamples`, `setExtractionOptions`, `start`, `flush` | Same names and arguments                                                                        |
| Sample fields          | `is_sync`, `cts`, `dts`, `duration`, `timescale`, `data`         | Same; `data` is `Uint8Array<ArrayBuffer>`; the README still shows `is_rap`                      |
| `avcC.write()` typing  | Untyped                                                          | Declared for `MultiBufferStream` only; a `DataStream` works at runtime after an upcast to `Box` |

**Measured on the Vectrus clip** with ffprobe 9.0.2 and both mp4box versions
under Node 26.9.0:

- Codec string `avc1.640028` (High profile, level 4.0), not `avc1.64002a`;
  the 54-byte `avcC` box yields a 46-byte description starting `01 64 00 28`.
- 1920x1080, 24 fps, 241 samples, 10.04 s, video only, 12,378,962 bytes,
  served with `access-control-allow-origin: *` and `accept-ranges: bytes`.
- Sync samples are numbers 0 and 168 only (0 s and 7 s), and ffprobe reports
  `has_b_frames=2`, so decode order differs from presentation order.
- One edit list entry with `media_time` 1024 in a 12,288 timescale: the first
  `cts` is 83.3 ms, while ffprobe and the `<video>` element start at 0.
- Box order is `ftyp`, `free`, `mdat`, `moov`: the index is at the end.
- With 2.4.1, `createFile()` fed 1 MiB chunks extracted 0 samples, because
  `mdat` was discarded before `moov` arrived; `createFile(true)` extracted 241.
  Fed as one buffer, both extracted all 241 during `appendBuffer`.

[npm]: https://www.npmjs.com/package/mp4box
[v060]: https://github.com/gpac/mp4box.js/releases/tag/v0.6.0
[v100]: https://github.com/gpac/mp4box.js/releases/tag/v1.0.0
[v200]: https://github.com/gpac/mp4box.js/releases/tag/v2.0.0
[changelog]: https://github.com/gpac/mp4box.js/blob/v2.4.1/CHANGELOG.md
[npm054]: https://www.npmjs.com/package/mp4box/v/0.5.4
[readme]: https://github.com/gpac/mp4box.js/blob/v2.4.1/README.md
[w3c-demuxer]: https://github.com/w3c/webcodecs/blob/fd0c13f496d853aa888bd8a6e1016103423a36a7/samples/video-decode-display/demuxer_mp4.js
[w3c-vendored]: https://github.com/w3c/webcodecs/commit/446d8314a52bd39d4626cb32155fe859cd6f64e2
[createfile]: https://github.com/gpac/mp4box.js/blob/v2.4.1/src/create-file.ts
[isofile]: https://github.com/gpac/mp4box.js/blob/v2.4.1/src/isofile.ts

## WebCodecs VideoDecoder

The W3C Working Draft of 14 September 2026 exposes `VideoDecoder` to windows
and dedicated workers in secure contexts only [WebCodecs:
VideoDecoder][wc-vd], so it is absent on a plain-HTTP LAN address.

**configure().** `VideoDecoderConfig` requires `codec`; `description` is
"codec specific bytes, commonly known as extradata"; `codedWidth` and
`codedHeight` must be given together, must not be 0, and are "used when
selecting a codec implementation"; `hardwareAcceleration` defaults to
`"no-preference"` [WebCodecs: VideoDecoderConfig][wc-config]. For H.264 the
codec string is `avc1.` plus the six hex digits of RFC 6381; a present
`description` is an `AVCDecoderConfigurationRecord` and marks the bitstream as
`avc` format, where a `key` chunk is expected to be an IDR picture [AVC
WebCodecs Registration][avc-reg]. `configure()` throws `TypeError` for an
invalid config and `InvalidStateError` when closed; an unsupported config is
reported later by closing the decoder with `NotSupportedError` [WebCodecs:
VideoDecoder methods][wc-methods].

**Hardware hints.** `prefer-hardware` and `prefer-software` are hints that
user agents "may ignore", and setting either "can significantly restrict what
configurations are supported"; the spec says most authors are best served by
`no-preference` and names "a fallback to software codecs if hardware
acceleration fails" as a common strategy [WebCodecs:
HardwareAcceleration][wc-hw].

**isConfigSupported(config)** resolves `{supported, config}`, where `config`
holds only the members the user agent recognised, and rejects with
`TypeError` for an invalid config [WebCodecs: VideoDecoder methods][wc-methods]
[MDN: isConfigSupported()][mdn-support]. It is necessary, not sufficient: a
Firefox bug open since 13 September 2024 reports `supported: true` for H.264
followed by "The given encoding is not supported" on Firefox 130 to 145
[Mozilla bug 1918769][bz1918769].

**Chunks.** `EncodedVideoChunk` carries `type` (`"key"` or `"delta"`) and a
`timestamp` and `duration` in microseconds [WebCodecs:
EncodedVideoChunk][wc-chunk]. `configure()` and `flush()` both set "key chunk
required", and `decode()` then throws `DataError` unless the chunk is a key
[WebCodecs: VideoDecoder methods][wc-methods].

**Backpressure.** `decodeQueueSize` counts pending decode requests and a
`dequeue` event fires when it decreases, coalesced so at most one is queued
[WebCodecs: VideoDecoder][wc-vd]. MDN notes it replaces a `setTimeout()` poll
[MDN: dequeue event][mdn-dequeue].

**flush()** makes the codec "emit all internal pending outputs" and resolves
once they are delivered [WebCodecs: VideoDecoder methods][wc-methods].

**Errors.** A decode failure closes the decoder with `EncodingError` and an
unsupported config with `NotSupportedError` [WebCodecs: VideoDecoder
methods][wc-methods]. Closing resets the decoder (rejecting pending `flush()`
promises and zeroing the queue), sets `state` to `"closed"`, releases the
codec, and calls the error callback unless the exception is `AbortError`;
"Close is final" [WebCodecs: VideoDecoder algorithms][wc-algos]. A user agent
may also reclaim an inactive codec (no progress for 10 seconds) or a
background one (document hidden) by closing it with `QuotaExceededError`, but
never an active foreground one [WebCodecs: Resource Reclamation][wc-reclaim].

**Frames.** "Authors are encouraged to call close() on output VideoFrames
immediately"; the decoder owns the resources, and waiting for garbage
collection "can cause decoding to stall" [WebCodecs: VideoDecoder
methods][wc-methods]. A `VideoFrame` is a `CanvasImageSource`, so
`drawImage(frame)` works directly [WebCodecs: VideoFrame][wc-frame].

**Measured** with Playwright 1.63.0 on an Apple M5 running macOS 27.0,
decoding the clip through mp4box 2.4.1:

| Check                                 | Chrome 153.0.8010.53 (stable, headless)                        | Playwright Chromium 153.0.8010.12 |
| ------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| `isConfigSupported`, no-preference    | true                                                           | true                              |
| `isConfigSupported`, prefer-hardware  | true                                                           | false                             |
| `isConfigSupported`, prefer-software  | true                                                           | true                              |
| Frames out before `flush()`           | 239 of 241 (NV12)                                              | 237 of 241 (I420)                 |
| Decode plus WebP encode of all frames | 3.0 s                                                          | 3.1 s                             |
| Delta chunk first after `configure()` | `DataError` thrown                                             | `DataError` thrown                |
| Codec `avc1.ffffff`                   | Error callback `NotSupportedError`, `state` already `"closed"` | Same                              |

Output timestamps ran from 83,333 to 10,083,333 µs in presentation order.

**Support**, from BCD 8.1.2 (17 September 2026) and vendor notes:

| Feature                             | Chrome, Edge | Firefox                  | Safari, iOS Safari |
| ----------------------------------- | ------------ | ------------------------ | ------------------ |
| `VideoDecoder`, `EncodedVideoChunk` | 94           | 130 desktop, not Android | 16.4               |
| `dequeue` event                     | 106          | 130                      | 16.4               |

Sources: [BCD: VideoDecoder][bcd-vd]; Chrome Platform Status lists WebCodecs
on by default in Chrome 94 on desktop and Android [Chrome Platform Status:
WebCodecs][chromestatus]; Firefox 130 shipped it "on desktop releases" with
Android in Nightly only [MDN: Firefox 130 for developers][fx130]; Safari 16.4
added "the video portion of Web Codecs API" [WebKit: Safari 16.4][webkit164].
BCD records no Safari notes for `VideoDecoder`, and web-features keeps
WebCodecs as a whole out of Baseline because Firefox for Android lacks it
[web-features: webcodecs][wf-webcodecs].

[wc-vd]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#videodecoder-interface
[wc-config]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#dictdef-videodecoderconfig
[avc-reg]: https://www.w3.org/TR/2026/DNOTE-webcodecs-avc-codec-registration-20260608/
[wc-methods]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#videodecoder-methods
[wc-hw]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#hardware-acceleration
[mdn-support]: https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/isConfigSupported_static
[bz1918769]: https://bugzilla.mozilla.org/show_bug.cgi?id=1918769
[wc-chunk]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#encodedvideochunk-interface
[mdn-dequeue]: https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder/dequeue_event
[wc-algos]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#videodecoder-algorithms
[wc-reclaim]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#resource-reclamation
[wc-frame]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#videoframe-interface
[bcd-vd]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/VideoDecoder.json
[chromestatus]: https://chromestatus.com/feature/5669293909868544
[fx130]: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/130
[webkit164]: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/
[wf-webcodecs]: https://github.com/web-platform-dx/web-features/blob/v3.39.0/features/webcodecs.yml.dist

## Canvas encoding and ImageBitmap

**Safari does not encode WebP; it silently returns PNG.** `toBlob()` copies
the canvas bitmap synchronously and encodes it in parallel [HTML:
toBlob()][html-toblob]. If the user agent does not support the requested
type, "it must create the file using the PNG format" [HTML: serialization of
the bitmap as a file][html-serialise]. BCD 8.1.2 lists no Safari or iOS Safari
version for WebP from `toBlob()`, `toDataURL()` or
`OffscreenCanvas.convertToBlob()`; Chrome encodes it from 50 and Firefox from
96 [BCD: HTMLCanvasElement][bcd-canvas] [BCD: OffscreenCanvas][bcd-offscreen].
JPEG from `toBlob()` works in Safari 11 and later [BCD:
HTMLCanvasElement][bcd-canvas]. The returned `Blob.type` shows which format
arrived. `OffscreenCanvas.convertToBlob()` exists in Chrome 69, Firefox 105
and Safari 16.4 [BCD: OffscreenCanvas][bcd-offscreen].

Measured in Chrome 153 on the clip at quality 0.82: the full WebP bank is
8.2 MB, 34 kB a frame; on the same 24 frames JPEG averaged 64 kB against WebP's
35 kB, and 10 PNG frames averaged 759 kB. A Safari bank that fell back to PNG
would be roughly 180 MB.

**ImageBitmap.** `createImageBitmap()` accepts a `Blob` and rejects when it
cannot build a bitmap [HTML: ImageBitmap][html-imagebitmap]; it ships in
Chrome 50, Firefox 42 and Safari 15, Baseline widely available since 11 June
2026 [BCD: createImageBitmap][bcd-cib] [web-features:
createimagebitmap][wf-cib]. An `ImageBitmap` is meant to paint "without undue
latency", which the spec equates with reads from GPU or system RAM rather than
disk [HTML: ImageBitmap][html-imagebitmap], so it holds decoded pixels: 1920 x
1080 x 4 bytes is 8,294,400 bytes (7.9 MiB) at 8-bit RGBA. An LRU of 24 is
about 199 MB, and all 241 frames would be 2.0 GB. `close()` sets the bitmap
detached and unsets its data [HTML: ImageBitmap][html-imagebitmap] (Chrome
52, Firefox 46, Safari 15 [BCD: ImageBitmap][bcd-imagebitmap]), and drawing a
detached bitmap throws `InvalidStateError` [HTML: check the usability of the
image argument][html-usable]. Measured in Chrome 153, `createImageBitmap()` on
a 1080p WebP frame averaged 4.7 ms, and a closed bitmap reports 0 x 0.

[html-toblob]: https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob
[html-serialise]: https://html.spec.whatwg.org/multipage/canvas.html#a-serialisation-of-the-bitmap-as-a-file
[bcd-canvas]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/HTMLCanvasElement.json
[bcd-offscreen]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/OffscreenCanvas.json
[html-imagebitmap]: https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#the-imagebitmap-interface
[bcd-cib]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/_globals/createImageBitmap.json
[wf-cib]: https://github.com/web-platform-dx/web-features/blob/v3.39.0/features/createimagebitmap.yml.dist
[bcd-imagebitmap]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/ImageBitmap.json
[html-usable]: https://html.spec.whatwg.org/multipage/canvas.html#check-the-usability-of-the-image-argument

## The currentTime seeking fallback

A seek aborts any seek already running, then waits "until it has decoded
enough data to play back that position" before `seeking` turns false and
`seeked` fires [HTML: seeking][html-seeking]. Only `fastSeek()` sets the
approximate-for-speed flag, whose example is snapping "to a nearby key frame,
so that it doesn't have to spend time decoding then discarding intermediate
frames" [HTML: seeking][html-seeking]. A key chunk is one that "does not
depend on any other frames for decoding" [WebCodecs: key chunk][wc-key], so
reaching 6.9 s in this clip means decoding from the 0 s keyframe. `fastSeek()`
exists in Firefox 31 and Safari 8, never in Chrome or Edge [BCD:
HTMLMediaElement][bcd-media], and it trades precision for speed [MDN:
fastSeek()][mdn-fastseek].

Measured in Chrome 153, time from setting `currentTime` to `seeked`:

| File                              | Size    | Just after a keyframe | Just before 7 s     | 40 writes, 16 ms apart |
| --------------------------------- | ------- | --------------------- | ------------------- | ---------------------- |
| Vectrus original (keys at 0, 7 s) | 12.4 MB | 6.5 ms at 7.1 s       | 134–137 ms at 6.9 s | 8 `seeked` events      |
| Re-encode, 12-frame GOP, no B     | 6.4 MB  | 4.3 ms                | 4.2 ms              | 40                     |
| Re-encode, every frame a key      | 15.2 MB | 5.3 ms                | 5.9 ms              | 40                     |

Playwright's software-decoding Chromium took 304 ms for the 6.9 s seek on the
original. The re-encodes were local tests only (libx264, CRF 20).

[html-seeking]: https://html.spec.whatwg.org/multipage/media.html#seeking
[wc-key]: https://www.w3.org/TR/2026/WD-webcodecs-20260914/#key-chunk
[bcd-media]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/api/HTMLMediaElement.json
[mdn-fastseek]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/fastSeek

## CSS for the sticky scene

**object-fit on canvas.** `object-fit` applies to replaced elements [CSS
Images 3: object-fit][css-fit], and a `canvas` that represents embedded
content "is expected to be treated as a replaced element" [HTML: embedded
content rendering][html-embedded], with natural dimensions equal to its
bitmap's [HTML: the canvas element][html-canvas]. So
`<canvas width=1920 height=1080>` covers like a 16:9 image. WPT has
canvas-specific `object-fit` reftests [WPT: object-fit-cover-png-001c][wpt-fit],
and BCD's only caveat is legacy Edge 16–18 supporting `<img>` alone [BCD:
object-fit][bcd-fit].

**:has()** is Baseline widely available since 19 June 2026 (newly available
19 December 2023; Chrome 105, Firefox 121, Safari 15.4) [web-features:
has][wf-has].

**scroll-behavior.** A scroll with behavior `auto` is smooth when the
element's `scroll-behavior` is `smooth`, and `instant` is always instant
[CSSOM View: scrolling][cssom-scroll]. The property covers navigation, scroll
APIs and non-user snapping; "scrolls... performed by the user, are not
affected"; on the root it applies to the viewport, and `body`'s value is not
propagated [CSS Overflow 3: smooth scrolling][overflow-sb]. On reduced motion
the spec says only "User agents should follow platform conventions" and "may
ignore this property" [CSS Overflow 3: smooth scrolling][overflow-sb]. Firefox
treats scripted smooth scrolls as instant when smooth scrolling is off (112)
and turns it off when the OS asks for reduced motion (114) [Mozilla bug
1743045][bz1743045] [Mozilla bug 1753565][bz1753565]; we found no equivalent
Chrome or Safari statement. The app calls `window.scrollTo(0, 0)` on every
route change (`apps/web/src/App.tsx`), which a global `smooth` would animate.

**Sticky and overflow.** A sticky box is offset "in reference to the nearest
ancestor scroll container's scrollport" [CSS Position 3: sticky][sticky].
`hidden` still makes a scroll container; `clip` does not [CSS Overflow 3:
overflow][overflow-values]. `visible` computes to `auto` when the other axis
is scrollable, and `body`'s overflow moves to the viewport only while `html`'s
is `visible` in both axes [CSS Overflow 3: overflow][overflow-values] [CSS
Overflow 3: viewport propagation][overflow-prop]. So `overflow` on any
ancestor of the sticky scene, or on `html` alongside the prompt's
`body { overflow-x: hidden }`, pins the scene to a box that never scrolls. The
scene's own `overflow: hidden` is harmless. `overflow: clip` is Baseline
widely available since 12 March 2025 [web-features: overflow-clip][wf-clip].

[css-fit]: https://www.w3.org/TR/css-images-3/#the-object-fit
[html-embedded]: https://html.spec.whatwg.org/multipage/rendering.html#embedded-content-rendering-rules
[html-canvas]: https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element
[wpt-fit]: https://github.com/web-platform-tests/wpt/blob/master/css/css-images/object-fit-cover-png-001c.html
[bcd-fit]: https://github.com/mdn/browser-compat-data/blob/v8.1.2/css/properties/object-fit.json
[wf-has]: https://github.com/web-platform-dx/web-features/blob/v3.39.0/features/has.yml.dist
[cssom-scroll]: https://www.w3.org/TR/cssom-view-1/#perform-a-scroll
[overflow-sb]: https://www.w3.org/TR/css-overflow-3/#smooth-scrolling
[bz1743045]: https://bugzilla.mozilla.org/show_bug.cgi?id=1743045
[bz1753565]: https://bugzilla.mozilla.org/show_bug.cgi?id=1753565
[sticky]: https://www.w3.org/TR/css-position-3/#stickypos-insets
[overflow-values]: https://www.w3.org/TR/css-overflow-3/#overflow-control
[overflow-prop]: https://www.w3.org/TR/css-overflow-3/#overflow-propagation
[wf-clip]: https://github.com/web-platform-dx/web-features/blob/v3.39.0/features/overflow-clip.yml.dist

## jsdom and Vitest

The app tests on Vitest 5.0.1 with jsdom 30.1.0 (`apps/web/package.json`).

- **requestAnimationFrame** exists only with `pretendToBeVisual: true`, which
  also makes `document.hidden` false [jsdom README: visual
  browser][jsdom-visual]; jsdom then runs callbacks from a 60 Hz `setInterval`
  [jsdom: Window.js][jsdom-window]. Vitest's jsdom environment defaults
  `pretendToBeVisual` to `true` [Vitest: jsdom environment][vitest-jsdom].
- **HTMLMediaElement**: `load()`, `play()` and `pause()` are "not
  implemented"; `currentTime` is a plain field, `seeking` stays false,
  `readyState` is 0 and `duration` is `NaN` [jsdom:
  HTMLMediaElement-impl.js][jsdom-media].
- **Canvas**: without the `canvas` package, `getContext()` returns `null` and
  `toBlob()` never calls back, each reporting "not implemented" [jsdom:
  HTMLCanvasElement-impl.js][jsdom-canvas] [jsdom README: canvas
  support][jsdom-canvas-readme]; `apps/web` does not install it. Those
  reports go to the Node console by default [jsdom README: virtual
  consoles][jsdom-console].
- **Absent**, checked against jsdom 30.1.0 directly: `VideoDecoder`,
  `EncodedVideoChunk`, `VideoFrame`, `createImageBitmap`, `ImageBitmap`,
  `OffscreenCanvas`, `fastSeek` and `matchMedia` (which `src/test/setup.ts`
  stubs). jsdom has no `fetch`, so tests see Node's real one.
- **Layout** is not implemented and many layout properties return zero [jsdom
  README: unimplemented parts][jsdom-unimpl]: `offsetHeight` is 0 against an
  `innerHeight` of 768.

[jsdom-visual]: https://github.com/jsdom/jsdom/blob/v30.1.0/README.md#pretending-to-be-a-visual-browser
[jsdom-window]: https://github.com/jsdom/jsdom/blob/v30.1.0/lib/jsdom/browser/Window.js#L605
[vitest-jsdom]: https://github.com/vitest-dev/vitest/blob/v5.0.1/packages/vitest/src/integrations/env/jsdom.ts
[jsdom-media]: https://github.com/jsdom/jsdom/blob/v30.1.0/lib/jsdom/living/nodes/HTMLMediaElement-impl.js
[jsdom-canvas]: https://github.com/jsdom/jsdom/blob/v30.1.0/lib/jsdom/living/nodes/HTMLCanvasElement-impl.js
[jsdom-canvas-readme]: https://github.com/jsdom/jsdom/blob/v30.1.0/README.md#canvas-support
[jsdom-console]: https://github.com/jsdom/jsdom/blob/v30.1.0/README.md#virtual-consoles
[jsdom-unimpl]: https://github.com/jsdom/jsdom/blob/v30.1.0/README.md#unimplemented-parts-of-the-web-platform

## Asset terms

**MotionSites publishes no terms or licence.** On 21 September 2026 the
site's public JavaScript registered no terms, privacy, licence or FAQ route,
and its footer reads "© Motionsites AI 2026. All rights reserved"
[MotionSites][ms]. The only usage statement is a bullet on the paid plans
($239 and $399 lifetime, $149 and $279 a year): "For personal & client work"
[MotionSites: pricing][ms-pricing]. Nothing covers free prompts, which is how
we read Vectrus Energy, nor the CloudFront-hosted clips or the fonts the
prompts load. We found no explicit grant to use the Vectrus clip on a
production site.

**The font is Linotype's, licensed for one workstation.** The prompt's CSS
from `db.onlinewebfonts.com` carries a comment claiming "Web Fonts is licensed
by CC BY 4.0" [OnlineWebFonts: font CSS][owf-css]. The TrueType file it serves
names Linotype GmbH as manufacturer, is "copyrighted © 2009 Linotype Corp.",
and embeds this licence notice: "your use of this font software is limited to
your workstation for your own use. You may not copy or distribute this font
software" [OnlineWebFonts: Helvetica Neue ME][owf-page]. OnlineWebFonts' own
page for the font shows the same notice [OnlineWebFonts: Helvetica Neue
ME][owf-page]. The notice's `linotype.com/license` link now redirects (301)
to `myfonts.com`. Monotype separates desktop licences, for installing a font
on a computer, from web font licences that "enable you to embed that font in
the code for a website" [Monotype: font licensing explained][monotype]
[Monotype Fonts Help Center: licensing][monotype-help]. We found no grant
covering web embedding of this file.

[ms]: https://motionsites.ai/
[ms-pricing]: https://motionsites.ai/unlimited
[owf-css]: https://db.onlinewebfonts.com/c/95cecf452d3208890088a5b4c19c7ecf?family=Helvetica+Neue+ME
[owf-page]: https://www.onlinewebfonts.com/download/95cecf452d3208890088a5b4c19c7ecf
[monotype]: https://www.monotype.com/font-licensing-explained-designers-and-brands
[monotype-help]: https://support.monotype.com/en/articles/7872341-licensing

## Implications for LadingLens

1.  **Ship neither Vectrus asset.** Build the scene from our own footage via
    the [video pipeline](/docs/research/design/video-pipeline.md) and set
    type in Archivo, already a dependency under OFL-1.1. Keep the prompt as a
    technique reference, as [MotionSites](/docs/research/design/motionsites.md)
    already advises.
1.  **Encode our clip for scrubbing:** a GOP of about 12 frames, `-bf 0` and
    `-movflags +faststart`. In Chrome that alone brought every seek under
    8 ms, removed the 83 ms edit-list offset and moved the index to the
    front, which makes the frame bank an enhancement, not a requirement.
1.  **Use mp4box 2.4.1 or later, never 2.4.0**, loaded with
    `await import('mp4box')` after feature detection. Import
    `{ createFile, DataStream, Endianness, MP4BoxBuffer }` as values and
    `type { Box, ISOFile, Movie, Sample, VisualSampleEntry }` as types, since
    `verbatimModuleSyntax` is on. Drop the hand-written `mp4box.d.ts`.
1.  **Demux with `createFile(true)`**,
    `appendBuffer(MP4BoxBuffer.fromArrayBuffer(buf, 0))`, then `flush()`.
    Build the description with
    `new DataStream(undefined, 0, Endianness.BIG_ENDIAN)`, write the box
    through a `Box` upcast, and slice 8 bytes. Drop the `ISOFile` and fetched
    buffer once the bank is built.
1.  **Normalise timestamps** by subtracting the first presented frame's
    timestamp, so the bank and `video.currentTime` share one timeline.
1.  **Feature-detect before any fetch:** `typeof VideoDecoder === 'function'`,
    `typeof createImageBitmap === 'function'`, no reduced motion, then
    `VideoDecoder.isConfigSupported()` with `no-preference`. This one gate
    keeps jsdom, insecure origins, Firefox for Android and old Safari on the
    fallback, and stops tests fetching the clip through Node's real `fetch`.
1.  **Decode defensively.** Skip samples until the first `is_sync`, throttle
    on `decodeQueueSize` and pending encodes, `close()` every `VideoFrame`
    right after `drawImage()` and `toBlob()`, and `await flush()`. On any
    error callback the decoder is closed: build a new one once with
    `prefer-software` if `isConfigSupported` allows it, otherwise revert. Treat
    `QuotaExceededError` the same way, since a hidden tab can lose its codec.
1.  **Check the first blob's type.** If `toBlob(..., 'image/webp', 0.82)`
    returns anything but `image/webp`, re-encode that frame and the rest as
    `image/jpeg` at 0.82. Never keep all frames as `ImageBitmap`s: that is
    2 GB at 1080p.
1.  **Shrink the LRU to 8** and `close()` on eviction. The warm window
    `i-1..i+2` needs 4, a miss costs about 5 ms, and 24 bitmaps is 199 MB. If
    a bitmap resolves after its slot was evicted, close it at once, and never
    evict the one being drawn.
1.  **Keep the fallback cheap:** write `currentTime` only when `seeking` is
    false and `duration > 0`, which also makes it inert in jsdom.
1.  **Do not add a global `html { scroll-behavior: smooth }`.** User
    scrolling ignores it, and it would animate the route-change
    `scrollTo(0, 0)`. Pass `behavior` explicitly, gated on
    `prefers-reduced-motion`. Under reduced motion show a still frame, as
    `HeroFilm` already shows its poster.
1.  **Protect the sticky scene:** no `overflow` other than `visible` or
    `clip` on any ancestor, and never `overflow` on `html` beside `body`'s.
    Compute progress from the track's `getBoundingClientRect()` and return 0
    when the scroll span is not positive, which is jsdom's case.
1.  **Guard tests:** cancel the `requestAnimationFrame` loop on unmount (it
    runs at 60 Hz under Vitest), call `getContext()` only once the bank is
    live, and treat `null` as no canvas. Start the bank when
    `document.readyState === 'complete'`, or on `load`, because route changes
    mount the page after `load` has fired [MDN: Document.readyState][readystate].

[readystate]: https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState

## See also

- [MotionSites](/docs/research/design/motionsites.md), the scroll-scrub
  lesson this prompt extends.
- [Landing video pipeline](/docs/research/design/video-pipeline.md), for
  generating and encoding our own clip.
- [W3C WebCodecs samples](https://github.com/w3c/webcodecs/tree/main/samples)
- [Markdown style guide](/docs/references/markdown-style.md)
