import { useEffect, useState } from 'react'
import { apiFetch } from '../../../lib/api'
import type { TxtProvenance } from '../../email-detail/types'

type SourceExcerptProps = {
  provenance: TxtProvenance
  evidenceUrl: string
}

// Renders the anchored source line with the compared value highlighted.
// `location.start_col`/`end_col` are Unicode code-point offsets (not UTF-16
// indices), so the line must be sliced through `Array.from`, which splits on
// code points; a plain `string.slice` would misalign on any line containing
// an astral-plane character (surrogate pair) before the highlighted value.
//
// The caller mounts a fresh instance per `evidenceUrl` (via a `key`), so
// state never needs a manual reset when the target changes.
export function SourceExcerpt({ provenance, evidenceUrl }: SourceExcerptProps) {
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let mounted = true
    apiFetch(evidenceUrl)
      .then((response) => response.text())
      .then((body) => {
        if (mounted) setText(body)
      })
      .catch(() => {
        if (mounted) setFailed(true)
      })
    return () => {
      mounted = false
    }
  }, [evidenceUrl])

  if (failed) {
    return <p className="source-excerpt-error">Source preview unavailable.</p>
  }
  if (text === null) {
    return null
  }

  const { line, start_col: startCol, end_col: endCol } = provenance.location
  const lineText = text.split('\n')[line - 1] ?? ''
  const codePoints = Array.from(lineText)
  const before = codePoints.slice(0, startCol).join('')
  const value = codePoints.slice(startCol, endCol).join('')
  const after = codePoints.slice(endCol).join('')

  return (
    <div className="source-excerpt">
      <pre className="source-excerpt-line">
        {before}
        <mark>{value}</mark>
        {after}
      </pre>
    </div>
  )
}
