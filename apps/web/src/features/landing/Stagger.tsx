import type { ReactNode } from 'react'

type StaggerProps = { visible: boolean; delay?: number; children: ReactNode }

/** One entrance: rises 24px and fades in while visible, `delay` ms late. */
export function Stagger({ visible, delay = 0, children }: StaggerProps) {
  return (
    <div
      className="land-stagger"
      data-visible={visible || undefined}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
