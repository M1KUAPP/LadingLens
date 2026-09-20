import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
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
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div className="select" ref={wrapRef}>
      <Field
        type="select"
        label={label}
        value={selected?.label ?? ''}
        expanded={open}
        controls={menuId}
        onOpen={() => setOpen((current) => !current)}
      />
      {open && (
        <div id={menuId}>
          <Menu
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
        </div>
      )}
    </div>
  )
}
