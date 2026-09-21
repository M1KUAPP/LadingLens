/**
 * How far the page sheet has lifted off the fixed footer: 0 while it is
 * covered, 1 once it shows whole. The footer is uncovered over the last
 * `footHeight` pixels of scroll.
 */
export function footReveal(scrollY: number, scrollHeight: number, viewportHeight: number, footHeight: number) {
  if (footHeight <= 0) return 1
  const end = scrollHeight - viewportHeight
  return Math.min(1, Math.max(0, (scrollY - (end - footHeight)) / footHeight))
}
