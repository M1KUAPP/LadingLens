import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type SyntheticEvent
} from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import ChevronLeftIcon from '@hugeicons/core-free-icons/ChevronLeftIcon'
import ChevronRightIcon from '@hugeicons/core-free-icons/ChevronRightIcon'
import { Button } from './Controls'
import { VerdictCheckGlyph } from './Icons'
import './overlays.css'

export type MenuProps = {
  id?: string
  label: string
  triggerRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}

export type MenuItemProps = {
  value: string
  selected?: boolean
  disabled?: boolean
  onSelect?: (value: string) => void
  children: ReactNode
}

export function Menu({ id, label, triggerRef, onClose, children }: MenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const target =
      list?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
      list?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
    target?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = listRef.current
    if (!list) return
    const enabled = Array.from(
      list.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
    )
    const current = document.activeElement as HTMLElement | null
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const index = current ? enabled.indexOf(current) : -1
      enabled[(index + step + enabled.length) % enabled.length]?.focus()
    } else if (event.key === 'Enter') {
      if (current && enabled.includes(current)) {
        event.preventDefault()
        current.click()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      triggerRef.current?.focus()
    }
  }

  return (
    <div className="menu">
      <div ref={listRef} id={id} role="listbox" aria-label={label} onKeyDown={onKeyDown}>
        {children}
      </div>
    </div>
  )
}

export function MenuItem({
  value,
  selected = false,
  disabled = false,
  onSelect,
  children
}: MenuItemProps) {
  return (
    <div
      role="option"
      className="menu-item"
      tabIndex={-1}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : () => onSelect?.(value)}
    >
      <span className="menu-item-label">{children}</span>
      {selected && <VerdictCheckGlyph className="menu-item-check" />}
    </div>
  )
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseIso(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined
}

function sameDay(a: Date, b: Date) {
  return toIso(a) === toIso(b)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(date.getDate(), lastDay))
  return next
}

export type DatePickerProps = {
  value?: string
  onSelect: (iso: string) => void
  onClose: () => void
  triggerRef: RefObject<HTMLElement | null>
  label: string
}

