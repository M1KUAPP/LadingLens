import type { ReactNode } from 'react'
import { Tooltip } from './Overlays'
import './page-frame.css'

type PageHeadProps = {
  title: string
  tag?: string
  hintLabel?: string
  hint?: ReactNode
  aside?: ReactNode
  level?: 'h1' | 'h2'
}

export function PageHead({ title, tag, hintLabel, hint, aside, level = 'h1' }: PageHeadProps) {
  const Title = level
  return (
    <header className="page-head">
      <div className="page-head-main">
        <Title className="page-head-title">{title}</Title>
        {tag ? <span className="page-head-tag">{tag}</span> : null}
        {hint ? <Tooltip label={hintLabel ?? `About ${title.toLowerCase()}`}>{hint}</Tooltip> : null}
      </div>
      {aside ? <div className="page-head-aside">{aside}</div> : null}
    </header>
  )
}
