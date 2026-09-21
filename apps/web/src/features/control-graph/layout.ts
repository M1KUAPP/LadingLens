import type { ControlGraph, GraphNodeKind } from './types'

// Deterministic scatter for the corpus overview. The built-in layouts all
// fail this graph: a directed breadth-first pass collapses the ~40-node
// middle rank into a single horizontal line, concentric rings leave a
// crowded knot at the centre, and the physics layouts (cose/fcose/cola)
// redraw differently on every load.
//
// Instead the nodes are dealt onto a jittered field by case: every node is
// assigned to the email it sits closest to, each case is drawn as a compact
// block, and the blocks are shelf-packed across the pane. The result fills
// the canvas with no line, no ribbon and no dead zones; members of a case
// land in neighbouring cells so edges stay short and flags sit beside what
// they flag, and the cell pitch is wider than a label so captions do not
// collide. Same input, same arithmetic — the arrangement is bit-for-bit
// stable.

const SEED = 0x9e3779b9
// Horizontal pitch clears a rendered label (capped at 100px) with margin
// even at the jitter extremes; vertical pitch only has to clear the node
// plus its caption because labels hang below the shape.
const PITCH_X = 115
const PITCH_Y = 72
// Pane aspect at desktop widths; picks the column count so the field lands
// near 1:1 at the default fit.
const PANE_ASPECT = 1.2

// Emails anchor a case; every other kind can be claimed by one.
const ANCHOR_KIND: GraphNodeKind = 'email'

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// BFS distance from every node to its nearest anchor, undirected — a flag
// is as close to its case as the document it marks is.
function anchorDistance(graph: ControlGraph): { dist: Map<string, number>; anchor: Map<string, string> } {
  const adj = new Map<string, string[]>()
  for (const edge of graph.edges) {
    ;(adj.get(edge.source) ?? adj.set(edge.source, []).get(edge.source)!).push(edge.target)
    ;(adj.get(edge.target) ?? adj.set(edge.target, []).get(edge.target)!).push(edge.source)
  }
  const dist = new Map<string, number>()
  const anchor = new Map<string, string>()
  const queue: string[] = []
  for (const node of graph.nodes) {
    if (node.kind === ANCHOR_KIND) {
      dist.set(node.id, 0)
      anchor.set(node.id, node.id)
      queue.push(node.id)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]
    for (const next of adj.get(id) ?? []) {
      if (dist.has(next)) continue
      dist.set(next, dist.get(id)! + 1)
      anchor.set(next, anchor.get(id)!)
      queue.push(next)
    }
  }
  return { dist, anchor }
}

// Nodes grouped by anchor case, BFS layer order inside a case, biggest case
// first so the shelf packing stays tight. Anything the BFS could not reach
// sorts into a trailing group so no node is dropped.
function caseGroups(graph: ControlGraph): string[][] {
  const { dist, anchor } = anchorDistance(graph)
  const anchorIndex = new Map(graph.nodes.filter((n) => n.kind === ANCHOR_KIND).map((n, i) => [n.id, i]))
  const groups = new Map<number, Array<{ id: string; layer: number; order: number }>>()
  graph.nodes.forEach((node, i) => {
    const key = anchorIndex.get(anchor.get(node.id) ?? '') ?? Number.MAX_SAFE_INTEGER
    const entry = { id: node.id, layer: dist.get(node.id) ?? Number.MAX_SAFE_INTEGER, order: i }
    ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(entry)
  })
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, members]) => members.sort((a, b) => a.layer - b.layer || a.order - b.order).map((entry) => entry.id))
    .sort((a, b) => b.length - a.length)
}

export function scatterPositions(graph: ControlGraph): Record<string, { x: number; y: number }> {
  const n = graph.nodes.length
  const shelfCols = Math.max(1, Math.round(Math.sqrt(n * PANE_ASPECT)))
  const rand = mulberry32(SEED)

  // Shelf packing: each case gets a near-square block of cells; a shelf is
  // filled with the largest block that still fits, so the right edge stays
  // ragged but there is no dead band down the middle of the field.
  const pos: Array<{ id: string; x: number; y: number }> = []
  const blocks = caseGroups(graph).map((ids) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length * 1.25)))
    return { ids, cols, rows: Math.ceil(ids.length / cols) }
  })
  let shelfX = 0
  let shelfY = 0
  let shelfH = 0
  while (blocks.length > 0) {
    const remaining = shelfCols - shelfX
    let take = blocks.findIndex((block) => block.cols <= remaining)
    if (take === -1) {
      if (shelfX === 0) take = 0
      else {
        shelfY += shelfH
        shelfX = 0
        shelfH = 0
        continue
      }
    }
    const block = blocks.splice(take, 1)[0]
    block.ids.forEach((id, i) => {
      const row = shelfY + Math.floor(i / block.cols)
      const col = shelfX + (i % block.cols)
      // Odd rows shift half a cell so columns soften into a hex pack. The
      // x jitter stays tiny on purpose: same-row neighbours are the only
      // pairs whose labels can collide, so their gap must stay above the
      // label cap; the y jitter carries the organic look instead.
      const x = (col + (row % 2 ? 0.5 : 0)) * PITCH_X + (rand() - 0.5) * PITCH_X * 0.08
      const y = row * PITCH_Y + (rand() - 0.5) * PITCH_Y * 0.24
      pos.push({ id, x, y })
    })
    shelfX += block.cols
    shelfH = Math.max(shelfH, block.rows)
  }

  const cx = pos.reduce((sum, p) => sum + p.x, 0) / n
  const cy = pos.reduce((sum, p) => sum + p.y, 0) / n
  return Object.fromEntries(pos.map((p) => [p.id, { x: p.x - cx, y: p.y - cy }]))
}
