import { useEffect, useState, type CSSProperties } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import { formatFileSize } from '../judge-format'
import {
  BAY_COLUMNS,
  BAY_ROWS,
  CHECK_STAGES,
  estimateProgress,
  percentLabel,
  stageStates,
  tileFill,
  tileRanks,
  type StageState
} from '../waiting-progress'
import './check-waiting.css'

export type WaitingVerdict = 'running' | 'match' | 'held' | 'mismatch' | 'failed'

type CheckWaitingProps = {
  files: { si: File; draftBl: File }
  /** Date.now() when the pair was submitted. */
  startedAt: number
  /** 'running' until the server answers, then the verdict the bay washes into. */
  verdict: WaitingVerdict
}

const TICK_MS = 200
const RANKS = tileRanks(BAY_COLUMNS, BAY_ROWS)
const FILLABLE = RANKS.length - 1

const STATE_LABEL: Record<StageState, string> = {
  waiting: 'Waiting',
  active: 'In progress',
  done: 'Done'
}

function headline(verdict: WaitingVerdict): string {
  if (verdict === 'running') return 'Checking your documents live…'
  if (verdict === 'failed') return 'The check stopped'
  return 'Check complete'
}

// The waiting screen after an upload, laid out on the wireframe: a status
// card and the pipeline's three steps on the left, and on the right the bay,
// 110 tiles that fill as the estimate climbs, with the percentage in the
// first tile. When the run returns the bay completes and washes into the
// verdict colour before the result replaces it.
export function CheckWaiting({ files, startedAt, verdict }: CheckWaitingProps) {
  const finished = verdict !== 'running'
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (finished) return
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [finished])

  const elapsedMs = Math.max(0, now - startedAt)
  const progress = finished ? 1 : estimateProgress(elapsedMs)
  const percent = finished ? 100 : Math.floor(progress * 100)
  const stages = stageStates(progress, finished)
  const activeStage = CHECK_STAGES.find((stage) => stages[stage.key] === 'active')
  const statusLine = finished
    ? verdict === 'failed'
      ? 'The check did not finish.'
      : 'All three steps finished.'
    : `Now: ${activeStage?.title ?? CHECK_STAGES[0].title}`

  return (
    <section className="check-waiting" data-verdict={verdict} aria-label="Live check">
      <div className="check-waiting-rail">
        <div className="check-waiting-card">
          <div className="check-waiting-meta">
            <span className="check-waiting-kicker">
              <span className="check-waiting-dot" aria-hidden="true" />
              Live check
            </span>
            <span className="check-waiting-elapsed">{Math.floor(elapsedMs / 1000)} s elapsed</span>
          </div>
          <div className="check-waiting-status" role="status">
            <h2 className="check-waiting-title">{headline(verdict)}</h2>
            <p className="check-waiting-now">{statusLine}</p>
          </div>
          <ul className="check-waiting-files" aria-label="Documents in this check">
            <li className="check-file">
              <span className="check-file-tag" aria-hidden="true">
                SI
              </span>
              <span className="check-file-text">
                <span className="check-file-role">Shipping instruction</span>
                <span className="check-file-name">{files.si.name}</span>
              </span>
              <span className="check-file-size">{formatFileSize(files.si.size)}</span>
            </li>
            <li className="check-file">
              <span className="check-file-tag" aria-hidden="true">
                BL
              </span>
              <span className="check-file-text">
                <span className="check-file-role">Draft bill of lading</span>
                <span className="check-file-name">{files.draftBl.name}</span>
              </span>
              <span className="check-file-size">{formatFileSize(files.draftBl.size)}</span>
            </li>
          </ul>
          <p className="check-waiting-note">
            Live checks usually take 15 to 40 seconds. Progress is estimated from typical run times.
          </p>
        </div>

        <ol className="check-stages" aria-label="Check steps">
          {CHECK_STAGES.map((stage) => {
            const state = stages[stage.key]
            return (
              <li key={stage.key} className="check-stage" data-state={state}>
                <span className="check-stage-marker" aria-hidden="true">
                  {state === 'done' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} /> : <span />}
                </span>
                <span className="check-stage-body">
                  <span className="check-stage-head">
                    <span className="check-stage-title">{stage.title}</span>
                    <span className="check-stage-state">{STATE_LABEL[state]}</span>
                  </span>
                  <span className="check-stage-detail">{stage.detail}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div
        className="check-bay"
        role="progressbar"
        aria-label="Estimated check progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} percent, estimated`}
      >
        {RANKS.map((rank, index) => {
          if (rank < 0) {
            return (
              <div key={index} className="check-bay-tile check-bay-tile--counter">
                <span className="check-bay-percent">{percentLabel(progress, finished)}</span>
              </div>
            )
          }
          const fill = tileFill(rank, progress, FILLABLE)
          return (
            <div
              key={index}
              className="check-bay-tile"
              data-full={fill >= 1 || undefined}
              data-front={(fill > 0 && fill < 1) || undefined}
              style={{ '--fill': fill, '--rank': rank } as CSSProperties}
            />
          )
        })}
      </div>
    </section>
  )
}
