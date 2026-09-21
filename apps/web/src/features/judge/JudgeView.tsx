import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'
import { ComparisonGrid } from '../email-detail/components/ComparisonGrid'
import { EvidenceViewer } from '../email-detail/components/EvidenceViewer'
import type { Provenance, TxtProvenance } from '../email-detail/types'
import { FailurePanel } from './components/FailurePanel'
import { PreparedFallbackPanel } from './components/PreparedFallbackPanel'
import { SourceExcerpt } from './components/SourceExcerpt'
import { UploadPanel } from './components/UploadPanel'
import { outcomeHeadline } from './judge-format'
import { JudgeUploadError, defaultJudgeApi, type JudgeApiClient } from './judge-api'
import type { JudgeDocument, JudgeDocumentRole, JudgePolicy, JudgeRun, UploadRejection } from './types'
import './judge.css'

const RUN_ID_STORAGE_KEY = 'ladinglens-judge-last-run'

const ROLE_LABEL: Record<'SI' | 'DRAFT_BL' | 'OTHER', string> = {
  SI: 'Shipping Instruction',
  DRAFT_BL: 'Draft Bill of Lading',
  OTHER: 'Other document'
}

function documentRoleLabel(role: JudgeDocumentRole): string {
  return role ? ROLE_LABEL[role] : 'Unclassified document'
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
  const [retrying, setRetrying] = useState(false)

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

  async function handleRetry() {
    if (!run) return
    setRetrying(true)
    try {
      const result = await api.retryJudgeRun(run.run_id)
      setRun(result)
      setPhase(result.state === 'SUCCEEDED' ? 'result' : 'failed')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'already_succeeded') {
        const refreshed = await api.getJudgeRun(run.run_id)
        setRun(refreshed)
        setPhase(refreshed.state === 'SUCCEEDED' ? 'result' : 'failed')
      }
    } finally {
      setRetrying(false)
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
        <>
          <FailurePanel run={run} onRetry={handleRetry} retrying={retrying} />
          <PreparedFallbackPanel getPreparedFallback={api.getPreparedFallback} />
        </>
      )}
    </div>
  )
}
