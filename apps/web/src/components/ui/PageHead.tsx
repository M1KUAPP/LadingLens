import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import { Tooltip } from './Overlays'
import './page-frame.css'

type PageHeadProps = {
  title: string
  tag?: string
  hintLabel?: string
  hint?: ReactNode
  aside?: ReactNode
  level?: 'h1' | 'h2'
  /** Hero card mode: the per-route banner that opens every post-auth page. */
  card?: boolean
  /** Glyph for the card's icon tile. */
  icon?: IconSvgElement
  /** One-line statement of what the page is, set under the title. */
  supporting?: ReactNode
}

export function PageHead({
  title,
  tag,
  hintLabel,
  hint,
  aside,
  level = 'h1',
  card = false,
  icon,
  supporting
}: PageHeadProps) {
  const Title = level
  const titleRow = (
    <div className="page-head-main">
      <Title className="page-head-title">{title}</Title>
      {tag ? <span className="page-head-tag">{tag}</span> : null}
      {hint ? <Tooltip label={hintLabel ?? `About ${title.toLowerCase()}`}>{hint}</Tooltip> : null}
    </div>
  )

  if (!card) {
    return (
      <header className="page-head">
        {titleRow}
        {aside ? <div className="page-head-aside">{aside}</div> : null}
      </header>
    )
  }

  return (
    <header className="page-hero">
      <span className="page-hero-orb page-hero-orb--primary" aria-hidden="true" />
      <span className="page-hero-orb page-hero-orb--accent" aria-hidden="true" />
      <div className="page-hero-body">
        {icon ? (
          <span className="page-hero-icon" aria-hidden="true">
            <HugeiconsIcon icon={icon} size={20} />
          </span>
        ) : null}
        <div className="page-hero-main">
          {titleRow}
          {supporting ? <p className="page-hero-supporting">{supporting}</p> : null}
        </div>
        {aside ? <div className="page-head-aside page-hero-aside">{aside}</div> : null}
      </div>
    </header>
  )
}
