import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Controls'
import { ApiError } from '../../lib/api'
import { ComparisonGrid } from '../email-detail/components/ComparisonGrid'
import { EvidenceViewer } from '../email-detail/components/EvidenceViewer'
import type { Provenance, TxtProvenance } from '../email-detail/types'
import { DemoArtifacts } from './components/DemoArtifacts'
import { FailurePanel } from './components/FailurePanel'
import { GateSummary } from './components/GateSummary'
import { PreparedFallbackPanel } from './components/PreparedFallbackPanel'
import { SourceExcerpt } from './components/SourceExcerpt'
import { UploadPanel } from './components/UploadPanel'
import { outcomeHeadline } from './judge-format'
import { JudgeUploadError, defaultJudgeApi, type JudgeApiClient } from './judge-api'
import type { JudgeDocument, JudgeDocumentRole, JudgePolicy, JudgeRun, PreparedFallback, UploadRejection } from './types'
import './judge.css'

const RUN_ID_STORAGE_KEY = 'ladinglens-judge-last-run'
const SESSION_RESET_MESSAGE = 'Your demo was reset while this check ran. Upload the pair again.'
const NETWORK_ERROR_MESSAGE = 'The check could not reach the server. Try again.'
const SYNTHETIC_BANNER_MESSAGE = 'Synthetic data only. Do not upload real shipping documents.'
const UPLOAD_ERROR_FALLBACK_MESSAGE = 'One or more files could not be used. Check your files and try again.'
const VISIBLE_UPLOAD_SLOTS = new Set(['si_file', 'draft_bl_file'])

const ROLE_LABEL: Record<'SI' | 'DRAFT_BL' | 'OTHER', string> = {
  SI: 'Shipping Instruction',
  DRAFT_BL: 'Draft Bill of Lading',
  OTHER: 'Other document'
}

function documentRoleLabel(role: JudgeDocumentRole): string {
  return role ? ROLE_LABEL[role] : 'Unclassified document'
}

