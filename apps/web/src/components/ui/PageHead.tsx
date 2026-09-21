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
  /** Glyph for the page's icon tile, matching its nav entry. */
  icon?: IconSvgElement
  /** One-line statement of what the page is, set under the title. */
  supporting?: ReactNode
}

export function PageHead({ title, tag, hintLabel, hint, aside, icon, supporting }: PageHeadProps) {
  return (
    <header className="page-head">
      {icon ? (
        <span className="page-head-icon" aria-hidden="true">
          <HugeiconsIcon icon={icon} size={20} />
        </span>
      ) : null}
      <div className="page-head-main">
        <div className="page-head-title-row">
          <h1 className="page-head-title">{title}</h1>
          {tag ? <span className="page-head-tag">{tag}</span> : null}
          {hint ? <Tooltip label={hintLabel ?? `About ${title.toLowerCase()}`}>{hint}</Tooltip> : null}
        </div>
        {supporting ? <p className="page-head-supporting">{supporting}</p> : null}
      </div>
      {aside ? <div className="page-head-aside">{aside}</div> : null}
    </header>
  )
}
