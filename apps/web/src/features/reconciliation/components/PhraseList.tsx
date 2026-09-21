import { Fragment } from 'react'
import './phrase-list.css'

/** A list whose items keep their words and hyphens together, so it breaks
 * only between items. */
export function PhraseList({ items, separator }: { items: string[]; separator: string }) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item}>
          {index > 0 ? ' ' : null}
          <span className="phrase-list-item">
            {item}
            {index < items.length - 1 ? separator : null}
          </span>
        </Fragment>
      ))}
    </>
  )
}
