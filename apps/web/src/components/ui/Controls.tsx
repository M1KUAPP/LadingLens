import { useId, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  ReactNode
} from 'react'
import {
  CalendarGlyph,
  ChevronDownGlyph,
  SearchGlyph,
  VerdictCheckGlyph,
  VerdictDashGlyph
} from './Icons'
import type { ButtonVariant, FieldKind } from './types'
import './controls.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}

type FieldProps = {
  id?: string
  label: string
  type?: FieldKind
  value?: string
  defaultValue?: string
  placeholder?: string
  helper?: string
  error?: string
  disabled?: boolean
  name?: string
  autoComplete?: string
  required?: boolean
  readOnly?: boolean
  expanded?: boolean
  controls?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onOpen?: () => void
}

type FieldControlProps = Omit<FieldProps, 'id' | 'label' | 'helper'> & {
  controlId: string
  labelId: string
  describedBy?: string
}

type FieldTriggerProps = FieldControlProps & {
  type: 'select' | 'date'
}

function FieldTrigger({
  controlId,
  labelId,
  describedBy,
  type,
  value,
  placeholder,
  error,
  disabled,
  expanded,
  controls,
  onOpen
}: FieldTriggerProps) {
  const valueId = `${controlId}-value`
  const triggerValue = value || placeholder || ''
  const isSelect = type === 'select'
  const TriggerGlyph = isSelect ? ChevronDownGlyph : CalendarGlyph

  return (
    <button
      type="button"
      id={controlId}
      className="field-trigger"
      role={isSelect ? 'combobox' : undefined}
      aria-labelledby={`${labelId} ${valueId}`}
      aria-haspopup={isSelect ? 'listbox' : 'dialog'}
      aria-expanded={expanded ?? false}
      aria-controls={controls}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onOpen}
    >
      <span
        id={valueId}
        className="field-trigger-value"
        data-empty={value ? undefined : 'true'}
      >
        {triggerValue}
      </span>
      <TriggerGlyph />
    </button>
  )
}

function TextFieldControl({
  controlId,
  describedBy,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  error,
  disabled,
  name,
  autoComplete,
  required,
  readOnly,
  onChange
}: FieldControlProps) {
  const inputValue = value === undefined ? { defaultValue } : { value }
  return (
    <>
      <input
        id={controlId}
        className="field-input"
        type={type}
        {...inputValue}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly ?? (value !== undefined && onChange === undefined)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={onChange}
      />
      {type === 'search' ? <SearchGlyph /> : null}
    </>
  )
}

function FieldControl(props: FieldControlProps) {
  if (props.type === 'select' || props.type === 'date') {
    return <FieldTrigger {...props} type={props.type} />
  }
  return <TextFieldControl {...props} />
}

function FieldMessages({
  helper,
  error,
  helperId,
  errorId
}: {
  helper?: string
  error?: string
  helperId: string
  errorId: string
}) {
  return (
    <>
      {helper ? (
        <p className="field-helper" id={helperId}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </>
  )
}

export function Field({
  id,
  label,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  helper,
  error,
  disabled,
  name,
  autoComplete,
  required,
  readOnly,
  expanded,
  controls,
  onChange,
  onOpen
}: FieldProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const labelId = `${controlId}-label`
  const helperId = `${controlId}-helper`
  const errorId = `${controlId}-error`
  const describedBy =
    [helper ? helperId : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className="field">
      <label className="field-label" id={labelId} htmlFor={controlId}>
        {label}
      </label>
      <div
        className="field-shell"
        data-invalid={error ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        <FieldControl
          controlId={controlId}
          labelId={labelId}
          describedBy={describedBy}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          error={error}
          disabled={disabled}
          name={name}
          autoComplete={autoComplete}
          required={required}
          readOnly={readOnly}
          expanded={expanded}
          controls={controls}
          onChange={onChange}
          onOpen={onOpen}
        />
      </div>
      <FieldMessages
        helper={helper}
        error={error}
        helperId={helperId}
        errorId={errorId}
      />
    </div>
  )
}

type CheckboxProps = {
  label: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}

type CheckboxState = 'checked' | 'unchecked' | 'indeterminate'

export function Checkbox({
  label,
  checked,
  defaultChecked,
  indeterminate,
  disabled,
  onCheckedChange
}: CheckboxProps) {
  const [internal, setInternal] = useState<CheckboxState>(
    indeterminate
      ? 'indeterminate'
      : defaultChecked
        ? 'checked'
        : 'unchecked'
  )
  const state: CheckboxState =
    checked !== undefined
      ? indeterminate
        ? 'indeterminate'
        : checked
          ? 'checked'
          : 'unchecked'
      : internal

  const toggle = () => {
    const next = state === 'checked' ? 'unchecked' : 'checked'
    if (checked === undefined) setInternal(next)
    onCheckedChange?.(next === 'checked')
  }

  return (
    <button
      type="button"
      role="checkbox"
      className="checkbox"
      aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
      disabled={disabled}
      onClick={toggle}
    >
      <span className="checkbox-box" aria-hidden="true">
        {state === 'indeterminate' ? (
          <VerdictDashGlyph size={12} />
        ) : state === 'checked' ? (
          <VerdictCheckGlyph size={12} />
        ) : null}
      </span>
      <span className="checkbox-label">{label}</span>
    </button>
  )
}
