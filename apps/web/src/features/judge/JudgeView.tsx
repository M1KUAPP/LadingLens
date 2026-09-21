import { useEffect, useState } from 'react'
import { REVIEW_REASON_LABEL } from '../../data/inbox-labels'
import type { ComparedField } from '../../domain/contracts'
import { ComparisonGrid } from '../email-detail/components/ComparisonGrid'
import { EvidenceViewer } from '../email-detail/components/EvidenceViewer'
import type { Provenance, TxtProvenance } from '../email-detail/types'
import { SourceExcerpt } from './components/SourceExcerpt'
import { UploadPanel } from './components/UploadPanel'
import { JudgeUploadError, defaultJudgeApi, type JudgeApiClient } from './judge-api'
import type { JudgeDocument, JudgeDocumentRole, JudgeOutcome, JudgePolicy, JudgeRun, UploadRejection } from './types'
import './judge.css'

const RUN_ID_STORAGE_KEY = 'ladinglens-judge-last-run'

const FIELD_LABELS: Record<ComparedField, string> = {
  shipper: 'Shipper',
  consignee: 'Consignee',
  notify_party: 'Notify party',
  port_of_loading: 'Port of loading',
  port_of_discharge: 'Port of discharge',
  container_count: 'Container count',
  gross_weight_kg: 'Gross weight (kg)'
}

const ROLE_LABEL: Record<'SI' | 'DRAFT_BL' | 'OTHER', string> = {
  SI: 'Shipping Instruction',
  DRAFT_BL: 'Draft Bill of Lading',
  OTHER: 'Other document'
}

function documentRoleLabel(role: JudgeDocumentRole): string {
  return role ? ROLE_LABEL[role] : 'Unclassified document'
}

function outcomeHeadline(outcome: JudgeOutcome): string {
  if (outcome.status === 'OK') return 'All seven fields match'
  if (outcome.status === 'MISMATCH') {
    const names = outcome.defect_fields.map((fieldName) => FIELD_LABELS[fieldName]).join(', ')
    return `${outcome.defect_fields.length} fields differ: ${names}`
  }
  const reason = outcome.review_reason ? REVIEW_REASON_LABEL[outcome.review_reason] : 'Manual review needed'
  return `Needs review: ${reason}`
}

function isReadableTxtProvenance(provenance: Provenance): provenance is TxtProvenance {
  return provenance.format === 'txt' && !('parse_error' in provenance)
}

function findDocumentByFileName(documents: JudgeDocument[], fileName: string): JudgeDocument | undefined {
  return documents.find((doc) => doc.file_name === fileName)
}

type Phase = 'loading' | 'idle' | 'checking' | 'result' | 'failed'

type JudgeViewProps = {
  api?: JudgeApiClient
}

function CheckingStatus() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div role="status" className="judge-checking">
      <p className="judge-checking-message">Checking your documents live…</p>
      <p className="judge-checking-elapsed">{elapsedSeconds} s elapsed</p>
    </div>
  )
}

export function JudgeView({ api = defaultJudgeApi }: JudgeViewProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [policy, setPolicy] = useState<JudgePolicy | null>(null)
  const [run, setRun] = useState<JudgeRun | null>(null)
  const [serverRejections, setServerRejections] = useState<UploadRejection[]>([])
  const [activeProvenance, setActiveProvenance] = useState<Provenance | null>(null)
  const [activeValueText, setActiveValueText] = useState<string>()

  useEffect(() => {
    let mounted = true

    function loadPolicy() {
      api
        .getJudgePolicy()
        .then((loaded) => {
          if (!mounted) return
          setPolicy(loaded)
          setPhase('idle')
        })
        .catch(() => {
          if (!mounted) return
          setPhase('idle')
        })
    }

    const storedRunId = sessionStorage.getItem(RUN_ID_STORAGE_KEY)
    if (storedRunId) {
      api
        .getJudgeRun(storedRunId)
        .then((restored) => {
          if (!mounted) return
          setRun(restored)
          setPhase(restored.state === 'SUCCEEDED' ? 'result' : 'failed')
        })
        .catch(() => {
          if (!mounted) return
          sessionStorage.removeItem(RUN_ID_STORAGE_KEY)
          loadPolicy()
        })
    } else {
      loadPolicy()
    }

    return () => {
      mounted = false
    }
  }, [api])

  async function handleSubmit({ si, draftBl }: { si: File; draftBl: File }) {
    setServerRejections([])
    setPhase('checking')
    try {
      const result = await api.createJudgeRun({ si, draftBl, confirmed: true })
      setRun(result)
      sessionStorage.setItem(RUN_ID_STORAGE_KEY, result.run_id)
      setPhase(result.state === 'SUCCEEDED' ? 'result' : 'failed')
    } catch (error) {
      if (error instanceof JudgeUploadError) {
        setServerRejections(error.rejections)
      }
      setPhase('idle')
    }
  }

  function handleSelectProvenance(provenance: Provenance, valueText: string) {
    setActiveProvenance(provenance)
    setActiveValueText(valueText)
  }

  const sourceExcerptTarget = (() => {
    if (!run || !activeProvenance || !isReadableTxtProvenance(activeProvenance)) return null
    const doc = findDocumentByFileName(run.documents, activeProvenance.file_name)
    if (!doc) return null
    return { provenance: activeProvenance, evidenceUrl: doc.evidence_url }
  })()

  return (
    <div className="judge-view">
      <h1 className="judge-title">Judge workspace</h1>

      {phase === 'loading' && <p className="judge-loading">Loading judge workspace…</p>}

      {phase === 'idle' && policy && (
        <UploadPanel policy={policy} busy={false} serverRejections={serverRejections} onSubmit={handleSubmit} />
      )}

      {phase === 'checking' && <CheckingStatus />}

      {phase === 'result' && run && (
        <section className="judge-result" aria-label="Live check result">
          <h2 className="judge-result-headline">
            {run.outcome ? outcomeHeadline(run.outcome) : 'Live check complete'}
          </h2>
          <ul className="judge-result-documents">
            {run.documents.map((doc) => (
              <li key={doc.document_id}>
                <span className="judge-result-document-name">{doc.file_name}</span>
                <span className="judge-result-document-role">{documentRoleLabel(doc.role)}</span>
              </li>
            ))}
          </ul>
          <ComparisonGrid verdicts={run.field_verdicts} onSelectProvenance={handleSelectProvenance} />
          <EvidenceViewer activeProvenance={activeProvenance} valueText={activeValueText} />
          {sourceExcerptTarget && (
            <SourceExcerpt
              key={sourceExcerptTarget.evidenceUrl}
              provenance={sourceExcerptTarget.provenance}
              evidenceUrl={sourceExcerptTarget.evidenceUrl}
            />
          )}
        </section>
      )}

      {phase === 'failed' && run && (
        <div role="alert" className="judge-failed-placeholder">
          {run.failure?.message ?? 'The live check did not finish.'}
        </div>
      )}
    </div>
  )
}