export function DatePicker({ value, onSelect, onClose, triggerRef, label }: DatePickerProps) {
  const [cursor, setCursor] = useState<Date>(() => parseIso(value) ?? new Date())
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${toIso(cursor)}"]`)?.focus()
  }, [cursor])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: Date | undefined
    if (event.key === 'ArrowLeft') next = addDays(cursor, -1)
    else if (event.key === 'ArrowRight') next = addDays(cursor, 1)
    else if (event.key === 'ArrowUp') next = addDays(cursor, -7)
    else if (event.key === 'ArrowDown') next = addDays(cursor, 7)
    else if (event.key === 'PageUp') next = addMonths(cursor, event.shiftKey ? -12 : -1)
    else if (event.key === 'PageDown') next = addMonths(cursor, event.shiftKey ? 12 : 1)
    else if (event.key === 'Enter') {
      event.preventDefault()
      onSelect(toIso(cursor))
      return
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      triggerRef.current?.focus()
      return
    } else {
      return
    }
    event.preventDefault()
    setCursor(next)
  }

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadBlanks = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (Date | null)[] = Array.from(
    { length: leadBlanks + daysInMonth },
    (_, i) => (i < leadBlanks ? null : new Date(year, month, i - leadBlanks + 1))
  )
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const today = new Date()
  const selected = parseIso(value)
  const previousMonth = addMonths(cursor, -1)
  const nextMonth = addMonths(cursor, 1)

  return (
    <div className="date-picker">
      <div className="date-picker-head">
        <button
          type="button"
          className="date-picker-nav"
          aria-label={`Show ${MONTH_NAMES[previousMonth.getMonth()]} ${previousMonth.getFullYear()}`}
          onClick={() => setCursor(previousMonth)}
        >
          <HugeiconsIcon icon={ChevronLeftIcon} size={18} aria-hidden="true" />
        </button>
        <div className="date-picker-month type-data-sm" aria-live="polite">
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          type="button"
          className="date-picker-nav"
          aria-label={`Show ${MONTH_NAMES[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`}
          onClick={() => setCursor(nextMonth)}
        >
          <HugeiconsIcon icon={ChevronRightIcon} size={18} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        className="date-picker-grid"
        onKeyDown={onKeyDown}
      >
        <div role="row" className="date-picker-row">
          {WEEKDAY_NAMES.map((name) => (
            <span key={name} role="columnheader" className="date-picker-weekday type-label-sm">
              {name}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div role="row" className="date-picker-row" key={weekIndex}>
            {week.map((day, dayIndex) => (
              <div
                role="gridcell"
                className="date-picker-cell"
                key={dayIndex}
                aria-selected={
                  (day !== null && selected !== undefined && sameDay(day, selected)) || undefined
                }
              >
                {day !== null && (
                  <button
                    type="button"
                    className="date-picker-day type-data-sm"
                    data-date={toIso(day)}
                    tabIndex={sameDay(day, cursor) ? 0 : -1}
                    aria-label={`${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`}
                    aria-current={sameDay(day, today) ? 'date' : undefined}
                    onClick={() => onSelect(toIso(day))}
                  >
                    {day.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export type TooltipProps = {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <span
      className="tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="tooltip-trigger"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
      >
        <span className="tooltip-glyph" aria-hidden="true">
          i
        </span>
      </button>
      {open && (
        <span role="tooltip" id={id} className="tooltip-panel">
          {children}
        </span>
      )}
    </span>
  )
}

export type ConfirmDialogProps = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  // Always hold the latest onCancel/busy, so the native `close` listener
  // below (added once per open, not on every parent re-render) never acts
  // on a stale closure.
  const onCancelRef = useRef(onCancel)
  const busyRef = useRef(busy)
  useEffect(() => {
    onCancelRef.current = onCancel
    busyRef.current = busy
  })

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    }
    dialog.querySelector<HTMLButtonElement>('.confirm-dialog-cancel')?.focus()
    // Chromium's CloseWatcher anti-abuse rule lets a second Escape close the
    // dialog natively without a cancelable `cancel` event first (handleCancel
    // below never runs). Follow the DOM if that happens while `open` is
    // still true: call onCancel(), unless a reset is busy - closing must not
    // proceed then, so re-open the dialog instead and leave `open` (and
    // onCancel) alone, bringing the DOM back in line with React's state.
    const handleNativeClose = () => {
      // Under StrictMode, this effect's own cleanup below (elsewhere, or
      // from an earlier run) calls close(), which a real browser fires
      // `close` for only as a queued task - possibly after a later run has
      // already re-opened the dialog and registered a new listener. If
      // `dialog.open` is true again by the time this fires, it's that stale
      // event, not a real close; the DOM already matches `open`, so ignore
      // it.
      if (dialog.open) return
      if (busyRef.current) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal()
        } else {
          dialog.setAttribute('open', '')
        }
        return
      }
      onCancelRef.current()
    }
    dialog.addEventListener('close', handleNativeClose)
    return () => {
      // Stop listening before closing it ourselves below, so our own
      // programmatic close doesn't loop back into another onCancel() call.
      dialog.removeEventListener('close', handleNativeClose)
      if (!dialog.open) return
      if (typeof dialog.close === 'function') {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [open])

  if (!open) return null

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Escape fires a cancelable native `cancel` event; left unprevented, the
    // browser would close the dialog itself, letting the DOM's open state
    // diverge from the `open` prop React still thinks is true. That alone
    // doesn't guarantee they stay in sync - see the native `close` listener
    // above for the remaining gap.
    event.preventDefault()
    onCancel()
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={handleCancel}
    >
      <h2 id={titleId} className="confirm-dialog-title">
        {title}
      </h2>
      <div id={descId} className="confirm-dialog-body">
        {children}
      </div>
      <div className="confirm-dialog-actions">
        <Button variant="ghost" className="confirm-dialog-cancel" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="primary" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
