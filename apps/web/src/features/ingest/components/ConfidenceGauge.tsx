import { CONFIDENCE_BAND_LABEL, confidenceBand } from '../seam'
import type { ConfidenceBand } from '../types'
import './confidence-gauge.css'

const BANDS: ConfidenceBand[] = ['mismatch', 'review', 'match']

// Horizontal probability gauge per docs/research/ideation/escalation-policy.md:
// the track carries the three decision bands, the active band is marked, and
// the exact percentage plus a plain-language label always accompany the bar.
export function ConfidenceGauge({ value }: { value: number }) {
  const clamped = Math.min(1, Math.max(0, value))
  const percent = Math.round(clamped * 100)
  const band = confidenceBand(clamped)
  return (
    <span className="confidence-gauge" data-band={band}>
      <span
        className="confidence-gauge-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Confidence ${percent} percent, ${CONFIDENCE_BAND_LABEL[band]}`}
      >
        {BANDS.map((name) => (
          <span
            key={name}
            className={`confidence-gauge-band confidence-gauge-band--${name}`}
            data-active={band === name || undefined}
            aria-hidden="true"
          />
        ))}
        <span
          className="confidence-gauge-marker"
          style={{ left: `${percent}%` }}
          aria-hidden="true"
        />
      </span>
      <span className="confidence-gauge-reading">
        <span className="confidence-gauge-value type-data-sm">{percent}%</span>
        <span className="confidence-gauge-label">{CONFIDENCE_BAND_LABEL[band]}</span>
      </span>
    </span>
  )
}
