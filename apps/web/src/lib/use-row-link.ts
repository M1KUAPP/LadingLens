import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Lets a whole table row follow the link it carries. The link stays the
 * keyboard and screen reader target; the row only widens where a pointer can
 * click. A click on a control in the row, or one that ends a text selection,
 * keeps its own meaning.
 */
export function useRowLink() {
  const navigate = useNavigate()
  return (to: string) => (event: MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest('a, button, input, select, textarea, label')) return
    if (window.getSelection()?.isCollapsed === false) return
    navigate(to)
  }
}
