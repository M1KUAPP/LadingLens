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
  /** h1 opens a page; h2 heads a section inside one. */
  level?: 'h1' | 'h2'
  /** Glyph for the page's icon tile, matching its nav entry. */
  icon?: IconSvgElement
  /** One-line statement of what the page is, set under the title. */
  supporting?: ReactNode
}

export function PageHead({ title, tag, hintLabel, hint, aside, level = 'h1', icon, supporting }: PageHeadProps) {
  const Title = level
  const isPage = level === 'h1'

  return (
    <header className={isPage ? 'page-head' : 'page-head page-head--section'}>
      {isPage && icon ? (
        <span className="page-head-icon" aria-hidden="true">
          <HugeiconsIcon icon={icon} size={20} />
        </span>
      ) : null}
      <div className="page-head-main">
        <div className="page-head-title-row">
          <Title className="page-head-title">{title}</Title>
          {tag ? <span className="page-head-tag">{tag}</span> : null}
          {hint ? <Tooltip label={hintLabel ?? `About ${title.toLowerCase()}`}>{hint}</Tooltip> : null}
        </div>
        {isPage && supporting ? <p className="page-head-supporting">{supporting}</p> : null}
      </div>
      {aside ? <div className="page-head-aside">{aside}</div> : null}
    </header>
  )
}
