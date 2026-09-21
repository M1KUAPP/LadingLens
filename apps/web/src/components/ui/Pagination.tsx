import { HugeiconsIcon } from '@hugeicons/react'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import { PAGE_SIZE } from '../../lib/paging'
import { Button } from './Controls'
import './pagination.css'

type PaginationProps = {
  /** Names the navigation landmark, as in "Inbox pages". */
  label: string
  /** The current page, already clamped by pageOf. */
  page: number
  total: number
  onPageChange: (page: number) => void
  pageSize?: number
}

/** The bar that closes a long table's card: the range shown, then Previous and Next. */
export function Pagination({ label, page, total, onPageChange, pageSize = PAGE_SIZE }: PaginationProps) {
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  return (
    <nav className="pagination" aria-label={label}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
        Previous
      </Button>
      <span className="pagination-range type-data-sm">
        {start + 1}-{end} of {total}
      </span>
      <Button variant="secondary" disabled={end >= total} onClick={() => onPageChange(page + 1)}>
        Next
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
      </Button>
    </nav>
  )
}
