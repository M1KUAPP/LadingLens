import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon'
import Calendar01Icon from '@hugeicons/core-free-icons/Calendar01Icon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import type { ReactNode, SVGProps } from 'react'

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & {
  size?: number
}

function Hugeicon({
  icon,
  size = 20,
  ...rest
}: GlyphProps & { icon: IconSvgElement }) {
  return <HugeiconsIcon icon={icon} size={size} aria-hidden="true" {...rest} />
}

export function SearchGlyph(props: GlyphProps) {
  return <Hugeicon icon={Search01Icon} {...props} />
}

export function ChevronDownGlyph(props: GlyphProps) {
  return <Hugeicon icon={ArrowDown01Icon} {...props} />
}

export function CalendarGlyph(props: GlyphProps) {
  return <Hugeicon icon={Calendar01Icon} {...props} />
}

function VerdictGlyph({
  size = 16,
  children,
  ...rest
}: GlyphProps & { children: ReactNode }) {
  const labelled =
    rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    >
      {children}
    </svg>
  )
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

export function VerdictCheckGlyph(props: GlyphProps) {
  return (
    <VerdictGlyph {...props}>
      <path d="M3.5 8.5l3 3 6-7" {...stroke} />
    </VerdictGlyph>
  )
}

export function VerdictCrossGlyph(props: GlyphProps) {
  return (
    <VerdictGlyph {...props}>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" {...stroke} />
    </VerdictGlyph>
  )
}

export function VerdictHoldGlyph(props: GlyphProps) {
  return (
    <VerdictGlyph {...props}>
      <path d="M6 4.5v7M10 4.5v7" {...stroke} />
    </VerdictGlyph>
  )
}

export function VerdictDashGlyph(props: GlyphProps) {
  return (
    <VerdictGlyph {...props}>
      <path d="M4 8h8" {...stroke} />
    </VerdictGlyph>
  )
}
