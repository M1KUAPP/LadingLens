# Reset All UX Research

Primary-source findings for the `/settings` Reset All control (issue #40):
an explicit confirmation step that restores seed data, clears browser demo
state, invalidates in-flight requests, and reports failure honestly.

Contents:

1.  [Confirmation dialog pattern](#confirmation-dialog-pattern)
1.  [Focus management and the least-destructive default](#focus-management-and-the-least-destructive-default)
1.  [Native dialog and showModal semantics](#native-dialog-and-showmodal-semantics)
1.  [Clearing sessionStorage and localStorage](#clearing-sessionstorage-and-localstorage)
1.  [Invalidating in-flight requests](#invalidating-in-flight-requests)
1.  [Resetting React state with a key](#resetting-react-state-with-a-key)
1.  [Implications for LadingLens](#implications-for-ladinglens)

## Confirmation dialog pattern

WAI-ARIA APG's alertdialog pattern is "a modal dialog that interrupts the
user's workflow to communicate an important message and acquire a
response" [WAI-ARIA APG: Alert and Message Dialogs][apg-alertdialog] —
exactly Reset All's shape: explain what will be lost, then require an
explicit choice. `alertdialog` lets assistive technologies "distinguish
alert dialogs from other dialogs," including a possible system alert sound,
and structurally needs `role="alertdialog"`, `aria-modal="true"`, an
`aria-labelledby` on the visible title, and `aria-describedby` on the
explanatory message [WAI-ARIA APG: Alert and Message
Dialogs][apg-alertdialog]; keyboard interaction defers to the plain modal
dialog pattern [WAI-ARIA APG: Alert and Message Dialogs][apg-alertdialog].

The modal-dialog page adds that `role`/`aria-modal` alone are not enough:
mark a dialog modal "only if... application logic ensures that interaction
is limited to the dialog" and "visual styling ensures the perception... of
a modal dialog," or assistive-technology users face "severe negative
ramifications" [WAI-ARIA APG: Dialog (Modal)][apg-dialog].

[apg-alertdialog]: https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
[apg-dialog]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

## Focus management and the least-destructive default

Three normative behaviors from the modal dialog pattern [WAI-ARIA APG:
Dialog (Modal)][apg-dialog]:

1.  On open, "focus moves to an element inside the dialog" — never left on
    the trigger, never lost to `<body>`.
1.  `Tab`/`Shift+Tab` never leave the dialog: it cycles last-to-first and
    first-to-last.
1.  On close, "focus returns to the element that invoked the dialog" unless
    it is gone or the flow calls for somewhere else.

For where initial focus should land, the guidance answers this task
directly: "If a dialog contains the final step in a process that is not
easily reversible... it may be advisable to set focus on the least
destructive action" [WAI-ARIA APG: Dialog (Modal)][apg-dialog]. For Reset
All that is Cancel, not the destructive Reset/Confirm button — a stray
`Enter` while the dialog is opening must never perform the reset. `Escape`
closing the dialog (below) is equivalent to Cancel and should share its
handler.

## Native dialog and showModal semantics

`HTMLDialogElement.showModal()` renders the dialog "in the top layer, along
with a `::backdrop` pseudo-element," and makes everything else in the
document `inert`, "as if the `inert` attribute is specified" [MDN:
`HTMLDialogElement.showModal()`][mdn-showmodal] — background inertness and
stacking come free, with no manual focus trap or `aria-hidden` sweep
needed. `.show()` opens the same element non-modally, and calling
`.showModal()` on a dialog already opened with `.show()` throws
`InvalidStateError` [MDN: `HTMLDialogElement.showModal()`][mdn-showmodal].

Escape on an open modal dialog fires a cancelable `cancel` event; if not
prevented, the user agent closes the dialog and a `close` event follows
[WHATWG HTML, the dialog element][whatwg-dialog]. The `autofocus` attribute
places initial focus explicitly and is the documented way to target the
least-destructive control: "It is recommended to add `autofocus` to the
close button inside the dialog, or the dialog itself if the user is
expected to click/activate it to dismiss" [MDN: `<dialog>`][mdn-dialog].

[mdn-showmodal]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
[whatwg-dialog]: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
[mdn-dialog]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog

## Clearing sessionStorage and localStorage

The two APIs differ in scope, not only lifetime. `sessionStorage` "is
partitioned by both origin and browser tabs"; a page session "is accessible
only in that particular tab," a new tab gets a fresh store even for the
same origin, and closing the tab "clears the data" [MDN:
`Window.sessionStorage`][mdn-session]. `localStorage` "is partitioned by
origin only" and "has no expiration time" [MDN:
`Window.localStorage`][mdn-local]. `Storage.removeItem(key)` "will remove
that key," and `Storage.clear()` "will empty all keys" [MDN:
`Storage`][mdn-storage] — `clear()` is origin-wide, so on `localStorage` it
would remove any non-LadingLens data sharing that origin; named-key
`removeItem` calls are safer than a blanket `clear()`.

Changing storage does not self-notify: the `storage` event "is not fired on
the window that made the change," only on other same-origin contexts [MDN:
`Window: storage event`][mdn-storage-event], so a reset must update the
current tab's UI directly rather than rely on the event.

In this repo, `guest-session.ts` stores the guest id under
`sessionStorage['ladinglens-guest-session']` (line 6), and `theme.ts`
stores the theme under `localStorage['ladinglens-theme']` (line 3), both
wrapped in `try/catch` since either API can throw when restricted.

[mdn-session]: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
[mdn-local]: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
[mdn-storage]: https://developer.mozilla.org/en-US/docs/Web/API/Storage
[mdn-storage-event]: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event

## Invalidating in-flight requests

Same mechanism as the judge upload flow: a `fetch` cancels when the
`AbortController` whose `.signal` it was given calls `.abort()` [MDN:
`AbortController`][mdn-abort]. It exposes no reset, so "invalidate
in-flight requests" means abort every controller issued since the last
reset, then issue new ones. A practical shape: keep the active
controller(s) in a ref or module scope that every fetch reads its signal
from; Reset All aborts the current one(s) and replaces them before the
seeded-workspace refetch begins, so a slow pre-reset response can never
overwrite the just-reset UI.

[mdn-abort]: https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Resetting React state with a key

react.dev's own framing: React "uses... position in the tree" to match a
component instance across renders; an explicit `key` makes React "use the
`key` itself as part of the position," so two elements rendered in the
same place with different keys "never share state" [react.dev: Preserving
and Resetting State][react-key]. Changing a `key` unmounts the old
instance, discarding its state, and mounts a fresh one. The docs' own
example forces a subtree reset by keying a chat pane on the selected
contact's id (`<Chat key={to.id} ... />`), so switching contacts clears the
draft instead of leaking it [react.dev: Preserving and Resetting
State][react-key].

[react-key]: https://react.dev/learn/preserving-and-resetting-state

## Implications for LadingLens

- Build the confirmation as `role="alertdialog"` inside a native `<dialog>`
  opened with `.showModal()`, `aria-labelledby`/`aria-describedby` wired to
  the title and plain-language explanation, and `autofocus` on Cancel (not
  the destructive Reset/Confirm button) per the least-destructive-action
  guidance; let `Escape` and Cancel share one close path.
- On confirm: `.abort()` the in-flight `AbortController`(s), call the reset
  endpoint, then issue a fresh controller for reloading seed data — never
  let a pre-reset response land after the reset completes.
- Clear only LadingLens's own keys with `Storage.removeItem` (theme,
  filters, selection, dismissed hints in `localStorage`); avoid a blanket
  `localStorage.clear()`, which would erase anything else on the origin.
- Keep `sessionStorage['ladinglens-guest-session']` intact and reset the
  workspace data server-side for that guest id — the issue scopes reset
  "to the current guest session," not to ending it, so do not call
  `clearGuestSession()` or force re-entry through `/auth`.
- After a successful reset, remount the data-bearing views with a changed
  `key` (a reset counter or timestamp) instead of `location.reload()`,
  satisfying "without a manual-reload workaround" with provably clean state.
- On reset failure, surface it in the dialog itself (or an adjacent
  `role="alert"`) and leave the pre-reset state visibly unchanged — never
  claim success optimistically, matching "reports failure honestly."
