# Judge Upload UX Research

Primary-source findings for the public `/judge` live-comparison upload flow
(issue #39): an unauthenticated evaluator drops a synthetic Shipping
Instruction and draft Bill of Lading pair, watches honest live progress, and
reviews seven field verdicts with source evidence.

Contents:

1.  [File input and drop zone](#file-input-and-drop-zone)
1.  [The accept attribute is a hint](#the-accept-attribute-is-a-hint)
1.  [Announcing progress and errors](#announcing-progress-and-errors)
1.  [Avoiding a misleading loading state](#avoiding-a-misleading-loading-state)
1.  [Multipart upload with FormData and fetch](#multipart-upload-with-formdata-and-fetch)
1.  [Cancelling in-flight uploads](#cancelling-in-flight-uploads)
1.  [Downloading a server file](#downloading-a-server-file)
1.  [Implications for LadingLens](#implications-for-ladinglens)

## File input and drop zone

A drag-and-drop zone is a progressive enhancement over a native
`<input type="file">`; the input must stay operable alone, since drop
targets are not natively keyboard- or screen-reader-operable. MDN's own
tutorial keeps a real `<input>` behind the drop target so "we can
simultaneously drag into it and click on it," with both `dragover` and
`drop` calling `preventDefault()` (the browser's default action for a
dropped file is to open or download it, and `drop` only fires once
`dragover` is cancelled first), reading files from `DataTransfer.files` —
the same `File` objects a native `change` event delivers [MDN: File drag
and drop][mdn-dnd].

Hiding the native input behind a custom trigger must use `opacity: 0`, not
`display: none` or `visibility: hidden`: assistive technology treats the
latter two as "not interactive" and drops the control from the
accessibility tree [MDN: `<input type="file">`][mdn-file-input].

[mdn-dnd]: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
[mdn-file-input]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file

## The accept attribute is a hint

WHATWG HTML lists `accept` on `type=file` as a "Hint for expected file type
in file upload controls" in the `input` element's content-attributes table
[WHATWG HTML, input element][whatwg-input] — advisory, not a validation
boundary. MDN is explicit: "The accept attribute doesn't validate the types
of the selected files; it provides hints for browsers... It is still
possible... for users to toggle an option in the file chooser" to bypass
it, so `accept` "should... be backed up by appropriate server-side
validation" [MDN: `<input type="file">`][mdn-file-input]. A dropped file
never passes through the OS file-picker filter, so on the drop path
`accept` constrains nothing. Client-side checks, such as the existing
`DropZone` in `apps/web/src/components/ui/Domain.tsx`, are a UX
convenience; the API must independently revalidate type and size.

[whatwg-input]: https://html.spec.whatwg.org/multipage/input.html#attr-input-accept

## Announcing progress and errors

WCAG 2.2 SC 4.1.3 Status Messages requires that a status message — text
reporting "the success or results of an action, ... the waiting state of an
application, [or] the progress of a process" without moving focus — "can be
programmatically determined through role or properties" so assistive tech
announces it without interrupting the user [WCAG 2.2 Understanding
4.1.3][wcag-413]. Its technique split: `role="status"` (implicit
`aria-live="polite"`) for success/progress text, `role="alert"` (implicit
`aria-live="assertive"`) for errors, which MDN's live-region guide repeats,
adding that an assertive region already "interrupt[s] any announcement a
screen reader is currently making" [MDN: ARIA live regions][mdn-live].

Pairing `role="alert"` with an explicit `aria-live="polite"` on one element
is contradictory, not additive: the role alone already implies assertive
behavior, and MDN warns the combination "causes double speaking issues in
VoiceOver on iOS" [MDN: ARIA live regions][mdn-live]. The existing
`DropZone` rejection list (`Domain.tsx`, line 208) sets `role="alert"
aria-live="polite"` together on one `<ul>` — worth resolving to plain
`role="alert"` wherever `/judge` reuses it. Progress text belongs in a
separate `role="status"` region so each update replaces the last politely.

[wcag-413]: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
[mdn-live]: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions

## Avoiding a misleading loading state

`docs/DESIGN.md` ("States", line 374) already binds this project-wide:
"Loading states use `text/secondary` and `surface/sunken`; a skeleton must
never pre-draw a Status Pill in a way that could be mistaken for a result"
(repo source). This is a project decision, not an external standard, but it
composes with 4.1.3 above: a skeleton outlining a verdict shape is itself a
false status message. `/judge` progress must read as an honest state
machine — queued, uploading, processing, result-or-failure — with no
placeholder resembling a Match/Mismatch/Held pill.

## Multipart upload with FormData and fetch

Build the body with `FormData.append(name, file)` — a `File` satisfies the
`Blob` overload of `append()` — and pass the `FormData` instance directly as
`fetch`'s `body` [MDN: `FormData`][mdn-formdata]. MDN's warning is explicit:
when sending `FormData` as `multipart/form-data`, "do not explicitly set
the `Content-Type` header on the request. Doing so will prevent the browser
from being able to set the `Content-Type` header with the boundary
expression it will use to delimit form fields" [MDN: Using FormData
Objects][mdn-formdata-usage]. Concretely: omit `Content-Type` from
`fetch(url, { method: 'POST', body: formData })` and let the browser
generate `multipart/form-data; boundary=...`.

[mdn-formdata]: https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData
[mdn-formdata-usage]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects

## Cancelling in-flight uploads

`new AbortController()` exposes a `.signal` to pass as `fetch`'s `signal`
option; calling `.abort()` rejects the fetch's promise [MDN:
`AbortController`][mdn-abort]. The interface exposes only `signal` and
`abort()` — no reset — so a controller is single-use: create a fresh one
per abortable request rather than reusing one after `.abort()` has fired
[MDN: `AbortController`][mdn-abort]. `/judge` needs this for its retry
control (abort a stalled attempt before starting a fresh one, so two
responses can never race) and for cleanup on navigation away mid-upload.

[mdn-abort]: https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Downloading a server file

Two independent mechanisms exist, and the server one wins conflicts. An
anchor's `download` attribute "[c]auses the browser to treat the linked URL
as a download," but "only works for same-origin URLs, or the `blob:` and
`data:` schemes" [MDN: `<a>`][mdn-a]. The server-side equivalent is the
`Content-Disposition` response header, formally RFC 6266 ("Use of the
Content-Disposition Header Field in the Hypertext Transfer Protocol
(HTTP)"): `Content-Disposition: attachment; filename="..."` tells the
recipient to "prompt the user to save the response locally" [RFC
6266][rfc6266]. When both are present, "the header specifies a filename, it
takes priority over" the `download` attribute's own [MDN: `<a>`][mdn-a].

The API and web build share one Cloud Run origin (`docs/TRD.md`,
"Deployment, security, and observability"), so a same-origin `<a download>`
works today; `blob:` URLs stay exempt if that ever changes [MDN: `<a>`][mdn-a].

[mdn-a]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a
[rfc6266]: https://www.rfc-editor.org/rfc/rfc6266

## Implications for LadingLens

- Keep the native `<input type="file">` in the DOM and operable (hidden
  with `opacity: 0`, a real `change` handler) as an additive drop surface,
  matching `DropZone` in `Domain.tsx`; treat its extension/size checks as
  UX only, since `accept` and the drop path bypass any OS-level filter, so
  the API must revalidate independently.
- Use one `role="status" aria-live="polite"` region for progress text, and
  plain `role="alert"` (no extra `aria-live`) for rejections/failures; fix
  the `role="alert" aria-live="polite"` pairing already on `Domain.tsx`'s
  `drop-zone-rejections` list when `/judge` reuses it.
- Never render a skeleton shaped like a Status Pill or verdict glyph; show
  a neutral progress state per `docs/DESIGN.md` "States" until real.
- Build the upload body with `FormData` + `fetch` and do not set
  `Content-Type`; let the browser add the multipart boundary.
- Give every upload/retry call its own `AbortController` in component
  state, so retry can abort a stuck attempt first, and abort on unmount.
- Serve downloads with `Content-Disposition: attachment; filename="..."`
  from the API and a same-origin `<a download>` on the frontend; fall back
  to a `blob:` object URL only if a cross-origin source appears later.
- On provider failure, keep the failed upload and a working retry control
  visible, and render `PREPARED FALLBACK` as a separate, labelled block —
  never swap the failed live attempt's status to success (`docs/TRD.md`,
  "Failure contract", lines 662-668).
