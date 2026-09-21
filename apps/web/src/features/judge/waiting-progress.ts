// The waiting screen's progress model. The live check is one synchronous
// request, so nothing reports real progress: the estimate is shaped on the
// live-path benchmark (reads took 12.9 to 38.4 seconds, end-to-end p95 25.6
// seconds; docs/research/build/live-path-latency-method.md) and the screen
// says it is an estimate. It approaches, but never reaches, its ceiling until
// the server answers.

export const BAY_COLUMNS = 11
export const BAY_ROWS = 10

const ESTIMATE_TAU_MS = 12_000
const ESTIMATE_CEILING = 0.95

export type CheckStage = 'receive' | 'read' | 'compare'
export type StageState = 'waiting' | 'active' | 'done'

// The judge pipeline's own steps (apps/api/app/judge.py): _receive stores the
// pair as an email, then run_case extracts each document's fields and
// compares them. `from` is where each stage takes over the estimate.
export const CHECK_STAGES: readonly { key: CheckStage; title: string; detail: string; from: number }[] = [
  {
    key: 'receive',
    title: 'Receive the pair',
    detail: 'Validate both files and store them for this check.',
    from: 0
  },
  {
    key: 'read',
    title: 'Read both documents',
    detail: 'Extract the seven compared fields from each document.',
    from: 0.08
  },
  {
    key: 'compare',
    title: 'Compare the fields',
    detail: 'Match each field, or hold it for a person to decide.',
    from: 0.72
  }
]

export function estimateProgress(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return ESTIMATE_CEILING * (1 - Math.exp(-elapsedMs / ESTIMATE_TAU_MS))
}

export function stageStates(progress: number, finished: boolean): Record<CheckStage, StageState> {
  const states = {} as Record<CheckStage, StageState>
  CHECK_STAGES.forEach((stage, index) => {
    const next = CHECK_STAGES[index + 1]
    if (finished || (next && progress >= next.from)) states[stage.key] = 'done'
    else if (progress >= stage.from) states[stage.key] = 'active'
    else states[stage.key] = 'waiting'
  })
  return states
}

// Rank of each tile in the fill order. Tile 0 holds the percentage and never
// fills (-1); the rest fill in a diagonal sweep out from it, top row first
// where two tiles sit on the same diagonal.
export function tileRanks(columns: number, rows: number): number[] {
  const order = Array.from({ length: columns * rows - 1 }, (_, offset) => offset + 1).sort((a, b) => {
    const rowA = Math.floor(a / columns)
    const rowB = Math.floor(b / columns)
    const diagonal = rowA + (a % columns) - (rowB + (b % columns))
    return diagonal !== 0 ? diagonal : rowA - rowB
  })
  const ranks = Array<number>(columns * rows).fill(-1)
  order.forEach((tile, rank) => {
    ranks[tile] = rank
  })
  return ranks
}

// How full one tile is, 0 to 1: tiles fill one at a time in rank order.
export function tileFill(rank: number, progress: number, fillable: number): number {
  return Math.min(1, Math.max(0, progress * fillable - rank))
}

export function percentLabel(progress: number, finished: boolean): string {
  return `${finished ? 100 : Math.floor(progress * 100)}%`
}
