/** Rows per page on the workspace's long tables. */
export const PAGE_SIZE = 50

/**
 * Clamps a requested page to the pages the rows fill, so a list that shrinks
 * under a later page shows its last page, and cuts that page out.
 */
export function pageOf<T>(rows: readonly T[], requested: number, size = PAGE_SIZE): { page: number; rows: T[] } {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const page = Math.min(Math.max(1, requested), pages)
  return { page, rows: rows.slice((page - 1) * size, page * size) }
}
