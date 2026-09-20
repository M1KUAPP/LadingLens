import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, RefObject } from 'react'
import { Field } from './Controls'
import { Menu, MenuItem } from './Overlays'
import './select.css'

export type SelectOption = {
  value: string
  label: string
}

export function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const triggerRef: RefObject<HTMLElement | null> = {
    get current() {
      return (
        wrapRef.current?.querySelector<HTMLElement>('.field-trigger') ?? null
      )
    }
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onFocusOut(event: globalThis.FocusEvent) {
      if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    const wrap = wrapRef.current
    wrap?.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      wrap?.removeEventListener('focusout', onFocusOut)
    }
  }, [open])

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (open && event.key === 'Tab') {
      setOpen(false)
    }
  }

  const selected = options.find((option) => option.value === value)

  return (
    <div
      className="select"
      ref={wrapRef}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <Field
        type="select"
        label={label}
        value={selected?.label ?? ''}
        expanded={open}
        controls={menuId}
        onOpen={() => setOpen((current) => !current)}
      />
      {open && (
        <Menu
          id={menuId}
          label={label}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
        >
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              selected={option.value === value}
              onSelect={(next) => {
                onChange(next)
                setOpen(false)
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  )
}
