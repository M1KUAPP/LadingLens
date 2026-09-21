import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon'
import { Button } from '../../components/ui/Controls'
import { StatusPill } from '../../components/ui/Domain'
import { STATUS_KIND, STATUS_LABEL } from '../../data/inbox-labels'
import { ApiError } from '../../lib/api'
import { ComparisonGrid } from '../email-detail/components/ComparisonGrid'
import { EvidenceViewer } from '../email-detail/components/EvidenceViewer'
import type { Provenance, TxtProvenance } from '../email-detail/types'
import { CheckWaiting, type WaitingVerdict } from './components/CheckWaiting'
import { DemoDataset } from './components/DemoDataset'
import { FailurePanel } from './components/FailurePanel'
import { PreparedFallbackPanel } from './components/PreparedFallbackPanel'
import { SourceExcerpt } from './components/SourceExcerpt'
import { UploadPanel } from './components/UploadPanel'
import { outcomeHeadline } from './judge-format'
import { JudgeUploadError, defaultJudgeApi, type JudgeApiClient } from './judge-api'
import type { JudgeDocument, JudgeDocumentRole, JudgePolicy, JudgeRun, UploadRejection } from './types'
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
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'nearest'
  })
}

type Phase = 'loading' | 'idle' | 'checking' | 'settling' | 'result' | 'failed'

type JudgeViewProps = {
  api?: JudgeApiClient
  /** How long the completed bay holds before the result replaces it. */
  settleMs?: number
}

const SETTLE_MS = 900

// The colour the waiting screen's bay washes into once the run returns.
function waitingVerdict(run: JudgeRun): WaitingVerdict {
  if (run.state !== 'SUCCEEDED') return 'failed'
  if (run.outcome?.status === 'MISMATCH') return 'mismatch'
  if (run.outcome?.status === 'NEEDS_REVIEW') return 'held'
  return 'match'
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function JudgeView({ api = defaultJudgeApi, settleMs = SETTLE_MS }: JudgeViewProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [pending, setPending] = useState<{ files: { si: File; draftBl: File }; startedAt: number } | null>(null)
  const [settleVerdict, setSettleVerdict] = useState<WaitingVerdict>('running')
  const settleTimerRef = useRef<number | undefined>(undefined)
  const [policy, setPolicy] = useState<JudgePolicy | null>(null)
  const [policyError, setPolicyError] = useState(false)
  const [run, setRun] = useState<JudgeRun | null>(null)
  const [serverRejections, setServerRejections] = useState<UploadRejection[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeProvenance, setActiveProvenance] = useState<Provenance | null>(null)
  const [activeValueText, setActiveValueText] = useState<string>()
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
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
      window.clearTimeout(settleTimerRef.current)
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

  // Holds the completed bay for a beat so the verdict wash reads, then shows
  // the result. Skipped when motion is reduced or no hold is asked for.
  function settle(result: JudgeRun) {
    const next = result.state === 'SUCCEEDED' ? 'result' : 'failed'
    const hold = prefersReducedMotion() ? 0 : settleMs
    if (hold <= 0) {
      setPhase(next)
      return
    }
    setSettleVerdict(waitingVerdict(result))
    setPhase('settling')
    settleTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setPhase(next)
    }, hold)
  }

  async function handleSubmit({ si, draftBl }: { si: File; draftBl: File }) {
    runGenerationRef.current += 1
    setServerRejections([])
    setSubmitError(null)
    setPending({ files: { si, draftBl }, startedAt: Date.now() })
    setSettleVerdict('running')
    setPhase('checking')
    try {
      const result = await api.createJudgeRun({ si, draftBl, confirmed: true })
      if (!mountedRef.current) return
      setRun(result)
      resetRunViewState()
      storeRunId(result.run_id)
      settle(result)
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

  const waiting = phase === 'checking' || phase === 'settling'

  const sourceExcerptTarget = (() => {
    if (!run || !activeProvenance || !isReadableTxtProvenance(activeProvenance)) return null
    const doc = findDocumentByAttachmentId(run.documents, activeProvenance.attachment_id)
    if (!doc) return null
    return { provenance: activeProvenance, evidenceUrl: doc.evidence_url }
  })()

  // The pair and the side cards sit side by side while choosing files; the
  // waiting screen and the result take the full width with the side cards
  // below.
  const layout = phase === 'idle' || phase === 'loading' ? 'split' : 'stacked'

  return (
    <div className="judge-view" data-layout={layout}>
      <p className="judge-synthetic-banner">
        <HugeiconsIcon icon={InformationCircleIcon} size={16} aria-hidden="true" />
        {SYNTHETIC_BANNER_MESSAGE}
      </p>

      <div className="judge-main">
        {phase === 'loading' && (
          <div className="judge-loading" role="status">
            <span className="judge-loading-slot" aria-hidden="true" />
            <span className="judge-loading-slot" aria-hidden="true" />
            <span className="judge-loading-text">Loading the upload rules…</span>
          </div>
        )}

        {phase === 'idle' && policyError && (
          <div className="judge-policy-error">
            <p role="alert" className="judge-submit-error">
              The upload rules could not load.
            </p>
            <Button variant="secondary" onClick={retryPolicy}>
              Try again
            </Button>
          </div>
        )}

        {(phase === 'idle' || waiting) && !policyError && policy && (
          <>
            {submitError && (
              <p role="alert" className="judge-submit-error">
                {submitError}
              </p>
            )}
            {/* Hidden, not unmounted, while the check runs: a rejected upload
                comes back to the panel with its files still chosen. */}
            <div className="judge-pair" hidden={waiting}>
              <UploadPanel policy={policy} busy={waiting} serverRejections={serverRejections} onSubmit={handleSubmit} />
            </div>
            {waiting && pending && (
              <CheckWaiting
                files={pending.files}
                startedAt={pending.startedAt}
                verdict={phase === 'settling' ? settleVerdict : 'running'}
              />
            )}
          </>
        )}

        {phase === 'result' && run && (
          <section className="judge-result" aria-label="Live check result">
            <header className="judge-result-head">
              <div className="judge-result-verdict">
                {run.outcome ? (
                  <StatusPill status={STATUS_KIND[run.outcome.status]}>{STATUS_LABEL[run.outcome.status]}</StatusPill>
                ) : null}
                <h2 className="judge-result-headline">
                  {run.outcome ? outcomeHeadline(run.outcome) : 'Live check complete'}
                </h2>
                <p className="judge-result-meta">{`Finished in ${(run.latency_ms / 1000).toFixed(1)} s`}</p>
              </div>
              <Button variant="secondary" onClick={handleCheckAnotherPair}>
                Check another pair
              </Button>
            </header>
            <ul className="judge-result-documents" aria-label="Checked documents">
              {run.documents.map((doc) => (
                <li key={doc.document_id}>
                  <span className="judge-result-document-kind" aria-hidden="true">
                    {doc.detected_format.toUpperCase()}
                  </span>
                  <span className="judge-result-document-text">
                    <span className="judge-result-document-name">{doc.file_name}</span>
                    <span className="judge-result-document-role">{documentRoleLabel(doc.role)}</span>
                  </span>
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
            <div className="judge-failed-actions">
              <Button variant="secondary" onClick={handleCheckAnotherPair} disabled={retrying}>
                Check another pair
              </Button>
            </div>
            <PreparedFallbackPanel getPreparedFallback={api.getPreparedFallback} />
          </>
        )}
      </div>

      <aside className="judge-side" aria-label="Demo data">
        <DemoDataset getGateSummary={api.getGateSummary} downloadArtifact={api.downloadArtifact} />
      </aside>
    </div>
  )
}
