import type { ReactNode } from 'react'

export function PlaceholderView({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="placeholder-view">
      <h1 className="type-heading-lg">{title}</h1>
      {children}
    </div>
  )
}
