import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'
import type { Batch, BatchEntry } from './batch'
import { JudgeUploadError, type JudgeApiClient } from './judge-api'
import type { JudgeRun } from './types'

export type BatchItemStatus = 'blocked' | 'ready' | 'waiting' | 'checking' | 'done' | 'failed'

export type BatchItem = {
  entry: BatchEntry
  status: BatchItemStatus
  run: JudgeRun | null
  error: string | null
}

const NETWORK_ERROR_MESSAGE = 'The check could not reach the server.'

function describeError(error: unknown): string {
  if (error instanceof JudgeUploadError || error instanceof ApiError) return error.message
  return NETWORK_ERROR_MESSAGE
}

/**
 * Runs a batch's checks one after another: the server holds only a few check
 * slots, and one at a time keeps each check's progress legible. A stop lets
 * the check in flight finish and leaves the rest ready; running again also
 * retries what failed.
 */
export function useBatchRun(api: JudgeApiClient) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const stopRef = useRef(false)
  const liveRef = useRef(true)

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      stopRef.current = true
    }
  }, [])

  function update(key: string, patch: Partial<BatchItem>) {
    setItems((current) => current.map((item) => (item.entry.key === key ? { ...item, ...patch } : item)))
  }

  function load(next: Batch) {
    stopRef.current = true
    setBatch(next)
    setItems(
      next.entries.map((entry) => ({ entry, status: entry.problem ? 'blocked' : 'ready', run: null, error: null }))
    )
  }

  function clear() {
    stopRef.current = true
    setBatch(null)
    setItems([])
  }

  function stop() {
    stopRef.current = true
  }

  async function start() {
    const queue = items.filter((item) => item.status === 'ready' || item.status === 'failed')
    if (running || queue.length === 0) return
    stopRef.current = false
    setRunning(true)
    const queued = new Set(queue.map((item) => item.entry.key))
    setItems((current) =>
      current.map((item) => (queued.has(item.entry.key) ? { ...item, status: 'waiting', error: null } : item))
    )
    for (const { entry } of queue) {
      if (stopRef.current) break
      update(entry.key, { status: 'checking' })
      try {
        const run = await api.createJudgeRun({ files: entry.files, confirmed: true })
        if (!liveRef.current) return
        update(entry.key, {
          status: run.state === 'SUCCEEDED' ? 'done' : 'failed',
          run,
          error: run.failure?.message ?? null
        })
      } catch (error) {
        if (!liveRef.current) return
        update(entry.key, { status: 'failed', error: describeError(error) })
      }
    }
    if (!liveRef.current) return
    // Whatever a stop left waiting goes back to ready.
    setItems((current) => current.map((item) => (item.status === 'waiting' ? { ...item, status: 'ready' } : item)))
    setRunning(false)
  }

  return { batch, items, running, load, start, stop, clear }
}
