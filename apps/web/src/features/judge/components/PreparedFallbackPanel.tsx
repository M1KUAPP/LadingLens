import { useEffect, useState } from 'react'
import { ComparisonGrid } from '../../email-detail/components/ComparisonGrid'
import { outcomeHeadline } from '../judge-format'
import type { PreparedFallback } from '../types'

type PreparedFallbackPanelProps = {
  getPreparedFallback: () => Promise<PreparedFallback>
}

export function PreparedFallbackPanel({ getPreparedFallback }: PreparedFallbackPanelProps) {
  const [fallback, setFallback] = useState<PreparedFallback | null>(null)

  useEffect(() => {
    let mounted = true
    getPreparedFallback()
      .then((loaded) => {
        if (mounted) setFallback(loaded)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [getPreparedFallback])

  if (!fallback) return null

  const si = fallback.documents.find((doc) => doc.slot === 'si_file')
  const draftBl = fallback.documents.find((doc) => doc.slot === 'draft_bl_file')

  return (
    <section className="prepared-fallback-panel" aria-label="Prepared fallback example">
      <h2 className="prepared-fallback-heading">{fallback.label}</h2>
      <p className="prepared-fallback-note">{fallback.note}</p>
      <p className="prepared-fallback-files">{`Example files: ${si?.file_name} and ${draftBl?.file_name}`}</p>
      <p className="prepared-fallback-outcome">{outcomeHeadline(fallback.outcome)}</p>
      <ComparisonGrid verdicts={fallback.field_verdicts} />
    </section>
  )
}
