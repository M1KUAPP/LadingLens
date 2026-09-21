import { describe, expect, it } from 'vitest'
import {
  BAY_COLUMNS,
  BAY_ROWS,
  CHECK_STAGES,
  estimateProgress,
  percentLabel,
  stageStates,
  tileFill,
  tileRanks
} from './waiting-progress'

describe('estimateProgress', () => {
  it('starts at zero and never reaches the ceiling before the run returns', () => {
    expect(estimateProgress(0)).toBe(0)
    expect(estimateProgress(-500)).toBe(0)
    expect(estimateProgress(25_000)).toBeGreaterThan(0.8)
    expect(estimateProgress(120_000)).toBeLessThan(0.95)
    expect(estimateProgress(600_000)).toBeLessThanOrEqual(0.95)
  })

  it('only moves forward', () => {
    let last = 0
    for (let ms = 0; ms <= 60_000; ms += 1_000) {
      const next = estimateProgress(ms)
      expect(next).toBeGreaterThanOrEqual(last)
      last = next
    }
  })
})

describe('stageStates', () => {
  it('names the three pipeline steps in order', () => {
    expect(CHECK_STAGES.map((stage) => stage.key)).toEqual(['receive', 'read', 'compare'])
  })

  it('walks the stages at 8% and 72%', () => {
    expect(stageStates(0, false)).toEqual({ receive: 'active', read: 'waiting', compare: 'waiting' })
    expect(stageStates(0.05, false)).toEqual({ receive: 'active', read: 'waiting', compare: 'waiting' })
    expect(stageStates(0.4, false)).toEqual({ receive: 'done', read: 'active', compare: 'waiting' })
    expect(stageStates(0.8, false)).toEqual({ receive: 'done', read: 'done', compare: 'active' })
  })

  it('marks every stage done once the run returns', () => {
    expect(stageStates(0.3, true)).toEqual({ receive: 'done', read: 'done', compare: 'done' })
  })
})

describe('tileRanks', () => {
  it('keeps the first tile for the counter and ranks the rest once each', () => {
    const ranks = tileRanks(BAY_COLUMNS, BAY_ROWS)
    expect(ranks).toHaveLength(110)
    expect(ranks[0]).toBe(-1)
    const filled = ranks.filter((rank) => rank >= 0)
    expect(new Set(filled).size).toBe(109)
    expect(Math.max(...filled)).toBe(108)
  })

  it('sweeps diagonally out from the counter tile, top row first on a tie', () => {
    const ranks = tileRanks(BAY_COLUMNS, BAY_ROWS)
    expect(ranks[1]).toBe(0)
    expect(ranks[BAY_COLUMNS]).toBe(1)
    expect(ranks[2]).toBe(2)
    expect(ranks[BAY_COLUMNS * BAY_ROWS - 1]).toBe(108)
  })
})

describe('tileFill', () => {
  it('fills one tile at a time', () => {
    expect(tileFill(0, 0, 109)).toBe(0)
    expect(tileFill(0, 0.5 / 109, 109)).toBeCloseTo(0.5)
    expect(tileFill(1, 0.5 / 109, 109)).toBe(0)
    expect(tileFill(3, 1, 109)).toBe(1)
  })
})

describe('percentLabel', () => {
  it('floors while running and reads 100% only when finished', () => {
    expect(percentLabel(0.999, false)).toBe('99%')
    expect(percentLabel(0.4, true)).toBe('100%')
    expect(percentLabel(0, false)).toBe('0%')
  })
})
