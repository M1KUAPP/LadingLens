import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusPill } from '../../components/ui/Domain'
import { PageHead } from '../../components/ui/PageHead'
import type { StatusKind } from '../../components/ui/types'
import { CATEGORY_LABEL, STATUS_LABEL } from '../../data/inbox-labels'
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

function detectedFilesLabel(record: EmailDetailRecord): string {
  const count = record.attachments.filter(
    (item) => item.parse_state !== 'MISSING'
  ).length
  return `${count} ${count === 1 ? 'file' : 'files'} detected`
}

function revealEvidence(target: HTMLElement | null) {
  if (!target || typeof target.scrollIntoView !== 'function') return
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'nearest'
  })
}

function RetainedEvidenceSection({
  evidence
}: {
  evidence: NonNullable<EmailDetailRecord['retained_evidence']>
}) {
  return (
    <section
      className="email-detail-retained-evidence"
      aria-label="Retained evidence"
    >
      <div className="email-detail-retained-evidence-title">
        {evidence.label}
      </div>
      <div className="email-detail-retained-evidence-text">
        {evidence.text}
      </div>
      {evidence.location_description && (
        <div className="email-detail-retained-evidence-meta">
          Source: {evidence.location_description}
        </div>
      )}
    </section>
  )
}

function useEmailDetailRecord(emailId: string, service: EmailDetailService) {
  const [result, setResult] = useState<{
    emailId: string
    record: EmailDetailRecord | null
  } | null>(null)
  const [activeProvenance, setActiveProvenance] = useState<Provenance | null>(
    null
  )
  const [activeValueText, setActiveValueText] = useState<string | undefined>()

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

  return {
    record: current?.record ?? null,
    loading: current === null,
    activeProvenance,
    activeValueText,
    applyRecord(record: EmailDetailRecord) {
      setResult({ emailId, record })
    },
    selectProvenance(provenance: Provenance, valueText: string) {
      setActiveProvenance(provenance)
      setActiveValueText(valueText)
    }
  }
}

export function EmailDetailView({
  emailId,
  service = defaultEmailDetailService
}: EmailDetailViewProps) {
  const {
    record,
    loading,
    activeProvenance,
    activeValueText,
    applyRecord,
    selectProvenance
  } = useEmailDetailRecord(emailId, service)
  const evidenceRef = useRef<HTMLElement | null>(null)

  async function handleReviewAction(input: CaseReviewActionInput) {
    applyRecord(await service.submitReviewAction(input))
  }

  function handleSelectProvenance(provenance: Provenance, valueText: string) {
    selectProvenance(provenance, valueText)
    revealEvidence(evidenceRef.current)
  }

  const hasComparison = record ? record.field_verdicts.length > 0 : false
  const statusKind = record ? STATUS_KIND_MAP[record.status] : 'held'

  return (
    <div className="page">
      <PageHead
        title="Email detail"
        tag="Prepared record"
        hintLabel="About prepared data"
        hint={
          <span>
            This record uses prepared demonstration data. Live data
            replaces it when the service connection is ready.
          </span>
        }
        aside={
          record ? (
            <StatusPill status={statusKind}>{STATUS_LABEL[record.status]}</StatusPill>
          ) : null
        }
      />

      {record && (
        <div className="email-detail-metadata-grid">
          <div className="email-detail-meta-item">
            <span className="email-detail-meta-label">Email ID</span>
            <span className="email-detail-meta-value">{record.email_id}</span>
          </div>
          <div className="email-detail-meta-item">
            <span className="email-detail-meta-label">Category</span>
            <span className="email-detail-meta-value">{CATEGORY_LABEL[record.category]}</span>
          </div>
          <div className="email-detail-meta-item">
            <span className="email-detail-meta-label">Attachments</span>
            <span className="email-detail-meta-value">
              {detectedFilesLabel(record)}
            </span>
          </div>
        </div>
      )}

      {loading && !record && (
        <div className="email-detail-loading" role="status">Loading email detail...</div>
      )}

      {!loading && !record && (
        <div className="email-detail-error" role="alert">
          <p>No record exists for {emailId}.</p>
          <Link className="email-detail-error-link" to="/inbox">
            Return to inbox
          </Link>
        </div>
      )}

      {record && (
        <>
          <AttachmentPreflightList
            items={record.attachments}
            refusalReason={record.review_reason}
          />

          {record.retained_evidence && !hasComparison && (
            <RetainedEvidenceSection evidence={record.retained_evidence} />
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