// sessionStorage throws when site data is blocked (e.g. Safari or Firefox
// with storage disabled). Wrapped like lib/api.ts and lib/guest-session.ts:
// a blocked read behaves as "nothing stored", and a blocked write or remove
// is a no-op for this session.
function readStoredRunId(): string | null {
  try {
    return sessionStorage.getItem(RUN_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeRunId(runId: string): void {
  try {
    sessionStorage.setItem(RUN_ID_STORAGE_KEY, runId)
  } catch {
    // Storage is unavailable; the run still renders for this session.
  }
}

function clearStoredRunId(): void {
  try {
    sessionStorage.removeItem(RUN_ID_STORAGE_KEY)
  } catch {
    // Storage is unavailable; nothing persisted to clear.
  }
}

function isReadableTxtProvenance(provenance: Provenance): provenance is TxtProvenance {
  return provenance.format === 'txt' && !('parse_error' in provenance)
}

// Matches by id rather than file name: two uploads can share a file name, and
// only the attachment id reliably identifies which document a value came
// from (the #30 judge run uses each document's attachment id as its
// document_id).
function findDocumentByAttachmentId(documents: JudgeDocument[], attachmentId: string): JudgeDocument | undefined {
  return documents.find((doc) => doc.document_id === attachmentId)
}

// A rejection can only be shown inline when it names a slot the upload panel
// actually renders (si_file or draft_bl_file). A 422 with no details (e.g.
// synthetic_only) or details for any other slot must fall back to the submit
// alert instead of silently dropping the error.
function hasVisibleSlotRejection(rejections: UploadRejection[]): boolean {
  return rejections.some((rejection) => VISIBLE_UPLOAD_SLOTS.has(rejection.slot))
}

// Maps a thrown value to plain-language copy, with no raw error codes shown
// to the user. Shared by handleSubmit and handleRetry.
function classifyError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'session_reset') {
    return SESSION_RESET_MESSAGE
  }
  if (error instanceof ApiError) {
    return error.message
  }
  return NETWORK_ERROR_MESSAGE
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
  const [policyError, setPolicyError] = useState(false)
  const [run, setRun] = useState<JudgeRun | null>(null)
  const [serverRejections, setServerRejections] = useState<UploadRejection[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeProvenance, setActiveProvenance] = useState<Provenance | null>(null)
  const [activeValueText, setActiveValueText] = useState<string>()
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [fallbackExampleId, setFallbackExampleId] = useState<string | undefined>()
  const evidenceRef = useRef<HTMLElement | null>(null)
  const mountedRef = useRef(true)
  // Bumped whenever the displayed/in-flight run is replaced or abandoned
  // (a new submit, or "Check another pair"), so a retry captured before the
  // bump can recognize it is no longer current and drop its result or error.
  const runGenerationRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    // The policy is always fetched, even when restoring a saved run: the
    // judge may use "Check another pair" to return to the upload panel
    // without a further mount, so it must already be loaded by then.
    const storedRunId = readStoredRunId()

    api
      .getJudgePolicy()
      .then((loaded) => {
        if (!mounted) return
        setPolicy(loaded)
        setPolicyError(false)
        if (!storedRunId) setPhase('idle')
      })
      .catch(() => {
        if (!mounted) return
        setPolicyError(true)
        if (!storedRunId) setPhase('idle')
      })

    if (storedRunId) {
      api
        .getJudgeRun(storedRunId)
        .then((restored) => {
          if (!mounted) return
          setRun(restored)
          resetRunViewState()
          setPhase(restored.state === 'SUCCEEDED' ? 'result' : 'failed')
        })
        .catch(() => {
          if (!mounted) return
          clearStoredRunId()
          setPhase('idle')
        })
    }

    return () => {
      mounted = false
    }
  }, [api])

  // Per-run view state (the selected evidence, an earlier retry's error)
  // belongs to whichever run is current. Call this wherever a run is
  // replaced, so a later run's view never opens showing a prior run's
  // selection or error.
  function resetRunViewState() {
    setActiveProvenance(null)
    setActiveValueText(undefined)
    setRetryError(null)
  }

  async function handleSubmit({ si, draftBl }: { si: File; draftBl: File }) {
    runGenerationRef.current += 1
    setServerRejections([])
    setSubmitError(null)
    setPhase('checking')
    try {
      const result = await api.createJudgeRun({ si, draftBl, confirmed: true })
      if (!mountedRef.current) return
      setRun(result)
      resetRunViewState()
      storeRunId(result.run_id)
      setPhase(result.state === 'SUCCEEDED' ? 'result' : 'failed')
    } catch (error) {
      if (!mountedRef.current) return
      if (error instanceof JudgeUploadError) {
        if (hasVisibleSlotRejection(error.rejections)) {
          setServerRejections(error.rejections)
        } else {
          setSubmitError(error.message || UPLOAD_ERROR_FALLBACK_MESSAGE)
        }
      } else {
        setSubmitError(classifyError(error))
      }
      setPhase('idle')
    }
  }

  function retryPolicy() {
    api
      .getJudgePolicy()
      .then((loaded) => {
        if (!mountedRef.current) return
        setPolicy(loaded)
        setPolicyError(false)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setPolicyError(true)
      })
  }

  async function handleRetry() {
    if (!run) return
    const myGeneration = runGenerationRef.current
    const isStale = () => runGenerationRef.current !== myGeneration
    setRetrying(true)
    setRetryError(null)
    try {
      const result = await api.retryJudgeRun(run.run_id)
      if (!mountedRef.current || isStale()) return
      setRun(result)
      resetRunViewState()
      setPhase(result.state === 'SUCCEEDED' ? 'result' : 'failed')
    } catch (error) {
      if (!mountedRef.current || isStale()) return
      if (error instanceof ApiError && error.code === 'already_succeeded') {
        try {
          const refreshed = await api.getJudgeRun(run.run_id)
          if (!mountedRef.current || isStale()) return
          setRun(refreshed)
          resetRunViewState()
          setPhase(refreshed.state === 'SUCCEEDED' ? 'result' : 'failed')
        } catch (refreshError) {
          if (!mountedRef.current || isStale()) return
          setRetryError(classifyError(refreshError))
        }
      } else {
        setRetryError(classifyError(error))
      }
    } finally {
      if (mountedRef.current) setRetrying(false)
    }
  }

  const handleFallbackLoad = useCallback((fallback: PreparedFallback) => {
    setFallbackExampleId(fallback.example_id)
  }, [])

  function handleCheckAnotherPair() {
    runGenerationRef.current += 1
    clearStoredRunId()
    resetRunViewState()
    setPhase('idle')
  }

  function handleSelectProvenance(provenance: Provenance, valueText: string) {
    setActiveProvenance(provenance)
    setActiveValueText(valueText)
    revealEvidence(evidenceRef.current)
  }

  const sourceExcerptTarget = (() => {
    if (!run || !activeProvenance || !isReadableTxtProvenance(activeProvenance)) return null
    const doc = findDocumentByAttachmentId(run.documents, activeProvenance.attachment_id)
    if (!doc) return null
    return { provenance: activeProvenance, evidenceUrl: doc.evidence_url }
  })()

  return (
    <div className="judge-view">
      <p className="judge-synthetic-banner">{SYNTHETIC_BANNER_MESSAGE}</p>
      <h1 className="judge-title">Judge workspace</h1>

      {phase === 'loading' && <p className="judge-loading">Loading judge workspace…</p>}

      {(phase === 'idle' || phase === 'checking') && policyError && (
        <>
          <p role="alert" className="judge-submit-error">
            The upload rules could not load.
          </p>
          <Button variant="secondary" onClick={retryPolicy}>
            Try again
          </Button>
        </>
      )}

      {(phase === 'idle' || phase === 'checking') && !policyError && policy && (
        <>
          {submitError && (
            <p role="alert" className="judge-submit-error">
              {submitError}
            </p>
          )}
          <UploadPanel
            policy={policy}
            busy={phase === 'checking'}
            serverRejections={serverRejections}
            onSubmit={handleSubmit}
          />
          {phase === 'checking' && <CheckingStatus />}
        </>
      )}

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
          <EvidenceViewer ref={evidenceRef} activeProvenance={activeProvenance} valueText={activeValueText} />
          {sourceExcerptTarget && (
            <SourceExcerpt
              key={sourceExcerptTarget.evidenceUrl}
              provenance={sourceExcerptTarget.provenance}
              evidenceUrl={sourceExcerptTarget.evidenceUrl}
            />
          )}
          <Button variant="secondary" onClick={handleCheckAnotherPair}>
            Check another pair
          </Button>
        </section>
      )}

      {phase === 'failed' && run && (
        <>
          <FailurePanel run={run} onRetry={handleRetry} retrying={retrying} />
          {retryError && (
            <p role="alert" className="judge-submit-error">
              {retryError}
            </p>
          )}
          <Button variant="secondary" onClick={handleCheckAnotherPair} disabled={retrying}>
            Check another pair
          </Button>
          <PreparedFallbackPanel getPreparedFallback={api.getPreparedFallback} onLoad={handleFallbackLoad} />
        </>
      )}

      <GateSummary getGateSummary={api.getGateSummary} />
      <DemoArtifacts downloadArtifact={api.downloadArtifact} exampleId={fallbackExampleId} />
    </div>
  )
}
