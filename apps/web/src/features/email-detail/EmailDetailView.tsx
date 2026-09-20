import { useEffect, useRef, useState } from 'react'
import { StatusPill } from '../../components/ui/Domain'
import { Tooltip } from '../../components/ui/Overlays'
import type { StatusKind } from '../../components/ui/types'
import { AttachmentPreflightList } from './components/AttachmentPreflightList'
import { ComparisonGrid } from './components/ComparisonGrid'
import { EvidenceViewer } from './components/EvidenceViewer'
import { HeldReviewCard } from './components/HeldReviewCard'
import { defaultEmailDetailService, type EmailDetailService } from './seam'
import type {
  CaseReviewActionInput,
  EmailDetailRecord,
  Provenance,
  Status
} from './types'
import './email-detail.css'

type EmailDetailViewProps = {
  emailId: string
  service?: EmailDetailService
}

const STATUS_KIND_MAP: Record<Status, StatusKind> = {
  OK: 'match',
  MISMATCH: 'mismatch',
  NEEDS_REVIEW: 'held'
}

export function EmailDetailView({
  emailId,
  service = defaultEmailDetailService
}: EmailDetailViewProps) {
  const [result, setResult] = useState<{
    emailId: string
    record: EmailDetailRecord | null
  } | null>(null)
  const [activeProvenance, setActiveProvenance] = useState<Provenance | null>(
    null
  )
  const [activeValueText, setActiveValueText] = useState<string | undefined>()
  const evidenceRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let mounted = true
    service
      .getEmailDetail(emailId)
      .then((data) => {
        if (!mounted) return
        setResult({ emailId, record: data })
        if (data?.field_verdicts && data.field_verdicts.length > 0) {
          // Initialize active provenance with the first verdict's SI value
          const first = data.field_verdicts[0]
          setActiveProvenance(first.si.provenance)
          setActiveValueText(first.si.raw_value)
        } else {
          setActiveProvenance(null)
          setActiveValueText(undefined)
        }
      })
      .catch(() => {
        if (!mounted) return
        setResult({ emailId, record: null })
      })

    return () => {
      mounted = false
    }
  }, [emailId, service])

  const current = result && result.emailId === emailId ? result : null
  const record = current?.record ?? null
  const loading = current === null

  async function handleReviewAction(input: CaseReviewActionInput) {
    const updated = await service.submitReviewAction(input)
    setResult({ emailId, record: updated })
  }

  function handleSelectProvenance(provenance: Provenance, valueText: string) {
    setActiveProvenance(provenance)
    setActiveValueText(valueText)

    const target = evidenceRef.current
    if (target && typeof target.scrollIntoView === 'function') {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest'
      })
    }
  }

  const hasComparison = record ? record.field_verdicts.length > 0 : false
  const statusKind = record ? STATUS_KIND_MAP[record.status] : 'held'

  return (
    <div className="email-detail-container">
      <header className="email-detail-header">
        <div className="email-detail-header-top">
          <div className="email-detail-title-group">
            <h1 className="email-detail-title">Email detail</h1>
            <span
              className="email-detail-prepared-badge"
              data-prepared="true"
            >
              PREPARED RECORD
            </span>
            <Tooltip label="About prepared data">
              <span>
                Demonstration fixture verified against canonical contracts.
                Live provider pipeline connects via issue #30.
              </span>
            </Tooltip>
          </div>
          {record && <StatusPill status={statusKind}>{record.status}</StatusPill>}
        </div>

        {record && (
          <div className="email-detail-metadata-grid">
            <div className="email-detail-meta-item">
              <span className="email-detail-meta-label">Email identifier</span>
              <span className="email-detail-meta-value">{record.email_id}</span>
            </div>
            <div className="email-detail-meta-item">
              <span className="email-detail-meta-label">Category</span>
              <span className="email-detail-meta-value">{record.category}</span>
            </div>
            <div className="email-detail-meta-item">
              <span className="email-detail-meta-label">Attachments</span>
              <span className="email-detail-meta-value">
                {record.attachments.length} files detected
              </span>
            </div>
          </div>
        )}
      </header>

      {loading && !record && (
        <div className="email-detail-loading">Loading email detail...</div>
      )}

      {!loading && !record && (
        <div className="email-detail-error">
          Record not found for email: {emailId}
        </div>
      )}

      {record && (
        <>
          <AttachmentPreflightList
            items={record.attachments}
            refusalReason={record.review_reason}
          />

          {record.retained_evidence && !hasComparison && (
            <div
              className="email-detail-retained-evidence"
              role="region"
              aria-label="Retained evidence"
            >
              <div className="email-detail-retained-evidence-title">
                {record.retained_evidence.label}
              </div>
              <div className="email-detail-retained-evidence-text">
                {record.retained_evidence.text}
              </div>
              {record.retained_evidence.location_description && (
                <div className="email-detail-retained-evidence-meta">
                  Source: {record.retained_evidence.location_description}
                </div>
              )}
            </div>
          )}

          {hasComparison && (
            <ComparisonGrid
              verdicts={record.field_verdicts}
              onSelectProvenance={handleSelectProvenance}
            />
          )}

          {hasComparison && (
            <EvidenceViewer
              ref={evidenceRef}
              activeProvenance={activeProvenance}
              valueText={activeValueText}
            />
          )}

          {record.held_review && (
            <HeldReviewCard
              review={record.held_review}
              onAction={handleReviewAction}
            />
          )}
        </>
      )}
    </div>
  )
}
